"use client";

import { CalendarEvent } from "@/lib/types/calendar";
import { formatTime12h } from "@/lib/utils/time-grid";
import { X, Clock, MapPin, Repeat, AlignLeft, Trash2, Pencil } from "lucide-react";
import { format, parseISO } from "date-fns";

interface EventDetailsPopoverProps {
  event: CalendarEvent;
  onClose: () => void;
  onEdit?: (event: CalendarEvent) => void;
  onDelete?: (event: CalendarEvent) => void;
}

export function EventDetailsPopover({
  event,
  onClose,
  onEdit,
  onDelete,
}: EventDetailsPopoverProps) {
  const eventDate = parseISO(event.date);
  const formattedDate = format(eventDate, "EEEE, MMMM d, yyyy");

  // Format time range
  const timeRange = event.isAllDay
    ? "All day"
    : event.startTime
    ? `${formatTime12h(event.startTime)}${event.endTime ? ` - ${formatTime12h(event.endTime)}` : ""}`
    : null;

  // Recurrence text
  const recurrenceText = event.recurrence
    ? `Repeats ${event.recurrence.frequency}${
        event.recurrence.interval && event.recurrence.interval > 1
          ? ` every ${event.recurrence.interval}`
          : ""
      }`
    : null;

  return (
    <div
      className="w-[320px] rounded-xl overflow-hidden"
      style={{
        background: "rgba(30, 30, 35, 0.85)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        border: "1px solid var(--border-subtle)",
        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
      }}
    >
      {/* Header with color bar */}
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: "1px solid var(--border-subtle)" }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ background: event.color || "var(--ds-accent)" }}
          />
          <span
            className="text-sm font-medium"
            style={{ color: "var(--text-secondary)" }}
          >
            Event Details
          </span>
        </div>
        <div className="flex items-center gap-1">
          {onEdit && (
            <button
              onClick={() => onEdit(event)}
              className="p-1.5 rounded hover:bg-white/10 transition-colors"
              style={{ color: "var(--text-muted)" }}
              title="Edit event"
            >
              <Pencil size={16} />
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(event)}
              className="p-1.5 rounded hover:bg-red-500/20 transition-colors"
              style={{ color: "var(--text-muted)" }}
              title="Delete event"
            >
              <Trash2 size={16} />
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1.5 rounded hover:bg-white/10 transition-colors"
            style={{ color: "var(--text-muted)" }}
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {/* Title */}
        <h3
          className="text-base font-semibold leading-tight"
          style={{ color: "var(--text-primary)" }}
        >
          {event.title}
        </h3>

        {/* Date & Time */}
        <div className="flex items-start gap-3">
          <Clock
            size={16}
            className="mt-0.5 flex-shrink-0"
            style={{ color: "var(--text-muted)" }}
          />
          <div>
            <div
              className="text-sm"
              style={{ color: "var(--text-secondary)" }}
            >
              {formattedDate}
            </div>
            {timeRange && (
              <div
                className="text-sm mt-0.5"
                style={{ color: "var(--text-muted)" }}
              >
                {timeRange}
              </div>
            )}
          </div>
        </div>

        {/* Location */}
        {event.location && (
          <div className="flex items-start gap-3">
            <MapPin
              size={16}
              className="mt-0.5 flex-shrink-0"
              style={{ color: "var(--text-muted)" }}
            />
            <div
              className="text-sm"
              style={{ color: "var(--text-secondary)" }}
            >
              {event.location}
            </div>
          </div>
        )}

        {/* Recurrence */}
        {recurrenceText && (
          <div className="flex items-start gap-3">
            <Repeat
              size={16}
              className="mt-0.5 flex-shrink-0"
              style={{ color: "var(--text-muted)" }}
            />
            <div
              className="text-sm capitalize"
              style={{ color: "var(--text-secondary)" }}
            >
              {recurrenceText}
            </div>
          </div>
        )}

        {/* Description */}
        {event.description && (
          <div className="flex items-start gap-3">
            <AlignLeft
              size={16}
              className="mt-0.5 flex-shrink-0"
              style={{ color: "var(--text-muted)" }}
            />
            <div
              className="text-sm whitespace-pre-wrap"
              style={{ color: "var(--text-secondary)" }}
            >
              {event.description}
            </div>
          </div>
        )}

        {/* Source indicator */}
        {event.source?.type && event.source.type !== "manual" && (
          <div
            className="text-xs mt-2 pt-2"
            style={{
              color: "var(--text-muted)",
              borderTop: "1px solid var(--border-subtle)",
            }}
          >
            From: {event.source.type === "todo" ? "Todo" : event.source.type === "card" ? "Card" : event.source.type}
          </div>
        )}
      </div>
    </div>
  );
}
