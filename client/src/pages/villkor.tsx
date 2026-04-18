import { useLocation } from 'wouter';

export default function Villkor() {
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <button
            onClick={() => navigate('/')}
            className="text-sm text-gray-500 hover:text-gray-700 underline"
          >
            Tillbaka till startsidan
          </button>
        </div>

        <h1 className="custom-size text-2xl sm:text-4xl font-bold mb-8 text-[#171717]">Användarvillkor</h1>

        <div className="text-gray-700 space-y-8">
          <p className="text-lg leading-relaxed">
            Industrin.net är ett svenskt B2B-företagsregister för serviceföretag inom industrin.
            Dessa villkor gäller för dig som använder tjänsten — framför allt för dig som ansöker
            om att förvalta en företagsprofil.
          </p>

          <section>
            <h2 className="custom-size text-lg sm:text-2xl font-bold text-[#1f2937] mb-4">Ägaranspråk</h2>
            <p className="leading-relaxed mb-4">
              Genom att ansöka om att förvalta en företagsprofil på Industrin.net bekräftar du att
              du är behörig att representera företaget — till exempel som ägare, VD eller
              en person som har rätt att agera för företagets räkning.
            </p>
            <p className="leading-relaxed">
              Ett godkänt ägaranspråk ger dig möjlighet att uppdatera företagets profilinformation
              och ta emot förfrågningar via plattformen. Industrin.net förbehåller sig rätten att
              granska och neka ansökningar.
            </p>
          </section>

          <section>
            <h2 className="custom-size text-lg sm:text-2xl font-bold text-[#1f2937] mb-4">Personuppgifter</h2>
            <p className="leading-relaxed mb-4">
              De kontaktuppgifter du lämnar i samband med en ägaransökan — namn, e-postadress och
              eventuellt telefonnummer — behandlas i enlighet med GDPR.
            </p>
            <p className="leading-relaxed">
              Uppgifterna används enbart för att verifiera ansökan och kommunicera med dig som
              sökande. Vi delar inte dina personuppgifter med tredje part utöver vad som krävs för
              att driva tjänsten. Läs mer i vår{' '}
              <a href="/integritetspolicy" className="text-blue-600 hover:underline">
                integritetspolicy
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="custom-size text-lg sm:text-2xl font-bold text-[#1f2937] mb-4">Ansvar</h2>
            <p className="leading-relaxed mb-4">
              Industrin.net förbehåller sig rätten att neka, återkalla eller avsluta åtkomst till
              en företagsprofil om villkoren inte uppfylls eller om information på plattformen
              är felaktig eller missvisande.
            </p>
            <p className="leading-relaxed">
              Du ansvarar för att information du publicerar eller uppdaterar i din företagsprofil är
              korrekt och inte kränker tredje parts rättigheter.
            </p>
          </section>

          <section>
            <h2 className="custom-size text-lg sm:text-2xl font-bold text-[#1f2937] mb-4">Kontakt</h2>
            <p className="leading-relaxed">
              Har du frågor om dessa villkor eller din ansökan? Kontakta oss på{' '}
              <a href="mailto:info@industrin.net" className="text-blue-600 hover:underline">
                info@industrin.net
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
