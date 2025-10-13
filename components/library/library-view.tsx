"use client";

import { useState, useEffect, useMemo, MouseEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CardModel, CollectionNode } from "@/lib/types";
import { LayoutMode, LAYOUTS } from "@/lib/constants";
import { useSelection } from "@/lib/hooks/selection-store";
import { useCardEvents } from "@/lib/hooks/card-events-store";
import { useSettingsStore } from "@/lib/hooks/settings-store";
import { LibraryWorkspace } from "@/components/library/workspace";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { ListFilter, Check, MoreVertical, Calendar, LayoutGrid, Sliders, Eye } from "lucide-react";
import { MoveToPawkitModal } from "@/components/modals/move-to-pawkit-modal";
import { CardDetailModal } from "@/components/modals/card-detail-modal";
import { CardSizeSlider } from "@/components/card-size-slider";
import { CardDisplayControls } from "@/components/modals/card-display-controls";
import { format } from "date-fns";

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
  initialLayout: LayoutMode;
  collectionsTree: CollectionNode[];
  query?: {
    q?: string;
    collection?: string;
    status?: string;
  };
  viewMode?: "normal" | "timeline";
  timelineDays?: number;
};

export function LibraryView({
  initialCards,
  initialNextCursor,
  initialLayout,
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
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [timelineGroups, setTimelineGroups] = useState<TimelineGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  const [showCardSizeSlider, setShowCardSizeSlider] = useState(false);
  const [showCardDisplayControls, setShowCardDisplayControls] = useState(false);
  const cardSize = useSettingsStore((state) => state.cardSize);

  // Sync local state when store updates (important for reactivity!)
  useEffect(() => {
    setCards(initialCards);
  }, [initialCards]);

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

  // Get active card object
  const activeCard = useMemo(() => {
    if (viewMode === "timeline") {
      return allTimelineCards.find((card) => card.id === activeCardId) ?? null;
    }
    return cards.find((card) => card.id === activeCardId) ?? null;
  }, [viewMode, allTimelineCards, cards, activeCardId]);

  const handleLayoutChange = (layout: LayoutMode) => {
    localStorage.setItem("library-layout", layout);
    const params = new URLSearchParams(searchParams?.toString());
    params.set("layout", layout);
    const currentPath = window.location.pathname;
    router.push(`${currentPath}?${params.toString()}`);
  };

  const handleViewToggle = () => {
    const params = new URLSearchParams(searchParams?.toString());
    if (viewMode === "normal") {
      params.set("view", "timeline");
      params.set("days", "30");
    } else {
      params.delete("view");
      params.delete("days");
    }
    router.push(`/library?${params.toString()}`);
  };

  const handleDaysChange = (days: number) => {
    const params = new URLSearchParams(searchParams?.toString());
    params.set("days", days.toString());
    router.push(`/library?${params.toString()}`);
  };

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
    setActiveCardId(card.id);
  };

  const handleBulkMove = () => {
    if (!selectedIds.length) return;
    setShowMoveModal(true);
  };

  const handleConfirmMove = async (slug: string) => {
    if (!selectedIds.length) return;

    const allCards = viewMode === "timeline" ? allTimelineCards : cards;

    await Promise.all(
      selectedIds.map((id) => {
        const card = allCards.find((item) => item.id === id);
        const collections = card ? Array.from(new Set([slug, ...card.collections])) : [slug];
        return fetch(`/api/cards/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ collections })
        });
      })
    );

    if (viewMode === "timeline") {
      setTimelineGroups((prev) =>
        prev.map((group) => ({
          ...group,
          cards: group.cards.map((card) =>
            selectedIds.includes(card.id)
              ? { ...card, collections: Array.from(new Set([slug, ...card.collections])) }
              : card
          )
        }))
      );
    } else {
      setCards((prev) =>
        prev.map((card) =>
          selectedIds.includes(card.id)
            ? { ...card, collections: Array.from(new Set([slug, ...card.collections])) }
            : card
        )
      );
    }
    clearSelection();
  };

  const handleBulkDelete = () => {
    if (!selectedIds.length) return;
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    await Promise.all(selectedIds.map((id) => fetch(`/api/cards/${id}`, { method: "DELETE" })));

    if (viewMode === "timeline") {
      setTimelineGroups((prev) =>
        prev.map((group) => ({
          ...group,
          cards: group.cards.filter((card) => !selectedIds.includes(card.id))
        }))
        .filter((group) => group.cards.length > 0)
      );
    } else {
      setCards((prev) => prev.filter((card) => !selectedIds.includes(card.id)));
    }
    clearSelection();
    setShowDeleteConfirm(false);
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
              {card.collections.map((collection) => (
                <span key={collection} className="rounded bg-surface-soft px-2 py-0.5">
                  {collection}
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
            <h1 className="text-2xl font-semibold text-foreground">Library</h1>
            <p className="text-sm text-muted-foreground">
              {viewMode === "timeline"
                ? `${timelineGroups.reduce((sum, g) => sum + g.cards.length, 0)} card(s)`
                : `${cards.length} card(s)`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* View Toggle Button */}
            <button
              onClick={handleViewToggle}
              className="flex items-center gap-2 rounded-lg bg-surface-soft px-3 py-2 text-sm text-foreground hover:bg-surface transition-colors"
              title={viewMode === "timeline" ? "Switch to grid view" : "Switch to timeline view"}
            >
              {viewMode === "timeline" ? (
                <LayoutGrid className="h-4 w-4" />
              ) : (
                <Calendar className="h-4 w-4" />
              )}
            </button>

            {/* Filter Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-2 rounded-lg bg-surface-soft px-3 py-2 text-sm text-foreground hover:bg-surface transition-colors">
                <ListFilter className="h-4 w-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {LAYOUTS.map((layout) => (
                  <DropdownMenuItem
                    key={layout}
                    onClick={() => handleLayoutChange(layout)}
                    className="capitalize cursor-pointer relative pl-8"
                  >
                    {initialLayout === layout && (
                      <Check className="absolute left-2 h-4 w-4" />
                    )}
                    {layout}
                  </DropdownMenuItem>
                ))}

                <DropdownMenuSeparator />

                {/* Card Size Slider */}
                <DropdownMenuItem
                  onClick={() => setShowCardSizeSlider(true)}
                  className="cursor-pointer relative pl-8"
                >
                  <Sliders className="absolute left-2 h-4 w-4" />
                  Card Size
                </DropdownMenuItem>

                {/* Card Display Controls */}
                <DropdownMenuItem
                  onClick={() => setShowCardDisplayControls(true)}
                  className="cursor-pointer relative pl-8"
                >
                  <Eye className="absolute left-2 h-4 w-4" />
                  Display Options
                </DropdownMenuItem>

                {/* Date Range Filters (only in timeline mode) */}
                {viewMode === "timeline" && (
                  <>
                    <DropdownMenuSeparator />
                    {DATE_RANGES.map(({ label, value }) => (
                      <DropdownMenuItem
                        key={value}
                        onClick={() => handleDaysChange(value)}
                        className="cursor-pointer relative pl-8"
                      >
                        {timelineDays === value && (
                          <Check className="absolute left-2 h-4 w-4" />
                        )}
                        {label}
                      </DropdownMenuItem>
                    ))}
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-2 rounded-lg bg-surface-soft px-3 py-2 text-sm text-foreground hover:bg-surface transition-colors">
                <MoreVertical className="h-4 w-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={handleBulkMove}
                  disabled={!selectedIds.length}
                  className="cursor-pointer"
                >
                  Move to Pawkit
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handleBulkDelete}
                  disabled={!selectedIds.length}
                  className="cursor-pointer text-rose-400"
                >
                  Delete selected
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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
                <div className={layoutClass(initialLayout)}>
                  {group.cards.map((card) => (
                    <TimelineCard key={card.id} card={card} layout={initialLayout} />
                  ))}
                </div>
              </div>
            ))}
          </>
        )}

        {/* Normal Library View */}
        {viewMode === "normal" && (
          <LibraryWorkspace
            initialCards={cards}
            initialNextCursor={initialNextCursor}
            initialQuery={{ ...query, layout: initialLayout }}
            collectionsTree={collectionsTree}
            hideControls={true}
            storageKey="library-layout"
          />
        )}
      </div>

      <MoveToPawkitModal
        open={showMoveModal}
        onClose={() => setShowMoveModal(false)}
        onConfirm={handleConfirmMove}
      />

      {/* Card Detail Modal for Timeline */}
      {activeCard && viewMode === "timeline" && (
        <CardDetailModal
          card={activeCard}
          collections={collectionsTree}
          onClose={() => setActiveCardId(null)}
          onUpdate={(updatedCard) => {
            setTimelineGroups((prev) =>
              prev.map((group) => ({
                ...group,
                cards: group.cards.map((card) =>
                  card.id === updatedCard.id ? updatedCard : card
                )
              }))
            );
          }}
          onDelete={() => {
            setTimelineGroups((prev) =>
              prev.map((group) => ({
                ...group,
                cards: group.cards.filter((card) => card.id !== activeCardId)
              }))
              .filter((group) => group.cards.length > 0)
            );
            setActiveCardId(null);
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setShowDeleteConfirm(false)}
        >
          <div
            className="bg-gray-950 rounded-lg p-6 w-full max-w-md shadow-xl border border-gray-800"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-semibold text-gray-100 mb-4">Delete Cards?</h2>
            <p className="text-sm text-gray-400 mb-4">
              Move {selectedIds.length} selected card{selectedIds.length !== 1 ? 's' : ''} to Trash? You can restore them within 30 days.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 rounded bg-gray-900 px-4 py-2 text-sm font-medium text-gray-100 hover:bg-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="flex-1 rounded bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 transition-colors"
              >
                Move to Trash
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Card Size Slider */}
      <CardSizeSlider
        open={showCardSizeSlider}
        onClose={() => setShowCardSizeSlider(false)}
      />

      {/* Card Display Controls */}
      <CardDisplayControls
        open={showCardDisplayControls}
        onClose={() => setShowCardDisplayControls(false)}
      />
    </>
  );
}
