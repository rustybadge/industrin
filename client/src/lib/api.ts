import { apiRequest } from "./queryClient";
import type { Company, InsertQuoteRequest, InsertClaimRequest } from "@shared/schema";

export interface CompanyProfile {
  visitingAddress?: string | null;
  postalAddress?: string | null;
  openingHours?: string | null;
}

export interface CompanyContact {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  sortOrder?: number | null;
}

export type CompanyDetail = Company & {
  profile: CompanyProfile;
  contacts: CompanyContact[];
};

export const api = {
  companies: {
    getAll: async (filters?: {
      search?: string;
      region?: string;
      categories?: string[];
      limit?: number;
      offset?: number;
    }): Promise<Company[]> => {
      const params = new URLSearchParams();

      if (filters?.search) params.append('search', filters.search);
      if (filters?.region) params.append('region', filters.region);
      if (filters?.categories?.length) params.append('categories', filters.categories.join(','));
      if (filters?.limit) params.append('limit', filters.limit.toString());
      if (filters?.offset) params.append('offset', filters.offset.toString());

      const response = await apiRequest('GET', `/api/companies?${params.toString()}`);
      return response.json();
    },

    getBySlug: async (slug: string): Promise<CompanyDetail> => {
      const response = await apiRequest('GET', `/api/companies/${slug}`);
      return response.json();
    },

    getById: async (id: string): Promise<CompanyDetail> => {
      const response = await apiRequest('GET', `/api/company-profile/${id}`);
      return response.json();
    },
  },

  admin: {
    getAllCompanies: async (token: string): Promise<CompanyDetail[]> => {
      const response = await fetch('/api/admin/companies', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error(`Failed to fetch companies: ${response.status}`);
      return response.json();
    },

    getCompanyDetail: async (companyId: string, token: string): Promise<CompanyDetail> => {
      const response = await fetch(`/api/admin/companies/${companyId}/detail`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error(`Failed to fetch company: ${response.status}`);
      return response.json();
    },
  },

  quoteRequests: {
    create: async (data: InsertQuoteRequest) => {
      const response = await apiRequest('POST', '/api/quote-requests', data);
      return response.json();
    },
  },

  claimRequests: {
    create: async (data: InsertClaimRequest) => {
      const response = await apiRequest('POST', '/api/claim-requests', data);
      return response.json();
    },
  },

  categories: {
    getAll: async (): Promise<string[]> => {
      const response = await apiRequest('GET', '/api/categories');
      return response.json();
    },
  },

  regions: {
    getAll: async (): Promise<string[]> => {
      const response = await apiRequest('GET', '/api/regions');
      return response.json();
    },
  },

  seed: {
    companies: async () => {
      const response = await apiRequest('POST', '/api/seed-companies');
      return response.json();
    },
  },
};
