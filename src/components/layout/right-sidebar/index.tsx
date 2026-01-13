"use client";

/**
 * Right Sidebar
 * Main component that orchestrates the sidebar panels
 */

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
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
  Settings,
  X,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useRightSidebar, useRightSidebarSettings, useCardDetailSidebar, useUIStore } from "@/lib/stores/ui-store";
import {
  useViewStore,
  useCardDisplaySettings,
  useSubPawkitSettings,
  usePawkitOverviewSettings,
  findDuplicateCardIds,
} from "@/lib/stores/view-store";
import { useCurrentWorkspace } from "@/lib/stores/workspace-store";
import { useDataContext } from "@/lib/contexts/data-context";
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
  type LinkStatusFilter,
} from "./config";
import { forceRecheckAllLinks } from "@/lib/services/link-check-service";
import { CardDetailsPanel } from "./CardDetailsPanel";
import { CardDisplaySettings } from "./CardDisplaySettings";
import {
  ContentTypeFilter,
  SortOptions,
  AdvancedFilterSection,
  GroupingSection,
  SubPawkitSettings,
  TagsFilter,
  PawkitOverviewSettings,
} from "./sections";
import { CalendarSidebar } from "./calendar/CalendarSidebar";
import { SettingsPanel } from "./SettingsPanel";
import { TagsSidebar } from "@/components/tags/tags-sidebar";
import { useTagSidebar } from "@/lib/stores/ui-store";
import { useTagStore } from "@/lib/stores/tag-store";

export function RightSidebar() {
  const pathname = usePathname();
  const hasMountedRef = useRef(false);
  const [mounted, setMounted] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [displayedPathname, setDisplayedPathname] = useState(pathname);
  const [displayMode, setDisplayMode] = useState<"filters" | "card-details">(
    "filters",
  );
  const [isTransitioning, setIsTransitioning] = useState(false);
  const { isOpen, isAnchored, toggleAnchored, setOpen, setExpandedMode, expandedMode } = useRightSidebar();
  const { isSettingsMode, toggleSettings } = useRightSidebarSettings();
  const { isCardDetailMode, cardDetailTab, setTab: setCardDetailTab } = useCardDetailSidebar();
  const { selectedTag: selectedTagForSidebar, setSelectedTag: setSelectedTagForSidebar } = useTagSidebar();
  const { theme, setTheme } = useTheme();
  const workspace = useCurrentWorkspace();

  // Tag store data for tags sidebar
  const tagStoreUniqueTags = useTagStore((s) => s.uniqueTags);
  const tagStoreTagCounts = useTagStore((s) => s.tagCounts);
  const tagStoreTagColors = useTagStore((s) => s.tagColors);
  const renameTagAction = useTagStore((s) => s.renameTag);
  const deleteTagAction = useTagStore((s) => s.deleteTag);
  const setTagColorAction = useTagStore((s) => s.setTagColor);
  const getTagColorAction = useTagStore((s) => s.getTagColor);
  const [isTagProcessing, setIsTagProcessing] = useState(false);

  // Get active card from modal store
  const activeCardId = useModalStore((s) => s.activeCardId);
  // Use DataContext for cards/collections - benefits from two-phase loading optimization
  const { cards: allCards, collections: allCollections } = useDataContext();
  const activeCard = useMemo(
    () => (activeCardId ? allCards.find((c) => c.id === activeCardId) : null),
    [activeCardId, allCards],
  );

  // Get view-specific configuration
  // Always use pathname for config (determines what to show)
  // displayedPathname is only for animation purposes
  const viewConfig = useMemo(
    () => getViewConfig(pathname),
    [pathname],
  );

  // Handle transition between filters and card details view
  // Also expand sidebar when card detail opens
  useEffect(() => {
    const targetMode = activeCardId ? "card-details" : "filters";

    if (targetMode !== displayMode && hasMountedRef.current) {
      setIsTransitioning(true);
      const timer = setTimeout(() => {
        setDisplayMode(targetMode);
        setTimeout(() => setIsTransitioning(false), 100);
      }, 200);
      return () => clearTimeout(timer);
    } else if (!hasMountedRef.current) {
      setDisplayMode(targetMode);
    }

    // Expand sidebar when card detail opens, collapse when it closes
    if (activeCardId && expandedMode !== 'card-detail' && expandedMode !== 'settings') {
      setExpandedMode('card-detail');
    } else if (!activeCardId && expandedMode === 'card-detail') {
      setExpandedMode(null);
    }
  }, [activeCardId, displayMode, expandedMode, setExpandedMode]);

  // Handle view transitions with animation
  useEffect(() => {
    if (!hasMountedRef.current) {
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
  }, [pathname, displayedPathname]);

  // Card display settings
  const {
    cardPadding,
    cardSpacing,
    cardSize,
    showMetadataFooter,
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
  const setShowTitles = useViewStore((s) => s.setShowTitles);
  const setShowTags = useViewStore((s) => s.setShowTags);
  const saveViewSettings = useViewStore((s) => s.saveViewSettings);
  const selectedTags = useViewStore((s) => s.selectedTags);
  const toggleTag = useViewStore((s) => s.toggleTag);
  const clearTags = useViewStore((s) => s.clearTags);
  const showNoTagsOnly = useViewStore((s) => s.showNoTagsOnly);
  const setShowNoTagsOnly = useViewStore((s) => s.setShowNoTagsOnly);
  const showNoPawkitsOnly = useViewStore((s) => s.showNoPawkitsOnly);
  const setShowNoPawkitsOnly = useViewStore((s) => s.setShowNoPawkitsOnly);
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

  // Pawkit Overview display settings
  const {
    pawkitOverviewSize,
    pawkitOverviewColumns,
    pawkitOverviewShowThumbnails,
    pawkitOverviewShowItemCount,
    pawkitOverviewSortBy,
    setPawkitOverviewSize,
    setPawkitOverviewColumns,
    setPawkitOverviewShowThumbnails,
    setPawkitOverviewShowItemCount,
    setPawkitOverviewSortBy,
  } = usePawkitOverviewSettings();

  // Get all tags from cards and calculate duplicates (reuse allCards from parent scope)
  const cards = allCards;

  // For pawkit views, scope cards to the current pawkit
  const { scopedCards, hasSubPawkits } = useMemo(() => {
    // Check if we're on a pawkit detail page
    const pawkitMatch = pathname.match(/^\/pawkits\/([^/]+)$/);
    if (!pawkitMatch) return { scopedCards: cards, hasSubPawkits: false };

    const slug = pawkitMatch[1];
    const collection = allCollections.find(
      (c) => c.slug === slug && !c._deleted,
    );
    if (!collection) return { scopedCards: cards, hasSubPawkits: false };

    // Check if this collection has any child collections
    const childCollections = allCollections.filter(
      (c) => c.parentId === collection.id && !c._deleted,
    );

    // Return only cards in this Pawkit (using tags - Pawkit slug is a tag)
    const filtered = cards.filter(
      (card) => card.tags?.includes(slug) && !card._deleted,
    );

    return {
      scopedCards: filtered,
      hasSubPawkits: childCollections.length > 0,
    };
  }, [cards, allCollections, pathname]);

  // Calculate duplicate count (use scoped cards for pawkit views)
  const duplicateCount = useMemo(() => {
    const duplicateIds = findDuplicateCardIds(scopedCards);
    return duplicateIds.size;
  }, [scopedCards]);

  // Build set of Pawkit slugs to check if card has any Pawkit tags
  const pawkitSlugs = useMemo(() => {
    return new Set(allCollections.map((c) => c.slug));
  }, [allCollections]);

  const { allTags, noTagsCount, noPawkitsCount } = useMemo(() => {
    const tagCounts = new Map<string, number>();
    let noTags = 0;
    let noPawkits = 0;
    for (const card of scopedCards) {
      if (card._deleted) continue;
      const tags = card.tags || [];
      // A card is "in a Pawkit" if any of its tags match a Pawkit slug
      const hasAnyPawkitTag = tags.some((tag) => pawkitSlugs.has(tag));
      if (tags.length === 0) {
        noTags++;
      }
      if (!hasAnyPawkitTag) {
        noPawkits++;
      }
      for (const tag of tags) {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
      }
    }
    const sortedTags = Array.from(tagCounts.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([tag, count]) => ({ tag, count }));
    return { allTags: sortedTags, noTagsCount: noTags, noPawkitsCount: noPawkits };
  }, [scopedCards, pawkitSlugs]);

  // Track mount state - ref for animation logic, state for hydration safety
  useEffect(() => {
    hasMountedRef.current = true;
    setMounted(true);
  }, []);

  // Trigger Muuri layout refresh when display settings change
  // This ensures the masonry grid recalculates card positions when dimensions change
  const triggerMuuriLayout = useUIStore((s) => s.triggerMuuriLayout);
  const prevDisplaySettingsRef = useRef({ showMetadataFooter, showTitles, showTags, cardPadding, cardSpacing });

  useEffect(() => {
    // Skip on initial mount
    if (!hasMountedRef.current) return;

    const prev = prevDisplaySettingsRef.current;
    const settingsChanged =
      prev.showMetadataFooter !== showMetadataFooter ||
      prev.showTitles !== showTitles ||
      prev.showTags !== showTags ||
      prev.cardPadding !== cardPadding ||
      prev.cardSpacing !== cardSpacing;

    if (settingsChanged) {
      // Update ref for next comparison
      prevDisplaySettingsRef.current = { showMetadataFooter, showTitles, showTags, cardPadding, cardSpacing };

      // Delay to allow React to re-render cards with new settings before Muuri recalculates
      const timer = setTimeout(() => {
        triggerMuuriLayout();
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [showMetadataFooter, showTitles, showTags, cardPadding, cardSpacing, triggerMuuriLayout]);

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

  // Tag sidebar handlers
  const handleTagSidebarRename = useCallback(async (oldTag: string, newTag: string) => {
    if (!workspace?.id) return;
    setIsTagProcessing(true);
    try {
      await renameTagAction(workspace.id, oldTag, newTag);
    } finally {
      setIsTagProcessing(false);
    }
  }, [workspace?.id, renameTagAction]);

  const handleTagSidebarDelete = useCallback(async (tag: string) => {
    if (!workspace?.id) return;
    setIsTagProcessing(true);
    try {
      await deleteTagAction(workspace.id, tag);
      setSelectedTagForSidebar(null);
    } finally {
      setIsTagProcessing(false);
    }
  }, [workspace?.id, deleteTagAction, setSelectedTagForSidebar]);

  const handleDeleteUnusedTags = useCallback(async () => {
    // Unused tags are pending tags with count 0
    // We just clear them from the store by refreshing
    if (!workspace?.id) return;
    setIsTagProcessing(true);
    try {
      // Delete all tags with count 0
      const unusedTags = tagStoreUniqueTags.filter((tag) => (tagStoreTagCounts[tag] || 0) === 0);
      for (const tag of unusedTags) {
        await deleteTagAction(workspace.id, tag);
      }
    } finally {
      setIsTagProcessing(false);
    }
  }, [workspace?.id, tagStoreUniqueTags, tagStoreTagCounts, deleteTagAction]);

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
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleSettings}
                  className={cn(
                    "h-7 w-7 hover:bg-bg-surface-2 relative",
                    isSettingsMode
                      ? "text-text-primary"
                      : "text-text-muted hover:text-text-primary"
                  )}
                >
                  {/* Gear icon - visible when not in settings mode */}
                  <Settings
                    className={cn(
                      "h-5 w-5 absolute transition-all duration-200",
                      isSettingsMode
                        ? "opacity-0 rotate-90 scale-75"
                        : "opacity-100 rotate-0 scale-100"
                    )}
                  />
                  {/* X icon - visible when in settings mode */}
                  <X
                    className={cn(
                      "h-5 w-5 absolute transition-all duration-200",
                      isSettingsMode
                        ? "opacity-100 rotate-0 scale-100"
                        : "opacity-0 -rotate-90 scale-75"
                    )}
                  />
                </Button>
              </TooltipTrigger>
              <TooltipContent
                side="bottom"
                className={displayMode === "card-details" ? "z-[70]" : ""}
              >
                <p>{isSettingsMode ? "Close settings" : "Settings"}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <span className="text-sm font-medium text-text-secondary">
          {isSettingsMode
            ? "Settings"
            : displayMode === "card-details"
              ? "Card Details"
              : viewConfig.title}
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {/* Settings Panel - takes priority when active */}
        {isSettingsMode && <SettingsPanel />}

        {/* Card Details Panel */}
        {!isSettingsMode && displayMode === "card-details" && activeCard && (
          <CardDetailsPanel
            card={activeCard}
            collections={allCollections}
            isTransitioning={isTransitioning}
          />
        )}

        {/* Filters Panel */}
        {!isSettingsMode && displayMode === "filters" && (
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
                    showNoTagsOnly={showNoTagsOnly}
                    onToggleNoTags={setShowNoTagsOnly}
                    noTagsCount={noTagsCount}
                    showNoPawkitsOnly={showNoPawkitsOnly}
                    onToggleNoPawkits={setShowNoPawkitsOnly}
                    noPawkitsCount={noPawkitsCount}
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

                <ContentTypeFilter
                  filters={contentTypeFilters}
                  onToggle={toggleContentType}
                  onClear={clearContentTypes}
                />

                {viewConfig.showSubPawkitSettings && hasSubPawkits && (
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
                    showTitles={showTitles}
                    showTags={showTags}
                    onLayoutChange={setLayout}
                    onCardSizeChange={setCardSize}
                    onCardPaddingChange={setCardPadding}
                    onCardSpacingChange={setCardSpacing}
                    onShowMetadataFooterChange={setShowMetadataFooter}
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

            {/* Pawkits Overview Settings */}
            {viewConfig.showPawkitOverviewSettings && (
              <PawkitOverviewSettings
                size={pawkitOverviewSize}
                columns={pawkitOverviewColumns}
                showThumbnails={pawkitOverviewShowThumbnails}
                showItemCount={pawkitOverviewShowItemCount}
                sortBy={pawkitOverviewSortBy}
                onSizeChange={setPawkitOverviewSize}
                onColumnsChange={setPawkitOverviewColumns}
                onShowThumbnailsChange={setPawkitOverviewShowThumbnails}
                onShowItemCountChange={setPawkitOverviewShowItemCount}
                onSortByChange={setPawkitOverviewSortBy}
                onSettingChange={handleSettingChange}
              />
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

            {viewConfig.type === "calendar" && <CalendarSidebar />}

            {viewConfig.type === "tags" && (
              <TagsSidebar
                selectedTag={selectedTagForSidebar}
                tagCounts={tagStoreTagCounts}
                uniqueTags={tagStoreUniqueTags}
                tagColors={tagStoreTagColors}
                onClose={() => setSelectedTagForSidebar(null)}
                onRenameTag={handleTagSidebarRename}
                onDeleteTag={handleTagSidebarDelete}
                onDeleteUnusedTags={handleDeleteUnusedTags}
                onSetTagColor={setTagColorAction}
                getTagColor={getTagColorAction}
                isProcessing={isTagProcessing}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
