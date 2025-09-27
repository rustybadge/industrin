import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Search } from "lucide-react";
import { api } from "@/lib/api";

interface SearchFiltersProps {
  filters: {
    search: string;
    region: string;
    categories: string[];
  };
  onFiltersChange: (filters: any) => void;
}

export default function SearchFilters({ filters, onFiltersChange }: SearchFiltersProps) {
  const [localSearch, setLocalSearch] = useState(filters.search);

  const { data: regions = [] } = useQuery({
    queryKey: ['/api/regions'],
    queryFn: () => api.regions.getAll(),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['/api/categories'],
    queryFn: () => api.categories.getAll(),
  });

  useEffect(() => {
    setLocalSearch(filters.search);
  }, [filters.search]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onFiltersChange({
      ...filters,
      search: localSearch,
    });
  };

  const handleRegionChange = (region: string) => {
    onFiltersChange({
      ...filters,
      region: region === "Alla regioner" ? "" : region,
    });
  };

  const handleCategoryChange = (category: string) => {
    const newCategories = category === "Alla kategorier" ? [] : [category];
    onFiltersChange({
      ...filters,
      categories: newCategories,
    });
  };

  return (
    <Card className="mb-8">
      <CardContent className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-secondary mb-2">Sök företag</label>
            <form onSubmit={handleSearch} className="relative">
              <Input
                type="text"
                placeholder="Företagsnamn eller nyckelord..."
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
                className="pr-10"
              />
              <Button
                type="submit"
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1 h-8 w-8"
              >
                <Search className="h-4 w-4" />
              </Button>
            </form>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-secondary mb-2">Region</label>
            <Select value={filters.region || "Alla regioner"} onValueChange={handleRegionChange}>
              <SelectTrigger>
                <SelectValue placeholder="Alla regioner" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Alla regioner">Alla regioner</SelectItem>
                {regions.map((region) => (
                  <SelectItem key={region} value={region}>
                    {region}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium text-secondary mb-2">Kategori</label>
            <Select 
              value={filters.categories.length > 0 ? filters.categories[0] : "Alla kategorier"} 
              onValueChange={handleCategoryChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="Alla kategorier" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Alla kategorier">Alla kategorier</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
