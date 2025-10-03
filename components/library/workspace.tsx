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
    const params = new URLSearchParams(searchParams?.toString());
    params.set("layout", nextLayout);
    router.push(`/library?${params.toString()}`);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const slug = event.over?.data.current?.slug as string | undefined;
    setActiveCollectionSlug(null);
    if (!slug) return;
    const ids = selectedIds.length ? selectedIds : [event.active.id as string];
    await Promise.all(
      ids.map((id) => {
        const currentCollections = cards.find((card) => card.id === id)?.collections ?? [];
        const nextCollections = Array.from(new Set([slug, ...currentCollections]));
        return fetch(`/api/cards/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ collections: nextCollections })
        });
      })
    );
    clearSelection();
    setCards((prev) =>
      prev.map((card) =>
        ids.includes(card.id)
          ? { ...card, collections: Array.from(new Set([slug, ...card.collections])) }
          : card
      )
    );
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
