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

const resend = new Resend(process.env.RESEND_API_KEY);
const ADMIN_EMAIL = "rus121@hotmail.com";

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

  console.log(`[ensureCompanyMember] resolved userId=${auth.userId} → companyId=${companyId} via ${resolvedVia}`);
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

  // Health / keep-alive — no auth required, must stay first
  app.get("/api/ping", (_req, res) => {
    res.json({ ok: true, ts: Date.now() });
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

      console.log("Company search filters:", filters);
      const companies = await storage.getCompanies(filters);
      console.log(`Found ${companies.length} companies for search: "${search}"`);
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
            <p><strong>Företag:</strong> ${company.name}</p>
            <p><strong>Namn:</strong> ${quoteRequest.name}</p>
            <p><strong>E-post:</strong> ${quoteRequest.email}</p>
            <p><strong>Telefon:</strong> ${quoteRequest.phone || '–'}</p>
            <p><strong>Meddelande:</strong> ${quoteRequest.message || '–'}</p>
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

      // Notify admin
      if (process.env.RESEND_API_KEY) {
        await resend.emails.send({
          from: "Industrin.net <noreply@industrin.net>",
          to: ADMIN_EMAIL,
          subject: `Ny ägaransökan: ${company.name}`,
          html: `
            <h2>Ny ägaransökan inkom</h2>
            <p><strong>Företag:</strong> ${company.name}</p>
            <p><strong>Namn:</strong> ${claimRequest.name}</p>
            <p><strong>E-post:</strong> ${claimRequest.email}</p>
            <p><strong>Telefon:</strong> ${claimRequest.phone || '–'}</p>
            <p><strong>Meddelande:</strong> ${claimRequest.message || '–'}</p>
            <br/>
            <a href="https://www.industrin.net/admin" style="background:#111827;color:#fff;padding:10px 20px;text-decoration:none;border-radius:6px;">
              Granska ansökan i admin
            </a>
          `
        });
      }

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

  // Seed companies endpoint (for development)
  app.post("/api/seed-companies", async (req, res) => {
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

      // Get the claim request
      const claimRequest = await storage.getClaimRequestById(id);
      if (!claimRequest) {
        return res.status(404).json({ message: 'Claim request not found' });
      }

      // Check if company user already exists for this email. If so, clean it up so we can re-invite.
      const existingUser = await storage.getCompanyUserByEmail(claimRequest.email);
      if (existingUser) {
        await storage.deleteCompanyUser(existingUser.id);
      }

      const company = await storage.getCompanyById(claimRequest.companyId);
      if (!company) {
        return res.status(404).json({ message: 'Company not found' });
      }

      const organizationId = await ensureClerkOrganization(company);
      const clerkOutcome = await addUserToOrganizationOrInvite({
        organizationId,
        email: claimRequest.email,
        companyId: claimRequest.companyId,
        companyName: company.name,
        adminClerkId,
      });

      // Generate secure access token (legacy local auth, kept for backward compatibility)
      const accessToken = nanoid(32);

      await storage.createCompanyUser({
        companyId: claimRequest.companyId,
        email: claimRequest.email,
        name: claimRequest.name,
        role: 'owner', // First user is always owner
        accessToken,
        isActive: true,
        ...(clerkOutcome.clerkUserId ? { clerkUserId: clerkOutcome.clerkUserId } : {}),
      });

      // Copy serviceCategories from claim to company profile (non-blocking)
      try {
        if (claimRequest.serviceCategories) {
          const raw = claimRequest.serviceCategories;
          const cats: string[] = Array.isArray(raw) ? raw as string[] : [];
          if (cats.length > 0) {
            await storage.updateCompany(claimRequest.companyId, { categories: cats });
          }
        }
      } catch (catError) {
        console.warn("Could not copy service categories to company profile:", catError);
      }

      // Send approval email to claimant
      if (process.env.RESEND_API_KEY) {
        try {
          const portalUrl = COMPANY_PORTAL_URL ?? 'https://www.industrin.net/company/login';
          await resend.emails.send({
            from: 'Industrin.net <noreply@industrin.net>',
            to: claimRequest.email,
            subject: `Din ägaransökan för ${company.name} har godkänts`,
            html: `
              <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#111827;">
                <h2 style="font-size:20px;margin-bottom:16px;">Din ägaransökan har godkänts</h2>
                <p>Hej ${claimRequest.name},</p>
                <p>Vi har granskat din ansökan och godkänt dig som ägare av <strong>${company.name}</strong> på Industrin.net.</p>
                <p>Du kommer inom kort att få ett <strong>separat inbjudningsmail</strong> från vårt system. Acceptera inbjudan så kommer du direkt till företagsportalen där du kan hantera er profil.</p>
                <p>Har du redan ett konto kan du logga in direkt här:</p>
                <p style="margin:24px 0;">
                  <a href="${portalUrl}" style="background:#111827;color:#fff;padding:10px 20px;text-decoration:none;border-radius:6px;">Logga in på företagsportalen</a>
                </p>
                <p>Hör av dig om du har några frågor.</p>
                <p>Med vänliga hälsningar,<br/>Industrin.net-teamet</p>
              </div>
            `,
          });
        } catch (emailError) {
          console.warn('Could not send approval email to claimant:', emailError);
        }
      }

      // Update claim request status
      await storage.updateClaimRequestStatus(id, 'approved', null, reviewNotes);
      
      res.json({ 
        message: 'Claim request approved. The company has been invited via Clerk.',
        organizationId,
        clerkAdminId: adminClerkId,
        invitationId: clerkOutcome.invitation?.id ?? null,
        invitationEmail: clerkOutcome.invitation?.emailAddress ?? null,
        clerkUserId: clerkOutcome.clerkUserId ?? null,
        status: clerkOutcome.type,
      });
    } catch (error: any) {
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

      // Send rejection email to claimant
      if (process.env.RESEND_API_KEY) {
        try {
          await resend.emails.send({
            from: 'Industrin.net <noreply@industrin.net>',
            to: claimRequest.email,
            subject: `Angående din ägaransökan för ${company?.name ?? 'företaget'}`,
            html: `
              <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#111827;">
                <h2 style="font-size:20px;margin-bottom:16px;">Angående din ägaransökan</h2>
                <p>Hej ${claimRequest.name},</p>
                <p>Tack för att du skickade in en ägaransökan för <strong>${company?.name ?? 'företaget'}</strong> på Industrin.net.</p>
                <p>Efter granskning kan vi tyvärr inte godkänna ansökan vid detta tillfälle.</p>
                <p>Har du frågor eller vill lämna mer information är du välkommen att kontakta oss på <a href="mailto:kontakt@industrin.net">kontakt@industrin.net</a>.</p>
                <p>Med vänliga hälsningar,<br/>Industrin.net-teamet</p>
              </div>
            `,
          });
        } catch (emailError) {
          console.warn('Could not send rejection email to claimant:', emailError);
        }
      }

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
    console.log(`[GET /api/company/profile] companyId=${companyId}`);
    try {
      const company = await storage.getCompanyById(companyId);
      if (!company) {
        console.warn(`[GET /api/company/profile] company not found for id=${companyId}`);
        return res.status(404).json({ message: 'Company not found' });
      }
      console.log(`[GET /api/company/profile] company found: ${company.name}`);

      let profile: any = {};
      try {
        profile = await storage.getCompanyProfile(companyId) ?? {};
        console.log(`[GET /api/company/profile] profile loaded`);
      } catch (profileErr) {
        console.warn(`[GET /api/company/profile] getCompanyProfile failed (non-fatal):`, profileErr);
      }

      let companyContacts: any[] = [];
      try {
        companyContacts = await storage.getContactsByCompany(companyId);
        console.log(`[GET /api/company/profile] contacts loaded: ${companyContacts.length}`);
      } catch (contactsErr) {
        console.warn(`[GET /api/company/profile] getContactsByCompany failed (non-fatal):`, contactsErr);
      }

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
  return httpServer;
}
