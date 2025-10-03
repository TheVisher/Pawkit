"use client";

import { useEffect, useMemo, useState, Suspense } from "react";
import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { useRouter, useSearchParams } from "next/navigation";
import { CardModel, CollectionNode } from "@/lib/types";
import { useSelection } from "@/lib/hooks/selection-store";
import { CardGallery } from "@/components/library/card-gallery";
import { CollectionsSidebar } from "@/components/pawkits/sidebar";
import { LayoutMode } from "@/lib/constants";

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
};

function LibraryWorkspaceContent({ initialCards, initialNextCursor, initialQuery, collectionsTree, collectionName }: LibraryWorkspaceProps) {
  const [cards, setCards] = useState<CardModel[]>(initialCards);
  const [nextCursor, setNextCursor] = useState<string | undefined>(initialNextCursor);
  const [activeCollectionSlug, setActiveCollectionSlug] = useState<string | null>(null);
  const [layout, setLayout] = useState<LayoutMode>(initialQuery.layout);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));
  const router = useRouter();
  const searchParams = useSearchParams();

  const selectedIds = useSelection((state) => state.selectedIds);
  const clearSelection = useSelection((state) => state.clear);

  const selectedCollection = useMemo(() => searchParams?.get("collection") ?? null, [searchParams]);

  // Load saved layout preference on mount
  useEffect(() => {
    const savedLayout = localStorage.getItem("library-layout") as LayoutMode;
    if (savedLayout && ["grid", "masonry", "compact", "list"].includes(savedLayout)) {
      setLayout(savedLayout);
      // Update URL with saved preference if not already set
      if (!searchParams?.has("layout")) {
        const params = new URLSearchParams(searchParams?.toString());
        params.set("layout", savedLayout);
        const currentPath = window.location.pathname;
        router.replace(`${currentPath}?${params.toString()}`);
      }
    }
  }, []);

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
    localStorage.setItem("library-layout", nextLayout);
    const params = new URLSearchParams(searchParams?.toString());
    params.set("layout", nextLayout);
    const currentPath = window.location.pathname;
    router.push(`${currentPath}?${params.toString()}`);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const slug = event.over?.data.current?.slug as string | undefined;
    setActiveCollectionSlug(null);
    if (!slug) return;
    const ids = selectedIds.length ? selectedIds : [event.active.id as string];

    // Optimistically update UI
    const updatedCards = ids.map((id) => {
      const currentCollections = cards.find((card) => card.id === id)?.collections ?? [];
      return {
        id,
        collections: Array.from(new Set([slug, ...currentCollections]))
      };
    });

    setCards((prev) =>
      prev.map((card) => {
        const update = updatedCards.find((u) => u.id === card.id);
        return update ? { ...card, collections: update.collections } : card;
      })
    );

    try {
      // Update backend
      const results = await Promise.all(
        updatedCards.map(({ id, collections }) =>
          fetch(`/api/cards/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ collections })
          }).then((res) => {
            if (!res.ok) throw new Error(`Failed to update card ${id}`);
            return res.json();
          })
        )
      );

      // Update with actual server response
      setCards((prev) =>
        prev.map((card) => {
          const updated = results.find((r) => r.id === card.id);
          return updated || card;
        })
      );

      clearSelection();
    } catch (error) {
      console.error("Failed to update cards:", error);
      // Revert optimistic update on error
      setCards(cards);
    }
  };

  const handleDragOver = (slug: string | null) => {
    setActiveCollectionSlug(slug);
  };

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <CardGallery
        cards={cards}
        nextCursor={nextCursor}
        layout={layout}
        onLayoutChange={handleLayoutChange}
        setCards={setCards}
        setNextCursor={setNextCursor}
      />
    </DndContext>
  );
}

export function LibraryWorkspace(props: LibraryWorkspaceProps) {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LibraryWorkspaceContent {...props} />
    </Suspense>
  );
}
