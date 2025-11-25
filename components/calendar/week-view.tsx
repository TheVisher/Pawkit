"use client";

import { useMemo, useEffect, useState } from "react";
import { addDays, startOfWeek, format, isSameDay, isToday } from "date-fns";
import { CardModel } from "@/lib/types";
import { CalendarEvent, EVENT_COLORS } from "@/lib/types/calendar";
import { isDailyNote, extractDateFromTitle, getDateString } from "@/lib/utils/daily-notes";
import { useEventStore } from "@/lib/hooks/use-event-store";
import { FileText, Plus, Clock } from "lucide-react";

// Helper to format time in 12-hour format
function formatTime12h(time24: string): string {
  const [hours, minutes] = time24.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const hours12 = hours % 12 || 12;
  return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
}

type WeekViewProps = {
  cards: CardModel[];
  currentMonth: Date;
  onDayClick?: (date: Date) => void;
  onCardClick?: (card: CardModel) => void;
  onEventClick?: (event: CalendarEvent) => void;
  onCreateDailyNote?: (date: Date) => void;
};

export function WeekView({ cards, currentMonth, onDayClick, onCardClick, onEventClick, onCreateDailyNote }: WeekViewProps) {
  const [isClient, setIsClient] = useState(false);
  const { events, isInitialized, initialize, generateRecurrenceInstances } = useEventStore();

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

  // Group cards by date
  const cardsByDate = useMemo(() => {
    const map = new Map<string, CardModel[]>();

    // Scheduled cards
    cards
      .filter((card) => card.scheduledDate && !card.collections?.includes('the-den'))
      .forEach((card) => {
        const dateStr = card.scheduledDate!.split('T')[0];
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
      .filter((card) => isDailyNote(card) && !card.collections?.includes('the-den'))
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
  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();

    // Get date range for the visible week
    if (weekDays.length === 0) return map;

    const rangeStart = format(weekDays[0], 'yyyy-MM-dd');
    const rangeEnd = format(weekDays[weekDays.length - 1], 'yyyy-MM-dd');

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

    // Sort events by time within each day
    map.forEach((dayEvents, dateStr) => {
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
  }, [events, weekDays, generateRecurrenceInstances]);

  return (
    <div className="space-y-6">
      {/* Week days in horizontal columns */}
      <div className="grid grid-cols-7 gap-3">
        {weekDays.map((day, index) => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const dayCards = cardsByDate.get(dateStr) || [];
          const dayEvents = eventsByDate.get(dateStr) || [];
          const dailyNote = dailyNotesByDate.get(dateStr);
          const isCurrentDay = isClient ? isToday(day) : false;

          const hasContent = dailyNote || dayCards.length > 0 || dayEvents.length > 0;

          return (
            <div
              key={index}
              className={`card-hover rounded-2xl border transition-all cursor-pointer flex flex-col ${
                isCurrentDay
                  ? 'border-accent bg-accent/5'
                  : 'border-subtle bg-surface'
              }`}
              onClick={() => onDayClick?.(day)}
            >
              {/* Day header */}
              <div className="p-3 border-b border-white/5">
                <div className={`text-sm font-semibold text-center ${
                  isCurrentDay ? 'text-accent' : 'text-foreground'
                }`}>
                  {format(day, 'EEE')}
                </div>
                <div className="text-xs text-muted-foreground text-center mt-0.5">
                  {format(day, 'MMM d')}
                </div>
              </div>

              {/* Events container - scrollable */}
              <div className="flex-1 p-2 space-y-2 overflow-y-auto max-h-[500px]">
                {/* Daily note */}
                {dailyNote && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onCardClick?.(dailyNote);
                    }}
                    className="w-full px-2 py-2 rounded-lg bg-purple-500/10 border border-purple-500/30 hover:bg-purple-500/20 transition-colors flex items-center gap-2 text-left"
                  >
                    <FileText size={12} className="text-purple-300 flex-shrink-0" />
                    <span className="text-xs font-medium text-purple-200 truncate">
                      Note
                    </span>
                  </button>
                )}

                {/* Calendar Events */}
                {dayEvents.map((event) => (
                  <button
                    key={event.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onEventClick?.(event);
                    }}
                    className="w-full text-left px-2 py-2 rounded-lg bg-surface-soft hover:bg-surface transition-colors border border-subtle"
                  >
                    <div className="flex items-start gap-2">
                      <span
                        className="w-2 h-2 rounded-full flex-shrink-0 mt-1"
                        style={{ backgroundColor: event.color || EVENT_COLORS.purple }}
                      />
                      <div className="flex-1 min-w-0">
                        {!event.isAllDay && event.startTime && (
                          <div className="text-[10px] text-muted-foreground flex items-center gap-1 mb-0.5">
                            <Clock size={10} />
                            {formatTime12h(event.startTime)}
                            {event.endTime && ` - ${formatTime12h(event.endTime)}`}
                          </div>
                        )}
                        <div className="text-xs font-medium text-foreground truncate">
                          {event.title}
                        </div>
                        {event.location && (
                          <div className="text-[10px] text-muted-foreground truncate mt-0.5">
                            {event.location}
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                ))}

                {/* Scheduled cards */}
                {dayCards.map((card) => (
                  <button
                    key={card.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onCardClick?.(card);
                    }}
                    className="w-full text-left px-2 py-2 rounded-lg bg-surface-soft hover:bg-surface transition-colors border border-subtle"
                  >
                    {card.image && (
                      <img
                        src={card.image}
                        alt=""
                        className="w-full h-16 rounded object-cover mb-2"
                      />
                    )}
                    <div className="text-xs font-medium text-foreground truncate">
                      {card.title || card.domain || card.url}
                    </div>
                  </button>
                ))}

                {/* Empty state */}
                {!hasContent && (
                  <div className="text-xs text-muted-foreground text-center py-4">
                    No events
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
