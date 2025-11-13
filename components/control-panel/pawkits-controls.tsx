"use client";

import { PanelSection, PanelButton, PanelToggle } from "./control-panel";
import { Grid, List, LayoutGrid, Columns, Tag, SortAsc, Eye, Maximize2, File, ArrowUpDown } from "lucide-react";
import { useViewSettingsStore, type SortBy, type ContentType } from "@/lib/hooks/view-settings-store";
import { useSettingsStore } from "@/lib/hooks/settings-store";
import { useDataStore } from "@/lib/stores/data-store";
import { useRouter, usePathname } from "next/navigation";
import { useMemo } from "react";
import { TodosSection } from "./todos-section";

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

export function PawkitsControls() {
  const router = useRouter();
  const pathname = usePathname();
  const { cards } = useDataStore();

  // Detect if we're on pawkits overview (/pawkits) vs inside a pawkit (/pawkits/[slug])
  const isOverview = pathname === "/pawkits";
  const isInsidePawkit = pathname?.startsWith("/pawkits/") && pathname !== "/pawkits";

  // Get view settings from store - using "pawkits" key
  const viewSettings = useViewSettingsStore((state) => state.getSettings("pawkits"));
  const setLayout = useViewSettingsStore((state) => state.setLayout);
  const setCardSize = useViewSettingsStore((state) => state.setCardSize);
  const setCardSpacing = useViewSettingsStore((state) => state.setCardSpacing);
  const setCardPadding = useViewSettingsStore((state) => state.setCardPadding);
  const setShowLabels = useViewSettingsStore((state) => state.setShowLabels);
  const setShowMetadata = useViewSettingsStore((state) => state.setShowMetadata);
  const setShowTags = useViewSettingsStore((state) => state.setShowTags);
  const setContentTypeFilter = useViewSettingsStore((state) => state.setContentTypeFilter);
  const setSortBy = useViewSettingsStore((state) => state.setSortBy);
  const setSortOrder = useViewSettingsStore((state) => state.setSortOrder);
  const setViewSpecific = useViewSettingsStore((state) => state.setViewSpecific);

  // Get global settings
  const showThumbnails = useSettingsStore((state) => state.showThumbnails);
  const setShowThumbnails = useSettingsStore((state) => state.setShowThumbnails);

  // Extract current values
  const layout = viewSettings.layout;
  const cardSizeValue = viewSettings.cardSize || 50;
  const cardSpacingValue = viewSettings.cardSpacing || 16;
  const cardPaddingValue = viewSettings.cardPadding || 50;
  const showLabelsValue = viewSettings.showLabels;
  const showMetadataValue = viewSettings.showMetadata;
  const showTagsValue = viewSettings.showTags;
  const contentTypeFilter = viewSettings.contentTypeFilter;
  const sortBy = mapSortByToControl(viewSettings.sortBy);
  const sortOrder = viewSettings.sortOrder;
  const selectedTags = (viewSettings.viewSpecific?.selectedTags as string[]) || [];

  // Extract all unique tags from cards (includes both user tags AND pawkit collections)
  const allTags = useMemo(() => {
    const tagMap = new Map<string, number>();

    cards.forEach((card) => {
      // Add user-defined tags
      if (card.tags && card.tags.length > 0) {
        card.tags.forEach((tag) => {
          tagMap.set(tag, (tagMap.get(tag) || 0) + 1);
        });
      }

      // Add pawkit collections as tags (these are also filterable)
      if (card.collections && card.collections.length > 0) {
        card.collections.forEach((collection) => {
          // Skip 'den-' prefixed collections
          if (!collection.startsWith('den-')) {
            tagMap.set(collection, (tagMap.get(collection) || 0) + 1);
          }
        });
      }
    });

    return Array.from(tagMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [cards]);

  const handleTagToggle = (tagName: string) => {
    if (isOverview) return; // Disabled on overview
    const newTags = selectedTags.includes(tagName)
      ? selectedTags.filter(t => t !== tagName)
      : [...selectedTags, tagName];

    setViewSpecific("pawkits", {
      ...viewSettings.viewSpecific,
      selectedTags: newTags,
    });
  };

  const handleClearTags = () => {
    if (isOverview) return; // Disabled on overview
    setViewSpecific("pawkits", {
      ...viewSettings.viewSpecific,
      selectedTags: [],
    });
  };

  const handleLayoutChange = (newLayout: typeof layout) => {
    if (isOverview) return; // Disabled on overview
    setLayout("pawkits", newLayout);
  };

  const handleSortChange = (newSort: typeof sortBy) => {
    if (isOverview) return; // Disabled on overview
    setSortBy("pawkits", mapControlToSortBy(newSort));
  };

  const handleCardSizeChange = (size: number) => {
    setCardSize("pawkits", size);
  };

  const handleCardSpacingChange = (spacing: number) => {
    if (isOverview) return; // Disabled on overview
    setCardSpacing("pawkits", spacing);
  };

  const handleCardPaddingChange = (padding: number) => {
    if (isOverview) return; // Disabled on overview
    setCardPadding("pawkits", padding);
  };

  const handleShowThumbnailsChange = (show: boolean) => {
    if (isOverview) return; // Disabled on overview
    setShowThumbnails(show);
  };

  const handleShowLabelsChange = (show: boolean) => {
    if (isOverview) return; // Disabled on overview
    setShowLabels("pawkits", show);
  };

  const handleShowMetadataChange = (show: boolean) => {
    if (isOverview) return; // Disabled on overview
    setShowMetadata("pawkits", show);
  };

  const handleShowTagsChange = (show: boolean) => {
    if (isOverview) return; // Disabled on overview
    setShowTags("pawkits", show);
  };

  const handleToggleSortOrder = () => {
    if (isOverview) return; // Disabled on overview
    setSortOrder("pawkits", sortOrder === "asc" ? "desc" : "asc");
  };

  const handleContentTypeChange = (filterType: "all" | "bookmarks" | "notes") => {
    if (isOverview) return; // Disabled on overview

    let newFilter: ContentType[] = [];
    if (filterType === "bookmarks") {
      newFilter = ["url", "bookmark"];
    } else if (filterType === "notes") {
      newFilter = ["md-note", "text-note"];
    }
    // "all" = empty array (show all types)

    setContentTypeFilter("pawkits", newFilter);
  };

  return (
    <>
      {/* Todos Section - Always at top */}
      <TodosSection />

      {/* Tags Section - Only show if there are tags */}
      {allTags.length > 0 && (
        <PanelSection
          id="pawkits-tags"
          title="Tags"
          icon={<Tag className="h-4 w-4 text-accent" />}
        >
          <div className={`space-y-2 ${isOverview ? "opacity-50 pointer-events-none" : ""}`}>
            <div className="flex flex-wrap gap-2">
              {allTags.map(({ name, count }) => (
                <button
                  key={name}
                  onClick={() => handleTagToggle(name)}
                  className={`rounded-full px-3 py-1 text-xs transition-colors ${
                    selectedTags.includes(name)
                      ? "bg-accent text-accent-foreground"
                      : "bg-surface-soft text-muted-foreground hover:bg-surface-soft/80"
                  }`}
                >
                  {name} ({count})
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

      {/* Content Type Filter Section */}
      <PanelSection
        id="pawkits-content"
        title="Content Type"
        icon={<File className="h-4 w-4 text-accent" />}
      >
          <div className={`flex flex-col gap-2 ${isOverview ? "opacity-50 pointer-events-none" : ""}`}>
            <PanelButton
              active={contentTypeFilter.length === 0}
              onClick={() => handleContentTypeChange("all")}
            >
              All
            </PanelButton>
            <PanelButton
              active={contentTypeFilter.includes("url") || contentTypeFilter.includes("bookmark")}
              onClick={() => handleContentTypeChange("bookmarks")}
            >
              Bookmarks Only
            </PanelButton>
            <PanelButton
              active={contentTypeFilter.includes("md-note") || contentTypeFilter.includes("text-note")}
              onClick={() => handleContentTypeChange("notes")}
            >
              Notes Only
            </PanelButton>
          </div>
      </PanelSection>

      {/* Sort Section */}
      <PanelSection id="pawkits-sort" title="Sort" icon={<SortAsc className="h-4 w-4 text-accent" />}>
          <div className={isOverview ? "opacity-50 pointer-events-none" : ""}>
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
                active={sortBy === "modified"}
                onClick={() => handleSortChange("modified")}
              >
                Date Modified
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
                Title
              </PanelButton>
              <PanelButton
                active={sortBy === "domain"}
                onClick={() => handleSortChange("domain")}
              >
                Domain
              </PanelButton>
            </div>
          </div>
      </PanelSection>

      {/* View Section */}
      <PanelSection id="pawkits-view" title="View" icon={<Eye className="h-4 w-4 text-accent" />}>
          <div className={`flex flex-col gap-2 ${isOverview ? "opacity-50 pointer-events-none" : ""}`}>
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
          </div>
      </PanelSection>

      {/* Display Options Section */}
      <PanelSection id="pawkits-display" title="Display" icon={<Maximize2 className="h-4 w-4 text-accent" />}>
          <div className="space-y-4">
            {/* Pawkit/Card Size Slider */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{isOverview ? "Pawkit Size" : "Card Size"}</span>
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

            {/* Card Spacing Slider - Disabled on overview */}
            <div className={`space-y-2 ${isOverview ? "opacity-50 pointer-events-none" : ""}`}>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Card Spacing</span>
                <span>{cardSpacingValue}px</span>
              </div>
              <input
                type="range"
                min="0"
                max="32"
                value={cardSpacingValue}
                onChange={(e) => handleCardSpacingChange(Number(e.target.value))}
                className="w-full accent-accent"
              />
            </div>

            {/* Card Padding Slider - Disabled on overview */}
            <div className={`space-y-2 ${isOverview ? "opacity-50 pointer-events-none" : ""}`}>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Card Padding</span>
                <span>{Math.round(cardPaddingValue)}%</span>
              </div>
              <input
                type="range"
                min="1"
                max="100"
                value={cardPaddingValue}
                onChange={(e) => handleCardPaddingChange(Number(e.target.value))}
                className="w-full accent-accent"
              />
            </div>

            {/* Toggles - Disabled on overview */}
            <div className={isOverview ? "opacity-50 pointer-events-none" : ""}>
              <PanelToggle
                label="Show Thumbnails"
                checked={showThumbnails}
                onChange={handleShowThumbnailsChange}
              />
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
                label="Show Tags"
                checked={showTagsValue}
                onChange={handleShowTagsChange}
              />
            </div>
          </div>
      </PanelSection>
    </>
  );
}
