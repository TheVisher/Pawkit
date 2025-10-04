"use client";

import { useState, useEffect } from "react";
import { CardModel } from "@/lib/types";
import { LAYOUTS, LayoutMode } from "@/lib/constants";
import { format } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";

type TimelineGroup = {
  date: string;
  cards: CardModel[];
};

type TimelineViewProps = {
  initialGroups: TimelineGroup[];
};

const DATE_RANGES = [
  { label: "7 days", value: 7 },
  { label: "30 days", value: 30 },
  { label: "90 days", value: 90 },
  { label: "6 months", value: 180 },
  { label: "1 year", value: 365 }
] as const;

function layoutClass(layout: LayoutMode): string {
  switch (layout) {
    case "grid":
      return "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4";
    case "masonry":
      return "columns-1 gap-4 sm:columns-2 lg:columns-3 xl:columns-4";
    case "compact":
      return "grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8";
    case "list":
      return "flex flex-col gap-2";
    default:
      return "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4";
  }
}

function CardCell({ card, layout }: { card: CardModel; layout: LayoutMode }) {
  const isCompact = layout === "compact";
  const isList = layout === "list";
  const isMasonry = layout === "masonry";

  if (isList) {
    return (
      <div className="card-hover flex items-center gap-3 rounded-2xl border border-subtle bg-surface p-3">
        {card.image && (
          <img src={card.image} alt="" className="h-12 w-12 rounded-lg object-cover" />
        )}
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-foreground truncate">{card.title}</div>
          <div className="text-xs text-muted-foreground truncate">{card.domain}</div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`card-hover group cursor-pointer break-inside-avoid-column rounded-2xl border border-subtle bg-surface p-4 transition-all ${
        isMasonry ? "mb-4" : ""
      }`}
    >
      {card.image && (
        <div className={`relative mb-3 w-full overflow-hidden rounded-xl bg-surface-soft ${
          isMasonry ? "" : isCompact ? "aspect-square" : "aspect-video"
        }`}>
          <img
            src={card.image}
            alt={card.title ?? card.url}
            className={isMasonry ? "block w-full h-auto" : "block h-full w-full object-cover"}
            loading="lazy"
          />
        </div>
      )}
      <div className="space-y-1">
        <div className={`font-semibold text-foreground ${isCompact ? "text-xs line-clamp-2" : "text-sm"}`}>
          {card.title || card.domain || card.url}
        </div>
        {!isCompact && (
          <div className="text-xs text-muted-foreground">{card.domain ?? card.url}</div>
        )}
        {card.collections.length > 0 && !isCompact && (
          <div className="flex flex-wrap gap-1 text-[10px] text-muted-foreground">
            {card.collections.map((collection) => (
              <span key={collection} className="rounded bg-surface-soft px-2 py-0.5">
                {collection}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function DateRangeDropdown({ selectedRange, onRangeChange }: { selectedRange: number; onRangeChange: (days: number) => void }) {
  const selectedLabel = DATE_RANGES.find(({ value }) => value === selectedRange)?.label || "30 days";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2 rounded-lg bg-surface-soft px-3 py-2 text-sm text-foreground hover:bg-surface transition-colors">
        <span>{selectedLabel}</span>
        <ChevronDown className="h-4 w-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {DATE_RANGES.map(({ label, value }) => (
          <DropdownMenuItem
            key={value}
            onClick={() => onRangeChange(value)}
            className="cursor-pointer"
          >
            {label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function LayoutDropdown({ layout, onLayoutChange }: { layout: LayoutMode; onLayoutChange: (layout: LayoutMode) => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2 rounded-lg bg-surface-soft px-3 py-2 text-sm text-foreground hover:bg-surface transition-colors">
        <span className="capitalize">{layout}</span>
        <ChevronDown className="h-4 w-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {LAYOUTS.map((layoutOption) => (
          <DropdownMenuItem
            key={layoutOption}
            onClick={() => onLayoutChange(layoutOption)}
            className="capitalize cursor-pointer"
          >
            {layoutOption}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function TimelineView({ initialGroups }: TimelineViewProps) {
  const [groups, setGroups] = useState<TimelineGroup[]>(initialGroups);
  const [layout, setLayout] = useState<LayoutMode>("grid");
  const [selectedRange, setSelectedRange] = useState(30);
  const [loading, setLoading] = useState(false);

  // Load preferences from localStorage on mount
  useEffect(() => {
    const savedLayout = localStorage.getItem("timeline-layout") as LayoutMode;
    const savedRange = localStorage.getItem("timeline-range");

    if (savedLayout && LAYOUTS.includes(savedLayout)) {
      setLayout(savedLayout);
    }

    if (savedRange) {
      const range = parseInt(savedRange, 10);
      if ([7, 30, 90, 180, 365].includes(range)) {
        setSelectedRange(range);
        // Load data for saved range if different from default
        if (range !== 30) {
          handleRangeChange(range);
        }
      }
    }
  }, []);

  // Save layout preference when it changes
  const handleLayoutChange = (newLayout: LayoutMode) => {
    setLayout(newLayout);
    localStorage.setItem("timeline-layout", newLayout);
  };

  const handleRangeChange = async (days: number) => {
    setSelectedRange(days);
    localStorage.setItem("timeline-range", days.toString());

    // Show "Kit is digging" warning for long ranges
    if (days >= 180) {
      setLoading(true);
    }

    try {
      const response = await fetch(`/api/timeline?days=${days}`);
      if (response.ok) {
        const data = await response.json();
        setGroups(data.groups);
      }
    } catch (error) {
      console.error("Failed to load timeline:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDateHeader = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    return format(date, "MMMM do, yyyy");
  };

  const totalCards = groups.reduce((sum, group) => sum + group.cards.length, 0);

  return (
    <div className="space-y-6">
      {/* Header with controls */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-100">Timeline</h1>
        <div className="flex items-center gap-3">
          {/* Date Range Dropdown */}
          <DateRangeDropdown selectedRange={selectedRange} onRangeChange={handleRangeChange} />

          {/* Layout Dropdown */}
          <LayoutDropdown layout={layout} onLayoutChange={handleLayoutChange} />
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="rounded-lg border border-gray-800 bg-gray-900/40 p-8 text-center">
          <div className="text-lg font-medium text-gray-300 mb-2">Kit is digging this up...</div>
          <div className="text-sm text-gray-500">This may take a moment for longer time ranges</div>
        </div>
      )}

      {/* Timeline groups */}
      {!loading && groups.length === 0 && (
        <div className="rounded-lg border border-gray-800 bg-gray-900/40 p-8 text-center">
          <div className="text-lg font-medium text-gray-300 mb-2">No cards found</div>
          <div className="text-sm text-gray-500">Try a different time range or add some cards!</div>
        </div>
      )}

      {!loading && groups.map((group) => (
        <div key={group.date} className="space-y-4">
          {/* Date Header */}
          <div className="flex items-center gap-3">
            <h2 className="text-3xl font-medium text-gray-300">
              {formatDateHeader(group.date)}
            </h2>
            <button className="rounded bg-gray-800 px-2 py-1 text-xs text-gray-400 hover:bg-gray-700">
              Summary
            </button>
          </div>

          {/* Cards for this date */}
          <div className={layoutClass(layout)}>
            {group.cards.map((card) => (
              <CardCell key={card.id} card={card} layout={layout} />
            ))}
          </div>
        </div>
      ))}

      {/* Footer stats */}
      {!loading && groups.length > 0 && (
        <div className="text-center text-sm text-gray-500">
          Showing {totalCards} card{totalCards !== 1 ? 's' : ''} across {groups.length} day{groups.length !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
}
