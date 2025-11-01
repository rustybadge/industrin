import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import IndustrinLogo from "@/components/ui/industrin-logo";
import OffertIcon from "@/components/ui/offert-icon";

export default function Header() {
  const [location] = useLocation();

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
                  Hitta Service
                </Button>
              </Link>
            </div>
          </nav>
          
          <div className="md:hidden">
            <Link href="/begar-offert">
              <Button
                variant="ghost"
                size="icon"
                className="text-[#111827] hover:text-[#111827] [&_svg]:!h-[25px] [&_svg]:!w-[25px]"
              >
                <OffertIcon className="h-[25px] w-[25px]" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
