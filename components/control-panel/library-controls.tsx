"use client";

import { PanelSection, PanelButton, PanelToggle } from "./control-panel";
import { Grid, List, LayoutGrid, Columns, Tag, SortAsc, Eye, Maximize2 } from "lucide-react";
import { useViewSettingsStore, type SortBy } from "@/lib/hooks/view-settings-store";
import { useSettingsStore } from "@/lib/hooks/settings-store";
import { useDataStore } from "@/lib/stores/data-store";
import { usePanelStore } from "@/lib/hooks/use-panel-store";
import { useRouter, usePathname } from "next/navigation";
import { useMemo } from "react";

// Map view settings sortBy to control panel sort options
const mapSortByToControl = (sortBy: SortBy): "date" | "modified" | "title" | "domain" => {
  switch (sortBy) {
    case "createdAt":
      return "date";
    case "updatedAt":
      return "modified";
    case "title":
      return "title";
    case "url":
      return "domain";
    default:
      return "modified";
  }
};

const mapControlToSortBy = (sort: "date" | "modified" | "title" | "domain"): SortBy => {
  switch (sort) {
    case "date":
      return "createdAt";
    case "modified":
      return "updatedAt";
    case "title":
      return "title";
    case "domain":
      return "url";
  }
};

export function LibraryControls() {
  const router = useRouter();
  const pathname = usePathname();
  const { cards } = useDataStore();

  // Detect if we're in demo mode
  const isDemo = pathname?.startsWith('/demo');
  const pathPrefix = isDemo ? '/demo' : '';

  // Get collapsed sections for managing section state
  const collapsedSections = usePanelStore((state) => state.collapsedSections);
  const toggleSection = usePanelStore((state) => state.toggleSection);

  // Get view settings from store
  const viewSettings = useViewSettingsStore((state) => state.getSettings("library"));
  const setLayout = useViewSettingsStore((state) => state.setLayout);
  const setCardSize = useViewSettingsStore((state) => state.setCardSize);
  const setShowTitles = useViewSettingsStore((state) => state.setShowTitles);
  const setShowUrls = useViewSettingsStore((state) => state.setShowUrls);
  const setSortBy = useViewSettingsStore((state) => state.setSortBy);
  const setViewSpecific = useViewSettingsStore((state) => state.setViewSpecific);

  // Get global settings
  const showThumbnails = useSettingsStore((state) => state.showThumbnails);
  const setShowThumbnails = useSettingsStore((state) => state.setShowThumbnails);

  // Extract current values
  const layout = viewSettings.layout;
  const cardSizeValue = viewSettings.cardSize;
  const showTitlesValue = viewSettings.showTitles;
  const showUrlsValue = viewSettings.showUrls;
  const sortBy = mapSortByToControl(viewSettings.sortBy);
  const selectedTags = (viewSettings.viewSpecific?.selectedTags as string[]) || [];

  // Extract all unique tags from cards
  const allTags = useMemo(() => {
    const tagMap = new Map<string, number>();

    cards.forEach((card) => {
      if (card.tags && card.tags.length > 0) {
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

    setViewSpecific("library", {
      ...viewSettings.viewSpecific,
      selectedTags: newTags,
    });
  };

  const handleClearTags = () => {
    setViewSpecific("library", {
      ...viewSettings.viewSpecific,
      selectedTags: [],
    });
  };

  const handleLayoutChange = (newLayout: typeof layout) => {
    setLayout("library", newLayout);
  };

  const handleSortChange = (newSort: typeof sortBy) => {
    setSortBy("library", mapControlToSortBy(newSort));
  };

  const handleCardSizeChange = (size: number) => {
    setCardSize("library", size);
  };

  const handleShowThumbnailsChange = (show: boolean) => {
    setShowThumbnails(show);
  };

  const handleShowTitlesChange = (show: boolean) => {
    setShowTitles("library", show);
  };

  const handleShowUrlsChange = (show: boolean) => {
    setShowUrls("library", show);
  };

  // Get card padding
  const cardPadding = viewSettings.cardPadding;

  const handleCardPaddingChange = (padding: number) => {
    const paddingValue = Math.round(padding); // Round to nearest integer
    useViewSettingsStore.getState().setCardPadding("library", paddingValue);
  };

  return (
    <>
      {/* View Section */}
      <PanelSection id="library-view" title="View" icon={<Eye className="h-4 w-4 text-accent" />}>
        <PanelButton
          active={layout === "grid"}
          onClick={() => handleLayoutChange("grid")}
          icon={<Grid size={16} />}
        >
          Grid
        </PanelButton>
        <PanelButton
          active={layout === "masonry"}
          onClick={() => handleLayoutChange("masonry")}
          icon={<LayoutGrid size={16} />}
        >
          Masonry
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
      </PanelSection>

      {/* Sort Section */}
      <PanelSection id="library-sort" title="Sort" icon={<SortAsc className="h-4 w-4 text-accent" />}>
        <PanelButton
          active={sortBy === "modified"}
          onClick={() => handleSortChange("modified")}
        >
          Recently Modified
        </PanelButton>
        <PanelButton
          active={sortBy === "date"}
          onClick={() => handleSortChange("date")}
        >
          Date Added
        </PanelButton>
        <PanelButton
          active={sortBy === "title"}
          onClick={() => handleSortChange("title")}
        >
          Title A-Z
        </PanelButton>
        <PanelButton
          active={sortBy === "domain"}
          onClick={() => handleSortChange("domain")}
        >
          Domain
        </PanelButton>
      </PanelSection>

      {/* Tags Filter Section */}
      {allTags.length > 0 && (
        <PanelSection
          id="library-tags"
          title="Tags"
          icon={<Tag className={`h-4 w-4 ${pathname === pathPrefix + "/tags" ? "text-accent drop-shadow-glow-accent" : "text-accent"}`} />}
          active={pathname === pathPrefix + "/tags"}
          onClick={() => {
            router.push(`${pathPrefix}/tags`);
            // Ensure section is expanded when clicking header
            if (collapsedSections["library-tags"]) {
              toggleSection("library-tags");
            }
          }}
        >
          {selectedTags.length > 0 && (
            <button
              onClick={handleClearTags}
              className="text-xs text-accent hover:text-accent/80 transition-colors mb-1"
            >
              Clear all filters
            </button>
          )}
          <div className="space-y-1 max-h-96 overflow-y-auto">
            {allTags.map((tag) => (
              <PanelToggle
                key={tag.name}
                label={`#${tag.name}`}
                checked={selectedTags.includes(tag.name)}
                onChange={() => handleTagToggle(tag.name)}
                icon={
                  <span className="text-xs text-muted-foreground min-w-[24px] text-right">
                    {tag.count}
                  </span>
                }
              />
            ))}
          </div>
        </PanelSection>
      )}

      {/* Display Options Section */}
      <PanelSection id="library-display" title="Display" icon={<Maximize2 className="h-4 w-4 text-accent" />}>
        {/* Card Size Slider */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Card Size</span>
            <span>{cardSizeValue === 1 ? "XS" : cardSizeValue === 2 ? "S" : cardSizeValue === 3 ? "M" : cardSizeValue === 4 ? "L" : "XL"}</span>
          </div>
          <input
            type="range"
            min="1"
            max="5"
            step="0.01"
            value={cardSizeValue}
            onChange={(e) => {
              const value = parseFloat(e.target.value);
              const rounded = Math.round(value);
              handleCardSizeChange(rounded);
            }}
            className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer
              [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
              [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-accent
              [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4
              [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-accent [&::-moz-range-thumb]:border-0"
          />
        </div>

        {/* Card Padding Slider */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Card Padding</span>
            <span>{cardPadding === 0 ? "None" : cardPadding === 1 ? "XS" : cardPadding === 2 ? "S" : cardPadding === 3 ? "M" : "L"}</span>
          </div>
          <input
            type="range"
            min="0"
            max="4"
            step="0.01"
            value={cardPadding}
            onChange={(e) => handleCardPaddingChange(parseFloat(e.target.value))}
            className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer
              [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
              [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-accent
              [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4
              [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-accent [&::-moz-range-thumb]:border-0"
          />
        </div>

        {/* Display Toggles */}
        <PanelToggle
          label="Show Thumbnails"
          checked={showThumbnails}
          onChange={handleShowThumbnailsChange}
        />
        <PanelToggle
          label="Show Titles"
          checked={showTitlesValue}
          onChange={handleShowTitlesChange}
        />
        <PanelToggle
          label="Show URLs"
          checked={showUrlsValue}
          onChange={handleShowUrlsChange}
        />
      </PanelSection>
    </>
  );
}
