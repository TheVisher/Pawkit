"use client";

import { PanelSection, PanelButton } from "./control-panel";
import { Grid, List, Columns, SortAsc, Eye, Maximize2, ArrowUpDown } from "lucide-react";
import { useViewSettingsStore, type SortBy } from "@/lib/hooks/view-settings-store";
import { TodosSection } from "./todos-section";

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
            <span className="text-xs text-muted-foreground">Direction</span>
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
        <div className="space-y-2">
          {/* Pawkit Size Slider */}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Pawkit Size</span>
            <span>{Math.round(cardSizeValue)}%</span>
          </div>
          <input
            type="range"
            min="1"
            max="100"
            value={cardSizeValue}
            onChange={(e) => handleCardSizeChange(Number(e.target.value))}
            className="w-full accent-accent"
          />
        </div>
      </PanelSection>
    </>
  );
}
