import type { Express, Request, RequestHandler } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { pool } from "./db";
import { insertQuoteRequestSchema, insertClaimRequestSchema, insertContactSchema } from "@shared/schema";
import type { Company } from "@shared/schema";
import multer from "multer";
import { getStore } from "@netlify/blobs";
import { z } from "zod";
import { nanoid } from "nanoid";
import { requireAuth, getAuth, clerkClient } from "@clerk/express";
import type { JwtPayload } from "@clerk/types";
import { Resend } from "resend";
import { escapeHtml } from "./emails/html";
import { createResendMailer } from "./emails/send";
import { claimReceivedAdmin, claimConfirmation, claimApproved, claimRejected, serviceRequestNotification, serviceRequestResponse as serviceRequestResponseEmail } from "./emails/templates";
import { migrateClaimWorkflow } from "./claims/migrate";
import { claimsVerifyRouter } from "./claims/wire";
import { assertNoEmailConflict, finalizeApproval, ClaimConflictError } from "./claims/repo";

const resend = new Resend(process.env.RESEND_API_KEY);
const mailer = createResendMailer();
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "rus121@hotmail.com";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Only image files allowed"));
  },
});

type ClerkMetadata = {
  role?: string;
  companyId?: string;
  orgId?: string;
  orgRole?: string;
};

declare global {
  namespace Express {
    interface Request {
      companyId?: string;
    }
  }
}

const COMPANY_MEMBER_ROLE = "org:admin";
const COMPANY_PORTAL_URL =
  process.env.COMPANY_PORTAL_URL ||
  (process.env.APP_URL ? `${process.env.APP_URL.replace(/\/$/, "")}/company/login` : undefined);

const claimsToMetadata = (claims: JwtPayload): ClerkMetadata => {
  const role = (claims as any)?.role || (claims as any)?.publicMetadata?.role;
  const companyId =
    (claims as any)?.companyId ||
    (claims as any)?.publicMetadata?.companyId;
  const orgId = (claims as any)?.org_id;
  const orgRole = (claims as any)?.org_role;
  return { role, companyId, orgId, orgRole };
};

const getClerkMetadata = (req: Request): ClerkMetadata => {
  const auth = getAuth(req);
  const claims = (auth?.sessionClaims || {}) as JwtPayload;
  return claimsToMetadata(claims);
};

const ensureAdmin: RequestHandler = (req, res, next) => {
  const metadata = getClerkMetadata(req);
  if (metadata.role !== "admin") {
    const auth = getAuth(req);
    console.warn("[ensureAdmin] 403 - missing admin role", {
      userId: auth?.userId,
      role: metadata.role,
      companyId: metadata.companyId,
      hasSession: Boolean(auth?.sessionId),
    });
    return res.status(403).json({ message: "Admin access required" });
  }
  next();
};

const ensureCompanyMember: RequestHandler = async (req, res, next) => {
  const auth = getAuth(req);
  const claims = (auth?.sessionClaims || {}) as JwtPayload;
  const metadata = claimsToMetadata(claims);

  let companyId = metadata.companyId;
  let role = metadata.role;
  let resolvedVia = 'jwt-claims';

  // Fallback 1: org_id present in JWT → resolve company via Clerk org
  if (!companyId && metadata.orgId) {
    const company = await storage.getCompanyByClerkOrgId(metadata.orgId);
    if (company) {
      companyId = company.id;
      resolvedVia = 'jwt-orgId';
    }
  }

  // Fallback 2: JWT has no publicMetadata claims → hit Clerk API directly
  if ((!role || !companyId) && auth.userId) {
    try {
      const clerkUser = await clerkClient.users.getUser(auth.userId);
      const userMeta = (clerkUser.publicMetadata || {}) as Record<string, unknown>;
      if (!role && userMeta.role) role = userMeta.role as string;
      if (!companyId && userMeta.companyId) {
        companyId = userMeta.companyId as string;
        resolvedVia = 'clerk-api';
      }
    } catch (err) {
      console.warn('[ensureCompanyMember] Clerk API fallback failed:', err);
    }
  }

  const hasCompanyRole =
    role === "company" ||
    metadata.orgRole === COMPANY_MEMBER_ROLE;

  if (!hasCompanyRole || !companyId) {
    console.warn('[ensureCompanyMember] 403 - missing company role or companyId', {
      userId: auth.userId,
      role,
      companyId,
      orgId: metadata.orgId,
      orgRole: metadata.orgRole,
    });
    return res.status(403).json({ message: "Company access required" });
  }

  req.companyId = companyId;
  next();
};

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50) || "company";

async function ensureClerkOrganization(company: Company) {
  if (company.clerkOrganizationId) {
    try {
      await clerkClient.organizations.getOrganization({ organizationId: company.clerkOrganizationId });
      return company.clerkOrganizationId;
    } catch (error) {
      console.warn(`Existing Clerk organization ${company.clerkOrganizationId} not found, creating a new one.`);
    }
  }

  const baseSlug = slugify(company.slug || company.name || company.id);
  let attempt = 0;
  let slugsAllowed = true;

  while (attempt < 5) {
    // If slugs are allowed, keep trying unique slugs. If not, omit slug entirely.
    const slugCandidate = slugsAllowed
      ? attempt === 0
        ? baseSlug
        : `${baseSlug}-${attempt + 1}`
      : undefined;

    try {
      const organization = await clerkClient.organizations.createOrganization({
        name: company.name,
        ...(slugCandidate ? { slug: slugCandidate } : {}),
        publicMetadata: {
          companyId: company.id,
        },
      });
      await storage.updateCompany(company.id, { clerkOrganizationId: organization.id });
      return organization.id;
    } catch (error: any) {
      const code = error?.errors?.[0]?.code;
      if (code === "slug_exists" && slugsAllowed) {
        attempt += 1;
        continue;
      }
      if (code === "organization_slugs_disabled") {
        // Retry without slug if this Clerk instance has slugs disabled
        slugsAllowed = false;
        attempt = 0;
        continue;
      }
      throw error;
    }
  }
  throw new Error("Failed to provision a Clerk organization after multiple attempts");
}

type ClerkInviteResult = {
  type: "membership";
  clerkUserId: string;
  invitation: undefined;
} | {
  type: "invitation";
  clerkUserId: undefined;
  invitation: Awaited<ReturnType<typeof clerkClient.organizations.createOrganizationInvitation>>;
};

async function addUserToOrganizationOrInvite({
  organizationId,
  email,
  companyId,
  companyName,
  adminClerkId,
}: {
  organizationId: string;
  email: string;
  companyId: string;
  companyName: string;
  adminClerkId?: string;
}): Promise<ClerkInviteResult> {
  const existingUsers = await clerkClient.users.getUserList({ emailAddress: [email] });
  const user = existingUsers?.data?.[0];

  if (user) {
    await clerkClient.users.updateUser(user.id, {
      publicMetadata: {
        ...(user.publicMetadata || {}),
        role: "company",
        companyId,
        companyName,
      },
    });
    try {
      await clerkClient.organizations.createOrganizationMembership({
        organizationId,
        userId: user.id,
        role: COMPANY_MEMBER_ROLE,
      });
    } catch (error: any) {
      const code = error?.errors?.[0]?.code;
      const msg = (error?.errors?.[0]?.message || error?.message || "").toLowerCase();
      const alreadyMember = code === "organization_membership_exists" || msg.includes("already a member") || msg.includes("already member");
      if (!alreadyMember) {
        throw error;
      }
    }
    return { type: "membership", clerkUserId: user.id, invitation: undefined };
  }

  // Revoke any existing pending invitations for this email before creating a new one
  try {
    const pendingInvitations = await clerkClient.organizations.getOrganizationInvitationList({
      organizationId,
      status: ["pending"],
    });
    for (const inv of pendingInvitations.data) {
      if (inv.emailAddress === email) {
        await clerkClient.organizations.revokeOrganizationInvitation({
          organizationId,
          invitationId: inv.id,
          requestingUserId: adminClerkId || organizationId,
        });
      }
    }
  } catch (e) {
    console.warn("Could not revoke pending invitations:", e);
  }

  // Create an invitation without an inviter (avoid not_a_member errors) and explicitly
  // set public metadata so the user lands with role/companyId.
  const invitation = await clerkClient.organizations.createOrganizationInvitation({
    organizationId,
    emailAddress: email,
    role: COMPANY_MEMBER_ROLE,
    publicMetadata: {
      role: "company",
      companyId,
      companyName,
    },
    redirectUrl: COMPANY_PORTAL_URL,
  });

  return { type: "invitation", invitation, clerkUserId: undefined };
}

export async function registerRoutes(app: Express): Promise<Server> {
  await migrateClaimWorkflow();

  // Owner verification: Clerk JWT-template token -> bind account to the approved company, flag Verified.
  app.use("/api/claims/verify", claimsVerifyRouter());

  // One-time startup migration: fix misspelled service category name
  try {
    await pool.query(
      `UPDATE companies
         SET categories = array_replace(categories, 'Frequensomriktare', 'Frekvensomriktare')
         WHERE 'Frequensomriktare' = ANY(categories)`
    );
    await pool.query(
      `UPDATE claim_requests
         SET service_categories = replace(service_categories::text, 'Frequensomriktare', 'Frekvensomriktare')::json
         WHERE service_categories::text LIKE '%Frequensomriktare%'`
    );
    await pool.query(
      `UPDATE service_categories
         SET name = 'Frekvensomriktare'
         WHERE name = 'Frequensomriktare'`
    );
  } catch (err) {
    console.warn('[startup] Frekvensomriktare spelling migration skipped or failed:', err);
  }

  // One-time startup migration: add tier column to companies
  try {
    await pool.query(
      `ALTER TABLE companies ADD COLUMN IF NOT EXISTS tier VARCHAR DEFAULT 'free'`
    );
  } catch (err) {
    console.warn('[startup] tier column migration skipped or failed:', err);
  }

  // One-time startup migration: create registrations table
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS registrations (
        id SERIAL PRIMARY KEY,
        company_name TEXT NOT NULL,
        org_number TEXT NOT NULL,
        contact_name TEXT NOT NULL,
        email TEXT NOT NULL,
        phone TEXT,
        city TEXT,
        description TEXT,
        status VARCHAR DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
  } catch (err) {
    console.warn('[startup] registrations table migration skipped or failed:', err);
  }

  // Health / keep-alive — no auth required, must stay first
  app.get("/api/ping", (_req, res) => {
    res.json({ ok: true, ts: Date.now() });
  });

  // New company registration — no auth required
  app.post("/api/registrations", async (req, res) => {
    try {
      const { company_name, org_number, contact_name, email, phone, city, description } = req.body;

      if (!company_name?.trim() || !org_number?.trim() || !contact_name?.trim() || !email?.trim()) {
        return res.status(400).json({ message: "Obligatoriska fält saknas: company_name, org_number, contact_name, email" });
      }

      await pool.query(
        `INSERT INTO registrations (company_name, org_number, contact_name, email, phone, city, description)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [company_name.trim(), org_number.trim(), contact_name.trim(), email.trim(), phone?.trim() || null, city?.trim() || null, description?.trim() || null]
      );

      if (process.env.RESEND_API_KEY) {
        try {
          await resend.emails.send({
            from: "Industrin.net <noreply@industrin.net>",
            to: ADMIN_EMAIL,
            subject: `Ny företagsregistrering: ${company_name}`,
            html: `
              <h2>Ny registreringsansökan inkom</h2>
              <p><strong>Företagsnamn:</strong> ${escapeHtml(company_name)}</p>
              <p><strong>Organisationsnummer:</strong> ${escapeHtml(org_number)}</p>
              <p><strong>Kontaktperson:</strong> ${escapeHtml(contact_name)}</p>
              <p><strong>E-post:</strong> ${escapeHtml(email)}</p>
              ${phone ? `<p><strong>Telefon:</strong> ${escapeHtml(phone)}</p>` : ""}
              ${city ? `<p><strong>Stad:</strong> ${escapeHtml(city)}</p>` : ""}
              ${description ? `<p><strong>Beskrivning:</strong> ${escapeHtml(description)}</p>` : ""}
            `,
          });
        } catch (emailErr) {
          console.warn("[registrations] Admin notification email failed:", emailErr);
        }
      }

      return res.status(201).json({ success: true });
    } catch (error) {
      console.error("Error creating registration:", error);
      return res.status(500).json({ message: "Failed to create registration" });
    }
  });

  // Get companies with search and filtering
  app.get("/api/companies", async (req, res) => {
    try {
      const { search, region, categories, limit, offset = "0" } = req.query;
      
      const filters = {
        search: search as string,
        region: region as string,
        categories: categories ? (categories as string).split(',') : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
        offset: parseInt(offset as string),
      };

      const companies = await storage.getCompanies(filters);
      res.set("Cache-Control", "no-store");
      res.json(companies);
    } catch (error) {
      console.error("Error fetching companies:", error);
      res.status(500).json({ message: "Failed to fetch companies" });
    }
  });

  // Count companies matching filters (must be before /:slug)
  app.get("/api/companies/count", async (req, res) => {
    try {
      const { search, region, categories } = req.query;
      const total = await storage.getCompaniesCount({
        search: search as string,
        region: region as string,
        categories: categories ? (categories as string).split(',') : undefined,
      });
      res.set("Cache-Control", "no-store");
      res.json({ total });
    } catch (error) {
      console.error("Error counting companies:", error);
      res.status(500).json({ message: "Failed to count companies" });
    }
  });

  // Get company by ID
  app.get("/api/company-profile/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const company = await storage.getCompanyById(id);

      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }

      let profile: Record<string, unknown> = {};
      let contacts: unknown[] = [];
      try {
        profile = await storage.getCompanyProfile(company.id) ?? {};
        contacts = await storage.getContactsByCompany(company.id);
      } catch (enrichErr) {
        console.warn("[company-profile/:id] Could not fetch profile/contacts — check migrations:", enrichErr);
      }

      res.set("Cache-Control", "no-store");
      res.json({ ...company, profile, contacts });
    } catch (error) {
      console.error("Error fetching company by id:", error);
      res.status(500).json({ message: "Failed to fetch company" });
    }
  });

  // Get company by slug
  app.get("/api/companies/:slug", async (req, res) => {
    try {
      const { slug } = req.params;
      const company = await storage.getCompanyBySlug(slug);

      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }

      let profile: Record<string, unknown> = {};
      let contacts: unknown[] = [];
      try {
        profile = await storage.getCompanyProfile(company.id) ?? {};
        contacts = await storage.getContactsByCompany(company.id);
      } catch (enrichErr) {
        console.warn("[companies/:slug] Could not fetch profile/contacts — check migrations:", enrichErr);
      }

      res.set("Cache-Control", "no-store");
      res.json({ ...company, profile, contacts });
    } catch (error) {
      console.error("Error fetching company by slug:", error);
      res.status(500).json({ message: "Failed to fetch company" });
    }
  });

  // Create quote request
  app.post("/api/quote-requests", async (req, res) => {
    try {
      const validatedData = insertQuoteRequestSchema.parse(req.body);
      
      // Verify company exists
      const company = await storage.getCompanyById(validatedData.companyId);
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }

      const quoteRequest = await storage.createQuoteRequest(validatedData);
      
      console.log(`Quote request submitted for ${company.name}:`, quoteRequest);

      // Notify admin
      if (process.env.RESEND_API_KEY) {
        await resend.emails.send({
          from: "Industrin.net <noreply@industrin.net>",
          to: ADMIN_EMAIL,
          subject: `Ny offertförfrågan: ${company.name}`,
          html: `
            <h2>Ny offertförfrågan inkom</h2>
            <p><strong>Företag:</strong> ${escapeHtml(company.name)}</p>
            <p><strong>Namn:</strong> ${escapeHtml(quoteRequest.name)}</p>
            <p><strong>E-post:</strong> ${escapeHtml(quoteRequest.email)}</p>
            <p><strong>Telefon:</strong> ${escapeHtml(quoteRequest.phone || '–')}</p>
            <p><strong>Meddelande:</strong> ${escapeHtml(quoteRequest.message || '–')}</p>
            <br/>
            <a href="https://www.industrin.net/admin" style="background:#111827;color:#fff;padding:10px 20px;text-decoration:none;border-radius:6px;">
              Visa i admin
            </a>
          `
        });
      }

      res.status(201).json(quoteRequest);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      console.error("Error creating quote request:", error);
      res.status(500).json({ message: "Failed to create quote request" });
    }
  });

  // Create claim request for specific company
  app.post("/api/companies/:companyId/claim", async (req, res) => {
    try {
      const { companyId } = req.params;
      const company = await storage.getCompanyById(companyId);
      
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }

      const existingClaims = await storage.getClaimRequestsByCompany(companyId);
      const duplicate = existingClaims.find(
        (c) => c.email.toLowerCase() === (req.body.email || '').toLowerCase()
              && (c.status === 'pending' || c.status === 'approved')
      );
      if (duplicate) {
        return res.status(409).json({
          message: duplicate.status === 'approved'
            ? 'En ansökan för detta företag och denna e-postadress har redan godkänts.'
            : 'En ansökan för detta företag och denna e-postadress väntar redan på granskning.',
        });
      }

      const claimData = {
        ...req.body,
        companyId: companyId
      };
      
      const validatedData = insertClaimRequestSchema.parse(claimData);
      const claimRequest = await storage.createClaimRequest(validatedData);
      
      console.log(`Claim request submitted for ${company.name}:`, claimRequest);

      // Emails are best-effort (mailer never throws): admin alert + confirmation to the claimant.
      await mailer.send(ADMIN_EMAIL, claimReceivedAdmin({
        companyName: company.name,
        claimantName: claimRequest.name,
        claimantEmail: claimRequest.email,
        phone: claimRequest.phone,
        message: claimRequest.message,
        adminUrl: "https://www.industrin.net/admin",
      }));
      await mailer.send(claimRequest.email, claimConfirmation({ name: claimRequest.name, companyName: company.name }));

      res.status(201).json(claimRequest);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error("Validation error:", error.errors);
        return res.status(400).json({ 
          message: "Invalid request data", 
          errors: error.errors 
        });
      }
      console.error("Error creating claim request:", error);
      res.status(500).json({ 
        message: "Failed to create claim request",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });



  // Get categories (for filtering)
  app.get("/api/categories", async (req, res) => {
    try {
      // Get all unique categories from companies
      const companies = await storage.getCompanies();
      const allCategories = companies.flatMap(company => company.categories);
      const uniqueCategories = Array.from(new Set(allCategories)).sort();
      
      res.json(uniqueCategories);
    } catch (error) {
      console.error("Error fetching categories:", error);
      res.status(500).json({ message: "Failed to fetch categories" });
    }
  });

  // Get serviceområden (for filtering)
  app.get("/api/serviceområden", async (req, res) => {
    try {
      const companies = await storage.getCompanies();
      const allServiceområden = companies.flatMap(company => company.serviceområden || []);
      const uniqueServiceområden = Array.from(new Set(allServiceområden)).sort();
      
      res.json(uniqueServiceområden);
    } catch (error) {
      console.error("Error fetching serviceområden:", error);
      res.status(500).json({ message: "Failed to fetch serviceområden" });
    }
  });

  // Get regions (for filtering)
  app.get("/api/regions", async (req, res) => {
    try {
      const companies = await storage.getCompanies();
      const allRegions = companies.map(company => company.region);
      const uniqueRegions = Array.from(new Set(allRegions)).sort();
      
      res.json(uniqueRegions);
    } catch (error) {
      console.error("Error fetching regions:", error);
      res.status(500).json({ message: "Failed to fetch regions" });
    }
  });

  // Seed companies endpoint (for development ONLY).
  // Guarded twice: refuses outright in production, and otherwise requires an
  // authenticated Clerk admin. Previously this was publicly callable and could
  // inject arbitrary listings into the live directory.
  app.post("/api/seed-companies", requireAuth(), ensureAdmin, async (req, res) => {
    if (process.env.NODE_ENV === "production") {
      return res.status(403).json({ message: "Seeding is disabled in production" });
    }
    try {
      const seedCompanies = [
        {
          name: "Precision Tech AB",
          slug: "precision-tech-ab",
          description: "Specialiserade på CNC-bearbetning och precisionstillverkning av komplexa komponenter för industrin. Över 25 års erfarenhet inom området.",
          categories: ["CNC-bearbetning", "Precisionsdelar"],
          location: "Borås",
          region: "Västra Götaland",
          contactEmail: "info@precisiontech.se",
          phone: "033-123 45 67",
          website: "www.precisiontech.se",
          address: "Industrivägen 15",
          postalCode: "503 32",
          city: "Borås",
          isFeatured: true,
          isVerified: true,
        },
        {
          name: "HydroTech Solutions",
          slug: "hydrotech-solutions",
          description: "Ledande leverantör av hydrauliska system och komponenter. Erbjuder service, installation och underhåll av hydraulisk utrustning.",
          categories: ["Hydraulik", "Service"],
          location: "Göteborg",
          region: "Västra Götaland",
          contactEmail: "info@hydrotech.se",
          phone: "031-987 65 43",
          website: "www.hydrotech.se",
          address: "Hydraulikgatan 8",
          postalCode: "411 32",
          city: "Göteborg",
          isFeatured: false,
          isVerified: true,
        },
        {
          name: "AutoIndustri Nord",
          slug: "autoindustri-nord",
          description: "Automationslösningar och robotik för modern industri. Vi hjälper företag att optimera produktionsprocesser med avancerad teknik.",
          categories: ["Automation", "Robotik"],
          location: "Malmö",
          region: "Skåne",
          contactEmail: "info@autoindustri.se",
          phone: "040-555 12 34",
          website: "www.autoindustri.se",
          address: "Robotvägen 22",
          postalCode: "211 45",
          city: "Malmö",
          isFeatured: false,
          isVerified: false,
        },
      ];

      const createdCompanies = [];
      for (const companyData of seedCompanies) {
        try {
          const company = await storage.createCompany(companyData);
          createdCompanies.push(company);
        } catch (error) {
          console.log(`Company ${companyData.name} might already exist, skipping...`);
        }
      }

      res.json({ message: `Seeded ${createdCompanies.length} companies`, companies: createdCompanies });
    } catch (error) {
      console.error("Error seeding companies:", error);
      res.status(500).json({ message: "Failed to seed companies" });
    }
  });

  // ===== ADMIN ROUTES =====
  // Get admin dashboard stats
  app.get("/api/admin/stats", requireAuth(), ensureAdmin, async (req, res) => {
    try {
      // Get total companies
      const allCompanies = await storage.getCompanies({});
      
      // Get claim requests by status
      const allClaims = await storage.getAllClaimRequests();
      
      const stats = {
        totalCompanies: allCompanies.length,
        pendingClaims: allClaims.filter(claim => claim.status === 'pending').length,
        approvedClaims: allClaims.filter(claim => claim.status === 'approved').length,
        rejectedClaims: allClaims.filter(claim => claim.status === 'rejected').length,
      };

      res.json(stats);
    } catch (error) {
      console.error("Error fetching admin stats:", error);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  // Get all claim requests
  app.get("/api/admin/claim-requests", requireAuth(), ensureAdmin, async (req, res) => {
    try {
      const claimRequests = await storage.getAllClaimRequests();
      
      // Enrich with company information
      const enrichedClaims = await Promise.all(
        claimRequests.map(async (claim) => {
          const company = await storage.getCompanyById(claim.companyId);
          return {
            ...claim,
            company: company ? {
              id: company.id,
              name: company.name,
              slug: company.slug,
            } : null,
          };
        })
      );
      
      res.json(enrichedClaims);
    } catch (error) {
      console.error("Error fetching claim requests:", error);
      res.status(500).json({ message: "Failed to fetch claim requests" });
    }
  });

  // Approve claim request
  app.post("/api/admin/claim-requests/:id/approve", requireAuth(), ensureAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { reviewNotes } = req.body;
      const auth = getAuth(req);
      const adminClerkId = auth.userId || undefined;

      const claimRequest = await storage.getClaimRequestById(id);
      if (!claimRequest) {
        return res.status(404).json({ message: 'Claim request not found' });
      }
      const company = await storage.getCompanyById(claimRequest.companyId);
      if (!company) {
        return res.status(404).json({ message: 'Company not found' });
      }

      // Refuse before touching Clerk if this email already belongs to another company.
      await assertNoEmailConflict(claimRequest.email, claimRequest.companyId);

      // 1) External side: Clerk org + invitation (idempotent: pending invites are revoked and re-sent).
      const organizationId = await ensureClerkOrganization(company);
      const clerkOutcome = await addUserToOrganizationOrInvite({
        organizationId,
        email: claimRequest.email,
        companyId: claimRequest.companyId,
        companyName: company.name,
        adminClerkId,
      });

      // 2) Database side, all-or-nothing: owner row (upsert, never delete), category sync, claim status.
      //    access_token is the legacy local-auth credential, kept for backward compatibility.
      const result = await finalizeApproval({
        claimId: id,
        clerkUserId: clerkOutcome.clerkUserId,
        accessToken: nanoid(32),
        reviewNotes,
      });

      // 3) Only after commit: notify the claimant (best-effort).
      await mailer.send(claimRequest.email, claimApproved({
        name: claimRequest.name,
        companyName: company.name,
        portalUrl: COMPANY_PORTAL_URL ?? 'https://www.industrin.net/company/login',
      }));

      res.json({
        message: 'Claim request approved. The company has been invited via Clerk.',
        organizationId,
        clerkAdminId: adminClerkId,
        invitationId: clerkOutcome.invitation?.id ?? null,
        invitationEmail: clerkOutcome.invitation?.emailAddress ?? null,
        clerkUserId: clerkOutcome.clerkUserId ?? null,
        status: clerkOutcome.type,
        categoriesWritten: result.categoriesWritten,
        unmatchedCategories: result.unmatchedCategories,
      });
    } catch (error: any) {
      if (error instanceof ClaimConflictError) {
        return res.status(409).json({ message: error.message });
      }
      console.error("Error approving claim request:", error);
      const detail = error?.errors?.[0]?.message || error?.message || String(error);
      res.status(500).json({ message: `Failed to approve claim request: ${detail}` });
    }
  });

  // Reject claim request
  app.post("/api/admin/claim-requests/:id/reject", requireAuth(), ensureAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { reviewNotes } = req.body;

      const claimRequest = await storage.getClaimRequestById(id);
      if (!claimRequest) {
        return res.status(404).json({ message: 'Claim request not found' });
      }

      const company = await storage.getCompanyById(claimRequest.companyId);

      await storage.updateClaimRequestStatus(id, 'rejected', null, reviewNotes);

      await mailer.send(claimRequest.email, claimRejected({
        name: claimRequest.name,
        companyName: company?.name ?? 'företaget',
      }));

      res.json({ message: 'Claim request rejected' });
    } catch (error) {
      console.error("Error rejecting claim request:", error);
      res.status(500).json({ message: "Failed to reject claim request" });
    }
  });

  // Delete claim request
  app.post("/api/admin/claim-requests/:id/delete", requireAuth(), ensureAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteClaimRequest(id);
      res.json({ message: 'Claim request deleted' });
    } catch (error) {
      console.error("Error deleting claim request:", error);
      res.status(500).json({ message: "Failed to delete claim request" });
    }
  });

  // Reset claim request to pending (undo approval/rejection)
  app.post("/api/admin/claim-requests/:id/reset", requireAuth(), ensureAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { reviewNotes } = req.body;

      await storage.updateClaimRequestStatus(id, 'pending', null, reviewNotes);
      
      res.json({ message: 'Claim request reset to pending' });
    } catch (error) {
      console.error("Error resetting claim request:", error);
      res.status(500).json({ message: "Failed to reset claim request" });
    }
  });

  // Revoke company user access (deactivate)
  app.post("/api/admin/company-users/:id/revoke", requireAuth(), ensureAdmin, async (req, res) => {
    try {
      const { id } = req.params;

      const companyUser = await storage.updateCompanyUser(id, { isActive: false });
      
      if (!companyUser) {
        return res.status(404).json({ message: 'Company user not found' });
      }

      res.json({ message: 'Company user access revoked', companyUser });
    } catch (error) {
      console.error("Error revoking company user access:", error);
      res.status(500).json({ message: "Failed to revoke access" });
    }
  });

  // Reactivate company user access
  app.post("/api/admin/company-users/:id/activate", requireAuth(), ensureAdmin, async (req, res) => {
    try {
      const { id } = req.params;

      const companyUser = await storage.updateCompanyUser(id, { isActive: true });
      
      if (!companyUser) {
        return res.status(404).json({ message: 'Company user not found' });
      }

      res.json({ message: 'Company user access reactivated', companyUser });
    } catch (error) {
      console.error("Error reactivating company user access:", error);
      res.status(500).json({ message: "Failed to reactivate access" });
    }
  });

  // Get company users for a company
  app.get("/api/admin/companies/:companyId/users", requireAuth(), ensureAdmin, async (req, res) => {
    try {
      const { companyId } = req.params;
      const companyUsers = await storage.getCompanyUsersByCompany(companyId);
      res.json(companyUsers);
    } catch (error) {
      console.error("Error fetching company users:", error);
      res.status(500).json({ message: "Failed to fetch company users" });
    }
  });

  // Get all company users (for admin)
  app.get("/api/admin/company-users", requireAuth(), ensureAdmin, async (req, res) => {
    try {
      const companyUsers = await storage.getAllCompanyUsers();
      
      // Enrich with company information
      const enrichedUsers = await Promise.all(
        companyUsers.map(async (user) => {
          const company = await storage.getCompanyById(user.companyId);
          return {
            ...user,
            company: company ? {
              id: company.id,
              name: company.name,
              slug: company.slug,
            } : null,
          };
        })
      );
      
      res.json(enrichedUsers);
    } catch (error) {
      console.error("Error fetching company users:", error);
      res.status(500).json({ message: "Failed to fetch company users" });
    }
  });

  // Delete company user (for admin testing)
  app.delete("/api/admin/company-users/:id", requireAuth(), ensureAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const deletedUser = await storage.deleteCompanyUser(id);
      
      if (!deletedUser) {
        return res.status(404).json({ message: 'Company user not found' });
      }

      res.json({ message: 'Company user deleted', companyUser: deletedUser });
    } catch (error) {
      console.error("Error deleting company user:", error);
      res.status(500).json({ message: "Failed to delete company user" });
    }
  });

  // Get all companies with profile + contacts (admin)
  app.get("/api/admin/outreach-companies", requireAuth(), ensureAdmin, async (req, res) => {
    try {
      const companies = await storage.getCompaniesForOutreach();
      res.json(companies);
    } catch (error) {
      console.error("Error fetching outreach companies:", error);
      res.status(500).json({ message: "Failed to fetch companies" });
    }
  });

  app.get("/api/admin/companies", requireAuth(), ensureAdmin, async (req, res) => {
    try {
      const companiesWithProfile = await storage.getAllCompaniesWithProfile();
      res.json(companiesWithProfile);
    } catch (error) {
      console.error("Error fetching admin companies:", error);
      res.status(500).json({ message: "Failed to fetch companies" });
    }
  });

  // Get single company with profile + contacts (admin)
  app.get("/api/admin/companies/:companyId/detail", requireAuth(), ensureAdmin, async (req, res) => {
    try {
      const { companyId } = req.params;
      const company = await storage.getCompanyById(companyId);
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }
      const profile = await storage.getCompanyProfile(companyId) ?? {};
      const contacts = await storage.getContactsByCompany(companyId);
      res.json({ ...company, profile, contacts });
    } catch (error) {
      console.error("Error fetching admin company detail:", error);
      res.status(500).json({ message: "Failed to fetch company" });
    }
  });

  // ===== COMPANY ADMIN ROUTES =====

  // Auto-setup: fix missing publicMetadata for users who accepted org invitations
  // Called on first dashboard load when role/companyId metadata is missing
  app.post("/api/company/setup", requireAuth(), async (req, res) => {
    try {
      const auth = getAuth(req);
      const clerkUserId = auth.userId;
      if (!clerkUserId) return res.status(401).json({ message: "Unauthorized" });

      // Get the user's email from Clerk
      const clerkUser = await clerkClient.users.getUser(clerkUserId);
      const email = clerkUser.primaryEmailAddress?.emailAddress;
      if (!email) return res.status(400).json({ message: "No email found" });

      // Check if metadata is already set
      const existing = clerkUser.publicMetadata as any;
      if (existing?.role === "company" && existing?.companyId) {
        return res.json({ role: existing.role, companyId: existing.companyId });
      }

      // Look up approved claim for this email in the database
      const allClaims = await storage.getAllClaimRequests();
      const approvedClaim = allClaims.find(
        (c) => c.email?.toLowerCase() === email.toLowerCase() && c.status === "approved"
      );
      if (!approvedClaim) {
        return res.status(404).json({ message: "No approved claim found for this account" });
      }

      // Set the missing metadata on the Clerk user
      await clerkClient.users.updateUser(clerkUserId, {
        publicMetadata: {
          ...existing,
          role: "company",
          companyId: approvedClaim.companyId,
        },
      });

      res.json({ role: "company", companyId: approvedClaim.companyId });
    } catch (error) {
      console.error("Error in company setup:", error);
      res.status(500).json({ message: "Setup failed" });
    }
  });

  // Get company profile (for company admin) — returns company + extended profile + contacts
  app.get("/api/company/profile", requireAuth(), ensureCompanyMember, async (req: any, res) => {
    const companyId = req.companyId!;
    try {
      const company = await storage.getCompanyById(companyId);
      if (!company) {
        return res.status(404).json({ message: 'Company not found' });
      }

      let profile: any = {};
      try {
        profile = await storage.getCompanyProfile(companyId) ?? {};
      } catch (profileErr) {
        console.error(`[GET /api/company/profile] getCompanyProfile failed for ${companyId}:`, profileErr);
      }

      let companyContacts: any[] = [];
      try {
        companyContacts = await storage.getContactsByCompany(companyId);
      } catch (contactsErr) {
        console.error(`[GET /api/company/profile] getContactsByCompany failed for ${companyId}:`, contactsErr);
      }

      res.set("Cache-Control", "no-store");
      res.json({ ...company, profile, contacts: companyContacts });
    } catch (error) {
      console.error(`[GET /api/company/profile] fatal error for companyId=${companyId}:`, error);
      res.status(500).json({ message: "Failed to fetch company profile" });
    }
  });

  // Update company profile (for company admin) — legacy POST kept for backward compatibility
  app.post("/api/company/profile/update", requireAuth(), ensureCompanyMember, async (req: any, res) => {
    try {
      // Strip read-only fields — never allow updating id, slug, createdAt, clerkOrganizationId
      const { id, slug, createdAt, clerkOrganizationId, ...editableFields } = req.body;
      const company = await storage.updateCompany(req.companyId!, editableFields);
      if (!company) {
        return res.status(404).json({ message: 'Company not found' });
      }
      res.json(company);
    } catch (error) {
      console.error("Error updating company profile:", error);
      res.status(500).json({ message: "Failed to update company profile" });
    }
  });

  // PUT /api/company/profile — save company fields + extended profile in one call
  app.put("/api/company/profile", requireAuth(), ensureCompanyMember, async (req: any, res) => {
    try {
      const { id, slug, createdAt, clerkOrganizationId, profile: profileData, contacts: _c, ...companyFields } = req.body;
      const company = Object.keys(companyFields).length > 0
        ? await storage.updateCompany(req.companyId!, companyFields)
        : await storage.getCompanyById(req.companyId!);
      if (!company) {
        return res.status(404).json({ message: 'Company not found' });
      }
      const profile = profileData
        ? await storage.upsertCompanyProfile(req.companyId!, profileData)
        : await storage.getCompanyProfile(req.companyId!) ?? {};
      const companyContacts = await storage.getContactsByCompany(req.companyId!);
      res.json({ ...company, profile, contacts: companyContacts });
    } catch (error) {
      console.error("Error updating company profile:", error);
      res.status(500).json({ message: "Failed to update company profile" });
    }
  });

  // POST /api/company/contacts — add a named contact
  app.post("/api/company/contacts", requireAuth(), ensureCompanyMember, async (req: any, res) => {
    try {
      const parsed = insertContactSchema.safeParse({ ...req.body, companyId: req.companyId });
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid data", errors: parsed.error.errors });
      }
      const contact = await storage.createContact(parsed.data);
      res.status(201).json(contact);
    } catch (error) {
      console.error("Error creating contact:", error);
      res.status(500).json({ message: "Failed to create contact" });
    }
  });

  // DELETE /api/company/contacts/:contactId — remove a named contact
  app.delete("/api/company/contacts/:contactId", requireAuth(), ensureCompanyMember, async (req: any, res) => {
    try {
      await storage.deleteContact(req.params.contactId, req.companyId!);
      res.json({ ok: true });
    } catch (error) {
      console.error("Error deleting contact:", error);
      res.status(500).json({ message: "Failed to delete contact" });
    }
  });

  // POST /api/company/logo — upload logo via Netlify Blobs
  app.post(
    "/api/company/logo",
    requireAuth(),
    ensureCompanyMember,
    upload.single("logo"),
    async (req: any, res) => {
      try {
        if (!req.file) {
          return res.status(400).json({ message: "No file uploaded" });
        }

        const netlifyToken = process.env.NETLIFY_TOKEN;
        const siteId = process.env.NETLIFY_SITE_ID;
        if (!netlifyToken || !siteId) {
          return res.status(503).json({
            message: "Logo upload not configured. Set NETLIFY_TOKEN and NETLIFY_SITE_ID on the server.",
          });
        }

        const store = getStore({ name: "company-logos", token: netlifyToken, siteID: siteId });
        const ext = req.file.originalname.split(".").pop() ?? "jpg";
        const key = `${req.companyId}/${Date.now()}.${ext}`;
        // @netlify/blobs set() does not accept contentType in options — pass buffer directly
        await store.set(key, req.file.buffer);

        // Netlify Blobs public URL — requires the store to be configured as public
        // The URL pattern for public Netlify Blobs is project-specific; store the key
        // and construct via the Netlify CDN URL convention.
        const logoUrl = `https://storage.googleapis.com/production-netlify/sites/${siteId}/blobs/${key}`;

        await storage.updateCompany(req.companyId!, { logoUrl });
        res.json({ logoUrl });
      } catch (error) {
        console.error("Error uploading logo:", error);
        res.status(500).json({ message: "Failed to upload logo" });
      }
    }
  );

  const httpServer = createServer(app);

  // ===== SERVICE REQUEST MARKETPLACE =====

  // POST /api/general-quote-requests — buyer submits a service request
  // Saves to DB, matches companies by region, emails them
  app.post("/api/general-quote-requests", async (req, res) => {
    try {
      const { description, serviceType, urgency, location, region, name, email, phone, companyName, preferredContact, files } = req.body;
      if (!description || !serviceType || !urgency || !name || !email || !preferredContact) {
        return res.status(400).json({ message: "Obligatoriska fält saknas" });
      }

      // Save the request
      const result = await pool.query<{ id: string }>(
        `INSERT INTO general_quote_requests
          (description, service_type, urgency, location, region, name, email, phone, company_name, preferred_contact, files)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`,
        [description, serviceType, urgency, location ?? null, region ?? location ?? null,
         name, email, phone ?? null, companyName ?? null, preferredContact, files ? JSON.stringify(files) : null]
      );
      const requestId = result.rows[0].id;

      // Match and notify companies — use region if provided, otherwise location text
      const matchRegion = region || location || '';
      const matchedCompanies = matchRegion
        ? await storage.getCompaniesForRegion(matchRegion, 20)
        : [];

      const dashboardUrl = process.env.COMPANY_PORTAL_URL ?? 'https://www.industrin.net/company/dashboard';

      // Email matched companies (best-effort, non-blocking)
      const notifications = matchedCompanies
        .filter(c => c.contactEmail)
        .map(c =>
          mailer.send(c.contactEmail!, serviceRequestNotification({
            companyName: c.name,
            serviceType,
            urgency,
            location: location || matchRegion || 'Sverige',
            description,
            dashboardUrl,
          }))
        );
      await Promise.allSettled(notifications);

      // Confirmation to buyer
      await mailer.send(email, {
        subject: 'Vi har tagit emot din förfrågan – Industrin.net',
        html: `<p>Hej ${escapeHtml(name)},</p>
               <p>Vi har tagit emot din förfrågan om <strong>${escapeHtml(serviceType)}</strong> och skickat den till ${matchedCompanies.length} relevanta serviceföretag i ditt område.</p>
               <p>Du hör av dig direkt när ett företag svarar.</p>
               <p>Med vänlig hälsning,<br/>Industrin.net</p>`,
      });

      res.status(201).json({ id: requestId, matchedCount: matchedCompanies.length });
    } catch (error) {
      console.error("Error creating general quote request:", error);
      res.status(500).json({ message: "Kunde inte spara förfrågan" });
    }
  });

  // GET /api/company/requests — requests matching this company's region
  app.get("/api/company/requests", requireAuth(), ensureCompanyMember, async (req: any, res) => {
    try {
      const companyId = req.companyId as string;
      const requests = await storage.getRequestsForCompany(companyId);
      // For each request, check if this company has already responded
      const withResponded = await Promise.all(
        requests.map(async (r) => ({
          ...r,
          hasResponded: await storage.hasCompanyResponded(r.id, companyId),
        }))
      );
      res.json(withResponded);
    } catch (error) {
      console.error("Error fetching company requests:", error);
      res.status(500).json({ message: "Kunde inte hämta förfrågningar" });
    }
  });

  // POST /api/company/requests/:id/respond — company responds to a request
  app.post("/api/company/requests/:id/respond", requireAuth(), ensureCompanyMember, async (req: any, res) => {
    try {
      const { id: requestId } = req.params;
      const { message } = req.body;
      const companyId = req.companyId as string;

      if (!message?.trim()) {
        return res.status(400).json({ message: "Meddelandet får inte vara tomt" });
      }

      // Prevent double-response
      const alreadyResponded = await storage.hasCompanyResponded(requestId, companyId);
      if (alreadyResponded) {
        return res.status(409).json({ message: "Ni har redan svarat på denna förfrågan" });
      }

      const request = await storage.getRequestById(requestId);
      if (!request) return res.status(404).json({ message: "Förfrågan hittades inte" });

      const company = await storage.getCompanyById(companyId);
      if (!company) return res.status(404).json({ message: "Företag hittades inte" });

      // Save response
      await storage.createServiceRequestResponse({ requestId, companyId, message });

      // Notify the buyer
      await mailer.send(request.email, serviceRequestResponseEmail({
        buyerName: request.name,
        companyName: company.name,
        responseMessage: message,
        serviceType: request.serviceType,
      }));

      res.status(201).json({ message: "Svar skickat" });
    } catch (error) {
      console.error("Error responding to request:", error);
      res.status(500).json({ message: "Kunde inte skicka svar" });
    }
  });

  return httpServer;
}
