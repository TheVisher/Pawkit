"use client";

import { useState, useRef, useEffect } from "react";
import { X, AlignLeft, Clock, MapPin, Palette } from "lucide-react";
import { format } from "date-fns";
import { useEventStore } from "@/lib/hooks/use-event-store";
import { EVENT_COLORS } from "@/lib/types/calendar";

interface EventCreationFormProps {
  date: Date;
  startTime: string; // Format: "HH:MM"
  endTime?: string; // Optional pre-filled end time (from drag-to-create)
  isMultiDay?: boolean; // True if creating multi-day event
  endDate?: Date; // End date for multi-day events
  onClose: () => void;
  onSave?: () => void;
}

const COLOR_OPTIONS = [
  { name: "Purple", value: EVENT_COLORS.purple },
  { name: "Blue", value: EVENT_COLORS.blue },
  { name: "Green", value: EVENT_COLORS.green },
  { name: "Orange", value: EVENT_COLORS.orange },
  { name: "Red", value: EVENT_COLORS.red },
  { name: "Pink", value: EVENT_COLORS.pink },
];

// Helper to calculate end time (default 30 mins after start)
function calculateEndTime(start: string): string {
  const [hours, minutes] = start.split(":").map(Number);
  const totalMinutes = hours * 60 + minutes + 30;
  const endHours = Math.floor(totalMinutes / 60) % 24;
  const endMinutes = totalMinutes % 60;
  return `${endHours.toString().padStart(2, "0")}:${endMinutes.toString().padStart(2, "0")}`;
}

export function EventCreationForm({
  date,
  startTime: initialStartTime,
  endTime: initialEndTime,
  isMultiDay: initialIsMultiDay = false,
  endDate: initialEndDate,
  onClose,
  onSave,
}: EventCreationFormProps) {
  const { addEvent } = useEventStore();
  const titleInputRef = useRef<HTMLInputElement>(null);

  // Form state - use provided endTime if available, otherwise calculate default
  const [title, setTitle] = useState("");
  const [eventDate, setEventDate] = useState(format(date, "yyyy-MM-dd"));
  const [eventEndDate, setEventEndDate] = useState(
    initialEndDate ? format(initialEndDate, "yyyy-MM-dd") : format(date, "yyyy-MM-dd")
  );
  const [startTime, setStartTime] = useState(initialStartTime);
  const [endTime, setEndTime] = useState(initialEndTime || calculateEndTime(initialStartTime));
  const [isAllDay, setIsAllDay] = useState(false); // Don't auto-set to all-day anymore
  const [isMultiDay, setIsMultiDay] = useState(initialIsMultiDay);
  const [color, setColor] = useState<string>(EVENT_COLORS.purple);
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Calculate number of days for multi-day events
  const dayCount = isMultiDay && eventEndDate
    ? Math.ceil((new Date(eventEndDate).getTime() - new Date(eventDate).getTime()) / (1000 * 60 * 60 * 24)) + 1
    : 1;

  // Focus title input on mount
  useEffect(() => {
    // Small delay to ensure popover is fully rendered
    const timer = setTimeout(() => {
      titleInputRef.current?.focus();
    }, 50);
    return () => clearTimeout(timer);
  }, []);

  const handleSave = async () => {
    if (!title.trim()) {
      titleInputRef.current?.focus();
      return;
    }

    setIsSaving(true);
    try {
      if (isMultiDay && !isAllDay) {
        // Create separate events for each day with the same time
        const startDateObj = new Date(eventDate);
        const endDateObj = new Date(eventEndDate);

        for (let d = new Date(startDateObj); d <= endDateObj; d.setDate(d.getDate() + 1)) {
          await addEvent({
            title: title.trim(),
            date: format(d, "yyyy-MM-dd"),
            startTime: startTime,
            endTime: endTime,
            isAllDay: false,
            color,
            description: description.trim() || null,
            location: location.trim() || null,
          });
        }
      } else {
        // Single event (or all-day multi-day event)
        await addEvent({
          title: title.trim(),
          date: eventDate,
          endDate: isMultiDay && isAllDay ? eventEndDate : undefined,
          startTime: isAllDay ? null : startTime,
          endTime: isAllDay ? null : endTime,
          isAllDay,
          color,
          description: description.trim() || null,
          location: location.trim() || null,
        });
      }

      onSave?.();
      onClose();
    } catch (error) {
      console.error("Failed to create event:", error);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Enter key to save
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    }
  };

  return (
    <div
      className="w-[340px] rounded-xl overflow-hidden"
      style={{
        background: "rgba(30, 30, 35, 0.85)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        border: "1px solid var(--border-subtle)",
        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: "1px solid var(--border-subtle)" }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ background: color }}
          />
          <span
            className="text-sm font-medium"
            style={{ color: "var(--text-secondary)" }}
          >
            New Event
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-white/10 transition-colors"
          style={{ color: "var(--text-muted)" }}
        >
          <X size={18} />
        </button>
      </div>

      {/* Form */}
      <div className="p-4 space-y-4">
        {/* Title */}
        <div className="flex items-start gap-3">
          <AlignLeft
            size={18}
            className="mt-2.5 flex-shrink-0"
            style={{ color: "var(--text-muted)" }}
          />
          <input
            ref={titleInputRef}
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Add title"
            className="flex-1 px-3 py-2 rounded-lg text-sm focus:outline-none transition-colors"
            style={{
              background: "var(--bg-surface-1)",
              color: "var(--text-primary)",
              border: "1px solid var(--border-subtle)",
            }}
          />
        </div>

        {/* Date & Time */}
        <div className="flex items-start gap-3">
          <Clock
            size={18}
            className="mt-2.5 flex-shrink-0"
            style={{ color: "var(--text-muted)" }}
          />
          <div className="flex-1 space-y-2">
            {/* Date range for multi-day events */}
            {isMultiDay ? (
              <div className="flex gap-2 items-center">
                <input
                  type="date"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-lg text-sm focus:outline-none transition-colors"
                  style={{
                    background: "var(--bg-surface-1)",
                    color: "var(--text-primary)",
                    border: "1px solid var(--border-subtle)",
                    colorScheme: "dark",
                  }}
                />
                <span
                  className="text-sm"
                  style={{ color: "var(--text-muted)" }}
                >
                  to
                </span>
                <input
                  type="date"
                  value={eventEndDate}
                  onChange={(e) => setEventEndDate(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-lg text-sm focus:outline-none transition-colors"
                  style={{
                    background: "var(--bg-surface-1)",
                    color: "var(--text-primary)",
                    border: "1px solid var(--border-subtle)",
                    colorScheme: "dark",
                  }}
                />
              </div>
            ) : (
              /* Single date */
              <input
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none transition-colors"
                style={{
                  background: "var(--bg-surface-1)",
                  color: "var(--text-primary)",
                  border: "1px solid var(--border-subtle)",
                  colorScheme: "dark",
                }}
              />
            )}

            {/* Time row - show for all non-all-day events */}
            {!isAllDay && (
              <div className="flex gap-2">
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-lg text-sm focus:outline-none transition-colors"
                  style={{
                    background: "var(--bg-surface-1)",
                    color: "var(--text-primary)",
                    border: "1px solid var(--border-subtle)",
                    colorScheme: "dark",
                  }}
                />
                <span
                  className="self-center text-sm"
                  style={{ color: "var(--text-muted)" }}
                >
                  to
                </span>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-lg text-sm focus:outline-none transition-colors"
                  style={{
                    background: "var(--bg-surface-1)",
                    color: "var(--text-primary)",
                    border: "1px solid var(--border-subtle)",
                    colorScheme: "dark",
                  }}
                />
              </div>
            )}

            {/* All day toggle */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isAllDay}
                onChange={(e) => setIsAllDay(e.target.checked)}
                className="rounded"
                style={{ accentColor: "var(--ds-accent)" }}
              />
              <span
                className="text-sm"
                style={{ color: "var(--text-secondary)" }}
              >
                All day
              </span>
            </label>

            {/* Multi-day info */}
            {isMultiDay && (
              <div
                className="text-xs p-2 rounded-md"
                style={{
                  background: "var(--ds-accent-subtle)",
                  color: "var(--text-secondary)",
                }}
              >
                {isAllDay
                  ? `Creates 1 all-day event spanning ${dayCount} days`
                  : `Creates ${dayCount} events (one per day at ${startTime})`}
              </div>
            )}
          </div>
        </div>

        {/* Color */}
        <div className="flex items-start gap-3">
          <Palette
            size={18}
            className="mt-2.5 flex-shrink-0"
            style={{ color: "var(--text-muted)" }}
          />
          <div className="flex-1">
            <div className="flex gap-2">
              {COLOR_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setColor(opt.value)}
                  className={`w-6 h-6 rounded-full transition-transform ${
                    color === opt.value ? "scale-110 ring-2 ring-white/30" : ""
                  }`}
                  style={{ background: opt.value }}
                  title={opt.name}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Location */}
        <div className="flex items-start gap-3">
          <MapPin
            size={18}
            className="mt-2.5 flex-shrink-0"
            style={{ color: "var(--text-muted)" }}
          />
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Add location"
            className="flex-1 px-3 py-2 rounded-lg text-sm focus:outline-none transition-colors"
            style={{
              background: "var(--bg-surface-1)",
              color: "var(--text-primary)",
              border: "1px solid var(--border-subtle)",
            }}
          />
        </div>

        {/* Description */}
        <div className="flex items-start gap-3">
          <AlignLeft
            size={18}
            className="mt-2.5 flex-shrink-0"
            style={{ color: "var(--text-muted)" }}
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add description"
            rows={2}
            className="flex-1 px-3 py-2 rounded-lg text-sm focus:outline-none resize-none transition-colors"
            style={{
              background: "var(--bg-surface-1)",
              color: "var(--text-primary)",
              border: "1px solid var(--border-subtle)",
            }}
          />
        </div>
      </div>

      {/* Footer */}
      <div
        className="flex justify-end gap-2 px-4 py-3"
        style={{ borderTop: "1px solid var(--border-subtle)" }}
      >
        <button
          onClick={onClose}
          className="px-4 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-white/10"
          style={{ color: "var(--text-secondary)" }}
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          style={{
            background: "var(--ds-accent)",
            color: "white",
          }}
        >
          {isSaving ? "Saving..." : "Save"}
        </button>
      </div>
    </div>
  );
}
