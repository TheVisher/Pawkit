"use client";

import { useState, useEffect } from "react";
import { X, Calendar, ChevronDown, ChevronRight, MapPin, Link2, Palette, Repeat, Clock } from "lucide-react";
import { useEventStore } from "@/lib/hooks/use-event-store";
import { GlowButton } from "@/components/ui/glow-button";
import {
  CalendarEvent,
  RecurrenceFrequency,
  EventRecurrence,
  EVENT_COLORS,
  EventColorKey,
} from "@/lib/types/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

type AddEventModalProps = {
  open: boolean;
  onClose: () => void;
  scheduledDate: Date;
  editingEvent?: CalendarEvent | null;
};

type RecurrenceEndType = 'never' | 'on_date' | 'after_count';

const WEEKDAYS = [
  { label: 'S', value: 0 },
  { label: 'M', value: 1 },
  { label: 'T', value: 2 },
  { label: 'W', value: 3 },
  { label: 'T', value: 4 },
  { label: 'F', value: 5 },
  { label: 'S', value: 6 },
];

const RECURRENCE_OPTIONS: { value: RecurrenceFrequency | 'never' | 'custom'; label: string }[] = [
  { value: 'never', label: 'Never' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Bi-weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
];

export function AddEventModal({ open, onClose, scheduledDate, editingEvent }: AddEventModalProps) {
  const { addEvent, updateEvent } = useEventStore();

  // Basic info
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [isMultiDay, setIsMultiDay] = useState(false);
  const [endDate, setEndDate] = useState("");
  const [isAllDay, setIsAllDay] = useState(true);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [url, setUrl] = useState("");

  // Details (collapsible)
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [color, setColor] = useState<EventColorKey>("purple");

  // Recurrence (collapsible)
  const [recurrenceOpen, setRecurrenceOpen] = useState(false);
  const [recurrenceFrequency, setRecurrenceFrequency] = useState<RecurrenceFrequency | 'never'>('never');
  const [recurrenceDaysOfWeek, setRecurrenceDaysOfWeek] = useState<number[]>([]);
  const [recurrenceMonthlyType, setRecurrenceMonthlyType] = useState<'day' | 'weekday'>('day');
  const [recurrenceEndType, setRecurrenceEndType] = useState<RecurrenceEndType>('never');
  const [recurrenceEndDate, setRecurrenceEndDate] = useState("");
  const [recurrenceEndCount, setRecurrenceEndCount] = useState(10);

  const [isLoading, setIsLoading] = useState(false);

  const isEditing = !!editingEvent;

  // Reset/populate form when modal opens
  useEffect(() => {
    if (open) {
      if (editingEvent) {
        // Editing existing event
        setTitle(editingEvent.title);
        setDate(editingEvent.date);
        setIsMultiDay(!!editingEvent.endDate && editingEvent.endDate !== editingEvent.date);
        setEndDate(editingEvent.endDate || "");
        setIsAllDay(editingEvent.isAllDay);
        setStartTime(editingEvent.startTime || "09:00");
        setEndTime(editingEvent.endTime || "10:00");
        setUrl(editingEvent.url || "");
        setDescription(editingEvent.description || "");
        setLocation(editingEvent.location || "");
        setColor((Object.entries(EVENT_COLORS).find(([, hex]) => hex === editingEvent.color)?.[0] as EventColorKey) || "purple");

        if (editingEvent.recurrence) {
          setRecurrenceFrequency(editingEvent.recurrence.frequency);
          setRecurrenceDaysOfWeek(editingEvent.recurrence.daysOfWeek || []);
          setRecurrenceMonthlyType(editingEvent.recurrence.weekOfMonth ? 'weekday' : 'day');
          if (editingEvent.recurrence.endDate) {
            setRecurrenceEndType('on_date');
            setRecurrenceEndDate(editingEvent.recurrence.endDate);
          } else if (editingEvent.recurrence.endCount) {
            setRecurrenceEndType('after_count');
            setRecurrenceEndCount(editingEvent.recurrence.endCount);
          } else {
            setRecurrenceEndType('never');
          }
          setRecurrenceOpen(true);
        } else {
          setRecurrenceFrequency('never');
          setRecurrenceDaysOfWeek([]);
          setRecurrenceEndType('never');
          setRecurrenceOpen(false);
        }

        // Open details if there's content
        if (editingEvent.description || editingEvent.location || (editingEvent.color && editingEvent.color !== EVENT_COLORS.purple)) {
          setDetailsOpen(true);
        } else {
          setDetailsOpen(false);
        }
      } else {
        // New event
        setTitle("");
        setDate(format(scheduledDate, 'yyyy-MM-dd'));
        setIsMultiDay(false);
        setEndDate("");
        setIsAllDay(true);
        setStartTime("09:00");
        setEndTime("10:00");
        setUrl("");
        setDescription("");
        setLocation("");
        setColor("purple");
        setRecurrenceFrequency('never');
        setRecurrenceDaysOfWeek([]);
        setRecurrenceMonthlyType('day');
        setRecurrenceEndType('never');
        setRecurrenceEndDate("");
        setRecurrenceEndCount(10);
        setDetailsOpen(false);
        setRecurrenceOpen(false);
      }
      setIsLoading(false);
    }
  }, [open, scheduledDate, editingEvent]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !date) return;

    setIsLoading(true);

    try {
      // Build recurrence object
      let recurrence: EventRecurrence | null = null;
      if (recurrenceFrequency !== 'never') {
        recurrence = {
          frequency: recurrenceFrequency,
          interval: 1,
          daysOfWeek: recurrenceFrequency === 'weekly' ? recurrenceDaysOfWeek : undefined,
          dayOfMonth: recurrenceFrequency === 'monthly' && recurrenceMonthlyType === 'day' ? new Date(date).getDate() : undefined,
          weekOfMonth: recurrenceFrequency === 'monthly' && recurrenceMonthlyType === 'weekday' ? Math.ceil(new Date(date).getDate() / 7) : undefined,
          endDate: recurrenceEndType === 'on_date' ? recurrenceEndDate : null,
          endCount: recurrenceEndType === 'after_count' ? recurrenceEndCount : null,
        };
      }

      const eventData: Partial<CalendarEvent> = {
        title: title.trim(),
        date,
        endDate: isMultiDay && endDate ? endDate : null,
        isAllDay,
        startTime: isAllDay ? null : startTime,
        endTime: isAllDay ? null : endTime,
        url: url.trim() || null,
        description: description.trim() || null,
        location: location.trim() || null,
        color: EVENT_COLORS[color],
        recurrence,
      };

      if (isEditing && editingEvent) {
        await updateEvent(editingEvent.id, eventData);
      } else {
        await addEvent(eventData);
      }

      onClose();
    } catch (error) {
      console.error('Failed to save event:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  const toggleDayOfWeek = (day: number) => {
    setRecurrenceDaysOfWeek(prev =>
      prev.includes(day)
        ? prev.filter(d => d !== day)
        : [...prev, day]
    );
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-lg p-6 w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
              <Calendar className="h-5 w-5 text-accent" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground">
                {isEditing ? 'Edit Event' : 'Add Event'}
              </h2>
              <p className="text-sm text-muted-foreground">
                {scheduledDate.toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                })}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors text-muted-foreground hover:text-foreground"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Section 1: Basic Info */}
          <div className="space-y-4">
            {/* Title Input */}
            <div>
              <label htmlFor="event-title" className="block text-sm font-medium text-foreground mb-2">
                Event Title *
              </label>
              <input
                id="event-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Concert, Movie Release, Deadline..."
                className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10
                  text-foreground placeholder:text-muted-foreground
                  focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent
                  transition-all"
                autoFocus
                required
              />
            </div>

            {/* Date Input */}
            <div>
              <label htmlFor="event-date" className="block text-sm font-medium text-foreground mb-2">
                {isMultiDay ? 'Start Date *' : 'Date *'}
              </label>
              <input
                id="event-date"
                type="date"
                value={date}
                onChange={(e) => {
                  setDate(e.target.value);
                  // If end date is before start date, update it
                  if (endDate && e.target.value > endDate) {
                    setEndDate(e.target.value);
                  }
                }}
                className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10
                  text-foreground
                  focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent
                  transition-all [color-scheme:dark]"
                required
              />
            </div>

            {/* Multi-Day Toggle */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setIsMultiDay(!isMultiDay);
                  if (!isMultiDay && !endDate) {
                    // Set default end date to start date when enabling multi-day
                    setEndDate(date);
                  }
                }}
                className={cn(
                  "relative w-11 h-6 rounded-full transition-colors",
                  isMultiDay ? "bg-accent" : "bg-white/10"
                )}
              >
                <span
                  className={cn(
                    "absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform",
                    isMultiDay && "translate-x-5"
                  )}
                />
              </button>
              <label className="text-sm text-foreground">Multi-day event</label>
            </div>

            {/* End Date (shown when multi-day is enabled) */}
            {isMultiDay && (
              <div>
                <label htmlFor="event-end-date" className="block text-sm font-medium text-foreground mb-2">
                  End Date *
                </label>
                <input
                  id="event-end-date"
                  type="date"
                  value={endDate}
                  min={date}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10
                    text-foreground
                    focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent
                    transition-all [color-scheme:dark]"
                  required
                />
              </div>
            )}

            {/* All Day Toggle */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsAllDay(!isAllDay)}
                className={cn(
                  "relative w-11 h-6 rounded-full transition-colors",
                  isAllDay ? "bg-accent" : "bg-white/10"
                )}
              >
                <span
                  className={cn(
                    "absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform",
                    isAllDay && "translate-x-5"
                  )}
                />
              </button>
              <label className="text-sm text-foreground">All day event</label>
            </div>

            {/* Time Inputs (shown when not all day) */}
            {!isAllDay && (
              <div className="flex gap-4">
                <div className="flex-1">
                  <label htmlFor="start-time" className="block text-sm font-medium text-foreground mb-2">
                    <Clock className="inline h-4 w-4 mr-1" />
                    Start Time
                  </label>
                  <input
                    id="start-time"
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10
                      text-foreground
                      focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent
                      transition-all [color-scheme:dark]"
                  />
                </div>
                <div className="flex-1">
                  <label htmlFor="end-time" className="block text-sm font-medium text-foreground mb-2">
                    End Time
                  </label>
                  <input
                    id="end-time"
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10
                      text-foreground
                      focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent
                      transition-all [color-scheme:dark]"
                  />
                </div>
              </div>
            )}

            {/* URL Input */}
            <div>
              <label htmlFor="event-url" className="block text-sm font-medium text-foreground mb-2">
                <Link2 className="inline h-4 w-4 mr-1" />
                URL (optional)
              </label>
              <input
                id="event-url"
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://..."
                className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10
                  text-foreground placeholder:text-muted-foreground
                  focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent
                  transition-all"
              />
            </div>
          </div>

          {/* Section 2: Details (Collapsible) */}
          <div className="border border-white/10 rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => setDetailsOpen(!detailsOpen)}
              className="w-full px-4 py-3 flex items-center justify-between bg-white/5 hover:bg-white/10 transition-colors"
            >
              <span className="text-sm font-medium text-foreground flex items-center gap-2">
                <Palette className="h-4 w-4 text-muted-foreground" />
                Details
              </span>
              {detailsOpen ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
            </button>
            {detailsOpen && (
              <div className="p-4 space-y-4 border-t border-white/10">
                {/* Description */}
                <div>
                  <label htmlFor="event-description" className="block text-sm font-medium text-foreground mb-2">
                    Description
                  </label>
                  <textarea
                    id="event-description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Add notes or details..."
                    rows={3}
                    className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10
                      text-foreground placeholder:text-muted-foreground
                      focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent
                      transition-all resize-none"
                  />
                </div>

                {/* Location */}
                <div>
                  <label htmlFor="event-location" className="block text-sm font-medium text-foreground mb-2">
                    <MapPin className="inline h-4 w-4 mr-1" />
                    Location
                  </label>
                  <input
                    id="event-location"
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Add a location..."
                    className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10
                      text-foreground placeholder:text-muted-foreground
                      focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent
                      transition-all"
                  />
                </div>

                {/* Color Picker */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Color
                  </label>
                  <div className="flex gap-2 flex-wrap">
                    {(Object.keys(EVENT_COLORS) as EventColorKey[]).map((colorKey) => (
                      <button
                        key={colorKey}
                        type="button"
                        onClick={() => setColor(colorKey)}
                        className={cn(
                          "w-8 h-8 rounded-full transition-all",
                          color === colorKey && "ring-2 ring-white ring-offset-2 ring-offset-transparent"
                        )}
                        style={{ backgroundColor: EVENT_COLORS[colorKey] }}
                        title={colorKey.charAt(0).toUpperCase() + colorKey.slice(1)}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Section 3: Recurrence (Collapsible) */}
          <div className="border border-white/10 rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => setRecurrenceOpen(!recurrenceOpen)}
              className="w-full px-4 py-3 flex items-center justify-between bg-white/5 hover:bg-white/10 transition-colors"
            >
              <span className="text-sm font-medium text-foreground flex items-center gap-2">
                <Repeat className="h-4 w-4 text-muted-foreground" />
                Recurrence
                {recurrenceFrequency !== 'never' && (
                  <span className="text-xs text-accent bg-accent/10 px-2 py-0.5 rounded-full">
                    {RECURRENCE_OPTIONS.find(o => o.value === recurrenceFrequency)?.label}
                  </span>
                )}
              </span>
              {recurrenceOpen ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
            </button>
            {recurrenceOpen && (
              <div className="p-4 space-y-4 border-t border-white/10">
                {/* Repeat Dropdown */}
                <div>
                  <label htmlFor="recurrence-frequency" className="block text-sm font-medium text-foreground mb-2">
                    Repeat
                  </label>
                  <select
                    id="recurrence-frequency"
                    value={recurrenceFrequency}
                    onChange={(e) => setRecurrenceFrequency(e.target.value as RecurrenceFrequency | 'never')}
                    className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10
                      text-foreground
                      focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent
                      transition-all [color-scheme:dark]"
                  >
                    {RECURRENCE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Weekly: Day of week checkboxes */}
                {recurrenceFrequency === 'weekly' && (
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Repeat on
                    </label>
                    <div className="flex gap-2">
                      {WEEKDAYS.map((day) => (
                        <button
                          key={day.value}
                          type="button"
                          onClick={() => toggleDayOfWeek(day.value)}
                          className={cn(
                            "w-9 h-9 rounded-full text-sm font-medium transition-all",
                            recurrenceDaysOfWeek.includes(day.value)
                              ? "bg-accent text-white"
                              : "bg-white/5 text-muted-foreground hover:bg-white/10"
                          )}
                        >
                          {day.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Monthly: Day vs Weekday */}
                {recurrenceFrequency === 'monthly' && (
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Repeat by
                    </label>
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="monthly-type"
                          checked={recurrenceMonthlyType === 'day'}
                          onChange={() => setRecurrenceMonthlyType('day')}
                          className="w-4 h-4 text-accent"
                        />
                        <span className="text-sm text-foreground">
                          On day {new Date(date || scheduledDate).getDate()}
                        </span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="monthly-type"
                          checked={recurrenceMonthlyType === 'weekday'}
                          onChange={() => setRecurrenceMonthlyType('weekday')}
                          className="w-4 h-4 text-accent"
                        />
                        <span className="text-sm text-foreground">
                          On the {getOrdinal(Math.ceil(new Date(date || scheduledDate).getDate() / 7))}{' '}
                          {format(new Date(date || scheduledDate), 'EEEE')}
                        </span>
                      </label>
                    </div>
                  </div>
                )}

                {/* Ends options */}
                {recurrenceFrequency !== 'never' && (
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Ends
                    </label>
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="recurrence-end"
                          checked={recurrenceEndType === 'never'}
                          onChange={() => setRecurrenceEndType('never')}
                          className="w-4 h-4 text-accent"
                        />
                        <span className="text-sm text-foreground">Never</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="recurrence-end"
                          checked={recurrenceEndType === 'on_date'}
                          onChange={() => setRecurrenceEndType('on_date')}
                          className="w-4 h-4 text-accent"
                        />
                        <span className="text-sm text-foreground">On date</span>
                        {recurrenceEndType === 'on_date' && (
                          <input
                            type="date"
                            value={recurrenceEndDate}
                            onChange={(e) => setRecurrenceEndDate(e.target.value)}
                            className="ml-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10
                              text-foreground text-sm
                              focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent
                              transition-all [color-scheme:dark]"
                          />
                        )}
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="recurrence-end"
                          checked={recurrenceEndType === 'after_count'}
                          onChange={() => setRecurrenceEndType('after_count')}
                          className="w-4 h-4 text-accent"
                        />
                        <span className="text-sm text-foreground">After</span>
                        {recurrenceEndType === 'after_count' && (
                          <>
                            <input
                              type="number"
                              min="1"
                              max="999"
                              value={recurrenceEndCount}
                              onChange={(e) => setRecurrenceEndCount(parseInt(e.target.value) || 1)}
                              className="ml-2 w-20 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10
                                text-foreground text-sm
                                focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent
                                transition-all"
                            />
                            <span className="text-sm text-foreground">occurrences</span>
                          </>
                        )}
                      </label>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 rounded-lg bg-white/5 border border-white/10
                hover:bg-white/10 transition-colors text-foreground font-medium"
            >
              Cancel
            </button>
            <GlowButton
              type="submit"
              variant="primary"
              size="md"
              disabled={!title.trim() || !date || isLoading}
              className="flex-1"
            >
              {isLoading ? (isEditing ? "Saving..." : "Adding...") : (isEditing ? "Save Event" : "Add Event")}
            </GlowButton>
          </div>
        </form>
      </div>
    </div>
  );
}

// Helper function for ordinal numbers
function getOrdinal(n: number): string {
  const suffixes = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0]);
}
