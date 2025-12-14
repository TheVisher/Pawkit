"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useDataStore } from "@/lib/stores/data-store";
import { useToastStore } from "@/lib/stores/toast-store";
import { CustomCalendar } from "@/components/calendar/custom-calendar";
import { WeekView } from "@/components/calendar/week-view";
import { DayView } from "@/components/calendar/day-view";
import { CalendarDatePicker } from "@/components/calendar/calendar-date-picker";
import { usePanelStore } from "@/lib/hooks/use-panel-store";
import { useCalendarStore } from "@/lib/hooks/use-calendar-store";
import { generateDailyNoteTitle, generateDailyNoteContent } from "@/lib/utils/daily-notes";
import { CalendarIcon } from "lucide-react";
import { addMonths, subMonths, addWeeks, subWeeks, addDays, subDays } from "date-fns";
import { CalendarEvent } from "@/lib/types/calendar";

export default function CalendarPage() {
  const pathname = usePathname();
  const { cards, addCard } = useDataStore();
  const setActiveCardId = usePanelStore((state) => state.setActiveCardId);
  const openCardDetails = usePanelStore((state) => state.openCardDetails);
  const setCalendarControls = usePanelStore((state) => state.setCalendarControls);

  // Get current month and view mode from calendar store
  const currentMonth = useCalendarStore((state) => state.currentMonth);
  const viewMode = useCalendarStore((state) => state.viewMode);
  const setCurrentMonth = useCalendarStore((state) => state.setCurrentMonth);
  const setViewMode = useCalendarStore((state) => state.setViewMode);

  // Set calendar controls when this page loads (doesn't force panel open)
  // Include pathname to ensure this runs on every navigation to this page
  useEffect(() => {
    setCalendarControls();
  }, [setCalendarControls, pathname]);

  // Handle day click - navigate to day view for that date
  const handleDayClick = (date: Date) => {
    setCurrentMonth(date);
    setViewMode("day");
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
      }
    } catch (error) {
    }
  };

  // Handle event click - open linked card or URL
  const handleEventClick = (event: CalendarEvent) => {
    // If event has a linked card, check if card still exists
    if (event.source?.cardId) {
      const card = cards.find(c => c.id === event.source?.cardId && !c.deleted);
      if (card) {
        setActiveCardId(event.source.cardId);
      } else {
        // Card was deleted - show toast with option to open URL if available
        const eventUrl = event.url;
        if (eventUrl) {
          useToastStore.getState().withAction(
            "The linked bookmark was deleted",
            {
              label: "Open URL",
              onClick: () => window.open(eventUrl, '_blank')
            },
            "info"
          );
        } else {
          useToastStore.getState().info("The linked bookmark was deleted");
        }
      }
      return;
    }

    // If event has a URL but no linked card, open the URL
    if (event.url) {
      window.open(event.url, '_blank');
      return;
    }

    // Manual events are handled by the EventDetailsPopover in the calendar
  };

  return (
    <div className="space-y-6">
      {/* Header - flex row with title left, month navigation right */}
      <div className="flex items-center justify-between gap-4">
        {/* Left-aligned header */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
            <CalendarIcon className="h-5 w-5 text-accent" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Calendar</h1>
            <p className="text-sm text-muted-foreground">
              {viewMode === "day"
                ? "Day view - focus on a single day"
                : viewMode === "week"
                ? "Week view - see your weekly schedule"
                : "Month view - overview of your calendar"}
            </p>
          </div>
        </div>

        {/* Right-aligned date navigation with interactive pickers */}
        <CalendarDatePicker
          currentDate={currentMonth}
          viewMode={viewMode}
          onDateChange={setCurrentMonth}
          onViewModeChange={setViewMode}
          onPrevious={() => {
            if (viewMode === "day") setCurrentMonth(subDays(currentMonth, 1));
            else if (viewMode === "week") setCurrentMonth(subWeeks(currentMonth, 1));
            else setCurrentMonth(subMonths(currentMonth, 1));
          }}
          onNext={() => {
            if (viewMode === "day") setCurrentMonth(addDays(currentMonth, 1));
            else if (viewMode === "week") setCurrentMonth(addWeeks(currentMonth, 1));
            else setCurrentMonth(addMonths(currentMonth, 1));
          }}
        />
      </div>

      {/* Conditional Calendar View */}
      {viewMode === "day" ? (
        <DayView
          cards={cards}
          currentDate={currentMonth}
          onDayClick={handleDayClick}
          onCardClick={(card) => setActiveCardId(card.id)}
          onEventClick={handleEventClick}
          onCreateDailyNote={handleCreateDailyNote}
        />
      ) : viewMode === "week" ? (
        <WeekView
          cards={cards}
          currentMonth={currentMonth}
          onDayClick={handleDayClick}
          onCardClick={(card) => setActiveCardId(card.id)}
          onEventClick={handleEventClick}
          onCreateDailyNote={handleCreateDailyNote}
        />
      ) : (
        <CustomCalendar
          cards={cards}
          currentMonth={currentMonth}
          onDayClick={handleDayClick}
          onCardClick={(card) => setActiveCardId(card.id)}
          onEventClick={handleEventClick}
          onCreateDailyNote={handleCreateDailyNote}
        />
      )}
    </div>
  );
}
