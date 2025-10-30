"use client";

import { useState, useEffect, useMemo } from "react";
import { CardModel, CollectionNode } from "@/lib/types";
import { LibraryWorkspace } from "@/components/library/workspace";
import { useViewSettingsStore, type LayoutMode } from "@/lib/hooks/view-settings-store";
import { sortCards } from "@/lib/utils/sort-cards";
import { FileText, Network, Calendar } from "lucide-react";
import { SmartSearch } from "@/components/notes/smart-search";
import { KnowledgeGraph } from "@/components/notes/knowledge-graph";
import { useDataStore } from "@/lib/stores/data-store";
import { usePanelStore } from "@/lib/hooks/use-panel-store";
import { generateDailyNoteTitle, generateDailyNoteContent, getDailyNotes } from "@/lib/utils/daily-notes";
import { GlowButton } from "@/components/ui/glow-button";
import { CardSurface } from "@/components/ui/card-surface";

type NotesViewProps = {
  initialCards: CardModel[];
  collectionsTree: CollectionNode[];
  query?: string;
};

export function NotesView({ initialCards, collectionsTree, query }: NotesViewProps) {
  const [cards, setCards] = useState<CardModel[]>(initialCards);
  const openCardDetails = usePanelStore((state) => state.openCardDetails);
  const [showGraph, setShowGraph] = useState(false);
  const [showTimeline, setShowTimeline] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const dataStore = useDataStore();

  // Get view settings from the store
  const viewSettings = useViewSettingsStore((state) => state.getSettings("notes"));
  const { sortBy, sortOrder, layout: storedLayout } = viewSettings;

  // Get selected tags from view settings (checks both tags AND collections)
  // Use tags directly from store without filtering - trust the control panel
  const selectedTags = (viewSettings.viewSpecific?.selectedTags as string[]) || [];

  // Use hydration-safe layout to prevent SSR mismatches
  const [layout, setLayout] = useState<LayoutMode>("grid");

  // Handle hydration on mount
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  // Sync layout from stored settings
  useEffect(() => {
    if (storedLayout) {
      setLayout(storedLayout);
    }
  }, [storedLayout]);

  // Sync local state when store updates (important for reactivity!)
  useEffect(() => {
    setCards(initialCards);
  }, [initialCards]);

  // Handle hash-based navigation to open specific notes
  useEffect(() => {
    if (!isHydrated) return;

    const handleHashChange = () => {
      const hash = window.location.hash.substring(1); // Remove the '#'
      if (hash) {
        const card = cards.find(c => c.id === hash);
        if (card) {
          openCardDetails(card.id);
        }
      }
    };

    // Check hash on mount
    handleHashChange();

    // Listen for hash changes
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [cards, isHydrated]);

  // Sort and filter cards based on view settings and selected tags
  const sortedCards = useMemo(() => {
    let filtered = cards;

    // Filter by selected tags (checks both tags AND collections/pawkits)
    if (selectedTags.length > 0) {
      filtered = filtered.filter((card) =>
        selectedTags.some((tag) =>
          card.tags?.includes(tag) || card.collections?.includes(tag)
        )
      );
    }

    return sortCards(filtered, sortBy, sortOrder);
  }, [cards, sortBy, sortOrder, selectedTags]);

  // Get daily notes
  const dailyNotes = useMemo(() => {
    return getDailyNotes(cards);
  }, [cards]);

  // Check if today's daily note exists
  const today = new Date();
  const todayDateStr = today.toISOString().split('T')[0];
  const todaysNote = dailyNotes.find(note => note.date === todayDateStr);
  const hasTodaysNote = !!todaysNote;

  // Create daily note for today
  const createDailyNote = async () => {
    const title = generateDailyNoteTitle(today);
    const content = generateDailyNoteContent(today);
    
    // Check if daily note already exists for today
    if (hasTodaysNote) {
      // Open existing note
      const todaysCard = cards.find(c => c.id === todaysNote!.id);
      if (todaysCard) {
        openCardDetails(todaysCard.id);
      }
      return;
    }
    
    try {
      await dataStore.addCard({
        type: 'md-note',
        title,
        content,
        tags: ['daily'],
        collections: []
      });
      
      // The card is automatically added to the store, so we need to refresh our local state
      // and find the newly created card
      const updatedCards = dataStore.cards;
      const newCard = updatedCards.find(c => c.title === title);
      
      if (newCard) {
        setCards(updatedCards);
        openCardDetails(newCard.id);
      }
    } catch (error) {
      console.error('Failed to create daily note:', error);
    }
  };

  // Don't render until hydrated to prevent hydration mismatches
  if (!isHydrated) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
              <FileText className="h-5 w-5 text-accent" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-foreground">Notes</h1>
              <p className="text-sm text-muted-foreground">Loading...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
            <FileText className="h-5 w-5 text-accent" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Notes</h1>
            <p className="text-sm text-muted-foreground">
              {sortedCards.length} note(s)
              {selectedTags.length > 0 && ` · ${selectedTags.length} tag filter(s)`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <GlowButton
            onClick={createDailyNote}
            variant="primary"
            size="md"
            className="flex items-center gap-2"
            title={hasTodaysNote ? "Open today's daily note" : "Create today's daily note"}
          >
            <Calendar size={16} />
            Daily Note
          </GlowButton>
          <GlowButton
            onClick={() => setShowTimeline(!showTimeline)}
            variant="primary"
            size="md"
            className="flex items-center gap-2"
          >
            <FileText size={16} />
            {showTimeline ? 'Hide Timeline' : 'Show Timeline'}
          </GlowButton>
          <GlowButton
            onClick={() => setShowGraph(!showGraph)}
            variant="primary"
            size="md"
            className="flex items-center gap-2"
          >
            <Network size={16} />
            {showGraph ? 'Hide Graph' : 'Show Graph'}
          </GlowButton>
        </div>
      </div>
      
      {/* Smart Search */}
      <div className="max-w-md">
        <SmartSearch
          onSelectCard={(card) => {
            openCardDetails(card.id);
          }}
          placeholder="Search notes, tags, and content..."
        />
      </div>
      
      {/* Timeline View */}
      {showTimeline && (
        <CardSurface hover={false} className="p-4">
          <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <FileText size={20} />
            Daily Notes Timeline
          </h3>
          {dailyNotes.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No daily notes yet. Create your first daily note to get started!
            </p>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {dailyNotes.map((note) => {
                const card = cards.find(c => c.id === note.id);
                return (
                  <div
                    key={note.id}
                    className="flex items-center justify-between p-3 rounded border border-subtle hover:bg-surface-soft transition-colors cursor-pointer"
                    onClick={() => {
                      if (card) {
                        openCardDetails(card.id);
                      }
                    }}
                  >
                    <div className="flex-1">
                      <h4 className="font-medium text-foreground">{note.title}</h4>
                      <p className="text-sm text-muted-foreground">
                        {new Date(note.date).toLocaleDateString('en-US', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {note.content.length} chars
                      </span>
                      <Calendar size={16} className="text-accent" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardSurface>
      )}

      {/* Knowledge Graph */}
      {showGraph && (
        <KnowledgeGraph
          onSelectCard={(card) => {
            openCardDetails(card.id);
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
