import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import { useState } from "react";
import IndustrinLogo from "@/components/ui/industrin-logo";

export default function Header() {
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <header className="shadow-sm sticky top-0 z-50 bg-white">
      <div className="max-w-[1700px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Link href="/">
                <IndustrinLogo 
                  className="h-8 w-auto cursor-pointer text-gray-900" 
                  height={32}
                  width={193}
                />
              </Link>
            </div>
          </div>
          
          <nav className="hidden md:block">
            <div className="ml-10 flex items-center">
              <Link href="/begar-offert">
                <Button className="bg-gray-900 hover:bg-gray-800 text-white font-semibold">
                  SÖK SERVICE NU
                </Button>
              </Link>
            </div>
          </nav>
          
          <div className="md:hidden">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              <Menu className="h-5 w-5" />
            </Button>
          </div>
        </div>
        
        {/* Mobile menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 border-t">
              <Link href="/begar-offert">
                <Button className="w-full mt-2 bg-gray-900 hover:bg-gray-800 text-white font-semibold">
                  FÅ HJÄLP NU
                </Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
