"use client";

import { CalendarEvent } from "@/lib/types/calendar";
import { formatTime12h } from "@/lib/utils/time-grid";
import { getFaviconUrl } from "@/lib/utils/card-display";
import { useDataStore } from "@/lib/stores/data-store";
import { X, Clock, MapPin, Repeat, AlignLeft, Trash2, Pencil, ExternalLink } from "lucide-react";
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
  const cards = useDataStore((state) => state.cards);
  const eventDate = parseISO(event.date);
  const formattedDate = format(eventDate, "EEEE, MMMM d, yyyy");

  // Look up the linked card if this event is from a card
  const linkedCard = event.source?.cardId
    ? cards.find((c) => c.id === event.source?.cardId)
    : null;

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

        {/* Card Preview */}
        {linkedCard && linkedCard.type === "url" && (
          <div
            className="rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
            style={{
              background: "var(--bg-surface-3)",
              border: "1px solid var(--border-subtle)",
            }}
            onClick={() => {
              if (linkedCard.url) {
                window.open(linkedCard.url, "_blank");
              }
            }}
          >
            {/* Thumbnail */}
            {linkedCard.image && (
              <div className="relative w-full h-32 overflow-hidden">
                <img
                  src={linkedCard.image}
                  alt=""
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
              </div>
            )}
            {/* Card info */}
            <div className="p-3">
              <div className="flex items-center gap-2 mb-1">
                {linkedCard.url && (
                  <img
                    src={getFaviconUrl(linkedCard.url, 16)}
                    alt=""
                    className="w-4 h-4 rounded-sm flex-shrink-0"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                )}
                <span
                  className="text-xs truncate"
                  style={{ color: "var(--text-muted)" }}
                >
                  {linkedCard.domain || new URL(linkedCard.url).hostname}
                </span>
                <ExternalLink
                  size={12}
                  className="flex-shrink-0 ml-auto"
                  style={{ color: "var(--text-muted)" }}
                />
              </div>
              {linkedCard.description && (
                <p
                  className="text-xs line-clamp-2"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {linkedCard.description}
                </p>
              )}
            </div>
          </div>
        )}

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
