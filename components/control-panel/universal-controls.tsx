"use client";

import { PanelSection, PanelButton, PanelToggle } from "./control-panel";
import { Grid, List, LayoutGrid, Columns, Tag, SortAsc, Eye, Maximize2, File, ArrowUpDown } from "lucide-react";
import { useViewSettingsStore, type SortBy, type ContentType, type ViewType } from "@/lib/hooks/view-settings-store";
import { useSettingsStore } from "@/lib/hooks/settings-store";
import { useDataStore } from "@/lib/stores/data-store";
import { usePanelStore } from "@/lib/hooks/use-panel-store";
import { useRouter, usePathname } from "next/navigation";
import { useMemo } from "react";
import { CardSizeSlider } from "../card-size-slider";

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

type UniversalControlsProps = {
  viewType: ViewType;
  showTagsFilter?: boolean;
  showContentTypeFilter?: boolean;
};

export function UniversalControls({ viewType, showTagsFilter = true, showContentTypeFilter = true }: UniversalControlsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { cards } = useDataStore();

  // Detect if we're in demo mode
  const isDemo = pathname?.startsWith('/demo');
  const pathPrefix = isDemo ? '/demo' : '';

  // Get collapsed sections for managing section state
  const collapsedSections = usePanelStore((state) => state.collapsedSections);
  const toggleSection = usePanelStore((state) => state.toggleSection);

  // Get view settings from store for the specific view
  const viewSettings = useViewSettingsStore((state) => state.getSettings(viewType));
  const setLayout = useViewSettingsStore((state) => state.setLayout);
  const setCardSize = useViewSettingsStore((state) => state.setCardSize);
  const setCardSpacing = useViewSettingsStore((state) => state.setCardSpacing);
  const setCardPadding = useViewSettingsStore((state) => state.setCardPadding);
  const setShowLabels = useViewSettingsStore((state) => state.setShowLabels);
  const setShowMetadata = useViewSettingsStore((state) => state.setShowMetadata);
  const setShowPreview = useViewSettingsStore((state) => state.setShowPreview);
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
  const cardSizeValue = viewSettings.cardSize;
  const cardSpacingValue = viewSettings.cardSpacing;
  const cardPaddingValue = viewSettings.cardPadding;
  const showLabelsValue = viewSettings.showLabels;
  const showMetadataValue = viewSettings.showMetadata;
  const showPreviewValue = viewSettings.showPreview;
  const showTagsValue = viewSettings.showTags;
  const contentTypeFilter = viewSettings.contentTypeFilter;
  const sortBy = mapSortByToControl(viewSettings.sortBy);
  const sortOrder = viewSettings.sortOrder;
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

  // Handlers
  const handleLayoutChange = (newLayout: "grid" | "masonry" | "list" | "compact") => {
    setLayout(viewType, newLayout);
  };

  const handleCardSizeChange = (size: number) => {
    setCardSize(viewType, size);
  };

  const handleCardSpacingChange = (spacing: number) => {
    setCardSpacing(viewType, spacing);
  };

  const handleCardPaddingChange = (padding: number) => {
    setCardPadding(viewType, padding);
  };

  const handleShowThumbnailsChange = (show: boolean) => {
    setShowThumbnails(show);
  };

  const handleShowLabelsChange = (show: boolean) => {
    setShowLabels(viewType, show);
  };

  const handleShowMetadataChange = (show: boolean) => {
    setShowMetadata(viewType, show);
  };

  const handleShowPreviewChange = (show: boolean) => {
    setShowPreview(viewType, show);
  };

  const handleShowTagsChange = (show: boolean) => {
    setShowTags(viewType, show);
  };

  const handleSortByChange = (newSortBy: "date" | "modified" | "title" | "domain") => {
    setSortBy(viewType, mapControlToSortBy(newSortBy));
  };

  const handleSortOrderChange = () => {
    setSortOrder(viewType, sortOrder === "asc" ? "desc" : "asc");
  };

  const handleContentTypeToggle = (type: ContentType) => {
    const newFilter = contentTypeFilter.includes(type)
      ? contentTypeFilter.filter((t) => t !== type)
      : [...contentTypeFilter, type];
    setContentTypeFilter(viewType, newFilter);
  };

  const handleTagToggle = (tagName: string) => {
    const newTags = selectedTags.includes(tagName)
      ? selectedTags.filter((t) => t !== tagName)
      : [...selectedTags, tagName];
    setViewSpecific(viewType, { selectedTags: newTags });
  };

  const handleClearTagFilters = () => {
    setViewSpecific(viewType, { selectedTags: [] });
  };

  return (
    <>
      {/* Tags Filter Section */}
      {showTagsFilter && allTags.length > 0 && (
        <PanelSection
          id={`${viewType}-tags`}
          title="Tags"
          icon={<Tag className="h-4 w-4 text-accent" />}
        >
          <div className="space-y-2">
            <div className="flex flex-wrap gap-1.5">
              {allTags.slice(0, 20).map((tag) => {
                const isSelected = selectedTags.includes(tag.name);
                return (
                  <button
                    key={tag.name}
                    onClick={() => handleTagToggle(tag.name)}
                    className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                      isSelected
                        ? "bg-accent text-accent-foreground"
                        : "bg-surface-soft text-muted-foreground hover:bg-surface-elevated hover:text-foreground"
                    }`}
                  >
                    #{tag.name} ({tag.count})
                  </button>
                );
              })}
            </div>
            {selectedTags.length > 0 && (
              <button
                onClick={handleClearTagFilters}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Clear filters
              </button>
            )}
          </div>
        </PanelSection>
      )}

      {/* Content Type Filter Section */}
      {showContentTypeFilter && (
        <PanelSection
          id={`${viewType}-content-type`}
          title="Content Type"
          icon={<File className="h-4 w-4 text-accent" />}
        >
          <div className="space-y-2">
            <PanelToggle
              label="URLs"
              checked={contentTypeFilter.length === 0 || contentTypeFilter.includes("url")}
              onChange={() => handleContentTypeToggle("url")}
            />
            <PanelToggle
              label="Notes"
              checked={contentTypeFilter.length === 0 || contentTypeFilter.includes("note")}
              onChange={() => handleContentTypeToggle("note")}
            />
            <PanelToggle
              label="Images"
              checked={contentTypeFilter.length === 0 || contentTypeFilter.includes("image")}
              onChange={() => handleContentTypeToggle("image")}
            />
          </div>
        </PanelSection>
      )}

      {/* Sort Section */}
      <PanelSection
        id={`${viewType}-sort`}
        title="Sort"
        icon={<SortAsc className="h-4 w-4 text-accent" />}
      >
        <div className="space-y-2">
          <PanelButton
            active={sortBy === "modified"}
            onClick={() => handleSortByChange("modified")}
          >
            Recently Modified
          </PanelButton>
          <PanelButton
            active={sortBy === "date"}
            onClick={() => handleSortByChange("date")}
          >
            Date Added
          </PanelButton>
          <PanelButton
            active={sortBy === "title"}
            onClick={() => handleSortByChange("title")}
          >
            Title A-Z
          </PanelButton>
          <PanelButton
            active={sortBy === "domain"}
            onClick={() => handleSortByChange("domain")}
          >
            Domain
          </PanelButton>
          <button
            onClick={handleSortOrderChange}
            className="flex w-full items-center justify-between rounded-lg bg-surface-soft px-3 py-2 text-xs text-muted-foreground hover:bg-surface-elevated hover:text-foreground transition-colors"
          >
            <span className="flex items-center gap-2">
              <ArrowUpDown size={14} />
              Order
            </span>
            <span className="font-medium">{sortOrder === "asc" ? "A → Z" : "Z → A"}</span>
          </button>
        </div>
      </PanelSection>

      {/* View Section */}
      <PanelSection
        id={`${viewType}-view`}
        title="View"
        icon={<Eye className="h-4 w-4 text-accent" />}
      >
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
      <PanelSection
        id={`${viewType}-display`}
        title="Display"
        icon={<Maximize2 className="h-4 w-4 text-accent" />}
      >
        <div className="space-y-3">
          <div className="space-y-2">
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
            <PanelToggle
              label="Show Tags"
              checked={showTagsValue}
              onChange={handleShowTagsChange}
            />
          </div>

          <div className="space-y-2 pt-2 border-t border-subtle">
            <CardSizeSlider
              label="Card Size"
              icon={Maximize2}
              value={cardSizeValue}
              onChange={handleCardSizeChange}
            />
            <CardSizeSlider
              label="Card Spacing"
              icon={Maximize2}
              value={cardSpacingValue}
              onChange={handleCardSpacingChange}
            />
            <CardSizeSlider
              label="Card Padding"
              icon={Maximize2}
              value={cardPaddingValue}
              onChange={handleCardPaddingChange}
            />
          </div>
        </div>
      </PanelSection>
    </>
  );
}
