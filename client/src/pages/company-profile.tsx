import { useParams, Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";



import { 
  Mail, 
  Phone, 
  Globe, 
  MapPin, 
  Star, 
  Tag, 
  Shield,
  UserCheck,
  Building,
  ArrowLeft
} from "lucide-react";

export default function CompanyProfile() {
  const params = useParams();
  const [location, navigate] = useLocation();

  // Check if we have an ID (from /company/:id) or slug (from /companies/:slug)
  const companyId = params.id;
  const companySlug = params.slug;

  const { data: company, isLoading, error } = useQuery({
    queryKey: companyId ? ['/api/company-profile', companyId] : ['/api/companies', companySlug],
    queryFn: () => companyId ? api.companies.getById(companyId) : api.companies.getBySlug(companySlug!),
    enabled: !!(companyId || companySlug),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-8">
            <div className="flex items-start justify-between mb-8">
              <div className="flex items-start">
                <Skeleton className="w-24 h-24 rounded-xl mr-6" />
                <div>
                  <Skeleton className="h-10 w-80 mb-3" />
                  <Skeleton className="h-6 w-56 mb-3" />
                  <Skeleton className="h-5 w-40" />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
              <div className="lg:col-span-2">
                <Skeleton className="h-40 w-full mb-8" />
                <Skeleton className="h-20 w-full" />
              </div>
              <div>
                <Skeleton className="h-60 w-full" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !company) {
    return (
      <div className="min-h-screen bg-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Card className="border border-gray-200 shadow-sm">
            <CardContent className="pt-16 pb-16 text-center">
              <h1 className="text-3xl font-bold text-[#1f2937] mb-4 tracking-tight">Företag hittades inte</h1>
              <p className="text-gray-600 text-lg">Det företag du letar efter finns inte eller har flyttats.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Use Swedish description if available, otherwise fall back to English
  const displayDescription = company.description_sv || company.description;

  return (
    <div className="min-h-screen bg-white py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back Button */}
        <div className="mb-6">
          <Link href="/companies">
            <Button 
              variant="ghost" 
              className="text-black hover:text-gray-700 hover:bg-transparent transition-colors flex items-center gap-2 px-3 py-2 group pl-[4px] pr-[4px]"
            >
              <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
              Tillbaka till företagslista
            </Button>
          </Link>
        </div>
        
        <div className="relative">
          {/* Company Profile Header */}
          <div className="flex flex-col md:flex-row md:items-start md:justify-between mb-8">
            <div className="mb-6 md:mb-0">
              <h1 className="font-bold mb-3 tracking-tight text-[42px] text-[#161616]">{company.name}</h1>
              <p className="text-xl text-gray-600 mb-3 font-medium">{company.city || company.location}</p>
              <div className="flex items-center gap-3">
                {company.isVerified && (
                  <Badge variant="secondary" className="bg-green-50 text-green-700 border border-green-200 px-3 py-1">
                    <Shield className="h-3 w-3 mr-1" />
                    Verifierat företag
                  </Badge>
                )}
                {company.isFeatured && (
                  <Badge variant="secondary" className="bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1">
                    <Star className="h-3 w-3 mr-1" />
                    Premium
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Company Actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
            <Button 
              onClick={() => navigate(`/companies/${companySlug}/quote`)}
              className="bg-[#1f2937] hover:bg-[#374151] text-white font-semibold py-3 px-6 transition-colors flex items-center justify-center h-12"
            >
              <Mail className="mr-3 h-5 w-5" />
              Begär offert
            </Button>
            <Button 
              variant="outline"
              className="bg-white border-2 border-[#1f2937] text-[#1f2937] hover:bg-[#1f2937] hover:text-white font-semibold py-3 px-6 transition-colors flex items-center justify-center h-12"
              disabled={!company.phone}
            >
              <Phone className="mr-3 h-5 w-5" />
              Ring direkt
            </Button>
            <Button 
              variant="outline"
              onClick={() => navigate(`/ansokkontroll/${companySlug || companyId}`)}
              className="bg-white border-2 border-gray-300 text-gray-700 hover:border-[#1f2937] hover:text-[#1f2937] font-semibold py-3 px-6 transition-colors flex items-center justify-center h-12"
            >
              <UserCheck className="mr-3 h-5 w-5" />
              Äger du detta företag?
            </Button>
          </div>

          {/* Company Details */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            <div className="lg:col-span-2 space-y-8">
              <div>
                <h2 className="font-bold mb-6 tracking-tight custom-size text-[#161616] text-[38px]" style={{fontSize: '38px'}}>Om företaget</h2>
                <div className="prose prose-gray max-w-none">
                  <p className="text-gray-700 leading-7 text-lg whitespace-pre-wrap">
                    {displayDescription}
                  </p>
                </div>
              </div>

              <div>
                <h3 className="text-xl font-bold mb-5 text-[#161616]" style={{letterSpacing: '-0.01em'}}>Serviceområden</h3>
                <div className="flex flex-wrap gap-3">
                  {company.serviceområden && company.serviceområden.length > 0 ? (
                    company.serviceområden.map((serviceområde) => (
                      <Badge 
                        key={serviceområde} 
                        variant="outline" 
                        className="bg-blue-50 text-blue-700 border border-blue-200 px-5 py-2 rounded-full font-medium text-sm hover:bg-blue-100 transition-colors"
                      >
                        {serviceområde}
                      </Badge>
                    ))
                  ) : (
                    <Badge 
                      variant="outline" 
                      className="bg-gray-50 text-gray-500 border border-gray-200 px-5 py-2 rounded-full font-medium text-sm"
                    >
                      Inga serviceområden angivna
                    </Badge>
                  )}
                </div>
              </div>

              {company.isVerified && (
                <div>
                  <h3 className="text-xl font-bold text-[#1f2937] mb-5 tracking-tight">Certifieringar</h3>
                  <div className="flex flex-wrap gap-4">
                    <div className="flex items-center bg-green-50 border border-green-200 px-5 py-3 rounded-xl">
                      <Tag className="h-5 w-5 text-green-600 mr-3" />
                      <span className="text-green-800 font-semibold">ISO 9001:2015</span>
                    </div>
                    <div className="flex items-center bg-blue-50 border border-blue-200 px-5 py-3 rounded-xl">
                      <Shield className="h-5 w-5 text-blue-600 mr-3" />
                      <span className="text-blue-800 font-semibold">Kvalitetscertifierat</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-6">
              <Card className="border border-gray-200 shadow-sm">
                <CardContent className="p-7">
                  <h3 className="text-xl font-bold mb-6 tracking-tight text-[#161616]">Kontaktinformation</h3>
                  <div className="space-y-3">
                    <div className="group py-2 border-b border-gray-100">
                      <a 
                        href={`mailto:${company.contactEmail}`}
                        className="text-gray-700 hover:text-[#1f2937] transition-colors font-medium break-all"
                      >
                        {company.contactEmail}
                      </a>
                    </div>
                    {company.phone && (
                      <div className="group py-2 border-b border-gray-100">
                        <a 
                          href={`tel:${company.phone}`}
                          className="text-gray-700 hover:text-[#1f2937] transition-colors font-medium"
                        >
                          {company.phone}
                        </a>
                      </div>
                    )}
                    {company.website && (
                      <div className="group py-2 border-b border-gray-100">
                        <a 
                          href={`https://${company.website}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-[#1f2937] hover:underline font-medium break-all"
                        >
                          {company.website}
                        </a>
                      </div>
                    )}
                    {(company.address || company.city) && (
                      <div className="group py-2">
                        <div className="text-gray-700 font-medium">
                          {company.address && <div>{company.address}</div>}
                          {company.postalCode && company.city && (
                            <div>{company.postalCode} {company.city}</div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Subtle claim company link */}
                  <div className="mt-6 pt-4 border-t border-gray-100">
                    <button
                      onClick={() => navigate(`/ansokkontroll/${companySlug || companyId}`)}
                      className="text-sm text-gray-500 hover:text-[#1f2937] transition-colors group text-left"
                    >
                      Fel eller saknad info? Klicka här för att uppdatera
                      <span className="ml-1 transition-transform group-hover:translate-x-1">→</span>
                    </button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Call-to-action overlay for companies with minimal information */}
          {(!displayDescription || displayDescription.length < 50) && (
            <div 
              className="absolute inset-0 top-64 text-center min-h-96"
              style={{
                background: 'linear-gradient(to bottom, transparent 0%, rgba(255,255,255,0.2) 5%, rgba(255,255,255,0.5) 10%, rgba(255,255,255,0.8) 15%, white 20%)'
              }}
            >
              <div className="flex flex-col justify-center h-full max-w-4xl mx-auto px-8 pt-20">
                <h3 className="text-2xl font-bold text-[#1f2937] mb-4">Äger du detta företag?</h3>
                <p className="text-gray-600 mb-8 leading-relaxed max-w-2xl mx-auto">
                  Fyll i korrekt information och börja ta emot förfrågningar från potentiella kunder. 
                  Komplettera er företagsprofil med detaljerad beskrivning, kontaktuppgifter och specialområden.
                </p>
                <div className="flex justify-center pb-8">
                  <Button 
                    onClick={() => navigate(`/ansokkontroll/${companySlug || companyId}`)}
                    className="bg-[#1f2937] hover:bg-[#374151] text-white font-medium px-6 sm:px-8 py-3 sm:py-4 transition-colors shadow-lg w-full sm:w-auto max-w-sm"
                  >
                    Begär ägarskap av företaget
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      {/* Footer CTA Banner */}
      <section className="bg-gray-50 border-t border-gray-200 mt-[50px] mb-[50px]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
          <h3 className="text-2xl font-bold mb-4 text-[#161616]">Äger du detta företag?</h3>
          <p className="text-gray-600 mb-8 leading-relaxed max-w-2xl mx-auto">
            Utöka din företagsprofil och få fler förfrågningar. Lägg till detaljerad information, 
            kontaktpersoner, certifieringar, bilder och mycket mer. Ta kontroll över din närvaro på Industrin.se.
          </p>
          <Button 
            onClick={() => navigate(`/ansokkontroll/${companySlug || companyId}`)}
            className="bg-[#1f2937] hover:bg-[#374151] text-white font-medium px-8 py-4 transition-colors shadow-lg"
          >
            Begär ägarskap och utöka profilen
          </Button>
        </div>
      </section>
    </div>
  );
}
