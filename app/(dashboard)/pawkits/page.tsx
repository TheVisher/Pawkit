"use client";

import { useMemo } from "react";
import { CollectionsGrid } from "@/components/pawkits/grid";
import { PawkitsHeader } from "@/components/pawkits/pawkits-header";
import { useDataStore } from "@/lib/stores/data-store";

export default function CollectionsPage() {
  const { collections, cards } = useDataStore();

  // Create grid items and allPawkits from Zustand store
  const { gridItems, allPawkits } = useMemo(() => {
    // Flatten all pawkits
    const flattenPawkits = (nodes: typeof collections, result: any[] = []): any[] => {
      for (const node of nodes) {
        result.push({ id: node.id, name: node.name, slug: node.slug });
        if (node.children?.length) {
          flattenPawkits(node.children, result);
        }
      }
      return result;
    };

    const allPawkits = flattenPawkits(collections);

    // Create grid items with preview cards
    const gridItems = collections.map(root => {
      const pawkitCards = cards.filter(card => card.collections.includes(root.slug));

      return {
        id: root.id,
        name: root.name,
        slug: root.slug,
        count: pawkitCards.length,
        cards: pawkitCards,
        isPinned: root.pinned,
        hasChildren: root.children && root.children.length > 0
      };
    });

    return { gridItems, allPawkits };
  }, [collections, cards]);

  return (
    <div className="space-y-10">
      <PawkitsHeader />
      <CollectionsGrid collections={gridItems} allPawkits={allPawkits} />
      <section className="rounded-lg border border-gray-800 bg-gray-900/40 p-6">
        <h2 className="text-lg font-semibold text-gray-100 mb-2">Manage Pawkits</h2>
        <p className="text-sm text-gray-400">
          Use the sidebar to navigate Pawkits and sub-Pawkits. Click the 3-dot menu on any Pawkit card to rename, move, or delete it.
        </p>
      </section>
    </div>
  );
}
