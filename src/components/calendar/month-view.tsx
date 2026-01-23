'use client';

import { useMemo } from 'react';
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  format,
} from 'date-fns';
import { useCalendarStore } from '@/lib/stores/calendar-store';
import { useCards, useCalendarEvents } from '@/lib/contexts/convex-data-context';
import { useCurrentWorkspace } from '@/lib/stores/workspace-store';
import { useModalStore } from '@/lib/stores/modal-store';
import { DayCell } from './day-cell';
import { expandRecurringEvents } from '@/lib/utils/expand-recurring-events';
import type { Card, Id } from '@/lib/types/convex';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface CalendarItem {
  id: string;
  eventId?: Id<'calendarEvents'>;
  title: string;
  date: string;
  color?: string;
  type: 'event' | 'card' | 'todo';
  isAllDay?: boolean;
  startTime?: string;
  source?: {
    type: string;
    cardId?: string;
  };
}

export function MonthView() {
  const { currentDate, setDate, setViewMode } = useCalendarStore();
  const workspace = useCurrentWorkspace();
  const events = useCalendarEvents();
  const cards = useCards();
  const openCardDetail = useModalStore((s) => s.openCardDetail);

  const dailyNoteMap = useMemo(() => {
    const dates = new Map<string, string>();
    cards.forEach((card: Card) => {
      if (card.deleted) return;
      if (!card.isDailyNote && !card.tags?.includes('daily-note')) return;
      const scheduledDates = card.scheduledDates ?? [];
      scheduledDates.forEach((dateStr) => {
        const parsed = new Date(dateStr);
        if (Number.isNaN(parsed.getTime())) return;
        dates.set(format(parsed, 'yyyy-MM-dd'), card._id);
      });
    });
    return dates;
  }, [cards]);

  // Calculate the 6-week grid (42 days)
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [currentDate]);

  // Calculate the date range for the current view
  const viewRange = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
    return { start: calendarStart, end: calendarEnd };
  }, [currentDate]);

  // Convert events and scheduled cards to CalendarItems
  const itemsByDate = useMemo(() => {
    const map = new Map<string, CalendarItem[]>();

    // Expand recurring events for the current view range
    const expandedEvents = expandRecurringEvents(events, viewRange.start, viewRange.end);

    // Add calendar events (now including recurring occurrences)
    expandedEvents.forEach((event) => {
      const dateKey = event.occurrenceDate;
      if (!map.has(dateKey)) {
        map.set(dateKey, []);
      }
      map.get(dateKey)!.push({
        id: event.isOccurrence ? `${event._id}-${dateKey}` : event._id,
        eventId: event.originalEventId ?? event._id,
        title: event.title,
        date: dateKey,
        color: event.color,
        type: 'event',
        isAllDay: event.isAllDay,
        startTime: event.startTime,
        source: event.source,
      });
    });

    // Add scheduled cards (using scheduledDates array)
    cards.forEach((card: Card) => {
      // Skip cards with no scheduled dates
      if (!card.scheduledDates || card.scheduledDates.length === 0) return;
      if (card.isDailyNote || card.tags?.includes('daily-note')) return;

      // Add card to each scheduled date
      card.scheduledDates.forEach((dateKey) => {
        if (!map.has(dateKey)) {
          map.set(dateKey, []);
        }
        map.get(dateKey)!.push({
          id: `${card._id}-${dateKey}`, // Unique ID for each date occurrence
          title: card.title || card.url || 'Untitled',
          date: dateKey,
          type: 'card',
          isAllDay: !card.scheduledStartTime,
          startTime: card.scheduledStartTime,
          source: { type: 'card', cardId: card._id },
        });
      });
    });

    // Sort items within each day by time
    map.forEach((items) => {
      items.sort((a, b) => {
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
  }, [events, cards, viewRange]);

  // Handle day click - navigate to day view
  const handleDayClick = (date: Date) => {
    setDate(date);
    setViewMode('day');
  };

  return (
    <div className="h-full flex flex-col">
      {/* Weekday headers */}
      <div className="grid grid-cols-7 mb-2">
        {WEEKDAYS.map((day) => (
          <div
            key={day}
            className="py-2 text-center text-xs font-medium text-text-muted uppercase tracking-wider"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid - cards float with spacing, no background */}
      <div className="grid grid-cols-7 auto-rows-fr gap-2" style={{ height: 'calc(100% - 2.5rem)' }}>
        {calendarDays.map((date) => {
          const dateKey = format(date, 'yyyy-MM-dd');
          const dayItems = itemsByDate.get(dateKey) || [];
          const isCurrentMonth = isSameMonth(date, currentDate);
          const isSelected = isSameDay(date, currentDate);
          const isTodayDate = isToday(date);

          return (
            <DayCell
              key={dateKey}
              date={date}
              items={dayItems}
              isCurrentMonth={isCurrentMonth}
              isSelected={isSelected}
              isToday={isTodayDate}
              dailyNoteId={dailyNoteMap.get(dateKey)}
              onDailyNoteClick={openCardDetail}
              onClick={() => handleDayClick(date)}
              onItemClick={openCardDetail}
            />
          );
        })}
      </div>
    </div>
  );
}
