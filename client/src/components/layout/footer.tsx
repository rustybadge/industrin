import logoImage from "@/assets/images/logo.png";

export default function Footer() {
  return (
    <footer className="bg-white border-t border-gray-200 py-12">
      <div className="max-w-[1700px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Logo and Tagline Section */}
        <div className="flex items-center justify-between py-12 mb-16 border-b border-gray-200">
          <img
            src={logoImage}
            alt="Industrin.net Logo"
            className="h-8 w-auto"
          />
          <span className="text-gray-900 font-medium" style={{ fontSize: '24px' }}>Hitta rätt serviceföretag, snabbt.</span>
        </div>

        {/* Main Footer Content - Three Link Columns */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl">
          {/* Hitta service */}
          <div>
            <h4 className="font-bold text-gray-900 mb-4">Hitta service</h4>
            <ul className="space-y-2 text-gray-600">
              <li><a href="/begar-offert" className="hover:text-gray-900 transition-colors">Begär offert</a></li>
              <li><a href="/companies" className="hover:text-gray-900 transition-colors">Hitta företag A–Ö</a></li>
            </ul>
          </div>

          {/* Bli leverantör */}
          <div>
            <h4 className="font-bold text-gray-900 mb-4">För företag</h4>
            <ul className="space-y-2 text-gray-600">
              <li>
                <a href="/for-foretag" className="hover:text-gray-900 transition-colors">
                  För företag
                </a>
              </li>
              <li>
                <a href="/registrera" className="hover:text-gray-900 transition-colors">
                  Registrera ditt företag
                </a>
              </li>
              <li>
                <a href="/companies" className="hover:text-gray-900 transition-colors">
                  Sök upp ditt företag
                </a>
              </li>
            </ul>
          </div>

          {/* Om oss */}
          <div>
            <h4 className="font-bold text-gray-900 mb-4">Om oss</h4>
            <ul className="space-y-2 text-gray-600">
              <li>
                <a href="mailto:info@industrin.net" className="hover:text-gray-900 transition-colors">
                  Kontakta oss
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Copyright */}
        <div className="border-t border-gray-200 pt-8 mt-8 text-center text-gray-500 text-sm">
          <p className="space-x-4">
            <span>&copy; Industrin.net. Alla rättigheter förbehållna.</span>
            <a href="/villkor" className="hover:text-gray-700">Användarvillkor</a>
            <a href="/integritetspolicy" className="hover:text-gray-700">Integritetspolicy</a>
          </p>
        </div>
      </div>
    </footer>
  );
}
