import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertQuoteRequestSchema, insertClaimRequestSchema, insertCompanySchema } from "@shared/schema";
import { z } from "zod";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { nanoid } from "nanoid";

// JWT secret - in production, use environment variable
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Extend Request interface to include admin property
declare global {
  namespace Express {
    interface Request {
      admin?: {
        id: string;
        username: string;
        role: string;
        isSuperAdmin: boolean;
      };
    }
  }
}

// Middleware to verify admin authentication
const verifyAdminAuth = (req: any, res: any, next: any) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    req.admin = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};

export async function registerRoutes(app: Express): Promise<Server> {
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

  // Admin login
  app.post("/api/admin/login", async (req, res) => {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({ message: 'Username and password are required' });
      }

      // Get user from database
      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      // Check password
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      // Generate JWT token
      const token = jwt.sign(
        { 
          id: user.id, 
          username: user.username, 
          role: user.role,
          isSuperAdmin: user.isSuperAdmin 
        },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      res.json({
        admin: {
          id: user.id,
          username: user.username,
          role: user.role,
          isSuperAdmin: user.isSuperAdmin,
        },
        token,
      });
    } catch (error) {
      console.error("Admin login error:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  // Verify admin token
  app.get("/api/admin/verify", verifyAdminAuth, async (req: any, res) => {
    res.json(req.admin);
  });

  // Get admin dashboard stats
  app.get("/api/admin/stats", verifyAdminAuth, async (req, res) => {
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
  app.get("/api/admin/claim-requests", verifyAdminAuth, async (req, res) => {
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
  app.post("/api/admin/claim-requests/:id/approve", verifyAdminAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { reviewNotes } = req.body;

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

      // Generate secure access token
      const accessToken = nanoid(32);

      // Create company user account
      await storage.createCompanyUser({
        companyId: claimRequest.companyId,
        email: claimRequest.email,
        name: claimRequest.name,
        role: 'owner', // First user is always owner
        accessToken,
        approvedBy: req.admin!.id,
        isActive: true,
      });

      // Update claim request status
      await storage.updateClaimRequestStatus(id, 'approved', req.admin!.id, reviewNotes);
      
      res.json({ 
        message: 'Claim request approved and company user account created',
        accessToken // Include token in response for admin to share with company
      });
    } catch (error) {
      console.error("Error approving claim request:", error);
      res.status(500).json({ message: "Failed to approve claim request" });
    }
  });

  // Reject claim request
  app.post("/api/admin/claim-requests/:id/reject", verifyAdminAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { reviewNotes } = req.body;

      await storage.updateClaimRequestStatus(id, 'rejected', req.admin!.id, reviewNotes);
      
      res.json({ message: 'Claim request rejected' });
    } catch (error) {
      console.error("Error rejecting claim request:", error);
      res.status(500).json({ message: "Failed to reject claim request" });
    }
  });

  // Revoke company user access (deactivate)
  app.post("/api/admin/company-users/:id/revoke", verifyAdminAuth, async (req, res) => {
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
  app.post("/api/admin/company-users/:id/activate", verifyAdminAuth, async (req, res) => {
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
  app.get("/api/admin/companies/:companyId/users", verifyAdminAuth, async (req, res) => {
    try {
      const { companyId } = req.params;
      const companyUsers = await storage.getCompanyUsersByCompany(companyId);
      res.json(companyUsers);
    } catch (error) {
      console.error("Error fetching company users:", error);
      res.status(500).json({ message: "Failed to fetch company users" });
    }
  });

  // ===== COMPANY ADMIN ROUTES =====

  // Company admin login
  app.post("/api/company/login", async (req, res) => {
    try {
      const { email, accessToken } = req.body;

      if (!email || !accessToken) {
        return res.status(400).json({ message: 'Email and access token are required' });
      }

      // Get company user by email and token
      const companyUser = await storage.getCompanyUserByEmail(email);
      if (!companyUser || companyUser.accessToken !== accessToken) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      if (!companyUser.isActive) {
        return res.status(403).json({ message: 'Account is inactive' });
      }

      // Get company details
      const company = await storage.getCompanyById(companyUser.companyId);
      if (!company) {
        return res.status(404).json({ message: 'Company not found' });
      }

      // Generate JWT token for company user
      const token = jwt.sign(
        { 
          id: companyUser.id, 
          companyId: companyUser.companyId,
          email: companyUser.email,
          role: companyUser.role
        },
        JWT_SECRET,
        { expiresIn: '30d' }
      );

      res.json({
        companyUser: {
          id: companyUser.id,
          companyId: companyUser.companyId,
          email: companyUser.email,
          name: companyUser.name,
          role: companyUser.role,
          company: {
            id: company.id,
            name: company.name,
            slug: company.slug,
          },
        },
        token,
      });
    } catch (error) {
      console.error("Company login error:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  // Verify company token
  app.get("/api/company/verify", async (req: any, res) => {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');
      
      if (!token) {
        return res.status(401).json({ message: 'No token provided' });
      }

      const decoded = jwt.verify(token, JWT_SECRET) as any;
      const companyUser = await storage.getCompanyUserByEmail(decoded.email);
      
      if (!companyUser || !companyUser.isActive) {
        return res.status(401).json({ message: 'Invalid or inactive token' });
      }

      const company = await storage.getCompanyById(companyUser.companyId);
      if (!company) {
        return res.status(404).json({ message: 'Company not found' });
      }

      res.json({
        id: companyUser.id,
        companyId: companyUser.companyId,
        email: companyUser.email,
        name: companyUser.name,
        role: companyUser.role,
        company: {
          id: company.id,
          name: company.name,
          slug: company.slug,
        },
      });
    } catch (error) {
      res.status(401).json({ message: 'Invalid token' });
    }
  });

  // Middleware to verify company authentication
  const verifyCompanyAuth = (req: any, res: any, next: any) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      req.companyUser = decoded;
      next();
    } catch (error) {
      res.status(401).json({ message: 'Invalid token' });
    }
  };

  // Get company profile (for company admin)
  app.get("/api/company/profile", verifyCompanyAuth, async (req: any, res) => {
    try {
      const company = await storage.getCompanyById(req.companyUser.companyId);
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
  app.put("/api/company/profile", verifyCompanyAuth, async (req: any, res) => {
    try {
      const company = await storage.updateCompany(req.companyUser.companyId, req.body);
      if (!company) {
        return res.status(404).json({ message: 'Company not found' });
      }
      res.json(company);
    } catch (error) {
      console.error("Error updating company profile:", error);
      res.status(500).json({ message: "Failed to update company profile" });
    }
  });

  // Change admin password
  app.post("/api/admin/change-password", verifyAdminAuth, async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: 'Current password and new password are required' });
      }

      if (newPassword.length < 8) {
        return res.status(400).json({ message: 'New password must be at least 8 characters long' });
      }

      // Get current user
      const user = await storage.getUser(req.admin!.id);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Verify current password
      const isValidPassword = await bcrypt.compare(currentPassword, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ message: 'Current password is incorrect' });
      }

      // Hash new password
      const hashedNewPassword = await bcrypt.hash(newPassword, 10);

      // Update password
      await storage.updateUserPassword(req.admin!.id, hashedNewPassword);

      res.json({ message: 'Password updated successfully' });
    } catch (error) {
      console.error("Error changing password:", error);
      res.status(500).json({ message: "Failed to change password" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
