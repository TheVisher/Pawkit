/**
 * Calendar Event Types
 *
 * Rich event system with support for:
 * - All-day and timed events
 * - Recurrence patterns (daily, weekly, monthly, yearly)
 * - Color categorization
 * - Source tracking for future bookmark date extraction
 */

// Recurrence frequency options
export type RecurrenceFrequency = 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'yearly';

// Recurrence configuration
export interface EventRecurrence {
  frequency: RecurrenceFrequency;
  interval: number;              // Every X periods (default 1)
  daysOfWeek?: number[];         // 0=Sun, 1=Mon, etc. for weekly
  dayOfMonth?: number;           // 1-31 for monthly by date
  weekOfMonth?: number;          // 1-5 for "3rd Friday" patterns
  endDate?: string | null;       // YYYY-MM-DD when recurrence stops
  endCount?: number | null;      // OR stop after X occurrences
}

// Source tracking for future bookmark date extraction
export interface EventSource {
  type: 'manual' | 'card' | 'note';
  cardId?: string;
  noteId?: string;
}

// Main CalendarEvent type
export interface CalendarEvent {
  id: string;
  userId: string;
  title: string;

  // Date/Time
  date: string;                  // YYYY-MM-DD (start date)
  endDate?: string | null;       // YYYY-MM-DD (end date for multi-day events)
  startTime?: string | null;     // HH:mm format (null = all day)
  endTime?: string | null;       // HH:mm format
  isAllDay: boolean;

  // Details
  description?: string | null;
  location?: string | null;
  url?: string | null;
  color?: string | null;         // hex color for visual categorization

  // Recurrence
  recurrence?: EventRecurrence | null;
  recurrenceParentId?: string | null;  // Links generated instances to parent
  excludedDates?: string[];            // YYYY-MM-DD dates to skip in recurrence
  isException?: boolean;               // True if this is a modified instance of a recurring event

  // Source tracking (for future bookmark date extraction)
  source?: EventSource | null;

  // Sync flags (for local-first architecture)
  _locallyModified?: boolean;
  _locallyCreated?: boolean;
  _serverVersion?: string;

  // Metadata
  createdAt: string;
  updatedAt: string;
  deleted?: boolean;
  deletedAt?: string | null;
}

// Event color presets
export const EVENT_COLORS = {
  red: '#ef4444',
  orange: '#f97316',
  yellow: '#eab308',
  green: '#22c55e',
  blue: '#3b82f6',
  purple: '#a855f7',  // Default/accent color
  pink: '#ec4899',
  gray: '#6b7280',
} as const;

export type EventColorKey = keyof typeof EVENT_COLORS;

// Helper type for creating a new event
export type NewCalendarEvent = Omit<CalendarEvent, 'id' | 'userId' | 'createdAt' | 'updatedAt'>;

// Helper type for updating an event
export type CalendarEventUpdate = Partial<Omit<CalendarEvent, 'id' | 'userId' | 'createdAt'>>;

// Generated recurrence instance (virtual, not stored)
export interface RecurrenceInstance {
  event: CalendarEvent;
  instanceDate: string;          // YYYY-MM-DD of this instance
  isOriginal: boolean;           // true if this is the parent event's original date
}

// Recurrence edit scope options
export type RecurrenceEditScope = 'this' | 'this_and_future' | 'all';
