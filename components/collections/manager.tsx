"use client";

import { useMemo, useState } from "react";
import { CollectionsSidebar } from "./sidebar";
import type { CollectionNode } from "@/lib/types";

function findBySlug(slug: string | null, nodes: CollectionNode[]): CollectionNode | null {
  if (!slug) return null;
  for (const node of nodes) {
    if (node.slug === slug) return node;
    const child = findBySlug(slug, node.children ?? []);
    if (child) return child;
  }
  return null;
}

export function CollectionsManager({ tree }: { tree: CollectionNode[] }) {
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);

  const selected = useMemo(() => findBySlug(selectedSlug, tree), [selectedSlug, tree]);

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      <CollectionsSidebar
        tree={tree}
        selectedSlug={selectedSlug}
        onSelect={setSelectedSlug}
        showManagementControls
        className="w-full max-w-sm space-y-3"
      />
      <section className="flex-1 rounded border border-gray-800 bg-gray-900/40 p-6 text-sm text-gray-300">
        {selected ? (
          <div className="space-y-3">
            <div>
              <h2 className="text-lg font-semibold text-gray-100">{selected.name}</h2>
              <p className="text-xs text-gray-500">Slug: {selected.slug}</p>
            </div>
            <p>
              Use the controls on the left to create sub-collections, rename
              <span className="font-semibold text-gray-100"> {selected.name} </span>, or move it under a different parent. Drag cards
              from the library onto this collection to assign them.
            </p>
            {selected.children.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Child collections</h3>
                <ul className="mt-2 space-y-1 text-sm text-gray-400">
                  {selected.children.map((child) => (
                    <li key={child.id} className="truncate">
                      â€¢ {child.name}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-gray-100">Manage collections</h2>
            <p>
              Select a collection on the left to view its details. Use the +, rename, move, and delete controls to organize
              your hierarchy. The drag targets remain available for assigning cards from the library.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
