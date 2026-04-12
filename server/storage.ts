import {
  users, companies, claimRequests, quoteRequests, companyUsers,
  companyProfiles, contacts,
  type User, type InsertUser,
  type Company, type InsertCompany,
  type ClaimRequest, type InsertClaimRequest,
  type QuoteRequest, type InsertQuoteRequest,
  type CompanyUser, type InsertCompanyUser,
  type CompanyProfile, type InsertCompanyProfile,
  type Contact, type InsertContact,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, ilike, inArray, desc, sql } from "drizzle-orm";

// Company enriched with a computed claim status derived from company_users
export type CompanyWithClaimed = Company & { isClaimed: boolean };

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserPassword(id: string, hashedPassword: string): Promise<void>;

  // Companies
  getCompanies(filters?: {
    search?: string;
    region?: string;
    categories?: string[];
    limit?: number;
    offset?: number;
  }): Promise<CompanyWithClaimed[]>;
  getCompaniesCount(filters?: {
    search?: string;
    region?: string;
    categories?: string[];
  }): Promise<number>;
  getCompanyById(id: string): Promise<CompanyWithClaimed | undefined>;
  getCompanyBySlug(slug: string): Promise<CompanyWithClaimed | undefined>;
  getCompanyByClerkOrgId(orgId: string): Promise<Company | undefined>;
  createCompany(company: InsertCompany): Promise<Company>;
  updateCompany(id: string, company: Partial<InsertCompany>): Promise<Company | undefined>;

  // Quote Requests
  createQuoteRequest(quoteRequest: InsertQuoteRequest): Promise<QuoteRequest>;
  getQuoteRequestsByCompany(companyId: string): Promise<QuoteRequest[]>;

  // Claim Requests
  createClaimRequest(claimRequest: InsertClaimRequest): Promise<ClaimRequest>;
  getClaimRequestById(id: string): Promise<ClaimRequest | undefined>;
  getClaimRequestsByCompany(companyId: string): Promise<ClaimRequest[]>;
  getAllClaimRequests(): Promise<ClaimRequest[]>;
  updateClaimRequestStatus(id: string, status: 'approved' | 'rejected' | 'pending', reviewedBy: string | null, reviewNotes?: string): Promise<void>;
  deleteClaimRequest(id: string): Promise<void>;

  // Company Users
  createCompanyUser(companyUser: InsertCompanyUser & { accessToken: string }): Promise<CompanyUser>;
  getCompanyUserByEmail(email: string): Promise<CompanyUser | undefined>;
  getCompanyUserByToken(accessToken: string): Promise<CompanyUser | undefined>;
  getCompanyUsersByCompany(companyId: string): Promise<CompanyUser[]>;
  getAllCompanyUsers(): Promise<CompanyUser[]>;
  updateCompanyUser(id: string, updateData: Partial<InsertCompanyUser>): Promise<CompanyUser | undefined>;
  deleteCompanyUser(id: string): Promise<CompanyUser | undefined>;

  // Company Profiles
  getCompanyProfile(companyId: string): Promise<CompanyProfile | undefined>;
  upsertCompanyProfile(companyId: string, data: Partial<InsertCompanyProfile>): Promise<CompanyProfile>;

  // Contacts
  getContactsByCompany(companyId: string): Promise<Contact[]>;
  createContact(contact: InsertContact): Promise<Contact>;
  deleteContact(id: string, companyId: string): Promise<void>;

  // Admin
  getAllCompaniesWithProfile(): Promise<(CompanyWithClaimed & { profile: CompanyProfile | null; contacts: Contact[] })[]>;
}

export class DatabaseStorage implements IStorage {
  /** Returns a Set of company IDs that have at least one company_users row (i.e. have been claimed). */
  private async getClaimedCompanyIds(): Promise<Set<string>> {
    const rows = await db
      .selectDistinct({ companyId: companyUsers.companyId })
      .from(companyUsers);
    return new Set(rows.map((r) => r.companyId));
  }

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

  async updateUserPassword(id: string, hashedPassword: string): Promise<void> {
    await db
      .update(users)
      .set({ password: hashedPassword })
      .where(eq(users.id, id));
  }

  async getCompanies(filters?: {
    search?: string;
    region?: string;
    categories?: string[];
    limit?: number;
    offset?: number;
  }): Promise<CompanyWithClaimed[]> {
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
        sql`CASE WHEN ${companies.clerkOrganizationId} IS NOT NULL THEN 0 ELSE 1 END`,
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
      query = query.orderBy(
        sql`CASE WHEN ${companies.clerkOrganizationId} IS NOT NULL THEN 0 ELSE 1 END`,
        desc(companies.isFeatured),
        companies.name
      ) as any;
    }
    
    if (filters?.limit) {
      query = query.limit(filters.limit) as any;
    }
    
    if (filters?.offset) {
      query = query.offset(filters.offset) as any;
    }

    const rows = await query;
    const claimedIds = await this.getClaimedCompanyIds();
    return rows.map((c) => ({ ...c, isClaimed: claimedIds.has(c.id) }));
  }

  async getCompaniesCount(filters?: {
    search?: string;
    region?: string;
    categories?: string[];
  }): Promise<number> {
    let query = db.select({ count: sql<number>`count(*)` }).from(companies);

    const conditions = [];

    if (filters?.search) {
      const searchValue = filters.search.trim();

      if (searchValue.includes(' ') && searchValue.length > 10) {
        conditions.push(
          sql`(
            ${companies.name} ILIKE ${searchValue} OR
            ${companies.name} ILIKE ${`%${searchValue}%`}
          )`
        );
      } else {
        const searchTerms = searchValue.split(/\s+/);
        const searchConditions = searchTerms.map(term => {
          const synonyms = this.getSearchSynonyms(term.toLowerCase());
          const allTerms = [term, ...synonyms];
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
          return termConditions.length > 1 ? sql`(${sql.join(termConditions, sql` OR `)})` : termConditions[0];
        });
        conditions.push(and(...searchConditions));
      }
    }

    if (filters?.region && filters.region !== 'Alla regioner') {
      conditions.push(eq(companies.region, filters.region));
    }

    if (filters?.categories && filters.categories.length > 0 && !filters.categories.includes('Alla kategorier')) {
      const categoryConditions = filters.categories.map(category =>
        sql`${companies.categories}::text ILIKE ${`%${category}%`}`
      );
      conditions.push(sql`(${sql.join(categoryConditions, sql` OR `)})`);
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    const [result] = await query;
    return Number(result.count);
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

  async getCompanyById(id: string): Promise<CompanyWithClaimed | undefined> {
    const [company] = await db.select().from(companies).where(eq(companies.id, id));
    if (!company) return undefined;
    const claimRows = await db
      .select({ companyId: companyUsers.companyId })
      .from(companyUsers)
      .where(eq(companyUsers.companyId, company.id))
      .limit(1);
    return { ...company, isClaimed: claimRows.length > 0 };
  }

  async getCompanyBySlug(slug: string): Promise<CompanyWithClaimed | undefined> {
    const [company] = await db.select().from(companies).where(eq(companies.slug, slug));
    if (!company) return undefined;
    const claimRows = await db
      .select({ companyId: companyUsers.companyId })
      .from(companyUsers)
      .where(eq(companyUsers.companyId, company.id))
      .limit(1);
    return { ...company, isClaimed: claimRows.length > 0 };
  }

  async getCompanyByClerkOrgId(orgId: string): Promise<Company | undefined> {
    const [company] = await db.select().from(companies).where(eq(companies.clerkOrganizationId, orgId));
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

  async getAllClaimRequests(): Promise<ClaimRequest[]> {
    return await db
      .select()
      .from(claimRequests)
      .orderBy(desc(claimRequests.submittedAt));
  }

  async getClaimRequestById(id: string): Promise<ClaimRequest | undefined> {
    const [claimRequest] = await db.select().from(claimRequests).where(eq(claimRequests.id, id));
    return claimRequest || undefined;
  }

  async updateClaimRequestStatus(
    id: string, 
    status: 'approved' | 'rejected' | 'pending', 
    reviewedBy: string | null, 
    reviewNotes?: string
  ): Promise<void> {
    await db
      .update(claimRequests)
      .set({
        status,
        reviewedAt: status === 'pending' ? null : new Date(),
        reviewedBy: status === 'pending' ? null : reviewedBy,
        reviewNotes,
      })
      .where(eq(claimRequests.id, id));
  }

  async deleteClaimRequest(id: string): Promise<void> {
    await db.delete(claimRequests).where(eq(claimRequests.id, id));
  }

  async createCompanyUser(insertCompanyUser: InsertCompanyUser & { accessToken: string }): Promise<CompanyUser> {
    const [companyUser] = await db
      .insert(companyUsers)
      .values(insertCompanyUser)
      .returning();
    return companyUser;
  }

  async getCompanyUserByEmail(email: string): Promise<CompanyUser | undefined> {
    const [companyUser] = await db.select().from(companyUsers).where(eq(companyUsers.email, email));
    return companyUser || undefined;
  }

  async getCompanyUserByToken(accessToken: string): Promise<CompanyUser | undefined> {
    const [companyUser] = await db.select().from(companyUsers).where(eq(companyUsers.accessToken, accessToken));
    return companyUser || undefined;
  }

  async getCompanyUsersByCompany(companyId: string): Promise<CompanyUser[]> {
    return await db
      .select()
      .from(companyUsers)
      .where(eq(companyUsers.companyId, companyId))
      .orderBy(desc(companyUsers.createdAt));
  }

  async getAllCompanyUsers(): Promise<CompanyUser[]> {
    return await db
      .select()
      .from(companyUsers)
      .orderBy(desc(companyUsers.createdAt));
  }

  async updateCompanyUser(id: string, updateData: Partial<InsertCompanyUser>): Promise<CompanyUser | undefined> {
    const [companyUser] = await db
      .update(companyUsers)
      .set(updateData)
      .where(eq(companyUsers.id, id))
      .returning();
    return companyUser || undefined;
  }

  async deleteCompanyUser(id: string): Promise<CompanyUser | undefined> {
    const [companyUser] = await db
      .delete(companyUsers)
      .where(eq(companyUsers.id, id))
      .returning();
    return companyUser || undefined;
  }

  async getCompanyProfile(companyId: string): Promise<CompanyProfile | undefined> {
    const [profile] = await db
      .select()
      .from(companyProfiles)
      .where(eq(companyProfiles.companyId, companyId));
    return profile || undefined;
  }

  async upsertCompanyProfile(companyId: string, data: Partial<InsertCompanyProfile>): Promise<CompanyProfile> {
    const [profile] = await db
      .insert(companyProfiles)
      .values({ companyId, ...data, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: companyProfiles.companyId,
        set: { ...data, updatedAt: new Date() },
      })
      .returning();
    return profile;
  }

  async getContactsByCompany(companyId: string): Promise<Contact[]> {
    return await db
      .select()
      .from(contacts)
      .where(eq(contacts.companyId, companyId))
      .orderBy(contacts.createdAt);
  }

  async createContact(contact: InsertContact): Promise<Contact> {
    const [created] = await db
      .insert(contacts)
      .values(contact)
      .returning();
    return created;
  }

  async deleteContact(id: string, companyId: string): Promise<void> {
    await db
      .delete(contacts)
      .where(and(eq(contacts.id, id), eq(contacts.companyId, companyId)));
  }

  async getAllCompaniesWithProfile(): Promise<(CompanyWithClaimed & { profile: CompanyProfile | null; contacts: Contact[] })[]> {
    const allCompanies = await db.select().from(companies).orderBy(companies.name);
    const claimedIds = await this.getClaimedCompanyIds();
    const results = await Promise.all(
      allCompanies.map(async (company) => {
        const profile = await this.getCompanyProfile(company.id) ?? null;
        const companyContacts = await this.getContactsByCompany(company.id);
        return { ...company, isClaimed: claimedIds.has(company.id), profile, contacts: companyContacts };
      })
    );
    return results;
  }
}

export const storage = new DatabaseStorage();
