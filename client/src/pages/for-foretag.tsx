import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { MapPin, MessageSquare, Settings, Wrench, Zap, ShoppingCart, Star, Users, Award, Video } from "lucide-react";

export default function ForForetag() {
  return (
    <div>

      {/* ── 1. HERO ─────────────────────────────────────────────────── */}
      <section className="py-24 lg:py-40 bg-[#092490] text-center">
        <div className="max-w-[1700px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto">
            <h1
              className="!text-white font-medium mb-6"
              style={{ fontSize: "clamp(28px, 4vw, 56px)", lineHeight: "1.1", letterSpacing: "-0.02em" }}
            >
              Dina kunder söker redan.<br />
              Finns ditt företag när de hittar?
            </h1>
            <p className="text-[#cfd8fc] text-lg mb-10 max-w-2xl mx-auto" style={{ lineHeight: "1.6" }}>
              Industrin.net är Sveriges register för industriella serviceföretag.
              Vi hjälper underhållschefer och produktionsledare att hitta rätt
              leverantör — snabbt.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/companies">
                <Button className="bg-[#f7d046] hover:bg-[#e6c13e] text-[#1d1d1d] font-medium px-8 h-14 text-sm tracking-tight w-full sm:w-auto">
                  Hitta ditt företag
                </Button>
              </Link>
              <Link href="/registrera">
                <Button
                  variant="outline"
                  className="bg-transparent border border-white text-white font-medium px-8 h-14 text-sm tracking-tight hover:bg-white/10 hover:text-white w-full sm:w-auto"
                >
                  Registrera nytt företag
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── 2. STATS BAR ────────────────────────────────────────────── */}
      <section className="py-14 bg-white border-b border-[#f2f2f2]">
        <div className="max-w-[1700px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-[#e6e6e6] max-w-3xl mx-auto text-center">
            <div className="py-6 sm:py-0 sm:px-10">
              <p
                className="custom-size font-bold text-[#1d1d1d]"
                style={{ fontSize: "clamp(28px, 3vw, 40px)", letterSpacing: "-0.02em" }}
              >
                1 200+
              </p>
              <p className="text-sm text-[#888] mt-1">Listade företag</p>
            </div>
            <div className="py-6 sm:py-0 sm:px-10">
              <p
                className="custom-size font-bold text-[#1d1d1d]"
                style={{ fontSize: "clamp(18px, 2vw, 26px)", letterSpacing: "-0.02em", lineHeight: 1.2 }}
              >
                Månadsvis aktiva sökningar
              </p>
              <p className="text-sm text-[#888] mt-1">från köpare i industrin</p>
            </div>
            <div className="py-6 sm:py-0 sm:px-10">
              <p
                className="custom-size font-bold text-[#1d1d1d]"
                style={{ fontSize: "clamp(18px, 2vw, 26px)", letterSpacing: "-0.02em", lineHeight: 1.2 }}
              >
                Kostnadsfri grundprofil
              </p>
              <p className="text-sm text-[#888] mt-1">Kom igång på 5 minuter</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── 3. BUYER PERSONAS ───────────────────────────────────────── */}
      <section className="py-20 bg-[#f7f7f7]">
        <div className="max-w-[1700px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 max-w-5xl">
            {/* Left */}
            <div>
              <h2
                className="custom-size text-[#1d1d1d] mb-6"
                style={{ fontSize: "clamp(22px, 2.5vw, 36px)", lineHeight: "1.2", letterSpacing: "-0.02em", fontWeight: 500 }}
              >
                Högintresserade köpare — inte slumpsurfare
              </h2>
              <p className="text-[#666] leading-relaxed text-base">
                De som söker på Industrin.net vet redan vad de behöver.
                En maskin har stannat. Ett system behöver service.
                De letar efter ett specifikt företag med specifik kompetens.
                Det är ditt företag de letar efter.
              </p>
            </div>
            {/* Right — personas */}
            <div className="space-y-8">
              {[
                {
                  icon: <Wrench className="h-5 w-5 text-[#092490]" />,
                  title: "Underhållschef",
                  desc: "Söker certifierade servicepartners för kritisk utrustning",
                },
                {
                  icon: <Zap className="h-5 w-5 text-[#092490]" />,
                  title: "Produktionsledare",
                  desc: "Behöver snabb respons när produktionen står still",
                },
                {
                  icon: <ShoppingCart className="h-5 w-5 text-[#092490]" />,
                  title: "Inköpsansvarig",
                  desc: "Utvärderar leverantörer inom specifika maskinkategorier",
                },
              ].map((item, i) => (
                <div key={i} className="flex gap-4">
                  <div className="flex-shrink-0 w-10 h-10 bg-[#092490]/10 flex items-center justify-center">
                    {item.icon}
                  </div>
                  <div>
                    <p className="font-medium text-[#1d1d1d] text-sm tracking-tight">{item.title}</p>
                    <p className="text-sm text-[#666] leading-relaxed mt-1">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── 4. FREE BENEFITS ────────────────────────────────────────── */}
      <section className="py-20 bg-white border-t border-[#f2f2f2]">
        <div className="max-w-[1700px] mx-auto px-4 sm:px-6 lg:px-8">
          <h2
            className="custom-size text-[#1d1d1d] mb-16"
            style={{ fontSize: "32px", lineHeight: "1.2", letterSpacing: "-0.96px", fontWeight: 500 }}
          >
            Allt du får — kostnadsfritt
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-[#e6e6e6] max-w-5xl">
            <div className="bg-white p-8">
              <MapPin className="h-5 w-5 text-[#092490] mb-4" />
              <h3
                className="custom-size text-[#1d1d1d] mb-3"
                style={{ fontSize: "16px", fontWeight: 500, letterSpacing: "-0.32px" }}
              >
                Kunder hittar dig direkt
              </h3>
              <p className="text-[#666] leading-relaxed text-sm">
                Rätt adress, rätt nummer, rätt tjänster — synlig för köpare som söker precis vad du erbjuder.
              </p>
            </div>
            <div className="bg-white p-8">
              <MessageSquare className="h-5 w-5 text-[#092490] mb-4" />
              <h3
                className="custom-size text-[#1d1d1d] mb-3"
                style={{ fontSize: "16px", fontWeight: 500, letterSpacing: "-0.32px" }}
              >
                Förfrågningar direkt till dig
              </h3>
              <p className="text-[#666] leading-relaxed text-sm">
                Inga mellanhänder. Kunder skickar offertförfrågningar direkt till dig via registret.
              </p>
            </div>
            <div className="bg-white p-8">
              <Settings className="h-5 w-5 text-[#092490] mb-4" />
              <h3
                className="custom-size text-[#1d1d1d] mb-3"
                style={{ fontSize: "16px", fontWeight: 500, letterSpacing: "-0.32px" }}
              >
                Du äger din profil
              </h3>
              <p className="text-[#666] leading-relaxed text-sm">
                Uppdatera när du vill. Visa precis vad som skiljer ditt företag från konkurrenterna.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── 5. PREMIUM UPSELL ───────────────────────────────────────── */}
      <section className="py-20 bg-[#092490]">
        <div className="max-w-[1700px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-5xl">
            <h2
              className="custom-size !text-white mb-4"
              style={{ fontSize: "32px", lineHeight: "1.2", letterSpacing: "-0.96px", fontWeight: 500 }}
            >
              Syns före konkurrenterna med Premium
            </h2>
            <p className="text-[#cfd8fc] text-lg mb-12 max-w-2xl leading-relaxed">
              Premiumföretag visas högre i sökresultaten och kan presentera sin verksamhet mer
              fullständigt. Första intrycket avgör.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-white/20 mb-12">
              {[
                {
                  icon: <Star className="h-5 w-5 text-[#f7d046]" />,
                  title: "Logotyp",
                  desc: "Stärker igenkänning och professionalitet direkt",
                },
                {
                  icon: <Users className="h-5 w-5 text-[#f7d046]" />,
                  title: "Kontaktpersoner",
                  desc: "Köparen vet vem de pratar med innan de hör av sig",
                },
                {
                  icon: <Award className="h-5 w-5 text-[#f7d046]" />,
                  title: "Certifieringar",
                  desc: "Visa kvalitetsmärken och godkännanden på profilen",
                },
                {
                  icon: <Video className="h-5 w-5 text-[#f7d046]" />,
                  title: "Presentationsfilm",
                  desc: "Berätta om er verksamhet med rörlig bild",
                },
              ].map((item, i) => (
                <div key={i} className="bg-[#092490] p-8 flex gap-4">
                  <div className="flex-shrink-0 mt-0.5">{item.icon}</div>
                  <div>
                    <h3
                      className="custom-size !text-white mb-2"
                      style={{ fontSize: "16px", fontWeight: 500 }}
                    >
                      {item.title}
                    </h3>
                    <p className="text-[#9fb1f9] text-sm leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <Link href="/premium">
              <Button className="bg-[#f7d046] hover:bg-[#e6c13e] text-[#1d1d1d] font-medium px-8 h-14 text-sm tracking-tight">
                Läs mer om Premium
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── 6. HOW IT WORKS ─────────────────────────────────────────── */}
      <section className="py-20 bg-[#f7f7f7]">
        <div className="max-w-[1700px] mx-auto px-4 sm:px-6 lg:px-8">
          <h2
            className="custom-size text-[#1d1d1d] mb-16"
            style={{ fontSize: "32px", lineHeight: "1.2", letterSpacing: "-0.96px", fontWeight: 500 }}
          >
            Så här fungerar det
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 max-w-5xl">
            {/* Already listed */}
            <div>
              <h3
                className="custom-size text-[#1d1d1d] mb-8 pb-3 border-b border-[#e6e6e6]"
                style={{ fontSize: "16px", fontWeight: 500 }}
              >
                Redan listad?
              </h3>
              <div className="space-y-8">
                {[
                  "Sök upp ditt företag i registret",
                  "Ansök om ägarskap — verifieras inom 2 arbetsdagar",
                  "Logga in och kontrollera att allt stämmer",
                ].map((step, i) => (
                  <div key={i} className="flex gap-4">
                    <div className="flex-shrink-0 w-8 h-8 bg-[#092490] flex items-center justify-center text-white text-sm font-medium">
                      {i + 1}
                    </div>
                    <p className="text-sm text-[#666] leading-relaxed pt-1">{step}</p>
                  </div>
                ))}
              </div>
            </div>
            {/* New registration */}
            <div>
              <h3
                className="custom-size text-[#1d1d1d] mb-8 pb-3 border-b border-[#e6e6e6]"
                style={{ fontSize: "16px", fontWeight: 500 }}
              >
                Ny registrering?
              </h3>
              <div className="space-y-8">
                {[
                  "Fyll i dina företagsuppgifter",
                  "Vi granskar och lägger upp er profil inom 2 arbetsdagar",
                  "Logga in och bygg er profil",
                ].map((step, i) => (
                  <div key={i} className="flex gap-4">
                    <div className="flex-shrink-0 w-8 h-8 bg-[#092490] flex items-center justify-center text-white text-sm font-medium">
                      {i + 1}
                    </div>
                    <p className="text-sm text-[#666] leading-relaxed pt-1">{step}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 7. CLOSING CTA ──────────────────────────────────────────── */}
      <section className="py-24 bg-white text-center">
        <div className="max-w-[1700px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-xl mx-auto">
            <h2
              className="custom-size text-[#1d1d1d] mb-10"
              style={{ fontSize: "clamp(22px, 2.5vw, 36px)", lineHeight: "1.25", letterSpacing: "-0.02em", fontWeight: 500 }}
            >
              Det tar fem minuter.<br />
              Det kostar ingenting.<br />
              Dina kunder letar redan.
            </h2>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/companies">
                <Button className="bg-primary hover:bg-primary-dark text-white font-medium px-8 h-14 text-sm tracking-tight w-full sm:w-auto">
                  Hitta ditt företag
                </Button>
              </Link>
              <Link href="/registrera">
                <Button
                  variant="outline"
                  className="border border-[#092490] text-[#092490] font-medium px-8 h-14 text-sm tracking-tight hover:bg-[#092490] hover:text-white transition-colors w-full sm:w-auto"
                >
                  Registrera nytt företag
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
