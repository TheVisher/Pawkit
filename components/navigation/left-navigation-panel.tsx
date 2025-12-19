"use client";

import { useRouter, usePathname } from "next/navigation";
import Image from "next/image";
import { useState, useMemo, useCallback, useEffect } from "react";
import { Home, Library, FileText, Calendar, Tag, Folder, FolderOpen, ChevronRight, Layers, X, ArrowUpRight, ArrowDownLeft, Clock, CalendarDays, CalendarClock, Flame, Plus, Check, Minus, Pin, PinOff, GripVertical, FolderPlus, Edit3, ArrowUpDown, Trash2, Sparkles, Cloud, HelpCircle, KanbanSquare, Eye, EyeOff, type LucideIcon } from "lucide-react";
import { shallow } from "zustand/shallow";
import { PanelSection } from "@/components/control-panel/control-panel";
import { usePanelStore } from "@/lib/hooks/use-panel-store";
import { useDataStore } from "@/lib/stores/data-store";
import { useToastStore } from "@/lib/stores/toast-store";
import { useRecentHistory } from "@/lib/hooks/use-recent-history";
import { useSettingsStore } from "@/lib/hooks/settings-store";
import { useRediscoverStore } from "@/lib/hooks/rediscover-store";
import { useConnectorStore } from "@/lib/stores/connector-store";
import { GenericContextMenu, type ContextMenuItemConfig } from "@/components/ui/generic-context-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { findDailyNoteForDate, generateDailyNoteTitle, generateDailyNoteContent, getDailyNotes } from "@/lib/utils/daily-notes";
import { type CollectionNode, type CardType, type CardModel, type NoteFolderNode } from "@/lib/types";
import { useNoteFolderStore } from "@/lib/stores/note-folder-store";
import { CreateNoteModal } from "@/components/modals/create-note-modal";
import { ConfirmDeleteModal } from "@/components/modals/confirm-delete-modal";
import { CreateBoardModal } from "@/components/modals/create-board-modal";
import { isBoard, BoardColumn, PawkitMetadata } from "@/lib/types/board";
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
import { useIsMobile } from "@/lib/hooks/use-is-mobile";
import { useDragStore } from "@/lib/stores/drag-store";

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

  // Note folder state
  const noteFolderStore = useNoteFolderStore();
  const {
    folders: noteFolders,
    selectedFolderId,
    expandedFolderIds,
    fetchFolders,
    createFolder,
    renameFolder,
    deleteFolder: deleteFolderFromStore,
    setSelectedFolder,
    toggleFolderExpanded,
    getFolderTree,
    setFolderPrivate,
  } = noteFolderStore;
  const [showCreateFolderModal, setShowCreateFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [parentFolderId, setParentFolderId] = useState<string | null>(null);
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [showRenameFolderModal, setShowRenameFolderModal] = useState(false);
  const [renameFolderId, setRenameFolderId] = useState<string | null>(null);
  const [renameFolderName, setRenameFolderName] = useState("");
  const [renameFolderValue, setRenameFolderValue] = useState("");
  const [renamingFolder, setRenamingFolder] = useState(false);
  const [showDeleteFolderConfirm, setShowDeleteFolderConfirm] = useState(false);
  const [folderToDelete, setFolderToDelete] = useState<NoteFolderNode | null>(null);

  // Delete confirmation modal state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [collectionToDelete, setCollectionToDelete] = useState<CollectionNode | null>(null);

  // Board creation modal state
  const [showCreateBoardModal, setShowCreateBoardModal] = useState(false);
  const [createBoardParentId, setCreateBoardParentId] = useState<string | null>(null);

  // Get pinned note IDs and active card first (needed for selective subscription)
  const pinnedNoteIds = useSettingsStore((state) => state.pinnedNoteIds);
  const reorderPinnedNotes = useSettingsStore((state) => state.reorderPinnedNotes);
  const unpinNote = useSettingsStore((state) => state.unpinNote);
  const activeCardId = usePanelStore((state) => state.activeCardId);
  const openCardDetails = usePanelStore((state) => state.openCardDetails);
  const collapsedSections = usePanelStore((state) => state.collapsedSections);
  const toggleSection = usePanelStore((state) => state.toggleSection);

  // Mobile detection - on mobile, panel is always a full-height overlay
  const isMobile = useIsMobile();

  // Drag state for drop-to-pawkit feature (hover detection and visual highlight)
  const isDraggingCard = useDragStore((state) => state.isDragging);
  const dragHoveredPawkit = useDragStore((state) => state.hoveredPawkitSlug);
  const setDragHoveredPawkit = useDragStore((state) => state.setHoveredPawkit);
  const dragHoveredFolder = useDragStore((state) => state.hoveredFolderId);
  const setDragHoveredFolder = useDragStore((state) => state.setHoveredFolder);

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

  // Get cloud connector states
  const filenConnected = useConnectorStore((state) => state.filen.connected);
  const gdriveConnected = useConnectorStore((state) => state.googleDrive.connected);
  const dropboxConnected = useConnectorStore((state) => state.dropbox.connected);
  const onedriveConnected = useConnectorStore((state) => state.onedrive.connected);

  const connectedCloudProviders = useMemo(() => {
    const providers: { id: string; name: string; slug: string }[] = [];
    if (filenConnected) providers.push({ id: "filen", name: "Filen", slug: "filen" });
    if (gdriveConnected) providers.push({ id: "google-drive", name: "Google Drive", slug: "gdrive" });
    if (dropboxConnected) providers.push({ id: "dropbox", name: "Dropbox", slug: "dropbox" });
    if (onedriveConnected) providers.push({ id: "onedrive", name: "OneDrive", slug: "onedrive" });
    return providers;
  }, [filenConnected, gdriveConnected, dropboxConnected, onedriveConnected]);

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

  // Cleanup stale pinned note IDs (cards that no longer exist or are deleted)
  // Check against full data store, not filtered cards
  const allCards = useDataStore((state) => state.cards);
  useEffect(() => {
    if (pinnedNoteIds.length === 0) return;

    // Find IDs that don't have a valid (non-deleted) card in the store
    const staleIds = pinnedNoteIds.filter(id => {
      const card = allCards.find(c => c.id === id);
      return !card || card.deleted === true;
    });

    // Remove stale IDs from pinned notes
    if (staleIds.length > 0) {
      staleIds.forEach(id => unpinNote(id));
    }
  }, [pinnedNoteIds, allCards, unpinNote]);

  // Calculate note counts per folder (and unfiled count)
  const noteCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    let unfiledCount = 0;

    // Only count notes (md-note, text-note), not deleted
    const notes = allCards.filter(
      (card) => (card.type === 'md-note' || card.type === 'text-note') && !card.deleted
    );

    notes.forEach((note) => {
      if (note.noteFolderId) {
        counts[note.noteFolderId] = (counts[note.noteFolderId] || 0) + 1;
      } else {
        unfiledCount++;
      }
    });

    return { counts, unfiledCount, totalNotes: notes.length };
  }, [allCards]);

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

  // Fetch note folders on mount
  useEffect(() => {
    fetchFolders();
  }, [fetchFolders]);

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

  // Create new board
  const handleCreateBoard = async (name: string, columns: BoardColumn[]) => {
    // Generate tags from column labels
    const columnTags = columns.map((col) => ({
      ...col,
      tag: `status:${col.label.toLowerCase().replace(/\s+/g, '-')}`,
    }));

    const metadata: PawkitMetadata = {
      type: "board",
      boardConfig: {
        columns: columnTags,
      },
    };

    try {
      // Create the collection with metadata in one step
      await addCollection({
        name,
        parentId: createBoardParentId || undefined,
        metadata: metadata as Record<string, unknown>
      });

      useToastStore.getState().success("Board created");
    } catch (error) {
      useToastStore.getState().error("Failed to create board");
      throw error;
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

  // Note folder handlers
  const handleCreateFolder = async () => {
    const trimmedName = newFolderName.trim();
    if (!trimmedName || creatingFolder) return;

    setCreatingFolder(true);
    try {
      await createFolder(trimmedName, parentFolderId);
      useToastStore.getState().success(parentFolderId ? "Sub-folder created" : "Folder created");
      setNewFolderName("");
      setShowCreateFolderModal(false);
      setParentFolderId(null);
    } catch (error) {
    } finally {
      setCreatingFolder(false);
    }
  };

  const handleRenameFolder = async () => {
    const trimmedName = renameFolderValue.trim();
    if (!trimmedName || !renameFolderId || renamingFolder) return;
    if (trimmedName === renameFolderName) {
      setShowRenameFolderModal(false);
      setRenameFolderValue("");
      setRenameFolderId(null);
      setRenameFolderName("");
      return;
    }

    setRenamingFolder(true);
    try {
      await renameFolder(renameFolderId, trimmedName);
      useToastStore.getState().success("Folder renamed");
      setShowRenameFolderModal(false);
      setRenameFolderValue("");
      setRenameFolderId(null);
      setRenameFolderName("");
    } catch (error) {
    } finally {
      setRenamingFolder(false);
    }
  };

  const handleConfirmDeleteFolder = async () => {
    if (!folderToDelete) return;
    try {
      await deleteFolderFromStore(folderToDelete.id);
      useToastStore.getState().success("Folder deleted");
    } catch (error) {
    }
  };

  // Handle clicking on a note folder - navigate to /notes with folder selection
  const handleSelectFolder = (folderId: string | null) => {
    setSelectedFolder(folderId);
    router.push("/notes");
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
            <Pin size={16} className="flex-shrink-0 text-accent" />
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
    const isDragHovered = isDraggingCard && dragHoveredPawkit === collection.slug;

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
      {
        label: collection.pinned ? "Unpin from Quick Access" : "Pin to Quick Access",
        icon: collection.pinned ? PinOff : Pin,
        onClick: async () => {
          try {
            await updateCollection(collection.id, { pinned: !collection.pinned });
            useToastStore.getState().success(
              collection.pinned ? "Unpinned from Quick Access" : "Pinned to Quick Access"
            );
          } catch (err) {
            useToastStore.getState().error("Failed to update pin status");
          }
        },
      },
      {
        label: collection.isPrivate ? "Make Public" : "Make Private",
        icon: collection.isPrivate ? Eye : EyeOff,
        onClick: async () => {
          try {
            await updateCollection(collection.id, { isPrivate: !collection.isPrivate });
            useToastStore.getState().success(
              collection.isPrivate ? "Collection is now public" : "Collection is now private"
            );
          } catch (err) {
            useToastStore.getState().error("Failed to update privacy setting");
          }
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
          onMouseEnter={() => {
            if (!activeCard) setHoveredCreatePawkit(collection.id);
            // Track hover during card drag for drop-to-pawkit
            if (isDraggingCard) setDragHoveredPawkit(collection.slug);
          }}
          onMouseLeave={() => {
            setHoveredCreatePawkit(null);
            // Clear drag hover when leaving
            if (isDraggingCard) setDragHoveredPawkit(null);
          }}
        >
          <div
            className="relative flex-1"
            onMouseEnter={() => activeCard && setHoveredPawkit(collection.slug)}
            onMouseLeave={() => setHoveredPawkit(null)}
          >
            <button
              onClick={() => handleNavigate(pawkitHref)}
              className={`
                w-full flex items-center gap-2 ${padding} rounded-lg ${textSize} transition-all overflow-hidden
                ${isCollectionActive
                  ? "font-medium"
                  : isDragHovered
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                }
              `}
              style={isCollectionActive ? {
                background: 'var(--bg-surface-3)',
                color: 'var(--text-primary)',
                boxShadow: 'inset -3px 0 0 var(--ds-accent), var(--shadow-1)',
                border: '1px solid var(--border-subtle)',
                borderTopColor: 'var(--border-highlight-top)',
                borderLeftColor: 'var(--border-highlight-left)',
              } : isDragHovered ? {
                background: 'var(--ds-accent-subtle)',
                border: '2px dashed var(--ds-accent)',
                boxShadow: '0 0 12px var(--ds-accent-muted)',
              } : undefined}
            >
              {isBoard(collection) ? (
                <KanbanSquare size={iconSize} className="flex-shrink-0 text-purple-400" />
              ) : (
                <FolderOpen size={iconSize} className="flex-shrink-0" />
              )}
              <span className="flex-1 text-left truncate">{collection.name}</span>
              {collection.isPrivate && (
                <span title="Private collection">
                  <EyeOff size={12} className="flex-shrink-0 text-muted-foreground opacity-60" />
                </span>
              )}

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
                      <Plus size={iconSize} className="text-accent" />
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
              className="p-1 rounded transition-colors hover:bg-white/10 text-accent"
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

  // Recursive function to render note folder tree
  const renderNoteFolderTree = (folder: NoteFolderNode, depth: number = 0) => {
    const hasChildren = folder.children && folder.children.length > 0;
    const isExpanded = expandedFolderIds.has(folder.id);
    // Only show selected state when actually on the Notes page
    const isSelected = selectedFolderId === folder.id && pathname === "/notes";
    const isFolderHovered = hoveredCreatePawkit === `folder-${folder.id}`;
    const isDragTarget = isDraggingCard && dragHoveredFolder === folder.id;

    const iconSize = depth === 0 ? 14 : 12;
    const textSize = depth === 0 ? "text-sm" : "text-xs";
    const padding = depth === 0 ? "px-3 py-2" : "px-3 py-1.5";

    const folderContextMenuItems: ContextMenuItemConfig[] = [
      {
        label: "Open",
        icon: FolderOpen,
        onClick: () => handleSelectFolder(folder.id),
      },
      {
        label: "New sub-folder",
        icon: FolderPlus,
        onClick: () => {
          setParentFolderId(folder.id);
          setShowCreateFolderModal(true);
        },
      },
      {
        label: folder.isPrivate ? "Make Public" : "Make Private",
        icon: folder.isPrivate ? Eye : EyeOff,
        onClick: async () => {
          try {
            await setFolderPrivate(folder.id, !folder.isPrivate);
            useToastStore.getState().success(
              folder.isPrivate ? "Folder is now public" : "Folder is now private"
            );
          } catch (err) {
            useToastStore.getState().error("Failed to update privacy setting");
          }
        },
      },
      { type: "separator" as const },
      {
        label: "Rename",
        icon: Edit3,
        onClick: () => {
          setRenameFolderId(folder.id);
          setRenameFolderName(folder.name);
          setRenameFolderValue(folder.name);
          setShowRenameFolderModal(true);
        },
      },
      { type: "separator" as const },
      {
        label: "Delete",
        icon: Trash2,
        onClick: () => {
          setFolderToDelete(folder);
          setShowDeleteFolderConfirm(true);
        },
        destructive: true,
      },
    ];

    const folderContent = (
      <div key={folder.id}>
        <div
          className="flex items-center gap-1 group/folder rounded-lg transition-all"
          onMouseEnter={() => {
            setHoveredCreatePawkit(`folder-${folder.id}`);
            if (isDraggingCard) {
              setDragHoveredFolder(folder.id);
            }
          }}
          onMouseLeave={() => {
            setHoveredCreatePawkit(null);
            if (isDraggingCard) {
              setDragHoveredFolder(null);
            }
          }}
        >
          <div className="relative flex-1">
            <button
              onClick={() => handleSelectFolder(folder.id)}
              className={`
                w-full flex items-center gap-2 ${padding} rounded-lg ${textSize} transition-all overflow-hidden
                ${isDragTarget
                  ? "text-foreground"
                  : isSelected
                    ? "font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                }
              `}
              style={isSelected && !isDragTarget ? {
                background: 'var(--bg-surface-3)',
                color: 'var(--text-primary)',
                boxShadow: 'inset -3px 0 0 var(--ds-accent), var(--shadow-1)',
                border: '1px solid var(--border-subtle)',
                borderTopColor: 'var(--border-highlight-top)',
                borderLeftColor: 'var(--border-highlight-left)',
              } : isDragTarget ? {
                background: 'var(--ds-accent-subtle)',
                border: '2px dashed var(--ds-accent)',
                boxShadow: '0 0 12px var(--ds-accent-muted)',
              } : undefined}
            >
              <Folder size={iconSize} className="flex-shrink-0" />
              <span className="flex-1 text-left truncate">{folder.name}</span>
              {folder.isPrivate && (
                <span title="Private folder">
                  <EyeOff size={12} className="flex-shrink-0 text-muted-foreground opacity-60" />
                </span>
              )}
              {noteCounts.counts[folder.id] > 0 && (
                <span className="text-xs text-muted-foreground ml-auto">
                  ({noteCounts.counts[folder.id]})
                </span>
              )}
            </button>
          </div>

          {/* + Button for creating sub-folder */}
          {isFolderHovered && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setParentFolderId(folder.id);
                setShowCreateFolderModal(true);
              }}
              className="p-1 rounded transition-colors hover:bg-white/10 text-accent"
              title="Create sub-folder"
            >
              <Plus size={iconSize} />
            </button>
          )}

          {/* Chevron for expanding/collapsing children */}
          {hasChildren && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleFolderExpanded(folder.id);
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
        {hasChildren && isExpanded && folder.children && (
          <div className="ml-6 mt-1 space-y-1">
            {folder.children.map((child) => renderNoteFolderTree(child, depth + 1))}
          </div>
        )}
      </div>
    );

    return (
      <GenericContextMenu items={folderContextMenuItems}>
        {folderContent}
      </GenericContextMenu>
    );
  };

  return (
    <>
      {/* Backdrop - only on mobile for closing overlay */}
      {isMobile && (
        <div
          className="fixed inset-0 z-[101] bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        />
      )}

      {/* Left Navigation Panel */}
      <div
        data-panel="left"
        className={`
          fixed top-0 left-0 bottom-0 z-[102]
          flex flex-col
          animate-slide-in-left
          ${isMobile
            ? "w-[85vw] max-w-[325px]"
            : `w-[325px] ${mode === "floating"
              ? "m-4 rounded-2xl"
              : ""
            }`
          }
        `}
        style={{
          background: 'var(--bg-surface-1)',
          boxShadow: mode === "floating" && !isMobile ? 'var(--shadow-4)' : 'var(--shadow-2)',
          border: '1px solid var(--border-subtle)',
          borderTopColor: 'var(--border-highlight-top)',
          borderLeftColor: 'var(--border-highlight-left)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - Icon-only controls */}
        <TooltipProvider>
          <div className="flex items-center justify-end gap-1 p-3" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
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
        </TooltipProvider>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 py-6 scrollbar-hide"
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-4)',
            maskImage: "linear-gradient(to bottom, transparent 0%, black 24px, black calc(100% - 24px), transparent 100%)",
            WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, black 24px, black calc(100% - 24px), transparent 100%)"
          }}
        >
          {rediscoverStore.isActive ? (
            // Rediscover Queue View
            <div className="flex flex-col h-full">
              {/* Header - Fixed with exit button */}
              <div className="space-y-4 flex-shrink-0">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-foreground">Rediscover Queue</h2>
                  {/* Exit button - closes sidebar on mobile, navigates away from Rediscover */}
                  <button
                    onClick={() => {
                      // Reset rediscover state
                      rediscoverStore.reset();
                      // Close the sidebar on mobile
                      if (isMobile) {
                        onClose();
                      }
                      // Navigate to library without mode param
                      router.push("/library");
                    }}
                    className="p-2 rounded-lg hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors"
                    title="Exit Rediscover"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Batch Counter */}
                <div className="text-sm text-muted-foreground">
                  <span className="text-foreground">Batch {rediscoverStore.batchNumber}/{rediscoverStore.totalBatches()}</span>
                  <span className="mx-2">•</span>
                  {rediscoverStore.queue.length - rediscoverStore.currentIndex} {rediscoverStore.queue.length - rediscoverStore.currentIndex === 1 ? 'card' : 'cards'} left
                </div>
              </div>

              {/* Queue List - Scrollable, fills remaining height */}
              <div className="flex-1 overflow-y-auto mt-6 scrollbar-hide">
                <div className="space-y-3">
                  {rediscoverStore.queue.slice(rediscoverStore.currentIndex + 1).length === 0 ? (
                    <div className="text-center text-muted-foreground text-sm py-8">
                      No more cards in queue
                    </div>
                  ) : (
                    rediscoverStore.queue.slice(rediscoverStore.currentIndex + 1).map((card, index) => (
                      <div
                        key={card.id}
                        className="flex gap-3 p-2 rounded-lg transition-colors"
                        style={{
                          background: 'var(--bg-surface-2)',
                          border: '1px solid var(--border-subtle)',
                        }}
                      >
                        {/* Thumbnail */}
                        <div className="relative w-12 h-12 flex-shrink-0 rounded overflow-hidden" style={{ background: 'var(--bg-surface-3)' }}>
                          {card.image ? (
                            <Image
                              src={card.image}
                              alt={card.title || "Card"}
                              fill
                              className="object-cover"
                              unoptimized
                            />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-accent/20 to-pink-500/20" />
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
            <div className="space-y-1" data-tour="home-section">
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
                      w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all
                      ${isActive
                        ? "font-medium"
                        : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                      }
                    `}
                    style={isActive ? {
                      background: 'var(--bg-surface-3)',
                      color: 'var(--text-primary)',
                      boxShadow: 'inset -3px 0 0 var(--ds-accent), var(--shadow-1)',
                      border: '1px solid var(--border-subtle)',
                      borderTopColor: 'var(--border-highlight-top)',
                      borderLeftColor: 'var(--border-highlight-left)',
                    } : undefined}
                  >
                    <Icon size={16} className="flex-shrink-0" />
                    <span className="flex-1 text-left">{item.label}</span>
                  </button>
                );
              })}

              {/* Rediscover - Navigate to Library in rediscover mode */}
              <button
                onClick={() => handleNavigate("/library?mode=rediscover")}
                className={`
                  w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all
                  ${rediscoverStore.isActive
                    ? "font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                  }
                `}
                style={rediscoverStore.isActive ? {
                  background: 'var(--bg-surface-3)',
                  color: 'var(--text-primary)',
                  boxShadow: 'inset -3px 0 0 var(--ds-accent), var(--shadow-1)',
                  border: '1px solid var(--border-subtle)',
                  borderTopColor: 'var(--border-highlight-top)',
                  borderLeftColor: 'var(--border-highlight-left)',
                } : undefined}
              >
                <Sparkles size={16} className="flex-shrink-0" />
                <span className="flex-1 text-left">Rediscover</span>
                {uncategorizedCount > 0 && (
                  <span className="text-xs text-muted-foreground">({uncategorizedCount})</span>
                )}
              </button>
            </div>
          </PanelSection>

          {/* Pawkits Section */}
          {collections.length > 0 && (
            <PanelSection
              id="left-pawkits"
              title="Pawkits"
              icon={<FolderOpen className={`h-4 w-4 ${pathname === "/pawkits" ? "text-accent drop-shadow-glow-accent" : "text-accent"}`} />}
              active={pathname === "/pawkits"}
              onClick={() => {
                handleNavigate("/pawkits");
                if (collapsedSections["left-pawkits"]) {
                  toggleSection("left-pawkits");
                }
              }}
              action={
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowCreatePawkitModal(true);
                  }}
                  className="p-1 rounded transition-colors hover:bg-white/10 text-accent opacity-0 group-hover:opacity-100"
                  title="Create new pawkit"
                >
                  <Plus size={16} />
                </button>
              }
            >
              <div className="space-y-1" data-tour="pawkits-link">
                {collections.filter(p => !p.deleted).map((collection) => renderCollectionTree(collection, 0))}
              </div>
            </PanelSection>
          )}

          {/* Notes Section */}
          <PanelSection
            id="left-notes"
            title="Notes"
            icon={<FileText className={`h-4 w-4 ${pathname === "/notes" ? "text-accent drop-shadow-glow-accent" : "text-accent"}`} />}
            active={pathname === "/notes" && selectedFolderId === null}
            onClick={() => {
              setSelectedFolder(null); // Clear folder selection to show all notes
              handleNavigate("/notes");
              // Ensure section is expanded when clicking header
              if (collapsedSections["left-notes"]) {
                toggleSection("left-notes");
              }
            }}
            action={
              <div className="flex items-center gap-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowCreateFolderModal(true);
                  }}
                  className="p-1 rounded transition-colors hover:bg-white/10 text-accent opacity-0 group-hover:opacity-100"
                  title="Create new folder"
                >
                  <FolderPlus size={16} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowCreateNoteModal(true);
                  }}
                  className="p-1 rounded transition-colors hover:bg-white/10 text-accent opacity-0 group-hover:opacity-100"
                  title="Create new note"
                >
                  <Plus size={16} />
                </button>
              </div>
            }
          >
            <div className="space-y-1">
              {/* Today's Note */}
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

              {/* Note Folders */}
              {getFolderTree().length > 0 && (
                <div className="pt-2 space-y-1">
                  {getFolderTree().map((folder) => renderNoteFolderTree(folder, 0))}
                </div>
              )}

              {/* Unfiled Notes - only show when folders exist */}
              {getFolderTree().length > 0 && (
                <button
                  onClick={() => handleSelectFolder("unfiled")}
                  className={`
                    w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all
                    ${selectedFolderId === "unfiled"
                      ? "font-medium"
                      : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                    }
                  `}
                  style={selectedFolderId === "unfiled" ? {
                    background: 'var(--bg-surface-3)',
                    color: 'var(--text-primary)',
                    boxShadow: 'inset -3px 0 0 var(--ds-accent), var(--shadow-1)',
                    border: '1px solid var(--border-subtle)',
                    borderTopColor: 'var(--border-highlight-top)',
                    borderLeftColor: 'var(--border-highlight-left)',
                  } : undefined}
                >
                  <FileText size={16} className="flex-shrink-0 opacity-50" />
                  <span className="flex-1 text-left">Unfiled</span>
                  {noteCounts.unfiledCount > 0 && (
                    <span className="text-xs text-muted-foreground">
                      ({noteCounts.unfiledCount})
                    </span>
                  )}
                </button>
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

          {/* Cloud Drives Section - Only show if at least one provider connected */}
          {connectedCloudProviders.length > 0 && (
            <PanelSection
              id="left-cloud-drives"
              title="Cloud Drives"
              icon={<Cloud className={`h-4 w-4 ${pathname?.startsWith("/cloud-drives") ? "text-accent drop-shadow-glow-accent" : "text-accent"}`} />}
              active={pathname === "/cloud-drives"}
              onClick={() => {
                handleNavigate("/cloud-drives");
                if (collapsedSections["left-cloud-drives"]) {
                  toggleSection("left-cloud-drives");
                }
              }}
            >
              <div className="space-y-1">
                {connectedCloudProviders.map((provider) => {
                  const providerPath = `/cloud-drives/${provider.slug}`;
                  const isActive = pathname === providerPath;
                  return (
                    <button
                      key={provider.id}
                      onClick={() => handleNavigate(providerPath)}
                      className={`
                        w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all
                        ${isActive
                          ? "font-medium"
                          : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                        }
                      `}
                      style={isActive ? {
                        background: 'var(--bg-surface-3)',
                        color: 'var(--text-primary)',
                        boxShadow: 'inset -3px 0 0 var(--ds-accent), var(--shadow-1)',
                        border: '1px solid var(--border-subtle)',
                        borderTopColor: 'var(--border-highlight-top)',
                        borderLeftColor: 'var(--border-highlight-left)',
                      } : undefined}
                    >
                      <FolderOpen size={16} className="flex-shrink-0" />
                      <span className="flex-1 text-left">{provider.name}</span>
                    </button>
                  );
                })}
              </div>
            </PanelSection>
          )}

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
          <div className="px-4 py-3" style={{ borderTop: '1px solid var(--border-subtle)' }}>
            <div className="text-xs text-muted-foreground space-y-2">
              <div className="flex items-center justify-between">
                <span>Quick search</span>
                <kbd className="px-2 py-0.5 rounded font-mono text-xs" style={{ background: 'var(--bg-surface-2)' }}>/</kbd>
              </div>
              <div className="flex items-center justify-between">
                <span>Paste URL</span>
                <kbd className="px-2 py-0.5 rounded font-mono text-xs" style={{ background: 'var(--bg-surface-2)' }}>Cmd/Ctrl + V</kbd>
              </div>
              <div className="flex items-center justify-between">
                <span>Add card</span>
                <kbd className="px-2 py-0.5 rounded font-mono text-xs" style={{ background: 'var(--bg-surface-2)' }}>Cmd/Ctrl + P</kbd>
              </div>
              <button
                onClick={() => router.push('/help')}
                className="flex items-center gap-1.5 text-accent hover:underline text-xs mt-1"
              >
                <HelpCircle size={12} />
                View shortcuts & help
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
            className="rounded-2xl p-6 w-full max-w-md mx-4"
            style={{
              background: 'var(--bg-surface-1)',
              boxShadow: 'var(--shadow-4)',
              border: '1px solid var(--border-subtle)',
              borderTopColor: 'var(--border-highlight-top)',
              borderLeftColor: 'var(--border-highlight-left)',
            }}
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
              className="w-full rounded-lg px-4 py-2 text-sm text-foreground placeholder-muted-foreground focus:outline-none transition-colors"
              style={{
                background: 'var(--bg-surface-2)',
                border: '1px solid var(--border-subtle)',
              }}
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
                className="flex-1 px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                style={{ background: 'var(--bg-surface-2)' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-surface-3)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--bg-surface-2)'; }}
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
            className="rounded-2xl p-6 w-full max-w-md mx-4"
            style={{
              background: 'var(--bg-surface-1)',
              boxShadow: 'var(--shadow-4)',
              border: '1px solid var(--border-subtle)',
              borderTopColor: 'var(--border-highlight-top)',
              borderLeftColor: 'var(--border-highlight-left)',
            }}
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
              className="w-full rounded-lg px-4 py-2 text-sm text-foreground placeholder-muted-foreground focus:outline-none transition-colors"
              style={{
                background: 'var(--bg-surface-2)',
                border: '1px solid var(--border-subtle)',
              }}
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
                className="flex-1 px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                style={{ background: 'var(--bg-surface-2)' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-surface-3)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--bg-surface-2)'; }}
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

      {/* Create Board Modal */}
      <CreateBoardModal
        open={showCreateBoardModal}
        onClose={() => {
          setShowCreateBoardModal(false);
          setCreateBoardParentId(null);
        }}
        onSubmit={handleCreateBoard}
        parentId={createBoardParentId || undefined}
      />

      {/* Create Folder Modal */}
      {showCreateFolderModal && (
        <div
          className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => {
            if (!creatingFolder) {
              setShowCreateFolderModal(false);
              setNewFolderName("");
              setParentFolderId(null);
            }
          }}
        >
          <div
            className="rounded-2xl p-6 w-full max-w-md mx-4"
            style={{
              background: 'var(--bg-surface-1)',
              boxShadow: 'var(--shadow-4)',
              border: '1px solid var(--border-subtle)',
              borderTopColor: 'var(--border-highlight-top)',
              borderLeftColor: 'var(--border-highlight-left)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-foreground mb-4">
              {parentFolderId ? "Create Sub-Folder" : "Create Folder"}
            </h3>
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleCreateFolder();
                } else if (e.key === "Escape") {
                  if (!creatingFolder) {
                    setShowCreateFolderModal(false);
                    setNewFolderName("");
                    setParentFolderId(null);
                  }
                }
              }}
              placeholder="Folder name"
              className="w-full rounded-lg px-4 py-2 text-sm text-foreground placeholder-muted-foreground focus:outline-none transition-colors"
              style={{
                background: 'var(--bg-surface-2)',
                border: '1px solid var(--border-subtle)',
              }}
              autoFocus
              disabled={creatingFolder}
            />
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => {
                  if (!creatingFolder) {
                    setShowCreateFolderModal(false);
                    setNewFolderName("");
                    setParentFolderId(null);
                  }
                }}
                className="flex-1 px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                style={{ background: 'var(--bg-surface-2)' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-surface-3)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--bg-surface-2)'; }}
                disabled={creatingFolder}
              >
                Esc to Cancel
              </button>
              <button
                onClick={handleCreateFolder}
                className="flex-1 px-4 py-2 rounded-lg text-sm font-medium bg-accent text-accent-foreground hover:bg-accent/90 transition-colors disabled:opacity-50"
                disabled={creatingFolder || !newFolderName.trim()}
              >
                {creatingFolder ? "Creating..." : "Enter to Create"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rename Folder Modal */}
      {showRenameFolderModal && (
        <div
          className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => {
            if (!renamingFolder) {
              setShowRenameFolderModal(false);
              setRenameFolderValue("");
              setRenameFolderId(null);
              setRenameFolderName("");
            }
          }}
        >
          <div
            className="rounded-2xl p-6 w-full max-w-md mx-4"
            style={{
              background: 'var(--bg-surface-1)',
              boxShadow: 'var(--shadow-4)',
              border: '1px solid var(--border-subtle)',
              borderTopColor: 'var(--border-highlight-top)',
              borderLeftColor: 'var(--border-highlight-left)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-foreground mb-4">
              Rename Folder
            </h3>
            <input
              type="text"
              value={renameFolderValue}
              onChange={(e) => setRenameFolderValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleRenameFolder();
                } else if (e.key === "Escape") {
                  if (!renamingFolder) {
                    setShowRenameFolderModal(false);
                    setRenameFolderValue("");
                    setRenameFolderId(null);
                    setRenameFolderName("");
                  }
                }
              }}
              placeholder="Folder name"
              className="w-full rounded-lg px-4 py-2 text-sm text-foreground placeholder-muted-foreground focus:outline-none transition-colors"
              style={{
                background: 'var(--bg-surface-2)',
                border: '1px solid var(--border-subtle)',
              }}
              autoFocus
              disabled={renamingFolder}
            />
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => {
                  if (!renamingFolder) {
                    setShowRenameFolderModal(false);
                    setRenameFolderValue("");
                    setRenameFolderId(null);
                    setRenameFolderName("");
                  }
                }}
                className="flex-1 px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                style={{ background: 'var(--bg-surface-2)' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-surface-3)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--bg-surface-2)'; }}
                disabled={renamingFolder}
              >
                Esc to Cancel
              </button>
              <button
                onClick={handleRenameFolder}
                className="flex-1 px-4 py-2 rounded-lg text-sm font-medium bg-accent text-accent-foreground hover:bg-accent/90 transition-colors disabled:opacity-50"
                disabled={renamingFolder || !renameFolderValue.trim()}
              >
                {renamingFolder ? "Renaming..." : "Enter to Rename"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Folder Confirmation Modal */}
      <ConfirmDeleteModal
        open={showDeleteFolderConfirm}
        onClose={() => {
          setShowDeleteFolderConfirm(false);
          setFolderToDelete(null);
        }}
        onConfirm={handleConfirmDeleteFolder}
        title="Delete Folder?"
        message="Notes in this folder will become unfiled. This action cannot be undone."
        itemName={folderToDelete?.name}
      />
    </>
  );
}
