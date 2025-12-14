"use client";

import { CalendarEvent } from "@/lib/types/calendar";
import { formatTime12h, PositionedEvent, MIN_EVENT_HEIGHT } from "@/lib/utils/time-grid";
import { getFaviconUrl } from "@/lib/utils/card-display";
import { Clock, MapPin, Repeat, CheckSquare } from "lucide-react";

interface TimePositionedEventProps {
  positionedEvent: PositionedEvent;
  onClick?: (event: CalendarEvent, element: HTMLElement) => void;
  onDragStart?: (e: React.DragEvent, event: CalendarEvent) => void;
  onHoverStart?: (event: CalendarEvent, element: HTMLElement) => void;
  onHoverEnd?: () => void;
}

/**
 * Event card positioned absolutely within the time grid
 * Displays event title, time, location, and handles various sizes
 */
export function TimePositionedEvent({
  positionedEvent,
  onClick,
  onDragStart,
  onHoverStart,
  onHoverEnd,
}: TimePositionedEventProps) {
  const { event, top, height, left, width, totalColumns } = positionedEvent;

  // All events are draggable (cards, todos, manual events)
  const isDraggable = true;

  // Check event type for icon display
  const isCard = event.source?.type === "card" && event.url;
  const isTodo = event.source?.type === "todo";

  // Determine display mode based on height
  const isCompact = height < 35;
  const isMedium = height >= 35 && height < 60;
  const isTall = height >= 60;

  // Calculate padding based on overlap
  const hasOverlap = totalColumns > 1;
  const padding = hasOverlap ? 1 : 2;

  return (
    <div
      role="button"
      tabIndex={0}
      draggable={isDraggable}
      onDragStart={(e) => {
        if (isDraggable) {
          e.stopPropagation();
          onDragStart?.(e, event);
        }
      }}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.(event, e.currentTarget as HTMLElement);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick?.(event, e.currentTarget as HTMLElement);
        }
      }}
      onMouseEnter={(e) => {
        onHoverStart?.(event, e.currentTarget as HTMLElement);
      }}
      onMouseLeave={() => {
        onHoverEnd?.();
      }}
      data-event
      className={`absolute overflow-hidden transition-all duration-150 hover:z-10 ${
        isDraggable ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"
      }`}
      style={{
        top: top,
        height: Math.max(height, MIN_EVENT_HEIGHT),
        left: `calc(${left} + ${padding}px)`,
        width: `calc(${width} - ${padding * 2}px)`,
        background: event.color || "var(--ds-accent)",
        borderRadius: "6px",
        border: "1px solid rgba(255, 255, 255, 0.2)",
        boxShadow: "var(--raised-shadow-sm)",
      }}
      title={`${event.title}${event.startTime ? ` - ${formatTime12h(event.startTime)}` : ""}${event.location ? ` at ${event.location}` : ""}`}
    >
      <div
        className={`h-full overflow-hidden ${isCompact ? "px-1 py-0.5" : "px-2 py-1"}`}
      >
        {/* Compact mode: title only, single line */}
        {isCompact && (
          <div
            className="text-[10px] font-medium truncate leading-tight flex items-center gap-1"
            style={{ color: "white" }}
          >
            {isTodo && <CheckSquare size={10} className="flex-shrink-0" />}
            {isCard && event.url && (
              <img
                src={getFaviconUrl(event.url, 16)}
                alt=""
                className="w-3 h-3 flex-shrink-0 rounded-sm"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            )}
            <span className="truncate">{event.title}</span>
          </div>
        )}

        {/* Medium mode: title + time */}
        {isMedium && (
          <>
            <div
              className="text-xs font-medium truncate leading-tight flex items-center gap-1"
              style={{ color: "white" }}
            >
              {isTodo && <CheckSquare size={12} className="flex-shrink-0" />}
              {isCard && event.url && (
                <img
                  src={getFaviconUrl(event.url, 16)}
                  alt=""
                  className="w-3.5 h-3.5 flex-shrink-0 rounded-sm"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
              )}
              <span className="truncate">{event.title}</span>
            </div>
            {event.startTime && (
              <div
                className="text-[10px] opacity-80 truncate mt-0.5"
                style={{ color: "white" }}
              >
                {formatTime12h(event.startTime)}
              </div>
            )}
          </>
        )}

        {/* Tall mode: full details */}
        {isTall && (
          <>
            <div
              className="text-xs font-semibold leading-tight flex items-start gap-1.5"
              style={{ color: "white" }}
            >
              {isTodo && <CheckSquare size={14} className="flex-shrink-0 mt-0.5" />}
              {isCard && event.url && (
                <img
                  src={getFaviconUrl(event.url, 16)}
                  alt=""
                  className="w-4 h-4 flex-shrink-0 rounded-sm mt-0.5"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
              )}
              <span className="line-clamp-2">{event.title}</span>
            </div>

            {/* Time range */}
            {event.startTime && (
              <div
                className="flex items-center gap-1 text-[10px] opacity-90 mt-1"
                style={{ color: "white" }}
              >
                <Clock size={10} className="flex-shrink-0" />
                <span className="truncate">
                  {formatTime12h(event.startTime)}
                  {event.endTime && ` - ${formatTime12h(event.endTime)}`}
                </span>
              </div>
            )}

            {/* Location */}
            {event.location && height >= 80 && (
              <div
                className="flex items-center gap-1 text-[10px] opacity-80 mt-0.5"
                style={{ color: "white" }}
              >
                <MapPin size={10} className="flex-shrink-0" />
                <span className="truncate">{event.location}</span>
              </div>
            )}

            {/* Recurring indicator */}
            {event.recurrence && height >= 90 && (
              <div
                className="flex items-center gap-1 text-[10px] opacity-70 mt-0.5"
                style={{ color: "white" }}
              >
                <Repeat size={10} className="flex-shrink-0" />
                <span className="truncate capitalize">
                  {event.recurrence.frequency}
                </span>
              </div>
            )}
          </>
        )}
      </div>

      {/* Left color stripe indicator */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1 rounded-l"
        style={{
          background: "rgba(255, 255, 255, 0.3)",
        }}
      />
    </div>
  );
}
