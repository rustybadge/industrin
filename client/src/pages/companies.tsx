import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import SmartSearch, { type SearchTag } from "@/components/search/smart-search";
import SortOptions from "@/components/search/sort-options";
import CompanyCard from "@/components/company/company-card";
import { Skeleton } from "@/components/ui/skeleton";
import type { Company } from "@shared/schema";

const PAGE_SIZE = 18;

export default function Companies() {
  const [location, navigate] = useLocation();
  const urlParams = new URLSearchParams(location.split('?')[1] || '');

  const [searchQuery, setSearchQuery] = useState(urlParams.get('search') || '');
  const [searchTags, setSearchTags] = useState<SearchTag[]>([]);
  const [selectedRegions, setSelectedRegions] = useState<string[]>(
    urlParams.get('region') ? [urlParams.get('region')!] : []
  );
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    urlParams.get('categories')?.split(',').filter(Boolean) || []
  );
  const [sortBy, setSortBy] = useState('name-asc');
  const [offset, setOffset] = useState(0);
  const [accumulatedCompanies, setAccumulatedCompanies] = useState<(Company & { isClaimed: boolean })[]>([]);

  // Build filters object from state
  const filters = {
    search: searchQuery,
    region: selectedRegions[0] || '',
    categories: selectedCategories,
  };

  // Reset pagination when filters change
  useEffect(() => {
    setOffset(0);
    setAccumulatedCompanies([]);
  }, [searchQuery, selectedRegions.join(','), selectedCategories.join(',')]);

  const { data: pageData, isLoading, isFetching } = useQuery({
    queryKey: ['/api/companies', filters, offset],
    queryFn: () => api.companies.getAll({ ...filters, limit: PAGE_SIZE, offset }),
    staleTime: 0,
  });

  // Accumulate pages
  useEffect(() => {
    if (!pageData) return;
    if (offset === 0) {
      setAccumulatedCompanies(pageData);
    } else {
      setAccumulatedCompanies(prev => [...prev, ...pageData]);
    }
  }, [pageData, offset]);

  const { data: countData } = useQuery({
    queryKey: ['/api/companies/count', filters],
    queryFn: () => api.companies.getCount(filters),
    staleTime: 0,
  });
  const totalCount = countData?.total ?? null;

  // Client-side sort applied on accumulated results
  const sortedCompanies = [...accumulatedCompanies].sort((a, b) => {
    const getDescriptionPriority = (company: Company) => {
      if (!company.description || company.description.length === 0) return 0;
      if (company.description.length < 50) return 1;
      if (company.description.length < 150) return 2;
      return 3;
    };

    switch (sortBy) {
      case 'name-asc': {
        const aPriority = getDescriptionPriority(a);
        const bPriority = getDescriptionPriority(b);
        if (aPriority !== bPriority) return bPriority - aPriority;
        return a.name.localeCompare(b.name, 'sv');
      }
      case 'name-desc': {
        const aPriorityDesc = getDescriptionPriority(a);
        const bPriorityDesc = getDescriptionPriority(b);
        if (aPriorityDesc !== bPriorityDesc) return bPriorityDesc - aPriorityDesc;
        return b.name.localeCompare(a.name, 'sv');
      }
      case 'relevance': {
        if (!searchQuery) return 0;
        const aRelevant = a.name.toLowerCase().includes(searchQuery.toLowerCase()) ? 1 : 0;
        const bRelevant = b.name.toLowerCase().includes(searchQuery.toLowerCase()) ? 1 : 0;
        return bRelevant - aRelevant;
      }
      case 'newest':
        return b.id.localeCompare(a.id);
      default:
        return 0;
    }
  });

  // Handle smart search
  const handleSmartSearch = (query: string, tags: SearchTag[]) => {
    setSearchQuery(query);
    setSearchTags(tags);

    const regions = tags.filter(tag => tag.type === 'region').map(tag => tag.value);
    const categories = tags.filter(tag => tag.type === 'category').map(tag => tag.value);

    setSelectedRegions(regions);
    setSelectedCategories(categories);
  };

  const handleRegionToggle = (region: string) => {
    setSelectedRegions(prev =>
      prev.includes(region)
        ? prev.filter(r => r !== region)
        : [region]
    );
  };

  const handleCategoryToggle = (category: string) => {
    setSelectedCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (searchQuery) params.set('search', searchQuery);
    if (selectedRegions[0]) params.set('region', selectedRegions[0]);
    if (selectedCategories.length > 0) params.set('categories', selectedCategories.join(','));

    const newUrl = `/companies${params.toString() ? `?${params.toString()}` : ''}`;
    window.history.replaceState({}, '', newUrl);
  }, [searchQuery, selectedRegions, selectedCategories]);

  const skeletonCards = [...Array(9)].map((_, i) => (
    <div key={i} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center">
          <Skeleton className="w-12 h-12 rounded-lg mr-3" />
          <div>
            <Skeleton className="h-4 w-32 mb-2" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
        <Skeleton className="h-6 w-16" />
      </div>
      <Skeleton className="h-16 w-full mb-4" />
      <div className="flex gap-2 mb-4">
        <Skeleton className="h-6 w-20" />
        <Skeleton className="h-6 w-16" />
      </div>
      <div className="flex justify-between items-center">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-9 w-20" />
      </div>
    </div>
  ));

  return (
    <section className="py-8 bg-background min-h-screen">
      <div className="max-w-[1700px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-bold text-[40px] leading-[44px] mt-2 mb-2 text-[#171717]" style={{ letterSpacing: '-1.6px' }}>Företagskatalog</h1>
          <p className="text-lg text-gray-600">Sök och filtrera bland företag som kan hjälpa dig med reparation, underhåll och service</p>
        </div>

        {/* Smart Search */}
        <div className="mb-8">
          <SmartSearch
            onSearch={handleSmartSearch}
            initialQuery={searchQuery}
            placeholder="Sök företag, ort eller specialområde..."
          />
        </div>

        {/* Category Quote Banner */}
        <div className="bg-[#BCD2FF] text-white p-6 !rounded-none mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div className="mb-4 md:mb-0">
              <h3 className="text-xl font-bold mb-2 text-[#0A0A0A]">Begär offert på reparation & service</h3>
              <p className="text-[#0A0A0A]">Få offerter från flera företag samtidigt. Helt kostnadsfritt.</p>
            </div>
            <Button
              className="bg-[#3467FF] hover:bg-[#1B43F5] text-white font-medium px-6 py-2"
              onClick={() => navigate('/begar-offert')}
            >
              Skapa förfrågan nu
            </Button>
          </div>
        </div>

        {/* Results Header with Sort */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4">
          <div>
            {totalCount !== null && (
              <p className="text-sm text-gray-500">
                Visar {sortedCompanies.length} av {totalCount} företag
              </p>
            )}
            {(searchQuery || selectedRegions.length > 0 || selectedCategories.length > 0) && (
              <p className="text-sm text-gray-500 mt-1">
                {searchQuery && `Sökning: "${searchQuery}"`}
                {selectedRegions.length > 0 && ` • Region: ${selectedRegions.join(', ')}`}
                {selectedCategories.length > 0 && ` • Kategori: ${selectedCategories.join(', ')}`}
              </p>
            )}
          </div>
          <SortOptions value={sortBy} onChange={setSortBy} />
        </div>

        {/* Company Grid */}
        {isLoading && offset === 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {skeletonCards}
          </div>
        ) : sortedCompanies.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-lg text-gray-600 mb-4">Inga företag hittades med de valda filtren.</p>
            <p className="text-sm text-gray-500">Försök att ändra dina sökkriterier eller ta bort några filter.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sortedCompanies.map((company) => (
                <CompanyCard key={company.id} company={company} />
              ))}
              {isFetching && offset > 0 && skeletonCards}
            </div>
          </>
        )}

        {/* Load more */}
        {totalCount !== null && sortedCompanies.length < totalCount && (
          <div className="text-center mt-10">
            <Button
              variant="outline"
              onClick={() => setOffset(prev => prev + PAGE_SIZE)}
              disabled={isFetching}
              className="px-8"
              style={{ height: '48px' }}
            >
              {isFetching ? 'Laddar...' : 'Ladda fler företag'}
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}
