import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import Features7 from "@/components/features-7";

export default function ForForetag() {
  return (
    <div>
      {/* SECTION 1 — HERO */}
      <section className="py-20 lg:py-32 bg-[#092490]">
        <div className="max-w-[1700px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <h1
              className="!text-white font-medium mb-6"
              style={{ fontSize: "clamp(28px, 4vw, 48px)", lineHeight: "1.15", letterSpacing: "-0.02em" }}
            >
              Ditt företag finns troligtvis redan här — stämmer uppgifterna?
            </h1>
            <p className="text-[#cfd8fc] text-lg mb-10 max-w-2xl" style={{ lineHeight: "1.6" }}>
              Industrin.net listar tusentals svenska industriföretag och serviceföretag. Om din
              profil inte är hanterad kan uppgifterna vara felaktiga eller saknas. Finns du inte
              med än kan du registrera dig kostnadsfritt.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/companies">
                <Button className="bg-[#f7d046] hover:bg-[#e6c13e] text-[#1d1d1d] font-medium px-8 h-14 text-sm tracking-tight w-full sm:w-auto">
                  Sök upp ditt företag
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

      {/* SECTION 2 — TRUST STRIP */}
      <div className="w-full bg-[#fdfdfd] border-b border-[#f2f2f2] py-3 px-4">
        <p className="text-center text-sm font-medium text-[#092490] tracking-tight">
          1 200+ företag registrerade | Täcker alla 21 län | Kostnadsfri grundprofil
        </p>
      </div>

      {/* SECTION 3 — TWO PATHS */}
      <section className="py-20 bg-white">
        <div className="max-w-[1700px] mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="custom-size text-[#1d1d1d] mb-16" style={{ fontSize: "32px", lineHeight: "1.2", letterSpacing: "-0.96px", fontWeight: 500 }}>
            Välj väg — det tar fem minuter
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-0 max-w-4xl">
            {/* Path A */}
            <div className="p-10 bg-[#f7f7f7] md:border-r border-white">
              <h3 className="custom-size text-[#1d1d1d] mb-4" style={{ fontSize: "20px", fontWeight: 500, letterSpacing: "-0.4px" }}>
                Finns ditt företag redan här?
              </h3>
              <p className="text-[#666] mb-6 leading-relaxed text-sm">
                Sök efter ditt företag i registret och ansök om ägarskap. Vi kontrollerar
                uppgifterna och godkänner ansökan inom 2 arbetsdagar. Tjänsten är kostnadsfri.
              </p>
              <Link href="/companies">
                <span className="text-sm font-medium text-[#092490] hover:text-[#071d74] cursor-pointer transition-colors tracking-tight">
                  Sök ditt företag →
                </span>
              </Link>
            </div>
            {/* Path B */}
            <div className="p-10 bg-[#f7f7f7]">
              <h3 className="custom-size text-[#1d1d1d] mb-4" style={{ fontSize: "20px", fontWeight: 500, letterSpacing: "-0.4px" }}>
                Inte registrerad än?
              </h3>
              <p className="text-[#666] mb-6 leading-relaxed text-sm">
                Fyll i dina företagsuppgifter och skicka in en registreringsansökan. Vi granskar
                och lägger upp företaget inom 2 arbetsdagar. Sedan loggar du in och bygger din
                profil.
              </p>
              <Link href="/registrera">
                <span className="text-sm font-medium text-[#092490] hover:text-[#071d74] cursor-pointer transition-colors tracking-tight">
                  Registrera ditt företag →
                </span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 4 — WHAT YOU GET FREE */}
      <section className="py-20 bg-white border-t border-[#f2f2f2]">
        <div className="max-w-[1700px] mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="custom-size text-[#1d1d1d] mb-16" style={{ fontSize: "32px", lineHeight: "1.2", letterSpacing: "-0.96px", fontWeight: 500 }}>
            Allt du får — kostnadsfritt
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-[#e6e6e6] max-w-5xl">
            <div className="bg-white p-8">
              <h3 className="custom-size text-[#1d1d1d] mb-3" style={{ fontSize: "16px", fontWeight: 500, letterSpacing: "-0.32px" }}>Korrekt information</h3>
              <p className="text-[#666] leading-relaxed text-sm">
                Säkerställ att adress, telefonnummer och tjänster stämmer — så att rätt kunder
                hittar dig.
              </p>
            </div>
            <div className="bg-white p-8">
              <h3 className="custom-size text-[#1d1d1d] mb-3" style={{ fontSize: "16px", fontWeight: 500, letterSpacing: "-0.32px" }}>Ta emot förfrågningar</h3>
              <p className="text-[#666] leading-relaxed text-sm">
                Kunder kan skicka offertförfrågningar direkt till dig via registret.
              </p>
            </div>
            <div className="bg-white p-8">
              <h3 className="custom-size text-[#1d1d1d] mb-3" style={{ fontSize: "16px", fontWeight: 500, letterSpacing: "-0.32px" }}>Kontroll över din profil</h3>
              <p className="text-[#666] leading-relaxed text-sm">
                Du bestämmer vad som visas — och kan uppdatera uppgifterna när du vill.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 4b — FEATURES-7 BLOCK */}
      <div className="bg-white border-t border-[#f2f2f2]">
        <div className="max-w-[1700px] mx-auto px-4 sm:px-6 lg:px-8">
          <Features7 />
        </div>
      </div>

      {/* SECTION 5 — HOW IT WORKS */}
      <section className="py-20 bg-[#f7f7f7]">
        <div className="max-w-[1700px] mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="custom-size text-[#1d1d1d] mb-16" style={{ fontSize: "32px", lineHeight: "1.2", letterSpacing: "-0.96px", fontWeight: 500 }}>
            Så här fungerar det
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 max-w-5xl">
            {/* Track A */}
            <div>
              <h3 className="custom-size text-[#1d1d1d] mb-8 pb-3 border-b border-[#e6e6e6]" style={{ fontSize: "16px", fontWeight: 500 }}>
                Redan listad?
              </h3>
              <div className="space-y-8">
                {[
                  {
                    title: "Sök upp ditt företag i registret",
                    desc: "Skriv in företagsnamnet eller orten och se om din verksamhet redan finns med.",
                  },
                  {
                    title: "Ansök om ägarskap",
                    desc: "Skicka in en ägarskapsansökan. Vi verifierar att du tillhör företaget — det tar högst 2 arbetsdagar.",
                  },
                  {
                    title: "Logga in och uppdatera din profil",
                    desc: "När ansökan är godkänd loggar du in och ser till att uppgifterna är korrekta.",
                  },
                ].map((step, i) => (
                  <div key={i} className="flex gap-4">
                    <div className="flex-shrink-0 w-8 h-8 bg-[#092490] flex items-center justify-center text-white text-sm font-medium">
                      {i + 1}
                    </div>
                    <div>
                      <p className="font-medium text-[#1d1d1d] mb-1 text-sm tracking-tight">{step.title}</p>
                      <p className="text-sm text-[#666] leading-relaxed">{step.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {/* Track B */}
            <div>
              <h3 className="custom-size text-[#1d1d1d] mb-8 pb-3 border-b border-[#e6e6e6]" style={{ fontSize: "16px", fontWeight: 500 }}>
                Ny registrering?
              </h3>
              <div className="space-y-8">
                {[
                  {
                    title: "Fyll i dina företagsuppgifter",
                    desc: "Ange namn, ort, tjänster och kontaktuppgifter i registreringsformuläret.",
                  },
                  {
                    title: "Vi granskar din ansökan",
                    desc: "Vi kontrollerar att uppgifterna ser rimliga ut — du hör av oss inom 2 arbetsdagar.",
                  },
                  {
                    title: "Logga in och bygg din profil",
                    desc: "När företaget är godkänt loggar du in och kompletterar din profil.",
                  },
                ].map((step, i) => (
                  <div key={i} className="flex gap-4">
                    <div className="flex-shrink-0 w-8 h-8 bg-[#092490] flex items-center justify-center text-white text-sm font-medium">
                      {i + 1}
                    </div>
                    <div>
                      <p className="font-medium text-[#1d1d1d] mb-1 text-sm tracking-tight">{step.title}</p>
                      <p className="text-sm text-[#666] leading-relaxed">{step.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 6 — PREMIUM */}
      <section className="py-20 bg-[#092490]">
        <div className="max-w-[1700px] mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="custom-size !text-white mb-4" style={{ fontSize: "32px", lineHeight: "1.2", letterSpacing: "-0.96px", fontWeight: 500 }}>
            Syns mer med Premium
          </h2>
          <p className="text-[#cfd8fc] text-lg mb-12 max-w-2xl leading-relaxed">
            Med ett premiumkonto visas ditt företag tydligare i sökresultaten och du kan
            presentera din verksamhet mer utförligt.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-white/20 max-w-3xl mb-12">
            {[
              {
                title: "Logotyp",
                desc: "Din logotyp visas på företagsprofilen och ger ett mer professionellt intryck.",
              },
              {
                title: "Kontaktpersoner",
                desc: "Ange namngivna kontaktpersoner så att kunder vet vem de pratar med.",
              },
              {
                title: "Presentationsfilm",
                desc: "Lägg till en film som visar vad ni gör och hur ni arbetar.",
              },
              {
                title: "Certifieringar",
                desc: "Visa upp era certifieringar och kvalitetsmärken direkt på profilen.",
              },
            ].map((item, i) => (
              <div key={i} className="bg-[#092490] p-8">
                <h3 className="custom-size !text-white mb-2" style={{ fontSize: "16px", fontWeight: 500 }}>{item.title}</h3>
                <p className="text-[#9fb1f9] text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
          <Link href="/premium">
            <Button className="bg-[#f7d046] hover:bg-[#e6c13e] text-[#1d1d1d] font-medium px-8 h-14 text-sm tracking-tight">
              Läs mer om Premium
            </Button>
          </Link>
        </div>
      </section>

      {/* SECTION 7 — FINAL CTA */}
      <section className="py-24 bg-white">
        <div className="max-w-[1700px] mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="custom-size text-[#1d1d1d] mb-3" style={{ fontSize: "32px", lineHeight: "1.2", letterSpacing: "-0.96px", fontWeight: 500 }}>
            Redo att ta kontroll?
          </h2>
          <p className="text-[#666] text-lg mb-10">Det tar fem minuter att komma igång.</p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Link href="/companies">
              <Button className="bg-primary hover:bg-primary-dark text-white font-medium px-8 h-14 text-sm tracking-tight w-full sm:w-auto">
                Hitta ditt företag nu
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
      </section>
    </div>
  );
}
