"use client";

import { useState, useEffect, useMemo } from "react";
import { CardModel, CollectionNode } from "@/lib/types";
import { LibraryWorkspace } from "@/components/library/workspace";
import { useViewSettingsStore, type LayoutMode } from "@/lib/hooks/view-settings-store";
import { sortCards } from "@/lib/utils/sort-cards";
import { FileText, Network, Calendar } from "lucide-react";
import { SmartSearch } from "@/components/notes/smart-search";
import { KnowledgeGraph } from "@/components/notes/knowledge-graph";
import { CardDetailModal } from "@/components/modals/card-detail-modal";
import { useDataStore } from "@/lib/stores/data-store";
import { generateDailyNoteTitle, generateDailyNoteContent, getDailyNotes } from "@/lib/utils/daily-notes";

type NotesViewProps = {
  initialCards: CardModel[];
  collectionsTree: CollectionNode[];
  query?: string;
};

export function NotesView({ initialCards, collectionsTree, query }: NotesViewProps) {
  const [cards, setCards] = useState<CardModel[]>(initialCards);
  const [selectedCard, setSelectedCard] = useState<CardModel | null>(null);
  const [showGraph, setShowGraph] = useState(false);
  const [showTimeline, setShowTimeline] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const dataStore = useDataStore();

  // Get view settings from the store
  const viewSettings = useViewSettingsStore((state) => state.getSettings("notes"));
  const { sortBy, sortOrder, layout: storedLayout } = viewSettings;

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
          setSelectedCard(card);
        }
      }
    };

    // Check hash on mount
    handleHashChange();

    // Listen for hash changes
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [cards, isHydrated]);

  // Sort cards based on view settings
  const sortedCards = useMemo(() => {
    return sortCards(cards, sortBy, sortOrder);
  }, [cards, sortBy, sortOrder]);

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
      setSelectedCard(cards.find(c => c.id === todaysNote!.id) || null);
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
        setSelectedCard(newCard);
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
            <p className="text-sm text-muted-foreground">{sortedCards.length} note(s)</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={createDailyNote}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
              hasTodaysNote 
                ? 'bg-purple-500/20 text-purple-200 border border-purple-400/30 hover:bg-purple-500/30' 
                : 'bg-accent text-accent-foreground hover:bg-accent/90'
            }`}
            title={hasTodaysNote ? "Open today's daily note" : "Create today's daily note"}
          >
            <Calendar size={16} />
            Daily Note
          </button>
          <button
            onClick={() => setShowTimeline(!showTimeline)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
              showTimeline 
                ? 'bg-accent text-accent-foreground' 
                : 'bg-surface-soft text-muted-foreground hover:text-foreground'
            }`}
          >
            <FileText size={16} />
            {showTimeline ? 'Hide Timeline' : 'Show Timeline'}
          </button>
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
      </div>
      
      {/* Smart Search */}
      <div className="max-w-md">
        <SmartSearch
          onSelectCard={(card) => {
            setSelectedCard(card);
          }}
          placeholder="Search notes, tags, and content..."
        />
      </div>
      
      {/* Timeline View */}
      {showTimeline && (
        <div className="bg-surface rounded-lg border border-subtle p-4">
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
                        setSelectedCard(card);
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
        </div>
      )}

      {/* Knowledge Graph */}
      {showGraph && (
        <KnowledgeGraph
          onSelectCard={(card) => {
            setSelectedCard(card);
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

      {/* Card Detail Modal */}
      {selectedCard && (
        <CardDetailModal
          card={selectedCard}
          collections={collectionsTree}
          onClose={() => setSelectedCard(null)}
          onUpdate={(updatedCard) => {
            setCards(prev => prev.map(c => c.id === updatedCard.id ? updatedCard : c));
          }}
          onDelete={() => {
            setCards(prev => prev.filter(c => c.id !== selectedCard.id));
            setSelectedCard(null);
          }}
          onNavigateToCard={(cardId) => {
            const card = cards.find(c => c.id === cardId);
            if (card) {
              setSelectedCard(card);
            }
          }}
        />
      )}
    </div>
  );
}
