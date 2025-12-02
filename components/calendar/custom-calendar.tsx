"use client";

import { useState, useMemo, useEffect } from "react";
import { addDays, startOfWeek, startOfMonth, endOfMonth, isSameMonth, format, isSameDay, isToday } from "date-fns";
import { CardModel } from "@/lib/types";
import { CalendarEvent, EVENT_COLORS } from "@/lib/types/calendar";
import { isDailyNote, extractDateFromTitle, getDateString } from "@/lib/utils/daily-notes";
import { useEventStore } from "@/lib/hooks/use-event-store";
import { useCalendarStore } from "@/lib/hooks/use-calendar-store";
import { getHolidaysInRange, ResolvedHoliday } from "@/lib/data/us-holidays";
import { ChevronLeft, ChevronRight, Plus, FileText, Clock, Flag } from "lucide-react";
import { useIsMobile } from "@/lib/hooks/use-is-mobile";

// Helper to format time in 12-hour format
function formatTime12h(time24: string): string {
  const [hours, minutes] = time24.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const hours12 = hours % 12 || 12;
  return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
}

type CustomCalendarProps = {
  cards: CardModel[];
  currentMonth?: Date;
  onDayClick?: (date: Date) => void;
  onCardClick?: (card: CardModel) => void;
  onEventClick?: (event: CalendarEvent) => void;
  onCreateDailyNote?: (date: Date) => void;
};

export function CustomCalendar({
  cards,
  currentMonth = new Date(),
  onDayClick,
  onCardClick,
  onEventClick,
  onCreateDailyNote
}: CustomCalendarProps) {
  const [isClient, setIsClient] = useState(false);
  const { events, isInitialized, initialize, generateRecurrenceInstances } = useEventStore();

  // Holiday settings
  const showHolidays = useCalendarStore((state) => state.showHolidays);
  const holidayFilter = useCalendarStore((state) => state.holidayFilter);

  // Mobile detection - use agenda view on mobile
  const isMobile = useIsMobile();

  // Mark as client-side after mount to prevent hydration issues
  // This ensures the calendar uses the OS date/time consistently
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Initialize event store
  useEffect(() => {
    if (!isInitialized) {
      initialize();
    }
  }, [isInitialized, initialize]);

  // Get all days to display (including days from prev/next month to fill the grid)
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const startDate = startOfWeek(monthStart);

    // Create exactly 42 days (6 weeks)
    const days = [];
    for (let i = 0; i < 42; i++) {
      days.push(addDays(startDate, i));
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

    // Get date range for the visible calendar (first and last day)
    if (calendarDays.length === 0) return map;

    const rangeStart = format(calendarDays[0], 'yyyy-MM-dd');
    const rangeEnd = format(calendarDays[calendarDays.length - 1], 'yyyy-MM-dd');

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

    return map;
  }, [events, calendarDays, generateRecurrenceInstances]);

  // Group holidays by date
  const holidaysByDate = useMemo(() => {
    const map = new Map<string, ResolvedHoliday>();

    if (!showHolidays || calendarDays.length === 0) return map;

    const rangeStart = format(calendarDays[0], 'yyyy-MM-dd');
    const rangeEnd = format(calendarDays[calendarDays.length - 1], 'yyyy-MM-dd');

    const holidays = getHolidaysInRange(rangeStart, rangeEnd, holidayFilter);

    holidays.forEach((holiday) => {
      map.set(holiday.date, holiday);
    });

    return map;
  }, [showHolidays, holidayFilter, calendarDays]);

  // Mobile Agenda View - list format for better readability on small screens
  if (isMobile) {
    // Get only days with content in the current month
    const daysWithContent = calendarDays
      .filter((day) => isSameMonth(day, currentMonth))
      .filter((day) => {
        const dateStr = format(day, 'yyyy-MM-dd');
        const dayCards = cardsByDate.get(dateStr) || [];
        const dayEvents = eventsByDate.get(dateStr) || [];
        const dailyNote = dailyNotesByDate.get(dateStr);
        const holiday = holidaysByDate.get(dateStr);
        return dayCards.length > 0 || dayEvents.length > 0 || dailyNote || holiday;
      });

    return (
      <div className="space-y-2">
        {daysWithContent.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            No events this month
          </div>
        ) : (
          daysWithContent.map((day) => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const dayCards = cardsByDate.get(dateStr) || [];
            const dayEvents = eventsByDate.get(dateStr) || [];
            const dailyNote = dailyNotesByDate.get(dateStr);
            const holiday = holidaysByDate.get(dateStr);
            const isCurrentDay = isClient ? isSameDay(day, new Date()) : false;

            return (
              <div
                key={dateStr}
                className={`rounded-xl border p-3 ${
                  isCurrentDay
                    ? 'border-accent bg-accent/5'
                    : 'border-subtle bg-surface'
                }`}
              >
                {/* Date header */}
                <button
                  onClick={() => onDayClick?.(day)}
                  className="w-full text-left mb-2 pb-2 border-b border-subtle/50"
                >
                  <span className={`text-sm font-semibold ${isCurrentDay ? 'text-accent' : 'text-foreground'}`}>
                    {format(day, 'EEEE, MMM d')}
                    {isCurrentDay && <span className="ml-2 text-xs text-accent">(Today)</span>}
                  </span>
                </button>

                {/* Items */}
                <div className="space-y-2">
                  {/* Daily Note */}
                  {dailyNote && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onCardClick?.(dailyNote);
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg bg-purple-500/20 border border-purple-400/30 hover:bg-purple-500/30 transition-colors flex items-center gap-2"
                    >
                      <FileText size={14} className="text-purple-300 flex-shrink-0" />
                      <span className="text-sm text-purple-200">Daily Note</span>
                    </button>
                  )}

                  {/* Holiday */}
                  {holiday && (
                    <div className="px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-400/30 flex items-center gap-2">
                      <Flag size={14} className="text-amber-400 flex-shrink-0" />
                      <span className="text-sm text-amber-300">{holiday.name}</span>
                    </div>
                  )}

                  {/* Events */}
                  {dayEvents.map((event) => (
                    <button
                      key={event.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onEventClick?.(event);
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg bg-surface-soft hover:bg-surface transition-colors flex items-center gap-2"
                    >
                      <span
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: event.color || EVENT_COLORS.purple }}
                      />
                      <div className="flex-1 min-w-0">
                        <span className="text-sm text-foreground">{event.title}</span>
                        {!event.isAllDay && event.startTime && (
                          <span className="ml-2 text-xs text-muted-foreground">
                            {formatTime12h(event.startTime)}
                          </span>
                        )}
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
                      className="w-full text-left px-3 py-2 rounded-lg bg-surface-soft hover:bg-surface transition-colors flex items-center gap-2"
                    >
                      {card.image && (
                        <img
                          src={card.image}
                          alt=""
                          className="w-6 h-6 rounded object-cover flex-shrink-0"
                        />
                      )}
                      <span className="text-sm text-foreground truncate">
                        {card.title || card.domain || card.url}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>
    );
  }

  // Desktop Grid View
  return (
    <div className="space-y-6">
      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-3">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <div key={day} className="text-center text-sm font-semibold text-muted-foreground py-2">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-3">
        {calendarDays.map((day, index) => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const dayCards = cardsByDate.get(dateStr) || [];
          const dayEvents = eventsByDate.get(dateStr) || [];
          const dailyNote = dailyNotesByDate.get(dateStr);
          const holiday = holidaysByDate.get(dateStr);
          const isCurrentMonth = isSameMonth(day, currentMonth);
          // Only check if it's today on the client to prevent hydration mismatch
          const isCurrentDay = isClient ? isSameDay(day, new Date()) : false;

          // Combined count for "more" indicator (holidays don't count toward limit)
          const totalItems = dayCards.length + dayEvents.length;
          const maxVisible = 2;

          return (
            <div
              key={index}
              className={`card-hover relative min-h-[180px] rounded-2xl border transition-all cursor-pointer ${
                isCurrentDay
                  ? 'border-accent bg-accent/5'
                  : isCurrentMonth
                  ? 'border-subtle bg-surface'
                  : 'border-subtle/40 bg-surface-muted/50'
              }`}
              onClick={() => onDayClick?.(day)}
            >
              {/* Date number */}
              <div className="p-3">
                <span
                  className={`text-sm font-semibold ${
                    isCurrentDay
                      ? 'text-accent'
                      : isCurrentMonth
                      ? 'text-foreground'
                      : 'text-muted-foreground'
                  }`}
                >
                  {format(day, 'd')}
                </span>
              </div>

              {/* Events and Cards */}
              <div className="px-2 space-y-1 mb-12">
                {/* Calendar Events (shown first) */}
                {dayEvents.slice(0, maxVisible).map((event) => (
                  <button
                    key={event.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onEventClick?.(event);
                    }}
                    className="w-full text-left px-2 py-1 rounded-lg bg-surface-soft hover:bg-surface transition-colors flex items-center gap-2"
                  >
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: event.color || EVENT_COLORS.purple }}
                    />
                    <span className="text-xs text-foreground truncate flex-1">
                      {!event.isAllDay && event.startTime && (
                        <span className="text-muted-foreground mr-1">
                          {formatTime12h(event.startTime)}
                        </span>
                      )}
                      {event.title}
                    </span>
                  </button>
                ))}

                {/* Scheduled cards (shown after events) */}
                {dayCards.slice(0, Math.max(0, maxVisible - dayEvents.length)).map((card) => (
                  <button
                    key={card.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onCardClick?.(card);
                    }}
                    className="w-full text-left px-2 py-1 rounded-lg bg-surface-soft hover:bg-surface transition-colors flex items-center gap-2"
                  >
                    {card.image && (
                      <img
                        src={card.image}
                        alt=""
                        className="w-4 h-4 rounded object-cover flex-shrink-0"
                      />
                    )}
                    <span className="text-xs text-foreground truncate">
                      {card.title || card.domain || card.url}
                    </span>
                  </button>
                ))}

                {/* More indicator */}
                {totalItems > maxVisible && (
                  <div className="text-xs text-muted-foreground px-2">
                    +{totalItems - maxVisible} more
                  </div>
                )}

                {/* Holiday (shown below events) */}
                {holiday && (
                  <div className="px-2 py-1 flex items-center gap-1.5">
                    <Flag size={10} className="text-amber-400 flex-shrink-0" />
                    <span className="text-xs text-amber-400 truncate">
                      {holiday.name}
                    </span>
                  </div>
                )}
              </div>

              {/* Daily Note pill - anchored to bottom */}
              {dailyNote && (
                <div className="absolute bottom-2 left-2 right-2 flex justify-center">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onCardClick?.(dailyNote);
                    }}
                    className="px-3 py-1.5 rounded-full bg-purple-500/20 backdrop-blur-md border border-purple-400/30 text-xs text-purple-200 hover:bg-purple-500/30 transition-colors flex items-center gap-1.5"
                  >
                    <FileText size={12} />
                    <span className="font-medium">Daily Note</span>
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
