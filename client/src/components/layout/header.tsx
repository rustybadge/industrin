import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import IndustrinLogo from "@/components/ui/industrin-logo";
import { Menu } from "lucide-react";

export default function Header() {
  const [location] = useLocation();

  return (
    <header className="border-b border-[#e6e6e6] sticky top-0 z-50 bg-white/70 backdrop-blur-sm">
      <div className="max-w-[1700px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Link href="/">
                {/* Full logo on md+, icon mark only on mobile */}
                <IndustrinLogo
                  className="hidden md:block h-8 w-auto cursor-pointer text-gray-900"
                  height={32}
                  width={193}
                />
                <svg
                  className="block md:hidden h-8 w-auto cursor-pointer text-gray-900"
                  height={32}
                  width={32}
                  viewBox="0 0 265 300"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M251.887 77.61L126.466 146.577V292.068L127.012 292.382L126.466 292.697L0.5 219.952V96.1042C0.5 84.8546 6.50092 74.4594 16.2427 68.8335L110.717 14.2744C120.462 8.6466 132.47 8.64661 142.215 14.2744L251.887 77.61Z" fill="currentColor"/>
                </svg>
              </Link>
            </div>
          </div>
          
          <nav className="hidden md:block">
            <div className="ml-10 flex items-center gap-6">
              <Link href="/for-foretag">
                <span className="text-sm font-medium text-[#092490] hover:text-[#071d74] transition-colors cursor-pointer">
                  För företag
                </span>
              </Link>
              <Link href="/begar-offert">
                <Button className="bg-primary hover:bg-primary-dark text-white font-medium">
                  Hitta service
                </Button>
              </Link>
            </div>
          </nav>
          
          <div className="md:hidden">
            <Button
              variant="ghost"
              size="icon"
              className="text-[#111827] hover:text-[#111827] hover:bg-transparent"
            >
              <Menu className="h-6 w-6" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
