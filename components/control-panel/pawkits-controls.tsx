"use client";

import { useState } from "react";
import { PanelSection, PanelButton } from "./control-panel";
import { Grid, List, Columns, SortAsc, Eye, Maximize2, ArrowUpDown, Grid3X3, Grid2X2, LayoutGrid, Square } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useViewSettingsStore, type SortBy } from "@/lib/hooks/view-settings-store";
import { TodosSection } from "./todos-section";

// Card Size Selector - segmented control with sliding indicator
const cardSizeOptions = [
  { value: 20, label: 'S', icon: Grid3X3 },
  { value: 45, label: 'M', icon: Grid2X2 },
  { value: 70, label: 'L', icon: LayoutGrid },
  { value: 100, label: 'XL', icon: Square },
];

type CardSizeSelectorProps = {
  value: number;
  onChange: (value: number) => void;
};

function CardSizeSelector({ value, onChange }: CardSizeSelectorProps) {
  // Find the closest size option
  const getClosestIndex = (val: number) => {
    let closestIdx = 0;
    let minDiff = Math.abs(cardSizeOptions[0].value - val);
    cardSizeOptions.forEach((opt, idx) => {
      const diff = Math.abs(opt.value - val);
      if (diff < minDiff) {
        minDiff = diff;
        closestIdx = idx;
      }
    });
    return closestIdx;
  };

  const selectedIndex = getClosestIndex(value);
  const numOptions = cardSizeOptions.length;

  return (
    <div
      className="relative rounded-full"
      style={{
        background: 'var(--bg-surface-1)',
        boxShadow: 'var(--slider-inset)',
        border: 'var(--inset-border)',
        borderBottomColor: 'var(--slider-inset-border-bottom)',
        padding: '4px',
      }}
    >
      {/* Sliding indicator */}
      <div
        className="absolute rounded-full transition-all duration-300 ease-out pointer-events-none"
        style={{
          width: `calc((100% - 8px) / ${numOptions})`,
          height: 'calc(100% - 8px)',
          top: '4px',
          left: `calc(4px + (${selectedIndex} * ((100% - 8px) / ${numOptions})))`,
          background: 'linear-gradient(to bottom, var(--bg-surface-3) 0%, var(--bg-surface-2) 100%)',
          boxShadow: 'var(--raised-shadow-sm)',
          border: '1px solid transparent',
          borderTopColor: 'var(--raised-border-top)',
        }}
      />
      {/* Buttons */}
      <div className="relative flex">
        {cardSizeOptions.map((option, index) => {
          const Icon = option.icon;
          const isSelected = index === selectedIndex;
          return (
            <Tooltip key={option.value}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => onChange(option.value)}
                  className="flex-1 flex items-center justify-center py-2 rounded-full transition-colors duration-200 z-10"
                  style={{
                    color: isSelected ? 'var(--text-primary)' : 'var(--text-muted)',
                  }}
                >
                  <Icon size={14} />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="z-[200]">{option.label}</TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </div>
  );
}

// Map view settings sortBy to control panel sort options
const mapSortByToControl = (sortBy: SortBy): "date" | "modified" | "title" => {
  switch (sortBy) {
    case "createdAt":
      return "date";
    case "updatedAt":
      return "modified";
    case "title":
      return "title";
    default:
      return "modified";
  }
};

const mapControlToSortBy = (sort: "date" | "modified" | "title"): SortBy => {
  switch (sort) {
    case "date":
      return "createdAt";
    case "modified":
      return "updatedAt";
    case "title":
      return "title";
  }
};

export function PawkitsControls() {
  // Get view settings from store - using "pawkits" key
  const viewSettings = useViewSettingsStore((state) => state.getSettings("pawkits"));
  const setLayout = useViewSettingsStore((state) => state.setLayout);
  const setCardSize = useViewSettingsStore((state) => state.setCardSize);
  const setSortBy = useViewSettingsStore((state) => state.setSortBy);
  const setSortOrder = useViewSettingsStore((state) => state.setSortOrder);

  // Extract current values
  const layout = viewSettings.layout;
  const cardSizeValue = viewSettings.cardSize || 50;
  const sortBy = mapSortByToControl(viewSettings.sortBy);
  const sortOrder = viewSettings.sortOrder;

  const handleLayoutChange = (newLayout: typeof layout) => {
    setLayout("pawkits", newLayout);
  };

  const handleSortChange = (newSort: typeof sortBy) => {
    setSortBy("pawkits", mapControlToSortBy(newSort));
  };

  const handleCardSizeChange = (size: number) => {
    setCardSize("pawkits", size);
  };

  const handleToggleSortOrder = () => {
    setSortOrder("pawkits", sortOrder === "asc" ? "desc" : "asc");
  };

  return (
    <>
      {/* Todos Section - Always at top */}
      <TodosSection />

      {/* Sort Section */}
      <PanelSection id="pawkits-sort" title="Sort" icon={<SortAsc className="h-4 w-4 text-accent" />}>
        <div>
          {/* Sort Direction Toggle */}
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-accent">Direction</span>
            <button
              onClick={handleToggleSortOrder}
              className="flex items-center gap-1 text-xs text-accent hover:text-accent/80 transition-colors"
            >
              <ArrowUpDown size={12} />
              {sortOrder === "asc" ? "Ascending" : "Descending"}
            </button>
          </div>
          {/* Sort Options */}
          <div className="flex flex-col gap-2">
            <PanelButton
              active={sortBy === "title"}
              onClick={() => handleSortChange("title")}
            >
              Name
            </PanelButton>
            <PanelButton
              active={sortBy === "date"}
              onClick={() => handleSortChange("date")}
            >
              Date Created
            </PanelButton>
            <PanelButton
              active={sortBy === "modified"}
              onClick={() => handleSortChange("modified")}
            >
              Date Modified
            </PanelButton>
          </div>
        </div>
      </PanelSection>

      {/* View Section */}
      <PanelSection id="pawkits-view" title="View" icon={<Eye className="h-4 w-4 text-accent" />}>
        <div className="flex flex-col gap-2">
          <PanelButton
            active={layout === "grid"}
            onClick={() => handleLayoutChange("grid")}
            icon={<Grid size={16} />}
          >
            Grid
          </PanelButton>
          <PanelButton
            active={layout === "list"}
            onClick={() => handleLayoutChange("list")}
            icon={<List size={16} />}
          >
            List
          </PanelButton>
          <PanelButton
            active={layout === "compact"}
            onClick={() => handleLayoutChange("compact")}
            icon={<Columns size={16} />}
          >
            Compact
          </PanelButton>
        </div>
      </PanelSection>

      {/* Display Options Section */}
      <PanelSection id="pawkits-display" title="Display" icon={<Maximize2 className="h-4 w-4 text-accent" />}>
        {/* Pawkit Size Selector - segmented pill control */}
        <CardSizeSelector value={cardSizeValue} onChange={handleCardSizeChange} />
      </PanelSection>
    </>
  );
}
