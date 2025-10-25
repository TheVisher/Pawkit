"use client";

import { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import { useDataStore } from "@/lib/stores/data-store";
import { CustomCalendar } from "@/components/calendar/custom-calendar";
import { usePanelStore } from "@/lib/hooks/use-panel-store";
import { generateDailyNoteTitle, generateDailyNoteContent } from "@/lib/utils/daily-notes";
import { CalendarIcon } from "lucide-react";
import { GlowButton } from "@/components/ui/glow-button";

export default function CalendarPage() {
  const { cards, addCard } = useDataStore();
  const openCardDetails = usePanelStore((state) => state.openCardDetails);
  const activeCardId = usePanelStore((state) => state.activeCardId);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  // Track if component is mounted (for portal rendering)
  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);

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
        openCardDetails(newCard.id);
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
        onCardClick={(card) => openCardDetails(card.id)}
        onCreateDailyNote={handleCreateDailyNote}
      />

      {/* Expanded Day View Modal */}
      {selectedDate && !activeCardId && isMounted && (() => {
        const scheduledCards = getCardsForDate(selectedDate);
        const dailyNote = getDailyNoteForDate(selectedDate);

        const modalContent = (
          <div
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={() => setSelectedDate(null)}
          >
            <div
              className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-lg p-6 w-full max-w-2xl shadow-xl max-h-[80vh] overflow-y-auto"
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
                  <GlowButton
                    onClick={() => {
                      openCardDetails(dailyNote.id);
                      setSelectedDate(null);
                    }}
                    variant="primary"
                    className="w-full text-left p-4 rounded-xl justify-start"
                  >
                    <div className="flex items-center justify-between w-full">
                      <div>
                        <div className="font-medium text-purple-200">{dailyNote.title}</div>
                        <div className="text-sm text-purple-300/70 mt-1">
                          {dailyNote.content?.substring(0, 100)}...
                        </div>
                      </div>
                      <div className="text-purple-300">→</div>
                    </div>
                  </GlowButton>
                ) : (
                  <GlowButton
                    onClick={() => handleCreateDailyNote(selectedDate)}
                    variant="primary"
                    className="w-full text-left p-4 rounded-xl justify-start"
                  >
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <span>+ Create daily note for this day</span>
                    </div>
                  </GlowButton>
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
                          openCardDetails(card.id);
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
                <GlowButton
                  onClick={() => setSelectedDate(null)}
                  variant="primary"
                  size="md"
                >
                  Close
                </GlowButton>
              </div>
            </div>
          </div>
        );

        return createPortal(modalContent, document.body);
      })()}
    </div>
  );
}
