"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import { CalendarEvent } from "@/lib/types/calendar";
import { positionEvents, HOUR_HEIGHT } from "@/lib/utils/time-grid";
import { TimePositionedEvent } from "./time-positioned-event";

interface DayColumnProps {
  events: CalendarEvent[];
  dayIndex: number; // 0-6 index of this day in the week
  hourHeight?: number;
  onEventClick?: (event: CalendarEvent, element: HTMLElement) => void;
  onTimeSlotClick?: (startTime: string, element: HTMLElement) => void;
  onTimeRangeSelect?: (startTime: string, endTime: string, element: HTMLElement) => void;
  onEventDrop?: (eventId: string, sourceType: string, targetHour: number) => void;
  onEventHoverStart?: (event: CalendarEvent, element: HTMLElement) => void;
  onEventHoverEnd?: () => void;
  onDragCreateStart?: (dayIndex: number) => void; // Called when drag-to-create starts
  onMultiDayDragMove?: (e: PointerEvent) => void; // Called during multi-day drag
  onMultiDayDragEnd?: (e: PointerEvent) => void; // Called when multi-day drag ends
  isFirst?: boolean;
  clearPreviewTrigger?: number; // Increment to clear persistent preview
  // Multi-day drag preview - passed from parent when this column is in the drag range
  multiDayPreview?: {
    startSlot: number;
    endSlot: number;
  } | null;
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
  dayIndex,
  hourHeight = HOUR_HEIGHT,
  onEventClick,
  onTimeSlotClick,
  onTimeRangeSelect,
  onEventDrop,
  onEventHoverStart,
  onEventHoverEnd,
  onDragCreateStart,
  onMultiDayDragMove,
  onMultiDayDragEnd,
  isFirst = false,
  clearPreviewTrigger,
  multiDayPreview,
}: DayColumnProps) {
  const columnRef = useRef<HTMLDivElement>(null);
  const startSlotElementRef = useRef<HTMLElement | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [dragCreate, setDragCreate] = useState<DragCreateState | null>(null);
  const [isMultiDayMode, setIsMultiDayMode] = useState(false); // True when drag exits column horizontally
  // Persistent preview that stays after drag release until form closes
  const [persistentPreview, setPersistentPreview] = useState<{ startSlot: number; endSlot: number } | null>(null);
  const slotHeight = hourHeight / 2;

  // Clear persistent preview when trigger changes (form closed)
  useEffect(() => {
    if (clearPreviewTrigger !== undefined) {
      setPersistentPreview(null);
    }
  }, [clearPreviewTrigger]);

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

    // Notify parent to clear ALL columns' persistent previews and start multi-day tracking
    onDragCreateStart?.(dayIndex);

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

    // Always track vertical position for time slot
    const y = e.clientY - rect.top;
    const currentSlot = Math.max(0, Math.min(47, Math.floor(y / slotHeight)));
    setDragCreate(prev => prev ? { ...prev, endSlot: currentSlot } : null);

    // Calculate time info for current selection
    const startSlot = Math.min(dragCreate.startSlot, currentSlot);
    const endSlot = Math.max(dragCreate.startSlot, currentSlot);
    const currentStartTime = slotToTime(startSlot);
    const currentEndTime = slotToTime(Math.min(endSlot + 1, 48));

    // Check if pointer has moved outside column horizontally
    // Small tolerance (10px) to prevent jitter, TimeGrid handles false positives
    const HORIZONTAL_TOLERANCE = 10;
    const isOutsideHorizontally = e.clientX < rect.left - HORIZONTAL_TOLERANCE ||
                                   e.clientX > rect.right + HORIZONTAL_TOLERANCE;

    if (isOutsideHorizontally && !isMultiDayMode) {
      // Switch to multi-day mode - delegate to parent
      setIsMultiDayMode(true);
    }

    if (isMultiDayMode) {
      // Forward events to parent for multi-day tracking, with time and slot info
      const eventWithInfo = Object.assign(e.nativeEvent, {
        _startTime: currentStartTime,
        _endTime: currentEndTime,
        _startSlot: startSlot,
        _endSlot: endSlot,
      });
      onMultiDayDragMove?.(eventWithInfo);
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!dragCreate?.isDragging) return;

    const startSlot = Math.min(dragCreate.startSlot, dragCreate.endSlot);
    const endSlot = Math.max(dragCreate.startSlot, dragCreate.endSlot);
    const startTime = slotToTime(startSlot);
    const endTime = slotToTime(Math.min(endSlot + 1, 48));

    // If in multi-day mode, delegate to parent with time info
    if (isMultiDayMode) {
      // Pass time slot info along with the event
      const eventWithTime = Object.assign(e.nativeEvent, {
        _startTime: startTime,
        _endTime: endTime,
        _startSlot: startSlot,
        _endSlot: endSlot,
      });
      onMultiDayDragEnd?.(eventWithTime);
      setDragCreate(null);
      setIsMultiDayMode(false);
      startSlotElementRef.current = null;
      columnRef.current?.releasePointerCapture(e.pointerId);
      return;
    }

    // Use the stored slot element for positioning (not e.currentTarget which is the column)
    const element = startSlotElementRef.current;

    // If drag was just 1 slot (tiny drag = click), use single click handler
    const isRangeSelection = startSlot !== endSlot;

    if (!isRangeSelection) {
      // Single click - no persistent preview needed
      if (element) onTimeSlotClick?.(startTime, element);
    } else {
      // Range selection - set persistent preview to keep showing the selection
      setPersistentPreview({ startSlot, endSlot });

      // Use time range handler for actual drags
      if (element && onTimeRangeSelect) {
        onTimeRangeSelect(startTime, endTime, element);
      } else if (element) {
        // Fallback to single click if no range handler
        onTimeSlotClick?.(startTime, element);
      }
    }

    setDragCreate(null);
    setIsMultiDayMode(false);
    startSlotElementRef.current = null;
    columnRef.current?.releasePointerCapture(e.pointerId);
  };

  const handlePointerCancel = (e: React.PointerEvent) => {
    setDragCreate(null);
    setIsMultiDayMode(false);
    startSlotElementRef.current = null;
    columnRef.current?.releasePointerCapture(e.pointerId);
  };

  return (
    <div
      ref={columnRef}
      data-day-column
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

      {/* Drag-to-create preview - shows for:
          1. Local single-day drag (dragCreate && !isMultiDayMode)
          2. Multi-day drag from parent (multiDayPreview)
          3. Persistent preview after release (persistentPreview)
      */}
      {((dragCreate?.isDragging && !isMultiDayMode) || multiDayPreview || persistentPreview) && (() => {
        // Priority: multiDayPreview > local drag > persistent
        const previewStartSlot = multiDayPreview
          ? multiDayPreview.startSlot
          : dragCreate?.isDragging
            ? Math.min(dragCreate.startSlot, dragCreate.endSlot)
            : persistentPreview!.startSlot;
        const previewEndSlot = multiDayPreview
          ? multiDayPreview.endSlot
          : dragCreate?.isDragging
            ? Math.max(dragCreate.startSlot, dragCreate.endSlot)
            : persistentPreview!.endSlot;

        return (
          <div
            className="absolute left-1 right-1 rounded-md pointer-events-none z-20"
            style={{
              top: previewStartSlot * slotHeight,
              height: (previewEndSlot - previewStartSlot + 1) * slotHeight,
              background: "var(--ds-accent)",
              opacity: 0.5,
              border: "2px dashed var(--ds-accent)",
            }}
          >
            <div className="px-2 py-1">
              <div className="text-[10px] font-medium text-white opacity-90">
                {slotToTime(previewStartSlot)} - {slotToTime(previewEndSlot + 1)}
              </div>
            </div>
          </div>
        );
      })()}

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
