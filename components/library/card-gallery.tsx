/* eslint-disable @next/next/no-img-element */
"use client";

import type { MouseEvent } from "react";
import { Dispatch, SetStateAction, useEffect, useMemo, useState, Suspense, memo, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { CardModel, CollectionNode } from "@/lib/types";
import { LAYOUTS, LayoutMode } from "@/lib/constants";
import { useSelection } from "@/lib/hooks/selection-store";
import { useSettingsStore } from "@/lib/hooks/settings-store";
import { useViewSettingsStore, type ViewKey } from "@/lib/hooks/view-settings-store";
import { FileText, Bookmark, Pin, MoreVertical, Trash2, FolderPlus, Eye, PinOff, ImageIcon, X, Calendar, Paperclip } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import { CardImage, useCardImageUrl } from "@/components/cards/card-image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDataStore } from "@/lib/stores/data-store";
import { MoveToPawkitModal } from "@/components/modals/move-to-pawkit-modal";
import { CardContextMenuWrapper } from "@/components/cards/card-context-menu";
import { usePanelStore } from "@/lib/hooks/use-panel-store";
import { UnpinNotesModal } from "@/components/modals/unpin-notes-modal";
import { useToastStore } from "@/lib/stores/toast-store";
import { useEventStore } from "@/lib/hooks/use-event-store";
import { useFileStore } from "@/lib/stores/file-store";
import { createPortal } from "react-dom";
import { useRef } from "react";
import { addCollectionWithHierarchy, removeCollectionWithHierarchy } from "@/lib/utils/collection-hierarchy";
import { MuuriGridComponent, MuuriItem, type MuuriGridRef } from "@/components/library/muuri-grid";
import { useDragStore } from "@/lib/stores/drag-store";

// Helper to get display type for a card (Note, PDF, Image, Bookmark, etc.)
function getCardDisplayType(card: CardModel): string {
  // Check if it's a file card first
  if (card.isFileCard) {
    const category = card.metadata?.fileCategory as string | undefined;

    switch (category) {
      case 'pdf':
        return 'PDF';
      case 'image':
        return 'Image';
      case 'document':
        return 'Document';
      case 'spreadsheet':
        return 'Spreadsheet';
      case 'video':
        return 'Video';
      case 'audio':
        return 'Audio';
      default:
        return 'File';
    }
  }

  // Check if it's a note
  const isNote = card.type === "md-note" || card.type === "text-note";
  if (isNote) {
    return 'Note';
  }

  // Default to Bookmark
  return 'Bookmark';
}

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

// Small component to render list view card icon with proper blob URL handling
function ListRowCardIcon({ card }: { card: CardModel }) {
  const { imageUrl, isFileCard } = useCardImageUrl(card);
  const isNote = card.type === "md-note" || card.type === "text-note";

  if (isNote) {
    return <FileText size={16} className="text-accent" />;
  }

  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt=""
        className="w-5 h-5 rounded object-cover"
      />
    );
  }

  // Fallback icon
  return isFileCard ? (
    <ImageIcon size={16} className="text-muted-foreground" />
  ) : (
    <Bookmark size={16} className="text-muted-foreground" />
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
  const { updateCard: updateCardInStore, deleteCard: deleteCardFromStore, collections: allCollections } = useDataStore();
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
  // Thumbnail modal state
  const [showThumbnailModal, setShowThumbnailModal] = useState(false);
  const [thumbnailCardId, setThumbnailCardId] = useState<string | null>(null);
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [thumbnailPreviewLoaded, setThumbnailPreviewLoaded] = useState(false);
  const [thumbnailPreviewError, setThumbnailPreviewError] = useState(false);
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
  const uiStyle = useSettingsStore((state) => state.uiStyle);

  // Muuri grid ref for masonry layout
  const muuriRef = useRef<MuuriGridRef>(null);

  // Get files from file store to check for attachments
  const files = useFileStore((state) => state.files);
  const cardsWithAttachments = useMemo(() => {
    const cardIdSet = new Set<string>();
    files.forEach((file) => {
      if (file.cardId) {
        cardIdSet.add(file.cardId);
      }
    });
    return cardIdSet;
  }, [files]);

  // Map area to view key for settings
  // For pawkits, use pawkit-specific key (e.g., "pawkit-my-collection") if slug provided
  const viewKey: ViewKey = area === "pawkit" && currentPawkitSlug
    ? `pawkit-${currentPawkitSlug}`
    : (area === "pawkit" ? "pawkits" : area);
  const viewSettings = useViewSettingsStore((state) => state.getSettings(viewKey));
  const setViewSpecific = useViewSettingsStore((state) => state.setViewSpecific);
  const setSortBy = useViewSettingsStore((state) => state.setSortBy);
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

  // Trigger Muuri relayout when card dimensions or display settings change
  useEffect(() => {
    if (layout === "masonry" && muuriRef.current) {
      // Small delay to let React update the DOM after toggle changes
      const timeoutId = setTimeout(() => {
        muuriRef.current?.refreshItems();
      }, 150);
      return () => clearTimeout(timeoutId);
    }
  }, [
    cardSize,
    cardSpacing,
    viewSettings.cardPadding,
    viewSettings.showLabels,
    viewSettings.showMetadata,
    viewSettings.showPreview,
    showThumbnails,
    layout,
  ]);

  // Apply content type filtering and sorting from viewSettings
  const filteredAndSortedCards = useMemo(() => {
    let result = [...cards];

    // Apply content type filter
    const contentTypeFilter = viewSettings.contentTypeFilter || [];
    if (contentTypeFilter.length > 0) {
      result = result.filter((card) => {
        // Map card type to filter type
        const cardType = card.type || "url";
        const isNote = cardType === "md-note" || cardType === "text-note";
        const isFileCard = card.isFileCard;
        const fileCategory = card.metadata?.fileCategory as string | undefined;

        // Check if card matches any of the selected content types
        return contentTypeFilter.some((filterType) => {
          switch (filterType) {
            case "url":
              return !isNote && !isFileCard;
            case "md-note":
              return isNote;
            case "image":
              return isFileCard && fileCategory === "image";
            case "video":
              return isFileCard && fileCategory === "video";
            case "audio":
              return isFileCard && fileCategory === "audio";
            case "document":
              return isFileCard && (fileCategory === "document" || fileCategory === "pdf" || fileCategory === "spreadsheet");
            case "other":
              return isFileCard && !["image", "video", "audio", "document", "pdf", "spreadsheet"].includes(fileCategory || "");
            default:
              return false;
          }
        });
      });
    }

    // Apply sorting
    const sortBy = viewSettings.sortBy || "updatedAt";
    const sortOrder = viewSettings.sortOrder || "desc";
    const customOrder = (viewSettings.viewSpecific?.customOrder as string[] | undefined) || [];

    // For custom sort, use the saved order
    if (sortBy === "custom" && customOrder.length > 0) {
      const orderMap = new Map(customOrder.map((id, index) => [id, index]));
      result.sort((a, b) => {
        const indexA = orderMap.get(a.id) ?? Infinity;
        const indexB = orderMap.get(b.id) ?? Infinity;
        return indexA - indexB;
      });
      return result;
    }

    result.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case "createdAt":
          comparison = new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
          break;
        case "updatedAt":
          comparison = new Date(a.updatedAt || 0).getTime() - new Date(b.updatedAt || 0).getTime();
          break;
        case "title":
          const titleA = (a.title || a.url || "").toLowerCase();
          const titleB = (b.title || b.url || "").toLowerCase();
          comparison = titleA.localeCompare(titleB);
          break;
        case "url":
          const domainA = (a.domain || a.url || "").toLowerCase();
          const domainB = (b.domain || b.url || "").toLowerCase();
          comparison = domainA.localeCompare(domainB);
          break;
        default:
          comparison = new Date(a.updatedAt || 0).getTime() - new Date(b.updatedAt || 0).getTime();
      }

      return sortOrder === "asc" ? comparison : -comparison;
    });

    return result;
  }, [cards, viewSettings.contentTypeFilter, viewSettings.sortBy, viewSettings.sortOrder, viewSettings.viewSpecific?.customOrder]);

  const orderedIds = useMemo(() => filteredAndSortedCards.map((card) => card.id), [filteredAndSortedCards]);

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

  // Collections are now provided by useDataStore - no need to fetch from API

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

    // Show toast
    const count = selectedIds.length;
    useToastStore.getState().success(`${count} card${count !== 1 ? 's' : ''} deleted`);

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

  // Thumbnail modal handlers
  const handleOpenThumbnailModal = (cardId: string) => {
    const card = cards.find(c => c.id === cardId);
    setThumbnailCardId(cardId);
    setThumbnailUrl(card?.image || "");
    setThumbnailPreviewLoaded(!!card?.image);
    setThumbnailPreviewError(false);
    setShowThumbnailModal(true);
  };

  const handleSaveThumbnail = async () => {
    if (!thumbnailCardId) return;
    try {
      const newImage = thumbnailUrl.trim() || null;
      await updateCardInStore(thumbnailCardId, { image: newImage });
      setCards((prev) =>
        prev.map((c) => (c.id === thumbnailCardId ? { ...c, image: newImage } : c))
      );
      setShowThumbnailModal(false);
      setThumbnailCardId(null);
    } catch (error) {
    }
  };

  // Get pinned notes for unpin modal
  const pinnedNotes = useMemo(() => {
    return pinnedNoteIds
      .map(id => cards.find(card => card.id === id))
      .filter(Boolean) as CardModel[];
  }, [pinnedNoteIds, cards]);

  // Compute layout config for card grid
  const layoutConfig = getLayoutConfig(layout, cardSize, cardSpacing);

  // Stable callback handlers to prevent re-renders
  const handleAddToPawkit = useCallback((cardId: string, slug: string) => {
    const card = cards.find(c => c.id === cardId);
    if (!card) return;
    const collections = addCollectionWithHierarchy(card.collections || [], slug, allCollections);
    updateCardInStore(cardId, { collections });
    setCards((prev) =>
      prev.map((c) => (c.id === cardId ? { ...c, collections } : c))
    );
  }, [cards, allCollections, updateCardInStore, setCards]);

  const handleDeleteCard = useCallback(async (cardId: string) => {
    await deleteCardFromStore(cardId);
    useToastStore.getState().success("Card deleted");
    setCards((prev) => prev.filter((c) => c.id !== cardId));
  }, [deleteCardFromStore, setCards]);

  const handleRemoveFromPawkit = useCallback((cardId: string, slug: string) => {
    const card = cards.find(c => c.id === cardId);
    if (!card) return;
    const collections = removeCollectionWithHierarchy(card.collections || [], slug, allCollections, true);
    updateCardInStore(cardId, { collections });
    setCards((prev) =>
      prev.map((c) => (c.id === cardId ? { ...c, collections } : c))
    );
  }, [cards, allCollections, updateCardInStore, setCards]);

  const handleRemoveFromAllPawkits = useCallback((cardId: string) => {
    updateCardInStore(cardId, { collections: [] });
    setCards((prev) =>
      prev.map((c) => (c.id === cardId ? { ...c, collections: [] } : c))
    );
  }, [updateCardInStore, setCards]);

  const handleOpenDetails = useCallback((cardId: string) => {
    openCardDetails(cardId);
  }, [openCardDetails]);

  const handlePinToggle = useCallback((cardId: string, isPinned: boolean) => {
    if (isPinned) {
      handleUnpinFromSidebar(cardId);
    } else {
      handlePinToSidebar(cardId);
    }
  }, [handlePinToSidebar, handleUnpinFromSidebar]);

  // Move to folder handler - now takes folderId directly (no modal needed)
  const handleMoveToFolder = useCallback(async (cardId: string, folderId: string | null) => {
    // Update the card's noteFolderId
    await updateCardInStore(cardId, { noteFolderId: folderId });
    setCards((prev) =>
      prev.map((c) => (c.id === cardId ? { ...c, noteFolderId: folderId } : c))
    );

    // Show success toast
    if (folderId) {
      useToastStore.getState().success("Note moved to folder");
    } else {
      useToastStore.getState().success("Note removed from folder");
    }
  }, [updateCardInStore, setCards]);

  // Empty state for new users (check original cards, not filtered)
  if (cards.length === 0) {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-dashed border-gray-700 bg-gray-950/50 p-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-accent/10">
            <Bookmark size={28} className="text-accent" />
          </div>
          <h3 className="text-lg font-semibold text-gray-200 mb-2">Your library is empty</h3>
          <p className="text-sm text-gray-400 mb-4 max-w-md mx-auto">
            Start saving bookmarks, articles, and notes to build your personal collection. Use the search bar above to paste a URL, or install the browser extension for one-click saving.
          </p>
          <div className="flex flex-wrap justify-center gap-3 text-xs text-gray-500">
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-800/50">
              <span>📎</span> Paste URL above
            </span>
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-800/50">
              <span>🔌</span> Use browser extension
            </span>
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-800/50">
              <span>📝</span> Create a note
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {!hideControls && (
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs text-muted-foreground">{filteredAndSortedCards.length} card(s)</span>
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
                {filteredAndSortedCards.map((card) => {
                  const selected = selectedIds.includes(card.id);
                  const isNote = card.type === "md-note" || card.type === "text-note";
                  const isPinned = pinnedNoteIds.includes(card.id);
                  const displayTitle = card.title || card.url || "Untitled";
                  const formattedCreatedDate = card.createdAt ? new Date(card.createdAt).toLocaleDateString() : "-";
                  const formattedModifiedDate = card.updatedAt ? new Date(card.updatedAt).toLocaleDateString() : "-";
                  const kind = getCardDisplayType(card);

                  return (
                    <CardContextMenuWrapper
                      key={card.id}
                      onAddToPawkit={(slug) => handleAddToPawkit(card.id, slug)}
                      onDelete={() => handleDeleteCard(card.id)}
                      cardCollections={card.collections || []}
                      onRemoveFromPawkit={(slug) => handleRemoveFromPawkit(card.id, slug)}
                      onRemoveFromAllPawkits={() => handleRemoveFromAllPawkits(card.id)}
                      onFetchMetadata={() => handleFetchMetadata(card.id)}
                      cardId={card.id}
                      cardType={card.type}
                      isPinned={isPinned}
                      onPinToSidebar={() => handlePinToSidebar(card.id)}
                      onUnpinFromSidebar={() => handleUnpinFromSidebar(card.id)}
                      onSetThumbnail={() => handleOpenThumbnailModal(card.id)}
                      currentFolderId={card.noteFolderId}
                      onMoveToFolder={(folderId) => handleMoveToFolder(card.id, folderId)}
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
                              <ListRowCardIcon card={card} />
                            </span>
                            <span className="text-sm text-foreground font-medium truncate min-w-0 flex-1">{displayTitle}</span>
                            {isPinned && <Pin size={14} className="text-accent flex-shrink-0" />}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-sm text-muted-foreground">{kind}</span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex flex-wrap gap-1">
                            {(() => {
                              // Combine both tags and collections for display
                              const allTags = [
                                ...(card.tags || []),
                                ...(card.collections || [])
                              ];

                              if (allTags.length > 0) {
                                return allTags.slice(0, 2).map((tag) => (
                                  <span key={tag} className="text-xs text-muted-foreground bg-surface-soft px-2 py-0.5 rounded">
                                    {tag}
                                  </span>
                                ));
                              }

                              return <span className="text-sm text-muted-foreground">-</span>;
                            })()}
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
                              onDelete={() => handleDeleteCard(card.id)}
                              onAddToPawkit={(slug) => handleAddToPawkit(card.id, slug)}
                              isPinned={isPinned}
                              onPinToggle={() => handlePinToggle(card.id, isPinned)}
                              onOpenDetails={() => handleOpenDetails(card.id)}
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
        ) : (layout === "masonry" || layout === "grid") ? (
          /* Muuri-powered grid with drag-and-drop (masonry = variable height, grid = fixed height) */
          /* Key based on filter settings and layout - remount when filters or layout change */
          <MuuriGridComponent
            key={`muuri-${layout}-${viewSettings.sortBy}-${viewSettings.sortOrder}-${(viewSettings.contentTypeFilter || []).join(',')}`}
            ref={muuriRef}
            className="w-full"
            style={{ minHeight: 200 }}
            itemCount={filteredAndSortedCards.length}
            cardIds={orderedIds.join(',')}
            // Minimum item width based on slider (200px small to 600px XL)
            minItemWidth={200 + ((cardSize - 1) / 99) * 400 + cardSpacing}
            // Consistent edge padding
            edgePadding={16}
            fillGaps={true}
            dragEnabled={true}
            dragHandle=".muuri-item-content"
            layoutDuration={300}
            layoutEasing="ease-out"
            onDragStart={(item) => {
              // Set global drag state for cross-component communication
              const cardId = item.getElement().dataset.cardId;
              if (cardId) {
                useDragStore.getState().startDrag(cardId);
              }
              // Add class to body for z-index handling
              document.body.classList.add('muuri-dragging');
            }}
            onDragEnd={(item) => {
              // Check if we should drop into a pawkit
              const dragState = useDragStore.getState();
              if (dragState.hoveredPawkitSlug && dragState.draggedCardId) {
                // Find the card and add it to the collection
                const card = cards.find((c) => c.id === dragState.draggedCardId);
                if (card) {
                  const currentCollections = card.collections || [];
                  if (!currentCollections.includes(dragState.hoveredPawkitSlug)) {
                    // Find collection name for toast
                    const findCollectionName = (cols: CollectionNode[]): string | null => {
                      for (const col of cols) {
                        if (col.slug === dragState.hoveredPawkitSlug) return col.name;
                        if (col.children) {
                          const found = findCollectionName(col.children);
                          if (found) return found;
                        }
                      }
                      return null;
                    };
                    const collectionName = findCollectionName(allCollections) || dragState.hoveredPawkitSlug;

                    // Add to collection
                    const newCollections = [...currentCollections, dragState.hoveredPawkitSlug];
                    updateCardInStore(dragState.draggedCardId, { collections: newCollections });
                    setCards((prev) =>
                      prev.map((c) => (c.id === dragState.draggedCardId ? { ...c, collections: newCollections } : c))
                    );
                    useToastStore.getState().success(`Added to ${collectionName}`);
                  }
                }
              }

              // Check if we should drop into a note folder
              if (dragState.hoveredFolderId && dragState.draggedCardId) {
                const card = cards.find((c) => c.id === dragState.draggedCardId);
                // Only move notes to folders (not regular cards)
                if (card && (card.type === 'md-note' || card.type === 'text-note')) {
                  // Import note folder store dynamically to avoid circular deps
                  import('@/lib/stores/note-folder-store').then(({ useNoteFolderStore }) => {
                    const folderStore = useNoteFolderStore.getState();
                    const folder = folderStore.getFolderById(dragState.hoveredFolderId!);
                    const folderName = folder?.name || 'folder';

                    // Update the card's folder
                    updateCardInStore(dragState.draggedCardId!, { noteFolderId: dragState.hoveredFolderId });
                    setCards((prev) =>
                      prev.map((c) => (c.id === dragState.draggedCardId ? { ...c, noteFolderId: dragState.hoveredFolderId } : c))
                    );
                    useToastStore.getState().success(`Moved to ${folderName}`);
                  });
                }
              }

              // Clear global drag state
              useDragStore.getState().endDrag();
              // Remove body class for z-index handling
              document.body.classList.remove('muuri-dragging');
              // Trigger relayout after drag to fix empty columns
              setTimeout(() => {
                muuriRef.current?.refreshItems();
              }, 100);
            }}
            onOrderChange={(newOrder) => {
              // Save custom order and switch to custom sort
              setViewSpecific(viewKey, {
                ...viewSettings.viewSpecific,
                customOrder: newOrder,
              });
              setSortBy(viewKey, "custom");
            }}
            onItemWidthCalculated={(width) => {
              // Trigger relayout when calculated width changes
              setTimeout(() => {
                muuriRef.current?.refreshItems();
              }, 50);
            }}
          >
            {(calculatedWidth: number) => (
              <>
                {filteredAndSortedCards.map((card) => {
                  // Calculate fixed height for grid mode (16:9 aspect + padding + metadata when enabled)
                  const paddingPx = Math.round((viewSettings.cardPadding - 1) / 99 * 32);
                  const gridItemHeight = layout === "grid"
                    ? Math.round((calculatedWidth * 9) / 16) + (paddingPx * 2) + (viewSettings.showMetadata ? 36 : 0)
                    : undefined;

                  return (
                  <MuuriItem
                    key={card.id}
                    cardId={card.id}
                    width={calculatedWidth}
                    spacing={cardSpacing}
                    height={gridItemHeight}
                  >
                    <CardCell
                      card={card}
                      selected={selectedIds.includes(card.id)}
                      showThumbnail={showThumbnails}
                      layout={layout}
                      area={area}
                      onClick={handleCardClick}
                      onImageLoad={() => {
                        handleImageLoad();
                        // Trigger Muuri relayout when images load
                        muuriRef.current?.refreshItems();
                      }}
                      onAddToPawkit={(slug) => handleAddToPawkit(card.id, slug)}
                      onDeleteCard={() => handleDeleteCard(card.id)}
                      onRemoveFromPawkit={(slug) => handleRemoveFromPawkit(card.id, slug)}
                      onRemoveFromAllPawkits={() => handleRemoveFromAllPawkits(card.id)}
                      onFetchMetadata={handleFetchMetadata}
                      isPinned={pinnedNoteIds.includes(card.id)}
                      onPinToSidebar={() => handlePinToSidebar(card.id)}
                      onUnpinFromSidebar={() => handleUnpinFromSidebar(card.id)}
                      onSetThumbnail={() => handleOpenThumbnailModal(card.id)}
                      onMoveToFolder={(folderId) => handleMoveToFolder(card.id, folderId)}
                      hasAttachments={cardsWithAttachments.has(card.id)}
                      showLabels={viewSettings.showLabels}
                      showMetadata={viewSettings.showMetadata}
                      showPreview={viewSettings.showPreview}
                      cardPadding={viewSettings.cardPadding}
                      uiStyle={uiStyle}
                    />
                  </MuuriItem>
                  );
                })}
              </>
            )}
          </MuuriGridComponent>
        ) : null /* Compact layout removed - only list, masonry, and grid are supported */}
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

      {/* Thumbnail Modal */}
      {showThumbnailModal && (
        <>
          {/* Modal Backdrop */}
          <div
            className="fixed inset-0 z-[400] bg-black/60 backdrop-blur-sm"
            onClick={() => setShowThumbnailModal(false)}
          />
          {/* Modal Content */}
          <div className="fixed inset-0 z-[401] flex items-center justify-center p-4 pointer-events-none">
            <div
              className="w-full max-w-md rounded-2xl border border-white/10 bg-gray-900 shadow-2xl pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
                <h3 className="text-lg font-semibold text-gray-100">Set Thumbnail</h3>
                <button
                  onClick={() => setShowThumbnailModal(false)}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X size={20} className="text-gray-400" />
                </button>
              </div>

              {/* Content */}
              <div className="px-6 py-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Image URL
                  </label>
                  <Input
                    type="url"
                    value={thumbnailUrl}
                    onChange={(e) => {
                      setThumbnailUrl(e.target.value);
                      setThumbnailPreviewError(false);
                      setThumbnailPreviewLoaded(false);
                    }}
                    placeholder="https://example.com/image.jpg"
                    className="bg-gray-800 border-gray-700"
                  />
                </div>

                {/* Preview */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Preview
                  </label>
                  <div className="relative aspect-video rounded-lg bg-gray-800 border border-gray-700 overflow-hidden flex items-center justify-center">
                    {thumbnailUrl.trim() ? (
                      <>
                        {thumbnailPreviewError ? (
                          <div className="text-center text-gray-500">
                            <ImageIcon size={32} className="mx-auto mb-2 opacity-50" />
                            <p className="text-sm">Failed to load image</p>
                          </div>
                        ) : (
                          <img
                            src={thumbnailUrl}
                            alt="Thumbnail preview"
                            className={`max-w-full max-h-full object-contain ${thumbnailPreviewLoaded ? '' : 'opacity-0'}`}
                            onLoad={() => setThumbnailPreviewLoaded(true)}
                            onError={() => setThumbnailPreviewError(true)}
                          />
                        )}
                        {!thumbnailPreviewLoaded && !thumbnailPreviewError && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="animate-spin h-6 w-6 border-2 border-gray-500 border-t-accent rounded-full" />
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="text-center text-gray-500">
                        <ImageIcon size={32} className="mx-auto mb-2 opacity-50" />
                        <p className="text-sm">Enter a URL to preview</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Remove thumbnail link */}
                {thumbnailCardId && cards.find(c => c.id === thumbnailCardId)?.image && (
                  <button
                    onClick={() => {
                      setThumbnailUrl("");
                      setThumbnailPreviewError(false);
                      setThumbnailPreviewLoaded(false);
                    }}
                    className="text-sm text-red-400 hover:text-red-300 transition-colors"
                  >
                    Remove thumbnail
                  </button>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-white/10">
                <Button
                  variant="ghost"
                  onClick={() => setShowThumbnailModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveThumbnail}
                  disabled={thumbnailUrl.trim() !== "" && !thumbnailPreviewLoaded}
                >
                  Save
                </Button>
              </div>
            </div>
          </div>
        </>
      )}

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
  onSetThumbnail?: () => void;
  onMoveToFolder?: (folderId: string | null) => void;
  hasAttachments?: boolean;
  // View settings props - passed from parent to ensure memo updates correctly
  showLabels: boolean;
  showMetadata: boolean; // Also controls tags/badges visibility
  showPreview: boolean;
  cardPadding: number;
  uiStyle: "modern" | "glass";
};

function CardCellInner({ card, selected, showThumbnail, layout, area, onClick, onImageLoad, onAddToPawkit, onDeleteCard, onRemoveFromPawkit, onRemoveFromAllPawkits, onFetchMetadata, isPinned, onPinToSidebar, onUnpinFromSidebar, onSetThumbnail, onMoveToFolder, hasAttachments, showLabels, showMetadata, showPreview, cardPadding, uiStyle }: CardCellProps) {
  // Only use dnd-kit draggable for non-masonry layouts (masonry uses Muuri's built-in drag)
  const isMasonry = layout === "masonry";
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: card.id,
    data: { cardId: card.id },
    disabled: isMasonry, // Disable dnd-kit drag for masonry - Muuri handles it
  });
  const style = transform && !isMasonry ? { transform: CSS.Translate.toString(transform) } : undefined;
  const isPending = card.status === "PENDING";
  const isError = card.status === "ERROR";
  const isNote = card.type === "md-note" || card.type === "text-note";

  // Use hook to get the correct image URL (handles file cards with IndexedDB blobs)
  const { imageUrl, isLoading: isImageLoading, isFileCard } = useCardImageUrl(card);

  // Check if this card has associated calendar events
  const hasCalendarEvents = useEventStore((state) =>
    state.events.some(e => e.source?.type === 'card' && e.source?.cardId === card.id)
  );

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

  // Convert cardPadding from 1-100 scale to pixels for smooth scaling
  // Scale from 0px (1) to 32px (100) for smooth transitions
  const cardPaddingPx = Math.round((cardPadding - 1) / 99 * 32);

  // Check if text section will render (used for conditional thumbnail margin)
  const hasTextSection = showMetadata || isPending || isError || isNote || (!card.image && !showThumbnail);

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
      onSetThumbnail={onSetThumbnail}
      currentFolderId={card.noteFolderId}
      onMoveToFolder={onMoveToFolder}
    >
      <div
        ref={setNodeRef}
        {...listeners}
        {...attributes}
        style={{
          ...style,
          padding: `${cardPaddingPx}px`,
          borderWidth: '1px',
          borderStyle: 'solid',
          borderColor: selected ? 'var(--ds-accent)' : 'var(--border-subtle)'
        }}
        className={`card-hover group relative cursor-pointer break-inside-avoid-column select-none ${
          selected ? "is-selected ring-2 ring-accent" : ""
        } ${isDragging ? "opacity-50" : ""} ${layout === "grid" ? "h-full overflow-hidden" : ""}`}
        onClick={(event) => onClick(event, card)}
        data-id={card.id}
      >
        {/* Blurred image background - only in glass UI mode */}
        {imageUrl && uiStyle === "glass" && (
          <>
            <div
              className="absolute inset-0 scale-125"
              style={{
                backgroundImage: `url(${imageUrl})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                filter: 'blur(20px) saturate(1.2)',
                zIndex: 0
              }}
            />
            <div className="absolute inset-0 bg-black/50" style={{ zIndex: 1 }} />
          </>
        )}
        {/* Container for content - sits above blur */}
        <div className={`relative ${layout === "grid" ? "h-full flex flex-col" : ""}`} style={{ zIndex: 2 }}>

      {showThumbnail && !isNote && (
        <div
          className={`relative ${hasTextSection && showMetadata && layout !== "grid" ? "mb-2" : ""} w-full rounded-xl ${layout === "masonry" ? "min-h-[120px]" : "aspect-video"} group/filmstrip overflow-hidden`}
          style={{ background: 'var(--bg-surface-1)' }}
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
          {isPending || (isFileCard && isImageLoading) ? (
            <div className="flex h-full w-full items-center justify-center">
              <div className="h-16 w-16 rounded-full border-4 border-gray-600 border-t-accent animate-spin"></div>
            </div>
          ) : isError ? (
            <div className="flex h-full w-full items-center justify-center">
              <div className="h-16 w-16 rounded-full bg-gray-600 flex items-center justify-center">
                <span className="text-white text-2xl">⚠️</span>
              </div>
            </div>
          ) : imageUrl ? (
            <>
              <img
                src={imageUrl}
                alt={card.title ?? card.url}
                className={layout === "masonry" ? "block w-full h-auto rounded-xl" : "block h-full w-full object-cover rounded-xl"}
                loading="lazy"
                style={{
                  // Force Chrome to create a compositing layer for each image
                  // This prevents the disappearing image bug on wide viewports
                  backfaceVisibility: 'hidden',
                }}
                onLoad={onImageLoad}
                onError={(e) => {
                  // Fallback to logo on image error
                  const target = e.target as HTMLImageElement;
                  target.onerror = null;
                  target.src = "/images/logo.png";
                  target.className = "h-16 w-16 opacity-50";
                  // Still call onImageLoad for the fallback image
                  onImageLoad?.();
                }}
              />
              {/* URL Pill Overlay - hide for file cards */}
              {showLabels && card.url && !isFileCard && (
                <a
                  href={card.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="absolute bottom-2 left-8 right-8 px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-xs text-white hover:bg-black/60 transition-colors"
                >
                  <span className="block text-center truncate">
                    {(() => {
                      try {
                        return new URL(card.url).hostname;
                      } catch {
                        return card.domain || card.url;
                      }
                    })()}
                  </span>
                  {hasAttachments && (
                    <Paperclip className="w-3 h-3 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2" />
                  )}
                </a>
              )}
              {/* Title Pill for file cards */}
              {showLabels && isFileCard && (
                <div
                  className="absolute bottom-2 left-8 right-8 px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-xs text-white"
                >
                  <span className="block text-center truncate">
                    {card.title || "Untitled"}
                  </span>
                  {hasAttachments && (
                    <Paperclip className="w-3 h-3 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2" />
                  )}
                </div>
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
                  className="absolute bottom-2 left-8 right-8 px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-xs text-white hover:bg-black/60 transition-colors"
                >
                  <span className="block text-center truncate">
                    {(() => {
                      try {
                        return new URL(card.url).hostname;
                      } catch {
                        return card.domain || card.url;
                      }
                    })()}
                  </span>
                  {hasAttachments && (
                    <Paperclip className="w-3 h-3 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2" />
                  )}
                </a>
              )}
            </div>
          ) : null}
        </div>
      )}
      {/* Grid view metadata - sits on the card's blurred background */}
      {layout === "grid" && showMetadata && !isNote && (
        <div className="px-1 py-2 flex flex-col justify-center">
          <div className="flex items-center gap-2">
            <span className="text-white/60">
              <Bookmark size={12} />
            </span>
            <h3 className="flex-1 font-medium text-xs text-white truncate">{displayTitle}</h3>
            {hasCalendarEvents && (
              <span style={{ color: 'var(--ds-accent)' }} className="flex-shrink-0" title="On your calendar">
                <Calendar size={10} />
              </span>
            )}
          </div>
          {card.collections && card.collections.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-0.5 text-[9px]">
              {card.collections
                .filter((collection) => !collection.startsWith('den-'))
                .slice(0, 2)
                .map((collection) => (
                  <span key={collection} className="rounded px-1 py-0.5 bg-white/15 text-white/80 truncate max-w-[60px]">
                    {collection}
                  </span>
                ))}
              {card.collections.filter((c) => !c.startsWith('den-')).length > 2 && (
                <span className="text-white/60">+{card.collections.filter((c) => !c.startsWith('den-')).length - 2}</span>
              )}
            </div>
          )}
        </div>
      )}
      {/* Notes: Clean document-style with rendered markdown preview */}
      {isNote && showPreview && (
        <div
          className="relative w-full group/note flex-1"
          style={layout !== "grid" ? { aspectRatio: '3 / 2' } : undefined}
        >
          {/* Document-styled container */}
          <div
            className={`flex flex-col ${layout === "grid" ? "h-full" : "absolute inset-0"}`}
            style={{
              background: 'var(--bg-surface-2)',
              borderRadius: 'var(--radius-lg)',
              minHeight: '180px'
            }}
          >
            {/* Rendered markdown preview - fades out at bottom */}
            <div
              className="flex-1 overflow-hidden p-4"
              style={{
                maskImage: 'linear-gradient(to bottom, black 60%, transparent 100%)',
                WebkitMaskImage: 'linear-gradient(to bottom, black 60%, transparent 100%)'
              }}
            >
              {card.content ? (
                <div className="prose prose-sm dark:prose-invert max-w-none note-card-preview">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm, remarkBreaks]}
                  >
                    {card.content.slice(0, 600)}
                  </ReactMarkdown>
                </div>
              ) : (
                <div
                  className="flex items-center justify-center h-full"
                  style={{ color: 'var(--text-muted)' }}
                >
                  <FileText size={32} />
                </div>
              )}
            </div>

            {/* Title at bottom */}
            {showLabels && (
              <div
                className="px-4 pb-4 pt-2"
                style={{
                  background: 'linear-gradient(to top, var(--bg-surface-2) 80%, transparent)'
                }}
              >
                <h4
                  className="font-medium text-sm truncate"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {displayTitle}
                </h4>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Notes: Minimal card when preview is off - fills Grid container */}
      {isNote && !showPreview && (
        <div
          className={`flex flex-col p-4 ${layout === "grid" ? "flex-1 h-full justify-center" : ""}`}
          style={{
            background: 'var(--bg-surface-2)',
            borderRadius: 'var(--radius-lg)'
          }}
        >
          {/* Title */}
          {showLabels && (
            <div className="flex items-center gap-2">
              <FileText size={16} style={{ color: 'var(--ds-accent)' }} className="flex-shrink-0" />
              <span className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{displayTitle}</span>
            </div>
          )}
          {/* Minimal fallback when no labels */}
          {!showLabels && (
            <div className="flex items-center justify-center flex-1">
              <FileText size={32} style={{ color: 'var(--ds-accent)' }} />
            </div>
          )}
        </div>
      )}

      {/* Compact fallback when thumbnails are hidden - fills Grid container */}
      {!isNote && !showThumbnail && (
        <div className={`flex items-center justify-center ${layout === "grid" ? "flex-1 h-full" : "py-6 min-h-[80px]"}`}>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Bookmark size={20} />
            <span className="text-xs truncate max-w-[150px]">
              {(() => {
                try {
                  return new URL(card.url).hostname;
                } catch {
                  return card.domain || "Link";
                }
              })()}
            </span>
          </div>
        </div>
      )}

      {/* Show metadata section for notes - separate from card content */}
      {isNote && showMetadata && (
        <div className="space-y-1 text-sm mt-2">
          <div className="flex items-center gap-2">
            <span style={{ color: 'var(--ds-accent)' }}>
              <FileText size={16} />
            </span>
            <h3 className="flex-1 font-semibold transition-colors line-clamp-2" style={{ color: 'var(--text-primary)' }}>{displayTitle}</h3>
            {hasCalendarEvents && (
              <span style={{ color: 'var(--ds-accent)' }} className="flex-shrink-0" title="On your calendar">
                <Calendar size={14} />
              </span>
            )}
            {isPinned && (
              <span style={{ color: 'var(--ds-accent)' }} className="flex-shrink-0">
                <Pin size={14} />
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span
              className="inline-block rounded px-2 py-0.5 text-[10px]"
              style={{
                background: 'var(--ds-accent-subtle)',
                color: 'var(--text-primary)',
                border: '1px solid var(--ds-accent-muted)'
              }}
            >
              {card.type === "md-note" ? "Markdown" : "Text"}
            </span>
          </div>
          {card.collections && card.collections.length > 0 && (
            <div className="flex flex-wrap gap-1 text-[10px]" style={{ color: 'var(--text-muted)' }}>
              {card.collections
                .filter((collection) =>
                  !collection.startsWith('den-')
                )
                .map((collection) => (
                  <span key={collection} className="rounded px-2 py-0.5" style={{ background: 'var(--bg-surface-3)' }}>
                    {collection}
                  </span>
                ))}
              {card.collections?.includes('the-den') && (
                <span className="rounded px-2 py-0.5" style={{ background: 'var(--bg-surface-3)' }}>
                  The Den
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Show text section for non-notes (not in grid mode - grid uses frosted overlay) */}
      {!isNote && layout !== "grid" && (showMetadata || isPending || isError) && (
        <div className="space-y-1 text-sm mt-2">
          {showMetadata && (
            <div className="flex items-center gap-2">
              <span style={{ color: 'var(--text-muted)' }}>
                <Bookmark size={16} />
              </span>
              <h3 className="flex-1 font-semibold transition-colors line-clamp-2" style={{ color: 'var(--text-primary)' }}>{displayTitle}</h3>
              {hasCalendarEvents && (
                <span style={{ color: 'var(--ds-accent)' }} className="flex-shrink-0" title="On your calendar">
                  <Calendar size={14} />
                </span>
              )}
            </div>
          )}
          {displaySubtext && showMetadata && (
            <p className="text-xs line-clamp-2" style={{ color: 'var(--text-muted)' }}>{displaySubtext}</p>
          )}
          {showMetadata && card.collections && card.collections.length > 0 && (
            <div className="flex flex-wrap gap-1 text-[10px]" style={{ color: 'var(--text-muted)' }}>
              {card.collections
                .filter((collection) =>
                  !collection.startsWith('den-')
                )
                .map((collection) => (
                  <span key={collection} className="rounded px-2 py-0.5" style={{ background: 'var(--bg-surface-3)' }}>
                    {collection}
                  </span>
                ))}
              {card.collections?.includes('the-den') && (
                <span className="rounded px-2 py-0.5" style={{ background: 'var(--bg-surface-3)' }}>
                  The Den
                </span>
              )}
            </div>
          )}
          {(isPending || isError) && (
            <div className="flex items-center gap-2">
              {isPending && (
                <span className="inline-block rounded px-2 py-0.5 text-[10px]" style={{ background: 'var(--bg-surface-3)', color: 'var(--text-secondary)' }}>
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
        </div>{/* Close uniform sizing container */}
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
    prevProps.isPinned === nextProps.isPinned &&
    prevProps.hasAttachments === nextProps.hasAttachments &&
    // View settings - must be included to ensure cards re-render when settings change
    prevProps.showLabels === nextProps.showLabels &&
    prevProps.showMetadata === nextProps.showMetadata &&
    prevProps.showPreview === nextProps.showPreview &&
    prevProps.cardPadding === nextProps.cardPadding &&
    prevProps.uiStyle === nextProps.uiStyle
  );
});


function getLayoutConfig(layout: LayoutMode, cardSize: number = 50, cardSpacing: number = 16): { className: string; style: React.CSSProperties } {
  // Calculate minimum card width based on cardSize (1-100 scale)
  // Range: 200px (small) to 600px (XL) - shifted up from original 150-500
  // Smaller range makes transitions smoother as grid recalculates columns
  const minCardWidth = 200 + ((cardSize - 1) / 99) * 400; // Ranges from 200px to 600px

  // Maximum card width to prevent cards from becoming too wide on ultrawide monitors
  // This ensures cards maintain proper aspect ratios and image rendering
  // Using 1.5x the min width as max prevents excessive stretching
  const maxCardWidth = Math.min(minCardWidth * 1.5, 800);

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
        }
      };
    case "list":
      return {
        className: "flex flex-col",
        style: {
          gap: `${gapPx}px`
        }
      };
    case "grid":
    case "masonry":
    default:
      // Note: grid and masonry now use Muuri, but this is kept for any fallback scenarios
      return {
        className: "grid",
        style: {
          // Use minmax with max constraint to prevent overly wide cards on ultrawide monitors
          gridTemplateColumns: `repeat(auto-fill, minmax(${minCardWidth}px, ${maxCardWidth}px))`,
          gap: `${gapPx}px`,
          // Center the grid when cards don't fill the full width
          justifyContent: 'center',
          // Align cards to top - prevents stretching to match tallest card in row
          alignItems: 'start',
        }
      };
  }
}
