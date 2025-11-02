import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, Building } from "lucide-react";
import type { Company } from "@shared/schema";

interface CompanyCardProps {
  company: Company;
}

export default function CompanyCard({ company }: CompanyCardProps) {
  // Use Swedish description if available, otherwise fall back to English
  const displayDescription = company.description_sv || company.description;
  
  return (
    <Link href={`/companies/${company.slug}`}>
      <Card className="border border-gray-200 rounded-none cursor-pointer hover:border-gray-300 transition-colors h-full">
        <CardContent className="p-6 h-full flex flex-col">
          <div className="mb-4">
            <h4 className="font-medium hover:text-primary transition-colors text-[#161616] mb-2">{company.name}</h4>
            <div className="flex gap-2">
              {company.isFeatured && (
                <Badge variant="secondary" className="bg-[#FFE0DD] text-[#3D3D3C] border border-[#CECECD]">
                  Utmärkt
                </Badge>
              )}
              {company.isVerified && (
                <Badge variant="secondary" className="bg-[#EBEDD6] text-[#3D3D3C] border border-[#CECECD]">
                  Verifierat
                </Badge>
              )}
            </div>
          </div>

          <div className="flex-grow mb-6">
            <p className="text-sm text-gray-600 line-clamp-3">
              {displayDescription}
            </p>
          </div>

          <div className="flex justify-between items-center mt-auto">
            <div className="flex items-center text-sm text-gray-500">
              <MapPin className="h-4 w-4 mr-1" />
              <span>{company.city || company.location}</span>
            </div>
            <Button 
              className="bg-primary hover:bg-primary-dark text-white text-sm"
              onClick={(e) => e.stopPropagation()}
            >
              Visa profil
            </Button>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
