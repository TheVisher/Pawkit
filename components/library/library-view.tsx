"use client";

import { useState, useEffect, useMemo, MouseEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CardModel, CollectionNode } from "@/lib/types";
import { useSelection } from "@/lib/hooks/selection-store";
import { useCardEvents } from "@/lib/hooks/card-events-store";
import { useViewSettingsStore, type LayoutMode } from "@/lib/hooks/view-settings-store";
import { useSettingsStore } from "@/lib/hooks/settings-store";
import { LibraryWorkspace } from "@/components/library/workspace";
import { sortCards } from "@/lib/utils/sort-cards";
import { format } from "date-fns";
import { Library, Settings } from "lucide-react";
import { usePanelStore } from "@/lib/hooks/use-panel-store";

type TimelineGroup = {
  date: string;
  cards: CardModel[];
};

const DATE_RANGES = [
  { label: "7 days", value: 7 },
  { label: "30 days", value: 30 },
  { label: "90 days", value: 90 },
  { label: "6 months", value: 180 },
  { label: "1 year", value: 365 }
] as const;

type LibraryViewProps = {
  initialCards: CardModel[];
  initialNextCursor?: string;
  collectionsTree: CollectionNode[];
  query?: {
    q?: string;
    collection?: string;
    tag?: string;
    status?: string;
  };
  viewMode?: "normal" | "timeline";
  timelineDays?: number;
};

export function LibraryView({
  initialCards,
  initialNextCursor,
  collectionsTree,
  query,
  viewMode = "normal",
  timelineDays = 30
}: LibraryViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedIds = useSelection((state) => state.selectedIds);
  const toggleSelection = useSelection((state) => state.toggle);
  const selectExclusive = useSelection((state) => state.selectExclusive);
  const selectRange = useSelection((state) => state.selectRange);
  const clearSelection = useSelection((state) => state.clear);
  const [cards, setCards] = useState<CardModel[]>(initialCards);
  const [timelineGroups, setTimelineGroups] = useState<TimelineGroup[]>([]);
  const [loading, setLoading] = useState(false);

  // Use panel store to open card details
  const openCardDetails = usePanelStore((state) => state.openCardDetails);

  // Create a map from collection ID to collection name
  const collectionIdToName = useMemo(() => {
    const map = new Map<string, string>();
    const addToMap = (nodes: CollectionNode[]) => {
      nodes.forEach(node => {
        map.set(node.id, node.name);
        if (node.children) {
          addToMap(node.children);
        }
      });
    };
    addToMap(collectionsTree);
    return map;
  }, [collectionsTree]);

  // Get view settings from the store
  const viewSettings = useViewSettingsStore((state) => state.getSettings("library"));
  const setLayoutInStore = useViewSettingsStore((state) => state.setLayout);
  const setCardSizeInStore = useViewSettingsStore((state) => state.setCardSize);
  const setShowTitles = useViewSettingsStore((state) => state.setShowTitles);
  const setShowUrls = useViewSettingsStore((state) => state.setShowUrls);
  const setSortBy = useViewSettingsStore((state) => state.setSortBy);
  const { cardSize, sortBy, sortOrder, showTitles, showUrls } = viewSettings;

  // Get selected tags from store (managed by control panel)
  // Memoize to prevent changing on every render
  const selectedTags = useMemo(() => {
    return (viewSettings.viewSpecific?.selectedTags as string[]) || [];
  }, [viewSettings.viewSpecific?.selectedTags]);

  // Get global settings (thumbnails)
  const showThumbnails = useSettingsStore((state) => state.showThumbnails);
  const setShowThumbnails = useSettingsStore((state) => state.setShowThumbnails);

  // Use hydration-safe layout to prevent SSR mismatches
  const [layout, setLayout] = useState<LayoutMode>("grid");
  const [isHydrated, setIsHydrated] = useState(false);
  
  useEffect(() => {
    setIsHydrated(true);
    setLayout(viewSettings.layout || "grid");
  }, [viewSettings.layout]);

  // Sync local state when store updates (important for reactivity!)
  useEffect(() => {
    setCards(initialCards);
  }, [initialCards]);

  // Sort and filter cards based on view settings and selected tags
  const sortedCards = useMemo(() => {
    let filtered = cards;

    // Filter by selected tags
    if (selectedTags.length > 0) {
      filtered = filtered.filter((card) =>
        selectedTags.some((tag) => card.tags?.includes(tag))
      );
    }

    return sortCards(filtered, sortBy, sortOrder);
  }, [cards, sortBy, sortOrder, selectedTags]);

  const newCard = useCardEvents((state) => state.newCard);
  const clearNewCard = useCardEvents((state) => state.clearNewCard);

  // Listen for new cards added via OmniBar (legacy event system, can probably remove)
  useEffect(() => {
    if (newCard) {
      // Only add if not already in the list and no active search/filter
      if (!cards.find((c) => c.id === newCard.id) && !query?.q && !query?.collection && !query?.status) {
        setCards((prev) => [newCard, ...prev]);
      }
      clearNewCard();
    }
  }, [newCard, clearNewCard, cards, query]);

  // Fetch timeline data when in timeline mode
  useEffect(() => {
    if (viewMode === "timeline") {
      const fetchTimeline = async () => {
        setLoading(true);
        try {
          const response = await fetch(`/api/timeline?days=${timelineDays}`);
          if (response.ok) {
            const data = await response.json();
            setTimelineGroups(data.groups);
          }
        } catch (error) {
          console.error("Failed to load timeline:", error);
        } finally {
          setLoading(false);
        }
      };
      fetchTimeline();
    }
  }, [viewMode, timelineDays]);

  // Flatten all cards for shift-select in timeline mode
  const orderedIds = useMemo(
    () => timelineGroups.flatMap((group) => group.cards.map((card) => card.id)),
    [timelineGroups]
  );

  // Get all timeline cards as flat array
  const allTimelineCards = useMemo(
    () => timelineGroups.flatMap((group) => group.cards),
    [timelineGroups]
  );

  const formatDateHeader = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    return format(date, "MMMM do, yyyy");
  };

  const handleTimelineCardClick = (event: MouseEvent, card: CardModel) => {
    if (event.shiftKey) {
      selectRange(card.id, orderedIds);
      event.preventDefault();
      return;
    }
    if (event.metaKey || event.ctrlKey) {
      toggleSelection(card.id);
      event.preventDefault();
      return;
    }
    openCardDetails(card.id);
  };


  const layoutClass = (layout: LayoutMode): string => {
    // Map cardSize (1-5) to complete Tailwind class strings
    // Mobile: varies 1-3 columns, Tablet: 2-4 columns, Desktop: 2-7 columns
    const sizeToClasses: Record<number, { grid: string; masonry: string; compact: string }> = {
      1: { // Extra small - most columns (mobile: 3 cols)
        grid: "grid grid-cols-3 gap-3 sm:grid-cols-4 xl:grid-cols-7",
        masonry: "columns-3 gap-3 md:columns-4 xl:columns-7",
        compact: "grid grid-cols-3 gap-2 md:grid-cols-4 xl:grid-cols-7"
      },
      2: { // Small (mobile: 2 cols)
        grid: "grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5",
        masonry: "columns-2 gap-3 md:columns-3 xl:columns-5",
        compact: "grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-5"
      },
      3: { // Medium (mobile: 1 col - default)
        grid: "grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4",
        masonry: "columns-1 gap-4 md:columns-2 xl:columns-4",
        compact: "grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-4"
      },
      4: { // Large (mobile: 1 col)
        grid: "grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3",
        masonry: "columns-1 gap-4 md:columns-2 xl:columns-3",
        compact: "grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3"
      },
      5: { // Extra large - least columns (mobile: 1 col)
        grid: "grid grid-cols-1 gap-4 sm:grid-cols-1 xl:grid-cols-2",
        masonry: "columns-1 gap-4 md:columns-1 xl:columns-2",
        compact: "grid grid-cols-1 gap-2 md:grid-cols-1 xl:grid-cols-2"
      }
    };

    const classes = sizeToClasses[cardSize] || sizeToClasses[3];

    switch (layout) {
      case "masonry":
        return classes.masonry;
      case "list":
        return "flex flex-col gap-3";
      case "compact":
        return classes.compact;
      case "grid":
      default:
        return classes.grid;
    }
  };

  const TimelineCard = ({ card, layout }: { card: CardModel; layout: LayoutMode }) => {
    const isCompact = layout === "compact";
    const isList = layout === "list";
    const isMasonry = layout === "masonry";
    const isSelected = selectedIds.includes(card.id);

    if (isList) {
      return (
        <div
          onClick={(e) => handleTimelineCardClick(e, card)}
          className={`card-hover flex items-center gap-3 rounded-2xl border bg-surface p-3 cursor-pointer transition-all ${
            isSelected ? "border-accent ring-2 ring-accent/20" : "border-subtle"
          }`}
        >
          {card.image && (
            <img src={card.image} alt="" className="h-12 w-12 rounded-lg object-cover" />
          )}
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-foreground truncate">{card.title}</div>
            <div className="text-xs text-muted-foreground truncate">{card.domain}</div>
          </div>
        </div>
      );
    }

    return (
      <div
        onClick={(e) => handleTimelineCardClick(e, card)}
        className={`card-hover group cursor-pointer break-inside-avoid-column rounded-2xl border bg-surface p-4 transition-all ${
          isMasonry ? "mb-4" : ""
        } ${isSelected ? "border-accent ring-2 ring-accent/20" : "border-subtle"}`}
      >
        {card.image && (
          <div className={`relative mb-3 w-full overflow-hidden rounded-xl bg-surface-soft ${
            isMasonry ? "" : isCompact ? "aspect-square" : "aspect-video"
          }`}>
            <img
              src={card.image}
              alt={card.title ?? card.url}
              className={isMasonry ? "block w-full h-auto" : "block h-full w-full object-cover"}
              loading="lazy"
            />
          </div>
        )}
        <div className="space-y-1">
          <div className={`font-semibold text-foreground ${isCompact ? "text-xs line-clamp-2" : "text-sm"}`}>
            {card.title || card.domain || card.url}
          </div>
          {!isCompact && (
            <div className="text-xs text-muted-foreground">{card.domain ?? card.url}</div>
          )}
          {card.collections && card.collections.length > 0 && !isCompact && (
            <div className="flex flex-wrap gap-1 text-[10px] text-muted-foreground">
              {card.collections.map((collectionId) => (
                <span key={collectionId} className="rounded bg-surface-soft px-2 py-0.5">
                  {collectionIdToName.get(collectionId) || collectionId}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
              <Library className="h-5 w-5 text-accent" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-foreground">Library</h1>
              <p className="text-sm text-muted-foreground">
                {viewMode === "timeline"
                  ? `${timelineGroups.reduce((sum, g) => sum + g.cards.length, 0)} card(s)`
                  : `${sortedCards.length} card(s)`}
                {selectedTags.length > 0 && ` · ${selectedTags.length} tag filter(s)`}
              </p>
            </div>
          </div>
        </div>

        {/* Timeline View */}
        {viewMode === "timeline" && (
          <>
            {loading && (
              <div className="rounded-lg border border-gray-800 bg-gray-900/40 p-8 text-center">
                <div className="text-lg font-medium text-gray-300 mb-2">Kit is digging this up...</div>
                <div className="text-sm text-gray-500">This may take a moment for longer time ranges</div>
              </div>
            )}

            {!loading && timelineGroups.length === 0 && (
              <div className="rounded-lg border border-gray-800 bg-gray-900/40 p-8 text-center">
                <div className="text-lg font-medium text-gray-300 mb-2">No cards found</div>
                <div className="text-sm text-gray-500">Try a different time range or add some cards!</div>
              </div>
            )}

            {!loading && timelineGroups.map((group) => (
              <div key={group.date} className="space-y-4">
                {/* Date Header */}
                <div className="flex items-center gap-3">
                  <h2 className="text-3xl font-medium text-gray-300">
                    {formatDateHeader(group.date)}
                  </h2>
                </div>

                {/* Cards for this date */}
                <div className={layoutClass(layout)}>
                  {group.cards.map((card) => (
                    <TimelineCard key={card.id} card={card} layout={layout} />
                  ))}
                </div>
              </div>
            ))}
          </>
        )}

        {/* Normal Library View */}
        {viewMode === "normal" && (
          <LibraryWorkspace
            initialCards={sortedCards}
            initialNextCursor={initialNextCursor}
            initialQuery={{ ...query, layout }}
            collectionsTree={collectionsTree}
            hideControls={true}
            storageKey="library-layout"
            area="library"
          />
        )}
      </div>

    </>
  );
}
