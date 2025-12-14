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
import { Popover, PopoverContent, PopoverAnchor } from "@/components/ui/popover";
import { EventCreationForm } from "../event-creation-form";
import { EventDetailsPopover } from "../event-details-popover";
import { useEventStore } from "@/lib/hooks/use-event-store";

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

  // Event creation popover state - stores slot info and anchor position
  const [activeSlot, setActiveSlot] = useState<{
    date: Date;
    hour: number;
    anchorRect: { left: number; top: number; width: number; height: number };
  } | null>(null);

  // Event details popover state - stores selected event and anchor position
  const [selectedEvent, setSelectedEvent] = useState<{
    event: CalendarEvent;
    anchorRect: { left: number; top: number; width: number; height: number };
  } | null>(null);

  const { deleteEvent } = useEventStore();

  const handleTimeSlotClick = (date: Date, hour: number, slotRect: DOMRect) => {
    // Use the actual clicked slot's bounding rect for accurate positioning
    const anchorRect = {
      left: slotRect.left,
      top: slotRect.top,
      width: slotRect.width,
      height: slotRect.height,
    };

    setActiveSlot({ date, hour, anchorRect });
  };

  const closePopover = () => {
    setActiveSlot(null);
  };

  const closeEventDetails = () => {
    setSelectedEvent(null);
  };

  // Handle event click - show details popover with anchor at event position
  const handleEventClickInternal = (event: CalendarEvent, eventRect: DOMRect) => {
    // Close any open creation popover
    setActiveSlot(null);

    setSelectedEvent({
      event,
      anchorRect: {
        left: eventRect.left,
        top: eventRect.top,
        width: eventRect.width,
        height: eventRect.height,
      },
    });
  };

  // Handle delete from popover
  const handleDeleteEvent = async (event: CalendarEvent) => {
    // Only delete manual events (not pseudo-events from cards/todos)
    if (!event.source || event.source.type === "manual") {
      await deleteEvent(event.id);
      closeEventDetails();
    }
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
        onEventClick={handleEventClickInternal}
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
            ref={gridRef}
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
                  onEventClick={handleEventClickInternal}
                  onTimeSlotClick={(hour, slotRect) => handleTimeSlotClick(day, hour, slotRect)}
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

      {/* Event creation popover using Radix for proper anchoring */}
      <Popover open={!!activeSlot} onOpenChange={(open) => !open && closePopover()}>
        {/* Anchor element positioned at the clicked slot */}
        {activeSlot && (
          <PopoverAnchor asChild>
            <div
              className="fixed pointer-events-none z-40"
              style={{
                left: activeSlot.anchorRect.left,
                top: activeSlot.anchorRect.top,
                width: activeSlot.anchorRect.width,
                height: activeSlot.anchorRect.height,
                // Visual placeholder like Google Calendar
                background: "var(--ds-accent)",
                opacity: 0.3,
                borderRadius: "4px",
              }}
            />
          </PopoverAnchor>
        )}
        <PopoverContent
          side="right"
          sideOffset={8}
          align="start"
          collisionPadding={16}
          className="w-auto p-0"
        >
          {activeSlot && (
            <EventCreationForm
              date={activeSlot.date}
              hour={activeSlot.hour}
              onClose={closePopover}
            />
          )}
        </PopoverContent>
      </Popover>

      {/* Event details popover */}
      <Popover open={!!selectedEvent} onOpenChange={(open) => !open && closeEventDetails()}>
        {selectedEvent && (
          <PopoverAnchor asChild>
            <div
              className="fixed pointer-events-none z-40"
              style={{
                left: selectedEvent.anchorRect.left,
                top: selectedEvent.anchorRect.top,
                width: selectedEvent.anchorRect.width,
                height: selectedEvent.anchorRect.height,
              }}
            />
          </PopoverAnchor>
        )}
        <PopoverContent
          side="right"
          sideOffset={8}
          align="start"
          collisionPadding={16}
          className="w-auto p-0"
        >
          {selectedEvent && (
            <EventDetailsPopover
              event={selectedEvent.event}
              onClose={closeEventDetails}
              onDelete={
                !selectedEvent.event.source || selectedEvent.event.source.type === "manual"
                  ? handleDeleteEvent
                  : undefined
              }
            />
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}
