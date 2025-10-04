"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CardModel, CollectionNode } from "@/lib/types";
import { LayoutMode, LAYOUTS } from "@/lib/constants";
import { useSelection } from "@/lib/hooks/selection-store";
import { useCardEvents } from "@/lib/hooks/card-events-store";
import { LibraryWorkspace } from "@/components/library/workspace";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ListFilter, Check, MoreVertical } from "lucide-react";
import { MoveToPawkitModal } from "@/components/modals/move-to-pawkit-modal";

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
};

export function LibraryView({ initialCards, initialNextCursor, initialLayout, collectionsTree, query }: LibraryViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedIds = useSelection((state) => state.selectedIds);
  const clearSelection = useSelection((state) => state.clear);
  const [cards, setCards] = useState<CardModel[]>(initialCards);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

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

  const handleLayoutChange = (layout: LayoutMode) => {
    localStorage.setItem("library-layout", layout);
    const params = new URLSearchParams(searchParams?.toString());
    params.set("layout", layout);
    const currentPath = window.location.pathname;
    router.push(`${currentPath}?${params.toString()}`);
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

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-foreground">Library</h1>
            <p className="text-sm text-muted-foreground">{cards.length} card(s)</p>
          </div>
          <div className="flex items-center gap-2">
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
        <LibraryWorkspace
          initialCards={cards}
          initialNextCursor={initialNextCursor}
          initialQuery={{ ...query, layout: initialLayout }}
          collectionsTree={collectionsTree}
          hideControls={true}
          storageKey="library-layout"
        />
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
