import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowUpDown } from "lucide-react";

interface SortOptionsProps {
  value: string;
  onChange: (value: string) => void;
}

export default function SortOptions({ value, onChange }: SortOptionsProps) {
  const sortOptions = [
    { value: 'name-asc', label: 'Alfabetisk (A-Ö)' },
    { value: 'name-desc', label: 'Alfabetisk (Ö-A)' },
    { value: 'relevance', label: 'Relevans' },
    { value: 'newest', label: 'Nyast först' },
  ];

  return (
    <div className="flex items-center gap-2">
      <ArrowUpDown className="h-4 w-4 text-gray-500" />
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-48">
          <SelectValue placeholder="Sortera efter..." />
        </SelectTrigger>
        <SelectContent>
          {sortOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}