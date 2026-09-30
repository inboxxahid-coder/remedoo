import { ArrowUpDown } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface SortOption {
  value: string;
  label: string;
}

interface SortControlProps {
  value: string;
  onChange: (value: string) => void;
  options: SortOption[];
  label?: string;
  className?: string;
}

const SortControl = ({ value, onChange, options, label = "Sort results", className = "" }: SortControlProps) => (
  <Select value={value} onValueChange={onChange}>
    <SelectTrigger
      aria-label={label}
      className={`h-9 w-auto min-h-[36px] gap-1.5 rounded-lg border-border bg-card px-3 text-xs font-medium shrink-0 ${className}`}
    >
      <ArrowUpDown className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
      <SelectValue placeholder="Sort" />
    </SelectTrigger>
    <SelectContent className="z-50 bg-popover">
      {options.map((o) => (
        <SelectItem key={o.value} value={o.value} className="text-xs">
          {o.label}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
);

export default SortControl;
