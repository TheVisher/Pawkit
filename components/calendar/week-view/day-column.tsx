"use client";

import { useMemo } from "react";
import { CalendarEvent } from "@/lib/types/calendar";
import { positionEvents, HOUR_HEIGHT } from "@/lib/utils/time-grid";
import { TimePositionedEvent } from "./time-positioned-event";

interface DayColumnProps {
  events: CalendarEvent[];
  hourHeight?: number;
  onEventClick?: (event: CalendarEvent) => void;
  onTimeSlotClick?: (hour: number) => void;
}

/**
 * Single day column in the time grid
 * Contains hour gridlines and positioned events
 */
export function DayColumn({
  events,
  hourHeight = HOUR_HEIGHT,
  onEventClick,
  onTimeSlotClick,
}: DayColumnProps) {
  // Filter to only timed events (not all-day)
  const timedEvents = useMemo(
    () => events.filter((e) => !e.isAllDay && e.startTime),
    [events]
  );

  // Position events with overlap handling
  const positionedEvents = useMemo(
    () => positionEvents(timedEvents, hourHeight),
    [timedEvents, hourHeight]
  );

  const totalHeight = 24 * hourHeight;

  return (
    <div
      className="relative flex-1 min-w-0"
      style={{
        height: totalHeight,
        borderLeft: "1px solid var(--border-subtle)",
      }}
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
          onClick={() => onTimeSlotClick?.(hour)}
        />
      ))}

      {/* Half-hour lines (lighter) */}
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

      {/* Positioned events */}
      {positionedEvents.map((pe) => (
        <TimePositionedEvent
          key={pe.event.id}
          positionedEvent={pe}
          onClick={onEventClick}
        />
      ))}
    </div>
  );
}
