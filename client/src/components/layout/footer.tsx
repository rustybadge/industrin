import { Facebook, Linkedin, Twitter } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-secondary text-white py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <h3 className="text-xl font-bold mb-4">Industrin.net</h3>
            <p className="text-gray-300 mb-4">
              Sveriges ledande plattform för att hitta och kontakta serviceföretag och få hjälp med reparation, underhåll, reservdelar och mer.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="text-gray-300 hover:text-white transition-colors">
                <Facebook className="h-5 w-5" />
              </a>
              <a href="#" className="text-gray-300 hover:text-white transition-colors">
                <Linkedin className="h-5 w-5" />
              </a>
              <a href="#" className="text-gray-300 hover:text-white transition-colors">
                <Twitter className="h-5 w-5" />
              </a>
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Få Servicehjälp</h4>
            <ul className="space-y-2 text-gray-300">
              <li><a href="/begar-offert" className="hover:text-white transition-colors">Begär offert</a></li>
              <li><a href="/companies" className="hover:text-white transition-colors">Hitta företag</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Företag</h4>
            <ul className="space-y-2 text-gray-300">
              <li><a href="#" className="hover:text-white transition-colors">Registrera företag</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Kontakt</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Support</h4>
            <ul className="space-y-2 text-gray-300">
              <li><a href="#" className="hover:text-white transition-colors">FAQ</a></li>
              <li><a href="/integritetspolicy" className="hover:text-white transition-colors">Integritetspolicy</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Användarvillkor</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Cookies</a></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-600 pt-8 mt-8 text-center text-gray-300">
          <p>&copy; 2024 Industrin.net. Alla rättigheter förbehållna.</p>
          <p className="text-sm mt-4">
            Vi använder cookies för att ge dig en bättre upplevelse. Läs mer i vår{" "}
            <a href="/integritetspolicy" className="text-white hover:underline transition-colors">
              Integritetspolicy
            </a>
            .
          </p>
        </div>
      </div>
    </footer>
  );
}
