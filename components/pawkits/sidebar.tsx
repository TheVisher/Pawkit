"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { useDroppable } from "@dnd-kit/core";
import { useRouter, useSearchParams } from "next/navigation";
import { CollectionNode } from "@/lib/types";

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

  // Save collections expansion state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('pawkits-collections-expanded', String(isCollectionsExpanded));
  }, [isCollectionsExpanded]);

  useEffect(() => {
    setNodes(tree);
  }, [tree]);

  const refresh = async () => {
    const response = await fetch("/api/pawkits");
    if (!response.ok) {
      setError("Failed to refresh collections");
      return;
    }
    const data = await response.json();
    setNodes(data.tree);
    setError(null);
  };

  const createCollection = async (parentId?: string) => {
    if (!showManagementControls) return;
    const name = window.prompt("Collection name");
    if (!name) return;
    const response = await fetch("/api/pawkits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, parentId })
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setError(body.message || "Unable to create collection");
      return;
    }
    await refresh();
  };

  const renameCollection = async (node: CollectionNode) => {
    if (!showManagementControls) return;
    const name = window.prompt("Rename collection", node.name);
    if (!name || name === node.name) return;
    const response = await fetch(`/api/pawkits/${node.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name })
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setError(body.message || "Unable to rename collection");
      return;
    }
    await refresh();
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
    const response = await fetch(`/api/pawkits/${node.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ parentId })
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setError(body.message || "Unable to move collection");
      return;
    }
    await refresh();
  };

  const deleteCollection = async (node: CollectionNode) => {
    if (!showManagementControls) return;
    const confirmed = window.confirm(`Delete collection "${node.name}"?`);
    if (!confirmed) return;
    const response = await fetch(`/api/pawkits/${node.id}`, { method: "DELETE" });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setError(body.message || "Unable to delete collection");
      return;
    }
    await refresh();
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
          {nodes.map((node) => (
            <CollectionItem
              key={node.id}
              node={node}
              depth={0}
            activeSlug={activeSlug}
            selectedSlug={selectedSlug}
            onDragOver={onDragOver}
            onSelect={handleSelect}
            onCreate={createCollection}
            onRename={renameCollection}
            onMove={moveCollection}
            onDelete={deleteCollection}
            showManagementControls={showManagementControls}
          />
        ))}
        </nav>
      )}
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

  return (
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
          <button className="flex-1 truncate text-left text-gray-300" onClick={() => onSelect(node.slug)}>
            {node.name}
          </button>
        </div>
        {showManagementControls && (
          <div className="flex items-center gap-1">
            <button className="rounded bg-gray-800 px-1 text-[10px]" onClick={() => onCreate(node.id)}>
              +
            </button>
            <button className="rounded bg-gray-800 px-1 text-[10px]" onClick={() => onRename(node)}>
              ✎
            </button>
            <button className="rounded bg-gray-800 px-1 text-[10px]" onClick={() => onMove(node)}>
              ↕
            </button>
            <button className="rounded bg-gray-800 px-1 text-[10px] text-rose-400" onClick={() => onDelete(node)}>
              ×
            </button>
          </div>
        )}
      </div>
      {hasChildren && isExpanded && (
        <div className="mt-1 space-y-1">
          {node.children.map((child) => (
            <CollectionItem
              key={child.id}
              node={child}
              depth={depth + 1}
              activeSlug={activeSlug}
              selectedSlug={selectedSlug}
              onDragOver={onDragOver}
              onSelect={onSelect}
              onCreate={onCreate}
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
}

export function CollectionsSidebar(props: CollectionsSidebarProps) {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <CollectionsSidebarContent {...props} />
    </Suspense>
  );
}
