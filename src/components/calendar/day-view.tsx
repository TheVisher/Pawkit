'use client';

import { useMemo } from 'react';
import { format, isToday } from 'date-fns';
import { useCalendarStore } from '@/lib/stores/calendar-store';
import { useDataStore } from '@/lib/stores/data-store';
import { EventItem } from './event-item';
import type { LocalCalendarEvent, LocalCard } from '@/lib/db/types';

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const HOUR_HEIGHT = 60; // px

interface CalendarItem {
  id: string;
  title: string;
  date: string;
  color?: string;
  type: 'event' | 'card' | 'todo';
  isAllDay?: boolean;
  startTime?: string;
  endTime?: string;
  source?: {
    type: string;
    cardId?: string;
  };
}

export function DayView() {
  const { currentDate } = useCalendarStore();
  const events = useDataStore((state) => state.events);
  const cards = useDataStore((state) => state.cards);

  const dateKey = format(currentDate, 'yyyy-MM-dd');
  const isTodayDate = isToday(currentDate);

  // Get items for current day
  const dayItems = useMemo(() => {
    const items: CalendarItem[] = [];

    // Add calendar events
    events
      .filter((event: LocalCalendarEvent) => event.date === dateKey)
      .forEach((event: LocalCalendarEvent) => {
        items.push({
          id: event.id,
          title: event.title,
          date: event.date,
          color: event.color,
          type: 'event',
          isAllDay: event.isAllDay,
          startTime: event.startTime,
          endTime: event.endTime,
          source: event.source,
        });
      });

    // Add scheduled cards
    cards
      .filter((card: LocalCard) => card.scheduledDate)
      .filter((card: LocalCard) => format(new Date(card.scheduledDate!), 'yyyy-MM-dd') === dateKey)
      .forEach((card: LocalCard) => {
        items.push({
          id: card.id,
          title: card.title || card.url || 'Untitled',
          date: dateKey,
          type: 'card',
          isAllDay: !card.scheduledStartTime,
          startTime: card.scheduledStartTime,
          endTime: card.scheduledEndTime,
          source: { type: 'card', cardId: card.id },
        });
      });

    return items;
  }, [events, cards, dateKey]);

  return (
    <div className="h-full flex flex-col">
      {/* Day header */}
      <div className="flex items-center justify-center py-4 border-b border-border-subtle bg-bg-surface-1">
        <div className={isTodayDate ? 'text-accent-primary' : 'text-text-primary'}>
          <div className="text-sm text-center text-text-muted">
            {format(currentDate, 'EEEE')}
          </div>
          <div className="text-3xl font-light mt-1 text-center">
            {format(currentDate, 'd')}
          </div>
        </div>
      </div>

      {/* Time grid */}
      <div className="flex-1 overflow-auto">
        <div className="grid grid-cols-[60px_1fr]">
          {HOURS.map((hour) => {
            // Filter items for this hour
            const hourItems = dayItems.filter((item) => {
              if (item.isAllDay) return false;
              if (!item.startTime) return false;

              const [itemHour] = item.startTime.split(':').map(Number);
              return itemHour === hour;
            });

            return (
              <div key={hour} className="contents">
                {/* Hour label */}
                <div
                  className="border-r border-b border-border-subtle text-xs text-text-muted text-right pr-2 pt-1"
                  style={{ height: HOUR_HEIGHT }}
                >
                  {hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}
                </div>

                {/* Hour slot */}
                <div
                  className="border-r border-b border-border-subtle bg-bg-surface-1/30 hover:bg-bg-surface-2/50 transition-colors p-2"
                  style={{ height: HOUR_HEIGHT }}
                >
                  <div className="space-y-1">
                    {hourItems.map((item) => (
                      <EventItem key={item.id} item={item} />
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
