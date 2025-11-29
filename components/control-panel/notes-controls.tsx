"use client";

import { PanelSection, PanelButton, PanelToggle } from "./control-panel";
import { Grid, List, Tag, SortAsc, Eye, Maximize2, ArrowUpDown } from "lucide-react";
import { useViewSettingsStore, type SortBy } from "@/lib/hooks/view-settings-store";
import { useDataStore } from "@/lib/stores/data-store";
import { usePanelStore } from "@/lib/hooks/use-panel-store";
import { useRouter, usePathname } from "next/navigation";
import { useMemo } from "react";
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

export function NotesControls() {
  const router = useRouter();
  const pathname = usePathname();
  const { cards } = useDataStore();

  // Get collapsed sections for managing section state
  const collapsedSections = usePanelStore((state) => state.collapsedSections);
  const toggleSection = usePanelStore((state) => state.toggleSection);

  // Get view settings from store - using "notes" key
  const viewSettings = useViewSettingsStore((state) => state.getSettings("notes"));
  const setLayout = useViewSettingsStore((state) => state.setLayout);
  const setCardSize = useViewSettingsStore((state) => state.setCardSize);
  const setCardSpacing = useViewSettingsStore((state) => state.setCardSpacing);
  const setCardPadding = useViewSettingsStore((state) => state.setCardPadding);
  const setShowLabels = useViewSettingsStore((state) => state.setShowLabels);
  const setShowMetadata = useViewSettingsStore((state) => state.setShowMetadata);
  const setShowPreview = useViewSettingsStore((state) => state.setShowPreview);
  const setSortBy = useViewSettingsStore((state) => state.setSortBy);
  const setSortOrder = useViewSettingsStore((state) => state.setSortOrder);
  const setViewSpecific = useViewSettingsStore((state) => state.setViewSpecific);

  // Extract current values
  // Fallback: If user had "compact" selected, default to "grid" (compact removed from Notes)
  const layout = viewSettings.layout === "compact" ? "grid" : viewSettings.layout;
  const cardSizeValue = viewSettings.cardSize;
  const cardSpacingValue = viewSettings.cardSpacing;
  const cardPaddingValue = viewSettings.cardPadding;
  const showLabelsValue = viewSettings.showLabels;
  const showMetadataValue = viewSettings.showMetadata;
  const showPreviewValue = viewSettings.showPreview;
  const sortBy = mapSortByToControl(viewSettings.sortBy);
  const sortOrder = viewSettings.sortOrder;
  const selectedTags = (viewSettings.viewSpecific?.selectedTags as string[]) || [];

  // Extract all unique tags from NOTES only (md-note or text-note)
  // Exclude cards in private pawkits (inDen: true)
  const allTags = useMemo(() => {
    const tagMap = new Map<string, number>();

    cards.forEach((card) => {
      // Skip cards in private collections
      if (card.collections?.includes('the-den')) return;

      // Only count tags from notes
      if ((card.type === 'md-note' || card.type === 'text-note') && card.tags && card.tags.length > 0) {
        card.tags.forEach((tag) => {
          tagMap.set(tag, (tagMap.get(tag) || 0) + 1);
        });
      }
    });

    return Array.from(tagMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [cards]);

  const handleTagToggle = (tagName: string) => {
    const newTags = selectedTags.includes(tagName)
      ? selectedTags.filter(t => t !== tagName)
      : [...selectedTags, tagName];

    setViewSpecific("notes", {
      ...viewSettings.viewSpecific,
      selectedTags: newTags,
    });
  };

  const handleClearTags = () => {
    setViewSpecific("notes", {
      ...viewSettings.viewSpecific,
      selectedTags: [],
    });
  };

  const handleLayoutChange = (newLayout: typeof layout) => {
    setLayout("notes", newLayout);
  };

  const handleSortChange = (newSort: typeof sortBy) => {
    setSortBy("notes", mapControlToSortBy(newSort));
  };

  const handleCardSizeChange = (size: number) => {
    setCardSize("notes", size);
  };

  const handleCardSpacingChange = (spacing: number) => {
    setCardSpacing("notes", spacing);
  };

  const handleCardPaddingChange = (padding: number) => {
    setCardPadding("notes", padding);
  };

  const handleShowLabelsChange = (show: boolean) => {
    setShowLabels("notes", show);
  };

  const handleShowMetadataChange = (show: boolean) => {
    setShowMetadata("notes", show);
  };

  const handleShowPreviewChange = (show: boolean) => {
    setShowPreview("notes", show);
  };

  const handleToggleSortOrder = () => {
    setSortOrder("notes", sortOrder === "asc" ? "desc" : "asc");
  };

  return (
    <>
      {/* Todos Section - Always at top */}
      <TodosSection />

      {/* Tags Filter Section */}
      {allTags.length > 0 && (
        <PanelSection
          id="notes-tags"
          title="Tags"
          icon={<Tag className={`h-4 w-4 ${pathname === "/tags" ? "text-accent drop-shadow-glow-accent" : "text-accent"}`} />}
          active={pathname === "/tags"}
          onClick={() => {
            router.push("/tags");
            // Ensure section is expanded when clicking header
            if (collapsedSections["notes-tags"]) {
              toggleSection("notes-tags");
            }
          }}
        >
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              {allTags.map((tag) => (
                <button
                  key={tag.name}
                  onClick={() => handleTagToggle(tag.name)}
                  className={`rounded-full backdrop-blur-md px-3 py-1 text-xs font-medium transition-all duration-200 ${
                    selectedTags.includes(tag.name)
                      ? "bg-purple-500/20 border border-purple-500/50 shadow-[0_0_15px_rgba(168,85,247,0.3)] text-purple-200"
                      : "bg-white/5 border border-white/10 hover:border-purple-500/50 hover:shadow-[0_0_20px_rgba(168,85,247,0.4)] text-muted-foreground"
                  }`}
                >
                  #{tag.name} ({tag.count})
                </button>
              ))}
            </div>
            {selectedTags.length > 0 && (
              <button
                onClick={handleClearTags}
                className="text-xs text-accent hover:text-accent/80 transition-colors"
              >
                Clear all
              </button>
            )}
          </div>
        </PanelSection>
      )}

      {/* Sort Section */}
      <PanelSection id="notes-sort" title="Sort" icon={<SortAsc className="h-4 w-4 text-accent" />}>
        {/* Sort Direction Toggle */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-accent">Direction</span>
          <button
            onClick={handleToggleSortOrder}
            className="flex items-center gap-1.5 px-2 py-1 rounded text-xs text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
          >
            <ArrowUpDown size={12} />
            <span>{sortOrder === "asc" ? "Ascending" : "Descending"}</span>
          </button>
        </div>

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
      </PanelSection>

      {/* View Section */}
      <PanelSection id="notes-view" title="View" icon={<Eye className="h-4 w-4 text-accent" />}>
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
      </PanelSection>

      {/* Display Options Section */}
      <PanelSection id="notes-display" title="Display" icon={<Maximize2 className="h-4 w-4 text-accent" />}>
        {/* Card Size Slider - 1-100 scale */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Card Size</span>
            <span>{Math.round(cardSizeValue)}%</span>
          </div>
          <input
            type="range"
            min="1"
            max="100"
            step="1"
            value={cardSizeValue}
            onChange={(e) => handleCardSizeChange(Number(e.target.value))}
            className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer
              [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
              [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-accent
              [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4
              [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-accent [&::-moz-range-thumb]:border-0"
          />
        </div>

        {/* Card Spacing Slider - 1-100 scale */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Card Spacing</span>
            <span>{Math.round(cardSpacingValue)}px</span>
          </div>
          <input
            type="range"
            min="1"
            max="64"
            step="1"
            value={cardSpacingValue}
            onChange={(e) => handleCardSpacingChange(Number(e.target.value))}
            className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer
              [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
              [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-accent
              [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4
              [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-accent [&::-moz-range-thumb]:border-0"
          />
        </div>

        {/* Card Padding Slider - 1-100 scale */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Card Padding</span>
            <span>{Math.round(cardPaddingValue)}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            step="1"
            value={cardPaddingValue}
            onChange={(e) => handleCardPaddingChange(Number(e.target.value))}
            className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer
              [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
              [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-accent
              [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4
              [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-accent [&::-moz-range-thumb]:border-0"
          />
        </div>

        {/* Display Toggles */}
        <PanelToggle
          label="Show Labels"
          checked={showLabelsValue}
          onChange={handleShowLabelsChange}
        />
        <PanelToggle
          label="Show Metadata"
          checked={showMetadataValue}
          onChange={handleShowMetadataChange}
        />
        <PanelToggle
          label="Show Preview"
          checked={showPreviewValue}
          onChange={handleShowPreviewChange}
        />
      </PanelSection>
    </>
  );
}
