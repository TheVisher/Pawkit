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
import {
  useFloating,
  offset,
  flip,
  shift,
  autoUpdate,
  FloatingPortal,
  size,
} from "@floating-ui/react";
import { EventCreationForm } from "../event-creation-form";
import { EventDetailsPopover } from "../event-details-popover";
import { useEventStore } from "@/lib/hooks/use-event-store";
import { EVENT_COLORS } from "@/lib/types/calendar";

/**
 * Visual preview component that shows at the clicked slot position
 * Styled to look like an event being created
 */
function EventPreview({ element }: { element: HTMLElement }) {
  const [rect, setRect] = useState(() => element.getBoundingClientRect());

  // Update rect when element changes (user clicks different slot)
  useEffect(() => {
    setRect(element.getBoundingClientRect());
  }, [element]);

  // Update position on scroll/resize
  useEffect(() => {
    const updateRect = () => setRect(element.getBoundingClientRect());

    // Use requestAnimationFrame for smooth updates
    let rafId: number;
    const handleScroll = () => {
      rafId = requestAnimationFrame(updateRect);
    };

    window.addEventListener("scroll", handleScroll, true);
    window.addEventListener("resize", updateRect);

    return () => {
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", updateRect);
      cancelAnimationFrame(rafId);
    };
  }, [element]);

  return (
    <div
      className="fixed pointer-events-none z-40 rounded-md overflow-hidden"
      style={{
        left: rect.left + 2,
        top: rect.top,
        width: rect.width - 4,
        height: rect.height,
        background: EVENT_COLORS.purple,
        opacity: 0.8,
        border: "1px solid rgba(255, 255, 255, 0.2)",
        boxShadow: "0 2px 8px rgba(168, 85, 247, 0.4)",
      }}
    >
      <div className="px-2 py-1">
        <div className="text-[10px] font-medium text-white opacity-80">
          (No title)
        </div>
      </div>
      {/* Left color stripe */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1 rounded-l"
        style={{ background: "rgba(255, 255, 255, 0.3)" }}
      />
    </div>
  );
}

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
  const gridRef = useRef<HTMLDivElement>(null);
  const totalGridHeight = 24 * hourHeight;

  // Event creation popover state
  const [isCreationOpen, setIsCreationOpen] = useState(false);
  const [creationData, setCreationData] = useState<{
    date: Date;
    startTime: string;
    endTime?: string;
    isMultiDay?: boolean;
    endDate?: Date;
  } | null>(null);

  // Visual preview state - stores the clicked slot element for showing preview
  const [previewElement, setPreviewElement] = useState<HTMLElement | null>(null);
  // Counter to signal DayColumn to clear persistent preview (incremented when form closes)
  const [clearPreviewTrigger, setClearPreviewTrigger] = useState(0);

  // Multi-day drag state
  const [multiDayDrag, setMultiDayDrag] = useState<{
    startDayIndex: number;
    currentDayIndex: number;
    isDragging: boolean;
  } | null>(null);

  // Event details popover state
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  // Hover preview state (with delay)
  const [hoveredEvent, setHoveredEvent] = useState<CalendarEvent | null>(null);
  const [isHoverOpen, setIsHoverOpen] = useState(false);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const HOVER_DELAY = 500; // ms

  const { deleteEvent } = useEventStore();

  // Floating UI for event creation popover
  const {
    refs: creationRefs,
    floatingStyles: creationStyles,
  } = useFloating({
    open: isCreationOpen,
    onOpenChange: setIsCreationOpen,
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

  // Floating UI for hover preview popover
  const {
    refs: hoverRefs,
    floatingStyles: hoverStyles,
  } = useFloating({
    open: isHoverOpen,
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
    ],
    whileElementsMounted: autoUpdate,
  });

  // Handle time slot click - pass the element for anchoring
  const handleTimeSlotClick = (date: Date, startTime: string, element: HTMLElement) => {
    // Close any open details popover
    setIsDetailsOpen(false);
    setSelectedEvent(null);

    // Clear hover state
    handleEventHoverEnd();

    // Set the clicked element as the reference for positioning
    creationRefs.setReference(element);
    setCreationData({ date, startTime });
    setPreviewElement(element);
    setIsCreationOpen(true);
  };

  // Handle time range selection (drag-to-create)
  const handleTimeRangeSelect = (date: Date, startTime: string, endTime: string, element: HTMLElement) => {
    // Close any open details popover
    setIsDetailsOpen(false);
    setSelectedEvent(null);

    // Clear hover state
    handleEventHoverEnd();

    // Set the element as the reference for positioning
    creationRefs.setReference(element);
    setCreationData({ date, startTime, endTime });
    // Don't set previewElement for drag-to-create (DayColumn shows its own preview during drag)
    setPreviewElement(null);
    setIsCreationOpen(true);
  };

  const closeCreationPopover = () => {
    setIsCreationOpen(false);
    setCreationData(null);
    setPreviewElement(null);
    setMultiDayDrag(null);
    // Signal all DayColumns to clear their persistent preview
    setClearPreviewTrigger(prev => prev + 1);
  };

  // Called when any DayColumn starts a drag - clears all persistent previews
  const handleDragCreateStart = (dayIndex: number) => {
    setClearPreviewTrigger(prev => prev + 1);
    // Start tracking multi-day drag
    setMultiDayDrag({
      startDayIndex: dayIndex,
      currentDayIndex: dayIndex,
      isDragging: true,
    });
  };

  // Track pointer position for multi-day drag
  const handleGridPointerMove = (e: React.PointerEvent) => {
    if (!multiDayDrag?.isDragging) return;
    if (!gridRef.current) return;

    // Calculate which day column based on position within grid
    const gridRect = gridRef.current.getBoundingClientRect();
    const relativeX = e.clientX - gridRect.left;
    const columnWidth = gridRect.width / 7;
    const dayIndex = Math.max(0, Math.min(6, Math.floor(relativeX / columnWidth)));

    if (multiDayDrag.currentDayIndex !== dayIndex) {
      setMultiDayDrag(prev => prev ? { ...prev, currentDayIndex: dayIndex } : null);
    }
  };

  // End multi-day drag
  const handleGridPointerUp = (e: React.PointerEvent) => {
    if (!multiDayDrag?.isDragging) return;

    const startDay = Math.min(multiDayDrag.startDayIndex, multiDayDrag.currentDayIndex);
    const endDay = Math.max(multiDayDrag.startDayIndex, multiDayDrag.currentDayIndex);

    // If drag spans multiple days, create multi-day event
    if (startDay !== endDay) {
      const startDate = weekDays[startDay];
      const endDate = weekDays[endDay];

      // Find an element in the all-day section to anchor the popover
      const allDaySection = containerRef.current?.querySelector('[data-all-day-section]');
      if (allDaySection) {
        creationRefs.setReference(allDaySection as HTMLElement);
      }

      setCreationData({
        date: startDate,
        startTime: "00:00",
        endTime: undefined,
        isMultiDay: true,
        endDate: endDate,
      });
      setIsCreationOpen(true);
    }

    setMultiDayDrag(null);
  };

  // Cancel multi-day drag
  const handleGridPointerLeave = () => {
    // Don't cancel - let them drag outside and back
  };

  const closeDetailsPopover = () => {
    setIsDetailsOpen(false);
    setSelectedEvent(null);
  };

  // Handle hover start with delay
  const handleEventHoverStart = (event: CalendarEvent, element: HTMLElement) => {
    // Clear any existing timeout
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }

    // Don't show hover if click popover is open for this event
    if (isDetailsOpen && selectedEvent?.id === event.id) return;
    // Don't show hover if creation popover is open
    if (isCreationOpen) return;

    hoverRefs.setReference(element);
    setHoveredEvent(event);

    hoverTimeoutRef.current = setTimeout(() => {
      setIsHoverOpen(true);
    }, HOVER_DELAY);
  };

  // Handle hover end - clear timeout and close popover
  const handleEventHoverEnd = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setIsHoverOpen(false);
    setHoveredEvent(null);
  };

  // Handle event click - show details popover anchored to the event element
  const handleEventClickInternal = (event: CalendarEvent, element: HTMLElement) => {
    // Close any open creation popover
    setIsCreationOpen(false);
    setCreationData(null);

    // Clear hover state when clicking
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setIsHoverOpen(false);
    setHoveredEvent(null);

    // Set the clicked event element as the reference for positioning
    detailsRefs.setReference(element);
    setSelectedEvent(event);
    setIsDetailsOpen(true);
  };

  // Handle delete from popover
  const handleDeleteEvent = async (event: CalendarEvent) => {
    // Only delete manual events (not pseudo-events from cards/todos)
    if (!event.source || event.source.type === "manual") {
      await deleteEvent(event.id);
      closeDetailsPopover();
    }
  };

  // Close popovers when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;

      // Check if click is inside either popover
      const isInsideCreation = creationRefs.floating.current?.contains(target);
      const isInsideDetails = detailsRefs.floating.current?.contains(target);

      if (!isInsideCreation && isCreationOpen) {
        // Don't close if clicking on a time slot (will trigger new popover)
        if (!target.closest("[data-time-slot]")) {
          closeCreationPopover();
        }
      }

      if (!isInsideDetails && isDetailsOpen) {
        // Don't close if clicking on an event (will trigger new popover)
        if (!target.closest("[data-event]")) {
          closeDetailsPopover();
        }
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isCreationOpen, isDetailsOpen]);

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
        onEventClick={handleEventClickInternal}
        onDayClick={onDayClick}
        onEventReschedule={onEventReschedule}
        multiDayDragPreview={
          multiDayDrag?.isDragging && multiDayDrag.startDayIndex !== multiDayDrag.currentDayIndex
            ? {
                startDayIndex: Math.min(multiDayDrag.startDayIndex, multiDayDrag.currentDayIndex),
                endDayIndex: Math.max(multiDayDrag.startDayIndex, multiDayDrag.currentDayIndex),
              }
            : null
        }
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
            ref={gridRef}
            className="flex-1 grid grid-cols-7 relative"
            style={{ borderLeft: "1px solid var(--border-subtle)" }}
            onPointerMove={handleGridPointerMove}
            onPointerUp={handleGridPointerUp}
          >
            {weekDays.map((day, index) => {
              const dateStr = format(day, "yyyy-MM-dd");
              const dayEvents = eventsByDate.get(dateStr) || [];

              return (
                <DayColumn
                  key={index}
                  events={dayEvents}
                  dayIndex={index}
                  hourHeight={hourHeight}
                  onEventClick={handleEventClickInternal}
                  onTimeSlotClick={(startTime, element) => handleTimeSlotClick(day, startTime, element)}
                  onTimeRangeSelect={(startTime, endTime, element) => handleTimeRangeSelect(day, startTime, endTime, element)}
                  onEventDrop={(eventId, sourceType, targetHour) => {
                    onEventReschedule?.(eventId, dateStr, sourceType, targetHour);
                  }}
                  onEventHoverStart={handleEventHoverStart}
                  onEventHoverEnd={handleEventHoverEnd}
                  onDragCreateStart={handleDragCreateStart}
                  isFirst={index === 0}
                  clearPreviewTrigger={clearPreviewTrigger}
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

      {/* Visual preview when creating event */}
      <FloatingPortal>
        {isCreationOpen && previewElement && (
          <EventPreview element={previewElement} />
        )}
      </FloatingPortal>

      {/* Event creation popover using Floating UI */}
      <FloatingPortal>
        {isCreationOpen && creationData && (
          <div
            ref={creationRefs.setFloating}
            style={creationStyles}
            className="z-50"
          >
            <EventCreationForm
              date={creationData.date}
              startTime={creationData.startTime}
              endTime={creationData.endTime}
              isMultiDay={creationData.isMultiDay}
              endDate={creationData.endDate}
              onClose={closeCreationPopover}
            />
          </div>
        )}
      </FloatingPortal>

      {/* Event details popover using Floating UI */}
      <FloatingPortal>
        {isDetailsOpen && selectedEvent && (
          <div
            ref={detailsRefs.setFloating}
            style={detailsStyles}
            className="z-50"
          >
            <EventDetailsPopover
              event={selectedEvent}
              onClose={closeDetailsPopover}
              onDelete={
                !selectedEvent.source || selectedEvent.source.type === "manual"
                  ? handleDeleteEvent
                  : undefined
              }
            />
          </div>
        )}
      </FloatingPortal>

      {/* Hover preview popover (z-40 to stay below click popover) */}
      <FloatingPortal>
        {isHoverOpen && hoveredEvent && !isDetailsOpen && (
          <div
            ref={hoverRefs.setFloating}
            style={hoverStyles}
            className="z-40 pointer-events-none"
          >
            <EventDetailsPopover
              event={hoveredEvent}
              onClose={() => setIsHoverOpen(false)}
            />
          </div>
        )}
      </FloatingPortal>
    </div>
  );
}
