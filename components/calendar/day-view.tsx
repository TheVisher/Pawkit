"use client";

import { useRef, useEffect, useMemo, useState } from "react";
import { format, isToday } from "date-fns";
import { CardModel } from "@/lib/types";
import { CalendarEvent } from "@/lib/types/calendar";
import { isDailyNote, extractDateFromTitle, getDateString } from "@/lib/utils/daily-notes";
import { getCardDisplayTitle } from "@/lib/utils/card-display";
import { useEventStore } from "@/lib/hooks/use-event-store";
import { useCalendarStore } from "@/lib/hooks/use-calendar-store";
import { getHolidaysInRange, ResolvedHoliday } from "@/lib/data/us-holidays";
import {
  HOUR_HEIGHT,
  TIME_LABEL_WIDTH,
  formatHourLabel,
  getScrollToCurrentTime,
  positionEvents,
} from "@/lib/utils/time-grid";
import { TimePositionedEvent } from "./week-view/time-positioned-event";
import { Flag, Clock } from "lucide-react";

type DayViewProps = {
  cards: CardModel[];
  currentDate: Date;
  onDayClick?: (date: Date) => void;
  onCardClick?: (card: CardModel) => void;
  onEventClick?: (event: CalendarEvent) => void;
  onCreateDailyNote?: (date: Date) => void;
};

export function DayView({
  cards,
  currentDate,
  onDayClick,
  onCardClick,
  onEventClick,
  onCreateDailyNote,
}: DayViewProps) {
  const [isClient, setIsClient] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const { events, isInitialized, initialize, generateRecurrenceInstances } = useEventStore();

  // Holiday settings
  const showHolidays = useCalendarStore((state) => state.showHolidays);
  const holidayFilter = useCalendarStore((state) => state.holidayFilter);
  const enabledCountries = useCalendarStore((state) => state.enabledCountries);

  const hourHeight = HOUR_HEIGHT;
  const totalGridHeight = 24 * hourHeight;
  const dateStr = format(currentDate, "yyyy-MM-dd");
  const isCurrentDay = isClient && isToday(currentDate);

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

  // Auto-scroll to current time on mount
  useEffect(() => {
    if (scrollContainerRef.current && isClient) {
      const viewHeight = scrollContainerRef.current.clientHeight;
      const scrollPosition = getScrollToCurrentTime(viewHeight, hourHeight);
      scrollContainerRef.current.scrollTo({
        top: scrollPosition,
        behavior: "smooth",
      });
    }
  }, [hourHeight, isClient]);

  // Get scheduled cards for this day
  const dayCards = useMemo(() => {
    return cards.filter(
      (card) =>
        card.scheduledDate &&
        card.scheduledDate.split("T")[0] === dateStr &&
        !card.collections?.includes("the-den")
    );
  }, [cards, dateStr]);

  // Get daily note for this day
  const dailyNote = useMemo(() => {
    return cards.find((card) => {
      if (!isDailyNote(card) || card.collections?.includes("the-den")) return false;
      const date = extractDateFromTitle(card.title!);
      if (!date) return false;
      return getDateString(date) === dateStr;
    });
  }, [cards, dateStr]);

  // Get events for this day
  const dayEvents = useMemo(() => {
    const results: CalendarEvent[] = [];

    events.forEach((event) => {
      const instances = generateRecurrenceInstances(event, dateStr, dateStr);
      instances.forEach((instance) => {
        if (instance.instanceDate === dateStr) {
          results.push(instance.event);
        }
      });
    });

    // Convert scheduled cards to all-day events
    dayCards.forEach((card) => {
      results.push({
        id: `card-${card.id}`,
        userId: "",
        title: getCardDisplayTitle(card),
        date: dateStr,
        isAllDay: true,
        color: "#6b7280",
        url: card.url, // Pass URL for favicon lookup
        source: { type: "card", cardId: card.id },
        createdAt: card.createdAt || new Date().toISOString(),
        updatedAt: card.updatedAt || new Date().toISOString(),
      });
    });

    // Add daily note as event
    if (dailyNote) {
      results.push({
        id: `note-${dailyNote.id}`,
        userId: "",
        title: "Daily Note",
        date: dateStr,
        isAllDay: true,
        color: "var(--ds-accent)",
        source: { type: "card", cardId: dailyNote.id },
        createdAt: dailyNote.createdAt || new Date().toISOString(),
        updatedAt: dailyNote.updatedAt || new Date().toISOString(),
      });
    }

    return results;
  }, [events, generateRecurrenceInstances, dateStr, dayCards, dailyNote]);

  // Get holiday for this day
  const holiday = useMemo(() => {
    if (!showHolidays || enabledCountries.length === 0) return null;
    const holidays = getHolidaysInRange(dateStr, dateStr, holidayFilter);
    return holidays.length > 0 ? holidays[0] : null;
  }, [showHolidays, holidayFilter, enabledCountries, dateStr]);

  // Separate all-day and timed events
  const allDayEvents = useMemo(
    () => dayEvents.filter((e) => e.isAllDay),
    [dayEvents]
  );

  const timedEvents = useMemo(
    () => dayEvents.filter((e) => !e.isAllDay && e.startTime),
    [dayEvents]
  );

  // Position timed events
  const positionedEvents = useMemo(
    () => positionEvents(timedEvents, hourHeight),
    [timedEvents, hourHeight]
  );

  // Current time indicator position
  const [currentTimeTop, setCurrentTimeTop] = useState(0);
  useEffect(() => {
    if (!isClient) return;

    const updateTime = () => {
      const now = new Date();
      const minutes = now.getHours() * 60 + now.getMinutes();
      setCurrentTimeTop((minutes / 60) * hourHeight);
    };

    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, [hourHeight, isClient]);

  // Handle event click
  const handleEventClick = (event: CalendarEvent) => {
    if (event.source?.cardId) {
      const card = cards.find((c) => c.id === event.source?.cardId);
      if (card) {
        onCardClick?.(card);
        return;
      }
    }
    onEventClick?.(event);
  };

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
    <div
      className="flex flex-col h-[calc(100vh-200px)] min-h-[500px] overflow-hidden rounded-xl"
      style={{
        background: "var(--bg-surface-2)",
        border: "1px solid var(--border-subtle)",
      }}
    >
      {/* Day header */}
      <div
        className="flex-shrink-0 flex items-center justify-center py-4"
        style={{
          borderBottom: "1px solid var(--border-subtle)",
          background: isCurrentDay ? "var(--ds-accent-subtle)" : "var(--bg-surface-3)",
        }}
      >
        <div className="text-center">
          <div
            className="text-sm font-semibold uppercase tracking-wide"
            style={{ color: "var(--text-secondary)" }}
          >
            {format(currentDate, "EEEE")}
          </div>
          <div
            className={`text-3xl font-bold mt-1 ${
              isCurrentDay ? "inline-flex items-center justify-center w-12 h-12 rounded-full" : ""
            }`}
            style={
              isCurrentDay
                ? { background: "var(--ds-accent)", color: "white" }
                : { color: "var(--text-primary)" }
            }
          >
            {format(currentDate, "d")}
          </div>
        </div>
      </div>

      {/* All-day events section */}
      {(allDayEvents.length > 0 || holiday) && (
        <div
          className="flex-shrink-0 px-4 py-3 space-y-2"
          style={{
            borderBottom: "1px solid var(--border-subtle)",
            background: "var(--bg-surface-2)",
          }}
        >
          <div
            className="text-xs font-medium uppercase tracking-wide mb-2"
            style={{ color: "var(--text-muted)" }}
          >
            All Day
          </div>

          {/* Holiday */}
          {holiday && (
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-lg"
              style={{
                background: "rgba(245, 158, 11, 0.15)",
                border: "1px solid rgba(245, 158, 11, 0.3)",
              }}
            >
              <Flag size={14} style={{ color: "rgb(245, 158, 11)" }} />
              <span className="text-sm font-medium" style={{ color: "rgb(245, 158, 11)" }}>
                {holiday.name}
              </span>
            </div>
          )}

          {/* All-day events */}
          {allDayEvents.map((event) => (
            <button
              key={event.id}
              onClick={() => handleEventClick(event)}
              className="w-full text-left px-3 py-2 rounded-lg transition-opacity hover:opacity-80 flex items-center gap-2"
              style={{
                background: event.color || "var(--ds-accent)",
                color: "white",
              }}
            >
              <span className="text-sm font-medium truncate">{event.title}</span>
            </button>
          ))}
        </div>
      )}

      {/* Scrollable time grid */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-hide"
        style={{ scrollBehavior: "smooth" }}
      >
        <div
          className="relative flex"
          style={{ height: totalGridHeight, paddingTop: 8 }}
        >
          {/* Time labels column */}
          <div
            className="flex-shrink-0 relative"
            style={{ width: TIME_LABEL_WIDTH }}
          >
            {Array.from({ length: 24 }, (_, hour) => (
              <div
                key={hour}
                className="absolute right-0 flex items-start justify-end pr-3"
                style={{
                  top: hour * hourHeight,
                  height: hourHeight,
                }}
              >
                <span
                  className="text-[11px] font-medium"
                  style={{ color: "var(--text-muted)" }}
                >
                  {formatHourLabel(hour)}
                </span>
              </div>
            ))}
          </div>

          {/* Day column */}
          <div
            className="flex-1 relative"
            style={{ borderLeft: "1px solid var(--border-subtle)" }}
          >
            {/* Hour gridlines */}
            {Array.from({ length: 24 }, (_, hour) => (
              <div
                key={hour}
                className="absolute left-0 right-0 cursor-pointer hover:bg-white/5 transition-colors"
                style={{
                  top: hour * hourHeight,
                  height: hourHeight,
                  borderTop: hour > 0 ? "1px solid var(--border-subtle)" : "none",
                }}
                onClick={() => onDayClick?.(currentDate)}
              />
            ))}

            {/* Half-hour lines */}
            {Array.from({ length: 24 }, (_, hour) => (
              <div
                key={`half-${hour}`}
                className="absolute left-0 right-0 pointer-events-none"
                style={{
                  top: hour * hourHeight + hourHeight / 2,
                  borderTop: "1px dashed var(--border-subtle)",
                  opacity: 0.3,
                }}
              />
            ))}

            {/* Positioned timed events */}
            {positionedEvents.map((pe) => (
              <TimePositionedEvent
                key={pe.event.id}
                positionedEvent={pe}
                onClick={handleEventClick}
              />
            ))}

            {/* Current time indicator */}
            {isCurrentDay && (
              <div
                className="absolute left-0 right-0 z-20 pointer-events-none flex items-center"
                style={{ top: currentTimeTop }}
              >
                <div
                  className="w-3 h-3 rounded-full -ml-1.5"
                  style={{
                    background: "var(--ds-accent)",
                    boxShadow: "0 0 8px var(--ds-accent)",
                  }}
                />
                <div
                  className="flex-1 h-0.5"
                  style={{
                    background: "var(--ds-accent)",
                    boxShadow: "0 0 4px var(--ds-accent)",
                  }}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
