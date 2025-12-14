"use client";

import { useMemo, useEffect, useState } from "react";
import { addDays, startOfWeek, format, parseISO } from "date-fns";
import { CardModel } from "@/lib/types";
import { CalendarEvent } from "@/lib/types/calendar";
import { isDailyNote, extractDateFromTitle, getDateString } from "@/lib/utils/daily-notes";
import { getCardDisplayTitle } from "@/lib/utils/card-display";
import { useEventStore } from "@/lib/hooks/use-event-store";
import { useCalendarStore } from "@/lib/hooks/use-calendar-store";
import { useTodoStore } from "@/lib/hooks/use-todos";
import { useDataStore } from "@/lib/stores/data-store";
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
  const { events, isInitialized, initialize, generateRecurrenceInstances, updateEvent } =
    useEventStore();

  // Get todos from store
  const { todos, fetchTodos, toggleTodo, updateTodo } = useTodoStore();
  const todosFetched = useTodoStore((state) => state.todos.length > 0 || state.isLoading === false);

  // Get card update function
  const updateCard = useDataStore((state) => state.updateCard);

  // Holiday settings
  const showHolidays = useCalendarStore((state) => state.showHolidays);
  const holidayFilter = useCalendarStore((state) => state.holidayFilter);
  const enabledCountries = useCalendarStore((state) => state.enabledCountries);

  // Visibility filter settings
  const showUrlCards = useCalendarStore((state) => state.showUrlCards);
  const showTodos = useCalendarStore((state) => state.showTodos);
  const showManualEvents = useCalendarStore((state) => state.showManualEvents);
  const showDailyNotes = useCalendarStore((state) => state.showDailyNotes);

  // Week start preference
  const weekStartsOn = useCalendarStore((state) => state.weekStartsOn);

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

  // Fetch todos
  useEffect(() => {
    fetchTodos();
  }, [fetchTodos]);

  // Get all days in the current week (respects weekStartsOn setting)
  const weekDays = useMemo(() => {
    const weekStart = startOfWeek(currentMonth, { weekStartsOn });
    const days = [];
    for (let i = 0; i < 7; i++) {
      days.push(addDays(weekStart, i));
    }
    return days;
  }, [currentMonth, weekStartsOn]);

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

    // Add calendar events (manual events) - only if filter enabled
    if (showManualEvents) {
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
    }

    // Convert scheduled cards to events for display - only if filter enabled
    if (showUrlCards) {
      cardsByDate.forEach((dayCards, dateStr) => {
        if (!map.has(dateStr)) {
          map.set(dateStr, []);
        }

        dayCards.forEach((card) => {
          // Check if card has specific time or is all-day
          const hasTime = card.scheduledStartTime != null;

          // Create a pseudo-event from the scheduled card
          const pseudoEvent: CalendarEvent = {
            id: `card-${card.id}`,
            userId: "",
            title: getCardDisplayTitle(card),
            date: dateStr,
            isAllDay: !hasTime,
            startTime: card.scheduledStartTime ?? undefined,
            endTime: card.scheduledEndTime ?? undefined,
            color: "#6b7280", // Gray color for cards
            source: {
              type: "card",
              cardId: card.id,
            },
            url: card.url, // Pass URL for favicon lookup
            createdAt: card.createdAt || new Date().toISOString(),
            updatedAt: card.updatedAt || new Date().toISOString(),
          };
          map.get(dateStr)!.push(pseudoEvent);
        });
      });
    }

    // Add daily notes as special events - only if filter enabled
    if (showDailyNotes) {
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
    }

    // Add todos with due dates - only if filter enabled
    if (showTodos) {
      todos
        .filter((todo) => todo.dueDate && !todo.completed)
        .forEach((todo) => {
          const dateStr = format(todo.dueDate!, "yyyy-MM-dd");
          if (dateStr < rangeStart || dateStr > rangeEnd) return;

          if (!map.has(dateStr)) {
            map.set(dateStr, []);
          }

          const pseudoEvent: CalendarEvent = {
            id: `todo-${todo.id}`,
            userId: todo.userId,
            title: todo.text,
            date: dateStr,
            isAllDay: true,
            color: "#f59e0b", // Amber/orange for todos
            source: {
              type: "todo" as const,
              todoId: todo.id,
            },
            createdAt: todo.createdAt.toISOString(),
            updatedAt: todo.updatedAt.toISOString(),
          };
          map.get(dateStr)!.push(pseudoEvent);
        });
    }

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
  }, [events, weekDays, generateRecurrenceInstances, cardsByDate, dailyNotesByDate, todos, showUrlCards, showTodos, showManualEvents, showDailyNotes]);

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

  // Handle drag-and-drop reschedule
  const handleEventReschedule = async (eventId: string, newDate: string, sourceType?: string, targetHour?: number) => {
    if (sourceType === "todo") {
      // Extract todo ID from event ID (format: "todo-{id}")
      const todoId = eventId.replace("todo-", "");
      const todo = todos.find((t) => t.id === todoId);
      if (todo) {
        await updateTodo(todoId, { dueDate: parseISO(newDate) });
      }
    } else if (sourceType === "card") {
      // Extract card ID from event ID (format: "card-{id}" or "note-{id}")
      const cardId = eventId.replace("card-", "").replace("note-", "");
      const card = cards.find((c) => c.id === cardId);
      if (card) {
        // Build updates object
        const updates: { scheduledDate: string; scheduledStartTime?: string | null; scheduledEndTime?: string | null } = {
          scheduledDate: newDate,
        };

        // targetHour === -1 means "convert to all-day"
        if (targetHour === -1) {
          updates.scheduledStartTime = null;
          updates.scheduledEndTime = null;
        } else if (targetHour !== undefined && targetHour >= 0) {
          // Set specific time when dropped on a time slot
          const startTime = `${targetHour.toString().padStart(2, "0")}:00`;
          // Default 30-min duration for cards
          const endMinutes = targetHour * 60 + 30;
          const endHour = Math.floor(endMinutes / 60);
          const endMinute = endMinutes % 60;
          const endTime = `${endHour.toString().padStart(2, "0")}:${endMinute.toString().padStart(2, "0")}`;

          updates.scheduledStartTime = startTime;
          updates.scheduledEndTime = endTime;
        }

        await updateCard(cardId, updates);
      }
    } else if (sourceType === "manual" || !sourceType) {
      // Update calendar event date and optionally time
      const event = events.find((e) => e.id === eventId);
      if (event) {
        const updates: { date: string; startTime?: string | null; endTime?: string | null; isAllDay?: boolean } = { date: newDate };

        // targetHour === -1 means "convert to all-day"
        if (targetHour === -1) {
          updates.isAllDay = true;
          updates.startTime = null;
          updates.endTime = null;
        } else if (targetHour !== undefined && targetHour >= 0) {
          // If targetHour is provided, set the time (convert all-day to timed if needed)
          // Calculate event duration in minutes (default 30 min for all-day events)
          let durationMinutes = 30;
          if (event.startTime && event.endTime) {
            const [startH, startM] = event.startTime.split(":").map(Number);
            const [endH, endM] = event.endTime.split(":").map(Number);
            durationMinutes = (endH * 60 + endM) - (startH * 60 + startM);
            if (durationMinutes <= 0) durationMinutes = 30;
          }

          // Set new start time
          const newStartHour = targetHour;
          const newStartMinute = 0;
          updates.startTime = `${newStartHour.toString().padStart(2, "0")}:${newStartMinute.toString().padStart(2, "0")}`;

          // Calculate new end time
          const newEndMinutes = newStartHour * 60 + newStartMinute + durationMinutes;
          const newEndHour = Math.min(23, Math.floor(newEndMinutes / 60));
          const newEndMinute = newEndMinutes % 60;
          updates.endTime = `${newEndHour.toString().padStart(2, "0")}:${newEndMinute.toString().padStart(2, "0")}`;

          // If it was all-day, convert to timed event
          if (event.isAllDay) {
            updates.isAllDay = false;
          }
        }

        await updateEvent(eventId, updates);
      }
    }
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
        onEventReschedule={handleEventReschedule}
      />
    </div>
  );
}
