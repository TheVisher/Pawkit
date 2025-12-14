"use client";

import { useMemo, useState, useRef } from "react";
import { CalendarEvent } from "@/lib/types/calendar";
import { positionEvents, HOUR_HEIGHT } from "@/lib/utils/time-grid";
import { TimePositionedEvent } from "./time-positioned-event";

interface DayColumnProps {
  events: CalendarEvent[];
  hourHeight?: number;
  onEventClick?: (event: CalendarEvent, eventRect: DOMRect) => void;
  onTimeSlotClick?: (hour: number, slotRect: DOMRect) => void;
  onEventDrop?: (eventId: string, sourceType: string, targetHour: number) => void;
  isFirst?: boolean;
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
  onEventDrop,
  isFirst = false,
}: DayColumnProps) {
  const columnRef = useRef<HTMLDivElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

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

  // Drag handlers
  const handleDragStart = (e: React.DragEvent, event: CalendarEvent) => {
    e.dataTransfer.setData("eventId", event.id);
    e.dataTransfer.setData("sourceType", event.source?.type || "manual");
    e.dataTransfer.setData("sourceDate", event.date);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const eventId = e.dataTransfer.getData("eventId");
    const sourceType = e.dataTransfer.getData("sourceType");

    if (eventId && onEventDrop && columnRef.current) {
      // Calculate target hour from drop position
      const columnRect = columnRef.current.getBoundingClientRect();
      const dropY = e.clientY - columnRect.top;
      const targetHour = Math.floor(dropY / hourHeight);
      // Clamp to valid hours (0-23)
      const clampedHour = Math.max(0, Math.min(23, targetHour));

      onEventDrop(eventId, sourceType, clampedHour);
    }
  };

  const handleTimeSlotClick = (e: React.MouseEvent, hour: number) => {
    // Pass the click position for accurate anchor placement
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    onTimeSlotClick?.(hour, rect);
  };

  return (
    <div
      ref={columnRef}
      className={`relative flex-1 min-w-0 transition-colors ${
        isDragOver ? "bg-accent/20" : ""
      }`}
      style={{
        height: totalHeight,
        borderLeft: isFirst ? "none" : "1px solid var(--border-subtle)",
      }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
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
          onClick={(e) => handleTimeSlotClick(e, hour)}
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
          onDragStart={handleDragStart}
        />
      ))}
    </div>
  );
}
