import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { MapPin, Tag } from "lucide-react";
import { api } from "@/lib/api";

interface FacetedSearchProps {
  selectedRegions: string[];
  selectedCategories: string[];
  onRegionToggle: (region: string) => void;
  onCategoryToggle: (category: string) => void;
  companyCounts?: { [key: string]: number };
}

export default function FacetedSearch({ 
  selectedRegions, 
  selectedCategories, 
  onRegionToggle, 
  onCategoryToggle,
  companyCounts = {}
}: FacetedSearchProps) {
  
  const { data: regions = [], isLoading: regionsLoading } = useQuery({
    queryKey: ['/api/regions'],
    queryFn: () => api.regions.getAll(),
  });

  const { data: categories = [], isLoading: categoriesLoading } = useQuery({
    queryKey: ['/api/categories'],
    queryFn: () => api.categories.getAll(),
  });

  const { data: allCompanies = [] } = useQuery({
    queryKey: ['/api/companies', 'all'],
    queryFn: () => api.companies.getAll({}),
  });

  // Calculate counts for each region and category
  const getRegionCount = (region: string) => {
    return allCompanies.filter(company => company.region === region).length;
  };

  const getCategoryCount = (category: string) => {
    return allCompanies.filter(company => company.categories.includes(category)).length;
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Filtrera resultat</h3>
      
      {/* Regions Section */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <MapPin className="h-4 w-4 text-blue-600" />
          <h4 className="font-medium text-gray-900">Regioner</h4>
        </div>
        
        {regionsLoading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {regions.map((region) => {
              const count = getRegionCount(region);
              const isSelected = selectedRegions.includes(region);
              
              return (
                <button
                  key={region}
                  onClick={() => onRegionToggle(region)}
                  className={`w-full flex items-center justify-between p-2 rounded-none transition-colors ${
                    isSelected 
                      ? 'bg-blue-50 border border-blue-200 text-blue-900' 
                      : 'hover:bg-gray-50 border border-transparent'
                  }`}
                >
                  <span className={`text-sm ${isSelected ? 'font-medium' : ''}`}>
                    {region}
                  </span>
                  <Badge 
                    variant="secondary" 
                    className={`text-xs ${
                      isSelected 
                        ? 'bg-blue-100 text-blue-800' 
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {count}
                  </Badge>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Categories Section */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Tag className="h-4 w-4 text-green-600" />
          <h4 className="font-medium text-gray-900">Specialområden</h4>
        </div>
        
        {categoriesLoading ? (
          <div className="space-y-2">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {categories.map((category) => {
              const count = getCategoryCount(category);
              const isSelected = selectedCategories.includes(category);
              
              return (
                <button
                  key={category}
                  onClick={() => onCategoryToggle(category)}
                  className={`w-full flex items-center justify-between p-2 rounded-md transition-colors ${
                    isSelected 
                      ? 'bg-green-50 border border-green-200 text-green-900' 
                      : 'hover:bg-gray-50 border border-transparent'
                  }`}
                >
                  <span className={`text-sm ${isSelected ? 'font-medium' : ''}`}>
                    {category}
                  </span>
                  <Badge 
                    variant="secondary" 
                    className={`text-xs ${
                      isSelected 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {count}
                  </Badge>
                </button>
              );
            })}
          </div>
        )}
      </div>
      
      {/* Clear Filters */}
      {(selectedRegions.length > 0 || selectedCategories.length > 0) && (
        <div className="mt-6 pt-4 border-t border-gray-200">
          <button
            onClick={() => {
              selectedRegions.forEach(region => onRegionToggle(region));
              selectedCategories.forEach(category => onCategoryToggle(category));
            }}
            className="text-sm text-primary hover:text-primary-dark font-medium"
          >
            Rensa alla filter
          </button>
        </div>
      )}
    </div>
  );
}