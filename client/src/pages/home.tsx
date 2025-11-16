import { useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, ArrowRight } from "lucide-react";
import { api } from "@/lib/api";
import SmartSearch, { type SearchTag } from "@/components/search/smart-search";
import SortOptions from "@/components/search/sort-options";
import CompanyCard from "@/components/company/company-card";
import { Skeleton } from "@/components/ui/skeleton";
import type { Company } from "@shared/schema";

export default function Home() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchTags, setSearchTags] = useState<SearchTag[]>([]);
  const [sortBy, setSortBy] = useState("name-asc");
  
  // Build filters from search state
  const filters = {
    search: searchQuery,
    region: searchTags.find(tag => tag.type === 'region')?.value || '',
    categories: searchTags.filter(tag => tag.type === 'category').map(tag => tag.value),
  };

  // Get companies for homepage with filters
  const { data: allCompanies = [], isLoading } = useQuery({
    queryKey: ['/api/companies', { ...filters, limit: 500 }],
    queryFn: () => api.companies.getAll({ ...filters, limit: 500 }),
  });

  // Sort companies, prioritizing Utmärkt/Verifierat, then using selected sort option
  const companies = [...allCompanies].sort((a, b) => {
    // Helper: higher number = better description
    const getDescriptionPriority = (company: Company) => {
      if (!company.description || company.description.length === 0) return 0;
      if (company.description.length < 50) return 1;
      if (company.description.length < 150) return 2;
      return 3;
    };

    // Helper: prioritize featured/verified companies
    const getBadgePriority = (company: Company) => {
      let score = 0;
      if ((company as any).isFeatured) score += 2; // Utmärkt
      if ((company as any).isVerified) score += 1; // Verifierat
      return score;
    };

    const aBadge = getBadgePriority(a);
    const bBadge = getBadgePriority(b);
    if (aBadge !== bBadge) {
      return bBadge - aBadge; // Companies with badges first
    }

    switch (sortBy) {
      case "name-asc": {
        const aPriority = getDescriptionPriority(a);
        const bPriority = getDescriptionPriority(b);
        if (aPriority !== bPriority) {
          return bPriority - aPriority;
        }
        return a.name.localeCompare(b.name, "sv");
      }
      case "name-desc": {
        const aPriorityDesc = getDescriptionPriority(a);
        const bPriorityDesc = getDescriptionPriority(b);
        if (aPriorityDesc !== bPriorityDesc) {
          return bPriorityDesc - aPriorityDesc;
        }
        return b.name.localeCompare(a.name, "sv");
      }
      case "relevance": {
        if (!searchQuery) return 0;
        const aRelevant = a.name.toLowerCase().includes(searchQuery.toLowerCase()) ? 1 : 0;
        const bRelevant = b.name.toLowerCase().includes(searchQuery.toLowerCase()) ? 1 : 0;
        return bRelevant - aRelevant;
      }
      case "newest":
        return b.id.localeCompare(a.id);
      default:
        return 0;
    }
  });

  // Handle smart search
  const handleSmartSearch = (query: string, tags: SearchTag[]) => {
    setSearchQuery(query);
    setSearchTags(tags);
  };

  return (
    <div>
      {/* Hero Section */}
      <section className="py-24 lg:py-32 bg-white">
        <div className="max-w-[1700px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl">
            <p className="font-medium mb-1 text-[#0A0A0A]" style={{ fontFamily: 'PP Neue Montreal, Inter Tight, sans-serif', fontSize: '42px', lineHeight: '1.1', fontWeight: 500, letterSpacing: '-0.01em' }}>
              Eftermarknad. Reservdelar. Reparationer.
            </p>
            
            <p className="font-medium mb-12 text-[#A3A3A3]" style={{ fontFamily: 'PP Neue Montreal, Inter Tight, sans-serif', fontSize: '42px', lineHeight: '1.1', maxWidth: '900px', fontWeight: 500, letterSpacing: '-0.01em' }}>Vi samlar Sveriges bästa serviceföretag för reparation och underhåll. Hitta rätt partner snabbt, nära dig och redo att agera.</p>
            
            {/* Clean CTA */}
            <Link href="/companies">
              <Button className="inline-flex items-center bg-primary hover:bg-primary-dark text-white font-medium px-8 transition-colors group text-lg" style={{ height: '56px' }}>
                Hitta hjälp nu
                <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
          </div>
        </div>
      </section>
      {/* Company Directory Section */}
      <section className="py-16 bg-background">
        <div className="max-w-[1700px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-12">
            <h3 className="text-3xl font-bold mb-4 text-[#171717]">
              Sök och filtrera bland företag som kan hjälpa dig med reparation, underhåll och service.
            </h3>
          </div>

          <div className="max-w-2xl mb-8">
            <SmartSearch 
              onSearch={handleSmartSearch}
              placeholder="Sök företag, ort eller specialområde..."
            />
          </div>

          {/* Results header + sort dropdown (same behaviour as companies page) */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4">
            <div>
              {searchQuery && (
                <p className="text-sm text-gray-500 mt-1">
                  Sökning: "{searchQuery}"
                </p>
              )}
            </div>
            <SortOptions value={sortBy} onChange={setSortBy} />
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center">
                      <Skeleton className="w-12 h-12 rounded-lg mr-3" />
                      <div>
                        <Skeleton className="h-4 w-32 mb-2" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                    </div>
                    <Skeleton className="h-6 w-16" />
                  </div>
                  <Skeleton className="h-16 w-full mb-4" />
                  <div className="flex gap-2 mb-4">
                    <Skeleton className="h-6 w-20" />
                    <Skeleton className="h-6 w-16" />
                  </div>
                  <div className="flex justify-between items-center">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-9 w-20" />
                  </div>
                </div>
              ))}
            </div>
          ) : companies.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-lg text-gray-600 mb-4">Inga företag hittades med de valda filtren.</p>
              <p className="text-sm text-gray-500">Försök att ändra dina sökkriterier eller ta bort några filter.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {companies.map((company: Company) => (
                <CompanyCard key={company.id} company={company} />
              ))}
            </div>
          )}

          {companies.length > 0 && (
            <div className="text-center mt-8">
              <Link href="/companies">
                <Button className="bg-primary hover:bg-primary-dark text-white px-8 group" style={{ height: '56px' }}>
                  Se alla företag
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
