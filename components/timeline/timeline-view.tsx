"use client";

import { useState, useEffect, MouseEvent, useMemo } from "react";
import { CardModel, CollectionNode } from "@/lib/types";
import { LAYOUTS, LayoutMode } from "@/lib/constants";
import { format } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Check } from "lucide-react";
import { useSelection } from "@/lib/hooks/selection-store";
import { MoveToPawkitModal } from "@/components/modals/move-to-pawkit-modal";
import { useDataStore } from "@/lib/stores/data-store";
import { usePanelStore } from "@/lib/hooks/use-panel-store";

type TimelineGroup = {
  date: string;
  cards: CardModel[];
};

type TimelineViewProps = {
  initialGroups: TimelineGroup[];
};

const DATE_RANGES = [
  { label: "7 days", value: 7 },
  { label: "30 days", value: 30 },
  { label: "90 days", value: 90 },
  { label: "6 months", value: 180 },
  { label: "1 year", value: 365 }
] as const;

function layoutClass(layout: LayoutMode): string {
  switch (layout) {
    case "grid":
      return "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4";
    case "masonry":
      return "columns-1 gap-4 sm:columns-2 lg:columns-3 xl:columns-4";
    case "compact":
      return "grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8";
    case "list":
      return "flex flex-col gap-2";
    default:
      return "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4";
  }
}

function CardCell({
  card,
  layout,
  isSelected,
  onClick
}: {
  card: CardModel;
  layout: LayoutMode;
  isSelected: boolean;
  onClick: (e: MouseEvent) => void;
}) {
  const isCompact = layout === "compact";
  const isList = layout === "list";
  const isMasonry = layout === "masonry";

  if (isList) {
    return (
      <div
        onClick={onClick}
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
      onClick={onClick}
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
        {card.collections.length > 0 && !isCompact && (
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
}

function TimeRangeDropdown({
  selectedRange,
  onRangeChange
}: {
  selectedRange: number;
  onRangeChange: (days: number) => void;
}) {
  const currentLabel = DATE_RANGES.find(r => r.value === selectedRange)?.label || "30 days";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2 rounded-lg bg-surface-soft px-3 py-2 text-sm text-foreground hover:bg-surface transition-colors">
        {currentLabel}
        <ChevronDown className="h-4 w-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {DATE_RANGES.map(({ label, value }) => (
          <DropdownMenuItem
            key={value}
            onClick={() => onRangeChange(value)}
            className="cursor-pointer relative pl-8"
          >
            {selectedRange === value && (
              <Check className="absolute left-2 h-4 w-4" />
            )}
            {label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function TimelineView({ initialGroups }: TimelineViewProps) {
  const [groups, setGroups] = useState<TimelineGroup[]>(initialGroups);
  const [layout, setLayout] = useState<LayoutMode>("grid");
  const [selectedRange, setSelectedRange] = useState(30);
  const [loading, setLoading] = useState(false);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const openCardDetails = usePanelStore((state) => state.openCardDetails);
  const [collections, setCollections] = useState<CollectionNode[]>([]);

  const selectedIds = useSelection((state) => state.selectedIds);
  const toggleSelection = useSelection((state) => state.toggle);
  const selectExclusive = useSelection((state) => state.selectExclusive);
  const selectRange = useSelection((state) => state.selectRange);
  const clearSelection = useSelection((state) => state.clear);

  const { updateCard: updateCardInStore, deleteCard: deleteCardFromStore } = useDataStore();

  // Flatten all cards into ordered array for shift-select
  const orderedIds = useMemo(
    () => groups.flatMap((group) => group.cards.map((card) => card.id)),
    [groups]
  );

  // Get all cards as flat array
  const allCards = useMemo(
    () => groups.flatMap((group) => group.cards),
    [groups]
  );


  // Fetch collections for the modal
  useEffect(() => {
    const fetchCollections = async () => {
      try {
        const response = await fetch("/api/pawkits");
        if (response.ok) {
          const data = await response.json();
          setCollections(data.tree);
        }
      } catch (error) {
      }
    };
    fetchCollections();
  }, []);

  // Load preferences from localStorage on mount
  useEffect(() => {
    const savedLayout = localStorage.getItem("timeline-layout") as LayoutMode;
    const savedRange = localStorage.getItem("timeline-range");

    if (savedLayout && LAYOUTS.includes(savedLayout)) {
      setLayout(savedLayout);
    }

    if (savedRange) {
      const range = parseInt(savedRange, 10);
      if ([7, 30, 90, 180, 365].includes(range)) {
        setSelectedRange(range);
        // Load data for saved range if different from default
        if (range !== 30) {
          handleRangeChange(range);
        }
      }
    }
  }, []);

  // Save layout preference when it changes
  const handleLayoutChange = (newLayout: LayoutMode) => {
    setLayout(newLayout);
    localStorage.setItem("timeline-layout", newLayout);
  };

  const handleRangeChange = async (days: number) => {
    setSelectedRange(days);
    localStorage.setItem("timeline-range", days.toString());

    // Show "Kit is digging" warning for long ranges
    if (days >= 180) {
      setLoading(true);
    }

    try {
      const response = await fetch(`/api/timeline?days=${days}`);
      if (response.ok) {
        const data = await response.json();
        setGroups(data.groups);
      }
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  const formatDateHeader = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    return format(date, "MMMM do, yyyy");
  };

  const handleCardClick = (event: MouseEvent, card: CardModel) => {
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
    // Open modal
    openCardDetails(card.id);
  };

  const handleBulkMove = () => {
    if (!selectedIds.length) return;
    setShowMoveModal(true);
  };

  const handleConfirmMove = async (slug: string) => {
    if (!selectedIds.length) return;

    // Get all cards from all groups
    const allCards = groups.flatMap(group => group.cards);

    // Use data store - updates IndexedDB first, then syncs to server
    await Promise.all(
      selectedIds.map((id) => {
        const card = allCards.find((item) => item.id === id);
        const collections = card ? Array.from(new Set([slug, ...card.collections])) : [slug];
        return updateCardInStore(id, { collections });
      })
    );

    // Update cards in groups
    setGroups((prev) =>
      prev.map((group) => ({
        ...group,
        cards: group.cards.map((card) =>
          selectedIds.includes(card.id)
            ? { ...card, collections: Array.from(new Set([slug, ...card.collections])) }
            : card
        )
      }))
    );
    clearSelection();
  };

  const handleBulkDelete = () => {
    if (!selectedIds.length) return;
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    // Use data store - updates IndexedDB first, then syncs to server
    await Promise.all(selectedIds.map((id) => deleteCardFromStore(id)));

    // Remove deleted cards from groups
    setGroups((prev) =>
      prev.map((group) => ({
        ...group,
        cards: group.cards.filter((card) => !selectedIds.includes(card.id))
      }))
      .filter((group) => group.cards.length > 0) // Remove empty groups
    );
    clearSelection();
    setShowDeleteConfirm(false);
  };

  const totalCards = groups.reduce((sum, group) => sum + group.cards.length, 0);

  return (
    <>
      <div className="space-y-6">
        {/* Header with controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-foreground">Timeline</h1>
            <p className="text-sm text-muted-foreground">{totalCards} card(s)</p>
          </div>
          <div className="flex items-center gap-2">
            {/* Time Range Dropdown - Timeline-specific control */}
            <TimeRangeDropdown
              selectedRange={selectedRange}
              onRangeChange={handleRangeChange}
            />
          </div>
        </div>

      {/* Loading state */}
      {loading && (
        <div className="rounded-lg border border-gray-800 bg-gray-900/40 p-8 text-center">
          <div className="text-lg font-medium text-gray-300 mb-2">Kit is digging this up...</div>
          <div className="text-sm text-gray-500">This may take a moment for longer time ranges</div>
        </div>
      )}

      {/* Timeline groups */}
      {!loading && groups.length === 0 && (
        <div className="rounded-lg border border-gray-800 bg-gray-900/40 p-8 text-center">
          <div className="text-lg font-medium text-gray-300 mb-2">No cards found</div>
          <div className="text-sm text-gray-500">Try a different time range or add some cards!</div>
        </div>
      )}

      {!loading && groups.map((group) => (
        <div key={group.date} className="space-y-4">
          {/* Date Header */}
          <div className="flex items-center gap-3">
            <h2 className="text-3xl font-medium text-gray-300">
              {formatDateHeader(group.date)}
            </h2>
            <button className="rounded bg-gray-800 px-2 py-1 text-xs text-gray-400 hover:bg-gray-700">
              Summary
            </button>
          </div>

          {/* Cards for this date */}
          <div className={layoutClass(layout)}>
            {group.cards.map((card) => (
              <CardCell
                key={card.id}
                card={card}
                layout={layout}
                isSelected={selectedIds.includes(card.id)}
                onClick={(e) => handleCardClick(e, card)}
              />
            ))}
          </div>
        </div>
      ))}

      {/* Footer stats */}
      {!loading && groups.length > 0 && (
        <div className="text-center text-sm text-gray-500">
          Showing {totalCards} card{totalCards !== 1 ? 's' : ''} across {groups.length} day{groups.length !== 1 ? 's' : ''}
        </div>
      )}
      </div>

      <MoveToPawkitModal
        open={showMoveModal}
        onClose={() => setShowMoveModal(false)}
        onConfirm={handleConfirmMove}
      />

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
    </>
  );
}
