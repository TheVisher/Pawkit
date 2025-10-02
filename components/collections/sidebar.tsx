"use client";

import { useEffect, useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import { useRouter, useSearchParams } from "next/navigation";
import { CollectionNode } from "@/lib/types";

export type CollectionsSidebarProps = {
  tree: CollectionNode[];
  activeSlug: string | null;
  selectedSlug: string | null;
  onDragOver: (slug: string | null) => void;
};

export function CollectionsSidebar({ tree, activeSlug, selectedSlug, onDragOver }: CollectionsSidebarProps) {
  const [nodes, setNodes] = useState(tree);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    setNodes(tree);
  }, [tree]);

  const refresh = async () => {
    const response = await fetch("/api/collections");
    if (!response.ok) {
      setError("Failed to refresh collections");
      return;
    }
    const data = await response.json();
    setNodes(data.tree);
    setError(null);
  };

  const createCollection = async (parentId?: string) => {
    const name = window.prompt("Collection name");
    if (!name) return;
    const response = await fetch("/api/collections", {
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
    const name = window.prompt("Rename collection", node.name);
    if (!name || name === node.name) return;
    const response = await fetch(`/api/collections/${node.id}`, {
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
    const response = await fetch(`/api/collections/${node.id}`, {
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
    const confirmed = window.confirm(`Delete collection "${node.name}"?`);
    if (!confirmed) return;
    const response = await fetch(`/api/collections/${node.id}`, { method: "DELETE" });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setError(body.message || "Unable to delete collection");
      return;
    }
    await refresh();
  };

  const selectCollection = (slug: string | null) => {
    const params = new URLSearchParams(searchParams?.toString());
    if (!slug) {
      params.delete("collection");
    } else if (params.get("collection") === slug) {
      params.delete("collection");
    } else {
      params.set("collection", slug);
    }
    router.push(`/library?${params.toString()}`);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-300">Collections</h2>
        <button className="rounded bg-gray-800 px-2 py-1 text-xs" onClick={() => createCollection()}>
          + New
        </button>
      </div>
      {error && <p className="text-xs text-rose-400">{error}</p>}
      <nav className="space-y-1 text-sm">
        <button
          className={`w-full rounded px-2 py-1 text-left transition-colors ${!selectedSlug ? "bg-gray-900" : "hover:bg-gray-900"}`}
          onClick={() => selectCollection(null)}
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
            onSelect={selectCollection}
            onCreate={createCollection}
            onRename={renameCollection}
            onMove={moveCollection}
            onDelete={deleteCollection}
          />
        ))}
      </nav>
    </div>
  );
}

type CollectionItemProps = {
  node: CollectionNode;
  depth: number;
  activeSlug: string | null;
  selectedSlug: string | null;
  onDragOver: (slug: string | null) => void;
  onSelect: (slug: string | null) => void;
  onCreate: (parentId?: string) => void;
  onRename: (node: CollectionNode) => void;
  onMove: (node: CollectionNode) => void;
  onDelete: (node: CollectionNode) => void;
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
  onDelete
}: CollectionItemProps) {
  const { setNodeRef, isOver } = useDroppable({ id: node.slug, data: { slug: node.slug } });

  useEffect(() => {
    if (isOver) {
      onDragOver(node.slug);
    } else if (activeSlug === node.slug) {
      onDragOver(null);
    }
  }, [isOver, node.slug, activeSlug, onDragOver]);

  const isSelected = selectedSlug === node.slug;
  const isActiveDrop = activeSlug === node.slug;

  return (
    <div
      ref={setNodeRef}
      className={`rounded px-2 py-1 transition-colors ${isActiveDrop ? "bg-gray-800" : isSelected ? "bg-gray-900" : "hover:bg-gray-900"}`}
      style={{ marginLeft: depth ? depth * 12 : 0 }}
    >
      <div className="flex items-center justify-between gap-2">
        <button className="flex-1 truncate text-left text-gray-300" onClick={() => onSelect(node.slug)}>
          {node.name}
        </button>
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
      </div>
      {node.children?.length > 0 && (
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
            />
          ))}
        </div>
      )}
    </div>
  );
}
