"use client";

import { useSearchParams } from "next/navigation";
import { useMemo, Suspense } from "react";
import { LAYOUTS, LayoutMode } from "@/lib/constants";
import { LibraryView } from "@/components/library/library-view";
import { useDemoAwareStore } from "@/lib/hooks/use-demo-aware-store";

function DemoPageContent() {
  const searchParams = useSearchParams();

  const q = searchParams.get("q") || undefined;
  const collection = searchParams.get("collection") || undefined;
  const statusParam = searchParams.get("status") || undefined;
  const status = statusParam && ["PENDING", "READY", "ERROR"].includes(statusParam) ? statusParam as "PENDING" | "READY" | "ERROR" : undefined;
  const layoutParam = searchParams.get("layout") as LayoutMode | null;
  const viewParam = searchParams.get("view") || "normal";
  const daysParam = searchParams.get("days") || "30";

  // Default to masonry for demo, can be overridden by URL param
  const layout: LayoutMode = layoutParam && LAYOUTS.includes(layoutParam)
    ? layoutParam
    : "masonry";

  // Parse view mode and days
  const viewMode = viewParam === "timeline" ? "timeline" : "normal";
  const validDays = [7, 30, 90, 180, 365];
  const requestedDays = parseInt(daysParam, 10);
  const days = validDays.includes(requestedDays) ? requestedDays : 30;

  // Read from demo store
  const { cards, collections } = useDemoAwareStore();

  // Filter cards based on search params (client-side filtering)
  const items = useMemo(() => {
    let filtered = cards;

    // Exclude cards in The Den
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

    // Collection filter
    if (collection) {
      filtered = filtered.filter(card =>
        card.collections?.includes(collection)
      );
    }

    // Status filter
    if (status) {
      filtered = filtered.filter(card => card.status === status);
    }

    return filtered;
  }, [cards, q, collection, status]);

  return (
    <LibraryView
      initialCards={items}
      initialNextCursor={undefined}
      initialLayout={layout}
      collectionsTree={collections}
      query={{ q, collection, status }}
      viewMode={viewMode}
      timelineDays={days}
    />
  );
}

export default function DemoPage() {
  return (
    <Suspense fallback={<div>Loading demo...</div>}>
      <DemoPageContent />
    </Suspense>
  );
}
