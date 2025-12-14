"use client";

import { useMemo, useEffect, useState, useRef } from "react";
import { addDays, format, isToday, isTomorrow, startOfDay, parseISO } from "date-fns";
import { CardModel } from "@/lib/types";
import { CalendarEvent, EVENT_COLORS } from "@/lib/types/calendar";
import { isDailyNote, extractDateFromTitle, getDateString } from "@/lib/utils/daily-notes";
import { getCardDisplayTitle, getFaviconUrl } from "@/lib/utils/card-display";
import { useEventStore } from "@/lib/hooks/use-event-store";
import { useCalendarStore } from "@/lib/hooks/use-calendar-store";
import { useTodoStore } from "@/lib/hooks/use-todos";
import { useDataStore } from "@/lib/stores/data-store";
import { getHolidaysInRange, ResolvedHoliday } from "@/lib/data/us-holidays";
import {
  useFloating,
  offset,
  flip,
  shift,
  autoUpdate,
  FloatingPortal,
  size,
} from "@floating-ui/react";
import { EventDetailsPopover } from "./event-details-popover";
import { CheckSquare, FileText, Flag, Calendar, ChevronDown } from "lucide-react";

type AgendaRange = 7 | 30 | 90;

type AgendaViewProps = {
  cards: CardModel[];
  currentMonth: Date;
  onDayClick?: (date: Date) => void;
  onCardClick?: (card: CardModel) => void;
  onEventClick?: (event: CalendarEvent) => void;
};

// Group items by date for display
type AgendaDay = {
  date: Date;
  dateStr: string;
  events: CalendarEvent[];
  holiday?: ResolvedHoliday;
};

export function AgendaView({
  cards,
  currentMonth,
  onDayClick,
  onCardClick,
  onEventClick,
}: AgendaViewProps) {
  const [isClient, setIsClient] = useState(false);
  const [range, setRange] = useState<AgendaRange>(30);
  const [rangeDropdownOpen, setRangeDropdownOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const { events, isInitialized, initialize, generateRecurrenceInstances, deleteEvent } =
    useEventStore();

  // Get todos from store
  const { todos, fetchTodos } = useTodoStore();

  // Holiday settings
  const showHolidays = useCalendarStore((state) => state.showHolidays);
  const holidayFilter = useCalendarStore((state) => state.holidayFilter);
  const enabledCountries = useCalendarStore((state) => state.enabledCountries);

  // Visibility filter settings
  const showUrlCards = useCalendarStore((state) => state.showUrlCards);
  const showTodos = useCalendarStore((state) => state.showTodos);
  const showManualEvents = useCalendarStore((state) => state.showManualEvents);
  const showDailyNotes = useCalendarStore((state) => state.showDailyNotes);

  // Event details popover state
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  // Floating UI for event details popover
  const {
    refs: detailsRefs,
    floatingStyles: detailsStyles,
  } = useFloating({
    open: isDetailsOpen,
    onOpenChange: setIsDetailsOpen,
    placement: "right-start",
    middleware: [
      offset(8),
      flip({
        fallbackPlacements: ["left-start", "bottom-start", "top-start"],
        boundary: containerRef.current || undefined,
      }),
      shift({
        padding: 16,
        crossAxis: true,
        boundary: containerRef.current || undefined,
      }),
      size({
        padding: 16,
        boundary: containerRef.current || undefined,
        apply({ availableWidth, availableHeight, elements }) {
          Object.assign(elements.floating.style, {
            maxWidth: `${Math.min(availableWidth, 400)}px`,
            maxHeight: `${Math.min(availableHeight, 500)}px`,
          });
        },
      }),
    ],
    whileElementsMounted: autoUpdate,
  });

  // Mark as client-side after mount
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

  // Generate date range starting from today
  const dateRange = useMemo(() => {
    const today = startOfDay(new Date());
    const dates: Date[] = [];
    for (let i = 0; i < range; i++) {
      dates.push(addDays(today, i));
    }
    return dates;
  }, [range]);

  // Group cards by date
  const cardsByDate = useMemo(() => {
    const map = new Map<string, CardModel[]>();

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

  // Build agenda days with events
  const agendaDays = useMemo(() => {
    const days: AgendaDay[] = [];

    if (dateRange.length === 0) return days;

    const rangeStart = format(dateRange[0], "yyyy-MM-dd");
    const rangeEnd = format(dateRange[dateRange.length - 1], "yyyy-MM-dd");

    // Get holidays in range
    const holidayMap = new Map<string, ResolvedHoliday>();
    if (showHolidays && enabledCountries.length > 0) {
      const holidays = getHolidaysInRange(rangeStart, rangeEnd, holidayFilter);
      holidays.forEach((holiday) => {
        holidayMap.set(holiday.date, holiday);
      });
    }

    // Build events map
    const eventsMap = new Map<string, CalendarEvent[]>();

    // Add manual events
    if (showManualEvents) {
      events.forEach((event) => {
        const instances = generateRecurrenceInstances(event, rangeStart, rangeEnd);
        instances.forEach((instance) => {
          const dateStr = instance.instanceDate;
          if (!eventsMap.has(dateStr)) {
            eventsMap.set(dateStr, []);
          }
          eventsMap.get(dateStr)!.push(instance.event);
        });
      });
    }

    // Add scheduled cards
    if (showUrlCards) {
      cardsByDate.forEach((dayCards, dateStr) => {
        if (dateStr < rangeStart || dateStr > rangeEnd) return;

        if (!eventsMap.has(dateStr)) {
          eventsMap.set(dateStr, []);
        }

        dayCards.forEach((card) => {
          const hasTime = card.scheduledStartTime != null;
          const pseudoEvent: CalendarEvent = {
            id: `card-${card.id}`,
            userId: "",
            title: getCardDisplayTitle(card),
            date: dateStr,
            isAllDay: !hasTime,
            startTime: card.scheduledStartTime ?? undefined,
            endTime: card.scheduledEndTime ?? undefined,
            color: "#6b7280",
            source: {
              type: "card",
              cardId: card.id,
            },
            url: card.url,
            createdAt: card.createdAt || new Date().toISOString(),
            updatedAt: card.updatedAt || new Date().toISOString(),
          };
          eventsMap.get(dateStr)!.push(pseudoEvent);
        });
      });
    }

    // Add daily notes
    if (showDailyNotes) {
      dailyNotesByDate.forEach((note, dateStr) => {
        if (dateStr < rangeStart || dateStr > rangeEnd) return;

        if (!eventsMap.has(dateStr)) {
          eventsMap.set(dateStr, []);
        }

        const pseudoEvent: CalendarEvent = {
          id: `note-${note.id}`,
          userId: "",
          title: "Daily Note",
          date: dateStr,
          isAllDay: true,
          color: "var(--ds-accent)",
          source: {
            type: "card",
            cardId: note.id,
          },
          createdAt: note.createdAt || new Date().toISOString(),
          updatedAt: note.updatedAt || new Date().toISOString(),
        };
        eventsMap.get(dateStr)!.push(pseudoEvent);
      });
    }

    // Add todos
    if (showTodos) {
      todos
        .filter((todo) => todo.dueDate && !todo.completed)
        .forEach((todo) => {
          const dateStr = format(todo.dueDate!, "yyyy-MM-dd");
          if (dateStr < rangeStart || dateStr > rangeEnd) return;

          if (!eventsMap.has(dateStr)) {
            eventsMap.set(dateStr, []);
          }

          const pseudoEvent: CalendarEvent = {
            id: `todo-${todo.id}`,
            userId: todo.userId,
            title: todo.text,
            date: dateStr,
            isAllDay: true,
            color: "#f59e0b",
            source: {
              type: "todo" as const,
              todoId: todo.id,
            },
            createdAt: todo.createdAt.toISOString(),
            updatedAt: todo.updatedAt.toISOString(),
          };
          eventsMap.get(dateStr)!.push(pseudoEvent);
        });
    }

    // Build agenda days
    dateRange.forEach((date) => {
      const dateStr = format(date, "yyyy-MM-dd");
      const dayEvents = eventsMap.get(dateStr) || [];

      // Sort events: all-day first, then by time
      dayEvents.sort((a, b) => {
        if (a.isAllDay && !b.isAllDay) return -1;
        if (!a.isAllDay && b.isAllDay) return 1;
        if (a.startTime && b.startTime) {
          return a.startTime.localeCompare(b.startTime);
        }
        return 0;
      });

      days.push({
        date,
        dateStr,
        events: dayEvents,
        holiday: holidayMap.get(dateStr),
      });
    });

    return days;
  }, [
    dateRange,
    events,
    generateRecurrenceInstances,
    cardsByDate,
    dailyNotesByDate,
    todos,
    showHolidays,
    holidayFilter,
    enabledCountries,
    showUrlCards,
    showTodos,
    showManualEvents,
    showDailyNotes,
  ]);

  // Format date header
  const formatDateHeader = (date: Date): { label: string; subLabel: string } => {
    if (isToday(date)) {
      return { label: "TODAY", subLabel: format(date, "EEEE, MMMM d") };
    }
    if (isTomorrow(date)) {
      return { label: "TOMORROW", subLabel: format(date, "EEEE, MMMM d") };
    }
    return { label: format(date, "EEEE").toUpperCase(), subLabel: format(date, "MMMM d") };
  };

  // Format time for display
  const formatTime = (time: string): string => {
    const [hours, minutes] = time.split(":").map(Number);
    const period = hours >= 12 ? "PM" : "AM";
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, "0")} ${period}`;
  };

  // Handle event click
  const handleEventClick = (event: CalendarEvent, element: HTMLElement) => {
    detailsRefs.setReference(element);
    setSelectedEvent(event);
    setIsDetailsOpen(true);
  };

  // Handle delete
  const handleDeleteEvent = async (event: CalendarEvent) => {
    if (!event.source || event.source.type === "manual") {
      setIsDetailsOpen(false);
      setSelectedEvent(null);
      await deleteEvent(event.id);
    }
  };

  // Close popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const isInsideDetails = detailsRefs.floating.current?.contains(target);

      if (!isInsideDetails && isDetailsOpen) {
        if (!target.closest("[data-agenda-item]")) {
          setIsDetailsOpen(false);
          setSelectedEvent(null);
        }
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isDetailsOpen]);

  if (!isClient) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-pulse text-sm" style={{ color: "var(--text-muted)" }}>
          Loading agenda...
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="flex flex-col h-full overflow-hidden rounded-xl"
      style={{
        background: "var(--bg-surface-2)",
        border: "1px solid var(--border-subtle)",
      }}
    >
      {/* Header with range selector */}
      <div
        className="flex-shrink-0 flex items-center justify-between px-4 py-3"
        style={{
          borderBottom: "1px solid var(--border-subtle)",
          background: "var(--bg-surface-3)",
        }}
      >
        <div className="flex items-center gap-2">
          <Calendar size={18} style={{ color: "var(--text-muted)" }} />
          <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
            Upcoming
          </span>
        </div>

        {/* Range selector dropdown */}
        <div className="relative">
          <button
            onClick={() => setRangeDropdownOpen(!rangeDropdownOpen)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors hover:bg-white/10"
            style={{ color: "var(--text-secondary)" }}
          >
            Next {range} days
            <ChevronDown size={14} />
          </button>

          {rangeDropdownOpen && (
            <div
              className="absolute right-0 top-full mt-1 rounded-lg overflow-hidden z-50"
              style={{
                background: "var(--bg-surface-3)",
                border: "1px solid var(--border-subtle)",
                boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
              }}
            >
              {[7, 30, 90].map((days) => (
                <button
                  key={days}
                  onClick={() => {
                    setRange(days as AgendaRange);
                    setRangeDropdownOpen(false);
                  }}
                  className={`w-full px-4 py-2 text-sm text-left transition-colors ${
                    range === days ? "bg-accent/20" : "hover:bg-white/10"
                  }`}
                  style={{ color: range === days ? "var(--ds-accent)" : "var(--text-secondary)" }}
                >
                  Next {days} days
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Scrollable agenda list */}
      <div className="flex-1 overflow-y-auto scrollbar-hide">
        {agendaDays.map((day, index) => {
          const { label, subLabel } = formatDateHeader(day.date);
          const hasItems = day.events.length > 0 || day.holiday;
          const isTodayDate = isToday(day.date);

          return (
            <div key={day.dateStr}>
              {/* Sticky date header */}
              <div
                className="sticky top-0 z-10 px-4 py-2 cursor-pointer transition-colors hover:bg-white/5"
                style={{
                  background: "var(--bg-surface-2)",
                  borderBottom: "1px solid var(--border-subtle)",
                }}
                onClick={() => onDayClick?.(day.date)}
              >
                <div className="flex items-center gap-2">
                  {isTodayDate && (
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ background: "var(--ds-accent)" }}
                    />
                  )}
                  <span
                    className="text-xs font-bold tracking-wide"
                    style={{ color: isTodayDate ? "var(--ds-accent)" : "var(--text-muted)" }}
                  >
                    {label}
                  </span>
                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                    · {subLabel}
                  </span>
                </div>
              </div>

              {/* Day content */}
              <div
                className="px-4 py-2"
                style={{
                  borderBottom: index < agendaDays.length - 1 ? "1px solid var(--border-subtle)" : "none",
                }}
              >
                {/* Holiday */}
                {day.holiday && (
                  <div
                    className="flex items-center gap-3 py-2 px-3 rounded-lg mb-2"
                    style={{ background: "rgba(245, 158, 11, 0.1)" }}
                  >
                    <Flag size={14} style={{ color: "rgb(245, 158, 11)" }} />
                    <span className="text-sm" style={{ color: "rgb(245, 158, 11)" }}>
                      {day.holiday.name}
                    </span>
                  </div>
                )}

                {/* Events */}
                {day.events.map((event) => {
                  const isTodo = event.source?.type === "todo";
                  const isCard = event.source?.type === "card" && event.url;
                  const isNote = event.source?.type === "card" && event.title === "Daily Note";

                  return (
                    <button
                      key={event.id}
                      data-agenda-item
                      className="w-full flex items-center gap-3 py-2 px-3 rounded-lg mb-1 text-left transition-colors hover:bg-white/5"
                      onClick={(e) => handleEventClick(event, e.currentTarget)}
                    >
                      {/* Time column */}
                      <div
                        className="w-16 flex-shrink-0 text-xs font-medium"
                        style={{ color: "var(--text-muted)" }}
                      >
                        {event.isAllDay ? "All day" : formatTime(event.startTime!)}
                      </div>

                      {/* Color indicator */}
                      <div
                        className="w-1.5 h-4 rounded-full flex-shrink-0"
                        style={{ background: event.color || EVENT_COLORS.purple }}
                      />

                      {/* Icon based on type */}
                      <div className="flex-shrink-0">
                        {isTodo && (
                          <CheckSquare size={14} style={{ color: "var(--text-muted)" }} />
                        )}
                        {isCard && event.url && (
                          <img
                            src={getFaviconUrl(event.url, 16)}
                            alt=""
                            className="w-4 h-4 rounded-sm"
                            onError={(e) => {
                              e.currentTarget.style.display = "none";
                            }}
                          />
                        )}
                        {isNote && (
                          <FileText size={14} style={{ color: "var(--ds-accent)" }} />
                        )}
                        {!isTodo && !isCard && !isNote && (
                          <div
                            className="w-2 h-2 rounded-full"
                            style={{ background: event.color || EVENT_COLORS.purple }}
                          />
                        )}
                      </div>

                      {/* Title */}
                      <span
                        className="flex-1 text-sm truncate"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {event.title}
                      </span>

                      {/* End time if not all-day */}
                      {!event.isAllDay && event.endTime && (
                        <span
                          className="text-xs flex-shrink-0"
                          style={{ color: "var(--text-muted)" }}
                        >
                          → {formatTime(event.endTime)}
                        </span>
                      )}
                    </button>
                  );
                })}

                {/* Empty state */}
                {!hasItems && (
                  <div
                    className="py-2 px-3 text-sm italic"
                    style={{ color: "var(--text-muted)" }}
                  >
                    No items
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Event details popover */}
      <FloatingPortal>
        {isDetailsOpen && selectedEvent && (
          <div
            ref={detailsRefs.setFloating}
            style={detailsStyles}
            className="z-50"
          >
            <EventDetailsPopover
              event={selectedEvent}
              onClose={() => {
                setIsDetailsOpen(false);
                setSelectedEvent(null);
              }}
              onDelete={
                !selectedEvent.source || selectedEvent.source.type === "manual"
                  ? handleDeleteEvent
                  : undefined
              }
            />
          </div>
        )}
      </FloatingPortal>
    </div>
  );
}
