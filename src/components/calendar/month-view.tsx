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
import { useCards, useCalendarEvents } from '@/lib/hooks/use-live-data';
import { useCurrentWorkspace } from '@/lib/stores/workspace-store';
import { useModalStore } from '@/lib/stores/modal-store';
import { DayCell } from './day-cell';
import type { LocalCalendarEvent, LocalCard } from '@/lib/db/types';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface CalendarItem {
  id: string;
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
  const events = useCalendarEvents(workspace?.id);
  const cards = useCards(workspace?.id);
  const openCardDetail = useModalStore((s) => s.openCardDetail);

  // Calculate the 6-week grid (42 days)
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [currentDate]);

  // Convert events and scheduled cards to CalendarItems
  const itemsByDate = useMemo(() => {
    const map = new Map<string, CalendarItem[]>();

    // Add calendar events
    events.forEach((event: LocalCalendarEvent) => {
      const dateKey = event.date;
      if (!map.has(dateKey)) {
        map.set(dateKey, []);
      }
      map.get(dateKey)!.push({
        id: event.id,
        title: event.title,
        date: event.date,
        color: event.color,
        type: 'event',
        isAllDay: event.isAllDay,
        startTime: event.startTime,
        source: event.source,
      });
    });

    // Add scheduled cards - support both legacy scheduledDate and new scheduledDates array
    cards.forEach((card: LocalCard) => {
      // Get all scheduled dates for this card
      const scheduledDates: string[] = [];

      // Support new scheduledDates array
      if (card.scheduledDates && card.scheduledDates.length > 0) {
        scheduledDates.push(...card.scheduledDates);
      }
      // Fallback to legacy scheduledDate (for migration period)
      else if (card.scheduledDate) {
        scheduledDates.push(format(new Date(card.scheduledDate), 'yyyy-MM-dd'));
      }

      // Add card to each scheduled date
      scheduledDates.forEach((dateKey) => {
        if (!map.has(dateKey)) {
          map.set(dateKey, []);
        }
        map.get(dateKey)!.push({
          id: `${card.id}-${dateKey}`, // Unique ID for each date occurrence
          title: card.title || card.url || 'Untitled',
          date: dateKey,
          type: 'card',
          isAllDay: !card.scheduledStartTime,
          startTime: card.scheduledStartTime,
          source: { type: 'card', cardId: card.id },
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
  }, [events, cards]);

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
              onClick={() => handleDayClick(date)}
              onItemClick={openCardDetail}
            />
          );
        })}
      </div>
    </div>
  );
}
