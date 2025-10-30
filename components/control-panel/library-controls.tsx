"use client";

import { PanelSection, PanelButton, PanelToggle } from "./control-panel";
import { Grid, List, LayoutGrid, Columns, Tag, SortAsc, Eye, Maximize2, File, ArrowUpDown } from "lucide-react";
import { useViewSettingsStore, type SortBy, type ContentType } from "@/lib/hooks/view-settings-store";
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
  const setCardSpacing = useViewSettingsStore((state) => state.setCardSpacing);
  const setCardPadding = useViewSettingsStore((state) => state.setCardPadding);
  const setShowLabels = useViewSettingsStore((state) => state.setShowLabels);
  const setShowMetadata = useViewSettingsStore((state) => state.setShowMetadata);
  const setShowPreview = useViewSettingsStore((state) => state.setShowPreview);
  const setContentTypeFilter = useViewSettingsStore((state) => state.setContentTypeFilter);
  const setSortBy = useViewSettingsStore((state) => state.setSortBy);
  const setSortOrder = useViewSettingsStore((state) => state.setSortOrder);
  const setViewSpecific = useViewSettingsStore((state) => state.setViewSpecific);

  // Get global settings
  const showThumbnails = useSettingsStore((state) => state.showThumbnails);
  const setShowThumbnails = useSettingsStore((state) => state.setShowThumbnails);

  // Extract current values
  const layout = viewSettings.layout;
  const cardSizeValue = viewSettings.cardSize;
  const cardSpacingValue = viewSettings.cardSpacing;
  const cardPaddingValue = viewSettings.cardPadding;
  const showLabelsValue = viewSettings.showLabels;
  const showMetadataValue = viewSettings.showMetadata;
  const showPreviewValue = viewSettings.showPreview;
  const contentTypeFilter = viewSettings.contentTypeFilter;
  const sortBy = mapSortByToControl(viewSettings.sortBy);
  const sortOrder = viewSettings.sortOrder;
  const selectedTags = (viewSettings.viewSpecific?.selectedTags as string[]) || [];

  // Extract all unique tags from cards (includes both user tags AND pawkit collections)
  // Exclude cards in private pawkits (cards with 'the-den' or other private collections)
  const allTags = useMemo(() => {
    const tagMap = new Map<string, number>();

    cards.forEach((card) => {
      // Skip cards in private collections
      const isInPrivateCollection = card.collections?.some(slug =>
        slug === 'the-den'
      );
      if (isInPrivateCollection) return;

      // Add user-defined tags
      if (card.tags && card.tags.length > 0) {
        card.tags.forEach((tag) => {
          tagMap.set(tag, (tagMap.get(tag) || 0) + 1);
        });
      }

      // Add pawkit collections as tags (these are also filterable)
      if (card.collections && card.collections.length > 0) {
        card.collections.forEach((collection) => {
          // Skip private collections (like 'the-den')
          if (collection !== 'the-den') {
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

  const handleCardSpacingChange = (spacing: number) => {
    setCardSpacing("library", spacing);
  };

  const handleCardPaddingChange = (padding: number) => {
    setCardPadding("library", padding);
  };

  const handleShowThumbnailsChange = (show: boolean) => {
    setShowThumbnails(show);
  };

  const handleShowLabelsChange = (show: boolean) => {
    setShowLabels("library", show);
  };

  const handleShowMetadataChange = (show: boolean) => {
    setShowMetadata("library", show);
  };

  const handleShowPreviewChange = (show: boolean) => {
    setShowPreview("library", show);
  };

  const handleContentTypeToggle = (type: ContentType) => {
    const currentTypes = contentTypeFilter;
    const newTypes = currentTypes.includes(type)
      ? currentTypes.filter((t) => t !== type)
      : [...currentTypes, type];
    setContentTypeFilter("library", newTypes);
  };

  const handleClearContentTypes = () => {
    setContentTypeFilter("library", []);
  };

  const handleToggleSortOrder = () => {
    setSortOrder("library", sortOrder === "asc" ? "desc" : "asc");
  };

  return (
    <>
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

      {/* Content Type Filter Section */}
      <PanelSection id="library-content-type" title="Content Type" icon={<File className="h-4 w-4 text-accent" />}>
        <button
          onClick={handleClearContentTypes}
          disabled={contentTypeFilter.length === 0}
          className="text-xs text-accent hover:text-accent/80 transition-colors mb-1 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:text-accent"
        >
          Clear all filters
        </button>
        <div className="space-y-1">
          <PanelToggle
            label="Bookmark"
            checked={contentTypeFilter.includes("url")}
            onChange={() => handleContentTypeToggle("url")}
          />
          <PanelToggle
            label="Note"
            checked={contentTypeFilter.includes("md-note")}
            onChange={() => handleContentTypeToggle("md-note")}
          />
          <PanelToggle
            label="Image"
            checked={contentTypeFilter.includes("image")}
            onChange={() => handleContentTypeToggle("image")}
          />
          <PanelToggle
            label="Document"
            checked={contentTypeFilter.includes("document")}
            onChange={() => handleContentTypeToggle("document")}
          />
          <PanelToggle
            label="Audio"
            checked={contentTypeFilter.includes("audio")}
            onChange={() => handleContentTypeToggle("audio")}
          />
          <PanelToggle
            label="Video"
            checked={contentTypeFilter.includes("video")}
            onChange={() => handleContentTypeToggle("video")}
          />
          <PanelToggle
            label="Email"
            checked={contentTypeFilter.includes("email")}
            onChange={() => handleContentTypeToggle("email")}
          />
          <PanelToggle
            label="Highlight"
            checked={contentTypeFilter.includes("highlight")}
            onChange={() => handleContentTypeToggle("highlight")}
          />
          <PanelToggle
            label="Folder"
            checked={contentTypeFilter.includes("folder")}
            onChange={() => handleContentTypeToggle("folder")}
          />
          <PanelToggle
            label="Other"
            checked={contentTypeFilter.includes("other")}
            onChange={() => handleContentTypeToggle("other")}
          />
        </div>
      </PanelSection>

      {/* Sort Section */}
      <PanelSection id="library-sort" title="Sort" icon={<SortAsc className="h-4 w-4 text-accent" />}>
        {/* Sort Direction Toggle */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-muted-foreground">Direction</span>
          <button
            onClick={handleToggleSortOrder}
            className="flex items-center gap-1.5 px-2 py-1 rounded text-xs text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
          >
            <ArrowUpDown size={12} />
            <span>{sortOrder === "asc" ? "Ascending" : "Descending"}</span>
          </button>
        </div>

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

      {/* Display Options Section */}
      <PanelSection id="library-display" title="Display" icon={<Maximize2 className="h-4 w-4 text-accent" />}>
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
          label="Show Preview"
          checked={showPreviewValue}
          onChange={handleShowPreviewChange}
        />
      </PanelSection>
    </>
  );
}
