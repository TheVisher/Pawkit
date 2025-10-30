"use client";

import { ArrowUpDown, Check } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useViewSettingsStore, type ViewType, type SortBy, type SortOrder } from "@/lib/hooks/view-settings-store";

type SortFilterMenuProps = {
  view: ViewType;
};

type SortOption = {
  value: SortBy;
  label: string;
  availableFor: ViewType[];
};

const SORT_OPTIONS: SortOption[] = [
  {
    value: "createdAt",
    label: "Date Added",
    availableFor: ["library", "notes", "timeline", "pawkits", "favorites", "trash", "home", "tags"]
  },
  {
    value: "title",
    label: "Title",
    availableFor: ["library", "notes", "timeline", "pawkits", "favorites", "trash", "tags"]
  },
  {
    value: "url",
    label: "URL",
    availableFor: ["library", "favorites", "trash"]
  },
  {
    value: "updatedAt",
    label: "Last Modified",
    availableFor: ["library", "notes", "timeline", "pawkits", "favorites", "trash", "tags"]
  },
  {
    value: "pawkit",
    label: "Pawkit",
    availableFor: ["library", "favorites", "trash"]
  },
];

const ORDER_OPTIONS: { value: SortOrder; label: string }[] = [
  { value: "desc", label: "Newest First" },
  { value: "asc", label: "Oldest First" },
];

export function SortFilterMenu({ view }: SortFilterMenuProps) {
  const settings = useViewSettingsStore((state) => state.getSettings(view));
  const setSortBy = useViewSettingsStore((state) => state.setSortBy);
  const setSortOrder = useViewSettingsStore((state) => state.setSortOrder);

  // Filter sort options based on current view
  const availableSortOptions = SORT_OPTIONS.filter(option => 
    option.availableFor.includes(view)
  );

  const handleSortChange = async (sortBy: SortBy) => {
    await setSortBy(view, sortBy);
  };

  const handleOrderChange = async (order: SortOrder) => {
    await setSortOrder(view, order);
  };

  // Get label for current sort order based on sortBy
  const getOrderLabel = (order: SortOrder, sortBy: SortBy) => {
    if (sortBy === "title" || sortBy === "url" || sortBy === "pawkit") {
      return order === "asc" ? "A → Z" : "Z → A";
    }
    return order === "desc" ? "Newest First" : "Oldest First";
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" title="Sort & Filter">
          <ArrowUpDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {/* Sort By Options */}
        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
          Sort By
        </div>
        {availableSortOptions.map((option) => (
          <DropdownMenuItem
            key={option.value}
            onClick={() => handleSortChange(option.value)}
            className="cursor-pointer relative pl-8"
          >
            {settings.sortBy === option.value && (
              <Check className="absolute left-2 h-4 w-4" />
            )}
            {option.label}
          </DropdownMenuItem>
        ))}

        <DropdownMenuSeparator />

        {/* Sort Order Options */}
        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
          Order
        </div>
        <DropdownMenuItem
          onClick={() => handleOrderChange("desc")}
          className="cursor-pointer relative pl-8"
        >
          {settings.sortOrder === "desc" && (
            <Check className="absolute left-2 h-4 w-4" />
          )}
          {getOrderLabel("desc", settings.sortBy)}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleOrderChange("asc")}
          className="cursor-pointer relative pl-8"
        >
          {settings.sortOrder === "asc" && (
            <Check className="absolute left-2 h-4 w-4" />
          )}
          {getOrderLabel("asc", settings.sortBy)}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

