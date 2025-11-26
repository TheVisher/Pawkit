"use client";

import { useEffect } from "react";
import { useDataStore } from "@/lib/stores/data-store";
import { CustomCalendar } from "@/components/calendar/custom-calendar";
import { WeekView } from "@/components/calendar/week-view";
import { usePanelStore } from "@/lib/hooks/use-panel-store";
import { useCalendarStore } from "@/lib/hooks/use-calendar-store";
import { generateDailyNoteTitle, generateDailyNoteContent } from "@/lib/utils/daily-notes";
import { CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { format, startOfWeek, addMonths, subMonths, addWeeks, subWeeks } from "date-fns";
import { CalendarEvent } from "@/lib/types/calendar";

export default function CalendarPage() {
  const { cards, addCard } = useDataStore();
  const openCardDetails = usePanelStore((state) => state.openCardDetails);
  const openCalendarControls = usePanelStore((state) => state.openCalendarControls);
  const openDayDetails = usePanelStore((state) => state.openDayDetails);
  const activeCardId = usePanelStore((state) => state.activeCardId);

  // Get current month and view mode from calendar store
  const currentMonth = useCalendarStore((state) => state.currentMonth);
  const viewMode = useCalendarStore((state) => state.viewMode);
  const setCurrentMonth = useCalendarStore((state) => state.setCurrentMonth);
  const selectedDay = useCalendarStore((state) => state.selectedDay);
  const setSelectedDay = useCalendarStore((state) => state.setSelectedDay);

  // Open calendar controls on mount
  useEffect(() => {
    openCalendarControls();
  }, [openCalendarControls]);

  // Handle day click
  const handleDayClick = (date: Date) => {
    setSelectedDay(date);
    openDayDetails();
  };

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
        setSelectedDay(null);
      }
    } catch (error) {
    }
  };

  // Handle event click - open linked card, URL, or select the day
  const handleEventClick = (event: CalendarEvent) => {
    // If event has a linked card, open the card modal
    if (event.source?.cardId) {
      openCardDetails(event.source.cardId);
      return;
    }

    // If event has a URL but no linked card, open the URL
    if (event.url) {
      window.open(event.url, '_blank');
      return;
    }

    // Otherwise, select the day to show event details
    const [year, month, day] = event.date.split('-').map(Number);
    setSelectedDay(new Date(year, month - 1, day));
    openDayDetails();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative">
        {/* Left-aligned header */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
            <CalendarIcon className="h-5 w-5 text-accent" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Calendar</h1>
            <p className="text-sm text-muted-foreground">
              {viewMode === "week"
                ? "Week view - detailed view of your schedule"
                : "View your scheduled cards and daily notes by date"}
            </p>
          </div>
        </div>

        {/* Absolutely centered month/year with navigation arrows */}
        <div className="absolute top-0 left-0 right-0 h-full flex items-center justify-center pointer-events-none">
          <div className="flex items-center gap-3 pointer-events-auto">
            <button
              onClick={() => setCurrentMonth(viewMode === "week" ? subWeeks(currentMonth, 1) : subMonths(currentMonth, 1))}
              className="p-1.5 rounded-lg hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors"
              aria-label={viewMode === "week" ? "Previous week" : "Previous month"}
            >
              <ChevronLeft size={20} />
            </button>
            <span className="text-xl font-semibold text-foreground min-w-[200px] text-center">
              {viewMode === "week"
                ? `Week of ${format(startOfWeek(currentMonth), 'MMM d, yyyy')}`
                : format(currentMonth, 'MMMM yyyy')}
            </span>
            <button
              onClick={() => setCurrentMonth(viewMode === "week" ? addWeeks(currentMonth, 1) : addMonths(currentMonth, 1))}
              className="p-1.5 rounded-lg hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors"
              aria-label={viewMode === "week" ? "Next week" : "Next month"}
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Conditional Calendar View */}
      {viewMode === "week" ? (
        <WeekView
          cards={cards}
          currentMonth={currentMonth}
          onDayClick={handleDayClick}
          onCardClick={(card) => openCardDetails(card.id)}
          onEventClick={handleEventClick}
          onCreateDailyNote={handleCreateDailyNote}
        />
      ) : (
        <CustomCalendar
          cards={cards}
          currentMonth={currentMonth}
          onDayClick={handleDayClick}
          onCardClick={(card) => openCardDetails(card.id)}
          onEventClick={handleEventClick}
          onCreateDailyNote={handleCreateDailyNote}
        />
      )}
    </div>
  );
}
