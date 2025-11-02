"use client";

import { useMemo, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useDataStore } from "@/lib/stores/data-store";
import { useCalendarStore } from "@/lib/hooks/use-calendar-store";
import { usePanelStore } from "@/lib/hooks/use-panel-store";
import { generateDailyNoteTitle, generateDailyNoteContent } from "@/lib/utils/daily-notes";
import { CalendarIcon, X, Plus } from "lucide-react";
import { GlowButton } from "@/components/ui/glow-button";
import Image from "next/image";
import { AddEventModal } from "@/components/modals/add-event-modal";

export function DayDetailsPanel() {
  const { cards, addCard } = useDataStore();
  const selectedDay = useCalendarStore((state) => state.selectedDay);
  const setSelectedDay = useCalendarStore((state) => state.setSelectedDay);
  const openCalendarControls = usePanelStore((state) => state.openCalendarControls);
  const openCardDetails = usePanelStore((state) => state.openCardDetails);

  const [showAddEventModal, setShowAddEventModal] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Track if component is mounted (for portal rendering)
  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);

  // Get cards scheduled for the selected date
  const scheduledCards = useMemo(() => {
    if (!selectedDay) return [];
    const dateStr = selectedDay.toISOString().split('T')[0];
    return cards.filter(card =>
      card.scheduledDate &&
      card.scheduledDate.split('T')[0] === dateStr &&
      !card.collections?.includes('the-den')
    );
  }, [selectedDay, cards]);

  // Get daily note for the selected date
  const dailyNote = useMemo(() => {
    if (!selectedDay) return null;
    const title = generateDailyNoteTitle(selectedDay);
    return cards.find(c => c.title === title && !c.collections?.includes('the-den'));
  }, [selectedDay, cards]);

  const handleCreateDailyNote = async () => {
    if (!selectedDay) return;

    const title = generateDailyNoteTitle(selectedDay);
    const content = generateDailyNoteContent(selectedDay);

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
      }
    } catch (error) {
      console.error('Failed to create daily note:', error);
    }
  };

  const handleClose = () => {
    setSelectedDay(null);
    openCalendarControls();
  };

  const handleAddEvent = () => {
    setShowAddEventModal(true);
  };

  if (!selectedDay) {
    return null;
  }

  return (
    <div className="flex flex-col h-full -my-6">
      {/* Close Button at Top - Centered Pill */}
      <div className="flex justify-center py-4 border-b border-white/10">
        <button
          onClick={handleClose}
          className="px-4 py-2 rounded-full bg-white/5 hover:bg-white/10
            border border-white/10 hover:border-white/20
            transition-all duration-200 flex items-center gap-2
            text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <X size={16} />
          Close Daily View
        </button>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
        {/* Date Header */}
        <div>
          <h2 className="text-xl font-semibold text-foreground mb-1">
            {selectedDay.toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
              year: 'numeric'
            })}
          </h2>
          <p className="text-sm text-muted-foreground">
            {scheduledCards.length + (dailyNote ? 1 : 0)} item(s) for this day
          </p>
        </div>

        {/* Daily Note Section */}
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <CalendarIcon size={16} className="text-accent" />
            Daily Note
          </h3>
          {dailyNote ? (
            <button
              onClick={() => openCardDetails(dailyNote.id)}
              className="w-full text-left p-4 rounded-xl bg-purple-500/10 border border-purple-500/30
                hover:bg-purple-500/20 hover:border-purple-500/50 hover:shadow-[0_0_20px_rgba(168,85,247,0.4)]
                transition-all duration-200"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-purple-200 truncate">{dailyNote.title}</div>
                  <div className="text-sm text-purple-300/70 mt-1 line-clamp-2">
                    {dailyNote.content?.substring(0, 100)}...
                  </div>
                </div>
                <div className="text-purple-300 ml-2">→</div>
              </div>
            </button>
          ) : (
            <button
              onClick={handleCreateDailyNote}
              className="w-full text-left p-4 rounded-xl bg-white/5 border border-white/10
                hover:bg-white/10 hover:border-purple-500/50 hover:shadow-[0_0_20px_rgba(168,85,247,0.4)]
                transition-all duration-200 flex items-center gap-2 text-muted-foreground hover:text-foreground"
            >
              <Plus size={16} />
              <span>Create daily note for this day</span>
            </button>
          )}
        </div>

        {/* Scheduled Cards Section */}
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-3">
            Scheduled Cards ({scheduledCards.length})
          </h3>
          {scheduledCards.length > 0 ? (
            <div className="space-y-2">
              {scheduledCards.map((card) => (
                <button
                  key={card.id}
                  onClick={() => openCardDetails(card.id)}
                  className="w-full text-left p-3 rounded-lg bg-white/5 hover:bg-white/10
                    transition-colors border border-white/10 hover:border-white/20
                    flex items-center gap-3"
                >
                  {card.image && (
                    <div className="relative w-12 h-12 flex-shrink-0 rounded overflow-hidden">
                      <Image
                        src={card.image}
                        alt=""
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    </div>
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
            <div className="text-sm text-muted-foreground text-center py-8 border border-dashed border-white/10 rounded-lg">
              No cards scheduled for this day
            </div>
          )}
        </div>

        {/* Add Event Button */}
        <div className="pt-4 border-t border-white/10">
          <button
            onClick={handleAddEvent}
            className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10
              hover:bg-white/10 hover:border-purple-500/50 hover:shadow-[0_0_20px_rgba(168,85,247,0.4)]
              transition-all duration-200 flex items-center justify-center gap-2
              text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            <Plus size={16} />
            Add Event
          </button>
        </div>
      </div>

      {/* Add Event Modal - Rendered via portal */}
      {isMounted && showAddEventModal && createPortal(
        <AddEventModal
          open={showAddEventModal}
          onClose={() => setShowAddEventModal(false)}
          scheduledDate={selectedDay}
        />,
        document.body
      )}
    </div>
  );
}
