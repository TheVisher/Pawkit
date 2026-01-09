'use client';

import { useMemo } from 'react';
import {
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isToday,
  isSameDay,
  parseISO,
} from 'date-fns';
import { useCalendarStore } from '@/lib/stores/calendar-store';
import { useCards, useCalendarEvents } from '@/lib/hooks/use-live-data';
import { useCurrentWorkspace } from '@/lib/stores/workspace-store';
import { useModalStore } from '@/lib/stores/modal-store';
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

export function WeekView() {
  const { currentDate } = useCalendarStore();
  const workspace = useCurrentWorkspace();
  const events = useCalendarEvents(workspace?.id);
  const cards = useCards(workspace?.id);
  const openCardDetail = useModalStore((s) => s.openCardDetail);

  // Get the 7 days of the week
  const weekDays = useMemo(() => {
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
    const weekEnd = endOfWeek(currentDate, { weekStartsOn: 0 });
    return eachDayOfInterval({ start: weekStart, end: weekEnd });
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
        endTime: event.endTime,
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
          endTime: card.scheduledEndTime,
          source: { type: 'card', cardId: card.id },
        });
      });
    });

    return map;
  }, [events, cards]);

  return (
    <div className="h-full flex flex-col">
      {/* Day headers */}
      <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-border-subtle bg-bg-surface-1">
        <div className="border-r border-border-subtle" />
        {weekDays.map((day) => {
          const isTodayDate = isToday(day);
          return (
            <div
              key={day.toISOString()}
              className="py-3 text-center border-r border-border-subtle last:border-r-0"
            >
              <div className="text-text-muted">
                <div className="text-[10px] uppercase tracking-wider">
                  {format(day, 'EEE')}
                </div>
                <div className="flex justify-center mt-0.5">
                  <span
                    className="inline-flex items-center justify-center w-8 h-8 text-lg rounded-full"
                    style={isTodayDate ? {
                      backgroundColor: 'var(--color-accent)',
                      color: 'white',
                    } : undefined}
                  >
                    {format(day, 'd')}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* All-day section for scheduled cards without times */}
      <div className="border-b border-border-subtle bg-bg-surface-1/50">
        <div className="grid grid-cols-[60px_repeat(7,1fr)]">
          <div className="border-r border-border-subtle text-xs text-text-muted text-right pr-2 py-2">
            All day
          </div>
          {weekDays.map((day) => {
            const dateKey = format(day, 'yyyy-MM-dd');
            const allDayItems = (itemsByDate.get(dateKey) || []).filter(item => item.isAllDay);

            return (
              <div
                key={`allday-${day.toISOString()}`}
                className="border-r border-border-subtle last:border-r-0 p-1 min-h-[32px]"
              >
                <div className="flex flex-wrap gap-0.5">
                  {allDayItems.map((item) => (
                    <EventItem
                      key={item.id}
                      item={item}
                      compact
                      onClick={item.source?.cardId ? () => openCardDetail(item.source!.cardId!) : undefined}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Time grid */}
      <div className="flex-1 overflow-auto scrollbar-hide">
        <div className="grid grid-cols-[60px_repeat(7,1fr)]">
          {/* Hour labels and day columns */}
          {HOURS.map((hour) => (
            <div key={hour} className="contents">
              {/* Hour label */}
              <div
                className="border-r border-b border-border-subtle text-xs text-text-muted text-right pr-2 pt-1"
                style={{ height: HOUR_HEIGHT }}
              >
                {hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}
              </div>

              {/* Day columns */}
              {weekDays.map((day) => {
                const dateKey = format(day, 'yyyy-MM-dd');
                const dayItems = itemsByDate.get(dateKey) || [];

                // Filter items for this hour
                const hourItems = dayItems.filter((item) => {
                  if (item.isAllDay) return false;
                  if (!item.startTime) return false;

                  const [itemHour] = item.startTime.split(':').map(Number);
                  return itemHour === hour;
                });

                return (
                  <div
                    key={`${day.toISOString()}-${hour}`}
                    className="border-r border-b border-border-subtle bg-bg-surface-1/30 hover:bg-bg-surface-2/50 transition-colors relative p-1"
                    style={{ height: HOUR_HEIGHT }}
                  >
                    <div className="space-y-0.5">
                      {hourItems.map((item) => (
                        <EventItem
                          key={item.id}
                          item={item}
                          compact
                          onClick={item.source?.cardId ? () => openCardDetail(item.source!.cardId!) : undefined}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
