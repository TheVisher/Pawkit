"use client";

import { useState, useEffect } from "react";
import { X, Calendar, ChevronDown, ChevronRight, MapPin, Link2, Palette, Repeat, Clock, Check } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

  // Recurrence
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
        } else {
          setRecurrenceFrequency('never');
          setRecurrenceDaysOfWeek([]);
          setRecurrenceEndType('never');
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
      className="fixed inset-0 z-[200] flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
      onClick={onClose}
    >
      <div
        className="rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto"
        style={{
          background: 'var(--bg-surface-2)',
          boxShadow: 'var(--shadow-4)',
          border: '1px solid var(--border-subtle)',
        }}
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
              <h2 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
                {isEditing ? 'Edit Event' : 'Add Event'}
              </h2>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
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
            className="p-2 rounded-xl transition-all"
            style={{
              background: 'linear-gradient(to bottom, var(--bg-surface-3) 0%, var(--bg-surface-2) 100%)',
              boxShadow: 'var(--raised-shadow-sm)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-muted)',
            }}
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
              <label htmlFor="event-title" className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                Event Title *
              </label>
              <input
                id="event-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Concert, Movie Release, Deadline..."
                className="w-full px-4 py-3 rounded-xl transition-all focus:outline-none focus:ring-2 focus:ring-purple-500"
                style={{
                  background: 'var(--bg-surface-1)',
                  boxShadow: 'var(--inset-shadow)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-primary)',
                }}
                autoFocus
                required
              />
            </div>

            {/* Date Input */}
            <div>
              <label htmlFor="event-date" className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
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
                className="w-full px-4 py-3 rounded-xl transition-all focus:outline-none focus:ring-2 focus:ring-purple-500"
                style={{
                  background: 'var(--bg-surface-1)',
                  boxShadow: 'var(--inset-shadow)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-primary)',
                }}
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
                className="relative w-11 h-6 rounded-full transition-all flex items-center"
                style={{
                  background: isMultiDay ? 'var(--ds-accent)' : 'var(--bg-surface-1)',
                  boxShadow: isMultiDay ? 'var(--raised-shadow-sm)' : 'var(--inset-shadow)',
                  border: '1px solid var(--border-subtle)',
                  padding: '2px',
                }}
              >
                <span
                  className={cn(
                    "w-4 h-4 rounded-full transition-transform",
                    isMultiDay && "translate-x-5"
                  )}
                  style={{
                    background: 'linear-gradient(to bottom, var(--bg-surface-3) 0%, var(--bg-surface-2) 100%)',
                    boxShadow: 'var(--raised-shadow-sm)',
                  }}
                />
              </button>
              <label className="text-sm" style={{ color: 'var(--text-primary)' }}>Multi-day event</label>
            </div>

            {/* End Date (shown when multi-day is enabled) */}
            {isMultiDay && (
              <div>
                <label htmlFor="event-end-date" className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                  End Date *
                </label>
                <input
                  id="event-end-date"
                  type="date"
                  value={endDate}
                  min={date}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl transition-all focus:outline-none focus:ring-2 focus:ring-purple-500"
                  style={{
                    background: 'var(--bg-surface-1)',
                    boxShadow: 'var(--inset-shadow)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-primary)',
                  }}
                  required
                />
              </div>
            )}

            {/* All Day Toggle */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsAllDay(!isAllDay)}
                className="relative w-11 h-6 rounded-full transition-all flex items-center"
                style={{
                  background: isAllDay ? 'var(--ds-accent)' : 'var(--bg-surface-1)',
                  boxShadow: isAllDay ? 'var(--raised-shadow-sm)' : 'var(--inset-shadow)',
                  border: '1px solid var(--border-subtle)',
                  padding: '2px',
                }}
              >
                <span
                  className={cn(
                    "w-4 h-4 rounded-full transition-transform",
                    isAllDay && "translate-x-5"
                  )}
                  style={{
                    background: 'linear-gradient(to bottom, var(--bg-surface-3) 0%, var(--bg-surface-2) 100%)',
                    boxShadow: 'var(--raised-shadow-sm)',
                  }}
                />
              </button>
              <label className="text-sm" style={{ color: 'var(--text-primary)' }}>All day event</label>
            </div>

            {/* Time Inputs (shown when not all day) */}
            {!isAllDay && (
              <div className="flex gap-4">
                <div className="flex-1">
                  <label htmlFor="start-time" className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                    <Clock className="inline h-4 w-4 mr-1" />
                    Start Time
                  </label>
                  <input
                    id="start-time"
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl transition-all focus:outline-none focus:ring-2 focus:ring-purple-500"
                    style={{
                      background: 'var(--bg-surface-1)',
                      boxShadow: 'var(--inset-shadow)',
                      border: '1px solid var(--border-subtle)',
                      color: 'var(--text-primary)',
                    }}
                  />
                </div>
                <div className="flex-1">
                  <label htmlFor="end-time" className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                    End Time
                  </label>
                  <input
                    id="end-time"
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl transition-all focus:outline-none focus:ring-2 focus:ring-purple-500"
                    style={{
                      background: 'var(--bg-surface-1)',
                      boxShadow: 'var(--inset-shadow)',
                      border: '1px solid var(--border-subtle)',
                      color: 'var(--text-primary)',
                    }}
                  />
                </div>
              </div>
            )}

            {/* URL Input */}
            <div>
              <label htmlFor="event-url" className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                <Link2 className="inline h-4 w-4 mr-1" />
                URL (optional)
              </label>
              <input
                id="event-url"
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://..."
                className="w-full px-4 py-3 rounded-xl transition-all focus:outline-none focus:ring-2 focus:ring-purple-500"
                style={{
                  background: 'var(--bg-surface-1)',
                  boxShadow: 'var(--inset-shadow)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>
          </div>

          {/* Section 2: Details (Collapsible) */}
          <div
            className="rounded-xl overflow-hidden"
            style={{
              background: 'linear-gradient(to bottom, var(--bg-surface-3) 0%, var(--bg-surface-2) 100%)',
              boxShadow: 'var(--raised-shadow-sm)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <button
              type="button"
              onClick={() => setDetailsOpen(!detailsOpen)}
              className="w-full px-4 py-3 flex items-center justify-between transition-colors"
              style={{ color: 'var(--text-primary)' }}
            >
              <span className="text-sm font-medium flex items-center gap-2">
                <Palette className="h-4 w-4" style={{ color: 'var(--text-muted)' }} />
                Details
              </span>
              {detailsOpen ? (
                <ChevronDown className="h-4 w-4" style={{ color: 'var(--text-muted)' }} />
              ) : (
                <ChevronRight className="h-4 w-4" style={{ color: 'var(--text-muted)' }} />
              )}
            </button>
            {detailsOpen && (
              <div className="p-4 space-y-4" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                {/* Description */}
                <div>
                  <label htmlFor="event-description" className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                    Description
                  </label>
                  <textarea
                    id="event-description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Add notes or details..."
                    rows={3}
                    className="w-full px-4 py-3 rounded-xl transition-all resize-none focus:outline-none focus:ring-2 focus:ring-purple-500"
                    style={{
                      background: 'var(--bg-surface-1)',
                      boxShadow: 'var(--inset-shadow)',
                      border: '1px solid var(--border-subtle)',
                      color: 'var(--text-primary)',
                    }}
                  />
                </div>

                {/* Location */}
                <div>
                  <label htmlFor="event-location" className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                    <MapPin className="inline h-4 w-4 mr-1" />
                    Location
                  </label>
                  <input
                    id="event-location"
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Add a location..."
                    className="w-full px-4 py-3 rounded-xl transition-all focus:outline-none focus:ring-2 focus:ring-purple-500"
                    style={{
                      background: 'var(--bg-surface-1)',
                      boxShadow: 'var(--inset-shadow)',
                      border: '1px solid var(--border-subtle)',
                      color: 'var(--text-primary)',
                    }}
                  />
                </div>

                {/* Color Picker */}
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                    Color
                  </label>
                  <div className="flex gap-2 flex-wrap">
                    {(Object.keys(EVENT_COLORS) as EventColorKey[]).map((colorKey) => (
                      <button
                        key={colorKey}
                        type="button"
                        onClick={() => setColor(colorKey)}
                        className="w-8 h-8 rounded-full transition-all"
                        style={{
                          backgroundColor: EVENT_COLORS[colorKey],
                          boxShadow: color === colorKey ? '0 0 0 2px var(--bg-surface-2), 0 0 0 4px var(--ds-accent)' : 'var(--raised-shadow-sm)',
                        }}
                        title={colorKey.charAt(0).toUpperCase() + colorKey.slice(1)}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Section 3: Recurrence - Inline Dropdown */}
          <div className="space-y-3">
            {/* Recurrence Row */}
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                <Repeat className="h-4 w-4" style={{ color: 'var(--text-muted)' }} />
                Repeat
              </label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all"
                    style={{
                      background: 'linear-gradient(to bottom, var(--bg-surface-3) 0%, var(--bg-surface-2) 100%)',
                      boxShadow: 'var(--raised-shadow-sm)',
                      border: '1px solid var(--border-subtle)',
                      color: 'var(--text-primary)',
                    }}
                  >
                    {RECURRENCE_OPTIONS.find(o => o.value === recurrenceFrequency)?.label || 'Never'}
                    <ChevronDown className="h-4 w-4" style={{ color: 'var(--text-muted)' }} />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-[140px] z-[250]">
                  {RECURRENCE_OPTIONS.map((option) => (
                    <DropdownMenuItem
                      key={option.value}
                      onClick={() => setRecurrenceFrequency(option.value as RecurrenceFrequency | 'never')}
                      className="cursor-pointer relative pl-8"
                    >
                      {recurrenceFrequency === option.value && (
                        <Check className="absolute left-2 h-4 w-4" style={{ color: 'var(--ds-accent)' }} />
                      )}
                      {option.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Additional options shown when recurrence is enabled */}
            {recurrenceFrequency !== 'never' && (
              <div
                className="rounded-xl p-4 space-y-4"
                style={{
                  background: 'var(--bg-surface-1)',
                  boxShadow: 'var(--inset-shadow)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                {/* Weekly: Day of week checkboxes */}
                {recurrenceFrequency === 'weekly' && (
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                      Repeat on
                    </label>
                    <div className="flex gap-2">
                      {WEEKDAYS.map((day) => (
                        <button
                          key={day.value}
                          type="button"
                          onClick={() => toggleDayOfWeek(day.value)}
                          className="w-9 h-9 rounded-full text-sm font-medium transition-all"
                          style={{
                            background: recurrenceDaysOfWeek.includes(day.value)
                              ? 'var(--ds-accent)'
                              : 'linear-gradient(to bottom, var(--bg-surface-3) 0%, var(--bg-surface-2) 100%)',
                            boxShadow: 'var(--raised-shadow-sm)',
                            border: '1px solid var(--border-subtle)',
                            color: recurrenceDaysOfWeek.includes(day.value) ? 'white' : 'var(--text-muted)',
                          }}
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
                    <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                      Repeat by
                    </label>
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="monthly-type"
                          checked={recurrenceMonthlyType === 'day'}
                          onChange={() => setRecurrenceMonthlyType('day')}
                          className="w-4 h-4 accent-purple-500"
                        />
                        <span className="text-sm" style={{ color: 'var(--text-primary)' }}>
                          On day {new Date(date || scheduledDate).getDate()}
                        </span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="monthly-type"
                          checked={recurrenceMonthlyType === 'weekday'}
                          onChange={() => setRecurrenceMonthlyType('weekday')}
                          className="w-4 h-4 accent-purple-500"
                        />
                        <span className="text-sm" style={{ color: 'var(--text-primary)' }}>
                          On the {getOrdinal(Math.ceil(new Date(date || scheduledDate).getDate() / 7))}{' '}
                          {format(new Date(date || scheduledDate), 'EEEE')}
                        </span>
                      </label>
                    </div>
                  </div>
                )}

                {/* Ends options */}
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                    Ends
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="recurrence-end"
                        checked={recurrenceEndType === 'never'}
                        onChange={() => setRecurrenceEndType('never')}
                        className="w-4 h-4 accent-purple-500"
                      />
                      <span className="text-sm" style={{ color: 'var(--text-primary)' }}>Never</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="recurrence-end"
                        checked={recurrenceEndType === 'on_date'}
                        onChange={() => setRecurrenceEndType('on_date')}
                        className="w-4 h-4 accent-purple-500"
                      />
                      <span className="text-sm" style={{ color: 'var(--text-primary)' }}>On date</span>
                      {recurrenceEndType === 'on_date' && (
                        <input
                          type="date"
                          value={recurrenceEndDate}
                          onChange={(e) => setRecurrenceEndDate(e.target.value)}
                          className="ml-2 px-3 py-1.5 rounded-lg text-sm transition-all focus:outline-none focus:ring-2 focus:ring-purple-500"
                          style={{
                            background: 'var(--bg-surface-1)',
                            boxShadow: 'var(--inset-shadow)',
                            border: '1px solid var(--border-subtle)',
                            color: 'var(--text-primary)',
                          }}
                        />
                      )}
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="recurrence-end"
                        checked={recurrenceEndType === 'after_count'}
                        onChange={() => setRecurrenceEndType('after_count')}
                        className="w-4 h-4 accent-purple-500"
                      />
                      <span className="text-sm" style={{ color: 'var(--text-primary)' }}>After</span>
                      {recurrenceEndType === 'after_count' && (
                        <>
                          <input
                            type="number"
                            min="1"
                            max="999"
                            value={recurrenceEndCount}
                            onChange={(e) => setRecurrenceEndCount(parseInt(e.target.value) || 1)}
                            className="ml-2 w-20 px-3 py-1.5 rounded-lg text-sm transition-all focus:outline-none focus:ring-2 focus:ring-purple-500"
                            style={{
                              background: 'var(--bg-surface-1)',
                              boxShadow: 'var(--inset-shadow)',
                              border: '1px solid var(--border-subtle)',
                              color: 'var(--text-primary)',
                            }}
                          />
                          <span className="text-sm" style={{ color: 'var(--text-primary)' }}>occurrences</span>
                        </>
                      )}
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 rounded-xl font-medium transition-all"
              style={{
                background: 'linear-gradient(to bottom, var(--bg-surface-3) 0%, var(--bg-surface-2) 100%)',
                boxShadow: 'var(--raised-shadow-sm)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-primary)',
              }}
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
