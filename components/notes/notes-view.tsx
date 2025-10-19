"use client";

import { useState, useEffect, useMemo } from "react";
import { CardModel, CollectionNode } from "@/lib/types";
import { LibraryWorkspace } from "@/components/library/workspace";
import { useViewSettingsStore, type LayoutMode } from "@/lib/hooks/view-settings-store";
import { sortCards } from "@/lib/utils/sort-cards";
import { FileText, Network } from "lucide-react";
import { SmartSearch } from "@/components/notes/smart-search";
import { KnowledgeGraph } from "@/components/notes/knowledge-graph";

type NotesViewProps = {
  initialCards: CardModel[];
  collectionsTree: CollectionNode[];
  query?: string;
};

export function NotesView({ initialCards, collectionsTree, query }: NotesViewProps) {
  const [cards, setCards] = useState<CardModel[]>(initialCards);
  const [selectedCard, setSelectedCard] = useState<CardModel | null>(null);
  const [showGraph, setShowGraph] = useState(false);

  // Get view settings from the store
  const viewSettings = useViewSettingsStore((state) => state.getSettings("notes"));
  const { sortBy, sortOrder } = viewSettings;
  
  // Use hydration-safe layout to prevent SSR mismatches
  const [layout, setLayout] = useState<LayoutMode>("grid");
  const [isHydrated, setIsHydrated] = useState(false);
  
  useEffect(() => {
    setIsHydrated(true);
    setLayout(viewSettings.layout || "grid");
  }, [viewSettings.layout]);

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
        <button
          onClick={() => setShowGraph(!showGraph)}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
            showGraph 
              ? 'bg-accent text-accent-foreground' 
              : 'bg-surface-soft text-muted-foreground hover:text-foreground'
          }`}
        >
          <Network size={16} />
          {showGraph ? 'Hide Graph' : 'Show Graph'}
        </button>
      </div>
      
      {/* Smart Search */}
      <div className="max-w-md">
        <SmartSearch
          onSelectCard={(card) => {
            setSelectedCard(card);
            // You could open the card modal here or navigate to it
            console.log('Selected card:', card);
          }}
          placeholder="Search notes, tags, and content..."
        />
      </div>
      
      {/* Knowledge Graph */}
      {showGraph && (
        <KnowledgeGraph
          onSelectCard={(card) => {
            setSelectedCard(card);
            console.log('Selected card from graph:', card);
          }}
        />
      )}
      
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
