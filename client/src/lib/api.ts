import { apiRequest } from "./queryClient";
import type { Company, InsertQuoteRequest, InsertClaimRequest } from "@shared/schema";

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
    
    getBySlug: async (slug: string): Promise<Company> => {
      const response = await apiRequest('GET', `/api/companies/${slug}`);
      return response.json();
    },
    
    getById: async (id: string): Promise<Company> => {
      const response = await apiRequest('GET', `/api/company-profile/${id}`);
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
