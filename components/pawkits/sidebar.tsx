"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { useDroppable } from "@dnd-kit/core";
import { useRouter, useSearchParams } from "next/navigation";
import { Folder, Lock, FolderPlus, Edit3, ArrowUpDown, Trash2, KanbanSquare } from "lucide-react";
import { CollectionNode } from "@/lib/types";
import { useDataStore } from "@/lib/stores/data-store";
import { GenericContextMenu, ContextMenuItemConfig } from "@/components/ui/generic-context-menu";
import { ConfirmDeleteModal } from "@/components/modals/confirm-delete-modal";
import { CreateBoardModal } from "@/components/modals/create-board-modal";
import { isBoard, BoardColumn, PawkitMetadata, DEFAULT_BOARD_COLUMNS } from "@/lib/types/board";

export type CollectionsSidebarProps = {
  tree: CollectionNode[];
  activeSlug?: string | null;
  selectedSlug?: string | null;
  onDragOver?: (slug: string | null) => void;
  onSelect?: (slug: string | null) => void;
  showManagementControls?: boolean;
  className?: string;
};

function CollectionsSidebarContent({
  tree,
  activeSlug = null,
  selectedSlug = null,
  onDragOver,
  onSelect,
  showManagementControls = true,
  className
}: CollectionsSidebarProps) {
  const [nodes, setNodes] = useState(tree);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [collectionToDelete, setCollectionToDelete] = useState<CollectionNode | null>(null);
  const [showCreateBoardModal, setShowCreateBoardModal] = useState(false);
  const [createBoardParentId, setCreateBoardParentId] = useState<string | undefined>(undefined);

  // Initialize from localStorage or default to false
  const [isCollectionsExpanded, setIsCollectionsExpanded] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('pawkits-collections-expanded');
      return saved === 'true'; // Will be false if null/undefined or 'false'
    }
    return false;
  });

  const router = useRouter();
  const searchParams = useSearchParams();
  const { addCollection, updateCollection, deleteCollection: deleteCollectionFromStore, collections: storeCollections } = useDataStore();

  // Save collections expansion state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('pawkits-collections-expanded', String(isCollectionsExpanded));
  }, [isCollectionsExpanded]);

  useEffect(() => {
    setNodes(tree);
  }, [tree]);

  const createCollection = async (parentId?: string) => {
    if (!showManagementControls) return;
    const name = window.prompt("Collection name");
    if (!name) return;
    try {
      await addCollection({ name, parentId });
      setError(null);
    } catch (err) {
      setError("Unable to create collection");
    }
  };

  const openCreateBoardModal = (parentId?: string) => {
    if (!showManagementControls) return;
    setCreateBoardParentId(parentId);
    setShowCreateBoardModal(true);
  };

  const createBoard = async (name: string, columns: BoardColumn[]) => {
    if (!showManagementControls) return;

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
        parentId: createBoardParentId,
        metadata: metadata as Record<string, unknown>
      });

      setError(null);
    } catch (err) {
      setError("Unable to create board");
      throw err;
    }
  };

  const renameCollection = async (node: CollectionNode) => {
    if (!showManagementControls) return;
    const name = window.prompt("Rename collection", node.name);
    if (!name || name === node.name) return;
    try {
      await updateCollection(node.id, { name });
      setError(null);
    } catch (err) {
      setError("Unable to rename collection");
    }
  };

  const findBySlug = (slug: string, list: CollectionNode[]): CollectionNode | undefined => {
    for (const item of list) {
      if (item.slug === slug) return item;
      const child = findBySlug(slug, item.children ?? []);
      if (child) return child;
    }
    return undefined;
  };

  const moveCollection = async (node: CollectionNode) => {
    if (!showManagementControls) return;
    const slug = window.prompt("Enter parent collection slug (leave blank for root)", "");
    if (slug === null) return;
    const trimmed = slug.trim();
    let parentId: string | null = null;
    if (trimmed.length) {
      const target = findBySlug(trimmed, nodes);
      if (!target) {
        setError("Collection slug not found");
        return;
      }
      parentId = target.id;
    }
    try {
      await updateCollection(node.id, { parentId });
      setError(null);
    } catch (err) {
      setError("Unable to move collection");
    }
  };

  const deleteCollection = (node: CollectionNode) => {
    if (!showManagementControls) return;
    setCollectionToDelete(node);
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    if (!collectionToDelete) return;
    try {
      await deleteCollectionFromStore(collectionToDelete.id);
      setError(null);
    } catch (err) {
      setError("Unable to delete collection");
    }
  };

  const handleSelect = (slug: string | null) => {
    if (onSelect) {
      onSelect(slug);
      return;
    }
    if (!slug) {
      router.push("/library");
    } else {
      router.push(`/pawkits/${slug}`);
    }
  };

  return (
    <div className={className ?? "space-y-3"}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <button
            className="text-gray-400 hover:text-gray-200 transition-colors"
            onClick={() => setIsCollectionsExpanded(!isCollectionsExpanded)}
          >
            {isCollectionsExpanded ? "▼" : "▶"}
          </button>
          <button
            className="text-sm font-semibold text-gray-300 hover:text-accent transition-colors"
            onClick={() => router.push('/pawkits')}
          >
            Collections
          </button>
        </div>
        {showManagementControls && (
          <button className="rounded bg-gray-800 px-2 py-1 text-xs" onClick={() => createCollection()}>
            + New
          </button>
        )}
      </div>
      {error && <p className="text-xs text-rose-400">{error}</p>}
      {isCollectionsExpanded && (
        <nav className="space-y-1 text-sm">
          <button
            className={`w-full rounded px-2 py-1 text-left transition-colors ${!selectedSlug ? "bg-gray-900" : "hover:bg-gray-900"}`}
            onClick={() => handleSelect(null)}
          >
            All cards
          </button>
          {nodes.filter(node => node.deleted !== true).map((node) => (
            <CollectionItem
              key={node.id}
              node={node}
              depth={0}
              activeSlug={activeSlug}
              selectedSlug={selectedSlug}
              onDragOver={onDragOver}
              onSelect={handleSelect}
              onCreate={createCollection}
              onCreateBoard={openCreateBoardModal}
              onRename={renameCollection}
              onMove={moveCollection}
              onDelete={deleteCollection}
              showManagementControls={showManagementControls}
            />
          ))}
        </nav>
      )}

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
          setCreateBoardParentId(undefined);
        }}
        onSubmit={createBoard}
        parentId={createBoardParentId}
      />
    </div>
  );
}

type CollectionItemProps = {
  node: CollectionNode;
  depth: number;
  activeSlug: string | null;
  selectedSlug: string | null;
  onDragOver?: (slug: string | null) => void;
  onSelect: (slug: string | null) => void;
  onCreate: (parentId?: string) => void;
  onCreateBoard: (parentId?: string) => void;
  onRename: (node: CollectionNode) => void;
  onMove: (node: CollectionNode) => void;
  onDelete: (node: CollectionNode) => void;
  showManagementControls: boolean;
};

function CollectionItem({
  node,
  depth,
  activeSlug,
  selectedSlug,
  onDragOver,
  onSelect,
  onCreate,
  onCreateBoard,
  onRename,
  onMove,
  onDelete,
  showManagementControls
}: CollectionItemProps) {
  // Initialize from localStorage or default to false
  const [isExpanded, setIsExpanded] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`pawkit-expanded-${node.slug}`);
      return saved === 'true'; // Will be false if null/undefined or 'false'
    }
    return false;
  });

  const { setNodeRef, isOver } = useDroppable({ id: node.slug, data: { slug: node.slug } });

  // Save expansion state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem(`pawkit-expanded-${node.slug}`, String(isExpanded));
  }, [isExpanded, node.slug]);

  useEffect(() => {
    if (!onDragOver) return;
    if (isOver) {
      onDragOver(node.slug);
    } else if (activeSlug === node.slug) {
      onDragOver(null);
    }
  }, [isOver, node.slug, activeSlug, onDragOver]);

  const isSelected = selectedSlug === node.slug;
  const isActiveDrop = activeSlug === node.slug;
  const hasChildren = node.children && node.children.length > 0;

  // Define context menu items
  const contextMenuItems: ContextMenuItemConfig[] = showManagementControls
    ? [
        {
          label: "New sub-collection",
          icon: FolderPlus,
          onClick: () => onCreate(node.id),
        },
        {
          label: "New Board",
          icon: KanbanSquare,
          onClick: () => onCreateBoard(node.id),
        },
        { type: "separator" },
        {
          label: "Rename",
          icon: Edit3,
          onClick: () => onRename(node),
        },
        {
          label: "Move",
          icon: ArrowUpDown,
          onClick: () => onMove(node),
        },
        { type: "separator" },
        {
          label: "Delete",
          icon: Trash2,
          onClick: () => onDelete(node),
          destructive: true,
        },
      ]
    : [];

  const content = (
    <div
      ref={setNodeRef}
      className={`rounded px-2 py-1 transition-colors ${isActiveDrop ? "bg-gray-800" : isSelected ? "bg-gray-900" : "hover:bg-gray-900"}`}
      style={{ marginLeft: depth ? depth * 12 : 0 }}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-1 items-center gap-1">
          {hasChildren && (
            <button
              className="text-gray-500 hover:text-gray-300"
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(!isExpanded);
              }}
            >
              {isExpanded ? "▼" : "▶"}
            </button>
          )}
          <button className="flex-1 truncate text-left text-gray-300 flex items-center gap-2" onClick={() => onSelect(node.slug)}>
            {isBoard(node) ? (
              <KanbanSquare size={14} className="flex-shrink-0 text-purple-400" />
            ) : node.isPrivate ? (
              <Lock size={14} className="flex-shrink-0" />
            ) : (
              <Folder size={14} className="flex-shrink-0" />
            )}
            {node.name}
          </button>
        </div>
      </div>
      {hasChildren && isExpanded && (
        <div className="mt-1 space-y-1">
          {node.children.filter(child => child.deleted !== true).map((child) => (
            <CollectionItem
              key={child.id}
              node={child}
              depth={depth + 1}
              activeSlug={activeSlug}
              selectedSlug={selectedSlug}
              onDragOver={onDragOver}
              onSelect={onSelect}
              onCreate={onCreate}
              onCreateBoard={onCreateBoard}
              onRename={onRename}
              onMove={onMove}
              onDelete={onDelete}
              showManagementControls={showManagementControls}
            />
          ))}
        </div>
      )}
    </div>
  );

  // Wrap with context menu if management controls are enabled
  return showManagementControls ? (
    <GenericContextMenu items={contextMenuItems}>
      {content}
    </GenericContextMenu>
  ) : (
    content
  );
}

export function CollectionsSidebar(props: CollectionsSidebarProps) {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <CollectionsSidebarContent {...props} />
    </Suspense>
  );
}
