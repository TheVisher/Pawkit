'use client';

import { useMemo } from 'react';
import {
  format,
  isToday,
  isTomorrow,
  addDays,
  startOfDay,
  parseISO,
  compareAsc,
} from 'date-fns';
import { useCalendarStore } from '@/lib/stores/calendar-store';
import { useCards, useCalendarEvents } from '@/lib/contexts/convex-data-context';
import { useCurrentWorkspace } from '@/lib/stores/workspace-store';
import { useModalStore } from '@/lib/stores/modal-store';
import { EventItem } from './event-item';
import type { CalendarEvent, Card, Id } from '@/lib/types/convex';

const DAYS_TO_SHOW = 30; // Show next 30 days

interface CalendarItem {
  id: string;
  eventId?: Id<'calendarEvents'>;
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

interface DayGroup {
  date: Date;
  items: CalendarItem[];
}

export function AgendaView() {
  const { currentDate } = useCalendarStore();
  const workspace = useCurrentWorkspace();
  const events = useCalendarEvents();
  const cards = useCards();
  const openCardDetail = useModalStore((s) => s.openCardDetail);

  // Group items by day for the next 30 days
  const groupedItems = useMemo(() => {
    const itemsByDate = new Map<string, CalendarItem[]>();
    const startDate = startOfDay(currentDate);

    // Initialize map with next 30 days
    for (let i = 0; i < DAYS_TO_SHOW; i++) {
      const date = addDays(startDate, i);
      const dateKey = format(date, 'yyyy-MM-dd');
      itemsByDate.set(dateKey, []);
    }

    // Add calendar events
    events.forEach((event: CalendarEvent) => {
      const dateKey = event.date;

      // Only include if within our range
      if (itemsByDate.has(dateKey)) {
        itemsByDate.get(dateKey)!.push({
          id: event._id,
          eventId: event._id,
          title: event.title,
          date: event.date,
          color: event.color,
          type: 'event',
          isAllDay: event.isAllDay,
          startTime: event.startTime,
          endTime: event.endTime,
          source: event.source,
        });
      }
    });

    // Add scheduled cards (using scheduledDates array)
    cards
      .filter((card: Card) => card.scheduledDates && card.scheduledDates.length > 0)
      .filter((card: Card) => !card.isDailyNote && !card.tags?.includes('daily-note'))
      .forEach((card: Card) => {
        const firstScheduledDate = card.scheduledDates![0];
        const dateKey = format(new Date(firstScheduledDate), 'yyyy-MM-dd');

        if (itemsByDate.has(dateKey)) {
          itemsByDate.get(dateKey)!.push({
            id: card._id,
            title: card.title || card.url || 'Untitled',
            date: dateKey,
            type: 'card',
            isAllDay: !card.scheduledStartTime,
            startTime: card.scheduledStartTime,
            endTime: card.scheduledEndTime,
            source: { type: 'card', cardId: card._id },
          });
        }
      });

    // Convert to array and filter out empty days
    const groups: DayGroup[] = [];
    itemsByDate.forEach((items, dateKey) => {
      if (items.length > 0) {
        groups.push({
          date: parseISO(dateKey),
          items: items.sort((a, b) => {
            // All-day first
            if (a.isAllDay && !b.isAllDay) return -1;
            if (!a.isAllDay && b.isAllDay) return 1;
            // Then by time
            if (a.startTime && b.startTime) {
              return a.startTime.localeCompare(b.startTime);
            }
            return 0;
          }),
        });
      }
    });

    // Sort by date
    return groups.sort((a, b) => compareAsc(a.date, b.date));
  }, [currentDate, events, cards]);

  if (groupedItems.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-text-muted">
        <p>No upcoming events in the next {DAYS_TO_SHOW} days</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto">
      <div className="max-w-3xl mx-auto space-y-6">
        {groupedItems.map((group) => {
          const isTodayDate = isToday(group.date);
          const isTomorrowDate = isTomorrow(group.date);

          return (
            <div key={group.date.toISOString()}>
              {/* Date header */}
              <div className="mb-3">
                <div
                  className={`text-sm font-medium ${
                    isTodayDate
                      ? 'text-accent-primary'
                      : 'text-text-primary'
                  }`}
                >
                  {isTodayDate && 'Today - '}
                  {isTomorrowDate && 'Tomorrow - '}
                  {format(group.date, 'EEEE, MMMM d, yyyy')}
                </div>
              </div>

              {/* Events for this day */}
              <div className="space-y-2">
                {group.items.map((item) => (
                  <EventItem
                    key={item.id}
                    item={item}
                    onClick={item.source?.cardId ? () => openCardDetail(item.source!.cardId!) : undefined}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
