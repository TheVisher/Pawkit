"use client";

import { useEffect } from "react";
import { useDataStore } from "@/lib/stores/data-store";
import { CustomCalendar } from "@/components/calendar/custom-calendar";
import { WeekView } from "@/components/calendar/week-view";
import { usePanelStore } from "@/lib/hooks/use-panel-store";
import { useCalendarStore } from "@/lib/hooks/use-calendar-store";
import { generateDailyNoteTitle, generateDailyNoteContent } from "@/lib/utils/daily-notes";
import { CalendarIcon } from "lucide-react";
import { format, startOfWeek } from "date-fns";

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

        {/* Absolutely centered month/year */}
        <div className="absolute top-0 left-0 right-0 h-full flex items-center justify-center pointer-events-none">
          <span className="text-xl font-semibold text-foreground pointer-events-auto">
            {viewMode === "week"
              ? `Week of ${format(startOfWeek(currentMonth), 'MMM d, yyyy')}`
              : format(currentMonth, 'MMMM yyyy')}
          </span>
        </div>
      </div>

      {/* Conditional Calendar View */}
      {viewMode === "week" ? (
        <WeekView
          cards={cards}
          currentMonth={currentMonth}
          onDayClick={handleDayClick}
          onCardClick={(card) => openCardDetails(card.id)}
          onCreateDailyNote={handleCreateDailyNote}
        />
      ) : (
        <CustomCalendar
          cards={cards}
          currentMonth={currentMonth}
          onDayClick={handleDayClick}
          onCardClick={(card) => openCardDetails(card.id)}
          onCreateDailyNote={handleCreateDailyNote}
        />
      )}
    </div>
  );
}
