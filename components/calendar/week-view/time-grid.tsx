"use client";

import { useRef, useEffect, useMemo } from "react";
import { format, isToday } from "date-fns";
import { CalendarEvent } from "@/lib/types/calendar";
import {
  HOUR_HEIGHT,
  TIME_LABEL_WIDTH,
  formatHourLabel,
  getScrollToCurrentTime,
} from "@/lib/utils/time-grid";
import { DayColumn } from "./day-column";
import { CurrentTimeIndicator } from "./current-time-indicator";
import { AllDaySection } from "./all-day-section";
import { ResolvedHoliday } from "@/lib/data/us-holidays";

interface TimeGridProps {
  weekDays: Date[];
  eventsByDate: Map<string, CalendarEvent[]>;
  holidaysByDate: Map<string, ResolvedHoliday>;
  hourHeight?: number;
  onEventClick?: (event: CalendarEvent) => void;
  onDayClick?: (date: Date) => void;
}

/**
 * Main time grid component for the week view
 * Contains header row, all-day section, and scrollable time grid
 */
export function TimeGrid({
  weekDays,
  eventsByDate,
  holidaysByDate,
  hourHeight = HOUR_HEIGHT,
  onEventClick,
  onDayClick,
}: TimeGridProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const totalGridHeight = 24 * hourHeight;

  // Auto-scroll to current time on mount
  useEffect(() => {
    if (scrollContainerRef.current) {
      const viewHeight = scrollContainerRef.current.clientHeight;
      const scrollPosition = getScrollToCurrentTime(viewHeight, hourHeight);
      scrollContainerRef.current.scrollTo({
        top: scrollPosition,
        behavior: "smooth",
      });
    }
  }, [hourHeight]);

  return (
    <div
      className="flex flex-col h-full overflow-hidden rounded-xl"
      style={{
        background: "var(--bg-surface-2)",
        border: "1px solid var(--border-subtle)",
      }}
    >
      {/* Day headers row (fixed) */}
      <div
        className="flex-shrink-0 flex"
        style={{
          borderBottom: "1px solid var(--border-subtle)",
          background: "var(--bg-surface-3)",
        }}
      >
        {/* Time column spacer */}
        <div
          className="flex-shrink-0"
          style={{ width: TIME_LABEL_WIDTH }}
        />

        {/* Day headers */}
        <div
          className="flex-1 grid grid-cols-7"
          style={{ borderLeft: "1px solid var(--border-subtle)" }}
        >
          {weekDays.map((day, index) => {
            const isCurrentDay = isToday(day);
            return (
              <div
                key={index}
                className={`py-3 text-center cursor-pointer transition-colors ${
                  isCurrentDay ? "bg-accent/10" : "hover:bg-white/5"
                }`}
                style={{
                  borderLeft: index > 0 ? "1px solid var(--border-subtle)" : "none",
                }}
                onClick={() => onDayClick?.(day)}
              >
                {/* Day name */}
                <div
                  className="text-xs font-semibold uppercase tracking-wide"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {format(day, "EEE")}
                </div>

                {/* Day number with today indicator */}
                <div
                  className={`text-lg font-bold mt-1 ${
                    isCurrentDay
                      ? "inline-flex items-center justify-center w-8 h-8 rounded-full"
                      : ""
                  }`}
                  style={
                    isCurrentDay
                      ? {
                          background: "var(--ds-accent)",
                          color: "white",
                        }
                      : {
                          color: "var(--text-primary)",
                        }
                  }
                >
                  {format(day, "d")}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* All-day events section (fixed) */}
      <AllDaySection
        weekDays={weekDays}
        eventsByDate={eventsByDate}
        holidaysByDate={holidaysByDate}
        onEventClick={onEventClick}
        onDayClick={onDayClick}
      />

      {/* Scrollable time grid */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-minimal"
        style={{
          scrollBehavior: "smooth",
        }}
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
                  className="text-[10px] font-medium"
                  style={{ color: "var(--text-muted)" }}
                >
                  {formatHourLabel(hour)}
                </span>
              </div>
            ))}
          </div>

          {/* Day columns */}
          <div
            className="flex-1 grid grid-cols-7 relative"
            style={{ borderLeft: "1px solid var(--border-subtle)" }}
          >
            {weekDays.map((day, index) => {
              const dateStr = format(day, "yyyy-MM-dd");
              const dayEvents = eventsByDate.get(dateStr) || [];

              return (
                <DayColumn
                  key={index}
                  events={dayEvents}
                  hourHeight={hourHeight}
                  onEventClick={onEventClick}
                  onTimeSlotClick={(hour) => {
                    // Could open event creation dialog at this time
                    onDayClick?.(day);
                  }}
                  isFirst={index === 0}
                />
              );
            })}

            {/* Current time indicator (spans across) */}
            <CurrentTimeIndicator
              weekDays={weekDays}
              hourHeight={hourHeight}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
