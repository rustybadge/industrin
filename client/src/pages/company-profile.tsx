import { useParams, Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "@/lib/api";
import type { CompanyDetail } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import ScrollWall from "@/components/ui/scroll-wall";
import QuoteModal from "@/components/company/quote-modal";
import { calculateDataQuality } from "@/utils/data-quality";

import {
  Globe,
  MapPin,
  Star,
  Shield,
  Building,
  ArrowLeft,
  Clock,
  Mail,
  Phone,
  Users,
} from "lucide-react";

export default function CompanyProfile() {
  const params = useParams();
  const [location, navigate] = useLocation();
  const [scrollWallDismissed, setScrollWallDismissed] = useState(false);
  const [quoteModalOpen, setQuoteModalOpen] = useState(false);

  // Check if we have an ID (from /company/:id) or slug (from /companies/:slug)
  const companyId = params.id;
  const companySlug = params.slug;

  const { data: company, isLoading, error } = useQuery<CompanyDetail>({
    queryKey: companyId ? ['/api/company-profile', companyId] : ['/api/companies', companySlug],
    queryFn: () => companyId ? api.companies.getById(companyId) : api.companies.getBySlug(companySlug!),
    enabled: !!(companyId || companySlug),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white py-8">
        <div className="max-w-[1700px] mx-auto px-4 sm:px-6 lg:px-8">
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
        <div className="max-w-[1700px] mx-auto px-4 sm:px-6 lg:px-8">
          <Card className="border border-gray-200 shadow-sm">
            <CardContent className="pt-16 pb-16 text-center">
              <h1 className="text-3xl font-bold text-primary mb-4 tracking-tight">Företag hittades inte</h1>
              <p className="text-gray-600 text-lg">Det företag du letar efter finns inte eller har flyttats.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Use Swedish description if available, otherwise fall back to English
  const displayDescription = company.description_sv || company.description;

  // Calculate data quality for scroll wall
  const dataQuality = calculateDataQuality(company);

  // Visiting address: prefer profile.visitingAddress, fall back to companies fields
  const visitingAddress = company.profile?.visitingAddress
    || ((company.address || company.postalCode || company.city)
      ? [company.address, company.postalCode && company.city ? `${company.postalCode} ${company.city}` : company.city].filter(Boolean).join(', ')
      : null);

  const mapsUrl = visitingAddress
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(visitingAddress)}`
    : null;

  const hasContacts = Array.isArray(company.contacts) && company.contacts.length > 0;
  const hasOpeningHours = Boolean(company.profile?.openingHours);

  return (
    <div className="min-h-screen bg-white py-8">
      {/* Unclaimed banner */}
      {!company.isClaimed && (
        <div className="w-full bg-[#F0FAF6] border-y border-[#E5E7EB]">
          <div className="max-w-[1700px] mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-4">
            <p className="text-sm text-gray-700">Den här profilen är inte hanterad — ta över den och nå fler kunder.</p>
            <a
              href={`/ansokkontroll/${company.slug}`}
              className="shrink-0 text-sm font-medium border border-[#1D9E75] text-[#1D9E75] bg-white rounded-none px-4 py-2 hover:bg-[#F0FAF6] transition-colors"
            >
              Är det ditt företag? Ta över profilen.
            </a>
          </div>
        </div>
      )}
      <div className="max-w-[1700px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back Button */}
        <div className="mb-6">
          <Button
            variant="ghost"
            className="text-black hover:text-gray-700 hover:bg-transparent transition-colors flex items-center gap-2 px-3 py-2 group pl-[4px] pr-[4px]"
            onClick={() => window.history.back()}
          >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
            Tillbaka
          </Button>
        </div>

        <div className="relative">
          {/* Company Profile Header */}
          <div className="flex flex-col md:flex-row md:items-start md:justify-between mb-8">
            <div className="flex items-start gap-6 mb-6 md:mb-0">
              {/* Logo */}
              {company.logoUrl ? (
                <img
                  src={company.logoUrl}
                  alt={`${company.name} logotyp`}
                  className="w-20 h-20 object-contain rounded-xl border border-gray-100 bg-white flex-shrink-0"
                />
              ) : (
                <div className="w-20 h-20 rounded-xl border border-gray-100 bg-gray-50 flex items-center justify-center flex-shrink-0">
                  <Building className="h-8 w-8 text-gray-300" />
                </div>
              )}
              <div>
                <h1 className="font-bold mb-3 tracking-tight text-[42px] text-[#171717]">{company.name}</h1>
                <p className="text-xl text-gray-600 mb-3 font-medium">{company.city || company.location}</p>
                <div className="flex items-center gap-3">
                  {company.isClaimed && (
                    <Badge variant="secondary" className="bg-[#D9E5FF] text-gray-900 border border-gray-300 px-3 py-1">
                      <Shield className="h-3 w-3 mr-1" />
                      Verifierad
                    </Badge>
                  )}
                  {company.tier === 'premium' && (
                    <Badge variant="secondary" className="bg-amber-50 text-amber-800 border border-amber-200 px-3 py-1">
                      <Star className="h-3 w-3 mr-1" />
                      Premium
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Company Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-10">
            <Button
              onClick={() => navigate(`/companies/${companySlug || company.slug}/quote`)}
              className="bg-primary hover:bg-primary-dark text-white font-semibold px-6 py-3 h-12 text-sm"
            >
              Begär offert
            </Button>
            {company.phone ? (
              <a
                href={`tel:${company.phone}`}
                className="inline-flex items-center justify-center bg-white border-2 border-primary text-primary hover:bg-primary hover:text-white font-semibold px-6 py-3 h-12 text-sm rounded-none transition-colors"
              >
                Ring direkt
              </a>
            ) : (
              <button
                disabled
                className="inline-flex items-center justify-center bg-white border-2 border-gray-200 text-gray-300 font-semibold px-6 py-3 h-12 text-sm rounded-md cursor-not-allowed"
              >
                Ring direkt
              </button>
            )}
          </div>

          {/* Company Details */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            <div className="lg:col-span-2 space-y-8">
              <div>
                <h2 className="font-bold mb-6 tracking-tight custom-size text-[#171717] text-[38px]" style={{fontSize: '38px'}}>Om företaget</h2>
                <div className="prose prose-gray max-w-none lg:max-w-3xl">
                  {displayDescription && displayDescription.length >= 50 ? (
                    <p className="text-gray-700 leading-7 text-lg whitespace-pre-wrap">
                      {displayDescription}
                    </p>
                  ) : (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                      <p className="text-gray-500 text-center italic">
                        Ingen beskrivning tillgänglig för detta företag.
                      </p>
                      <p className="text-gray-400 text-sm text-center mt-2">
                        Är du företagets ägare? Komplettera informationen genom att begära ägarskap.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Tjänster — from categories (set during claim) and serviceområden */}
              {((company.categories && company.categories.length > 0) || (company.serviceområden && company.serviceområden.length > 0)) && (
                <div>
                  <h3 className="text-xl font-bold mb-5 text-[#171717]" style={{letterSpacing: '-0.01em'}}>Tjänster</h3>
                  <div className="flex flex-wrap gap-3">
                    {[
                      ...(company.categories || []),
                      ...(company.serviceområden || []),
                    ].map((item) => (
                      <Badge
                        key={item}
                        variant="outline"
                        className="bg-[var(--secondary-lightest)] text-[var(--secondary-darker)] border border-[var(--secondary-lighter)] px-5 py-2 rounded-full font-medium text-sm hover:bg-[var(--secondary-lighter)] transition-colors"
                      >
                        {item}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Öppettider */}
              {hasOpeningHours && (
                <div>
                  <h3 className="text-xl font-bold mb-4 text-[#171717]" style={{letterSpacing: '-0.01em'}}>Öppettider</h3>
                  <div className="flex items-start gap-3">
                    <Clock className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" />
                    <p className="text-gray-700 whitespace-pre-wrap">{company.profile.openingHours}</p>
                  </div>
                </div>
              )}

              {/* Kontaktpersoner */}
              {hasContacts && (
                <div>
                  <h3 className="text-xl font-bold mb-4 text-[#171717]" style={{letterSpacing: '-0.01em'}}>Kontaktpersoner</h3>
                  <div className="space-y-3">
                    {company.contacts.map((contact) => (
                      <div key={contact.id} className="flex items-center gap-4">
                        <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                          <Users className="h-4 w-4 text-gray-500" />
                        </div>
                        <div>
                          <p className="font-semibold text-[#171717] text-sm">{contact.name}</p>
                          {contact.phone && (
                            <a
                              href={`tel:${contact.phone}`}
                              className="text-sm text-gray-600 hover:text-primary transition-colors"
                            >
                              {contact.phone}
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>

            <div className="space-y-3">
              {/* Claim / update profile prompt above contact card */}
              <div className="mb-4">
                <button
                  type="button"
                  onClick={() => navigate(`/ansokkontroll/${companySlug || companyId}`)}
                  className="text-sm text-left text-gray-700 hover:text-gray-900 font-medium"
                  data-testid="company-claim-button"
                >
                  Äger du detta företag? Ta kontroll över din profil och nå fler kunder —{" "}
                  <span style={{ color: "#1D9E75" }}>kostnadsfritt.</span>
                </button>
              </div>

              <Card className="border border-gray-200 shadow-sm rounded-none">
                <CardContent className="p-7">
                  <h3 className="text-xl font-bold mb-6 tracking-tight text-[#171717]">Kontaktinformation</h3>
                  <div className="space-y-3">
                    {/* Email — hidden, replaced by contact button */}
                    <div className="group py-2 border-b border-gray-100">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full border-gray-300 text-gray-700 hover:bg-gray-50 font-medium"
                        onClick={() => setQuoteModalOpen(true)}
                      >
                        <Mail className="h-4 w-4 mr-2" />
                        Skicka e-post
                      </Button>
                    </div>

                    {/* Phone */}
                    <div className="group py-2 border-b border-gray-100">
                      {company.phone ? (
                        <a
                          href={`tel:${company.phone}`}
                          className="text-gray-700 hover:text-primary transition-colors font-medium"
                        >
                          {company.phone}
                        </a>
                      ) : (
                        <span className="text-gray-500 font-medium">
                          Telefonnummer saknas
                        </span>
                      )}
                    </div>

                    {/* Website */}
                    <div className="group py-2 border-b border-gray-100">
                      {company.website ? (
                        <a
                          href={/^https?:\/\//i.test(company.website) ? company.website : `https://${company.website}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline font-medium break-all"
                        >
                          {company.website}
                        </a>
                      ) : (
                        <span className="text-gray-500 font-medium">
                          Webbplats saknas
                        </span>
                      )}
                    </div>

                    {/* Visiting address + Google Maps link */}
                    <div className="group py-2">
                      {visitingAddress ? (
                        <div className="space-y-1">
                          <div className="flex items-start gap-2">
                            <MapPin className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                            <span className="text-gray-700 font-medium">{visitingAddress}</span>
                          </div>
                          {mapsUrl && (
                            <a
                              href={mapsUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-primary hover:underline ml-6"
                            >
                              Visa på karta
                            </a>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-500 font-medium">
                          Postadress saknas
                        </span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll Wall for companies with poor data quality */}
      {dataQuality.needsScrollWall && !scrollWallDismissed && (
        <ScrollWall
          quality={dataQuality}
          companyName={company.name}
          onClaimClick={() => navigate(`/ansokkontroll/${companySlug || companyId}`)}
          onDismiss={() => setScrollWallDismissed(true)}
        />
      )}

      {/* Email / contact modal — hides company email, routes through quote system */}
      {company && (
        <QuoteModal
          isOpen={quoteModalOpen}
          onClose={() => setQuoteModalOpen(false)}
          company={company}
        />
      )}
    </div>
  );
}
