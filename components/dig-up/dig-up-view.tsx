"use client";

import { useState } from "react";
import type { CardModel, CollectionNode } from "@/lib/types";
import { useRouter } from "next/navigation";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ChevronDown, Check } from "lucide-react";

type DigUpViewProps = {
  initialCards: CardModel[];
  initialNextCursor: string | null;
  initialHasMore: boolean;
  pawkits: CollectionNode[];
  filterMode: "uncategorized" | "all";
  onFilterModeChange: (mode: "uncategorized" | "all") => void;
};

export function DigUpView({
  initialCards,
  initialNextCursor,
  initialHasMore,
  pawkits,
  filterMode,
  onFilterModeChange
}: DigUpViewProps) {
  const [cards, setCards] = useState(initialCards);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showPawkitSelector, setShowPawkitSelector] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState(initialNextCursor);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const router = useRouter();

  const currentCard = cards[currentIndex];
  const reviewed = currentIndex;

  const loadMoreCards = async () => {
    if (!hasMore || !nextCursor || loadingMore) return;

    setLoadingMore(true);
    try {
      const response = await fetch(`/api/distill?mode=${filterMode}&cursor=${nextCursor}&limit=20`);
      const data = await response.json();

      setCards((prev) => [...prev, ...data.cards]);
      setNextCursor(data.nextCursor);
      setHasMore(data.hasMore);
    } catch (error) {
      console.error("Failed to load more cards:", error);
    } finally {
      setLoadingMore(false);
    }
  };

  const moveToNext = async () => {
    if (currentIndex < cards.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else if (hasMore) {
      // Load more cards before moving to next
      await loadMoreCards();
      setCurrentIndex(currentIndex + 1);
    } else {
      // All cards reviewed
      router.push("/library");
    }
  };

  const handleKeep = () => {
    moveToNext();
  };

  const handleDelete = async () => {
    if (!currentCard) return;

    setLoading(true);
    try {
      await fetch(`/api/cards/${currentCard.id}`, { method: "DELETE" });
      moveToNext();
    } catch (error) {
      alert("Failed to delete card");
    } finally {
      setLoading(false);
    }
  };

  const handleAddToPawkit = async (slug: string) => {
    if (!currentCard) return;

    setLoading(true);
    try {
      const nextCollections = Array.from(new Set([slug, ...currentCard.collections]));
      await fetch(`/api/cards/${currentCard.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ collections: nextCollections })
      });

      setShowPawkitSelector(false);
      moveToNext();
    } catch (error) {
      alert("Failed to add to Pawkit");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    router.push("/library");
  };

  if (!currentCard) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="bg-gray-950 rounded-lg p-12 max-w-md text-center border border-gray-800">
          <div className="text-6xl mb-4">🐕</div>
          <h2 className="text-2xl font-semibold text-gray-100 mb-2">All Caught Up!</h2>
          <p className="text-gray-400 mb-6">
            Kit could not find any more cards to dig up.
          </p>
          <button
            onClick={handleClose}
            className="rounded bg-accent px-6 py-2 text-sm font-medium text-gray-900 hover:bg-accent/90"
          >
            Back to Library
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={handleClose}
    >
      <div
        className="bg-gray-950 rounded-lg border border-gray-800 shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Main Card Area */}
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <div className="border-b border-gray-800 p-6">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-2xl font-semibold text-gray-100">🐕 Dig Up</h2>
              <button
                onClick={handleClose}
                className="text-gray-400 hover:text-gray-200 text-2xl leading-none"
              >
                ×
              </button>
            </div>

            {/* Filter Mode Selector */}
            <div className="flex items-center gap-3 mb-3">
              <DropdownMenu>
                <DropdownMenuTrigger className="flex items-center gap-2 rounded-lg bg-surface-soft px-3 py-2 text-sm text-foreground hover:bg-surface transition-colors">
                  {filterMode === "uncategorized" ? "Uncategorized Only" : "All Cards"}
                  <ChevronDown className="h-4 w-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem
                    onClick={() => onFilterModeChange("uncategorized")}
                    className="cursor-pointer relative pl-8"
                  >
                    {filterMode === "uncategorized" && (
                      <Check className="absolute left-2 h-4 w-4" />
                    )}
                    Uncategorized Only
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => onFilterModeChange("all")}
                    className="cursor-pointer relative pl-8"
                  >
                    {filterMode === "all" && (
                      <Check className="absolute left-2 h-4 w-4" />
                    )}
                    All Cards
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <p className="text-sm text-gray-400">
              Reviewing {filterMode === "uncategorized" ? "uncategorized" : "all"} cards {hasMore ? "(loading more as you go)" : ""}
            </p>
            <div className="mt-3">
              <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                <span>Progress</span>
                <span>Card {reviewed + 1}{hasMore ? "+" : ` of ${cards.length}`}</span>
              </div>
              <div className="w-full bg-gray-800 rounded-full h-2">
                <div
                  className="bg-accent rounded-full h-2 transition-all duration-300"
                  style={{ width: hasMore ? "100%" : `${((reviewed + 1) / cards.length) * 100}%` }}
                />
              </div>
            </div>
          </div>

          {/* Card Preview */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-2xl mx-auto">
              {currentCard.image && (
                <div className="mb-6 rounded-lg overflow-hidden bg-gray-900">
                  <img
                    src={currentCard.image}
                    alt={currentCard.title || "Card preview"}
                    className="w-full h-auto max-h-96 object-contain"
                  />
                </div>
              )}
              <h3 className="text-2xl font-semibold text-gray-100 mb-3">
                {currentCard.title || currentCard.url}
              </h3>
              <p className="text-sm text-gray-400 mb-4">{currentCard.domain || currentCard.url}</p>
              {currentCard.description && (
                <p className="text-gray-300 mb-4">{currentCard.description}</p>
              )}
              {currentCard.notes && (
                <div className="bg-gray-900/50 rounded-lg p-4 mb-4">
                  <div className="text-xs text-gray-500 mb-1">Notes</div>
                  <p className="text-gray-300 text-sm whitespace-pre-wrap">{currentCard.notes}</p>
                </div>
              )}
              {currentCard.collections && currentCard.collections.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {currentCard.collections.map((collection) => (
                    <span
                      key={collection}
                      className="inline-block rounded bg-gray-800 px-3 py-1 text-xs text-gray-300"
                    >
                      📁 {collection}
                    </span>
                  ))}
                </div>
              )}
              <div className="text-xs text-gray-500">
                Saved {new Date(currentCard.createdAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric"
                })}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="border-t border-gray-800 p-6">
            <div className="flex gap-3">
              <button
                onClick={handleKeep}
                disabled={loading || loadingMore}
                className="flex-1 rounded bg-gray-800 px-6 py-3 text-sm font-medium text-gray-100 hover:bg-gray-700 transition-colors disabled:opacity-50"
              >
                {loadingMore ? "Loading..." : "Keep"}
              </button>
              <button
                onClick={() => setShowPawkitSelector(!showPawkitSelector)}
                disabled={loading || loadingMore}
                className="flex-1 rounded bg-accent px-6 py-3 text-sm font-medium text-gray-900 hover:bg-accent/90 transition-colors disabled:opacity-50"
              >
                Add to Pawkit
              </button>
              <button
                onClick={handleDelete}
                disabled={loading || loadingMore}
                className="flex-1 rounded bg-rose-600 px-6 py-3 text-sm font-medium text-white hover:bg-rose-700 transition-colors disabled:opacity-50"
              >
                {loading ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>

        {/* Pawkit Selector Sidebar */}
        {showPawkitSelector && (
          <div className="w-80 border-l border-gray-800 bg-gray-900/50 flex flex-col">
            <div className="p-4 border-b border-gray-800">
              <h3 className="font-medium text-gray-100">Add to Pawkit</h3>
              <p className="text-xs text-gray-500 mt-1">Select a Pawkit to organize this card</p>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-1">
              {pawkits.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-8">No Pawkits available</p>
              ) : (
                pawkits.map((pawkit) => (
                  <PawkitTreeItem
                    key={pawkit.id}
                    node={pawkit}
                    depth={0}
                    onSelect={handleAddToPawkit}
                    loading={loading}
                  />
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

type PawkitTreeItemProps = {
  node: CollectionNode;
  depth: number;
  onSelect: (slug: string) => void;
  loading: boolean;
};

function PawkitTreeItem({ node, depth, onSelect, loading }: PawkitTreeItemProps) {
  const hasChildren = node.children && node.children.length > 0;
  const paddingLeft = 16 + (depth * 16); // Base padding 16px + depth indent

  return (
    <>
      <button
        onClick={() => onSelect(node.slug)}
        disabled={loading}
        style={{ paddingLeft: `${paddingLeft}px` }}
        className="w-full text-left rounded pr-4 py-2.5 text-sm bg-gray-800 text-gray-200 hover:bg-gray-700 transition-colors disabled:opacity-50"
      >
        📁 {node.name}
      </button>
      {hasChildren && node.children.map((child) => (
        <PawkitTreeItem
          key={child.id}
          node={child}
          depth={depth + 1}
          onSelect={onSelect}
          loading={loading}
        />
      ))}
    </>
  );
}
