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
                <IndustrinLogo
                  className="h-8 w-auto cursor-pointer text-gray-900"
                  height={32}
                  width={193}
                />
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
