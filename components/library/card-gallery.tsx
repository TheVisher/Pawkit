/* eslint-disable @next/next/no-img-element */
"use client";

import type { MouseEvent } from "react";
import { Dispatch, SetStateAction, useEffect, useMemo, useState, Suspense, memo } from "react";
import { useSearchParams } from "next/navigation";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { CardModel, CollectionNode } from "@/lib/types";
import { LAYOUTS, LayoutMode } from "@/lib/constants";
import { useSelection } from "@/lib/hooks/selection-store";
import { useSettingsStore } from "@/lib/hooks/settings-store";
import { useViewSettingsStore, type ViewType } from "@/lib/hooks/view-settings-store";
import { useDemoAwareStore } from "@/lib/hooks/use-demo-aware-store";
import { MoveToPawkitModal } from "@/components/modals/move-to-pawkit-modal";
import { CardDetailModal } from "@/components/modals/card-detail-modal";
import { CardContextMenuWrapper } from "@/components/cards/card-context-menu";

export type CardGalleryProps = {
  cards: CardModel[];
  nextCursor?: string;
  layout: LayoutMode;
  onLayoutChange: (layout: LayoutMode) => void;
  setCards: Dispatch<SetStateAction<CardModel[]>>;
  setNextCursor: Dispatch<SetStateAction<string | undefined>>;
  hideControls?: boolean;
  area: "library" | "home" | "den" | "pawkit" | "notes";
};

function CardGalleryContent({ cards, nextCursor, layout, onLayoutChange, setCards, setNextCursor, hideControls = false, area }: CardGalleryProps) {
  const { updateCard: updateCardInStore, deleteCard: deleteCardFromStore } = useDemoAwareStore();
  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [collections, setCollections] = useState<CollectionNode[]>([]);
  const [imageLoadCount, setImageLoadCount] = useState(0);
  const searchParams = useSearchParams();
  const selectedIds = useSelection((state) => state.selectedIds);
  const toggleSelection = useSelection((state) => state.toggle);
  const selectExclusive = useSelection((state) => state.selectExclusive);
  const selectRange = useSelection((state) => state.selectRange);
  const clearSelection = useSelection((state) => state.clear);
  const showThumbnails = useSettingsStore((state) => state.showThumbnails);
  
  // Map area to view type for settings
  const viewType: ViewType = area === "pawkit" ? "pawkits" : (area as ViewType);
  const viewSettings = useViewSettingsStore((state) => state.getSettings(viewType));
  const cardSize = viewSettings.cardSize || 3; // Default to 3 for consistent SSR

  const orderedIds = useMemo(() => cards.map((card) => card.id), [cards]);

  // Handle image loading for masonry layout
  const handleImageLoad = () => {
    setImageLoadCount(prev => prev + 1);
  };

  // Trigger reflow for masonry when images load
  useEffect(() => {
    if (layout === "masonry" && imageLoadCount > 0) {
      // Force a reflow by temporarily changing a CSS property
      const gallery = document.querySelector('[data-masonry-gallery]');
      if (gallery) {
        const element = gallery as HTMLElement;
        const originalColumns = element.style.columns;
        element.style.columns = 'auto';
        // Force reflow
        element.offsetHeight;
        element.style.columns = originalColumns;
      }
    }
  }, [layout, imageLoadCount]);

  // Additional safeguard: Use ResizeObserver to detect layout changes
  useEffect(() => {
    if (layout !== "masonry") return;

    const gallery = document.querySelector('[data-masonry-gallery]');
    if (!gallery) return;

    const resizeObserver = new ResizeObserver(() => {
      // Force a reflow when the container size changes
      const element = gallery as HTMLElement;
      const originalColumns = element.style.columns;
      element.style.columns = 'auto';
      element.offsetHeight;
      element.style.columns = originalColumns;
    });

    resizeObserver.observe(gallery);

    return () => {
      resizeObserver.disconnect();
    };
  }, [layout]);

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
    // Only poll for PENDING cards that have real IDs (not temp IDs)
    const pendingCards = cards.filter(
      (card) => card.status === "PENDING" && !card.id.startsWith("temp_")
    );

    if (pendingCards.length === 0) return;

    let isMounted = true;
    const intervalId = setInterval(async () => {
      // Get fresh pending card IDs to avoid stale requests (exclude temp IDs)
      const currentPendingIds = cards
        .filter((card) => card.status === "PENDING" && !card.id.startsWith("temp_"))
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
            // Ignore errors - card might not exist yet
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

  const handleFetchMetadata = async (cardId: string) => {
    try {
      const response = await fetch(`/api/cards/${cardId}/fetch-metadata`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: cards.find(c => c.id === cardId)?.url })
      });

      if (response.ok) {
        // Fetch the updated card to get fresh metadata
        const updatedCardRes = await fetch(`/api/cards/${cardId}`);
        if (updatedCardRes.ok) {
          const updatedCard = await updatedCardRes.json();

          // Update store
          await updateCardInStore(cardId, {
            title: updatedCard.title,
            description: updatedCard.description,
            image: updatedCard.image,
            domain: updatedCard.domain,
            metadata: updatedCard.metadata
          });

          // Update local state
          setCards((prev) => prev.map(card => 
            card.id === cardId ? { ...card, ...updatedCard } : card
          ));
        }
      }
    } catch (error) {
      console.error("Failed to refresh metadata:", error);
    }
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
      <div className={layoutClass(layout, cardSize)} data-masonry-gallery>
        {cards.map((card) => (
          <CardCell
            key={card.id}
            card={card}
            selected={selectedIds.includes(card.id)}
            showThumbnail={showThumbnails}
            layout={layout}
            area={area}
            onClick={handleCardClick}
            onImageLoad={handleImageLoad}
            onAddToPawkit={(slug) => {
              const collections = Array.from(new Set([slug, ...(card.collections || [])]));
              // If card is in The Den, remove it when adding to regular Pawkit
              const updates: { collections: string[]; inDen?: boolean } = { collections };
              if (card.inDen) {
                updates.inDen = false;
              }
              updateCardInStore(card.id, updates);
              setCards((prev) =>
                prev.map((c) => (c.id === card.id ? { ...c, ...updates } : c))
              );
            }}
            onAddToDen={async () => {
              // Move card to The Den
              const response = await fetch(`/api/cards/${card.id}/move-to-den`, {
                method: "PATCH",
              });
              if (response.ok) {
                setCards((prev) => prev.filter((c) => c.id !== card.id));
              }
            }}
            onDeleteCard={async () => {
              await deleteCardFromStore(card.id);
              setCards((prev) => prev.filter((c) => c.id !== card.id));
            }}
            onRemoveFromPawkit={(slug) => {
              const collections = (card.collections || []).filter(s => s !== slug);
              updateCardInStore(card.id, { collections });
              setCards((prev) =>
                prev.map((c) => (c.id === card.id ? { ...c, collections } : c))
              );
            }}
            onRemoveFromAllPawkits={() => {
              updateCardInStore(card.id, { collections: [] });
              setCards((prev) =>
                prev.map((c) => (c.id === card.id ? { ...c, collections: [] } : c))
              );
            }}
            onFetchMetadata={handleFetchMetadata}
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
  area: "library" | "home" | "den" | "pawkit" | "notes";
  onClick: (event: MouseEvent, card: CardModel) => void;
  onImageLoad?: () => void;
  onAddToPawkit: (slug: string) => void;
  onAddToDen: () => void;
  onDeleteCard: () => void;
  onRemoveFromPawkit: (slug: string) => void;
  onRemoveFromAllPawkits: () => void;
  onFetchMetadata: (cardId: string) => void;
};

function CardCellInner({ card, selected, showThumbnail, layout, area, onClick, onImageLoad, onAddToPawkit, onAddToDen, onDeleteCard, onRemoveFromPawkit, onRemoveFromAllPawkits, onFetchMetadata }: CardCellProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: card.id, data: { cardId: card.id } });
  const style = transform ? { transform: CSS.Translate.toString(transform) } : undefined;
  const isPending = card.status === "PENDING";
  const isError = card.status === "ERROR";
  const isNote = card.type === "md-note" || card.type === "text-note";

  // Map area to view type and get display settings from new view settings store
  const viewType: ViewType = area === "pawkit" ? "pawkits" : (area as ViewType);
  const viewSettings = useViewSettingsStore((state) => state.getSettings(viewType));
  const showCardTitles = viewSettings.showTitles;
  const showCardUrls = viewSettings.showUrls;
  const showCardTags = viewSettings.showTags;
  const cardPadding = viewSettings.cardPadding;

  // Map cardPadding to Tailwind classes: 0=none, 1=xs, 2=sm, 3=md, 4=lg
  const paddingClasses = ["p-0", "p-1", "p-2", "p-4", "p-6"];
  const cardPaddingClass = paddingClasses[cardPadding] || "p-4";

  // Check if text section will render (used for conditional thumbnail margin)
  const hasTextSection = showCardTitles || showCardTags || isPending || isError || isNote || (!card.image && !showThumbnail);

  // Extract excerpt from content for notes
  const getExcerpt = () => {
    if (!isNote || !card.content) return "";
    const plainText = card.content.replace(/[#*_~`]/g, "").replace(/\s+/g, " ").trim();
    return plainText.length > 100 ? plainText.substring(0, 100) + "..." : plainText;
  };

  // Smart title cleaning - removes hashtags and common social media patterns
  const cleanTitle = (title: string) => {
    if (!title) return "";

    // Only clean if it's actually a long title with hashtags or TikTok branding
    // Don't clean short titles or titles that would become empty
    const hasHashtags = title.includes('#');
    const hasTikTokBranding = /(\|\s*TikTok|on\s+TikTok|-\s*TikTok)/i.test(title);

    if (!hasHashtags && !hasTikTokBranding) {
      return title; // Return original if nothing to clean
    }

    // Remove hashtags and everything after them
    let cleaned = title.split(/\s+#/)[0];

    // Remove common TikTok patterns only
    cleaned = cleaned
      .replace(/\s+\|\s+TikTok/gi, "") // Remove "| TikTok"
      .replace(/\s+on TikTok/gi, "") // Remove "on TikTok"
      .replace(/\s*-\s*TikTok/gi, "") // Remove "- TikTok"
      .replace(/\s{2,}/g, " ") // Collapse multiple spaces
      .trim();

    // If cleaned title is too short or empty, return original
    return cleaned.length > 3 ? cleaned : title;
  };

  const rawTitle = card.title || (isNote ? "Untitled Note" : card.domain || card.url);
  const displayTitle = cleanTitle(rawTitle);
  const displaySubtext = isNote ? getExcerpt() : (isPending ? "Kit is Fetching" : "");

  return (
    <CardContextMenuWrapper
      onAddToPawkit={onAddToPawkit}
      onAddToDen={onAddToDen}
      onDelete={onDeleteCard}
      cardCollections={card.collections || []}
      onRemoveFromPawkit={onRemoveFromPawkit}
      onRemoveFromAllPawkits={onRemoveFromAllPawkits}
      onFetchMetadata={() => onFetchMetadata(card.id)}
    >
      <div
        ref={setNodeRef}
        {...listeners}
        {...attributes}
        style={style}
        className={`card-hover group cursor-pointer break-inside-avoid-column rounded-2xl border bg-surface ${cardPaddingClass} transition-all ${
          selected ? "is-selected ring-2 ring-accent border-transparent" : "border-subtle"
        } ${isDragging ? "opacity-50" : ""}`}
        onClick={(event) => onClick(event, card)}
        data-id={card.id}
      >
      {showThumbnail && layout !== "compact" && !isNote && (
        <div
          className={`relative ${hasTextSection ? "mb-3" : ""} w-full overflow-hidden rounded-xl bg-surface-soft ${layout === "masonry" ? "" : "aspect-video"}`}
        >
          {isPending ? (
            <div className="flex h-full w-full items-center justify-center">
              <img
                src="/logo.png"
                alt="Loading..."
                className="h-16 w-16 animate-spin"
                style={{ animationDuration: "2s" }}
              />
            </div>
          ) : isError ? (
            <div className="flex h-full w-full items-center justify-center">
              <img
                src="/logo.png"
                alt="Failed to load"
                className="h-16 w-16 opacity-50"
              />
            </div>
          ) : card.image ? (
            <>
              <img
                src={card.image}
                alt={card.title ?? card.url}
                className={layout === "masonry" ? "block w-full h-auto" : "block h-full w-full object-cover"}
                loading="lazy"
                onLoad={onImageLoad}
                onError={(e) => {
                  // Fallback to logo on image error
                  const target = e.target as HTMLImageElement;
                  target.onerror = null;
                  target.src = "/logo.png";
                  target.className = "h-16 w-16 opacity-50";
                  // Still call onImageLoad for the fallback image
                  onImageLoad?.();
                }}
              />
              {/* URL Pill Overlay */}
              {showCardUrls && card.url && (
                <a
                  href={card.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="absolute bottom-2 left-2 right-2 px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-xs text-white hover:bg-black/60 transition-colors flex items-center justify-center"
                >
                  <span className="truncate max-w-full">
                    {card.domain || new URL(card.url).hostname}
                  </span>
                </a>
              )}
            </>
          ) : !isPending ? (
            // Fallback placeholder when no image is available (but not loading)
            <div className="flex h-full w-full flex-col items-center justify-center gap-3 p-6">
              <div className="text-5xl">🔗</div>
              <div className="text-center space-y-1">
                <div className="text-sm font-medium text-foreground">{card.domain || "Link"}</div>
                {showCardUrls && (
                  <div className="text-xs text-muted-foreground max-w-full truncate px-2">
                    {card.url}
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>
      )}
      {/* Show text section only if there's something to display OR if there's no image (fallback) */}
      {(showCardTitles || showCardTags || isPending || isError || isNote || (!card.image && !showThumbnail)) && (
        <div className="space-y-1 text-sm">
          {showCardTitles && (
            <>
              <div className="flex items-center gap-2">
                {isNote && <span className="text-lg">{card.type === "md-note" ? "📝" : "📄"}</span>}
                <h3 className="flex-1 font-semibold text-foreground transition-colors line-clamp-2">{displayTitle}</h3>
              </div>
              <p className="text-xs text-muted-foreground/80 line-clamp-2">{displaySubtext}</p>
            </>
          )}
          {/* Fallback for cards without images when titles are hidden (but not loading) */}
          {!showCardTitles && !card.image && !isNote && !isPending && (
            <div className="flex flex-col items-center justify-center py-12 bg-surface-soft/50 rounded-lg">
              <div className="text-center space-y-3">
                <div className="text-6xl">🔗</div>
                <div className="text-sm font-medium text-foreground">{card.domain || "Link"}</div>
                <div className="text-xs text-muted-foreground max-w-[200px] truncate px-4">
                  {card.url}
                </div>
              </div>
            </div>
          )}
          {showCardTags && card.collections && card.collections.length > 0 && layout !== "compact" && (
            <div className="flex flex-wrap gap-1 text-[10px] text-muted-foreground">
              {card.collections
                .filter((collection) => !collection.startsWith('den-'))
                .map((collection) => (
                  <span key={collection} className="rounded bg-surface-soft px-2 py-0.5">
                    {collection}
                  </span>
                ))}
              {card.inDen && (
                <span className="rounded bg-surface-soft px-2 py-0.5">
                  The Den
                </span>
              )}
            </div>
          )}
          {(isPending || isError || isNote) && (
            <div className="flex items-center gap-2">
              {isPending && (
                <span className="inline-block rounded px-2 py-0.5 text-[10px] bg-surface-soft text-blue-300">
                  Kit is Fetching
                </span>
              )}
              {isError && (
                <span className="inline-block rounded px-2 py-0.5 text-[10px] bg-red-900/40 text-red-300">
                  Fetch Error
                </span>
              )}
              {isNote && (
                <span className="inline-block rounded px-2 py-0.5 text-[10px] bg-surface-soft text-purple-200">
                  {card.type === "md-note" ? "Markdown" : "Text"}
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
    </CardContextMenuWrapper>
  );
}

const CardCell = memo(CardCellInner, (prevProps, nextProps) => {
  // Custom comparison: only re-render if these specific props change
  return (
    prevProps.card.id === nextProps.card.id &&
    prevProps.card.updatedAt === nextProps.card.updatedAt &&
    prevProps.card.status === nextProps.card.status &&
    prevProps.selected === nextProps.selected &&
    prevProps.showThumbnail === nextProps.showThumbnail &&
    prevProps.layout === nextProps.layout &&
    prevProps.area === nextProps.area
  );
});


function layoutClass(layout: LayoutMode, cardSize: number = 3) {
  // Map cardSize (1-5) to complete Tailwind class strings
  // Mobile: varies 1-3 columns, Tablet: 2-4 columns, Desktop: 2-7 columns
  const sizeToClasses: Record<number, { grid: string; masonry: string; compact: string }> = {
    1: { // Extra small - most columns (mobile: 3 cols)
      grid: "grid grid-cols-3 gap-3 sm:grid-cols-4 xl:grid-cols-7",
      masonry: "columns-3 gap-3 md:columns-4 xl:columns-7 [&>*]:mb-4",
      compact: "grid grid-cols-3 gap-2 md:grid-cols-4 xl:grid-cols-7"
    },
    2: { // Small (mobile: 2 cols)
      grid: "grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5",
      masonry: "columns-2 gap-3 md:columns-3 xl:columns-5 [&>*]:mb-4",
      compact: "grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-5"
    },
    3: { // Medium (mobile: 1 col - default)
      grid: "grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4",
      masonry: "columns-1 gap-4 md:columns-2 xl:columns-4 [&>*]:mb-4",
      compact: "grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-4"
    },
    4: { // Large (mobile: 1 col)
      grid: "grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3",
      masonry: "columns-1 gap-4 md:columns-2 xl:columns-3 [&>*]:mb-4",
      compact: "grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3"
    },
    5: { // Extra large - least columns (mobile: 1 col)
      grid: "grid grid-cols-1 gap-4 sm:grid-cols-1 xl:grid-cols-2",
      masonry: "columns-1 gap-4 md:columns-1 xl:columns-2 [&>*]:mb-4",
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
}
