"use client";

import { useRouter, usePathname } from "next/navigation";
import Image from "next/image";
import { useState, useMemo, useCallback, useEffect } from "react";
import { Home, Library, FileText, Calendar, Tag, Briefcase, FolderOpen, ChevronRight, ChevronDown, Layers, X, ArrowUpRight, ArrowDownLeft, Clock, CalendarDays, CalendarClock, Flame, Plus, Check, Minus, Pin, PinOff, GripVertical, FolderPlus, Edit3, ArrowUpDown, Trash2, Sparkles, type LucideIcon } from "lucide-react";
import { shallow } from "zustand/shallow";
import { PanelSection } from "@/components/control-panel/control-panel";
import { usePanelStore } from "@/lib/hooks/use-panel-store";
import { useDataStore } from "@/lib/stores/data-store";
import { useToastStore } from "@/lib/stores/toast-store";
import { useRecentHistory } from "@/lib/hooks/use-recent-history";
import { useSettingsStore } from "@/lib/hooks/settings-store";
import { useRediscoverStore } from "@/lib/hooks/rediscover-store";
import { GenericContextMenu, type ContextMenuItemConfig } from "@/components/ui/generic-context-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { findDailyNoteForDate, generateDailyNoteTitle, generateDailyNoteContent, getDailyNotes } from "@/lib/utils/daily-notes";
import { type CollectionNode, type CardType, type CardModel } from "@/lib/types";
import { CreateNoteModal } from "@/components/modals/create-note-modal";
import { ConfirmDeleteModal } from "@/components/modals/confirm-delete-modal";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

type NavItem = {
  id: string;
  label: string;
  icon: LucideIcon;
  path: string; // Relative path without prefix
};

const navigationItems: NavItem[] = [
  { id: "library", label: "Library", icon: Library, path: "/library" },
  { id: "calendar", label: "Calendar", icon: Calendar, path: "/calendar" },
];

export type LeftPanelMode = "floating" | "anchored";

type LeftNavigationPanelProps = {
  open: boolean;
  onClose: () => void;
  mode?: LeftPanelMode;
  onModeChange?: (mode: LeftPanelMode) => void;
  username?: string;
  displayName?: string | null;
  collections?: CollectionNode[];
};

export function LeftNavigationPanel({
  open,
  onClose,
  mode = "floating",
  onModeChange,
  username = "User",
  displayName,
  collections = []
}: LeftNavigationPanelProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [expandedCollections, setExpandedCollections] = useState<Set<string>>(new Set());
  const [hoveredPawkit, setHoveredPawkit] = useState<string | null>(null);
  const [animatingPawkit, setAnimatingPawkit] = useState<string | null>(null);
  const [showCreatePawkitModal, setShowCreatePawkitModal] = useState(false);
  const [newPawkitName, setNewPawkitName] = useState("");
  const [creatingPawkit, setCreatingPawkit] = useState(false);
  const [parentPawkitId, setParentPawkitId] = useState<string | null>(null);
  const [hoveredCreatePawkit, setHoveredCreatePawkit] = useState<string | null>(null);
  const [showCreateNoteModal, setShowCreateNoteModal] = useState(false);

  // Rename modal state
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [renameCollectionId, setRenameCollectionId] = useState<string | null>(null);
  const [renameCollectionName, setRenameCollectionName] = useState("");
  const [renameValue, setRenameValue] = useState("");
  const [renamingCollection, setRenamingCollection] = useState(false);

  // Delete confirmation modal state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [collectionToDelete, setCollectionToDelete] = useState<CollectionNode | null>(null);

  // Get pinned note IDs and active card first (needed for selective subscription)
  const pinnedNoteIds = useSettingsStore((state) => state.pinnedNoteIds);
  const reorderPinnedNotes = useSettingsStore((state) => state.reorderPinnedNotes);
  const unpinNote = useSettingsStore((state) => state.unpinNote);
  const activeCardId = usePanelStore((state) => state.activeCardId);
  const openCardDetails = usePanelStore((state) => state.openCardDetails);
  const collapsedSections = usePanelStore((state) => state.collapsedSections);
  const toggleSection = usePanelStore((state) => state.toggleSection);

  // PERFORMANCE: Selective subscription - only get cards we actually need for the sidebar
  // This prevents re-renders when unrelated cards change
  const store = useDataStore();
  const cards = useDataStore((state) => {
    return state.cards.filter((card) => {
      // Include daily notes (for streak, navigation)
      if (card.tags?.includes('daily')) return true;
      // Include pinned notes
      if (pinnedNoteIds.includes(card.id)) return true;
      // Include active card (for pawkit actions)
      if (card.id === activeCardId) return true;
      return false;
    });
  }, shallow);

  // Get action methods (these don't cause re-renders)
  const { addCard, updateCard, addCollection, updateCollection, deleteCollection } = store;
  const { recentItems } = useRecentHistory();

  const activeCard = useMemo(() => {
    return cards.find((card) => card.id === activeCardId) ?? null;
  }, [cards, activeCardId]);

  // Calculate daily note streak
  const dailyNoteStreak = useMemo(() => {
    const dailyNotes = getDailyNotes(cards);
    if (dailyNotes.length === 0) return 0;

    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < 365; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(today.getDate() - i);
      const dateString = checkDate.toISOString().split('T')[0];

      const hasNote = dailyNotes.some(note => note.date === dateString);
      if (hasNote) {
        streak++;
      } else if (i > 0) {
        break;
      }
    }

    return streak;
  }, [cards]);

  // Check if today's daily note exists
  const dailyNoteExists = useMemo(() => {
    const today = new Date();
    return findDailyNoteForDate(cards, today) !== null;
  }, [cards]);

  // Get sidebar visibility settings
  const showKeyboardShortcutsInSidebar = useSettingsStore((state) => state.showKeyboardShortcutsInSidebar);

  // Get Rediscover mode state
  const rediscoverStore = useRediscoverStore();

  // Calculate uncategorized cards count for Rediscover badge
  // Uses a separate subscription to avoid re-renders from unrelated card changes
  const uncategorizedCount = useDataStore((state) => {
    // Build a set of private collection SLUGS for fast lookup
    const privateCollectionSlugs = new Set<string>();
    const getAllPrivateSlugs = (nodes: CollectionNode[]): void => {
      for (const node of nodes) {
        if (node.isPrivate) {
          privateCollectionSlugs.add(node.slug);
        }
        if (node.children && node.children.length > 0) {
          getAllPrivateSlugs(node.children);
        }
      }
    };
    getAllPrivateSlugs(state.collections);

    // Count bookmarks with no tags AND no collections (excluding deleted, den, private, reviewed)
    return state.cards.filter(card => {
      if (card.deleted === true) return false;
      if (card.type !== "url") return false; // Only bookmarks, not notes
      if (card.collections?.includes('the-den')) return false;
      const isInPrivateCollection = card.collections?.some(collectionSlug =>
        privateCollectionSlugs.has(collectionSlug)
      );
      if (isInPrivateCollection) return false;

      // Exclude cards already reviewed in Rediscover
      const metadata = card.metadata as Record<string, unknown> | undefined;
      if (metadata?.rediscoverReviewedAt) return false;

      // Uncategorized = no tags AND no collections
      const hasNoTags = !card.tags || card.tags.length === 0;
      const hasNoCollections = !card.collections || card.collections.length === 0;
      return hasNoTags && hasNoCollections;
    }).length;
  });

  const pinnedNotes = useMemo(() => {
    return pinnedNoteIds
      .map(id => cards.find(card => card.id === id))
      .filter((note): note is NonNullable<typeof note> => note != null && note.deleted !== true); // Filter out deleted or non-existent notes
  }, [pinnedNoteIds, cards]);

  // Drag and drop for pinned notes
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = pinnedNoteIds.indexOf(active.id as string);
      const newIndex = pinnedNoteIds.indexOf(over.id as string);

      if (oldIndex !== -1 && newIndex !== -1) {
        const newOrder = arrayMove(pinnedNoteIds, oldIndex, newIndex);
        reorderPinnedNotes(newOrder);
      }
    }
  };

  const handleModeToggle = () => {
    const newMode = mode === "floating" ? "anchored" : "floating";
    onModeChange?.(newMode);
  };

  const handleNavigate = (path: string) => {
    router.push(path);
  };

  const toggleCollection = (id: string) => {
    setExpandedCollections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Auto-expand current pawkit when viewing it
  useEffect(() => {
    // Check if we're on a pawkit page
    const pawkitMatch = pathname?.match(/\/pawkits\/([^/?]+)/);
    if (!pawkitMatch) return;

    const slug = pawkitMatch[1];

    // Find the collection by slug
    const findCollectionById = (cols: CollectionNode[]): string | null => {
      for (const col of cols) {
        if (col.slug === slug) return col.id;
        if (col.children) {
          const found = findCollectionById(col.children);
          if (found) return found;
        }
      }
      return null;
    };

    const collectionId = findCollectionById(collections);
    if (collectionId) {
      // Auto-expand this collection to show its children
      setExpandedCollections((prev) => {
        const next = new Set(prev);
        next.add(collectionId);
        return next;
      });
    }
  }, [pathname, collections]);

  // Handle ESC key to close rename modal (prevent closing sidebar)
  useEffect(() => {
    if (!showRenameModal) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation(); // Prevent sidebar from closing
        e.preventDefault();
        if (!renamingCollection) {
          setShowRenameModal(false);
          setRenameValue("");
          setRenameCollectionId(null);
          setRenameCollectionName("");
        }
      }
    };

    // Add listener with capture phase to intercept before it bubbles
    document.addEventListener("keydown", handleKeyDown, true);

    return () => {
      document.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [showRenameModal, renamingCollection]);

  // Navigate to today's note
  const goToTodaysNote = useCallback(async () => {
    const today = new Date();
    const existingNote = findDailyNoteForDate(cards, today);

    if (existingNote) {
      router.push(`/notes#${existingNote.id}`);
    } else {
      const title = generateDailyNoteTitle(today);
      const content = generateDailyNoteContent(today);

      const newCard = await addCard({
        type: 'md-note',
        title,
        content,
        tags: ['daily'],
        inDen: false,
      });
      useToastStore.getState().success("Daily note created");

      // Navigate to the newly created note
      // The card should now be in the cards array after addCard completes
      setTimeout(() => {
        const newNote = findDailyNoteForDate(cards, today);
        if (newNote) {
          router.push(`/notes#${newNote.id}`);
        }
      }, 200);
    }
  }, [cards, addCard, router]);

  // Handle creating note from modal
  const handleCreateNote = useCallback(async (data: { type: CardType; title: string; content?: string; tags?: string[] }) => {
    let finalTitle = data.title;
    let finalContent = data.content || "";
    let finalTags = data.tags || [];

    // If it's a daily note (has 'daily' tag), generate title and content
    if (data.tags?.includes('daily')) {
      const today = new Date();
      finalTitle = generateDailyNoteTitle(today);
      finalContent = generateDailyNoteContent(today);
    }

    const newCard = await addCard({
      type: data.type,
      title: finalTitle,
      content: finalContent,
      tags: finalTags,
      inDen: false,
    });

    // Navigate to the newly created note
    setTimeout(() => {
      router.push('/notes');
    }, 100);
  }, [addCard, router]);

  // Navigate to yesterday's note
  const goToYesterdaysNote = () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const existingNote = findDailyNoteForDate(cards, yesterday);

    if (existingNote) {
      router.push(`/notes#${existingNote.id}`);
    } else {
      router.push('/calendar');
    }
  };

  // Add card to collection
  const addToCollection = async (collectionSlug: string, collectionName: string) => {
    if (!activeCard) {
      return;
    }

    // Start animation (use slug for consistency)
    setAnimatingPawkit(collectionSlug);

    // Add collection to card
    const currentCollections = activeCard.collections || [];
    if (!currentCollections.includes(collectionSlug)) {
      const newCollections = [...currentCollections, collectionSlug];

      await updateCard(activeCard.id, {
        collections: newCollections
      });

      // Show toast
      useToastStore.getState().success(`Added to ${collectionName}`);
    } else {
    }

    // End animation after 1500ms (matches animation duration)
    setTimeout(() => {
      setAnimatingPawkit(null);
    }, 1500);
  };

  // Remove card from collection
  const removeFromCollection = async (collectionSlug: string, collectionName: string) => {
    if (!activeCard) return;

    const currentCollections = activeCard.collections || [];
    if (currentCollections.includes(collectionSlug)) {
      await updateCard(activeCard.id, {
        collections: currentCollections.filter((slug) => slug !== collectionSlug)
      });

      // Show toast
      useToastStore.getState().success(`Removed from ${collectionName}`);
    }
  };

  // Check if active card is in a collection
  const isCardInCollection = (collectionSlug: string) => {
    if (!activeCard) return false;
    return activeCard.collections?.includes(collectionSlug) || false;
  };

  // Create new pawkit
  const handleCreatePawkit = async () => {
    const trimmedName = newPawkitName.trim();
    if (!trimmedName || creatingPawkit) return;

    setCreatingPawkit(true);
    try {
      const payload: { name: string; parentId?: string } = { name: trimmedName };
      if (parentPawkitId) {
        payload.parentId = parentPawkitId;
      }

      await addCollection(payload);

      // Show toast
      useToastStore.getState().success(parentPawkitId ? "Sub-Pawkit created" : "Pawkit created");

      // Reset and close modal
      setNewPawkitName("");
      setShowCreatePawkitModal(false);
      setParentPawkitId(null);
    } catch (error) {
    } finally {
      setCreatingPawkit(false);
    }
  };

  const handleRenameCollection = async () => {
    const trimmedName = renameValue.trim();
    if (!trimmedName || !renameCollectionId || renamingCollection) return;
    if (trimmedName === renameCollectionName) {
      // No change, just close
      setShowRenameModal(false);
      setRenameValue("");
      setRenameCollectionId(null);
      setRenameCollectionName("");
      return;
    }

    setRenamingCollection(true);
    try {
      await updateCollection(renameCollectionId, { name: trimmedName });

      // Show toast
      useToastStore.getState().success("Pawkit renamed");

      // Reset and close modal
      setShowRenameModal(false);
      setRenameValue("");
      setRenameCollectionId(null);
      setRenameCollectionName("");
    } catch (error) {
    } finally {
      setRenamingCollection(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!collectionToDelete) return;
    try {
      await deleteCollection(collectionToDelete.id);

      // Show toast
      useToastStore.getState().success("Pawkit deleted");
    } catch (error) {
    }
  };

  if (!open) return null;

  // Sortable Pinned Note component
  const SortablePinnedNote = ({ note }: { note: CardModel }) => {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({ id: note.id });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.5 : 1,
    };

    const pinnedNoteContextMenuItems: ContextMenuItemConfig[] = [
      {
        label: "Unpin from sidebar",
        icon: PinOff,
        onClick: () => unpinNote(note.id),
      },
    ];

    return (
      <GenericContextMenu items={pinnedNoteContextMenuItems}>
        <div
          ref={setNodeRef}
          style={style}
          className="w-full flex items-center gap-2 group/pinned-note"
        >
          <button
            onClick={() => openCardDetails(note.id)}
            className="flex-1 flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all text-muted-foreground hover:text-foreground hover:bg-white/5"
          >
            <Pin size={16} className="flex-shrink-0 text-purple-400" />
            <span className="flex-1 text-left truncate">{note.title}</span>
          </button>
          <div
            {...attributes}
            {...listeners}
            className="p-1 rounded transition-colors hover:bg-white/10 text-muted-foreground opacity-0 group-hover/pinned-note:opacity-100 cursor-grab active:cursor-grabbing flex-shrink-0"
          >
            <GripVertical size={16} />
          </div>
        </div>
      </GenericContextMenu>
    );
  };

  // Recursive function to render collection tree at any depth
  const renderCollectionTree = (collection: CollectionNode, depth: number = 0) => {
    const hasChildren = collection.children && collection.children.length > 0;
    const isExpanded = expandedCollections.has(collection.id);
    const pawkitHref = `/pawkits/${collection.slug || collection.id}`;
    const isCollectionActive = pathname === pawkitHref;
    const cardInCollection = isCardInCollection(collection.slug);
    const isHovered = hoveredPawkit === collection.slug;
    const isAnimating = animatingPawkit === collection.slug;
    const isCreateHovered = hoveredCreatePawkit === collection.id;

    // Determine size and spacing based on depth
    const iconSize = depth === 0 ? 14 : 12;
    const textSize = depth === 0 ? "text-sm" : "text-xs";
    const padding = depth === 0 ? "px-3 py-2" : "px-3 py-1.5";

    // Helper function to build move submenu items recursively
    const buildMoveMenuItems = (
      collections: CollectionNode[],
      currentCollectionId: string
    ): ContextMenuItemConfig[] => {
      const items: ContextMenuItemConfig[] = [];

      for (const col of collections) {
        // Skip the current collection, its descendants, and deleted collections
        if (col.id === currentCollectionId || col.deleted) continue;

        const hasChildren = col.children && col.children.length > 0;

        if (hasChildren) {
          // Filter out current collection and deleted children
          const filteredChildren = col.children.filter(
            (child) => child.id !== currentCollectionId && child.deleted !== true
          );

          if (filteredChildren.length > 0) {
            items.push({
              type: "submenu" as const,
              label: col.name,
              items: [
                {
                  label: `Move to ${col.name}`,
                  onClick: async () => {
                    try {
                      await updateCollection(currentCollectionId, { parentId: col.id });
                    } catch (err) {
                    }
                  },
                },
                { type: "separator" as const },
                ...buildMoveMenuItems(filteredChildren, currentCollectionId),
              ],
            });
          } else {
            // No valid children, just add the parent option
            items.push({
              label: col.name,
              onClick: async () => {
                try {
                  await updateCollection(currentCollectionId, { parentId: col.id });
                } catch (err) {
                }
              },
            });
          }
        } else {
          items.push({
            label: col.name,
            onClick: async () => {
              try {
                await updateCollection(currentCollectionId, { parentId: col.id });
              } catch (err) {
              }
            },
          });
        }
      }

      return items;
    };

    // Define context menu items for collection management
    const moveMenuItems = buildMoveMenuItems(collections, collection.id);

    const contextMenuItems = [
      {
        label: "Open",
        icon: FolderOpen,
        onClick: () => handleNavigate(pawkitHref),
      },
      {
        label: "New sub-collection",
        icon: FolderPlus,
        onClick: () => {
          setParentPawkitId(collection.id);
          setShowCreatePawkitModal(true);
        },
      },
      { type: "separator" as const },
      {
        label: "Rename",
        icon: Edit3,
        onClick: () => {
          setRenameCollectionId(collection.id);
          setRenameCollectionName(collection.name);
          setRenameValue(collection.name);
          setShowRenameModal(true);
        },
      },
      {
        type: "submenu" as const,
        label: "Move to",
        icon: ArrowUpDown,
        items: [
          {
            label: "Root (Top Level)",
            onClick: async () => {
              try {
                await updateCollection(collection.id, { parentId: null });
              } catch (err) {
              }
            },
          },
          ...(moveMenuItems.length > 0 ? [{ type: "separator" as const }, ...moveMenuItems] : []),
        ],
      },
      { type: "separator" as const },
      {
        label: "Delete",
        icon: Trash2,
        onClick: () => {
          setCollectionToDelete(collection);
          setShowDeleteConfirm(true);
        },
        destructive: true,
      },
    ];

    const collectionContent = (
      <div key={collection.id}>
        <div
          className="flex items-center gap-1 group/pawkit"
          onMouseEnter={() => !activeCard && setHoveredCreatePawkit(collection.id)}
          onMouseLeave={() => setHoveredCreatePawkit(null)}
        >
          <div
            className="relative flex-1"
            onMouseEnter={() => activeCard && setHoveredPawkit(collection.slug)}
            onMouseLeave={() => setHoveredPawkit(null)}
          >
            <button
              onClick={() => handleNavigate(pawkitHref)}
              className={`
                w-full flex items-center gap-2 ${padding} rounded-lg ${textSize} transition-all relative overflow-hidden
                ${isCollectionActive
                  ? "text-accent-foreground font-medium shadow-glow-accent-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                }
              `}
            >
              {isCollectionActive && (
                <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent to-transparent opacity-75" />
              )}
              <FolderOpen size={iconSize} className="flex-shrink-0" />
              <span className="flex-1 text-left truncate">{collection.name}</span>

              {/* Action buttons - only show when card modal is open */}
              {activeCard && (
                <div className="flex items-center gap-1 flex-shrink-0">
                  {cardInCollection ? (
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFromCollection(collection.slug, collection.name);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.stopPropagation();
                          removeFromCollection(collection.slug, collection.name);
                        }
                      }}
                      className="p-1 rounded transition-colors relative cursor-pointer"
                      title={isHovered ? "Remove from pawkit" : "In this pawkit"}
                    >
                      {isHovered ? (
                        <Minus size={iconSize} className="text-red-400" />
                      ) : (
                        <Check size={iconSize} className="text-muted-foreground" />
                      )}
                      {isAnimating && (
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none z-10">
                          <div
                            className="animate-expand-contract-fade absolute h-8 w-8 rounded-full"
                            style={{
                              background: 'linear-gradient(180deg, hsla(var(--accent) / 0.2) 0%, hsla(var(--accent) / 0.35) 55%, hsla(var(--accent) / 0.6) 100%)'
                            }}
                          />
                          <Check size={iconSize} className="text-white relative z-10" />
                        </div>
                      )}
                    </div>
                  ) : isHovered && (
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={(e) => {
                        e.stopPropagation();
                        addToCollection(collection.slug, collection.name);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.stopPropagation();
                          addToCollection(collection.slug, collection.name);
                        }
                      }}
                      className="p-1 rounded transition-colors relative cursor-pointer"
                      title="Add to pawkit"
                    >
                      <Plus size={iconSize} className="text-purple-400" />
                      {isAnimating && (
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none z-10">
                          <div
                            className="animate-expand-contract-fade absolute h-8 w-8 rounded-full"
                            style={{
                              background: 'linear-gradient(180deg, hsla(var(--accent) / 0.2) 0%, hsla(var(--accent) / 0.35) 55%, hsla(var(--accent) / 0.6) 100%)'
                            }}
                          />
                          <Check size={iconSize} className="text-white relative z-10" />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </button>
          </div>

          {/* + Button for creating sub-pawkit - show when no active card */}
          {!activeCard && isCreateHovered && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setParentPawkitId(collection.id);
                setShowCreatePawkitModal(true);
              }}
              className="p-1 rounded transition-colors hover:bg-white/10 text-purple-400"
              title="Create sub-pawkit"
            >
              <Plus size={iconSize} />
            </button>
          )}

          {/* Chevron for expanding/collapsing children */}
          {hasChildren && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                const newExpanded = new Set(expandedCollections);
                if (isExpanded) {
                  newExpanded.delete(collection.id);
                } else {
                  newExpanded.add(collection.id);
                }
                setExpandedCollections(newExpanded);
              }}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors text-muted-foreground hover:text-foreground"
            >
              <ChevronRight
                size={14}
                className={`transition-transform ${isExpanded ? 'rotate-90' : ''}`}
              />
            </button>
          )}
        </div>

        {/* Recursively render children */}
        {hasChildren && isExpanded && collection.children && (
          <div className="ml-6 mt-1 space-y-1">
            {collection.children.filter(c => !c.deleted).map((child) => renderCollectionTree(child, depth + 1))}
          </div>
        )}
      </div>
    );

    // Wrap with context menu
    return (
      <GenericContextMenu items={contextMenuItems}>
        {collectionContent}
      </GenericContextMenu>
    );
  };

  return (
    <>
      {/* Subtle backdrop - only in floating mode */}
      {mode === "floating" && (
        <div className="fixed inset-0 bg-black/10 z-40 pointer-events-none" />
      )}

      {/* Left Navigation Panel */}
      <div
        className={`
          fixed top-0 left-0 bottom-0 w-[325px] z-[102]
          bg-white/5 backdrop-blur-lg
          flex flex-col
          animate-slide-in-left
          ${mode === "floating"
            ? "m-4 rounded-2xl shadow-2xl border border-white/10"
            : "border-r border-white/10"
          }
        `}
        style={{
          boxShadow: mode === "floating"
            ? "0 25px 50px -12px rgba(0, 0, 0, 0.5), inset 0 2px 4px 0 rgba(255, 255, 255, 0.06)"
            : "inset 0 2px 4px 0 rgba(255, 255, 255, 0.06)"
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - Icon-only controls */}
        <TooltipProvider>
          <div className="flex items-center justify-between gap-2 p-3 border-b border-white/10">
            {/* Workspace Selector - Pill Shape */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  className="flex items-center gap-2 px-4 h-10 rounded-full bg-white/5 hover:bg-white/10 transition-colors border border-white/10"
                  aria-label="Workspace"
                >
                  <Briefcase size={16} className="text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">Personal</span>
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="z-[200]">
                <div className="text-center">
                  <div className="font-semibold">Personal</div>
                  <div className="text-xs text-muted-foreground">Switch workspace</div>
                </div>
              </TooltipContent>
            </Tooltip>

            {/* Right side buttons */}
            <div className="flex items-center gap-1">
              {/* Float/Anchor Toggle */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={handleModeToggle}
                    className="p-2 rounded-lg hover:bg-white/10 transition-colors text-muted-foreground hover:text-foreground"
                    aria-label={mode === "floating" ? "Anchor panel" : "Float panel"}
                  >
                    {mode === "floating" ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="z-[200]">{mode === "floating" ? "Anchor" : "Float"}</TooltipContent>
              </Tooltip>

              {/* Close Button */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={onClose}
                    className="p-2 rounded-lg hover:bg-white/10 transition-colors text-muted-foreground hover:text-foreground"
                    aria-label="Close panel"
                  >
                    <X size={18} />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="z-[200]">Close</TooltipContent>
              </Tooltip>
            </div>
          </div>
        </TooltipProvider>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4"
          style={{
            maskImage: "linear-gradient(to bottom, transparent 0%, black 24px, black calc(100% - 24px), transparent 100%)",
            WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, black 24px, black calc(100% - 24px), transparent 100%)"
          }}
        >
          {rediscoverStore.isActive ? (
            // Rediscover Queue View
            <div className="flex flex-col h-full">
              {/* Header - Fixed */}
              <div className="space-y-4 flex-shrink-0">
                <h2 className="text-lg font-semibold text-foreground">Queue</h2>

                {/* Filter Dropdown */}
                <div className="relative">
                  <select
                    value={rediscoverStore.filter}
                    onChange={(e) => rediscoverStore.setFilter(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-foreground appearance-none cursor-pointer hover:bg-white/10 transition-colors"
                  >
                    <option value="uncategorized">Uncategorized</option>
                    <option value="all">All Bookmarks</option>
                    <option value="untagged">Untagged</option>
                    <option value="never-opened">Never Opened</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                </div>

                {/* Counter */}
                <div className="text-sm text-muted-foreground">
                  {rediscoverStore.queue.length - rediscoverStore.currentIndex} {rediscoverStore.queue.length - rediscoverStore.currentIndex === 1 ? 'card' : 'cards'} remaining
                </div>
              </div>

              {/* Queue List - Scrollable, fills remaining height */}
              <div className="flex-1 overflow-y-auto mt-6">
                <div className="space-y-3">
                  {rediscoverStore.queue.slice(rediscoverStore.currentIndex + 1).length === 0 ? (
                    <div className="text-center text-muted-foreground text-sm py-8">
                      No more cards in queue
                    </div>
                  ) : (
                    rediscoverStore.queue.slice(rediscoverStore.currentIndex + 1).map((card, index) => (
                      <div
                        key={card.id}
                        className="flex gap-3 p-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                      >
                        {/* Thumbnail */}
                        <div className="relative w-12 h-12 flex-shrink-0 rounded overflow-hidden bg-white/5">
                          {card.image ? (
                            <Image
                              src={card.image}
                              alt={card.title || "Card"}
                              fill
                              className="object-cover"
                              unoptimized
                            />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-purple-500/20 to-pink-500/20" />
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-foreground truncate">
                            {card.title || "Untitled"}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {card.domain || (card.url ? new URL(card.url).hostname : "")}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          ) : (
            // Normal Navigation View
            <>
              {/* Home Section */}
              <PanelSection
            id="left-home"
            title="Home"
            icon={<Home className={`h-4 w-4 ${pathname === "/home" ? "text-accent drop-shadow-glow-accent" : "text-accent"}`} />}
            active={pathname === "/home"}
            onClick={() => {
              handleNavigate("/home");
              // Ensure section is expanded when clicking header
              if (collapsedSections["left-home"]) {
                toggleSection("left-home");
              }
            }}
          >
            <div className="space-y-1">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                const fullPath = item.path;
                const isActive = pathname === fullPath;
                return (
                  <button
                    key={item.id}
                    data-tour={`${item.id}-link`}
                    onClick={() => handleNavigate(item.path)}
                    className={`
                      w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all relative
                      ${isActive
                        ? "text-accent-foreground font-medium shadow-glow-accent-sm"
                        : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                      }
                    `}
                  >
                    <Icon size={16} className="flex-shrink-0" />
                    <span className="flex-1 text-left">{item.label}</span>
                    {isActive && (
                      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent to-transparent opacity-75" />
                    )}
                  </button>
                );
              })}

              {/* Rediscover - Navigate to Library in rediscover mode */}
              <button
                onClick={() => handleNavigate("/library?mode=rediscover")}
                className={`
                  w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all relative
                  ${rediscoverStore.isActive
                    ? "text-accent-foreground font-medium shadow-glow-accent-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                  }
                `}
              >
                <Sparkles size={16} className="flex-shrink-0" />
                <span className="flex-1 text-left">Rediscover</span>
                {uncategorizedCount > 0 && (
                  <span className="text-xs text-muted-foreground">({uncategorizedCount})</span>
                )}
                {rediscoverStore.isActive && (
                  <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent to-transparent opacity-75" />
                )}
              </button>
            </div>
          </PanelSection>

          {/* Pawkits Section */}
          {collections.length > 0 && (
            <div className="space-y-3 pb-3" data-tour="pawkits-link">
              <div className={`w-full flex items-center gap-2 group relative ${pathname === "/pawkits" ? "pb-2" : ""}`}>
                <GenericContextMenu
                  items={[
                    {
                      label: "View All Pawkits",
                      icon: FolderOpen,
                      onClick: () => handleNavigate("/pawkits"),
                    },
                    {
                      label: "Create New Pawkit",
                      icon: Plus,
                      onClick: () => setShowCreatePawkitModal(true),
                    },
                  ]}
                >
                  <button
                    onClick={() => {
                      handleNavigate("/pawkits");
                      // Ensure section is expanded when clicking header
                      if (collapsedSections["left-pawkits"]) {
                        toggleSection("left-pawkits");
                      }
                    }}
                    className="flex items-center gap-2 hover:opacity-80 transition-opacity flex-1"
                  >
                    <FolderOpen className={`h-4 w-4 ${pathname === "/pawkits" ? "text-accent drop-shadow-glow-accent" : "text-accent"}`} />
                    <h3 className={`text-sm font-semibold uppercase tracking-wide transition-all ${
                      pathname === "/pawkits" ? "text-accent-foreground drop-shadow-glow-accent" : "text-foreground"
                    }`}>
                      Pawkits
                    </h3>
                  </button>
                </GenericContextMenu>
                {pathname === "/pawkits" && (
                  <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent to-transparent opacity-75" />
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowCreatePawkitModal(true);
                  }}
                  className="p-1 rounded transition-colors hover:bg-white/10 text-purple-400 opacity-0 group-hover:opacity-100 flex-shrink-0"
                  title="Create new pawkit"
                >
                  <Plus size={16} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleSection("left-pawkits");
                  }}
                  className="p-1 rounded transition-colors hover:bg-white/10 text-muted-foreground hover:text-foreground"
                >
                  <ChevronRight
                    size={14}
                    className={`transition-transform ${collapsedSections["left-pawkits"] ? "" : "rotate-90"}`}
                  />
                </button>
              </div>
              {!collapsedSections["left-pawkits"] && (
                <div className="space-y-1">
                  {collections.filter(p => !p.deleted).map((collection) => renderCollectionTree(collection, 0))}
                </div>
              )}
            </div>
          )}

          {/* Notes Section */}
          <PanelSection
            id="left-notes"
            title="Notes"
            icon={<FileText className={`h-4 w-4 ${pathname === "/notes" ? "text-accent drop-shadow-glow-accent" : "text-accent"}`} />}
            active={pathname === "/notes"}
            onClick={() => {
              handleNavigate("/notes");
              // Ensure section is expanded when clicking header
              if (collapsedSections["left-notes"]) {
                toggleSection("left-notes");
              }
            }}
            action={
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowCreateNoteModal(true);
                }}
                className="p-1 rounded transition-colors hover:bg-white/10 text-purple-400 opacity-0 group-hover:opacity-100"
                title="Create new note"
              >
                <Plus size={16} />
              </button>
            }
          >
            <div className="space-y-1">
              <button
                onClick={goToTodaysNote}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all text-muted-foreground hover:text-foreground hover:bg-white/5"
              >
                <CalendarDays size={16} className="flex-shrink-0" />
                <span className="flex-1 text-left">Today&apos;s Note</span>
              </button>
              {dailyNoteStreak > 0 && (
                <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground">
                  <Flame size={16} className="text-orange-500" />
                  <span>{dailyNoteStreak} day streak</span>
                </div>
              )}

              {/* Pinned Notes */}
              {pinnedNotes.length > 0 && (
                <div className="pt-2 space-y-1">
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext
                      items={pinnedNoteIds}
                      strategy={verticalListSortingStrategy}
                    >
                      {pinnedNotes.map((note) => (
                        <SortablePinnedNote key={note.id} note={note} />
                      ))}
                    </SortableContext>
                  </DndContext>
                </div>
              )}
            </div>
          </PanelSection>

          {/* Recently Viewed Section */}
          {recentItems.length > 0 && (
            <PanelSection id="left-recently-viewed" title="Recently Viewed" icon={<Clock className="h-4 w-4 text-accent" />}>
              <div className="space-y-1">
                {recentItems.slice(0, 5).map((item) => (
                  <button
                    key={item.id}
                    onClick={() => openCardDetails(item.id)}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all text-muted-foreground hover:text-foreground hover:bg-white/5"
                  >
                    <Clock size={16} className="flex-shrink-0" />
                    <span className="flex-1 text-left truncate">{item.title}</span>
                  </button>
                ))}
              </div>
            </PanelSection>
          )}
            </>
          )}
        </div>

        {/* Keyboard Shortcuts Footer - Fixed at bottom - Conditional based on settings */}
        {showKeyboardShortcutsInSidebar && (
          <div className="px-4 py-3 border-t border-white/5">
            <div className="text-xs text-muted-foreground space-y-2">
              <div className="flex items-center justify-between">
                <span>Quick search</span>
                <kbd className="px-2 py-0.5 rounded bg-white/10 font-mono text-xs">/</kbd>
              </div>
              <div className="flex items-center justify-between">
                <span>Paste URL</span>
                <kbd className="px-2 py-0.5 rounded bg-white/10 font-mono text-xs">Cmd/Ctrl + V</kbd>
              </div>
              <div className="flex items-center justify-between">
                <span>Add card</span>
                <kbd className="px-2 py-0.5 rounded bg-white/10 font-mono text-xs">Cmd/Ctrl + P</kbd>
              </div>
              <button
                onClick={() => {
                  // Trigger the help modal
                  const helpEvent = new KeyboardEvent('keydown', { key: '?' });
                  document.dispatchEvent(helpEvent);
                }}
                className="text-accent hover:underline text-xs mt-1"
              >
                View all shortcuts →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create Pawkit Modal */}
      {showCreatePawkitModal && (
        <div
          className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => {
            if (!creatingPawkit) {
              setShowCreatePawkitModal(false);
              setNewPawkitName("");
              setParentPawkitId(null);
            }
          }}
        >
          <div
            className="bg-white/5 backdrop-blur-lg rounded-2xl border border-white/10 shadow-glow-accent p-6 w-full max-w-md mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-foreground mb-4">
              {parentPawkitId ? "Create Sub-Pawkit" : "Create Pawkit"}
            </h3>
            <input
              type="text"
              value={newPawkitName}
              onChange={(e) => setNewPawkitName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleCreatePawkit();
                } else if (e.key === "Escape") {
                  if (!creatingPawkit) {
                    setShowCreatePawkitModal(false);
                    setNewPawkitName("");
                    setParentPawkitId(null);
                  }
                }
              }}
              placeholder="Pawkit name"
              className="w-full rounded-lg bg-white/5 backdrop-blur-sm px-4 py-2 text-sm text-foreground placeholder-muted-foreground border border-white/10 focus:border-accent focus:outline-none transition-colors"
              autoFocus
              disabled={creatingPawkit}
            />
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => {
                  if (!creatingPawkit) {
                    setShowCreatePawkitModal(false);
                    setNewPawkitName("");
                    setParentPawkitId(null);
                  }
                }}
                className="flex-1 px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-white/10 transition-colors"
                disabled={creatingPawkit}
              >
                Esc to Cancel
              </button>
              <button
                onClick={handleCreatePawkit}
                className="flex-1 px-4 py-2 rounded-lg text-sm font-medium bg-accent text-accent-foreground hover:bg-accent/90 transition-colors disabled:opacity-50"
                disabled={creatingPawkit || !newPawkitName.trim()}
              >
                {creatingPawkit ? "Creating..." : "Enter to Create"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rename Pawkit Modal */}
      {showRenameModal && (
        <div
          className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => {
            if (!renamingCollection) {
              setShowRenameModal(false);
              setRenameValue("");
              setRenameCollectionId(null);
              setRenameCollectionName("");
            }
          }}
        >
          <div
            className="bg-white/5 backdrop-blur-lg rounded-2xl border border-white/10 shadow-glow-accent p-6 w-full max-w-md mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-foreground mb-4">
              Rename Pawkit
            </h3>
            <input
              type="text"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleRenameCollection();
                } else if (e.key === "Escape") {
                  if (!renamingCollection) {
                    setShowRenameModal(false);
                    setRenameValue("");
                    setRenameCollectionId(null);
                    setRenameCollectionName("");
                  }
                }
              }}
              placeholder="Pawkit name"
              className="w-full rounded-lg bg-white/5 backdrop-blur-sm px-4 py-2 text-sm text-foreground placeholder-muted-foreground border border-white/10 focus:border-accent focus:outline-none transition-colors"
              autoFocus
              disabled={renamingCollection}
            />
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => {
                  if (!renamingCollection) {
                    setShowRenameModal(false);
                    setRenameValue("");
                    setRenameCollectionId(null);
                    setRenameCollectionName("");
                  }
                }}
                className="flex-1 px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-white/10 transition-colors"
                disabled={renamingCollection}
              >
                Esc to Cancel
              </button>
              <button
                onClick={handleRenameCollection}
                className="flex-1 px-4 py-2 rounded-lg text-sm font-medium bg-accent text-accent-foreground hover:bg-accent/90 transition-colors disabled:opacity-50"
                disabled={renamingCollection || !renameValue.trim()}
              >
                {renamingCollection ? "Renaming..." : "Enter to Rename"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Note Modal */}
      <CreateNoteModal
        open={showCreateNoteModal}
        onClose={() => setShowCreateNoteModal(false)}
        onConfirm={handleCreateNote}
        dailyNoteExists={dailyNoteExists}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmDeleteModal
        open={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setCollectionToDelete(null);
        }}
        onConfirm={handleConfirmDelete}
        title="Delete Pawkit?"
        message="Are you sure you want to delete this pawkit?"
        itemName={collectionToDelete?.name}
      />
    </>
  );
}
