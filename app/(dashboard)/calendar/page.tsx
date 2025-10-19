"use client";

import { useState, useMemo } from "react";
import { useDataStore } from "@/lib/stores/data-store";
import { CardDetailModal } from "@/components/modals/card-detail-modal";
import { CustomCalendar } from "@/components/calendar/custom-calendar";
import { generateDailyNoteTitle, generateDailyNoteContent } from "@/lib/utils/daily-notes";
import { CalendarIcon } from "lucide-react";

export default function CalendarPage() {
  const { cards, collections, addCard } = useDataStore();
  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const activeCard = useMemo(() => {
    return cards.find((card) => card.id === activeCardId) ?? null;
  }, [cards, activeCardId]);

  const handleCreateDailyNote = async (date: Date) => {
    const title = generateDailyNoteTitle(date);
    const content = generateDailyNoteContent(date);

    try {
      await addCard({
        type: 'md-note',
        title,
        content,
        tags: ['daily'],
        collections: []
      });

      // Find and open the newly created card
      const dataStore = useDataStore.getState();
      const newCard = dataStore.cards.find(c => c.title === title);
      if (newCard) {
        setActiveCardId(newCard.id);
        setSelectedDate(null);
      }
    } catch (error) {
      console.error('Failed to create daily note:', error);
    }
  };

  // Get cards scheduled for a specific date
  const getCardsForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return cards.filter(card =>
      card.scheduledDate &&
      card.scheduledDate.split('T')[0] === dateStr &&
      !card.inDen
    );
  };

  // Get daily note for a specific date
  const getDailyNoteForDate = (date: Date) => {
    const title = generateDailyNoteTitle(date);
    return cards.find(c => c.title === title && !c.inDen);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
            <CalendarIcon className="h-5 w-5 text-accent" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Calendar</h1>
            <p className="text-sm text-muted-foreground">
              View your scheduled cards and daily notes by date
            </p>
          </div>
        </div>
      </div>

      {/* Custom Calendar */}
      <CustomCalendar
        cards={cards}
        onDayClick={(date) => setSelectedDate(date)}
        onCardClick={(card) => setActiveCardId(card.id)}
        onCreateDailyNote={handleCreateDailyNote}
      />

      {/* Expanded Day View Modal */}
      {selectedDate && !activeCard && (() => {
        const scheduledCards = getCardsForDate(selectedDate);
        const dailyNote = getDailyNoteForDate(selectedDate);

        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={() => setSelectedDate(null)}
          >
            <div
              className="bg-surface rounded-2xl p-6 w-full max-w-2xl shadow-xl border border-subtle max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <h2 className="text-xl font-semibold text-foreground mb-2">
                {selectedDate.toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </h2>
              <p className="text-sm text-muted-foreground mb-6">
                {scheduledCards.length + (dailyNote ? 1 : 0)} item(s) for this day
              </p>

              {/* Daily Note Section */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  <CalendarIcon size={16} />
                  Daily Note
                </h3>
                {dailyNote ? (
                  <button
                    onClick={() => {
                      setActiveCardId(dailyNote.id);
                      setSelectedDate(null);
                    }}
                    className="w-full text-left p-4 rounded-lg bg-purple-500/20 border border-purple-400/30 hover:bg-purple-500/30 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-purple-200">{dailyNote.title}</div>
                        <div className="text-sm text-purple-300/70 mt-1">
                          {dailyNote.content?.substring(0, 100)}...
                        </div>
                      </div>
                      <div className="text-purple-300">→</div>
                    </div>
                  </button>
                ) : (
                  <button
                    onClick={() => handleCreateDailyNote(selectedDate)}
                    className="w-full text-left p-4 rounded-lg border border-dashed border-subtle hover:border-accent hover:bg-accent/5 transition-colors"
                  >
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <span>+ Create daily note for this day</span>
                    </div>
                  </button>
                )}
              </div>

              {/* Scheduled Cards Section */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-foreground mb-3">
                  Scheduled Cards ({scheduledCards.length})
                </h3>
                {scheduledCards.length > 0 ? (
                  <div className="space-y-2">
                    {scheduledCards.map((card) => (
                      <button
                        key={card.id}
                        onClick={() => {
                          setActiveCardId(card.id);
                          setSelectedDate(null);
                        }}
                        className="w-full text-left p-3 rounded-lg bg-surface-soft hover:bg-surface transition-colors border border-subtle flex items-center gap-3"
                      >
                        {card.image && (
                          <img
                            src={card.image}
                            alt=""
                            className="w-12 h-12 rounded object-cover flex-shrink-0"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-foreground truncate">
                            {card.title || card.domain || card.url}
                          </div>
                          <div className="text-sm text-muted-foreground truncate">
                            {card.domain || card.url}
                          </div>
                        </div>
                        <div className="text-muted-foreground">→</div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground text-center py-8 border border-dashed border-subtle rounded-lg">
                    No cards scheduled for this day
                  </div>
                )}
              </div>

              {/* Close Button */}
              <div className="flex justify-end">
                <button
                  onClick={() => setSelectedDate(null)}
                  className="rounded-lg bg-surface-soft px-4 py-2 text-sm font-medium text-foreground hover:bg-surface-muted transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Card Detail Modal */}
      {activeCard && (
        <CardDetailModal
          card={activeCard}
          collections={collections || []}
          onClose={() => setActiveCardId(null)}
          onUpdate={() => {}}
          onDelete={() => setActiveCardId(null)}
        />
      )}
    </div>
  );
}
