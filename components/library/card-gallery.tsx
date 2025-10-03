/* eslint-disable @next/next/no-img-element */
"use client";

import type { MouseEvent } from "react";
import { Dispatch, SetStateAction, useEffect, useMemo, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { CardModel } from "@/lib/types";
import { LAYOUTS, LayoutMode } from "@/lib/constants";
import { useSelection } from "@/lib/hooks/selection-store";
import { useSettingsStore } from "@/lib/hooks/settings-store";
import { MoveToPawkitModal } from "@/components/modals/move-to-pawkit-modal";

export type CardGalleryProps = {
  cards: CardModel[];
  nextCursor?: string;
  layout: LayoutMode;
  onLayoutChange: (layout: LayoutMode) => void;
  setCards: Dispatch<SetStateAction<CardModel[]>>;
  setNextCursor: Dispatch<SetStateAction<string | undefined>>;
};

function CardGalleryContent({ cards, nextCursor, layout, onLayoutChange, setCards, setNextCursor }: CardGalleryProps) {
  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const searchParams = useSearchParams();
  const selectedIds = useSelection((state) => state.selectedIds);
  const toggleSelection = useSelection((state) => state.toggle);
  const selectExclusive = useSelection((state) => state.selectExclusive);
  const selectRange = useSelection((state) => state.selectRange);
  const clearSelection = useSelection((state) => state.clear);
  const showThumbnails = useSettingsStore((state) => state.showThumbnails);

  const orderedIds = useMemo(() => cards.map((card) => card.id), [cards]);

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
    selectExclusive(card.id);
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
    await Promise.all(
      selectedIds.map((id) => {
        const card = cards.find((item) => item.id === id);
        const collections = card ? Array.from(new Set([slug, ...card.collections])) : [slug];
        return fetch(`/api/cards/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ collections })
        });
      })
    );
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
    await Promise.all(selectedIds.map((id) => fetch(`/api/cards/${id}`, { method: "DELETE" })));
    setCards((prev) => prev.filter((card) => !selectedIds.includes(card.id)));
    clearSelection();
    setShowDeleteConfirm(false);
  };

  const activeCard = cards.find((card) => card.id === activeCardId) ?? null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1">
          {LAYOUTS.map((mode) => (
            <button
              key={mode}
              onClick={() => onLayoutChange(mode)}
              className={`rounded px-3 py-1 text-sm ${layout === mode ? "bg-accent text-gray-900" : "bg-gray-900 text-gray-300"}`}
            >
              {mode}
            </button>
          ))}
        </div>
        <span className="text-xs text-gray-500">{cards.length} card(s)</span>
        <div className="ml-auto flex items-center gap-2">
          <button
            className="rounded bg-gray-800 px-3 py-1 text-sm disabled:opacity-40"
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
        <CardModal
          card={activeCard}
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

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={style}
      className={`group cursor-pointer break-inside-avoid-column rounded border border-gray-800 bg-gray-900 p-3 transition-all ${selected ? "ring-2 ring-accent" : "hover:border-accent/60"} ${isDragging ? "opacity-50" : ""}`}
      onClick={(event) => onClick(event, card)}
      data-id={card.id}
    >
      {showThumbnail && layout !== "compact" && (
        <div
          className={`relative mb-3 w-full overflow-hidden rounded bg-gray-800 ${layout === "masonry" ? "" : "aspect-video"}`}
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
        <h3 className="font-medium text-gray-100">{card.title || card.domain || card.url}</h3>
        <p className="text-xs text-gray-500">{isPending ? "Kit is Fetching" : card.domain ?? card.url}</p>
        {card.collections.length > 0 && layout !== "compact" && (
          <div className="flex flex-wrap gap-1 text-[10px] text-gray-400">
            {card.collections.map((collection) => (
              <span key={collection} className="rounded bg-gray-800 px-2 py-0.5">
                {collection}
              </span>
            ))}
          </div>
        )}
        <span className={`inline-block rounded px-2 py-0.5 text-[10px] ${isPending ? "bg-blue-900/50 text-blue-300" : isError ? "bg-red-900/50 text-red-300" : "bg-gray-800 text-gray-300"}`}>
          {card.status}
        </span>
      </div>
    </div>
  );
}

type CardModalProps = {
  card: CardModel;
  onClose: () => void;
  onUpdate: (card: CardModel) => void;
  onDelete: () => void;
};

function CardModal({ card, onClose, onUpdate, onDelete }: CardModalProps) {
  const [notes, setNotes] = useState(card.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setNotes(card.notes ?? "");
  }, [card.id, card.notes]);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  useEffect(() => {
    const timeout = setTimeout(async () => {
      if (notes === (card.notes ?? "")) return;
      setSaving(true);
      const response = await fetch(`/api/cards/${card.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes })
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        setError(body.message || "Unable to save notes");
      } else {
        const updated = await response.json();
        onUpdate(updated);
        setError(null);
      }
      setSaving(false);
    }, 600);
    return () => clearTimeout(timeout);
  }, [notes, card.id, card.notes, onUpdate]);

  const handleDelete = async () => {
    const confirmed = window.confirm("Delete this card?");
    if (!confirmed) return;
    const response = await fetch(`/api/cards/${card.id}`, { method: "DELETE" });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setError(body.message || "Unable to delete card");
      return;
    }
    onDelete();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6" role="dialog" aria-modal="true">
      <div className="max-h-full w-full max-w-2xl overflow-y-auto rounded bg-gray-950 p-6 shadow-lg">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-100">{card.title || card.domain || card.url}</h2>
            <p className="text-xs text-gray-500">{card.url}</p>
          </div>
          <button className="rounded bg-gray-800 px-2 py-1 text-sm" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="mt-4 space-y-4 text-sm text-gray-300">
          <div className="flex items-center gap-2 text-xs">
            <span className="rounded bg-gray-800 px-2 py-0.5 text-[10px]">{card.status}</span>
            <span>Created {new Date(card.createdAt).toLocaleString()}</span>
          </div>
          {card.image && (
            <div className="relative aspect-video w-full overflow-hidden rounded bg-gray-900">
              <img src={card.image} alt={card.title ?? card.url} className="h-full w-full object-cover" loading="lazy" />
            </div>
          )}
          <div>
            <label className="mb-1 block text-xs text-gray-500" htmlFor="notes">
              Notes
            </label>
            <textarea
              id="notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              className="min-h-[120px] w-full rounded border border-gray-800 bg-gray-900 p-3"
            />
            {saving && <p className="mt-1 text-xs text-gray-500">Saving…</p>}
            {error && <p className="mt-1 text-xs text-rose-400">{error}</p>}
          </div>
          <button className="rounded bg-rose-500 px-3 py-2 text-sm text-gray-950" onClick={handleDelete}>
            Delete card
          </button>
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
