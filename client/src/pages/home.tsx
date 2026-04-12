import { useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { api } from "@/lib/api";
import SmartSearch, { type SearchTag } from "@/components/search/smart-search";
import CompanyCard from "@/components/company/company-card";
import { Skeleton } from "@/components/ui/skeleton";
import type { Company } from "@shared/schema";

export default function Home() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchTags, setSearchTags] = useState<SearchTag[]>([]);

  const filters = {
    search: searchQuery,
    region: searchTags.find(tag => tag.type === 'region')?.value || '',
    categories: searchTags.filter(tag => tag.type === 'category').map(tag => tag.value),
  };

  const { data: companies = [], isLoading } = useQuery({
    queryKey: ['/api/companies', { ...filters, limit: 18 }],
    queryFn: () => api.companies.getAll({ ...filters, limit: 18 }),
    staleTime: 30_000,
  });

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
              Service och support när maskinen stannar.
            </p>

            <p className="font-medium mb-12 text-[#A3A3A3]" style={{ fontFamily: 'PP Neue Montreal, Inter Tight, sans-serif', fontSize: '42px', lineHeight: '1.1', maxWidth: '900px', fontWeight: 500, letterSpacing: '-0.01em' }}>Hitta rätt företag, snabbt.</p>

            <Link href="/begar-offert">
              <Button className="inline-flex items-center bg-primary hover:bg-primary-dark text-white font-medium px-8 transition-colors group text-lg" style={{ height: '56px' }}>
                Hitta Service
                <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
            <p className="mt-4 text-sm text-gray-500">
              Driver du ett serviceföretag? Sök upp din profil och{" "}
              <a href="#directory" style={{ color: '#1D9E75' }}>ta över den gratis</a>.
            </p>
          </div>
        </div>
      </section>

      {/* Credibility stat strip */}
      <div className="w-full bg-[#F5F5F5] py-4">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-center gap-8 text-sm font-medium text-[#171717]">
          <span>1 200+ företag registrerade</span>
          <span className="text-gray-300">|</span>
          <span>Täcker alla 21 län</span>
          <span className="text-gray-300">|</span>
          <span>Kostnadsfri grundprofil</span>
        </div>
      </div>

      {/* Company Directory Section */}
      <section id="directory" className="py-16 bg-background">
        <div className="max-w-[1700px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-12">
            <h3 className="text-3xl font-bold text-[#171717]">
              Serviceföretag i hela Sverige
            </h3>
            <p className="text-sm text-gray-500 mt-1">Sök bland företag som kan hjälpa dig med reparation, underhåll och service.</p>
          </div>

          <div className="max-w-2xl mb-8">
            <SmartSearch
              onSearch={handleSmartSearch}
              placeholder="Sök företag, ort eller specialområde..."
            />
          </div>

          {searchQuery && (
            <p className="text-sm text-gray-500 mb-8">
              Sökning: "{searchQuery}"
            </p>
          )}

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
