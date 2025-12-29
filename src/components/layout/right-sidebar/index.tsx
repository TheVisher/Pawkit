"use client";

/**
 * Right Sidebar
 * Main component that orchestrates the sidebar panels
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { usePathname } from "next/navigation";
import {
  ArrowRightToLine,
  ArrowLeftFromLine,
  Maximize2,
  Minimize2,
  Moon,
  Sun,
  SunMoon,
  Home,
  Calendar,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useRightSidebar } from "@/lib/stores/ui-store";
import {
  useViewStore,
  useCardDisplaySettings,
  useSubPawkitSettings,
} from "@/lib/stores/view-store";
import { useCurrentWorkspace } from "@/lib/stores/workspace-store";
import { useDataStore } from "@/lib/stores/data-store";
import { useModalStore } from "@/lib/stores/modal-store";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import {
  getViewConfig,
  type ContentType,
  type GroupBy,
  type DateGrouping,
  type UnsortedFilter,
  type ReadingFilter,
  type LinkStatusFilter,
} from "./config";
import { forceRecheckAllLinks } from "@/lib/services/link-check-service";
import { CardDetailsPanel } from "./CardDetailsPanel";
import { CardDisplaySettings } from "./CardDisplaySettings";
import {
  ContentTypeFilter,
  SortOptions,
  QuickFilter,
  ReadingStatusFilter,
  AdvancedFilterSection,
  GroupingSection,
  SubPawkitSettings,
  TagsFilter,
} from "./FilterSections";
import { findDuplicateCardIds } from "@/lib/stores/view-store";

export function RightSidebar() {
  const [mounted, setMounted] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [displayedPathname, setDisplayedPathname] = useState("");
  const [displayMode, setDisplayMode] = useState<"filters" | "card-details">(
    "filters",
  );
  const [isTransitioning, setIsTransitioning] = useState(false);
  const pathname = usePathname();
  const { isOpen, isAnchored, toggleAnchored, setOpen } = useRightSidebar();
  const { theme, setTheme } = useTheme();
  const workspace = useCurrentWorkspace();

  // Get active card from modal store
  const activeCardId = useModalStore((s) => s.activeCardId);
  const allCards = useDataStore((s) => s.cards);
  const allCollections = useDataStore((s) => s.collections);
  const activeCard = useMemo(
    () => (activeCardId ? allCards.find((c) => c.id === activeCardId) : null),
    [activeCardId, allCards],
  );

  // Get view-specific configuration
  const viewConfig = useMemo(
    () => getViewConfig(displayedPathname || pathname),
    [displayedPathname, pathname],
  );

  // Handle transition between filters and card details view
  useEffect(() => {
    const targetMode = activeCardId ? "card-details" : "filters";

    if (targetMode !== displayMode && mounted) {
      setIsTransitioning(true);
      const timer = setTimeout(() => {
        setDisplayMode(targetMode);
        setTimeout(() => setIsTransitioning(false), 100);
      }, 200);
      return () => clearTimeout(timer);
    } else if (!mounted) {
      setDisplayMode(targetMode);
    }
  }, [activeCardId, displayMode, mounted]);

  // Handle view transitions with animation
  useEffect(() => {
    if (!mounted) {
      setDisplayedPathname(pathname);
      return;
    }

    if (pathname !== displayedPathname) {
      setIsAnimating(true);
      const timer = setTimeout(() => {
        setDisplayedPathname(pathname);
        setTimeout(() => setIsAnimating(false), 100);
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [pathname, displayedPathname, mounted]);

  // Card display settings
  const {
    cardPadding,
    cardSpacing,
    cardSize,
    showMetadataFooter,
    showUrlPill,
    showTitles,
    showTags,
  } = useCardDisplaySettings();
  const layout = useViewStore((s) => s.layout);
  const sortBy = useViewStore((s) => s.sortBy);
  const sortOrder = useViewStore((s) => s.sortOrder);
  const contentTypeFilters = useViewStore(
    (s) => s.contentTypeFilters,
  ) as ContentType[];
  const setLayout = useViewStore((s) => s.setLayout);
  const setSortBy = useViewStore((s) => s.setSortBy);
  const toggleSortOrder = useViewStore((s) => s.toggleSortOrder);
  const toggleContentType = useViewStore((s) => s.toggleContentType);
  const clearContentTypes = useViewStore((s) => s.clearContentTypes);
  const setCardPadding = useViewStore((s) => s.setCardPadding);
  const setCardSpacing = useViewStore((s) => s.setCardSpacing);
  const setCardSize = useViewStore((s) => s.setCardSize);
  const setShowMetadataFooter = useViewStore((s) => s.setShowMetadataFooter);
  const setShowUrlPill = useViewStore((s) => s.setShowUrlPill);
  const setShowTitles = useViewStore((s) => s.setShowTitles);
  const setShowTags = useViewStore((s) => s.setShowTags);
  const saveViewSettings = useViewStore((s) => s.saveViewSettings);
  const selectedTags = useViewStore((s) => s.selectedTags);
  const toggleTag = useViewStore((s) => s.toggleTag);
  const clearTags = useViewStore((s) => s.clearTags);
  const unsortedFilter = useViewStore(
    (s) => s.unsortedFilter,
  ) as UnsortedFilter;
  const setUnsortedFilter = useViewStore((s) => s.setUnsortedFilter);
  const readingFilter = useViewStore((s) => s.readingFilter) as ReadingFilter;
  const setReadingFilter = useViewStore((s) => s.setReadingFilter);
  const linkStatusFilter = useViewStore(
    (s) => s.linkStatusFilter,
  ) as LinkStatusFilter;
  const setLinkStatusFilter = useViewStore((s) => s.setLinkStatusFilter);
  const showDuplicatesOnly = useViewStore((s) => s.showDuplicatesOnly);
  const setShowDuplicatesOnly = useViewStore((s) => s.setShowDuplicatesOnly);
  const groupBy = useViewStore((s) => s.groupBy) as GroupBy;
  const dateGrouping = useViewStore((s) => s.dateGrouping) as DateGrouping;
  const setGroupBy = useViewStore((s) => s.setGroupBy);
  const setDateGrouping = useViewStore((s) => s.setDateGrouping);

  // Sub-Pawkit display settings
  const {
    subPawkitSize,
    subPawkitColumns,
    setSubPawkitSize,
    setSubPawkitColumns,
  } = useSubPawkitSettings();

  // Get all tags from cards and calculate duplicates
  const cards = useDataStore((s) => s.cards);

  // Calculate duplicate count
  const duplicateCount = useMemo(() => {
    const duplicateIds = findDuplicateCardIds(cards);
    return duplicateIds.size;
  }, [cards]);

  const allTags = useMemo(() => {
    const tagCounts = new Map<string, number>();
    for (const card of cards) {
      if (card._deleted) continue;
      for (const tag of card.tags || []) {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
      }
    }
    return Array.from(tagCounts.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([tag, count]) => ({ tag, count }));
  }, [cards]);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Save settings when they change (debounced)
  const handleSettingChange = useCallback(() => {
    if (workspace) {
      const timer = setTimeout(() => {
        saveViewSettings(workspace.id);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [workspace, saveViewSettings]);

  const handleToggleOpen = () => setOpen(!isOpen);

  // Cycle through themes
  const cycleTheme = () => {
    if (theme === "system") setTheme("dark");
    else if (theme === "dark") setTheme("light");
    else setTheme("system");
  };

  const getThemeIcon = () => {
    if (!mounted) return { icon: SunMoon, label: "System theme" };
    switch (theme) {
      case "dark":
        return { icon: Moon, label: "Dark mode" };
      case "light":
        return { icon: Sun, label: "Light mode" };
      default:
        return { icon: SunMoon, label: "System theme" };
    }
  };

  const themeInfo = getThemeIcon();
  const ThemeIcon = themeInfo.icon;
  const anchored = mounted ? isAnchored : false;
  const open = mounted ? isOpen : false;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex h-14 items-center justify-between px-4 border-b border-border-subtle">
        <div className="flex items-center gap-1">
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleToggleOpen}
                  className="h-7 w-7 text-text-muted hover:text-text-primary hover:bg-bg-surface-2"
                >
                  {open ? (
                    <ArrowRightToLine className="h-5 w-5" />
                  ) : (
                    <ArrowLeftFromLine className="h-5 w-5" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent
                side="bottom"
                className={displayMode === "card-details" ? "z-[70]" : ""}
              >
                <p>{open ? "Close sidebar" : "Open sidebar"}</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleAnchored}
                  className="h-7 w-7 text-text-muted hover:text-text-primary hover:bg-bg-surface-2"
                >
                  {anchored ? (
                    <Minimize2 className="h-5 w-5" />
                  ) : (
                    <Maximize2 className="h-5 w-5" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent
                side="bottom"
                className={displayMode === "card-details" ? "z-[70]" : ""}
              >
                <p>{anchored ? "Float panel" : "Anchor panel"}</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={cycleTheme}
                  className="h-7 w-7 text-text-muted hover:text-text-primary hover:bg-bg-surface-2"
                >
                  <ThemeIcon className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent
                side="bottom"
                className={displayMode === "card-details" ? "z-[70]" : ""}
              >
                <p>{themeInfo.label}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <span className="text-sm font-medium text-text-secondary">
          {displayMode === "card-details" ? "Card Details" : viewConfig.title}
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {/* Card Details Panel */}
        {displayMode === "card-details" && activeCard && (
          <CardDetailsPanel
            card={activeCard}
            collections={allCollections}
            isTransitioning={isTransitioning}
          />
        )}

        {/* Filters Panel */}
        {displayMode === "filters" && (
          <div
            key={displayedPathname}
            className={cn(
              "space-y-0 transition-all ease-out",
              isAnimating || isTransitioning
                ? "opacity-0 translate-y-2"
                : "opacity-100 translate-y-0",
            )}
            style={{ transitionDuration: "250ms" }}
          >
            {viewConfig.showContentFilters && (
              <>
                {viewConfig.showTags && (
                  <TagsFilter
                    allTags={allTags}
                    selectedTags={selectedTags}
                    onToggleTag={toggleTag}
                    onClearTags={clearTags}
                  />
                )}

                <SortOptions
                  sortBy={sortBy}
                  sortOrder={sortOrder}
                  onSortByChange={setSortBy}
                  onToggleSortOrder={toggleSortOrder}
                  onSettingChange={handleSettingChange}
                />

                <GroupingSection
                  groupBy={groupBy}
                  dateGrouping={dateGrouping}
                  onGroupByChange={setGroupBy}
                  onDateGroupingChange={setDateGrouping}
                  onSettingChange={handleSettingChange}
                />

                <ReadingStatusFilter
                  filter={readingFilter}
                  onFilterChange={setReadingFilter}
                />

                <ContentTypeFilter
                  filters={contentTypeFilters}
                  onToggle={toggleContentType}
                  onClear={clearContentTypes}
                />

                <QuickFilter
                  filter={unsortedFilter}
                  onFilterChange={setUnsortedFilter}
                />

                {viewConfig.showSubPawkitSettings && (
                  <SubPawkitSettings
                    size={subPawkitSize}
                    columns={subPawkitColumns}
                    onSizeChange={setSubPawkitSize}
                    onColumnsChange={setSubPawkitColumns}
                    onSettingChange={handleSettingChange}
                  />
                )}

                {viewConfig.showCardDisplay && (
                  <CardDisplaySettings
                    layout={layout}
                    cardSize={cardSize}
                    cardPadding={cardPadding}
                    cardSpacing={cardSpacing}
                    showMetadataFooter={showMetadataFooter}
                    showUrlPill={showUrlPill}
                    showTitles={showTitles}
                    showTags={showTags}
                    onLayoutChange={setLayout}
                    onCardSizeChange={setCardSize}
                    onCardPaddingChange={setCardPadding}
                    onCardSpacingChange={setCardSpacing}
                    onShowMetadataFooterChange={setShowMetadataFooter}
                    onShowUrlPillChange={setShowUrlPill}
                    onShowTitlesChange={setShowTitles}
                    onShowTagsChange={setShowTags}
                    onSettingChange={handleSettingChange}
                  />
                )}

                <AdvancedFilterSection
                  linkStatusFilter={linkStatusFilter}
                  onLinkStatusChange={setLinkStatusFilter}
                  onRecheckLinks={
                    workspace
                      ? () => forceRecheckAllLinks(workspace.id)
                      : undefined
                  }
                  showDuplicatesOnly={showDuplicatesOnly}
                  duplicateCount={duplicateCount}
                  onToggleDuplicates={setShowDuplicatesOnly}
                />
              </>
            )}

            {/* Placeholder views */}
            {viewConfig.type === "home" && (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Home className="h-10 w-10 text-text-muted mb-3" />
                <p className="text-sm text-text-secondary">Welcome to Pawkit</p>
                <p className="text-xs text-text-muted mt-1">
                  View your stats and get started
                </p>
              </div>
            )}

            {viewConfig.type === "calendar" && (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Calendar className="h-10 w-10 text-text-muted mb-3" />
                <p className="text-sm text-text-secondary">Calendar Options</p>
                <p className="text-xs text-text-muted mt-1">
                  Calendar filters coming soon
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
