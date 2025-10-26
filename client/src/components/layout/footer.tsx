import { Facebook, Linkedin, Twitter, Youtube, Instagram, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
          <span className="text-gray-900 font-medium" style={{ fontSize: '24px' }}>Keep Industry Moving.</span>
        </div>

        {/* Main Footer Content - Two Column Layout */}
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-8">
          {/* Left Side - Three Columns of Links */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:flex-1 lg:max-w-4xl">
            {/* Features Column */}
            <div>
              <h4 className="font-bold text-gray-900 mb-4">Features</h4>
              <ul className="space-y-2 text-gray-600">
                <li><a href="/companies" className="hover:text-gray-900 transition-colors">Overview</a></li>
                <li><a href="/begar-offert" className="hover:text-gray-900 transition-colors">Begär offert</a></li>
                <li><a href="/companies" className="hover:text-gray-900 transition-colors">Hitta företag</a></li>
                <li><a href="#" className="hover:text-gray-900 transition-colors">Kategorier</a></li>
                <li><a href="#" className="hover:text-gray-900 transition-colors">Regionsökning</a></li>
                <li><a href="#" className="hover:text-gray-900 transition-colors">Priser</a></li>
                <li><a href="#" className="hover:text-gray-900 transition-colors">API</a></li>
                <li><a href="#" className="hover:text-gray-900 transition-colors">Ladda ner</a></li>
              </ul>
            </div>

            {/* Resources Column */}
            <div>
              <h4 className="font-bold text-gray-900 mb-4">Resources</h4>
              <ul className="space-y-2 text-gray-600">
                <li><a href="#" className="hover:text-gray-900 transition-colors">GitHub</a></li>
                <li><a href="#" className="hover:text-gray-900 transition-colors">Support</a></li>
                <li><a href="/integritetspolicy" className="hover:text-gray-900 transition-colors">Privacy policy</a></li>
                <li><a href="#" className="hover:text-gray-900 transition-colors">Terms and Conditions</a></li>
                <li><a href="#" className="hover:text-gray-900 transition-colors">Branding</a></li>
              </ul>
            </div>

            {/* Company Column */}
            <div>
              <h4 className="font-bold text-gray-900 mb-4">Company</h4>
              <ul className="space-y-2 text-gray-600">
                <li><a href="#" className="hover:text-gray-900 transition-colors">Story</a></li>
                <li><a href="#" className="hover:text-gray-900 transition-colors">Updates</a></li>
                <li><a href="#" className="hover:text-gray-900 transition-colors">Open startup</a></li>
                <li><a href="#" className="hover:text-gray-900 transition-colors">OSS friends</a></li>
              </ul>
            </div>
          </div>

          {/* Right Side - Social Media and Email Subscription */}
          <div className="flex flex-col items-end space-y-6">
            {/* Social Media Icons */}
            <div className="flex items-center space-x-4">
              <a href="#" className="text-gray-400 hover:text-gray-600 transition-colors">
                <Twitter className="h-5 w-5" />
              </a>
              <a href="#" className="text-gray-400 hover:text-gray-600 transition-colors">
                <Instagram className="h-5 w-5" />
              </a>
              <a href="#" className="text-gray-400 hover:text-gray-600 transition-colors">
                <Linkedin className="h-5 w-5" />
              </a>
              <a href="#" className="text-gray-400 hover:text-gray-600 transition-colors">
                <Youtube className="h-5 w-5" />
              </a>
            </div>

            {/* Email Subscription */}
            <div className="flex items-center space-x-2">
              <Input 
                type="email" 
                placeholder="Enter your email" 
                className="w-48 h-9 text-sm border-gray-300 focus:border-gray-400 focus:ring-gray-400"
              />
              <Button 
                size="sm" 
                className="h-9 px-4 bg-gray-900 hover:bg-gray-800 text-white text-sm"
              >
                Subscribe
              </Button>
            </div>
          </div>
        </div>

        {/* Bottom Copyright */}
        <div className="border-t border-gray-200 pt-8 mt-8 text-center text-gray-500">
          <p>&copy; 2024 Industrin.net. Alla rättigheter förbehållna.</p>
        </div>
      </div>
    </footer>
  );
}
