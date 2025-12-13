"use client";

import { useState, useMemo, useEffect } from "react";
import { addDays, startOfWeek, startOfMonth, endOfMonth, isSameMonth, format, isSameDay, isToday } from "date-fns";
import { CardModel } from "@/lib/types";
import { CalendarEvent, EVENT_COLORS } from "@/lib/types/calendar";
import { isDailyNote, extractDateFromTitle, getDateString } from "@/lib/utils/daily-notes";
import { getCardDisplayTitle, getFaviconUrl } from "@/lib/utils/card-display";
import { useEventStore } from "@/lib/hooks/use-event-store";
import { useCalendarStore } from "@/lib/hooks/use-calendar-store";
import { useTodoStore } from "@/lib/hooks/use-todos";
import { getHolidaysInRange, ResolvedHoliday } from "@/lib/data/us-holidays";
import { ChevronLeft, ChevronRight, Plus, FileText, Clock, Flag, CheckSquare } from "lucide-react";
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

  // Get todos from store
  const { todos, fetchTodos } = useTodoStore();

  // Holiday settings
  const showHolidays = useCalendarStore((state) => state.showHolidays);
  const holidayFilter = useCalendarStore((state) => state.holidayFilter);
  const enabledCountries = useCalendarStore((state) => state.enabledCountries);

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

  // Fetch todos
  useEffect(() => {
    fetchTodos();
  }, [fetchTodos]);

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

    // Add todos with due dates
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

    return map;
  }, [events, calendarDays, generateRecurrenceInstances, todos]);

  // Group holidays by date
  const holidaysByDate = useMemo(() => {
    const map = new Map<string, ResolvedHoliday>();

    if (!showHolidays || enabledCountries.length === 0 || calendarDays.length === 0) return map;

    const rangeStart = format(calendarDays[0], 'yyyy-MM-dd');
    const rangeEnd = format(calendarDays[calendarDays.length - 1], 'yyyy-MM-dd');

    const holidays = getHolidaysInRange(rangeStart, rangeEnd, holidayFilter);

    holidays.forEach((holiday) => {
      map.set(holiday.date, holiday);
    });

    return map;
  }, [showHolidays, holidayFilter, enabledCountries, calendarDays]);

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
          <div className="text-center py-8" style={{ color: 'var(--text-muted)' }}>
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
                className="rounded-xl p-3"
                style={{
                  /* ===== TODAY STYLING - OPTION 2: Purple pill on day number ===== */
                  background: 'var(--bg-surface-2)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                {/* Date header */}
                <button
                  onClick={() => onDayClick?.(day)}
                  className="w-full text-left mb-2 pb-2 flex items-center gap-2"
                  style={{ borderBottom: '1px solid var(--border-subtle)' }}
                >
                  <span
                    className="text-sm font-semibold"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {format(day, 'EEEE, MMM')}
                  </span>
                  <span
                    className={`text-sm font-semibold ${isCurrentDay ? 'inline-flex items-center justify-center' : ''}`}
                    style={isCurrentDay ? {
                      background: 'var(--ds-accent)',
                      color: 'white',
                      borderRadius: '9999px',
                      minWidth: '24px',
                      height: '24px',
                      padding: '0 6px',
                    } : {
                      color: 'var(--text-primary)',
                    }}
                  >
                    {format(day, 'd')}
                  </span>
                  {isCurrentDay && <span className="text-xs" style={{ color: 'var(--ds-accent)' }}>(Today)</span>}
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
                      className="w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center gap-2"
                      style={{
                        background: 'var(--ds-accent-subtle)',
                        border: '1px solid var(--ds-accent-muted)',
                      }}
                    >
                      <FileText size={14} className="flex-shrink-0" style={{ color: 'var(--ds-accent)' }} />
                      <span className="text-sm" style={{ color: 'var(--ds-accent)' }}>Daily Note</span>
                    </button>
                  )}

                  {/* Holiday */}
                  {holiday && (
                    <div
                      className="px-3 py-2 rounded-lg flex items-center gap-2"
                      style={{
                        background: 'var(--ds-accent-subtle)',
                        border: '1px solid var(--ds-accent-muted)',
                      }}
                    >
                      <Flag size={14} className="flex-shrink-0" style={{ color: 'var(--ds-accent)' }} />
                      <span className="text-sm" style={{ color: 'var(--ds-accent)' }}>{holiday.name}</span>
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
                      className="w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center gap-2"
                      style={{ background: 'var(--bg-surface-3)' }}
                    >
                      <span
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: event.color || EVENT_COLORS.purple }}
                      />
                      <div className="flex-1 min-w-0">
                        <span className="text-sm" style={{ color: 'var(--text-primary)' }}>{event.title}</span>
                        {!event.isAllDay && event.startTime && (
                          <span className="ml-2 text-xs" style={{ color: 'var(--text-muted)' }}>
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
                      className="w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center gap-2"
                      style={{ background: 'var(--bg-surface-3)' }}
                    >
                      {card.image && (
                        <img
                          src={card.image}
                          alt=""
                          className="w-6 h-6 rounded object-cover flex-shrink-0"
                        />
                      )}
                      <span className="text-sm truncate" style={{ color: 'var(--text-primary)' }}>
                        {getCardDisplayTitle(card)}
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
    <div className="space-y-4">
      {/* Weekday headers */}
      <div
        className="grid grid-cols-7 rounded-xl"
        style={{
          gap: 'var(--space-3)',
        }}
      >
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <div
            key={day}
            className="text-center text-sm font-semibold py-2"
            style={{ color: 'var(--text-muted)' }}
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div
        className="grid grid-cols-7"
        style={{ gap: 'var(--space-3)' }}
      >
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
              className="relative min-h-[180px] rounded-xl transition-all cursor-pointer"
              style={{
                /* ===== TODAY STYLING - OPTION 2: Purple pill on day number ===== */
                background: isCurrentMonth
                  ? 'var(--bg-surface-3)'
                  : 'var(--bg-surface-2)',
                boxShadow: isCurrentMonth ? 'var(--raised-shadow-sm)' : 'var(--shadow-1)',
                borderWidth: '1px',
                borderStyle: 'solid',
                borderColor: isCurrentMonth
                  ? 'var(--border-default)'
                  : 'var(--border-subtle)',
                borderTopColor: isCurrentMonth
                  ? 'var(--raised-border-top)'
                  : 'var(--border-subtle)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = 'var(--raised-shadow)';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = isCurrentMonth ? 'var(--raised-shadow-sm)' : 'var(--shadow-1)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
              onClick={() => onDayClick?.(day)}
            >
              {/* Date number - with purple pill for today */}
              <div className="p-3">
                <span
                  className={`text-sm ${isCurrentMonth ? 'font-semibold' : 'font-medium'} ${isCurrentDay ? 'inline-flex items-center justify-center' : ''}`}
                  style={isCurrentDay ? {
                    background: 'var(--ds-accent)',
                    color: 'white',
                    borderRadius: '9999px',
                    minWidth: '28px',
                    height: '28px',
                    padding: '0 8px',
                  } : {
                    color: isCurrentMonth
                      ? 'var(--text-primary)'
                      : 'var(--text-secondary)',
                  }}
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
                    className="w-full text-left px-2 py-1 rounded-lg transition-all flex items-center gap-2"
                    style={{
                      background: 'var(--bg-surface-2)',
                      border: '1px solid var(--border-subtle)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'var(--bg-surface-1)';
                      e.currentTarget.style.borderColor = 'var(--border-default)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'var(--bg-surface-2)';
                      e.currentTarget.style.borderColor = 'var(--border-subtle)';
                    }}
                  >
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: event.color || EVENT_COLORS.purple }}
                    />
                    <span className="text-xs truncate flex-1" style={{ color: 'var(--text-primary)' }}>
                      {!event.isAllDay && event.startTime && (
                        <span style={{ color: 'var(--text-muted)', marginRight: '4px' }}>
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
                    className="w-full text-left px-2 py-1 rounded-lg transition-all flex items-center gap-2"
                    style={{
                      background: 'var(--bg-surface-2)',
                      border: '1px solid var(--border-subtle)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'var(--bg-surface-1)';
                      e.currentTarget.style.borderColor = 'var(--border-default)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'var(--bg-surface-2)';
                      e.currentTarget.style.borderColor = 'var(--border-subtle)';
                    }}
                  >
                    {card.image && (
                      <img
                        src={card.image}
                        alt=""
                        className="w-4 h-4 rounded object-cover flex-shrink-0"
                      />
                    )}
                    <span className="text-xs truncate" style={{ color: 'var(--text-primary)' }}>
                      {getCardDisplayTitle(card)}
                    </span>
                  </button>
                ))}

                {/* More indicator */}
                {totalItems > maxVisible && (
                  <div className="text-xs px-2" style={{ color: 'var(--text-muted)' }}>
                    +{totalItems - maxVisible} more
                  </div>
                )}

                {/* Holiday (shown below events) */}
                {holiday && (
                  <div className="px-2 py-1 flex items-center gap-1.5">
                    <Flag size={10} className="flex-shrink-0" style={{ color: 'var(--ds-accent)' }} />
                    <span className="text-xs truncate" style={{ color: 'var(--ds-accent)' }}>
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
                    className="px-3 py-1.5 rounded-full text-xs transition-all flex items-center gap-1.5"
                    style={{
                      background: 'linear-gradient(to bottom, var(--bg-surface-3) 0%, var(--bg-surface-2) 100%)',
                      boxShadow: 'var(--raised-shadow-sm)',
                      borderWidth: '1px',
                      borderStyle: 'solid',
                      borderColor: 'var(--border-subtle)',
                      borderTopColor: 'var(--raised-border-top)',
                      color: 'var(--ds-accent)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.boxShadow = 'var(--raised-shadow)';
                      e.currentTarget.style.transform = 'translateY(-1px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.boxShadow = 'var(--raised-shadow-sm)';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
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
