"use client";

import { useMemo, useEffect, useState } from "react";
import { addDays, startOfWeek, format } from "date-fns";
import { CardModel } from "@/lib/types";
import { CalendarEvent } from "@/lib/types/calendar";
import { isDailyNote, extractDateFromTitle, getDateString } from "@/lib/utils/daily-notes";
import { useEventStore } from "@/lib/hooks/use-event-store";
import { useCalendarStore } from "@/lib/hooks/use-calendar-store";
import { getHolidaysInRange, ResolvedHoliday } from "@/lib/data/us-holidays";
import { TimeGrid } from "./week-view/time-grid";

type WeekViewProps = {
  cards: CardModel[];
  currentMonth: Date;
  onDayClick?: (date: Date) => void;
  onCardClick?: (card: CardModel) => void;
  onEventClick?: (event: CalendarEvent) => void;
  onCreateDailyNote?: (date: Date) => void;
};

export function WeekView({
  cards,
  currentMonth,
  onDayClick,
  onCardClick,
  onEventClick,
  onCreateDailyNote,
}: WeekViewProps) {
  const [isClient, setIsClient] = useState(false);
  const { events, isInitialized, initialize, generateRecurrenceInstances } =
    useEventStore();

  // Holiday settings
  const showHolidays = useCalendarStore((state) => state.showHolidays);
  const holidayFilter = useCalendarStore((state) => state.holidayFilter);
  const enabledCountries = useCalendarStore((state) => state.enabledCountries);

  // Mark as client-side after mount to prevent hydration issues
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Initialize event store
  useEffect(() => {
    if (!isInitialized) {
      initialize();
    }
  }, [isInitialized, initialize]);

  // Get all days in the current week (starting from Sunday)
  const weekDays = useMemo(() => {
    const weekStart = startOfWeek(currentMonth);
    const days = [];
    for (let i = 0; i < 7; i++) {
      days.push(addDays(weekStart, i));
    }
    return days;
  }, [currentMonth]);

  // Group cards by date (scheduled cards become calendar events)
  const cardsByDate = useMemo(() => {
    const map = new Map<string, CardModel[]>();

    // Scheduled cards
    cards
      .filter(
        (card) =>
          card.scheduledDate && !card.collections?.includes("the-den")
      )
      .forEach((card) => {
        const dateStr = card.scheduledDate!.split("T")[0];
        if (!map.has(dateStr)) {
          map.set(dateStr, []);
        }
        map.get(dateStr)!.push(card);
      });

    return map;
  }, [cards]);

  // Get daily notes by date
  const dailyNotesByDate = useMemo(() => {
    const map = new Map<string, CardModel>();

    cards
      .filter(
        (card) => isDailyNote(card) && !card.collections?.includes("the-den")
      )
      .forEach((card) => {
        const date = extractDateFromTitle(card.title!);
        if (date) {
          const dateStr = getDateString(date);
          map.set(dateStr, card);
        }
      });

    return map;
  }, [cards]);

  // Group events by date (including recurrence instances)
  // Also convert scheduled cards to event-like objects for the time grid
  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();

    // Get date range for the visible week
    if (weekDays.length === 0) return map;

    const rangeStart = format(weekDays[0], "yyyy-MM-dd");
    const rangeEnd = format(weekDays[weekDays.length - 1], "yyyy-MM-dd");

    // Add calendar events
    events.forEach((event) => {
      // Generate recurrence instances for recurring events
      const instances = generateRecurrenceInstances(event, rangeStart, rangeEnd);

      instances.forEach((instance) => {
        const dateStr = instance.instanceDate;
        if (!map.has(dateStr)) {
          map.set(dateStr, []);
        }
        map.get(dateStr)!.push(instance.event);
      });
    });

    // Convert scheduled cards to all-day events for display
    cardsByDate.forEach((dayCards, dateStr) => {
      if (!map.has(dateStr)) {
        map.set(dateStr, []);
      }

      dayCards.forEach((card) => {
        // Create a pseudo-event from the scheduled card
        const pseudoEvent: CalendarEvent = {
          id: `card-${card.id}`,
          userId: "",
          title: card.title || card.domain || card.url || "Untitled",
          date: dateStr,
          isAllDay: true, // Scheduled cards are shown as all-day events
          color: "#6b7280", // Gray color for cards
          source: {
            type: "card",
            cardId: card.id,
          },
          createdAt: card.createdAt || new Date().toISOString(),
          updatedAt: card.updatedAt || new Date().toISOString(),
        };
        map.get(dateStr)!.push(pseudoEvent);
      });
    });

    // Add daily notes as special events
    dailyNotesByDate.forEach((note, dateStr) => {
      if (!map.has(dateStr)) {
        map.set(dateStr, []);
      }

      const pseudoEvent: CalendarEvent = {
        id: `note-${note.id}`,
        userId: "",
        title: "Daily Note",
        date: dateStr,
        isAllDay: true,
        color: "var(--ds-accent)", // Purple for notes
        source: {
          type: "card",
          cardId: note.id,
        },
        createdAt: note.createdAt || new Date().toISOString(),
        updatedAt: note.updatedAt || new Date().toISOString(),
      };
      map.get(dateStr)!.push(pseudoEvent);
    });

    // Sort events by time within each day
    map.forEach((dayEvents) => {
      dayEvents.sort((a, b) => {
        // All-day events first
        if (a.isAllDay && !b.isAllDay) return -1;
        if (!a.isAllDay && b.isAllDay) return 1;
        // Then by start time
        if (a.startTime && b.startTime) {
          return a.startTime.localeCompare(b.startTime);
        }
        return 0;
      });
    });

    return map;
  }, [events, weekDays, generateRecurrenceInstances, cardsByDate, dailyNotesByDate]);

  // Group holidays by date
  const holidaysByDate = useMemo(() => {
    const map = new Map<string, ResolvedHoliday>();

    if (!showHolidays || enabledCountries.length === 0 || weekDays.length === 0)
      return map;

    const rangeStart = format(weekDays[0], "yyyy-MM-dd");
    const rangeEnd = format(weekDays[weekDays.length - 1], "yyyy-MM-dd");

    const holidays = getHolidaysInRange(rangeStart, rangeEnd, holidayFilter);

    holidays.forEach((holiday) => {
      map.set(holiday.date, holiday);
    });

    return map;
  }, [showHolidays, holidayFilter, enabledCountries, weekDays]);

  // Handle event click - route to appropriate handler
  const handleEventClick = (event: CalendarEvent) => {
    // If it's a pseudo-event from a card, use card handler
    if (event.source?.cardId) {
      const card = cards.find((c) => c.id === event.source?.cardId);
      if (card) {
        onCardClick?.(card);
        return;
      }
    }
    // Otherwise use event handler
    onEventClick?.(event);
  };

  // Don't render until client-side to prevent hydration issues with dates
  if (!isClient) {
    return (
      <div
        className="h-[600px] rounded-xl"
        style={{
          background: "var(--bg-surface-2)",
          border: "1px solid var(--border-subtle)",
        }}
      />
    );
  }

  return (
    <div className="h-[calc(100vh-200px)] min-h-[500px]">
      <TimeGrid
        weekDays={weekDays}
        eventsByDate={eventsByDate}
        holidaysByDate={holidaysByDate}
        onEventClick={handleEventClick}
        onDayClick={onDayClick}
      />
    </div>
  );
}
