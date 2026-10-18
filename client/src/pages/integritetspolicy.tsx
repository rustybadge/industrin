import { useLocation } from 'wouter';

export default function Integritetspolicy() {
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

        <h1 className="custom-size text-2xl sm:text-4xl font-bold mb-8 text-[#171717]">Integritetspolicy</h1>

        <div className="text-gray-700 space-y-8">
          <p className="text-base text-gray-500">Senast uppdaterad: Oktober 2026</p>

          <p className="leading-relaxed">
            Industrin.net är en tjänst som ägs och drivs av <strong>TWCC AB (The West Coast Collective)</strong>, registrerat i Sverige. Vi värnar om din personliga integritet och behandlar personuppgifter i enlighet med EU:s dataskyddsförordning (GDPR).
          </p>

          <section>
            <h2 className="custom-size text-lg sm:text-2xl font-bold text-[#1f2937] mb-4">1. Personuppgiftsansvarig</h2>
            <p className="leading-relaxed">
              TWCC AB (The West Coast Collective) är personuppgiftsansvarig för behandlingen av dina uppgifter på Industrin.net.
              Kontakt: <a href="mailto:info@industrin.net" className="text-blue-600 hover:underline">info@industrin.net</a>.
            </p>
          </section>

          <section>
            <h2 className="custom-size text-lg sm:text-2xl font-bold text-[#1f2937] mb-4">2. Vilka uppgifter vi samlar in</h2>
            <p className="leading-relaxed mb-4">Vi behandlar personuppgifter i följande situationer:</p>
            <div className="space-y-4">
              <div>
                <p className="font-semibold mb-1">Serviceförfrågningar</p>
                <p className="leading-relaxed text-sm">
                  När du skickar en förfrågan via Industrin.net samlar vi in ditt namn, e-postadress, telefonnummer (valfritt), företagsnamn (valfritt), beskrivning av behovet samt ort och region. Dessa uppgifter vidarebefordras till relevanta serviceföretag i ditt område.
                </p>
              </div>
              <div>
                <p className="font-semibold mb-1">Ägaransökningar</p>
                <p className="leading-relaxed text-sm">
                  När ett företag ansöker om att ta över sin profil samlar vi in sökandens namn, e-postadress och telefonnummer för att verifiera ansökan.
                </p>
              </div>
              <div>
                <p className="font-semibold mb-1">Företagskonton</p>
                <p className="leading-relaxed text-sm">
                  När en ägaransökan godkänns skapas ett konto via vår autentiseringstjänst (Clerk). Vi behandlar namn och e-postadress kopplat till kontot.
                </p>
              </div>
              <div>
                <p className="font-semibold mb-1">Företagsprofiler</p>
                <p className="leading-relaxed text-sm">
                  Uppgifter som du lägger till i din företagsprofil — beskrivning, adress, kontaktuppgifter, logotyp m.m. — behandlas och visas publikt på sajten.
                </p>
              </div>
            </div>
            <p className="leading-relaxed mt-4">Vi samlar inte in känsliga personuppgifter.</p>
          </section>

          <section>
            <h2 className="custom-size text-lg sm:text-2xl font-bold text-[#1f2937] mb-4">3. Rättslig grund</h2>
            <div className="space-y-3">
              <p className="leading-relaxed">
                <strong>Avtalets fullgörande:</strong> Behandling av uppgifter vid serviceförfrågningar och ägaransökningar sker för att tillhandahålla den tjänst du begärt.
              </p>
              <p className="leading-relaxed">
                <strong>Berättigat intresse:</strong> Vi behandlar uppgifter för att driva, underhålla och förbättra tjänsten, samt för att matcha köpare med relevanta serviceföretag.
              </p>
              <p className="leading-relaxed">
                <strong>Rättslig förpliktelse:</strong> I de fall lag kräver det.
              </p>
            </div>
          </section>

          <section>
            <h2 className="custom-size text-lg sm:text-2xl font-bold text-[#1f2937] mb-4">4. Lagringstid</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Serviceförfrågningar sparas i upp till 12 månader.</li>
              <li>Ägaransökningar sparas normalt i upp till 24 månader.</li>
              <li>Företagskonton och profildata sparas så länge kontot är aktivt.</li>
              <li>Vi raderar uppgifter tidigare på begäran, om inte annan lag hindrar det.</li>
            </ul>
          </section>

          <section>
            <h2 className="custom-size text-lg sm:text-2xl font-bold text-[#1f2937] mb-4">5. Utlämnande av uppgifter</h2>
            <p className="leading-relaxed mb-4">Vi delar personuppgifter med:</p>
            <ul className="list-disc pl-6 space-y-3 mb-4">
              <li>
                <strong>Serviceföretag på plattformen</strong> — när du skickar en serviceförfrågan vidarebefordras relevanta uppgifter (namn, e-post, telefon, beskrivning) till matchade företag.
              </li>
              <li>
                <strong>Clerk Inc</strong> — autentisering och kontohantering.{' '}
                <a href="https://clerk.com/privacy" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Clerks integritetspolicy</a>.
              </li>
              <li>
                <strong>Resend Inc</strong> — e-postleverans av transaktionella meddelanden.{' '}
                <a href="https://resend.com/privacy" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Resends integritetspolicy</a>.
              </li>
              <li>
                <strong>Neon Inc</strong> — databasvärd för plattformens data.{' '}
                <a href="https://neon.tech/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Neons integritetspolicy</a>.
              </li>
              <li>
                <strong>Netlify Inc / Render Inc</strong> — hosting av frontend respektive backend.
              </li>
            </ul>
            <p className="leading-relaxed">
              Alla leverantörer behandlar data under bindande databehandlaravtal (DPA). Vi säljer aldrig personuppgifter vidare. Leverantörerna är baserade i USA — överföring sker i enlighet med standardavtalsklausuler (SCCs).
            </p>
          </section>

          <section>
            <h2 className="custom-size text-lg sm:text-2xl font-bold text-[#1f2937] mb-4">6. Cookies</h2>
            <p className="leading-relaxed mb-4">
              Industrin.net använder <strong>enbart nödvändiga cookies</strong>. Vi använder inga analys-, spårnings- eller marknadsföringscookies.
            </p>
            <div className="bg-gray-50 border border-gray-200 rounded p-4">
              <p className="font-semibold text-sm mb-2">Nödvändiga sessionscookies (Clerk)</p>
              <p className="text-sm leading-relaxed text-gray-600">
                Dessa cookies sätts av vår autentiseringstjänst för att hålla dig inloggad som företagsanvändare. De är tekniskt nödvändiga för inloggningsfunktionen och kräver inte samtycke enligt ePrivacy-direktivet.
              </p>
            </div>
            <p className="text-sm text-gray-500 mt-3">
              Du kan när som helst rensa cookies i din webbläsare, men det kan innebära att du loggas ut.
            </p>
          </section>

          <section>
            <h2 className="custom-size text-lg sm:text-2xl font-bold text-[#1f2937] mb-4">7. Dina rättigheter</h2>
            <p className="leading-relaxed mb-4">Enligt GDPR har du rätt att:</p>
            <ul className="list-disc pl-6 space-y-2 mb-4">
              <li><strong>Tillgång</strong> — begära en kopia av de uppgifter vi har om dig.</li>
              <li><strong>Rättelse</strong> — begära att felaktiga uppgifter korrigeras.</li>
              <li><strong>Radering</strong> — begära att dina uppgifter raderas när det är tillåtet.</li>
              <li><strong>Begränsning</strong> — begära att behandlingen begränsas i vissa fall.</li>
              <li><strong>Dataportabilitet</strong> — få ut dina uppgifter i ett strukturerat format.</li>
              <li><strong>Invändning</strong> — invända mot behandling som grundar sig på berättigat intresse.</li>
            </ul>
            <p className="leading-relaxed">
              Skicka din begäran till{' '}
              <a href="mailto:info@industrin.net" className="text-blue-600 hover:underline">info@industrin.net</a>.
              Vi besvarar begäran inom 30 dagar.
            </p>
            <p className="leading-relaxed mt-4">
              Du kan också lämna klagomål till <strong>Integritetsskyddsmyndigheten (IMY)</strong> på{' '}
              <a href="https://www.imy.se" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">imy.se</a>.
            </p>
          </section>

          <section>
            <h2 className="custom-size text-lg sm:text-2xl font-bold text-[#1f2937] mb-4">8. Säkerhet</h2>
            <p className="leading-relaxed">
              Vi vidtar tekniska och organisatoriska åtgärder för att skydda dina personuppgifter mot obehörig åtkomst, förlust eller missbruk. All kommunikation sker krypterat via HTTPS.
            </p>
          </section>

          <section>
            <h2 className="custom-size text-lg sm:text-2xl font-bold text-[#1f2937] mb-4">9. Ändringar</h2>
            <p className="leading-relaxed">
              Vi kan uppdatera denna policy om tjänsten eller lagstiftningen förändras. Senaste versionen publiceras alltid på denna sida med uppdaterat datum.
            </p>
          </section>

          <section>
            <h2 className="custom-size text-lg sm:text-2xl font-bold text-[#1f2937] mb-4">10. Kontakt</h2>
            <p className="leading-relaxed">
              <strong>TWCC AB (The West Coast Collective)</strong><br />
              E-post: <a href="mailto:info@industrin.net" className="text-blue-600 hover:underline">info@industrin.net</a>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
