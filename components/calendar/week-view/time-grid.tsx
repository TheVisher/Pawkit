"use client";

import { useRef, useEffect, useMemo, useState } from "react";
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
import { EventCreationPopover } from "../event-creation-popover";

interface TimeGridProps {
  weekDays: Date[];
  eventsByDate: Map<string, CalendarEvent[]>;
  holidaysByDate: Map<string, ResolvedHoliday>;
  hourHeight?: number;
  onEventClick?: (event: CalendarEvent) => void;
  onDayClick?: (date: Date) => void;
  onEventReschedule?: (eventId: string, newDate: string, sourceType?: string, targetHour?: number) => void;
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
  onEventReschedule,
}: TimeGridProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const totalGridHeight = 24 * hourHeight;

  // Popover dimensions (approximate)
  const POPOVER_WIDTH = 340;
  const POPOVER_HEIGHT = 480;

  // Event creation popover state
  const [popoverState, setPopoverState] = useState<{
    isOpen: boolean;
    date: Date;
    hour: number;
    position: { x: number; y: number };
    anchor: "left" | "right";
  } | null>(null);

  const handleTimeSlotClick = (date: Date, hour: number, columnRect: DOMRect) => {
    // Get the calendar container's bounding rect
    const containerRect = containerRef.current?.getBoundingClientRect();

    if (!containerRect) return;

    // Determine if popover should appear on left or right of the column
    const spaceOnRight = containerRect.right - columnRect.right;

    // Prefer right side, but flip to left if not enough space
    const anchor = spaceOnRight >= POPOVER_WIDTH + 8 ? "right" : "left";

    // Calculate x position - anchor to column edge
    let x: number;
    if (anchor === "right") {
      x = columnRect.right + 8; // 8px gap from column's right edge
    } else {
      x = columnRect.left - POPOVER_WIDTH - 8; // Position to left of column
    }

    // Calculate y position based on the hour clicked
    const hourOffset = hour * hourHeight;
    let y = columnRect.top + hourOffset;

    // Ensure popover doesn't go above container
    if (y < containerRect.top) {
      y = containerRect.top + 8;
    }

    // Ensure popover doesn't go below container
    if (y + POPOVER_HEIGHT > containerRect.bottom) {
      y = containerRect.bottom - POPOVER_HEIGHT - 8;
    }

    setPopoverState({
      isOpen: true,
      date,
      hour,
      position: { x, y },
      anchor,
    });
  };

  const closePopover = () => {
    setPopoverState(null);
  };

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
      ref={containerRef}
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
        onEventReschedule={onEventReschedule}
      />

      {/* Scrollable time grid */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-hide"
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
                  onTimeSlotClick={(hour, columnRect) => handleTimeSlotClick(day, hour, columnRect)}
                  onEventDrop={(eventId, sourceType, targetHour) => {
                    onEventReschedule?.(eventId, dateStr, sourceType, targetHour);
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

      {/* Event creation popover */}
      {popoverState && (
        <EventCreationPopover
          date={popoverState.date}
          hour={popoverState.hour}
          position={popoverState.position}
          onClose={closePopover}
        />
      )}
    </div>
  );
}
