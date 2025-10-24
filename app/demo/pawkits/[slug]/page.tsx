"use client";

import { useSearchParams } from "next/navigation";
import { useMemo, Suspense, use } from "react";
import { LAYOUTS, LayoutMode } from "@/lib/constants";
import { LibraryView } from "@/components/library/library-view";
import { useDemoAwareStore } from "@/lib/hooks/use-demo-aware-store";

function DemoPawkitPageContent({ params }: { params: Promise<{ slug: string }> }) {
  const searchParams = useSearchParams();
  const { slug } = use(params);

  const q = searchParams.get("q") || undefined;
  const layoutParam = searchParams.get("layout") as LayoutMode | null;

  const layout: LayoutMode = layoutParam && LAYOUTS.includes(layoutParam)
    ? layoutParam
    : "masonry";

  const { cards, collections } = useDemoAwareStore();

  // Find the collection by slug OR id
  const collection = collections.find(c => c.slug === slug || c.id === slug);

  const items = useMemo(() => {
    let filtered = cards;

    // Filter by this collection - check both slug and id
    filtered = filtered.filter(card =>
      card.collections?.includes(slug) ||
      (collection && card.collections?.includes(collection.id))
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
  }, [cards, slug, q, collection]);

  return (
    <LibraryView
      initialCards={items}
      initialNextCursor={undefined}
      collectionsTree={collections}
      query={{ q, collection: slug }}
      viewMode="normal"
      timelineDays={30}
    />
  );
}

export default function DemoPawkitPage({ params }: { params: Promise<{ slug: string }> }) {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <DemoPawkitPageContent params={params} />
    </Suspense>
  );
}
