"use client";

import { useState, useEffect } from "react";
import type { CardModel, CollectionNode } from "@/lib/types";
import { useRouter, usePathname } from "next/navigation";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ChevronDown, Check } from "lucide-react";
import { useDemoAwareStore } from "@/lib/hooks/use-demo-aware-store";
import { GlowButton } from "@/components/ui/glow-button";

type DigUpViewProps = {
  initialCards: CardModel[];
  initialNextCursor: string | null;
  initialHasMore: boolean;
  initialTotalCount: number;
  pawkits: CollectionNode[];
  filterMode: "uncategorized" | "all";
  onFilterModeChange: (mode: "uncategorized" | "all") => void;
};

// Helper function to get seen cards from localStorage
function getSeenCards(): Record<string, number> {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(localStorage.getItem('digup-seen-cards') || '{}');
  } catch {
    return {};
  }
}

// Helper function to sort cards: unseen first, then by last seen timestamp (oldest seen first)
function sortCardsBySeenStatus(cards: CardModel[]): CardModel[] {
  const seenCards = getSeenCards();

  return [...cards].sort((a, b) => {
    const aLastSeen = seenCards[a.id] || 0;
    const bLastSeen = seenCards[b.id] || 0;

    // If both unseen or both seen, keep original order
    if ((aLastSeen === 0 && bLastSeen === 0) || (aLastSeen > 0 && bLastSeen > 0)) {
      return aLastSeen - bLastSeen;
    }

    // Unseen cards come first
    if (aLastSeen === 0) return -1;
    if (bLastSeen === 0) return 1;

    return 0;
  });
}

export function DigUpView({
  initialCards,
  initialNextCursor,
  initialHasMore,
  initialTotalCount,
  pawkits,
  filterMode,
  onFilterModeChange
}: DigUpViewProps) {
  const [cards, setCards] = useState(() => sortCardsBySeenStatus(initialCards));
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showPawkitSelector, setShowPawkitSelector] = useState(false);
  const [showSnoozeMenu, setShowSnoozeMenu] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState(initialNextCursor);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [totalCount, setTotalCount] = useState(initialTotalCount);
  const router = useRouter();
  const pathname = usePathname();

  // Detect if we're in demo mode and use appropriate path prefix
  const isDemo = pathname?.startsWith('/demo');
  const pathPrefix = isDemo ? '/demo' : '';

  // Get data store methods for local-first operations
  const { updateCard: updateCardInStore, deleteCard: deleteCardFromStore } = useDemoAwareStore();

  // Re-sort cards when they change or when coming back to the view
  useEffect(() => {
    setCards(sortCardsBySeenStatus(initialCards));
  }, [initialCards]);

  const currentCard = cards[currentIndex];
  const reviewed = currentIndex;

  const loadMoreCards = async () => {
    if (!hasMore || !nextCursor || loadingMore) return;

    setLoadingMore(true);
    try {
      const response = await fetch(`/api/distill?mode=${filterMode}&cursor=${nextCursor}&limit=20`);
      const data = await response.json();

      setCards((prev) => sortCardsBySeenStatus([...prev, ...data.cards]));
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
      router.push(`${pathPrefix}/library`);
    }
  };

  const handleKeep = () => {
    if (!currentCard) return;

    // Mark card as seen by storing timestamp in localStorage
    const seenCards = JSON.parse(localStorage.getItem('digup-seen-cards') || '{}');
    seenCards[currentCard.id] = Date.now();
    localStorage.setItem('digup-seen-cards', JSON.stringify(seenCards));

    moveToNext();
  };

  const handleDelete = async () => {
    if (!currentCard) return;

    setLoading(true);
    try {
      // Use data store - updates IndexedDB first, then syncs to server
      await deleteCardFromStore(currentCard.id);

      // Mark as seen when deleted
      const seenCards = getSeenCards();
      seenCards[currentCard.id] = Date.now();
      localStorage.setItem('digup-seen-cards', JSON.stringify(seenCards));

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
      // Safely handle null collections
      const currentCollections = currentCard.collections || [];
      const nextCollections = Array.from(new Set([slug, ...currentCollections]));

      // Use data store - updates IndexedDB first, then syncs to server
      await updateCardInStore(currentCard.id, { collections: nextCollections });

      // Mark as seen when added to Pawkit
      const seenCards = getSeenCards();
      seenCards[currentCard.id] = Date.now();
      localStorage.setItem('digup-seen-cards', JSON.stringify(seenCards));

      setShowPawkitSelector(false);
      moveToNext();
    } catch (error) {
      console.error("Add to Pawkit error:", error);
      alert("Failed to add to Pawkit");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    router.push(`${pathPrefix}/library`);
  };

  const handleSnooze = (days: number) => {
    if (!currentCard) return;

    // Mark card as snoozed by storing future timestamp
    const snoozeUntil = Date.now() + (days * 24 * 60 * 60 * 1000);
    const seenCards = getSeenCards();
    seenCards[currentCard.id] = snoozeUntil;
    localStorage.setItem('digup-seen-cards', JSON.stringify(seenCards));

    setShowSnoozeMenu(false);
    moveToNext();
  };

  const handleNeverShow = () => {
    if (!currentCard) return;

    // Mark card as permanently hidden with a very far future date
    const neverShow = Date.now() + (365 * 24 * 60 * 60 * 1000 * 10); // 10 years
    const seenCards = getSeenCards();
    seenCards[currentCard.id] = neverShow;
    localStorage.setItem('digup-seen-cards', JSON.stringify(seenCards));

    moveToNext();
  };

  // Keyboard shortcuts for Dig Up
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;

      switch (e.key.toLowerCase()) {
        case 'k':
          e.preventDefault();
          handleKeep();
          break;
        case 'd':
          e.preventDefault();
          handleDelete();
          break;
        case 'p':
          e.preventDefault();
          setShowPawkitSelector(!showPawkitSelector);
          break;
        case 's':
          e.preventDefault();
          setShowSnoozeMenu(!showSnoozeMenu);
          break;
        case 'escape':
          e.preventDefault();
          if (showPawkitSelector) {
            setShowPawkitSelector(false);
          } else if (showSnoozeMenu) {
            setShowSnoozeMenu(false);
          } else {
            handleClose();
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentCard, showPawkitSelector, showSnoozeMenu, loading, loadingMore]);

  if (!currentCard) {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-12 max-w-md text-center backdrop-blur-lg shadow-lg">
          <div className="text-6xl mb-4">🐕</div>
          <h2 className="text-2xl font-semibold text-gray-100 mb-2">All Caught Up!</h2>
          <p className="text-gray-400 mb-6">
            Kit could not find any more cards to dig up.
          </p>
          <GlowButton
            onClick={handleClose}
            variant="primary"
            size="lg"
          >
            Back to Library
          </GlowButton>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={handleClose}
    >
      <div
        className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-lg shadow-2xl max-w-5xl w-full h-[90vh] overflow-hidden flex"
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
              Reviewing {filterMode === "uncategorized" ? "uncategorized" : "all"} cards
            </p>
            <div className="mt-3">
              <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                <span>Progress</span>
                <span>
                  {totalCount > 0
                    ? `${reviewed + 1} of ${totalCount}`
                    : `Card ${reviewed + 1}`}
                </span>
              </div>
              <div className="w-full bg-white/10 rounded-full h-2">
                <div
                  className="bg-accent rounded-full h-2 transition-all duration-300 shadow-glow-accent"
                  style={{
                    width: totalCount > 0
                      ? `${((reviewed + 1) / totalCount) * 100}%`
                      : "100%"
                  }}
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
          <div className="border-t border-white/10 p-6">
            <div className="flex gap-3 mb-3">
              <GlowButton
                onClick={handleKeep}
                disabled={loading || loadingMore}
                variant="primary"
                size="lg"
                className="flex-1"
              >
                {loadingMore ? "Loading..." : "Keep (K)"}
              </GlowButton>
              <GlowButton
                onClick={() => setShowPawkitSelector(!showPawkitSelector)}
                disabled={loading || loadingMore}
                variant="primary"
                size="lg"
                className="flex-1"
              >
                Pawkit (P)
              </GlowButton>
              <GlowButton
                onClick={handleDelete}
                disabled={loading || loadingMore}
                variant="danger"
                size="lg"
                className="flex-1"
              >
                {loading ? "Deleting..." : "Delete (D)"}
              </GlowButton>
            </div>
            <div className="flex gap-3">
              <GlowButton
                onClick={() => setShowSnoozeMenu(!showSnoozeMenu)}
                disabled={loading || loadingMore}
                variant="primary"
                size="sm"
                className="flex-1"
              >
                Snooze (S)
              </GlowButton>
              <GlowButton
                onClick={handleNeverShow}
                disabled={loading || loadingMore}
                variant="danger"
                size="sm"
                className="flex-1"
              >
                Never Show
              </GlowButton>
            </div>
          </div>
        </div>

        {/* Snooze Menu Sidebar */}
        {showSnoozeMenu && (
          <div className="w-80 border-l border-white/10 bg-white/5 backdrop-blur-lg flex flex-col">
            <div className="p-4 border-b border-white/10">
              <h3 className="font-medium text-gray-100">Snooze Card</h3>
              <p className="text-xs text-gray-500 mt-1">See this card again later</p>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              <GlowButton
                onClick={() => handleSnooze(1)}
                disabled={loading}
                variant="primary"
                size="lg"
                className="w-full justify-start"
              >
                Tomorrow
              </GlowButton>
              <GlowButton
                onClick={() => handleSnooze(3)}
                disabled={loading}
                variant="primary"
                size="lg"
                className="w-full justify-start"
              >
                In 3 Days
              </GlowButton>
              <GlowButton
                onClick={() => handleSnooze(7)}
                disabled={loading}
                variant="primary"
                size="lg"
                className="w-full justify-start"
              >
                In 1 Week
              </GlowButton>
              <GlowButton
                onClick={() => handleSnooze(30)}
                disabled={loading}
                variant="primary"
                size="lg"
                className="w-full justify-start"
              >
                In 1 Month
              </GlowButton>
              <GlowButton
                onClick={() => handleSnooze(90)}
                disabled={loading}
                variant="primary"
                size="lg"
                className="w-full justify-start"
              >
                In 3 Months
              </GlowButton>
            </div>
          </div>
        )}

        {/* Pawkit Selector Sidebar */}
        {showPawkitSelector && (
          <div className="w-80 border-l border-white/10 bg-white/5 backdrop-blur-lg flex flex-col">
            <div className="p-4 border-b border-white/10">
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
      <GlowButton
        onClick={() => onSelect(node.slug)}
        disabled={loading}
        style={{ paddingLeft: `${paddingLeft}px` }}
        variant="primary"
        size="sm"
        className="w-full text-left rounded-full pr-4 py-2.5 text-sm disabled:opacity-50 justify-start"
      >
        📁 {node.name}
      </GlowButton>
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
