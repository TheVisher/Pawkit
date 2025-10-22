"use client";

import { PanelSection, PanelButton, PanelToggle } from "./control-panel";
import { Grid, List, LayoutGrid, Columns, Tag, SortAsc, Eye, Maximize2 } from "lucide-react";
import { LayoutMode } from "@/lib/hooks/view-settings-store";
import { useDataStore } from "@/lib/stores/data-store";
import { useMemo } from "react";

export type LibraryControlsProps = {
  // View options
  layout: LayoutMode;
  onLayoutChange: (layout: LayoutMode) => void;

  // Sort options
  sortBy?: "date" | "modified" | "title" | "domain";
  onSortChange?: (sort: "date" | "modified" | "title" | "domain") => void;

  // Filter options
  selectedTags?: string[];
  onTagsChange?: (tags: string[]) => void;

  // Display options
  cardSize?: number;
  onCardSizeChange?: (size: number) => void;
  showThumbnails?: boolean;
  onShowThumbnailsChange?: (show: boolean) => void;
  showTitles?: boolean;
  onShowTitlesChange?: (show: boolean) => void;
  showUrls?: boolean;
  onShowUrlsChange?: (show: boolean) => void;
};

export function LibraryControls({
  layout,
  onLayoutChange,
  sortBy = "modified",
  onSortChange,
  selectedTags = [],
  onTagsChange,
  cardSize = 3,
  onCardSizeChange,
  showThumbnails = true,
  onShowThumbnailsChange,
  showTitles = true,
  onShowTitlesChange,
  showUrls = false,
  onShowUrlsChange,
}: LibraryControlsProps) {
  const { cards } = useDataStore();

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
    if (!onTagsChange) return;

    if (selectedTags.includes(tagName)) {
      onTagsChange(selectedTags.filter(t => t !== tagName));
    } else {
      onTagsChange([...selectedTags, tagName]);
    }
  };

  return (
    <>
      {/* View Section */}
      <PanelSection title="View" icon={<Eye className="h-4 w-4 text-accent" />}>
        <PanelButton
          active={layout === "grid"}
          onClick={() => onLayoutChange("grid")}
          icon={<Grid size={16} />}
        >
          Grid
        </PanelButton>
        <PanelButton
          active={layout === "masonry"}
          onClick={() => onLayoutChange("masonry")}
          icon={<LayoutGrid size={16} />}
        >
          Masonry
        </PanelButton>
        <PanelButton
          active={layout === "list"}
          onClick={() => onLayoutChange("list")}
          icon={<List size={16} />}
        >
          List
        </PanelButton>
        <PanelButton
          active={layout === "compact"}
          onClick={() => onLayoutChange("compact")}
          icon={<Columns size={16} />}
        >
          Compact
        </PanelButton>
      </PanelSection>

      {/* Sort Section */}
      {onSortChange && (
        <PanelSection title="Sort" icon={<SortAsc className="h-4 w-4 text-accent" />}>
          <PanelButton
            active={sortBy === "modified"}
            onClick={() => onSortChange("modified")}
          >
            Recently Modified
          </PanelButton>
          <PanelButton
            active={sortBy === "date"}
            onClick={() => onSortChange("date")}
          >
            Date Added
          </PanelButton>
          <PanelButton
            active={sortBy === "title"}
            onClick={() => onSortChange("title")}
          >
            Title A-Z
          </PanelButton>
          <PanelButton
            active={sortBy === "domain"}
            onClick={() => onSortChange("domain")}
          >
            Domain
          </PanelButton>
        </PanelSection>
      )}

      {/* Tags Filter Section */}
      {onTagsChange && allTags.length > 0 && (
        <PanelSection title="Filter by Tags" icon={<Tag className="h-4 w-4 text-accent" />}>
          {selectedTags.length > 0 && (
            <button
              onClick={() => onTagsChange([])}
              className="text-xs text-accent hover:text-accent/80 transition-colors mb-1"
            >
              Clear all filters
            </button>
          )}
          <div className="space-y-1 max-h-64 overflow-y-auto">
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
      <PanelSection title="Display" icon={<Maximize2 className="h-4 w-4 text-accent" />}>
        {/* Card Size Slider */}
        {onCardSizeChange && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Card Size</span>
              <span>{cardSize === 1 ? "XS" : cardSize === 2 ? "S" : cardSize === 3 ? "M" : cardSize === 4 ? "L" : "XL"}</span>
            </div>
            <input
              type="range"
              min="1"
              max="5"
              value={cardSize}
              onChange={(e) => onCardSizeChange(parseInt(e.target.value))}
              className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer
                [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
                [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-accent
                [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4
                [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-accent [&::-moz-range-thumb]:border-0"
            />
          </div>
        )}

        {/* Display Toggles */}
        {onShowThumbnailsChange && (
          <PanelToggle
            label="Show Thumbnails"
            checked={showThumbnails}
            onChange={onShowThumbnailsChange}
          />
        )}
        {onShowTitlesChange && (
          <PanelToggle
            label="Show Titles"
            checked={showTitles}
            onChange={onShowTitlesChange}
          />
        )}
        {onShowUrlsChange && (
          <PanelToggle
            label="Show URLs"
            checked={showUrls}
            onChange={onShowUrlsChange}
          />
        )}
      </PanelSection}
    </>
  );
}
