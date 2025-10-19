"use client";

import { useState, useEffect, useMemo } from "react";
import { CardModel, CollectionNode } from "@/lib/types";
import { LibraryWorkspace } from "@/components/library/workspace";
import { useViewSettingsStore, type LayoutMode } from "@/lib/hooks/view-settings-store";
import { sortCards } from "@/lib/utils/sort-cards";
import { FileText, Network, Calendar, Plus } from "lucide-react";
import { SmartSearch } from "@/components/notes/smart-search";
import { KnowledgeGraph } from "@/components/notes/knowledge-graph";
import { useDataStore } from "@/lib/stores/data-store";
import { generateDailyNoteTitle, generateDailyNoteContent, isDailyNote, getDailyNotes } from "@/lib/utils/daily-notes";

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
  const dataStore = useDataStore();

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

  // Get daily notes
  const dailyNotes = useMemo(() => {
    return getDailyNotes(cards);
  }, [cards]);

  // Create daily note for today
  const createDailyNote = async () => {
    const today = new Date();
    const title = generateDailyNoteTitle(today);
    const content = generateDailyNoteContent(today);
    
    // Check if daily note already exists for today
    const existingNote = dailyNotes.find(note => note.date === today.toISOString().split('T')[0]);
    if (existingNote) {
      // Open existing note
      setSelectedCard(cards.find(c => c.id === existingNote.id) || null);
      return;
    }
    
    try {
      const newCard = await dataStore.createCard({
        type: 'md-note',
        title,
        content,
        tags: ['daily'],
        collections: []
      });
      
      // Update local state
      setCards(prev => [...prev, newCard]);
      setSelectedCard(newCard);
    } catch (error) {
      console.error('Failed to create daily note:', error);
    }
  };

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
            className="flex items-center gap-2 px-3 py-2 rounded-lg transition-colors bg-accent text-accent-foreground hover:bg-accent/90"
            title="Create or open today's daily note"
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
            // You could open the card modal here or navigate to it
            console.log('Selected card:', card);
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
              {dailyNotes.map((note) => (
                <div
                  key={note.id}
                  className="flex items-center justify-between p-3 rounded border border-subtle hover:bg-surface-soft transition-colors cursor-pointer"
                  onClick={() => {
                    const card = cards.find(c => c.id === note.id);
                    if (card) setSelectedCard(card);
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
              ))}
            </div>
          )}
        </div>
      )}

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
