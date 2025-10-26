import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, X, MapPin, Tag, Building } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { api } from "@/lib/api";

interface SmartSearchProps {
  onSearch: (query: string, tags: SearchTag[]) => void;
  placeholder?: string;
  initialQuery?: string;
  initialTags?: SearchTag[];
}

export interface SearchTag {
  id: string;
  label: string;
  type: 'region' | 'category' | 'company';
  value: string;
}

export default function SmartSearch({ onSearch, placeholder = "Sök företag, ort eller specialområde...", initialQuery = "", initialTags = [] }: SmartSearchProps) {
  const [query, setQuery] = useState(initialQuery);
  const [tags, setTags] = useState<SearchTag[]>(initialTags);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [inputFocus, setInputFocus] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Get suggestions data
  const { data: regions = [] } = useQuery({
    queryKey: ['/api/regions'],
    queryFn: () => api.regions.getAll(),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['/api/categories'],
    queryFn: () => api.categories.getAll(),
  });

  const { data: companies = [] } = useQuery({
    queryKey: ['/api/companies', { limit: 100 }],
    queryFn: () => api.companies.getAll({ limit: 100 }),
  });

  // Generate suggestions based on current query
  const suggestions: SearchTag[] = [];
  
  if (query.length >= 1) {
    const queryLower = query.toLowerCase();
    
    // City-to-region mapping for smart suggestions
    const cityToRegionMap = {
      'göteborg': 'Västra Götalands län',
      'goteborg': 'Västra Götalands län',
      'stockholm': 'Stockholms län',
      'malmö': 'Skåne län',
      'malmo': 'Skåne län',
      'uppsala': 'Uppsala län',
      'linköping': 'Östergötlands län',
      'örebro': 'Örebro län',
      'västerås': 'Västmanlands län',
      'helsingborg': 'Skåne län',
      'norrköping': 'Östergötlands län',
      'lund': 'Skåne län',
      'jönköping': 'Jönköpings län',
      'umeå': 'Västerbottens län',
      'gävle': 'Gävleborgs län',
      'borås': 'Västra Götalands län',
      'eskilstuna': 'Södermanlands län',
      'södertälje': 'Stockholms län',
      'karlstad': 'Värmlands län',
      'täby': 'Stockholms län',
      'växjö': 'Kronobergs län',
      'halmstad': 'Hallands län',
      'sundsvall': 'Västernorrlands län',
      'luleå': 'Norrbottens län',
      'trollhättan': 'Västra Götalands län',
      'östersund': 'Jämtlands län',
      'borlänge': 'Dalarnas län',
      'uddevalla': 'Västra Götalands län',
      'falun': 'Dalarnas län',
      'tumba': 'Stockholms län',
    };
    
    // Company suggestions
    companies.forEach(company => {
      if (company.name.toLowerCase().includes(queryLower) && 
          !tags.some(tag => tag.type === 'company' && tag.value === company.name)) {
        suggestions.push({
          id: `company-${company.id}`,
          label: company.name,
          type: 'company',
          value: company.name
        });
      }
    });

    // Region suggestions (including city-to-region mapping)
    regions.forEach(region => {
      if (region.toLowerCase().includes(queryLower) && 
          !tags.some(tag => tag.type === 'region' && tag.value === region)) {
        suggestions.push({
          id: `region-${region}`,
          label: region,
          type: 'region',
          value: region
        });
      }
    });
    
    // Add city-to-region suggestions
    Object.entries(cityToRegionMap).forEach(([city, region]) => {
      if (city.includes(queryLower) && 
          !tags.some(tag => tag.type === 'region' && tag.value === region) &&
          !suggestions.some(s => s.type === 'region' && s.value === region)) {
        suggestions.push({
          id: `region-${region}`,
          label: region,
          type: 'region',
          value: region
        });
      }
    });

    // Category suggestions
    categories.forEach(category => {
      if (category.toLowerCase().includes(queryLower) && 
          !tags.some(tag => tag.type === 'category' && tag.value === category)) {
        suggestions.push({
          id: `category-${category}`,
          label: category,
          type: 'category',
          value: category
        });
      }
    });
  }

  // Limit suggestions
  const limitedSuggestions = suggestions.slice(0, 8);

  const handleAddTag = (suggestion: SearchTag) => {
    // For company suggestions, navigate directly to the company profile
    if (suggestion.type === 'company') {
      // Find the company by name to get its slug
      const company = companies.find(c => c.name === suggestion.value);
      if (company) {
        window.location.href = `/companies/${company.slug}`;
        return;
      }
    }
    
    // For regions and categories, add as filter tags
    const newTags = [...tags, suggestion];
    setTags(newTags);
    setQuery("");
    setShowSuggestions(false);
    onSearch("", newTags);
    inputRef.current?.focus();
  };

  const handleRemoveTag = (tagId: string) => {
    const newTags = tags.filter(tag => tag.id !== tagId);
    setTags(newTags);
    onSearch(query, newTags);
  };

  const handleQueryChange = (value: string) => {
    setQuery(value);
    setShowSuggestions(value.length > 0);
    onSearch(value, tags);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  const getIconForType = (type: SearchTag['type']) => {
    switch (type) {
      case 'region': return <MapPin className="h-3 w-3" />;
      case 'category': return <Tag className="h-3 w-3" />;
      case 'company': return <Building className="h-3 w-3" />;
    }
  };

  const getColorForType = (type: SearchTag['type']) => {
    switch (type) {
      case 'region': return 'bg-blue-100 text-blue-800 hover:bg-blue-200';
      case 'category': return 'bg-green-100 text-green-800 hover:bg-green-200';
      case 'company': return 'bg-purple-100 text-purple-800 hover:bg-purple-200';
    }
  };

  return (
    <div className="relative w-full max-w-2xl">
      {/* Search Input Container */}
      <div className="relative">
        <div className="flex items-center border border-gray-300 rounded-none bg-white">
          <Search className="h-4 w-4 text-gray-400 ml-3" />
          
          {/* Tags Display */}
          <div className="flex flex-wrap gap-1 p-2 min-h-[2.5rem] flex-1">
            {tags.map((tag) => (
              <Badge 
                key={tag.id} 
                variant="secondary" 
                className={`${getColorForType(tag.type)} flex items-center gap-1 px-2 py-1 text-xs`}
              >
                {getIconForType(tag.type)}
                {tag.label}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveTag(tag.id)}
                  className="h-auto p-0 ml-1 hover:bg-transparent"
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            ))}
            
            {/* Input Field */}
            <Input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => handleQueryChange(e.target.value)}
              onFocus={() => {
                setInputFocus(true);
                if (query.length > 0) setShowSuggestions(true);
              }}
              onBlur={() => {
                setInputFocus(false);
                // Delay hiding suggestions to allow clicking
                setTimeout(() => setShowSuggestions(false), 200);
              }}
              onKeyDown={handleKeyDown}
              placeholder={tags.length === 0 ? 'Exempel: "CNC-bearbetning", "Lyftutrustning", "Hydraulik"' : ""}
              className="border-0 shadow-none focus:ring-0 focus:outline-none focus-visible:outline-none bg-transparent flex-1 min-w-[200px] p-0"
            />
          </div>
        </div>

        {/* Suggestions Dropdown */}
        {showSuggestions && limitedSuggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 z-50 bg-white border border-gray-200 rounded-none shadow-lg mt-1 max-h-60 overflow-y-auto">
            {limitedSuggestions.map((suggestion) => (
              <button
                key={suggestion.id}
                onClick={() => handleAddTag(suggestion)}
                className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center gap-3 border-b border-gray-100 last:border-b-0"
              >
                <div className={`p-1.5 rounded ${getColorForType(suggestion.type).replace('text-', 'text-').replace('hover:', '')}`}>
                  {getIconForType(suggestion.type)}
                </div>
                <div>
                  <div className="font-medium text-gray-900">{suggestion.label}</div>
                  <div className="text-xs text-gray-500 capitalize">{suggestion.type}</div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Active Filters Summary */}
      {(query || tags.length > 0) && (
        <div className="mt-2 text-xs text-gray-500">
          {tags.length > 0 && (
            <span>
              Filtrerar: {tags.map(tag => tag.label).join(', ')}
              {query && ` + "${query}"`}
            </span>
          )}
          {!tags.length && query && (
            <span>Söker efter: "{query}"</span>
          )}
        </div>
      )}
    </div>
  );
}