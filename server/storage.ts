import { 
  users, companies, claimRequests, quoteRequests,
  type User, type InsertUser,
  type Company, type InsertCompany,
  type ClaimRequest, type InsertClaimRequest,
  type QuoteRequest, type InsertQuoteRequest
} from "@shared/schema";
import { db } from "./db";
import { eq, and, ilike, inArray, desc, sql } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Companies
  getCompanies(filters?: {
    search?: string;
    region?: string;
    categories?: string[];
    limit?: number;
    offset?: number;
  }): Promise<Company[]>;
  getCompanyById(id: string): Promise<Company | undefined>;
  getCompanyBySlug(slug: string): Promise<Company | undefined>;
  createCompany(company: InsertCompany): Promise<Company>;
  updateCompany(id: string, company: Partial<InsertCompany>): Promise<Company | undefined>;

  // Quote Requests
  createQuoteRequest(quoteRequest: InsertQuoteRequest): Promise<QuoteRequest>;
  getQuoteRequestsByCompany(companyId: string): Promise<QuoteRequest[]>;

  // Claim Requests
  createClaimRequest(claimRequest: InsertClaimRequest): Promise<ClaimRequest>;
  getClaimRequestsByCompany(companyId: string): Promise<ClaimRequest[]>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async getCompanies(filters?: {
    search?: string;
    region?: string;
    categories?: string[];
    limit?: number;
    offset?: number;
  }): Promise<Company[]> {
    let query = db.select().from(companies);
    
    const conditions = [];
    
    if (filters?.search) {
      const searchValue = filters.search.trim();
      
      // Check if this is likely a complete company name (for company tag filtering)
      // Company names typically have multiple words and special characters
      if (searchValue.includes(' ') && searchValue.length > 10) {
        // Try exact match first, then partial match for company-specific filtering
        conditions.push(
          sql`(
            ${companies.name} ILIKE ${searchValue} OR
            ${companies.name} ILIKE ${`%${searchValue}%`}
          )`
        );
      } else {
        // Regular search across all fields with synonyms
        const searchTerms = searchValue.split(/\s+/);
        
        const searchConditions = searchTerms.map(term => {
          // Create semantic synonyms for common industrial terms
          const synonyms = this.getSearchSynonyms(term.toLowerCase());
          const allTerms = [term, ...synonyms];
          
          // Create OR conditions for each term and its synonyms
          const termConditions = [];
          for (const searchTerm of allTerms) {
            termConditions.push(
              sql`(
                ${companies.name} ILIKE ${`%${searchTerm}%`} OR
                ${companies.description} ILIKE ${`%${searchTerm}%`} OR
                ${companies.description_sv} ILIKE ${`%${searchTerm}%`} OR
                ${companies.categories}::text ILIKE ${`%${searchTerm}%`} OR
                ${companies.city} ILIKE ${`%${searchTerm}%`} OR
                ${companies.region} ILIKE ${`%${searchTerm}%`}
              )`
            );
          }
          
          // Return OR of all synonyms for this term
          return termConditions.length > 1 ? sql`(${sql.join(termConditions, sql` OR `)})` : termConditions[0];
        });
        
        // All search terms must match (AND logic)
        conditions.push(and(...searchConditions));
      }
    }
    
    if (filters?.region && filters.region !== 'Alla regioner') {
      conditions.push(eq(companies.region, filters.region));
    }
    
    if (filters?.categories && filters.categories.length > 0 && !filters.categories.includes('Alla kategorier')) {
      // Use ILIKE to match categories within the array (converted to text)
      const categoryConditions = filters.categories.map(category => 
        sql`${companies.categories}::text ILIKE ${`%${category}%`}`
      );
      conditions.push(sql`(${sql.join(categoryConditions, sql` OR `)})`);
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }
    
    // Enhanced ordering with search relevance
    if (filters?.search) {
      const searchValue = filters.search.trim();
      query = query.orderBy(
        desc(companies.isFeatured),
        // Relevance scoring: exact name matches first, then partial matches
        sql`CASE
          WHEN ${companies.name} ILIKE ${searchValue} THEN 1
          WHEN ${companies.name} ILIKE ${`${searchValue}%`} THEN 2
          WHEN ${companies.name} ILIKE ${`%${searchValue}%`} THEN 3
          WHEN ${companies.categories}::text ILIKE ${`%${searchValue}%`} THEN 4
          WHEN ${companies.description_sv} ILIKE ${`%${searchValue}%`} THEN 5
          WHEN ${companies.description} ILIKE ${`%${searchValue}%`} THEN 6
          WHEN ${companies.city} ILIKE ${`%${searchValue}%`} THEN 7
          WHEN ${companies.region} ILIKE ${`%${searchValue}%`} THEN 8
          ELSE 9
        END`,
        companies.name
      ) as any;
    } else {
      query = query.orderBy(desc(companies.isFeatured), companies.name) as any;
    }
    
    if (filters?.limit) {
      query = query.limit(filters.limit) as any;
    }
    
    if (filters?.offset) {
      query = query.offset(filters.offset) as any;
    }
    
    return await query;
  }

  private getSearchSynonyms(term: string): string[] {
    const synonymMap: Record<string, string[]> = {
      // Service terms
      'service': ['underhåll', 'reparation', 'reparationer'],
      'underhåll': ['service', 'maintenance', 'skötsel'],
      'reparation': ['service', 'repair', 'lagning'],
      'reparationer': ['service', 'repairs', 'lagningar'],
      'reservdelar': ['delar', 'komponenter', 'ersättningsdelar'],
      'delar': ['reservdelar', 'komponenter'],
      
      // Equipment terms
      'maskiner': ['utrustning', 'maskin', 'equipment'],
      'maskin': ['maskiner', 'utrustning', 'equipment'],
      'utrustning': ['maskiner', 'maskin', 'equipment'],
      'cnc': ['cnc-bearbetning', 'bearbetning'],
      'hydraulik': ['hydrauliksystem', 'hydrauliska'],
      'pneumatik': ['pneumatiska', 'tryckluft'],
      
      // Location synonyms (with accent variations)
      'göteborg': ['göteborgs', 'västra götaland', 'goteborg', 'goteborgs'],
      'goteborg': ['göteborg', 'göteborgs', 'västra götaland'],
      'stockholm': ['stockholms', 'stockholms län'],
      'malmö': ['malmös', 'skåne', 'malmo'],
      'malmo': ['malmö', 'malmös', 'skåne'],
      'skåne': ['malmö', 'skåne län', 'skane'],
      'skane': ['skåne', 'malmö', 'skåne län'],
      'västra': ['västra götaland', 'göteborg', 'vastra'],
      'vastra': ['västra', 'västra götaland', 'göteborg'],
      'götaland': ['västra götaland', 'göteborg', 'gotaland'],
      'gotaland': ['götaland', 'västra götaland', 'göteborg'],
      'norrland': ['norrbotten', 'västerbotten'],
      
      // Industry terms
      'industri': ['industrial', 'industriell'],
      'verkstad': ['verkstäder', 'workshop'],
      'produktion': ['tillverkning', 'manufacturing'],
      'automation': ['automatisering', 'robot'],
      'svetsning': ['svets', 'welding'],
      'lyftutrustning': ['lyft', 'kran', 'lyftar']
    };
    
    return synonymMap[term] || [];
  }

  async getCompanyById(id: string): Promise<Company | undefined> {
    const [company] = await db.select().from(companies).where(eq(companies.id, id));
    return company || undefined;
  }

  async getCompanyBySlug(slug: string): Promise<Company | undefined> {
    const [company] = await db.select().from(companies).where(eq(companies.slug, slug));
    return company || undefined;
  }

  async createCompany(insertCompany: InsertCompany): Promise<Company> {
    const [company] = await db
      .insert(companies)
      .values(insertCompany)
      .returning();
    return company;
  }

  async updateCompany(id: string, updateData: Partial<InsertCompany>): Promise<Company | undefined> {
    const [company] = await db
      .update(companies)
      .set(updateData)
      .where(eq(companies.id, id))
      .returning();
    return company || undefined;
  }

  async createQuoteRequest(insertQuoteRequest: InsertQuoteRequest): Promise<QuoteRequest> {
    const [quoteRequest] = await db
      .insert(quoteRequests)
      .values(insertQuoteRequest)
      .returning();
    return quoteRequest;
  }

  async getQuoteRequestsByCompany(companyId: string): Promise<QuoteRequest[]> {
    return await db
      .select()
      .from(quoteRequests)
      .where(eq(quoteRequests.companyId, companyId))
      .orderBy(desc(quoteRequests.submittedAt));
  }

  async createClaimRequest(insertClaimRequest: InsertClaimRequest): Promise<ClaimRequest> {
    const [claimRequest] = await db
      .insert(claimRequests)
      .values(insertClaimRequest)
      .returning();
    return claimRequest;
  }

  async getClaimRequestsByCompany(companyId: string): Promise<ClaimRequest[]> {
    return await db
      .select()
      .from(claimRequests)
      .where(eq(claimRequests.companyId, companyId))
      .orderBy(desc(claimRequests.submittedAt));
  }
}

export const storage = new DatabaseStorage();
