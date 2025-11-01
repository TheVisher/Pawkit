"use client";

import { PanelSection, PanelButton, PanelToggle } from "./control-panel";
import { Grid, List, LayoutGrid, Columns, Tag, SortAsc, Eye, Maximize2, File, ArrowUpDown, Heart, Trash2, Clock, FolderPlus, EyeOff } from "lucide-react";
import Image from "next/image";
import { useViewSettingsStore, type SortBy, type ContentType } from "@/lib/hooks/view-settings-store";
import { useSettingsStore } from "@/lib/hooks/settings-store";
import { useDataStore } from "@/lib/stores/data-store";
import { usePanelStore } from "@/lib/hooks/use-panel-store";
import { useRediscoverStore } from "@/lib/hooks/rediscover-store";
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

  // Get Rediscover mode state
  const rediscoverStore = useRediscoverStore();

  // Detect if we're in demo mode
  const isDemo = pathname?.startsWith('/demo');
  const pathPrefix = isDemo ? '/demo' : '';

  // Get collapsed sections for managing section state
  const collapsedSections = usePanelStore((state) => state.collapsedSections);
  const toggleSection = usePanelStore((state) => state.toggleSection);

  // Detect if panel is floating over content (for conditional styling)
  const leftMode = usePanelStore((state) => state.leftMode);
  const panelMode = usePanelStore((state) => state.mode);
  const isPanelOpen = usePanelStore((state) => state.isOpen);
  const isFloatingOverContent = leftMode === "anchored" && panelMode === "floating" && isPanelOpen;

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

  // Calculate total actions for stats
  const totalActions = rediscoverStore.stats.kept + rediscoverStore.stats.deleted +
                      rediscoverStore.stats.snoozed + rediscoverStore.stats.addedToPawkit +
                      rediscoverStore.stats.neverShow;

  return (
    <>
      {rediscoverStore.isActive ? (
        // Rediscover Mode: Flexbox layout with scrollable kept cards and fixed stats
        <div className="flex flex-col h-full -my-6">
          {/* Kept Cards Section - Scrollable */}
          <div className="flex-1 overflow-y-auto py-6">
            <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <Heart className="h-5 w-5 text-accent" />
              Kept Cards
            </h2>

            {rediscoverStore.keptCards.length === 0 ? (
              <div className="text-center text-muted-foreground text-sm py-8">
                No cards kept yet
              </div>
            ) : (
              <div className="space-y-3">
                {rediscoverStore.keptCards.map((card) => (
                  <div
                    key={card.id}
                    className="flex gap-3 p-3 rounded-lg bg-white/5 border border-white/10"
                  >
                    {/* Thumbnail */}
                    <div className="relative w-16 h-16 flex-shrink-0 rounded overflow-hidden bg-white/5">
                      {card.image ? (
                        <Image
                          src={card.image}
                          alt={card.title || "Card"}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-purple-500/20 to-pink-500/20" />
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-foreground truncate">
                        {card.title || "Untitled"}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {card.domain || (card.url ? new URL(card.url).hostname : "")}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Session Stats Section - Fixed at bottom */}
          <div className="-mx-4 px-4 py-3 border-t border-white/5 backdrop-blur-md">
            <div className="text-xs text-muted-foreground space-y-2">
              {/* Kept */}
              <div className="flex items-center justify-between hover:bg-white/5 -mx-1 px-1 py-1 rounded transition-colors">
                <div className="flex items-center gap-2">
                  <Heart className="h-3.5 w-3.5 text-accent" />
                  <span className="text-accent">Kept</span>
                </div>
                <span className="font-semibold text-accent">{rediscoverStore.stats.kept}</span>
              </div>

              {/* Added to Pawkit */}
              {rediscoverStore.stats.addedToPawkit > 0 && (
                <div className="flex items-center justify-between hover:bg-white/5 -mx-1 px-1 py-1 rounded transition-colors">
                  <div className="flex items-center gap-2">
                    <FolderPlus className="h-3.5 w-3.5" />
                    <span>Added to Pawkit</span>
                  </div>
                  <span className="font-semibold text-foreground">{rediscoverStore.stats.addedToPawkit}</span>
                </div>
              )}

              {/* Deleted */}
              {rediscoverStore.stats.deleted > 0 && (
                <div className="flex items-center justify-between hover:bg-white/5 -mx-1 px-1 py-1 rounded transition-colors">
                  <div className="flex items-center gap-2">
                    <Trash2 className="h-3.5 w-3.5 text-red-400" />
                    <span className="text-red-400">Deleted</span>
                  </div>
                  <span className="font-semibold text-red-400">{rediscoverStore.stats.deleted}</span>
                </div>
              )}

              {/* Snoozed */}
              {rediscoverStore.stats.snoozed > 0 && (
                <div className="flex items-center justify-between hover:bg-white/5 -mx-1 px-1 py-1 rounded transition-colors">
                  <div className="flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5" />
                    <span>Snoozed</span>
                  </div>
                  <span className="font-semibold text-foreground">{rediscoverStore.stats.snoozed}</span>
                </div>
              )}

              {/* Never Show */}
              {rediscoverStore.stats.neverShow > 0 && (
                <div className="flex items-center justify-between hover:bg-white/5 -mx-1 px-1 py-1 rounded transition-colors">
                  <div className="flex items-center gap-2">
                    <EyeOff className="h-3.5 w-3.5" />
                    <span>Hidden</span>
                  </div>
                  <span className="font-semibold text-foreground">{rediscoverStore.stats.neverShow}</span>
                </div>
              )}

              {/* Total */}
              <div className="pt-2 border-t border-white/5">
                <div className="flex items-center justify-between">
                  <span>Total Actions</span>
                  <span className="font-semibold text-foreground">{totalActions}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        // Normal Library Controls
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
          className={`text-xs transition-colors mb-1 disabled:cursor-not-allowed ${
            isFloatingOverContent
              ? "text-purple-300 hover:text-purple-200 disabled:opacity-40 disabled:hover:text-purple-300"
              : "text-accent hover:text-accent/80 disabled:opacity-30 disabled:hover:text-accent"
          }`}
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
      )}
    </>
  );
}
