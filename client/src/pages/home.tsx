import { useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, ArrowRight } from "lucide-react";
import { api } from "@/lib/api";
import SmartSearch, { type SearchTag } from "@/components/search/smart-search";
import CompanyCard from "@/components/company/company-card";
import { Skeleton } from "@/components/ui/skeleton";
import type { Company } from "@shared/schema";

export default function Home() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchTags, setSearchTags] = useState<SearchTag[]>([]);
  
  // Build filters from search state
  const filters = {
    search: searchQuery,
    region: searchTags.find(tag => tag.type === 'region')?.value || '',
    categories: searchTags.filter(tag => tag.type === 'category').map(tag => tag.value),
  };

  // Get companies for homepage with filters
  const { data: allCompanies = [], isLoading } = useQuery({
    queryKey: ['/api/companies', { ...filters, limit: 6 }],
    queryFn: () => api.companies.getAll({ ...filters, limit: 6 }),
  });

  // Sort companies with description priority, then alphabetically (A-Ö default)
  const companies = [...allCompanies].sort((a, b) => {
    // Helper function to get description priority (higher number = better description)
    const getDescriptionPriority = (company: Company) => {
      if (!company.description || company.description.length === 0) return 0;
      if (company.description.length < 50) return 1;
      if (company.description.length < 150) return 2;
      return 3; // 150+ characters = highest priority
    };

    // First prioritize by description quality, then alphabetical
    const aPriority = getDescriptionPriority(a);
    const bPriority = getDescriptionPriority(b);
    if (aPriority !== bPriority) {
      return bPriority - aPriority; // Higher priority first
    }
    return a.name.localeCompare(b.name, 'sv');
  });

  // Handle smart search
  const handleSmartSearch = (query: string, tags: SearchTag[]) => {
    setSearchQuery(query);
    setSearchTags(tags);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.location.href = `/companies?search=${encodeURIComponent(searchQuery)}`;
    }
  };

  return (
    <div>
      {/* Hero Section */}
      <section className="py-24 lg:py-32 bg-white">
        <div className="max-w-[1700px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl">
            <h1 className="mobile-hero-h1 font-light leading-tight mb-8 text-[#161616]">
              Eftermarknad. Reservdelar.<br />
              <span className="text-gray-600">Reparationer.</span>
            </h1>
            
            <p className="text-xl md:text-2xl text-gray-600 mb-12 max-w-2xl font-light">Vi samlar Sveriges bästa serviceföretag för reparation, underhåll och reservdelar. Hitta rätt partner snabbt – nära dig och redo att agera.</p>
            
            {/* Clean CTA */}
            <Link href="/companies">
              <Button className="inline-flex items-center bg-gray-900 hover:bg-gray-800 text-white font-medium px-8 transition-colors group text-lg" style={{ height: '56px' }}>
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
            <h3 className="text-3xl font-bold mb-4 text-[#161616]">Hitta rätt serviceföretag direkt</h3>
            <p className="text-lg text-gray-600">Sök efter tjänst och region för att snabbt hitta den hjälp du behöver.</p>
          </div>

          <div className="max-w-2xl mb-8">
            <SmartSearch 
              onSearch={handleSmartSearch}
              placeholder="Sök företag, ort eller specialområde..."
            />
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
