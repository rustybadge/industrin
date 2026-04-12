import { Link } from "wouter";

export default function ForForetag() {
  return (
    <div>
      {/* SECTION 1 — HERO */}
      <section className="py-24 lg:py-32" style={{ backgroundColor: "#111827" }}>
        <div className="max-w-[1700px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <h1
              className="text-white font-bold mb-6"
              style={{ fontSize: "clamp(28px, 4vw, 48px)", lineHeight: "1.15" }}
            >
              Ditt företag finns troligtvis redan här — stämmer uppgifterna?
            </h1>
            <p className="text-gray-300 text-lg mb-10 max-w-2xl" style={{ lineHeight: "1.6" }}>
              Industrin.net listar tusentals svenska industriföretag och serviceföretag. Om din
              profil inte är hanterad kan uppgifterna vara felaktiga eller saknas. Finns du inte
              med än kan du registrera dig kostnadsfritt.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/companies">
                <button
                  className="px-8 py-4 font-semibold text-white rounded transition-opacity hover:opacity-90"
                  style={{ backgroundColor: "#1D9E75" }}
                >
                  Sök upp ditt företag
                </button>
              </Link>
              <Link href="/registrera">
                <button className="px-8 py-4 font-semibold text-white rounded border-2 border-white bg-transparent hover:bg-white hover:text-gray-900 transition-colors">
                  Registrera nytt företag
                </button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 2 — TRUST SIGNAL */}
      <div className="w-full py-4" style={{ backgroundColor: "#F5F5F5" }}>
        <div className="max-w-[1700px] mx-auto px-4 sm:px-6 lg:px-8 flex justify-center">
          <span className="text-sm font-medium" style={{ color: "#171717" }}>
            Över 1 200 serviceföretag registrerade i hela Sverige.
          </span>
        </div>
      </div>

      {/* SECTION 3 — TWO PATHS */}
      <section className="py-20 bg-white">
        <div className="max-w-[1700px] mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-16">
            Välj väg — det tar fem minuter
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-0 max-w-4xl mx-auto">
            {/* Path A */}
            <div className="p-10 md:border-r border-gray-200 md:pr-16">
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                Finns ditt företag redan här?
              </h3>
              <p className="text-gray-600 mb-6 leading-relaxed">
                Sök efter ditt företag i registret och ansök om ägarskap. Vi kontrollerar
                uppgifterna och godkänner ansökan inom 2 arbetsdagar. Tjänsten är kostnadsfri.
              </p>
              <Link href="/companies">
                <span
                  className="font-medium cursor-pointer hover:opacity-80 transition-opacity"
                  style={{ color: "#1D9E75" }}
                >
                  Sök ditt företag &rarr;
                </span>
              </Link>
            </div>
            {/* Path B */}
            <div className="p-10 md:pl-16">
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                Inte registrerad än?
              </h3>
              <p className="text-gray-600 mb-6 leading-relaxed">
                Fyll i dina företagsuppgifter och skicka in en registreringsansökan. Vi granskar
                och lägger upp företaget inom 2 arbetsdagar. Sedan loggar du in och bygger din
                profil.
              </p>
              <Link href="/registrera">
                <span
                  className="font-medium cursor-pointer hover:opacity-80 transition-opacity"
                  style={{ color: "#1D9E75" }}
                >
                  Registrera ditt företag &rarr;
                </span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 4 — WHAT YOU GET FREE */}
      <section className="py-20" style={{ backgroundColor: "#F9FAFB" }}>
        <div className="max-w-[1700px] mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-16">
            Allt du får — kostnadsfritt
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 max-w-5xl mx-auto">
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-3">Korrekt information</h3>
              <p className="text-gray-600 leading-relaxed">
                Säkerställ att adress, telefonnummer och tjänster stämmer — så att rätt kunder
                hittar dig.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-3">Ta emot förfrågningar</h3>
              <p className="text-gray-600 leading-relaxed">
                Kunder kan skicka offertförfrågningar direkt till dig via registret.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-3">Kontroll över din profil</h3>
              <p className="text-gray-600 leading-relaxed">
                Du bestämmer vad som visas — och kan uppdatera uppgifterna när du vill.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 5 — HOW IT WORKS */}
      <section className="py-20 bg-white">
        <div className="max-w-[1700px] mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-16">
            Så här fungerar det
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 max-w-5xl mx-auto">
            {/* Track A */}
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-8 pb-3 border-b border-gray-200">
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
                    <div
                      className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold"
                      style={{ backgroundColor: "#1D9E75" }}
                    >
                      {i + 1}
                    </div>
                    <div>
                      <p className="font-bold text-gray-900 mb-1">{step.title}</p>
                      <p className="text-sm text-gray-600 leading-relaxed">{step.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {/* Track B */}
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-8 pb-3 border-b border-gray-200">
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
                    <div
                      className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold"
                      style={{ backgroundColor: "#1D9E75" }}
                    >
                      {i + 1}
                    </div>
                    <div>
                      <p className="font-bold text-gray-900 mb-1">{step.title}</p>
                      <p className="text-sm text-gray-600 leading-relaxed">{step.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 6 — PREMIUM */}
      <section className="py-20" style={{ backgroundColor: "#111827" }}>
        <div className="max-w-[1700px] mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-white mb-4">Syns mer med Premium</h2>
          <p className="text-gray-300 text-lg mb-12 max-w-2xl leading-relaxed">
            Med ett premiumkonto visas ditt företag tydligare i sökresultaten och du kan
            presentera din verksamhet mer utförligt.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 max-w-3xl mb-12">
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
              <div key={i}>
                <h3 className="text-white font-bold mb-2">{item.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
          <Link href="/premium">
            <button
              className="px-8 py-4 font-semibold text-white rounded transition-opacity hover:opacity-90"
              style={{ backgroundColor: "#1D9E75" }}
            >
              Läs mer om Premium
            </button>
          </Link>
        </div>
      </section>

      {/* SECTION 7 — FINAL CTA */}
      <section className="py-24 bg-white text-center">
        <div className="max-w-[1700px] mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-3">Redo att ta kontroll?</h2>
          <p className="text-gray-500 text-lg mb-10">Det tar fem minuter att komma igång.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/companies">
              <button
                className="px-8 py-4 font-semibold text-white rounded transition-opacity hover:opacity-90"
                style={{ backgroundColor: "#1D9E75" }}
              >
                Hitta ditt företag nu
              </button>
            </Link>
            <Link href="/registrera">
              <button className="px-8 py-4 font-semibold text-gray-900 rounded border-2 border-gray-900 bg-transparent hover:bg-gray-900 hover:text-white transition-colors">
                Registrera nytt företag
              </button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
