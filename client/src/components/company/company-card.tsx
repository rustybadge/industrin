import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin } from "lucide-react";
import type { Company } from "@shared/schema";

interface CompanyCardProps {
  company: Company;
}

export default function CompanyCard({ company }: CompanyCardProps) {
  // Use Swedish description if available, otherwise fall back to English
  const displayDescription = company.description_sv || company.description;
  
  return (
    <Link href={`/companies/${company.slug}`}>
      <Card className={`border-0 rounded-none cursor-pointer hover:border-gray-300 transition-colors h-full bg-[#FAFAFA] ${company.isVerified ? 'border-l-2 border-[#1D9E75]' : 'border-l-2 border-gray-200'}`}>
        <CardContent className="p-6 h-full flex flex-col">
          <div className="mb-4">
            <h4 className="font-medium hover:text-primary transition-colors text-[#171717] mb-2">{company.name}</h4>
            <div className="flex gap-2">
              {company.isFeatured && (
                <Badge variant="secondary" className="bg-[#D0FBE5] text-gray-900 border border-gray-300">
                  Utmärkt
                </Badge>
              )}
              {company.isVerified && (
                <Badge variant="secondary" className="bg-[#D9E5FF] text-gray-900 border border-gray-300">
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

          <div className="flex items-center text-sm text-gray-500 mt-auto">
            <MapPin className="h-4 w-4 mr-1" />
            <span>{company.city || company.location}</span>
          </div>

          {!company.isVerified && (
            <p className="text-xs text-gray-400 mt-2">Ej hanterad — ta över profilen</p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
