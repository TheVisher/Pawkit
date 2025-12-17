"use client";

import { useMemo, useState, useEffect, useRef, Suspense } from "react";
import { useParams, useSearchParams, useRouter, usePathname } from "next/navigation";
import { LibraryWorkspace } from "@/components/library/workspace";
import { DEFAULT_LAYOUT, LAYOUTS, LayoutMode } from "@/lib/constants";
import { useDataStore } from "@/lib/stores/data-store";
import { usePawkitActions } from "@/lib/contexts/pawkit-actions-context";
import { usePanelStore } from "@/lib/hooks/use-panel-store";
import { Folder, ChevronRight, ChevronDown, Image as ImageIcon, KanbanSquare } from "lucide-react";
import { GlowButton } from "@/components/ui/glow-button";
import { CollectionsGrid } from "@/components/pawkits/grid";
import { ViewTabs } from "@/components/pawkits/view-tabs";
import { BoardView } from "@/components/board/board-view";
import { QuickAddCardModal } from "@/components/board/quick-add-card-modal";
import { isBoard, getBoardConfig, getKanbanColumns, BoardColumn, KanbanColumn } from "@/lib/types/board";
import type { CollectionNode } from "@/lib/types";

function CollectionPageContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const slug = params.slug as string;
  const setContentType = usePanelStore((state) => state.setContentType);
  const openCardDetails = usePanelStore((state) => state.openCardDetails);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showRenamePawkitModal, setShowRenamePawkitModal] = useState(false);
  const [showMovePawkitModal, setShowMovePawkitModal] = useState(false);
  const [showDeletePawkitConfirm, setShowDeletePawkitConfirm] = useState(false);
  const [showCoverImageModal, setShowCoverImageModal] = useState(false);
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [coverImagePosition, setCoverImagePosition] = useState(50); // Vertical position percentage
  const [isRepositioning, setIsRepositioning] = useState(false);
  const [pawkitName, setPawkitName] = useState("");
  const [renameValue, setRenameValue] = useState("");
  const [selectedMoveTarget, setSelectedMoveTarget] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dragPositionRef = useRef(50); // Store live drag position
  const [subPawkitsExpanded, setSubPawkitsExpanded] = useState(true); // Sub-pawkits section state

  // Board quick add card state
  const [showQuickAddCard, setShowQuickAddCard] = useState(false);
  const [quickAddColumn, setQuickAddColumn] = useState<BoardColumn | null>(null);

  const { setPawkitActions } = usePawkitActions();

  // Set Pawkit actions for the top bar
  useEffect(() => {
    setPawkitActions({
      onCreateSubPawkit: () => setShowCreateModal(true),
      onRenamePawkit: () => setShowRenamePawkitModal(true),
      onMovePawkit: () => setShowMovePawkitModal(true),
      onDeletePawkit: () => setShowDeletePawkitConfirm(true),
    });

    // Clean up when component unmounts
    return () => setPawkitActions(null);
  }, [setPawkitActions]);

  // Set the right panel content to show pawkits controls
  // Include pathname to ensure this runs on every navigation to this page
  useEffect(() => {
    setContentType("pawkits-controls");
  }, [setContentType, pathname]);

  // Focus input when modal opens
  useEffect(() => {
    if (showCreateModal) {
      // Delay to let dropdown close completely and modal render
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 150);
      return () => clearTimeout(timer);
    } else {
      // Reset input when modal closes
      setPawkitName("");
      setError(null);
    }
  }, [showCreateModal]);

  const q = searchParams.get("q") || undefined;
  const statusParam = searchParams.get("status") || undefined;
  const status = statusParam && ["PENDING", "READY", "ERROR"].includes(statusParam) ? statusParam as "PENDING" | "READY" | "ERROR" : undefined;
  const layoutParam = searchParams.get("layout") as LayoutMode | null;

  // Read from localStorage first, then URL param, then default
  // Use slug-specific key so each pawkit remembers its own layout
  const savedLayout = typeof window !== 'undefined' ? localStorage.getItem(`pawkit-${slug}-layout`) as LayoutMode | null : null;
  const layout: LayoutMode = layoutParam && LAYOUTS.includes(layoutParam)
    ? layoutParam
    : savedLayout && LAYOUTS.includes(savedLayout)
      ? savedLayout
      : DEFAULT_LAYOUT;

  // Read from global store
  const { cards, collections, updateCard, deleteCard, addCollection, updateCollection, deleteCollection } = useDataStore();

  // Filter cards for this specific collection
  const items = useMemo(() => {
    let filtered = cards.filter(card => card.collections?.includes(slug) && card.deleted !== true);

    if (q) {
      const query = q.toLowerCase();
      filtered = filtered.filter(card =>
        card.title?.toLowerCase().includes(query) ||
        card.url.toLowerCase().includes(query) ||
        card.notes?.toLowerCase().includes(query)
      );
    }

    if (status) {
      filtered = filtered.filter(card => card.status === status);
    }

    return filtered;
  }, [cards, slug, q, status]);

  // Find current collection
  const currentCollection = useMemo(() => {
    const findCollection = (nodes: CollectionNode[], targetSlug: string): CollectionNode | null => {
      for (const node of nodes) {
        if (node.slug === targetSlug) return node;
        if (node.children) {
          const found = findCollection(node.children, targetSlug);
          if (found) return found;
        }
      }
      return null;
    };
    return findCollection(collections, slug);
  }, [collections, slug]);

  // Build breadcrumb trail from root to current collection
  const breadcrumbs = useMemo(() => {
    if (!currentCollection) return [];

    const trail: Array<{ id: string; name: string; slug: string }> = [];

    const buildTrail = (nodes: CollectionNode[], targetSlug: string, path: Array<{ id: string; name: string; slug: string }> = []): boolean => {
      for (const node of nodes) {
        const currentPath = [...path, { id: node.id, name: node.name, slug: node.slug }];

        if (node.slug === targetSlug) {
          trail.push(...currentPath);
          return true;
        }

        if (node.children) {
          if (buildTrail(node.children, targetSlug, currentPath)) {
            return true;
          }
        }
      }
      return false;
    };

    buildTrail(collections, slug);
    return trail;
  }, [collections, slug, currentCollection]);

  // Initialize cover image position from collection data (after currentCollection is defined)
  useEffect(() => {
    if (currentCollection) {
      const position = currentCollection.coverImagePosition || 50;
      setCoverImagePosition(position);
      dragPositionRef.current = position;
    }
  }, [currentCollection]);

  // Load sub-pawkits expanded state from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('subPawkitsExpanded');
    if (saved !== null) {
      setSubPawkitsExpanded(saved === 'true');
    }
  }, []);

  // Save sub-pawkits expanded state to localStorage
  const toggleSubPawkits = () => {
    const newState = !subPawkitsExpanded;
    setSubPawkitsExpanded(newState);
    localStorage.setItem('subPawkitsExpanded', String(newState));
  };

  // Create grid items for sub-pawkits (before early return to satisfy hooks rules)
  const subPawkitsGridItems = useMemo(() => {
    if (!currentCollection?.children || currentCollection.children.length === 0) {
      return [];
    }

    // Filter out deleted sub-pawkits
    return currentCollection.children.filter((child) => child.deleted !== true).map((child) => {
      const pawkitCards = cards.filter(card => 
        card.collections.includes(child.slug) && card.deleted !== true
      );

      return {
        id: child.id,
        name: child.name,
        slug: child.slug,
        count: pawkitCards.length,
        cards: pawkitCards.slice(0, 3), // Only show first 3 for preview
        isPinned: child.pinned,
        isPrivate: child.isPrivate,
        hidePreview: child.hidePreview,
        useCoverAsBackground: child.useCoverAsBackground,
        coverImage: child.coverImage,
        hasChildren: child.children && child.children.length > 0,
        metadata: child.metadata
      };
    });
  }, [currentCollection, cards]);

  if (!currentCollection) {
    return <div>Collection not found</div>;
  }

  // Flatten all pawkits for the move modal (including sub-pawkits, excluding deleted)
  const flattenPawkits = (nodes: CollectionNode[], prefix = ""): Array<{ id: string; name: string; slug: string }> => {
    const result: Array<{ id: string; name: string; slug: string }> = [];
    for (const node of nodes) {
      // Skip deleted collections
      if (node.deleted === true) continue;

      result.push({
        id: node.id,
        name: prefix ? `${prefix} / ${node.name}` : node.name,
        slug: node.slug,
      });
      if (node.children && node.children.length > 0) {
        result.push(...flattenPawkits(node.children, prefix ? `${prefix} / ${node.name}` : node.name));
      }
    }
    return result;
  };

  const allPawkits = flattenPawkits(collections);

  const handleLayoutChange = (newLayout: LayoutMode) => {
    localStorage.setItem(`pawkit-${slug}-layout`, newLayout);
    const params = new URLSearchParams(searchParams.toString());
    params.set("layout", newLayout);
    router.push(`/pawkits/${slug}?${params.toString()}`);
  };

  // Pawkit actions
  const handleCreateSubPawkit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedName = pawkitName.trim();
    if (!trimmedName) {
      setError("Pawkit name cannot be empty");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Use data-store method for local-first behavior
      await addCollection({ name: trimmedName, parentId: currentCollection.id });

      setPawkitName("");
      setShowCreateModal(false);
      setLoading(false);
    } catch (err) {
      setError("Failed to create Sub-Pawkit");
      setLoading(false);
    }
  };

  const handleRenamePawkit = async () => {
    if (!renameValue.trim()) return;

    setLoading(true);
    try {
      // Use data-store method for local-first behavior
      await updateCollection(currentCollection.id, { name: renameValue.trim() });

      setShowRenamePawkitModal(false);
      setRenameValue("");
      setLoading(false);
    } catch (err) {
      alert("Failed to rename Pawkit");
      setLoading(false);
    }
  };

  const handleMovePawkit = async () => {
    setLoading(true);
    try {
      // Use data-store method for local-first behavior
      await updateCollection(currentCollection.id, { parentId: selectedMoveTarget });

      setShowMovePawkitModal(false);
      setSelectedMoveTarget(null);
      setLoading(false);

      // Navigate after successful move
      router.push("/pawkits");
    } catch (err) {
      alert("Failed to move Pawkit");
      setLoading(false);
    }
  };

  const handleDeletePawkit = async () => {
    setLoading(true);
    setShowDeletePawkitConfirm(false);

    try {
      // Use data-store method for local-first behavior
      // deleteCards=false, deleteSubPawkits=false to soft delete only
      await deleteCollection(currentCollection.id, false, false);

      // Navigate after successful delete
      router.push("/pawkits");
    } catch (err) {
      alert("Failed to delete Pawkit");
      setLoading(false);
    }
  };

  const handleSetCoverImage = async () => {
    if (!coverImageUrl.trim() && !currentCollection.coverImage) {
      setShowCoverImageModal(false);
      return;
    }

    setLoading(true);
    try {
      // Use data-store method for local-first behavior
      await updateCollection(currentCollection.id, { 
        coverImage: coverImageUrl.trim() || null 
      });

      setShowCoverImageModal(false);
      setCoverImageUrl("");
    } catch (err) {
      alert("Failed to update cover image");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="space-y-4">
        {/* Cover Image Banner */}
        {currentCollection.coverImage ? (
          <div className="relative w-[calc(100%+3rem)] h-80 -mx-6 -mt-6 mb-0 overflow-hidden group rounded-t-2xl">
            <div
              className="w-full h-full"
              style={{
                backgroundImage: `url(${currentCollection.coverImage})`,
                backgroundSize: 'cover',
                backgroundPosition: `center ${coverImagePosition}%`,
              }}
            />
            {/* Gradual fade to background - multi-stop for smooth transition */}
            <div
              className="absolute inset-x-0 bottom-0 h-64 pointer-events-none"
              style={{
                background: `linear-gradient(to bottom,
                  transparent 0%,
                  hsl(var(--background) / 0.05) 15%,
                  hsl(var(--background) / 0.15) 30%,
                  hsl(var(--background) / 0.35) 50%,
                  hsl(var(--background) / 0.6) 70%,
                  hsl(var(--background) / 0.85) 85%,
                  hsl(var(--background)) 100%
                )`,
              }}
            />
            {/* Light overlay at top for contrast */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-transparent pointer-events-none" />

            {/* Overlaid Title and Breadcrumb */}
            <div className="absolute bottom-4 left-6 right-6 z-10">
              <div className="flex items-center gap-3 mb-1">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/15 backdrop-blur-sm border border-white/20">
                  {layout === "kanban" ? (
                    <KanbanSquare className="h-4 w-4 text-purple-300" />
                  ) : (
                    <Folder className="h-4 w-4 text-white" />
                  )}
                </div>
                <h1 className="text-2xl font-semibold text-white drop-shadow-lg">{currentCollection.name}</h1>
              </div>

              {/* Breadcrumb Navigation */}
              {breadcrumbs.length > 1 && (
                <div className="flex items-center gap-1 text-sm text-white/90 ml-[52px] drop-shadow-md">
                  {breadcrumbs.map((crumb, index) => (
                    <div key={crumb.id} className="flex items-center gap-1">
                      {index > 0 && <ChevronRight size={14} />}
                      {index < breadcrumbs.length - 1 ? (
                        <button
                          onClick={() => router.push(`/pawkits/${crumb.slug}`)}
                          className="hover:text-white transition-colors"
                        >
                          {crumb.name}
                        </button>
                      ) : (
                        <span className="text-white font-medium">{crumb.name}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Hover Controls */}
            <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2 bg-black/70 backdrop-blur-md rounded-2xl p-2 shadow-lg">
              <GlowButton
                onClick={() => setIsRepositioning(!isRepositioning)}
                variant="primary"
                size="sm"
                className="flex items-center gap-2"
              >
                <ImageIcon size={14} />
                {isRepositioning ? "Done" : "Reposition"}
              </GlowButton>
              <GlowButton
                onClick={() => {
                  setCoverImageUrl(currentCollection.coverImage || "");
                  setCoverImagePosition(currentCollection.coverImagePosition || 50);
                  setShowCoverImageModal(true);
                }}
                variant="primary"
                size="sm"
                className="flex items-center gap-2"
              >
                <ImageIcon size={14} />
                Change Cover
              </GlowButton>
            </div>

            {/* Reposition Overlay - Click and Drag */}
            {isRepositioning && (
              <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center">
                <div
                  className="absolute inset-0 cursor-move"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    const container = e.currentTarget.getBoundingClientRect();

                    const handleMouseMove = (moveEvent: MouseEvent) => {
                      moveEvent.preventDefault();
                      // Calculate position based on mouse Y relative to container
                      const relativeY = moveEvent.clientY - container.top;
                      const newPosition = Math.max(0, Math.min(100, (relativeY / container.height) * 100));
                      dragPositionRef.current = newPosition; // Update ref with live position
                      setCoverImagePosition(newPosition);
                    };

                    const handleMouseUp = async () => {
                      document.removeEventListener('mousemove', handleMouseMove);
                      document.removeEventListener('mouseup', handleMouseUp);

                      // Save the position using the ref value (not stale closure)
                      setLoading(true);
                      try {
                        // Use data-store method for local-first behavior
                        await updateCollection(currentCollection.id, { 
                          coverImagePosition: Math.round(dragPositionRef.current) 
                        });
                        setIsRepositioning(false);
                      } catch (err) {
                        alert("Failed to update position");
                      } finally {
                        setLoading(false);
                      }
                    };

                    document.addEventListener('mousemove', handleMouseMove);
                    document.addEventListener('mouseup', handleMouseUp);
                  }}
                />
                <div className="bg-surface/90 backdrop-blur-sm rounded-lg px-6 py-3 pointer-events-none">
                  <p className="text-sm font-medium text-foreground">Drag to reposition image</p>
                  <p className="text-xs text-muted-foreground mt-1">Position: {Math.round(coverImagePosition)}%</p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setCoverImagePosition(currentCollection.coverImagePosition || 50);
                    setIsRepositioning(false);
                  }}
                  className="absolute top-4 right-4 px-4 py-2 rounded-lg bg-surface/90 backdrop-blur-sm border border-subtle text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-surface transition-colors z-10"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={() => {
              setCoverImageUrl("");
              setShowCoverImageModal(true);
            }}
            className="w-full h-64 -mx-6 -mt-6 mb-6 border-2 border-dashed border-subtle flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-foreground hover:border-accent/50 transition-colors group"
          >
            <ImageIcon size={24} className="group-hover:text-accent transition-colors" />
            <span className="text-sm">Add Cover Image</span>
          </button>
        )}

        {/* Title section - only show if no cover image (otherwise it's in the overlay) */}
        {!currentCollection.coverImage && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
                {layout === "kanban" ? (
                  <KanbanSquare className="h-5 w-5 text-purple-400" />
                ) : (
                  <Folder className="h-5 w-5 text-accent" />
                )}
              </div>
              <div>
                <h1 className="text-2xl font-semibold text-foreground">{currentCollection.name}</h1>

                {/* Breadcrumb Navigation */}
                {breadcrumbs.length > 1 && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                    {breadcrumbs.map((crumb, index) => (
                      <div key={crumb.id} className="flex items-center gap-1">
                        {index > 0 && <ChevronRight size={12} />}
                        {index < breadcrumbs.length - 1 ? (
                          <button
                            onClick={() => router.push(`/pawkits/${crumb.slug}`)}
                            className="hover:text-foreground transition-colors"
                          >
                            {crumb.name}
                          </button>
                        ) : (
                          <span className="text-foreground font-medium">{crumb.name}</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <p className="text-sm text-muted-foreground mt-1">{items.length} card(s)</p>
              </div>
            </div>
          </div>
        )}

        {/* View Tabs - Below cover/title */}
        <ViewTabs layout={layout} onLayoutChange={handleLayoutChange} />

        {/* Sub-Pawkits Section */}
        {subPawkitsGridItems.length > 0 && (
          <div className="mb-8">
            <button
              onClick={toggleSubPawkits}
              className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors mb-4"
            >
              <ChevronDown
                size={16}
                className={`transition-transform ${subPawkitsExpanded ? '' : '-rotate-90'}`}
              />
              <span>Sub-Pawkits ({subPawkitsGridItems.length})</span>
            </button>

            {subPawkitsExpanded && (
              <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                <CollectionsGrid collections={subPawkitsGridItems} allPawkits={allPawkits} />
              </div>
            )}
          </div>
        )}

        {/* Content Section - Kanban View or Regular Cards */}
        {layout === "kanban" ? (
          <>
            {/* Minimal Kanban Header */}
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {items.length} card{items.length !== 1 ? 's' : ''}
              </span>
              {/* Keyboard shortcut hint */}
              <div className="hidden md:flex items-center gap-1 text-xs text-muted-foreground/50">
                <kbd className="px-1 py-0.5 rounded bg-surface-soft/50 text-[10px] font-mono">n</kbd>
                <span>add card</span>
              </div>
            </div>

            {/* Empty State */}
            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-4 rounded-2xl border border-dashed border-subtle bg-surface-soft/30">
                <KanbanSquare className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">No cards yet</h3>
                <p className="text-sm text-muted-foreground text-center max-w-sm mb-4">
                  Start adding cards to organize your work. Click the &quot;Add card&quot; button in any column to get started.
                </p>
              </div>
            ) : (
              <BoardView
                cards={items}
                boardConfig={getBoardConfig(currentCollection)}
                collectionSlug={slug}
                onCardClick={(card) => {
                  // Open card detail panel
                  openCardDetails(card.id);
                }}
                onAddCard={(columnTag) => {
                  // Find the column by tag
                  const kanbanColumns = getKanbanColumns(currentCollection.metadata);
                  const column = kanbanColumns.find(c => c.tag === columnTag)
                    || { id: "temp", tag: columnTag, label: columnTag === null ? "Unsorted" : columnTag };
                  setQuickAddColumn({ tag: column.tag || "", label: column.label });
                  setShowQuickAddCard(true);
                }}
                onColumnsChange={async (columns) => {
                  // Save updated columns to collection metadata
                  try {
                    await updateCollection(currentCollection.id, {
                      metadata: {
                        ...currentCollection.metadata,
                        kanbanColumns: columns.map(col => ({
                          id: col.tag.replace("status:", ""),
                          tag: col.tag,
                          label: col.label,
                          color: col.color,
                        })),
                      },
                    });
                  } catch {
                    // Error handling via toast in BoardView
                  }
                }}
              />
            )}
          </>
        ) : (
          <>
            {/* Regular Cards Section */}
            {items.length > 0 && (
              <div className="mb-3">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-4">
                  <span>Cards ({items.length})</span>
                </div>
              </div>
            )}

            <LibraryWorkspace
              initialCards={items}
              initialNextCursor={undefined}
              initialQuery={{ q, collection: slug, status, layout }}
              collectionsTree={collections}
              collectionName={currentCollection.name}
              storageKey={`pawkit-${slug}-layout`}
              hideControls={true}
              area="pawkit"
            />
          </>
        )}
      </div>

      {/* Create Sub-Pawkit Modal */}
      {showCreateModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !loading) {
              setShowCreateModal(false);
            }
          }}
        >
          <div
            className="bg-gray-950 rounded-lg p-6 w-full max-w-md shadow-xl"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-semibold text-gray-100 mb-4">Create Sub-Pawkit</h2>
            <form onSubmit={handleCreateSubPawkit}>
              <input
                ref={inputRef}
                type="text"
                value={pawkitName}
                onChange={(e) => {
                  setPawkitName(e.target.value);
                  setError(null);
                }}
                placeholder="Enter Pawkit name"
                className="w-full rounded bg-gray-900 px-4 py-2 text-sm text-gray-100 placeholder-gray-500 border border-gray-800 focus:border-accent focus:outline-none"
                autoFocus
                disabled={loading}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    setShowCreateModal(false);
                  }
                }}
              />
              {error && <p className="mt-2 text-xs text-rose-400">{error}</p>}
              <div className="flex gap-3 mt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 rounded bg-gray-900 px-4 py-2 text-sm font-medium text-gray-100 hover:bg-gray-800 transition-colors"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded bg-accent px-4 py-2 text-sm font-medium text-gray-950 hover:bg-accent/90 transition-colors disabled:opacity-50"
                  disabled={loading}
                >
                  {loading ? "Creating..." : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Rename Pawkit Modal */}
      {showRenamePawkitModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => !loading && setShowRenamePawkitModal(false)}
        >
          <div
            className="bg-gray-950 rounded-lg p-6 w-full max-w-md shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-semibold text-gray-100 mb-4">Rename Pawkit</h2>
            <input
              type="text"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              placeholder="Enter new name"
              className="w-full rounded bg-gray-900 px-4 py-2 text-sm text-gray-100 placeholder-gray-500 border border-gray-800 focus:border-accent focus:outline-none"
              autoFocus
              disabled={loading}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleRenamePawkit();
                } else if (e.key === "Escape") {
                  setShowRenamePawkitModal(false);
                }
              }}
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setShowRenamePawkitModal(false)}
                className="flex-1 rounded bg-gray-900 px-4 py-2 text-sm font-medium text-gray-100 hover:bg-gray-800 transition-colors"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                onClick={handleRenamePawkit}
                className="flex-1 rounded bg-accent px-4 py-2 text-sm font-medium text-gray-950 hover:bg-accent/90 transition-colors disabled:opacity-50"
                disabled={loading || !renameValue.trim()}
              >
                {loading ? "Renaming..." : "Rename"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Move Pawkit Modal */}
      {showMovePawkitModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => !loading && setShowMovePawkitModal(false)}
        >
          <div
            className="bg-gray-950 rounded-lg p-6 w-full max-w-md shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-semibold text-gray-100 mb-4">Move to another Pawkit</h2>
            <p className="text-sm text-gray-400 mb-4">
              Select a Pawkit to move this into, or select &quot;Root&quot; to make it a top-level Pawkit.
            </p>
            <div className="max-h-60 overflow-y-auto space-y-2 mb-4">
              <button
                onClick={() => setSelectedMoveTarget(null)}
                className={`w-full rounded px-4 py-2 text-left text-sm transition-colors ${
                  selectedMoveTarget === null
                    ? "bg-accent text-gray-950"
                    : "bg-gray-900 text-gray-300 hover:bg-gray-800"
                }`}
              >
                Root (Top Level)
              </button>
              {allPawkits
                .filter((p) => p.id !== currentCollection.id)
                .map((pawkit) => (
                  <button
                    key={pawkit.id}
                    onClick={() => setSelectedMoveTarget(pawkit.id)}
                    className={`w-full rounded px-4 py-2 text-left text-sm transition-colors ${
                      selectedMoveTarget === pawkit.id
                        ? "bg-accent text-gray-950"
                        : "bg-gray-900 text-gray-300 hover:bg-gray-800"
                    }`}
                  >
                    {pawkit.name}
                  </button>
                ))}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowMovePawkitModal(false)}
                className="flex-1 rounded bg-gray-900 px-4 py-2 text-sm font-medium text-gray-100 hover:bg-gray-800 transition-colors"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                onClick={handleMovePawkit}
                className="flex-1 rounded bg-accent px-4 py-2 text-sm font-medium text-gray-950 hover:bg-accent/90 transition-colors disabled:opacity-50"
                disabled={loading}
              >
                {loading ? "Moving..." : "Move"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Pawkit Confirmation Modal */}
      {showDeletePawkitConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setShowDeletePawkitConfirm(false)}
        >
          <div
            className="bg-gray-950 rounded-lg p-6 w-full max-w-md shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-semibold text-gray-100 mb-4">Delete Pawkit?</h2>
            <p className="text-sm text-gray-400 mb-6">
              This will permanently delete this Pawkit and all its contents. This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeletePawkitConfirm(false)}
                className="flex-1 rounded bg-gray-900 px-4 py-2 text-sm font-medium text-gray-100 hover:bg-gray-800 transition-colors"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                onClick={handleDeletePawkit}
                className="flex-1 rounded bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 transition-colors disabled:opacity-50"
                disabled={loading}
              >
                {loading ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cover Image Modal */}
      {showCoverImageModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => !loading && setShowCoverImageModal(false)}
        >
          <div
            className="bg-surface rounded-2xl p-6 w-full max-w-md shadow-xl border border-subtle"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-semibold text-foreground mb-4">
              {currentCollection.coverImage ? "Change Cover Image" : "Add Cover Image"}
            </h2>
            <div className="space-y-4">
              <div>
                <label htmlFor="coverImageUrl" className="block text-sm font-medium text-muted-foreground mb-2">
                  Image URL
                </label>
                <input
                  id="coverImageUrl"
                  type="url"
                  value={coverImageUrl}
                  onChange={(e) => setCoverImageUrl(e.target.value)}
                  placeholder="https://example.com/image.jpg"
                  className="w-full px-3 py-2 bg-surface-soft border border-subtle rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/50"
                  disabled={loading}
                />
              </div>
              {coverImageUrl && (
                <div className="relative w-full h-32 rounded-lg overflow-hidden border border-subtle">
                  <img
                    src={coverImageUrl}
                    alt="Preview"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.src = "";
                      e.currentTarget.alt = "Invalid image URL";
                    }}
                  />
                </div>
              )}
            </div>
            <div className="flex gap-3 mt-6">
              {currentCollection.coverImage && (
                <button
                  onClick={async () => {
                    setCoverImageUrl("");
                    await handleSetCoverImage();
                  }}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
                  disabled={loading}
                >
                  Remove
                </button>
              )}
              <div className="flex-1" />
              <button
                onClick={() => setShowCoverImageModal(false)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                onClick={handleSetCoverImage}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-accent text-accent-foreground hover:bg-accent/90 transition-colors disabled:opacity-50"
                disabled={loading || !coverImageUrl.trim()}
              >
                {loading ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Add Card Modal for Boards */}
      {showQuickAddCard && quickAddColumn && (
        <QuickAddCardModal
          open={showQuickAddCard}
          onClose={() => {
            setShowQuickAddCard(false);
            setQuickAddColumn(null);
          }}
          collectionSlug={slug}
          statusTag={quickAddColumn.tag}
          columnLabel={quickAddColumn.label}
        />
      )}

    </>
  );
}

export default function CollectionPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <CollectionPageContent />
    </Suspense>
  );
}
