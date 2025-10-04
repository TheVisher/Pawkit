/* eslint-disable @next/next/no-img-element */
"use client";

import type { MouseEvent } from "react";
import { Dispatch, SetStateAction, useEffect, useMemo, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { CardModel, CollectionNode } from "@/lib/types";
import { LAYOUTS, LayoutMode } from "@/lib/constants";
import { useSelection } from "@/lib/hooks/selection-store";
import { useSettingsStore } from "@/lib/hooks/settings-store";
import { useDataStore } from "@/lib/stores/data-store";
import { MoveToPawkitModal } from "@/components/modals/move-to-pawkit-modal";
import { CardDetailModal } from "@/components/modals/card-detail-modal";

export type CardGalleryProps = {
  cards: CardModel[];
  nextCursor?: string;
  layout: LayoutMode;
  onLayoutChange: (layout: LayoutMode) => void;
  setCards: Dispatch<SetStateAction<CardModel[]>>;
  setNextCursor: Dispatch<SetStateAction<string | undefined>>;
  hideControls?: boolean;
};

function CardGalleryContent({ cards, nextCursor, layout, onLayoutChange, setCards, setNextCursor, hideControls = false }: CardGalleryProps) {
  const updateCardInStore = useDataStore(state => state.updateCard);
  const deleteCardFromStore = useDataStore(state => state.deleteCard);
  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [collections, setCollections] = useState<CollectionNode[]>([]);
  const searchParams = useSearchParams();
  const selectedIds = useSelection((state) => state.selectedIds);
  const toggleSelection = useSelection((state) => state.toggle);
  const selectExclusive = useSelection((state) => state.selectExclusive);
  const selectRange = useSelection((state) => state.selectRange);
  const clearSelection = useSelection((state) => state.clear);
  const showThumbnails = useSettingsStore((state) => state.showThumbnails);

  const orderedIds = useMemo(() => cards.map((card) => card.id), [cards]);

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
        console.error("Failed to fetch collections:", error);
      }
    };
    fetchCollections();
  }, []);

  // Poll for pending cards to update their metadata
  useEffect(() => {
    const pendingCards = cards.filter((card) => card.status === "PENDING");
    if (pendingCards.length === 0) return;

    let isMounted = true;
    const intervalId = setInterval(async () => {
      // Get fresh pending card IDs to avoid stale requests
      const currentPendingIds = cards
        .filter((card) => card.status === "PENDING")
        .map((card) => card.id);

      if (currentPendingIds.length === 0) {
        clearInterval(intervalId);
        return;
      }

      // Fetch updated cards
      const updates = await Promise.all(
        currentPendingIds.map(async (id) => {
          try {
            const response = await fetch(`/api/cards/${id}`);
            if (response.ok) {
              const updated = await response.json();
              return updated;
            }
          } catch {
            // Ignore errors
          }
          return null;
        })
      );

      // Only update state if component is still mounted
      if (!isMounted) return;

      // Update cards that changed
      setCards((prev) =>
        prev.map((card) => {
          const update = updates.find((u) => u?.id === card.id);
          if (update && update.status !== "PENDING") {
            return update;
          }
          return card;
        })
      );
    }, 3000); // Poll every 3 seconds

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [cards, setCards]);

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
    // Only open modal, don't add to selection
    setActiveCardId(card.id);
  };

  const handleLoadMore = async () => {
    if (!nextCursor) return;
    const params = new URLSearchParams(searchParams?.toString());
    params.set("cursor", nextCursor);
    const response = await fetch(`/api/cards?${params.toString()}`);
    if (!response.ok) return;
    const data = await response.json();
    setCards((prev) => [...prev, ...data.items]);
    setNextCursor(data.nextCursor);
  };

  const handleBulkMove = () => {
    if (!selectedIds.length) return;
    setShowMoveModal(true);
  };

  const handleConfirmMove = async (slug: string) => {
    if (!selectedIds.length) return;

    // Update all cards in store (optimistic)
    await Promise.all(
      selectedIds.map((id) => {
        const card = cards.find((item) => item.id === id);
        const collections = card ? Array.from(new Set([slug, ...card.collections])) : [slug];
        return updateCardInStore(id, { collections });
      })
    );

    // Update local state
    setCards((prev) =>
      prev.map((card) =>
        selectedIds.includes(card.id)
          ? { ...card, collections: Array.from(new Set([slug, ...card.collections])) }
          : card
      )
    );
    clearSelection();
  };

  const handleBulkDelete = () => {
    if (!selectedIds.length) return;
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    // Delete all cards from store (optimistic)
    await Promise.all(selectedIds.map((id) => deleteCardFromStore(id)));

    // Update local state
    setCards((prev) => prev.filter((card) => !selectedIds.includes(card.id)));
    clearSelection();
    setShowDeleteConfirm(false);
  };

  const activeCard = cards.find((card) => card.id === activeCardId) ?? null;

  return (
    <div className="space-y-4">
      {!hideControls && (
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs text-muted-foreground">{cards.length} card(s)</span>
          <div className="ml-auto flex items-center gap-2">
            <button
              className="rounded-lg bg-surface-soft px-3 py-1 text-sm text-muted-foreground transition hover:text-foreground disabled:opacity-40"
              disabled={!selectedIds.length}
              onClick={handleBulkMove}
            >
              Move to Pawkit
            </button>
            <button
              className="rounded bg-rose-500 px-3 py-1 text-sm text-gray-950 disabled:opacity-40"
              disabled={!selectedIds.length}
              onClick={handleBulkDelete}
            >
              Delete selected
            </button>
          </div>
        </div>
      )}
      <div className={layoutClass(layout)}>
        {cards.map((card) => (
          <CardCell
            key={card.id}
            card={card}
            selected={selectedIds.includes(card.id)}
            showThumbnail={showThumbnails}
            layout={layout}
            onClick={handleCardClick}
          />
        ))}
      </div>
      {nextCursor && (
        <button className="w-full rounded bg-gray-900 py-2 text-sm" onClick={handleLoadMore}>
          Load more
        </button>
      )}
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

      {activeCard && (
        <CardDetailModal
          card={activeCard}
          collections={collections}
          onClose={() => setActiveCardId(null)}
          onUpdate={(updated) =>
            setCards((prev) => prev.map((item) => (item.id === updated.id ? updated : item)))
          }
          onDelete={() => {
            setCards((prev) => prev.filter((item) => item.id !== activeCard.id));
            clearSelection();
            setActiveCardId(null);
          }}
        />
      )}
    </div>
  );
}

export function CardGallery(props: CardGalleryProps) {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <CardGalleryContent {...props} />
    </Suspense>
  );
}

type CardCellProps = {
  card: CardModel;
  selected: boolean;
  showThumbnail: boolean;
  layout: LayoutMode;
  onClick: (event: MouseEvent, card: CardModel) => void;
};

function CardCell({ card, selected, showThumbnail, layout, onClick }: CardCellProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: card.id, data: { cardId: card.id } });
  const style = transform ? { transform: CSS.Translate.toString(transform) } : undefined;
  const isPending = card.status === "PENDING";
  const isError = card.status === "ERROR";
  const isNote = card.type === "md-note" || card.type === "text-note";

  // Extract excerpt from content for notes
  const getExcerpt = () => {
    if (!isNote || !card.content) return "";
    const plainText = card.content.replace(/[#*_~`]/g, "").replace(/\s+/g, " ").trim();
    return plainText.length > 100 ? plainText.substring(0, 100) + "..." : plainText;
  };

  const displayTitle = card.title || (isNote ? "Untitled Note" : card.domain || card.url);
  const displaySubtext = isNote ? getExcerpt() : (isPending ? "Kit is Fetching" : card.domain ?? card.url);

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={style}
      className={`card-hover group cursor-pointer break-inside-avoid-column rounded-2xl border bg-surface p-4 transition-all ${
        selected ? "is-selected ring-2 ring-accent border-transparent" : "border-subtle"
      } ${isDragging ? "opacity-50" : ""}`}
      onClick={(event) => onClick(event, card)}
      data-id={card.id}
    >
      {showThumbnail && layout !== "compact" && !isNote && (
        <div
          className={`relative mb-3 w-full overflow-hidden rounded-xl bg-surface-soft ${layout === "masonry" ? "" : "aspect-video"}`}
        >
          {isPending ? (
            <div className="flex h-full w-full items-center justify-center">
              <img
                src="/PawkitPaw.png"
                alt="Loading..."
                className="h-16 w-16 animate-spin"
                style={{ animationDuration: "2s" }}
              />
            </div>
          ) : isError ? (
            <div className="flex h-full w-full items-center justify-center">
              <img
                src="/PawkitLogo.png"
                alt="Failed to load"
                className="h-16 w-16 opacity-50"
              />
            </div>
          ) : card.image ? (
            <img
              src={card.image}
              alt={card.title ?? card.url}
              className={layout === "masonry" ? "block w-full h-auto" : "block h-full w-full object-cover"}
              loading="lazy"
              onError={(e) => {
                // Fallback to logo on image error
                const target = e.target as HTMLImageElement;
                target.onerror = null;
                target.src = "/PawkitLogo.png";
                target.className = "h-16 w-16 opacity-50";
              }}
            />
          ) : null}
        </div>
      )}
      <div className="space-y-1 text-sm">
        <div className="flex items-center gap-2">
          {isNote && <span className="text-lg">{card.type === "md-note" ? "📝" : "📄"}</span>}
          <h3 className="flex-1 font-semibold text-foreground transition-colors">{displayTitle}</h3>
        </div>
        <p className="text-xs text-muted-foreground/80 line-clamp-2">{displaySubtext}</p>
        {card.collections.length > 0 && layout !== "compact" && (
          <div className="flex flex-wrap gap-1 text-[10px] text-muted-foreground">
            {card.collections.map((collection) => (
              <span key={collection} className="rounded bg-surface-soft px-2 py-0.5">
                {collection}
              </span>
            ))}
          </div>
        )}
        <div className="flex items-center gap-2">
          <span
            className={`inline-block rounded px-2 py-0.5 text-[10px] ${
              isPending
                ? "bg-surface-soft text-blue-300"
                : isError
                ? "bg-red-900/40 text-red-300"
                : "bg-surface-soft text-muted-foreground"
            }`}
          >
            {card.status}
          </span>
          {isNote && (
            <span className="inline-block rounded px-2 py-0.5 text-[10px] bg-surface-soft text-purple-200">
              {card.type === "md-note" ? "Markdown" : "Text"}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}


function layoutClass(layout: LayoutMode) {
  switch (layout) {
    case "masonry":
      return "columns-1 gap-4 md:columns-2 xl:columns-4 [&>*]:mb-4";
    case "list":
      return "flex flex-col gap-3";
    case "compact":
      return "grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-4";
    case "grid":
    default:
      return "grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4";
  }
}
