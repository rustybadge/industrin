import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertQuoteRequestSchema, insertClaimRequestSchema, insertCompanySchema } from "@shared/schema";
import { z } from "zod";

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
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      console.error("Error creating claim request:", error);
      res.status(500).json({ message: "Failed to create claim request" });
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

  const httpServer = createServer(app);
  return httpServer;
}
