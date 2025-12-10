"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CardModel, CollectionNode } from "@/lib/types";
import { CardGallery } from "@/components/library/card-gallery";
import { LayoutMode } from "@/lib/constants";
import { useViewSettingsStore, type ViewKey } from "@/lib/hooks/view-settings-store";

export type LibraryWorkspaceProps = {
  initialCards: CardModel[];
  initialNextCursor?: string;
  initialQuery: {
    q?: string;
    collection?: string;
    status?: string;
    layout: LayoutMode;
  };
  collectionsTree: CollectionNode[];
  collectionName?: string;
  hideControls?: boolean;
  storageKey?: string; // Key for localStorage, e.g. "library-layout" or "pawkit-movies-layout"
  area: "library" | "home" | "den" | "pawkit" | "notes";
};

function LibraryWorkspaceContent({ initialCards, initialNextCursor, initialQuery, collectionsTree, collectionName, hideControls = false, storageKey = "library-layout", area }: LibraryWorkspaceProps) {
  const [cards, setCards] = useState<CardModel[]>(initialCards);
  const [nextCursor, setNextCursor] = useState<string | undefined>(initialNextCursor);
  const [layout, setLayout] = useState<LayoutMode>(initialQuery.layout);
  const router = useRouter();
  const searchParams = useSearchParams();

  // Get view settings from the store
  // For pawkits, use pawkit-specific key (e.g., "pawkit-my-collection") if slug provided
  const viewKey: ViewKey = area === "pawkit" && initialQuery.collection
    ? `pawkit-${initialQuery.collection}`
    : (area === "pawkit" ? "pawkits" : area);
  const viewSettings = useViewSettingsStore((state) => state.getSettings(viewKey));
  const setViewLayout = useViewSettingsStore((state) => state.setLayout);

  // Load saved layout preference from view settings store on mount
  useEffect(() => {
    const savedLayout = viewSettings.layout;
    if (savedLayout && ["grid", "masonry", "list"].includes(savedLayout)) {
      setLayout(savedLayout);
      // Update URL with saved preference if not already set
      if (!searchParams?.has("layout")) {
        const params = new URLSearchParams(searchParams?.toString());
        params.set("layout", savedLayout);
        const currentPath = window.location.pathname;
        router.replace(`${currentPath}?${params.toString()}`);
      }
    }
  }, [router, searchParams, viewSettings.layout, viewKey, setViewLayout]);

  useEffect(() => {
    setCards(initialCards);
  }, [initialCards]);

  useEffect(() => {
    setNextCursor(initialNextCursor);
  }, [initialNextCursor]);

  useEffect(() => {
    setLayout(initialQuery.layout);
  }, [initialQuery.layout]);

  const handleLayoutChange = (nextLayout: LayoutMode) => {
    setLayout(nextLayout);
    // Save to view settings store instead of localStorage
    setViewLayout(viewKey, nextLayout);
    const params = new URLSearchParams(searchParams?.toString());
    params.set("layout", nextLayout);
    const currentPath = window.location.pathname;
    router.push(`${currentPath}?${params.toString()}`);
  };

  // Note: Drag-and-drop is now handled entirely by Muuri in CardGallery
  // for both masonry and grid layouts. List layout doesn't support drag-and-drop.

  return (
    <CardGallery
      cards={cards}
      nextCursor={nextCursor}
      layout={layout}
      onLayoutChange={handleLayoutChange}
      setCards={setCards}
      setNextCursor={setNextCursor}
      hideControls={hideControls}
      area={area}
      currentPawkitSlug={initialQuery.collection}
    />
  );
}

export function LibraryWorkspace(props: LibraryWorkspaceProps) {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LibraryWorkspaceContent {...props} />
    </Suspense>
  );
}
