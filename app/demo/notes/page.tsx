"use client";

import { useSearchParams } from "next/navigation";
import { useMemo, Suspense } from "react";
import { LAYOUTS, LayoutMode } from "@/lib/constants";
import { LibraryView } from "@/components/library/library-view";
import { useDemoAwareStore } from "@/lib/hooks/use-demo-aware-store";

function DemoNotesPageContent() {
  const searchParams = useSearchParams();

  const q = searchParams.get("q") || undefined;
  const collection = searchParams.get("collection") || undefined;
  const layoutParam = searchParams.get("layout") as LayoutMode | null;

  // Default to list view for notes
  const layout: LayoutMode = layoutParam && LAYOUTS.includes(layoutParam)
    ? layoutParam
    : "list";

  const { cards, collections } = useDemoAwareStore();

  // Filter to only show notes (md-note and text-note)
  const items = useMemo(() => {
    let filtered = cards.filter(card =>
      card.type === "md-note" || card.type === "text-note"
    );

    // Exclude Den items
    filtered = filtered.filter(card => !card.inDen);

    if (q) {
      const query = q.toLowerCase();
      filtered = filtered.filter(card =>
        card.title?.toLowerCase().includes(query) ||
        card.content?.toLowerCase().includes(query) ||
        card.notes?.toLowerCase().includes(query)
      );
    }

    if (collection) {
      filtered = filtered.filter(card =>
        card.collections?.includes(collection)
      );
    }

    return filtered;
  }, [cards, q, collection]);

  return (
    <LibraryView
      initialCards={items}
      initialNextCursor={undefined}
      collectionsTree={collections}
      query={{ q, collection }}
      viewMode="normal"
      timelineDays={30}
    />
  );
}

export default function DemoNotesPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <DemoNotesPageContent />
    </Suspense>
  );
}
