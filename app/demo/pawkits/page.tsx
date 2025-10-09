"use client";

import { useSearchParams } from "next/navigation";
import { useMemo, Suspense } from "react";
import { LAYOUTS, LayoutMode } from "@/lib/constants";
import { LibraryView } from "@/components/library/library-view";
import { useDemoAwareStore } from "@/lib/hooks/use-demo-aware-store";

function DemoPawkitsPageContent() {
  const searchParams = useSearchParams();

  const q = searchParams.get("q") || undefined;
  const layoutParam = searchParams.get("layout") as LayoutMode | null;

  const layout: LayoutMode = layoutParam && LAYOUTS.includes(layoutParam)
    ? layoutParam
    : "masonry";

  const { cards, collections } = useDemoAwareStore();

  // Show all cards that are in at least one collection
  const items = useMemo(() => {
    let filtered = cards;

    // Filter to only cards that have collections
    filtered = filtered.filter(card =>
      card.collections && card.collections.length > 0
    );

    // Exclude Den items
    filtered = filtered.filter(card => !card.inDen);

    // Search query
    if (q) {
      const query = q.toLowerCase();
      filtered = filtered.filter(card =>
        card.title?.toLowerCase().includes(query) ||
        card.url.toLowerCase().includes(query) ||
        card.notes?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [cards, q]);

  return (
    <LibraryView
      initialCards={items}
      initialNextCursor={undefined}
      initialLayout={layout}
      collectionsTree={collections}
      query={{ q }}
      viewMode="normal"
      timelineDays={30}
    />
  );
}

export default function DemoPawkitsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <DemoPawkitsPageContent />
    </Suspense>
  );
}
