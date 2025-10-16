"use client";

import { useState, useEffect, useMemo } from "react";
import { CardModel, CollectionNode } from "@/lib/types";
import { LibraryWorkspace } from "@/components/library/workspace";
import { useViewSettingsStore } from "@/lib/hooks/view-settings-store";
import { sortCards } from "@/lib/utils/sort-cards";
import { FileText } from "lucide-react";

type NotesViewProps = {
  initialCards: CardModel[];
  collectionsTree: CollectionNode[];
  query?: string;
};

export function NotesView({ initialCards, collectionsTree, query }: NotesViewProps) {
  const [cards, setCards] = useState<CardModel[]>(initialCards);

  // Get view settings from the store
  const viewSettings = useViewSettingsStore((state) => state.getSettings("notes"));
  const { layout, sortBy, sortOrder } = viewSettings;

  // Sync local state when store updates (important for reactivity!)
  useEffect(() => {
    setCards(initialCards);
  }, [initialCards]);

  // Sort cards based on view settings
  const sortedCards = useMemo(() => {
    return sortCards(cards, sortBy, sortOrder);
  }, [cards, sortBy, sortOrder]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
            <FileText className="h-5 w-5 text-accent" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Notes</h1>
            <p className="text-sm text-muted-foreground">{sortedCards.length} note(s)</p>
          </div>
        </div>
      </div>
      <LibraryWorkspace
        initialCards={sortedCards}
        initialNextCursor={undefined}
        initialQuery={{ q: query, layout }}
        collectionsTree={collectionsTree}
        hideControls={true}
        storageKey="notes-layout"
        area="notes"
      />
    </div>
  );
}
