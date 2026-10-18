import { useState } from "react";
import { Link, useLocation } from "wouter";
import heroBg from "@/assets/images/hero-pattern.png";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ArrowRight, ClipboardList, Zap, Mail } from "lucide-react";
import { api } from "@/lib/api";
import SmartSearch, { type SearchTag } from "@/components/search/smart-search";
import CompanyCard from "@/components/company/company-card";
import { Skeleton } from "@/components/ui/skeleton";

const SERVICE_CATEGORIES = [
  { label: "Hydraulik",              value: "Hydraulik" },
  { label: "CNC & Bearbetning",      value: "CNC & Bearbetning" },
  { label: "Svets",                  value: "Svets" },
  { label: "Automation",             value: "Automation" },
  { label: "El & Instrument",        value: "El & Instrument" },
  { label: "Reparation & Underhåll", value: "reparation" },
  { label: "Kompressorer & Pumpar",  value: "Kompressorer & Pumpar" },
  { label: "Annat",                  value: "annat" },
];

export default function Home() {
  const [, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchTags, setSearchTags] = useState<SearchTag[]>([]);

  const filters = {
    search: searchQuery,
    region: searchTags.find(tag => tag.type === "region")?.value || "",
    categories: searchTags.filter(tag => tag.type === "category").map(tag => tag.value),
  };

  const { data: companies = [], isLoading } = useQuery({
    queryKey: ["/api/companies", { ...filters, limit: 9 }],
    queryFn: () => api.companies.getAll({ ...filters, limit: 9 }),
    staleTime: 0,
  });

  const handleSmartSearch = (query: string, tags: SearchTag[]) => {
    setSearchQuery(query);
    setSearchTags(tags);
  };

  const handleCategoryClick = (value: string) => {
    navigate(`/begar-offert?serviceType=${encodeURIComponent(value)}`);
  };

  return (
    <div>
      {/* Announcement bar — buyer-facing */}
      <div className="w-full bg-[#fdfdfd] border-b border-[#f2f2f2] py-3 px-4">
        <p className="text-center text-sm font-medium text-[#092490] tracking-tight">
          Kostnadsfritt för köpare &nbsp;·&nbsp; Svar från lokala serviceföretag &nbsp;·&nbsp; Täcker hela Sverige
        </p>
      </div>

      {/* ── HERO ─────────────────────────────────────────────────── */}
      <section className="relative bg-white overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          <img src={heroBg} alt="" className="absolute w-full h-full object-cover" />
          <div className="absolute inset-0 bg-white/[0.94] mix-blend-hard-light" />
        </div>

        <div className="relative max-w-[1700px] mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-14 sm:pt-24 sm:pb-20 lg:pt-32 lg:pb-28">
          {/* Headline */}
          <div className="max-w-3xl mb-8">
            <h1
              className="font-medium text-[#1d1d1d] m-0 text-[28px] sm:text-[38px] lg:text-[48px]"
              style={{ fontFamily: "PP Neue Montreal, Inter Tight, sans-serif", lineHeight: "1.1", letterSpacing: "-1px" }}
            >
              Vad behöver ni hjälp med?
            </h1>
            <p className="mt-4 text-[#505050] text-base sm:text-lg tracking-tight max-w-xl">
              Beskriv problemet — serviceföretag i ert område svarar direkt. Kostnadsfritt.
            </p>
          </div>

          {/* Category chips */}
          <div className="flex flex-wrap gap-3 mb-6">
            {SERVICE_CATEGORIES.map(cat => (
              <button
                key={cat.value}
                onClick={() => handleCategoryClick(cat.value)}
                className="px-5 py-2.5 bg-white border border-[#e0e0e0] text-[#1d1d1d] text-sm font-medium tracking-tight rounded-none hover:border-[#092490] hover:text-[#092490] transition-colors"
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Free-text CTA */}
          <div className="flex items-center gap-4">
            <Link href="/begar-offert">
              <Button
                className="inline-flex items-center bg-[#092490] hover:bg-[#071d74] text-white font-medium px-8 text-sm tracking-tight"
                style={{ height: "52px" }}
              >
                Beskriv ert behov
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <span className="text-sm text-[#9CA3AF]">Tar under en minut</span>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────────── */}
      <section className="bg-[#f9f9f9] border-y border-[#f0f0f0] py-14 sm:py-20">
        <div className="max-w-[1700px] mx-auto px-4 sm:px-6 lg:px-8">
          <h2
            className="text-[#1d1d1d] text-xl sm:text-2xl font-medium tracking-tight mb-10 text-center"
            style={{ letterSpacing: "-0.5px" }}
          >
            Så fungerar det
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {[
              {
                icon: <ClipboardList className="h-6 w-6 text-[#092490]" />,
                step: "1",
                title: "Beskriv vad du behöver",
                body: "Välj kategori och fyll i ett kort formulär — tar under en minut. Ingen registrering krävs.",
              },
              {
                icon: <Zap className="h-6 w-6 text-[#092490]" />,
                step: "2",
                title: "Vi matchar serviceföretag",
                body: "Din förfrågan skickas direkt till relevanta serviceföretag i ditt område.",
              },
              {
                icon: <Mail className="h-6 w-6 text-[#092490]" />,
                step: "3",
                title: "Du får svar direkt",
                body: "Företagen hör av sig till dig via e-post. Du väljer vem du vill gå vidare med.",
              },
            ].map(({ icon, step, title, body }) => (
              <div key={step} className="flex flex-col items-start">
                <div className="flex items-center justify-center w-10 h-10 bg-[#e8ecf8] mb-4">
                  {icon}
                </div>
                <p className="text-xs font-semibold text-[#092490] tracking-widest uppercase mb-1">Steg {step}</p>
                <h3 className="text-[#1d1d1d] font-medium text-base mb-2">{title}</h3>
                <p className="text-[#666] text-sm leading-relaxed">{body}</p>
              </div>
            ))}
          </div>

          <div className="text-center mt-10">
            <Link href="/begar-offert">
              <Button
                className="bg-[#092490] hover:bg-[#071d74] text-white font-medium px-8 text-sm"
                style={{ height: "48px" }}
              >
                Skicka förfrågan gratis
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── TRUST STRIP ──────────────────────────────────────────── */}
      <div className="w-full bg-white border-b border-[#f0f0f0]">
        <div className="max-w-[1700px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-12 text-center">
            {[
              { value: "1 000+", label: "Serviceföretag" },
              { value: "21 län", label: "Täcker hela Sverige" },
              { value: "Kostnadsfritt", label: "För köpare" },
            ].map(({ value, label }) => (
              <div key={label}>
                <p className="text-xl font-medium text-[#092490] tracking-tight">{value}</p>
                <p className="text-sm text-[#666] mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── COMPANY CTA ──────────────────────────────────────────── */}
      <div className="w-full bg-[#f7d046]">
        <div className="max-w-[1700px] mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <p className="font-medium text-[#1d1d1d] text-base sm:text-lg tracking-tight m-0">
            Driver du ett serviceföretag? Ta kontroll över er profil och börja ta emot förfrågningar — gratis.
          </p>
          <Link href="/for-foretag" className="shrink-0">
            <Button
              variant="outline"
              className="w-full sm:w-auto bg-white border border-[#dcdcdc] text-[#092490] font-medium px-5 text-sm tracking-tight hover:bg-gray-50"
              style={{ height: "48px" }}
            >
              Sök efter ert företag
            </Button>
          </Link>
        </div>
      </div>

      {/* ── DIRECTORY ────────────────────────────────────────────── */}
      <section id="directory" className="py-12 sm:py-16 bg-background">
        <div className="max-w-[1700px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-6">
            <h2
              className="text-[#1d1d1d] text-2xl sm:text-[32px] font-medium"
              style={{ lineHeight: "1.2", letterSpacing: "-0.96px" }}
            >
              Föredrar du att söka själv?
            </h2>
            <p className="text-base sm:text-lg text-[#666] mt-2 tracking-tight">
              Bläddra bland 1 000+ serviceföretag i hela Sverige.
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
              <p className="text-sm text-gray-500">Försök att ändra dina sökkriterier.</p>
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
                <Button className="bg-primary hover:bg-primary-dark text-white px-8 group" style={{ height: "56px" }}>
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
