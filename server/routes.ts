import type { Express, Request, RequestHandler } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertQuoteRequestSchema, insertClaimRequestSchema } from "@shared/schema";
import type { Company } from "@shared/schema";
import { z } from "zod";
import { nanoid } from "nanoid";
import { requireAuth, getAuth, clerkClient } from "@clerk/express";

type ClerkMetadata = {
  role?: string;
  companyId?: string;
};

declare global {
  namespace Express {
    interface Request {
      companyId?: string;
    }
  }
}

const getClerkMetadata = (req: Request): ClerkMetadata => {
  const auth = getAuth(req);
  const claims = (auth?.sessionClaims || {}) as Record<string, any>;
  // Support both default Clerk publicMetadata and custom JWT claims we set in the template
  const role = claims.role || claims.publicMetadata?.role;
  const companyId = claims.companyId || claims.publicMetadata?.companyId;
  return { role, companyId };
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

const ensureCompanyMember: RequestHandler = (req, res, next) => {
  const metadata = getClerkMetadata(req);
  if (metadata.role !== "company" || !metadata.companyId) {
    return res.status(403).json({ message: "Company access required" });
  }
  req.companyId = metadata.companyId;
  next();
};

const COMPANY_MEMBER_ROLE = "org:admin";
const COMPANY_PORTAL_URL =
  process.env.COMPANY_PORTAL_URL ||
  (process.env.APP_URL ? `${process.env.APP_URL.replace(/\/$/, "")}/company/login` : undefined);

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
      if (code !== "organization_membership_exists") {
        throw error;
      }
    }
    return { type: "membership", clerkUserId: user.id, invitation: undefined };
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
  // Temporary debug endpoint to verify runtime env (non-sensitive prefixes only).
  // Remove once deployment issues are resolved.
  app.get("/api/debug/env", (_req, res) => {
    const pk = process.env.CLERK_PUBLISHABLE_KEY || process.env.VITE_CLERK_PUBLISHABLE_KEY;
    const sk = process.env.CLERK_SECRET_KEY;
    const template = process.env.CLERK_JWT_TEMPLATE_NAME || process.env.VITE_CLERK_JWT_TEMPLATE_NAME;
    const appUrl = process.env.APP_URL;
    const companyPortal = process.env.COMPANY_PORTAL_URL;
    res.json({
      nodeEnv: process.env.NODE_ENV || "unknown",
      clerkPublishableKeyPrefix: pk ? `${pk.slice(0, 10)}…` : null,
      clerkPublishableKeyLength: pk?.length ?? 0,
      clerkSecretKeyPresent: Boolean(sk),
      clerkSecretKeyLength: sk?.length ?? 0,
      jwtTemplate: template || null,
      appUrl: appUrl || null,
      companyPortalUrl: companyPortal || null,
    });
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

  // Get company by ID
  app.get("/api/company-profile/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const company = await storage.getCompanyById(id);
      
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }
      
      res.json(company);
    } catch (error) {
      console.error("Error fetching company:", error);
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
      
      res.json(company);
    } catch (error) {
      console.error("Error fetching company:", error);
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
      
      // TODO: Send email notification to company
      console.log(`Quote request submitted for ${company.name}:`, quoteRequest);
      
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

      const claimData = {
        ...req.body,
        companyId: companyId
      };
      
      const validatedData = insertClaimRequestSchema.parse(claimData);
      const claimRequest = await storage.createClaimRequest(validatedData);
      
      console.log(`Claim request submitted for ${company.name}:`, claimRequest);
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

      // Check if company user already exists for this email
      const existingUser = await storage.getCompanyUserByEmail(claimRequest.email);
      if (existingUser) {
        return res.status(400).json({ message: 'A company user account already exists for this email' });
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
    } catch (error) {
      console.error("Error approving claim request:", error);
      res.status(500).json({ message: "Failed to approve claim request" });
    }
  });

  // Reject claim request
  app.post("/api/admin/claim-requests/:id/reject", requireAuth(), ensureAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { reviewNotes } = req.body;

      await storage.updateClaimRequestStatus(id, 'rejected', null, reviewNotes);
      
      res.json({ message: 'Claim request rejected' });
    } catch (error) {
      console.error("Error rejecting claim request:", error);
      res.status(500).json({ message: "Failed to reject claim request" });
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

  // ===== COMPANY ADMIN ROUTES =====

  // Get company profile (for company admin)
  app.get("/api/company/profile", requireAuth(), ensureCompanyMember, async (req: any, res) => {
    try {
      const company = await storage.getCompanyById(req.companyId!);
      if (!company) {
        return res.status(404).json({ message: 'Company not found' });
      }
      res.json(company);
    } catch (error) {
      console.error("Error fetching company profile:", error);
      res.status(500).json({ message: "Failed to fetch company profile" });
    }
  });

  // Update company profile (for company admin)
  app.put("/api/company/profile", requireAuth(), ensureCompanyMember, async (req: any, res) => {
    try {
      const company = await storage.updateCompany(req.companyId!, req.body);
      if (!company) {
        return res.status(404).json({ message: 'Company not found' });
      }
      res.json(company);
    } catch (error) {
      console.error("Error updating company profile:", error);
      res.status(500).json({ message: "Failed to update company profile" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
