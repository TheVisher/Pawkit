"use client";

import { useState } from "react";
import { CardModel } from "@/lib/types";
import { LAYOUTS, LayoutMode } from "@/lib/constants";
import { format } from "date-fns";

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

  if (isList) {
    return (
      <div className="flex items-center gap-3 rounded border border-gray-800 bg-gray-900/40 p-3 hover:border-gray-700">
        {card.image && (
          <img src={card.image} alt="" className="h-12 w-12 rounded object-cover" />
        )}
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-gray-200 truncate">{card.title}</div>
          <div className="text-xs text-gray-500 truncate">{card.domain}</div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`group relative overflow-hidden rounded-lg border border-gray-800 bg-gray-900/40 transition-colors hover:border-gray-700 ${
        layout === "masonry" ? "mb-4 break-inside-avoid" : ""
      }`}
    >
      {card.image && (
        <div className={isCompact ? "aspect-square" : "aspect-video"}>
          <img
            src={card.image}
            alt=""
            className="h-full w-full object-cover"
          />
        </div>
      )}
      <div className={isCompact ? "p-2" : "p-3"}>
        <div className={`font-medium text-gray-200 ${isCompact ? "text-xs line-clamp-2" : "text-sm line-clamp-1"}`}>
          {card.title}
        </div>
        {!isCompact && (
          <div className="mt-1 text-xs text-gray-500 truncate">{card.domain}</div>
        )}
      </div>
    </div>
  );
}

export function TimelineView({ initialGroups }: TimelineViewProps) {
  const [groups, setGroups] = useState<TimelineGroup[]>(initialGroups);
  const [layout, setLayout] = useState<LayoutMode>("grid");
  const [selectedRange, setSelectedRange] = useState(30);
  const [loading, setLoading] = useState(false);

  const handleRangeChange = async (days: number) => {
    setSelectedRange(days);

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
      <div className="flex flex-wrap items-center gap-4">
        <h1 className="text-2xl font-semibold text-gray-100">Timeline</h1>
        <div className="ml-auto flex flex-wrap items-center gap-3">
          {/* Date Range Filter */}
          <div className="flex gap-1">
            {DATE_RANGES.map(({ label, value }) => (
              <button
                key={value}
                onClick={() => handleRangeChange(value)}
                className={`rounded px-3 py-1 text-sm ${
                  selectedRange === value
                    ? "bg-accent text-gray-900 font-medium"
                    : "bg-gray-900 text-gray-300 hover:bg-gray-800"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Layout Switcher */}
          <div className="flex gap-1">
            {LAYOUTS.map((mode) => (
              <button
                key={mode}
                onClick={() => setLayout(mode)}
                className={`rounded px-3 py-1 text-sm ${
                  layout === mode
                    ? "bg-accent text-gray-900"
                    : "bg-gray-900 text-gray-300"
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
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
            <h2 className="text-xl font-medium text-gray-300">
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
