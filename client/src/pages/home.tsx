import { useState } from "react";
import { Link } from "wouter";
import heroBg from "@/assets/images/hero-pattern.png";
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
    staleTime: 0,
  });

  const handleSmartSearch = (query: string, tags: SearchTag[]) => {
    setSearchQuery(query);
    setSearchTags(tags);
  };

  return (
    <div>
      {/* Announcement bar */}
      <div className="w-full bg-[#fdfdfd] border-b border-[#f2f2f2] py-3 px-4">
        <p className="text-center text-sm font-medium text-[#092490] tracking-tight">
          1 200+ företag registrerade | Täcker alla 21 län | Kostnadsfri grundprofil
        </p>
      </div>

      {/* Hero Section */}
      <section className="relative bg-white py-28 lg:py-36 overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          <img src={heroBg} alt="" className="absolute w-full h-full object-cover" />
          <div className="absolute inset-0 bg-white/[0.94] mix-blend-hard-light" />
        </div>
        <div className="relative max-w-[1700px] mx-auto px-8">
          <div className="max-w-[885px] flex flex-col gap-6">
            <div>
              <p
                className="font-medium text-[#1d1d1d] m-0"
                style={{ fontFamily: 'PP Neue Montreal, Inter Tight, sans-serif', fontSize: '42px', lineHeight: '1.15', letterSpacing: '-1.26px' }}
              >
                Service och support när maskinen stannar.
              </p>
              <p
                className="font-medium text-[#092490] m-0"
                style={{ fontFamily: 'PP Neue Montreal, Inter Tight, sans-serif', fontSize: '42px', lineHeight: '1.15', letterSpacing: '-1.26px' }}
              >
                Hitta rätt företag, snabbt.
              </p>
            </div>
            <Link href="/begar-offert">
              <Button
                className="inline-flex items-center bg-primary hover:bg-primary-dark text-white font-medium px-8 text-sm tracking-tight"
                style={{ height: '56px' }}
              >
                Hitta service →
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Yellow CTA Banner */}
      <div className="w-full bg-[#f7d046]">
        <div className="max-w-[1700px] mx-auto px-8 py-6 flex items-center justify-between gap-8">
          <p className="font-medium text-[#1d1d1d] text-xl tracking-tight m-0">
            Driver du ett serviceföretag? Sök upp din profil och ta över den gratis.
          </p>
          <Link href="/for-foretag">
            <Button
              variant="outline"
              className="bg-white border border-[#dcdcdc] text-[#092490] font-medium px-5 text-sm tracking-tight hover:bg-gray-50 shrink-0"
              style={{ height: '48px' }}
            >
              Sök efter ditt företag
            </Button>
          </Link>
        </div>
      </div>

      {/* Company Directory Section */}
      <section id="directory" className="py-16 bg-background">
        <div className="max-w-[1700px] mx-auto px-8">
          <div className="mb-6">
            <h3 className="text-[#1d1d1d] custom-size" style={{ fontSize: '32px', lineHeight: '1.2', letterSpacing: '-0.96px', fontWeight: 500 }}>
              Serviceföretag i hela Sverige
            </h3>
            <p className="text-xl text-[#666] mt-2 tracking-tight">
              Sök bland företag som kan hjälpa dig med reparation, underhåll och service.
            </p>
          </div>

          <div className="mb-8">
            <SmartSearch onSearch={handleSmartSearch} />
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-[#f7f7f7] p-6">
                  <Skeleton className="h-5 w-40 mb-3" />
                  <Skeleton className="h-16 w-full mb-4" />
                  <Skeleton className="h-4 w-24" />
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
              {companies.map((company) => (
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
