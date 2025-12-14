"use client";

import { useMemo, useState, useRef } from "react";
import { CalendarEvent } from "@/lib/types/calendar";
import { positionEvents, HOUR_HEIGHT } from "@/lib/utils/time-grid";
import { TimePositionedEvent } from "./time-positioned-event";

interface DayColumnProps {
  events: CalendarEvent[];
  hourHeight?: number;
  onEventClick?: (event: CalendarEvent, element: HTMLElement) => void;
  onTimeSlotClick?: (startTime: string, element: HTMLElement) => void;
  onTimeRangeSelect?: (startTime: string, endTime: string, element: HTMLElement) => void;
  onEventDrop?: (eventId: string, sourceType: string, targetHour: number) => void;
  onEventHoverStart?: (event: CalendarEvent, element: HTMLElement) => void;
  onEventHoverEnd?: () => void;
  isFirst?: boolean;
}

// Drag-to-create state
interface DragCreateState {
  startSlot: number;  // 0-47 (30-min slots)
  endSlot: number;
  isDragging: boolean;
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
  onTimeRangeSelect,
  onEventDrop,
  onEventHoverStart,
  onEventHoverEnd,
  isFirst = false,
}: DayColumnProps) {
  const columnRef = useRef<HTMLDivElement>(null);
  const startSlotElementRef = useRef<HTMLElement | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [dragCreate, setDragCreate] = useState<DragCreateState | null>(null);
  const slotHeight = hourHeight / 2;

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

  // Convert slot index to time string (48 slots = 30-min increments)
  const slotToTime = (slotIndex: number): string => {
    const hour = Math.floor(slotIndex / 2);
    const minutes = (slotIndex % 2) * 30;
    return `${hour.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
  };

  // Pointer handlers for drag-to-create
  const handlePointerDown = (e: React.PointerEvent, slotIndex: number) => {
    // Only left click
    if (e.button !== 0) return;
    // Don't start drag if clicking on an event
    const target = e.target as HTMLElement;
    if (target.closest("[data-event]")) return;

    e.preventDefault();

    // Store the slot element for positioning the popover later
    startSlotElementRef.current = e.currentTarget as HTMLElement;

    setDragCreate({
      startSlot: slotIndex,
      endSlot: slotIndex,
      isDragging: true,
    });

    // Capture pointer on the column for reliable cross-slot tracking
    columnRef.current?.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragCreate?.isDragging) return;

    const rect = columnRef.current?.getBoundingClientRect();
    if (!rect) return;

    const y = e.clientY - rect.top;
    const currentSlot = Math.max(0, Math.min(47, Math.floor(y / slotHeight)));

    setDragCreate(prev => prev ? { ...prev, endSlot: currentSlot } : null);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!dragCreate?.isDragging) return;

    const startSlot = Math.min(dragCreate.startSlot, dragCreate.endSlot);
    const endSlot = Math.max(dragCreate.startSlot, dragCreate.endSlot) + 1; // +1 to include the end slot

    const startTime = slotToTime(startSlot);
    const endTime = slotToTime(Math.min(endSlot, 48)); // Clamp to 24:00

    // Use the stored slot element for positioning (not e.currentTarget which is the column)
    const element = startSlotElementRef.current;

    // If drag was just 1 slot (tiny drag = click), use single click handler
    if (startSlot === Math.max(dragCreate.startSlot, dragCreate.endSlot)) {
      if (element) onTimeSlotClick?.(startTime, element);
    } else {
      // Use time range handler for actual drags
      if (element && onTimeRangeSelect) {
        onTimeRangeSelect(startTime, endTime, element);
      } else if (element) {
        // Fallback to single click if no range handler
        onTimeSlotClick?.(startTime, element);
      }
    }

    setDragCreate(null);
    startSlotElementRef.current = null;
    columnRef.current?.releasePointerCapture(e.pointerId);
  };

  const handlePointerCancel = (e: React.PointerEvent) => {
    setDragCreate(null);
    startSlotElementRef.current = null;
    columnRef.current?.releasePointerCapture(e.pointerId);
  };

  return (
    <div
      ref={columnRef}
      className={`relative flex-1 min-w-0 transition-colors ${
        isDragOver ? "bg-accent/20" : ""
      } ${dragCreate?.isDragging ? "select-none" : ""}`}
      style={{
        height: totalHeight,
        borderLeft: isFirst ? "none" : "1px solid var(--border-subtle)",
        touchAction: "none", // Prevent touch scrolling during drag
      }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
    >
      {/* 30-minute time slots (48 slots per day) */}
      {Array.from({ length: 48 }, (_, slotIndex) => {
        const isHourStart = slotIndex % 2 === 0;

        return (
          <div
            key={slotIndex}
            data-time-slot
            className="absolute left-0 right-0 cursor-pointer hover:bg-white/5 transition-colors"
            style={{
              top: slotIndex * slotHeight,
              height: slotHeight,
              borderTop: slotIndex > 0
                ? isHourStart
                  ? "1px solid var(--border-subtle)"
                  : "1px dashed rgba(255,255,255,0.05)"
                : "none",
            }}
            onPointerDown={(e) => handlePointerDown(e, slotIndex)}
          />
        );
      })}

      {/* Drag-to-create preview */}
      {dragCreate?.isDragging && (
        <div
          className="absolute left-1 right-1 rounded-md pointer-events-none z-20"
          style={{
            top: Math.min(dragCreate.startSlot, dragCreate.endSlot) * slotHeight,
            height: (Math.abs(dragCreate.endSlot - dragCreate.startSlot) + 1) * slotHeight,
            background: "var(--ds-accent)",
            opacity: 0.5,
            border: "2px dashed var(--ds-accent)",
          }}
        >
          <div className="px-2 py-1">
            <div className="text-[10px] font-medium text-white opacity-90">
              {slotToTime(Math.min(dragCreate.startSlot, dragCreate.endSlot))} - {slotToTime(Math.max(dragCreate.startSlot, dragCreate.endSlot) + 1)}
            </div>
          </div>
        </div>
      )}

      {/* Positioned events */}
      {positionedEvents.map((pe) => (
        <TimePositionedEvent
          key={pe.event.id}
          positionedEvent={pe}
          onClick={onEventClick}
          onDragStart={handleDragStart}
          onHoverStart={onEventHoverStart}
          onHoverEnd={onEventHoverEnd}
        />
      ))}
    </div>
  );
}
