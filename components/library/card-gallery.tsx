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
import { FileText, Bookmark, Pin, MoreVertical, Trash2, FolderPlus, Eye, PinOff } from "lucide-react";
import { useDemoAwareStore } from "@/lib/hooks/use-demo-aware-store";
import { MoveToPawkitModal } from "@/components/modals/move-to-pawkit-modal";
import { CardContextMenuWrapper } from "@/components/cards/card-context-menu";
import { usePanelStore } from "@/lib/hooks/use-panel-store";
import { UnpinNotesModal } from "@/components/modals/unpin-notes-modal";
import { createPortal } from "react-dom";
import { useRef } from "react";
import { addCollectionWithHierarchy, removeCollectionWithHierarchy } from "@/lib/utils/collection-hierarchy";

// Simple 3-dot menu component for list view
function CardActionsMenu({
  card,
  onDelete,
  onAddToPawkit,
  isPinned,
  onPinToggle,
  onOpenDetails
}: {
  card: CardModel;
  onDelete: () => void;
  onAddToPawkit: (slug: string) => void;
  isPinned: boolean;
  onPinToggle: () => void;
  onOpenDetails: () => void;
}) {
  const [showMenu, setShowMenu] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const isNote = card.type === "md-note" || card.type === "text-note";

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        containerRef.current && !containerRef.current.contains(target) &&
        menuRef.current && !menuRef.current.contains(target)
      ) {
        setShowMenu(false);
      }
    };

    if (showMenu) {
      document.addEventListener("mousedown", handleClickOutside as any);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside as any);
    };
  }, [showMenu]);

  return (
    <div className="relative" ref={containerRef}>
      <button
        ref={buttonRef}
        onClick={(e) => {
          e.stopPropagation();
          if (!showMenu && buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            setMenuPosition({
              top: rect.bottom + 8,
              left: rect.right - 224
            });
          }
          setShowMenu(!showMenu);
        }}
        className="flex items-center justify-center h-9 w-9 rounded text-gray-400 hover:bg-gray-900 hover:text-gray-100 transition-colors"
      >
        <MoreVertical className="h-5 w-5" />
      </button>

      {showMenu && mounted && createPortal(
        <div
          ref={menuRef}
          className="fixed w-56 rounded-lg bg-gray-900 border border-gray-800 shadow-lg py-1 z-[9999]"
          style={{ top: `${menuPosition.top}px`, left: `${menuPosition.left}px` }}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpenDetails();
              setShowMenu(false);
            }}
            className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-gray-800 hover:text-gray-100 transition-colors flex items-center gap-2"
          >
            <Eye className="h-4 w-4" />
            Open
          </button>
          {isNote && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onPinToggle();
                setShowMenu(false);
              }}
              className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-gray-800 hover:text-gray-100 transition-colors flex items-center gap-2"
            >
              {isPinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
              {isPinned ? "Unpin from Sidebar" : "Pin to Sidebar"}
            </button>
          )}
          <div className="border-t border-gray-800 my-1" />
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
              setShowMenu(false);
            }}
            className="w-full px-4 py-2 text-left text-sm text-rose-400 hover:bg-gray-800 hover:text-rose-300 transition-colors flex items-center gap-2"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </button>
        </div>,
        document.body
      )}
    </div>
  );
}

export type CardGalleryProps = {
  cards: CardModel[];
  nextCursor?: string;
  layout: LayoutMode;
  onLayoutChange: (layout: LayoutMode) => void;
  setCards: Dispatch<SetStateAction<CardModel[]>>;
  setNextCursor: Dispatch<SetStateAction<string | undefined>>;
  hideControls?: boolean;
  area: "library" | "home" | "den" | "pawkit" | "notes";
  currentPawkitSlug?: string; // If set, hide this pawkit's badge (viewing inside this pawkit)
};

function CardGalleryContent({ cards, nextCursor, layout, onLayoutChange, setCards, setNextCursor, hideControls = false, area, currentPawkitSlug }: CardGalleryProps) {
  const { updateCard: updateCardInStore, deleteCard: deleteCardFromStore, collections: allCollections } = useDemoAwareStore();
  const openCardDetails = usePanelStore((state) => state.openCardDetails);
  const openBulkOperations = usePanelStore((state) => state.openBulkOperations);
  const restorePreviousContent = usePanelStore((state) => state.restorePreviousContent);

  // Detect if right panel is embedded (left floating + right anchored)
  const isPanelOpen = usePanelStore((state) => state.isOpen);
  const panelMode = usePanelStore((state) => state.mode);
  const leftMode = usePanelStore((state) => state.leftMode);
  const isRightEmbedded = leftMode === "floating" && panelMode === "anchored" && isPanelOpen;

  // Debug: Log embedded state changes
  useEffect(() => {
  }, [isRightEmbedded]);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [imageLoadCount, setImageLoadCount] = useState(0);
  const [showUnpinModal, setShowUnpinModal] = useState(false);
  const searchParams = useSearchParams();
  // Use single selector to ensure re-renders when pinnedNoteIds changes
  const pinnedNoteIds = useSettingsStore((state) => state.pinnedNoteIds);
  const pinNote = useSettingsStore((state) => state.pinNote);
  const unpinNote = useSettingsStore((state) => state.unpinNote);
  const selectedIds = useSelection((state) => state.selectedIds);
  const toggleSelection = useSelection((state) => state.toggle);
  const selectExclusive = useSelection((state) => state.selectExclusive);
  const selectRange = useSelection((state) => state.selectRange);
  const clearSelection = useSelection((state) => state.clear);
  const showThumbnails = useSettingsStore((state) => state.showThumbnails);
  
  // Map area to view type for settings
  const viewType: ViewType = area === "pawkit" ? "pawkits" : (area as ViewType);
  const viewSettings = useViewSettingsStore((state) => state.getSettings(viewType));
  // Use a state to ensure consistent SSR and prevent hydration mismatches
  const [cardSize, setCardSize] = useState(50);
  const [cardSpacing, setCardSpacing] = useState(16);
  const [isHydrated, setIsHydrated] = useState(false);

  // Mark as hydrated after component mounts
  useEffect(() => {
    setIsHydrated(true);
    setCardSize(viewSettings.cardSize || 50);
    setCardSpacing(viewSettings.cardSpacing || 16);
  }, [viewSettings.cardSize, viewSettings.cardSpacing]);

  const orderedIds = useMemo(() => cards.map((card) => card.id), [cards]);

  // Open bulk operations panel when 2+ cards are selected
  useEffect(() => {
    if (selectedIds.length >= 2) {
      openBulkOperations();
    } else if (selectedIds.length < 2) {
      // Restore previous panel content when selection is cleared (0 or 1 card)
      restorePreviousContent();
    }
  }, [selectedIds.length, openBulkOperations, restorePreviousContent]);

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
  // Debounced to prevent excessive updates during ContentPanel transitions (Chromium fix)
  useEffect(() => {
    if (layout !== "masonry") return;

    const gallery = document.querySelector('[data-masonry-gallery]');
    if (!gallery) return;

    let resizeTimeout: NodeJS.Timeout;

    const resizeObserver = new ResizeObserver((entries) => {
      // Debounce resize events to avoid flickering during transitions
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        for (const entry of entries) {

          const element = gallery as HTMLElement;
          const computedStyle = window.getComputedStyle(element);
        }
      }, 350); // Wait for ContentPanel transition to complete (300ms + 50ms buffer)
    });

    resizeObserver.observe(gallery);

    return () => {
      clearTimeout(resizeTimeout);
      resizeObserver.disconnect();
    };
  }, [layout]);

  // Collections are now provided by useDemoAwareStore - no need to fetch from API

  // Removed polling - cards are updated via the data store sync queue
  // The data store handles pending card updates automatically

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
    openCardDetails(card.id);
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
          // Add cache-busting parameter to image URL to prevent browser caching
          const updatedCardWithCacheBust = {
            ...updatedCard,
            image: updatedCard.image ? `${updatedCard.image}?t=${Date.now()}` : updatedCard.image
          };
          
          setCards((prev) => prev.map(card => 
            card.id === cardId ? { ...card, ...updatedCardWithCacheBust } : card
          ));
        }
      }
    } catch (error) {
      console.error("Failed to refresh metadata:", error);
    }
  };

  // Pin/Unpin handlers
  const handlePinToSidebar = (cardId: string) => {
    const success = pinNote(cardId);
    if (!success) {
      // Max limit reached, show unpin modal
      setShowUnpinModal(true);
    }
  };

  const handleUnpinFromSidebar = (cardId: string) => {
    unpinNote(cardId);
  };

  // Get pinned notes for unpin modal
  const pinnedNotes = useMemo(() => {
    return pinnedNoteIds
      .map(id => cards.find(card => card.id === id))
      .filter(Boolean) as CardModel[];
  }, [pinnedNoteIds, cards]);

  // Compute layout config for card grid
  const layoutConfig = getLayoutConfig(layout, cardSize, cardSpacing);

  return (
    <div className="space-y-4">
      {!hideControls && (
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs text-muted-foreground">{cards.length} card(s)</span>
          {selectedIds.length > 0 && (
            <span className="text-xs text-accent font-medium">
              {selectedIds.length} selected
            </span>
          )}
        </div>
      )}
      <div>
        {layout === "list" ? (
            // Table-style list view like Fabric
            <div className="w-full overflow-x-auto">
              <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-subtle text-xs text-muted-foreground">
                  <th className="text-left py-3 px-4 font-medium">Name</th>
                  <th className="text-left py-3 px-4 font-medium">Type</th>
                  <th className="text-left py-3 px-4 font-medium">Tags</th>
                  <th className="text-left py-3 px-4 font-medium">Date Created</th>
                  <th className="text-left py-3 px-4 font-medium">Date Modified</th>
                  <th className="text-left py-3 px-4 font-medium w-16"></th>
                </tr>
              </thead>
              <tbody>
                {cards.map((card) => {
                  const selected = selectedIds.includes(card.id);
                  const isNote = card.type === "md-note" || card.type === "text-note";
                  const isPinned = pinnedNoteIds.includes(card.id);
                  const displayTitle = card.title || card.url || "Untitled";
                  const formattedCreatedDate = card.createdAt ? new Date(card.createdAt).toLocaleDateString() : "-";
                  const formattedModifiedDate = card.updatedAt ? new Date(card.updatedAt).toLocaleDateString() : "-";
                  const kind = isNote ? "Note" : "Bookmark";

                  return (
                    <CardContextMenuWrapper
                      key={card.id}
                      onAddToPawkit={(slug) => {
                        const collections = addCollectionWithHierarchy(card.collections || [], slug, allCollections);
                        updateCardInStore(card.id, { collections });
                        setCards((prev) =>
                          prev.map((c) => (c.id === card.id ? { ...c, collections } : c))
                        );
                      }}
                      onDelete={async () => {
                        await deleteCardFromStore(card.id);
                        setCards((prev) => prev.filter((c) => c.id !== card.id));
                      }}
                      cardCollections={card.collections || []}
                      onRemoveFromPawkit={(slug) => {
                        const collections = removeCollectionWithHierarchy(card.collections || [], slug, allCollections, true);
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
                      onFetchMetadata={() => handleFetchMetadata(card.id)}
                      cardId={card.id}
                      cardType={card.type}
                      isPinned={isPinned}
                      onPinToSidebar={() => handlePinToSidebar(card.id)}
                      onUnpinFromSidebar={() => handleUnpinFromSidebar(card.id)}
                    >
                      <tr
                        className={`border-b border-subtle hover:bg-white/5 cursor-pointer transition-colors ${
                          selected ? "bg-accent/10" : ""
                        }`}
                        onClick={(e) => handleCardClick(e, card)}
                      >
                        <td className="py-3 px-4 max-w-xs">
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="flex items-center justify-center h-8 w-8 rounded-lg backdrop-blur-sm bg-accent/20 text-accent flex-shrink-0">
                              {isNote ? (
                                <FileText size={16} className="text-purple-400" />
                              ) : card.image ? (
                                <img
                                  src={card.image}
                                  alt=""
                                  className="w-5 h-5 rounded object-cover"
                                />
                              ) : (
                                <Bookmark size={16} className="text-muted-foreground" />
                              )}
                            </span>
                            <span className="text-sm text-foreground font-medium truncate min-w-0 flex-1">{displayTitle}</span>
                            {isPinned && <Pin size={14} className="text-purple-400 flex-shrink-0" />}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-sm text-muted-foreground">{kind}</span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex flex-wrap gap-1">
                            {card.collections && card.collections.length > 0 ? (
                              card.collections.slice(0, 2).map((collection) => (
                                <span key={collection} className="text-xs text-muted-foreground bg-surface-soft px-2 py-0.5 rounded">
                                  {collection}
                                </span>
                              ))
                            ) : (
                              <span className="text-sm text-muted-foreground">-</span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-sm text-muted-foreground">{formattedCreatedDate}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-sm text-muted-foreground">{formattedModifiedDate}</span>
                        </td>
                        <td className="py-3 px-4">
                          <div onClick={(e) => e.stopPropagation()} className="relative z-50 flex justify-center">
                            <CardActionsMenu
                              card={card}
                              onDelete={async () => {
                                await deleteCardFromStore(card.id);
                                setCards((prev) => prev.filter((c) => c.id !== card.id));
                              }}
                              onAddToPawkit={(slug) => {
                                const collections = addCollectionWithHierarchy(card.collections || [], slug, allCollections);
                                updateCardInStore(card.id, { collections });
                                setCards((prev) =>
                                  prev.map((c) => (c.id === card.id ? { ...c, collections } : c))
                                );
                              }}
                              isPinned={isPinned}
                              onPinToggle={() => {
                                if (isPinned) {
                                  handleUnpinFromSidebar(card.id);
                                } else {
                                  handlePinToSidebar(card.id);
                                }
                              }}
                              onOpenDetails={() => {
                                openCardDetails(card.id);
                              }}
                            />
                          </div>
                        </td>
                      </tr>
                    </CardContextMenuWrapper>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className={layoutConfig.className} style={layoutConfig.style} data-masonry-gallery>
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
                const collections = addCollectionWithHierarchy(card.collections || [], slug, allCollections);
                updateCardInStore(card.id, { collections });
                setCards((prev) =>
                  prev.map((c) => (c.id === card.id ? { ...c, collections } : c))
                );
              }}
              onDeleteCard={async () => {
                await deleteCardFromStore(card.id);
                setCards((prev) => prev.filter((c) => c.id !== card.id));
              }}
              onRemoveFromPawkit={(slug) => {
                const collections = removeCollectionWithHierarchy(card.collections || [], slug, allCollections, true);
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
              isPinned={pinnedNoteIds.includes(card.id)}
              onPinToSidebar={() => handlePinToSidebar(card.id)}
              onUnpinFromSidebar={() => handleUnpinFromSidebar(card.id)}
            />
          ))}
          </div>
        )}
      {nextCursor && (
        <button className="w-full rounded bg-gray-900 py-2 text-sm" onClick={handleLoadMore}>
          Load more
        </button>
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

      {/* Unpin Notes Modal */}
      <UnpinNotesModal
        open={showUnpinModal}
        onClose={() => setShowUnpinModal(false)}
        pinnedNotes={pinnedNotes}
        onUnpin={handleUnpinFromSidebar}
      />

      {/* Bulk operations are now handled in the right sidebar panel */}
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
  onDeleteCard: () => void;
  onRemoveFromPawkit: (slug: string) => void;
  onRemoveFromAllPawkits: () => void;
  onFetchMetadata: (cardId: string) => void;
  isPinned?: boolean;
  onPinToSidebar?: () => void;
  onUnpinFromSidebar?: () => void;
};

function CardCellInner({ card, selected, showThumbnail, layout, area, onClick, onImageLoad, onAddToPawkit, onDeleteCard, onRemoveFromPawkit, onRemoveFromAllPawkits, onFetchMetadata, isPinned, onPinToSidebar, onUnpinFromSidebar }: CardCellProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: card.id, data: { cardId: card.id } });
  const style = transform ? { transform: CSS.Translate.toString(transform) } : undefined;
  const isPending = card.status === "PENDING";
  const isError = card.status === "ERROR";
  const isNote = card.type === "md-note" || card.type === "text-note";

  // Detect movie/video domains for film sprocket holes
  const isMovie = card.url && (
    card.url.includes('imdb.com') ||
    card.url.includes('themoviedb.org') ||
    card.url.includes('rottentomatoes.com') ||
    card.url.includes('letterboxd.com') ||
    card.url.includes('justwatch.com') ||
    card.url.includes('movies.') ||
    card.url.includes('film.')
  );

  // Map area to view type and get display settings from new view settings store
  const viewType: ViewType = area === "pawkit" ? "pawkits" : (area as ViewType);
  const viewSettings = useViewSettingsStore((state) => state.getSettings(viewType));
  const showLabels = viewSettings.showLabels; // URL pills on bookmarks, title pills on notes
  const showMetadata = viewSettings.showMetadata; // Card info below (for bookmarks)
  const showCardTags = viewSettings.showTags;
  const showPreview = viewSettings.showPreview; // Plain text preview for notes
  const cardPadding = viewSettings.cardPadding;

  // Convert cardPadding from 1-100 scale to pixels for smooth scaling
  // Scale from 0px (1) to 32px (100) for smooth transitions
  const cardPaddingPx = Math.round((cardPadding - 1) / 99 * 32);

  // Check if text section will render (used for conditional thumbnail margin)
  const hasTextSection = showMetadata || showCardTags || isPending || isError || isNote || (!card.image && !showThumbnail);

  // Extract excerpt from content for notes - preserves line breaks
  const getExcerpt = () => {
    if (!isNote || !card.content) return "";
    // Strip markdown symbols but keep line breaks
    const plainText = card.content.replace(/[#*_~`]/g, "").trim();
    return plainText.length > 400 ? plainText.substring(0, 400) + "..." : plainText;
  };

  const excerptText = getExcerpt();

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

  // Smart title handling - if title is a URL, extract clean hostname instead
  const getRawTitle = () => {
    if (isNote) return card.title || "Untitled Note";

    // If card has no title or title looks like a URL, use clean hostname
    if (!card.title || card.title.startsWith('http://') || card.title.startsWith('https://')) {
      try {
        return new URL(card.url).hostname;
      } catch {
        return card.domain || card.url;
      }
    }

    return card.title;
  };

  const rawTitle = getRawTitle();
  const displayTitle = cleanTitle(rawTitle);
  const displaySubtext = (isNote && showPreview) ? getExcerpt() : (isPending ? "Kit is Fetching" : "");

  return (
    <CardContextMenuWrapper
      onAddToPawkit={onAddToPawkit}
      onDelete={onDeleteCard}
      cardCollections={card.collections || []}
      onRemoveFromPawkit={onRemoveFromPawkit}
      onRemoveFromAllPawkits={onRemoveFromAllPawkits}
      onFetchMetadata={() => onFetchMetadata(card.id)}
      cardId={card.id}
      cardType={card.type}
      isPinned={isPinned}
      onPinToSidebar={onPinToSidebar}
      onUnpinFromSidebar={onUnpinFromSidebar}
    >
      <div
        ref={setNodeRef}
        {...listeners}
        {...attributes}
        style={{
          ...style,
          padding: `${cardPaddingPx}px`
        }}
        className={`card-hover group cursor-pointer break-inside-avoid-column rounded-2xl border bg-surface transition-all select-none ${
          selected ? "is-selected ring-2 ring-accent border-transparent" : "border-subtle"
        } ${isDragging ? "opacity-50" : ""}`}
        onClick={(event) => onClick(event, card)}
        data-id={card.id}
      >
      {showThumbnail && layout !== "compact" && !isNote && (
        <div
          className={`relative ${hasTextSection ? "mb-3" : ""} w-full overflow-hidden rounded-xl bg-surface-soft ${layout === "masonry" ? "" : "aspect-video"} group/filmstrip`}
          style={{
            // Chromium rendering optimization to prevent flickering during transitions
            transform: 'translateZ(0)',
          }}
        >
          {/* Film sprocket holes for movie cards */}
          {isMovie && (
            <>
              <style>{`
                @keyframes filmScroll {
                  0% {
                    transform: translateY(0);
                  }
                  100% {
                    transform: translateY(-50%);
                  }
                }
              `}</style>
              {/* Left side sprocket holes */}
              <div className="absolute left-2 top-0 bottom-0 overflow-hidden pointer-events-none z-[5]">
                <div className="flex flex-col items-center gap-3.5 py-0.5 group-hover/filmstrip:[animation:filmScroll_10s_linear_infinite]">
                  {[...Array(50)].map((_, i) => (
                    <div
                      key={`left-${i}`}
                      className="w-3 h-3 bg-background border-2 border-gray-900/50 flex-shrink-0"
                      style={{
                        boxShadow: 'inset 0 1px 3px rgba(0, 0, 0, 0.5)',
                        borderRadius: '4px'
                      }}
                    ></div>
                  ))}
                </div>
              </div>
              {/* Right side sprocket holes */}
              <div className="absolute right-2 top-0 bottom-0 overflow-hidden pointer-events-none z-[5]">
                <div className="flex flex-col items-center gap-3.5 py-0.5 group-hover/filmstrip:[animation:filmScroll_10s_linear_infinite]">
                  {[...Array(50)].map((_, i) => (
                    <div
                      key={`right-${i}`}
                      className="w-3 h-3 bg-background border-2 border-gray-900/50 flex-shrink-0"
                      style={{
                        boxShadow: 'inset 0 1px 3px rgba(0, 0, 0, 0.5)',
                        borderRadius: '4px'
                      }}
                    ></div>
                  ))}
                </div>
              </div>
            </>
          )}
          {isPending ? (
            <div className="flex h-full w-full items-center justify-center">
              <div className="h-16 w-16 rounded-full border-4 border-gray-600 border-t-purple-500 animate-spin"></div>
            </div>
          ) : isError ? (
            <div className="flex h-full w-full items-center justify-center">
              <div className="h-16 w-16 rounded-full bg-gray-600 flex items-center justify-center">
                <span className="text-white text-2xl">⚠️</span>
              </div>
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
              {showLabels && card.url && (
                <a
                  href={card.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="absolute bottom-2 left-8 right-8 px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-xs text-white hover:bg-black/60 transition-colors flex items-center justify-center"
                  style={{
                    // Chromium rendering optimization for backdrop-blur during transitions
                    willChange: 'width',
                    transform: 'translateZ(0)',
                  }}
                >
                  <span className="truncate max-w-full">
                    {(() => {
                      try {
                        return new URL(card.url).hostname;
                      } catch {
                        return card.domain || card.url;
                      }
                    })()}
                  </span>
                </a>
              )}
            </>
          ) : !isPending ? (
            // Fallback placeholder when no image is available (but not loading)
            <div className="relative flex h-full w-full min-h-[140px] flex-col items-center justify-start pt-8 pb-12 px-6">
              <div className="text-gray-500">
                <Bookmark size={48} />
              </div>
              {/* URL Pill for no-image cards */}
              {showLabels && card.url && (
                <a
                  href={card.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="absolute bottom-2 left-8 right-8 px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-xs text-white hover:bg-black/60 transition-colors flex items-center justify-center"
                  style={{
                    // Chromium rendering optimization for backdrop-blur during transitions
                    willChange: 'width',
                    transform: 'translateZ(0)',
                  }}
                >
                  <span className="truncate max-w-full">
                    {(() => {
                      try {
                        return new URL(card.url).hostname;
                      } catch {
                        return card.domain || card.url;
                      }
                    })()}
                  </span>
                </a>
              )}
            </div>
          ) : null}
        </div>
      )}
      {/* Notes: Document-shaped card with portrait aspect ratio */}
      {isNote && (
        <div className="relative w-full group/note" style={{ aspectRatio: '3 / 2', transform: 'translateZ(0)' }}>
          {/* Document-styled container with binder hole aesthetic */}
          <div className="absolute inset-0 flex flex-col p-4 pl-8 bg-surface-soft rounded-lg border border-purple-500/20 shadow-lg shadow-purple-900/10 overflow-hidden">

            {/* Ring binder holes on the left side */}
            <div className="absolute left-2 top-0 bottom-0 flex flex-col justify-evenly items-center py-2 pointer-events-none z-[5]">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="w-3 h-3 rounded-full bg-background border border-gray-400/35"
                  style={{
                    boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.3)'
                  }}
                ></div>
              ))}
            </div>

            {/* Margin line to the right of binder holes - with gradient fade at top and bottom */}
            <div className="absolute left-[27px] top-0 bottom-0 w-[1px] pointer-events-none z-[15]"
                 style={{
                   background: 'linear-gradient(to bottom, transparent 0%, rgba(156, 163, 175, 0.15) 15px, rgba(156, 163, 175, 0.15) calc(100% - 15px), transparent 100%)'
                 }}>
            </div>

            {/* Glass pill title overlay at top - slightly narrower for note cards to avoid binder holes */}
            {showLabels && (
              <div className="absolute top-2 left-8 right-8 z-20">
                <div
                  className="px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center"
                  style={{
                    // Chromium rendering optimization for backdrop-blur during transitions
                    willChange: 'width',
                    transform: 'translateZ(0)',
                  }}
                >
                  <span className="truncate max-w-full text-xs text-white">
                    {displayTitle}
                  </span>
                </div>
              </div>
            )}

            {/* Content layer - preview text with proper formatting */}
            <div className="relative z-10 w-full h-full flex flex-col">
              {/* Preview text area - plain text only (fast and performant) */}
              {showPreview && card.content && (
                <div className="flex-1 overflow-hidden pt-10 pb-2">
                  <div className="text-xs text-muted-foreground/70 leading-relaxed whitespace-pre-wrap line-clamp-[14]">
                    {excerptText}
                  </div>
                </div>
              )}

              {/* Spacer when no content */}
              {!card.content && <div className="flex-1"></div>}

              {/* Bottom section - tags and metadata */}
              <div className="space-y-2 mt-auto">
                {showCardTags && card.collections && card.collections.length > 0 && layout !== "compact" && (
                  <div className="flex flex-wrap gap-1 text-[10px] text-muted-foreground">
                    {card.collections
                      .filter((collection) =>
                        !collection.startsWith('den-')
                      )
                      .map((collection) => (
                        <span key={collection} className="rounded bg-surface-soft/80 backdrop-blur-sm px-2 py-0.5 border border-purple-500/10">
                          {collection}
                        </span>
                      ))}
                    {card.collections?.includes('the-den') && (
                      <span className="rounded bg-surface-soft/80 backdrop-blur-sm px-2 py-0.5 border border-purple-500/10">
                        The Den
                      </span>
                    )}
                  </div>
                )}
                {(showCardTags || isPinned) && (
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {showCardTags && (
                        <span className="inline-block rounded px-2 py-0.5 text-[10px] bg-purple-500/20 text-purple-200 border border-purple-500/20">
                          {card.type === "md-note" ? "Markdown" : "Text"}
                        </span>
                      )}
                    </div>
                    {isPinned && (
                      <div className="flex items-center gap-1 text-purple-400">
                        <Pin size={12} className="flex-shrink-0" />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Show text section for non-notes */}
      {!isNote && (showMetadata || showCardTags || isPending || isError || (!card.image && !showThumbnail)) && (
        <div className="space-y-1 text-sm">
          {showMetadata && (
            <div className="flex items-center gap-2">
              <span className="text-gray-500">
                <Bookmark size={16} />
              </span>
              <h3 className="flex-1 font-semibold text-foreground transition-colors line-clamp-2">{displayTitle}</h3>
            </div>
          )}
          {displaySubtext && showMetadata && (
            <p className="text-xs text-muted-foreground/80 line-clamp-2">{displaySubtext}</p>
          )}
          {/* Fallback for cards without images when metadata is hidden (but not loading) */}
          {!showMetadata && !card.image && !isNote && !isPending && (
            <div className="flex flex-col items-center justify-center py-12 bg-surface-soft/50 rounded-lg">
              <div className="text-center space-y-3">
                <div className="text-gray-500">
                  <Bookmark size={48} />
                </div>
                <div className="text-sm font-medium text-foreground">
                  {(() => {
                    try {
                      return new URL(card.url).hostname;
                    } catch {
                      return card.domain || "Link";
                    }
                  })()}
                </div>
                <div className="text-xs text-muted-foreground max-w-[200px] truncate px-4">
                  {card.url}
                </div>
              </div>
            </div>
          )}
          {showCardTags && card.collections && card.collections.length > 0 && layout !== "compact" && (
            <div className="flex flex-wrap gap-1 text-[10px] text-muted-foreground">
              {card.collections
                .filter((collection) =>
                  !collection.startsWith('den-')
                )
                .map((collection) => (
                  <span key={collection} className="rounded bg-surface-soft px-2 py-0.5">
                    {collection}
                  </span>
                ))}
              {card.collections?.includes('the-den') && (
                <span className="rounded bg-surface-soft px-2 py-0.5">
                  The Den
                </span>
              )}
            </div>
          )}
          {(isPending || isError) && (
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
    prevProps.area === nextProps.area &&
    prevProps.isPinned === nextProps.isPinned
  );
});


function getLayoutConfig(layout: LayoutMode, cardSize: number = 50, cardSpacing: number = 16): { className: string; style: React.CSSProperties } {
  // Calculate minimum card width based on cardSize (1-100 scale)
  // 1 = 150px (smallest), 100 = 500px (largest)
  // Smaller range makes transitions smoother as grid recalculates columns
  const minCardWidth = 150 + ((cardSize - 1) / 99) * 350; // Ranges from 150px to 500px

  // Gap in pixels - use the cardSpacing value directly for smooth scaling
  const gapPx = cardSpacing;

  // For masonry layout, we need to use CSS columns
  // Use minCardWidth directly (no rounding) for smooth slider transitions
  const columnWidth = minCardWidth;

  switch (layout) {
    case "masonry":
      return {
        className: "[&>*]:mb-4",
        style: {
          columns: `${columnWidth}px`,
          columnGap: `${gapPx}px`,
          // Chromium rendering optimizations for CSS columns during transitions
          willChange: 'columns',
          transform: 'translateZ(0)',
        }
      };
    case "list":
      return {
        className: "flex flex-col",
        style: {
          gap: `${gapPx}px`
        }
      };
    case "compact":
      return {
        className: "grid",
        style: {
          gridTemplateColumns: `repeat(auto-fill, minmax(${minCardWidth}px, 1fr))`,
          gap: `${gapPx}px`
        }
      };
    case "grid":
    default:
      return {
        className: "grid",
        style: {
          gridTemplateColumns: `repeat(auto-fill, minmax(${minCardWidth}px, 1fr))`,
          gap: `${gapPx}px`
        }
      };
  }
}
