/**
 * Expand Recurring Events
 * Generates event occurrences for a date range based on recurrence rules
 */

import {
  addDays,
  addWeeks,
  addMonths,
  addYears,
  format,
  parseISO,
  isBefore,
  isAfter,
  isSameDay,
} from 'date-fns';
import type { LocalCalendarEvent } from '@/lib/db/types';

export interface ExpandedEvent extends LocalCalendarEvent {
  // The original recurring event ID (for editing the series)
  originalEventId?: string;
  // Whether this is a generated occurrence (vs the original event)
  isOccurrence?: boolean;
  // The occurrence date (may differ from original event.date)
  occurrenceDate: string;
}

/**
 * Get the next occurrence date based on recurrence frequency
 */
function getNextOccurrence(
  currentDate: Date,
  freq: 'daily' | 'weekly' | 'monthly' | 'yearly',
  interval: number
): Date {
  switch (freq) {
    case 'daily':
      return addDays(currentDate, interval);
    case 'weekly':
      return addWeeks(currentDate, interval);
    case 'monthly':
      return addMonths(currentDate, interval);
    case 'yearly':
      return addYears(currentDate, interval);
    default:
      return addDays(currentDate, interval);
  }
}

/**
 * Expand a single recurring event into occurrences for a date range
 */
export function expandRecurringEvent(
  event: LocalCalendarEvent,
  rangeStart: Date,
  rangeEnd: Date
): ExpandedEvent[] {
  const occurrences: ExpandedEvent[] = [];
  const eventDate = parseISO(event.date);
  const excludedDatesSet = new Set(event.excludedDates || []);

  // If event has no recurrence, just return it if in range
  if (!event.recurrence) {
    if (!isBefore(eventDate, rangeStart) && !isAfter(eventDate, rangeEnd)) {
      occurrences.push({
        ...event,
        occurrenceDate: event.date,
      });
    }
    return occurrences;
  }

  const { freq, interval, until, count } = event.recurrence;
  const untilDate = until ? parseISO(until) : null;

  let currentDate = eventDate;
  let occurrenceCount = 0;
  const maxOccurrences = count || 1000; // Safety limit

  // Generate occurrences starting from the event's original date
  while (occurrenceCount < maxOccurrences) {
    // Stop if we've passed the range end
    if (isAfter(currentDate, rangeEnd)) {
      break;
    }

    // Stop if we've passed the until date
    if (untilDate && isAfter(currentDate, untilDate)) {
      break;
    }

    // Only add if within range and not excluded
    const dateStr = format(currentDate, 'yyyy-MM-dd');
    if (
      !isBefore(currentDate, rangeStart) &&
      !isAfter(currentDate, rangeEnd) &&
      !excludedDatesSet.has(dateStr)
    ) {
      occurrences.push({
        ...event,
        originalEventId: event.id,
        isOccurrence: !isSameDay(currentDate, eventDate),
        occurrenceDate: dateStr,
      });
    }

    // Move to next occurrence
    currentDate = getNextOccurrence(currentDate, freq, interval);
    occurrenceCount++;
  }

  return occurrences;
}

/**
 * Expand all recurring events for a date range
 */
export function expandRecurringEvents(
  events: LocalCalendarEvent[],
  rangeStart: Date,
  rangeEnd: Date
): ExpandedEvent[] {
  const allOccurrences: ExpandedEvent[] = [];

  for (const event of events) {
    const occurrences = expandRecurringEvent(event, rangeStart, rangeEnd);
    allOccurrences.push(...occurrences);
  }

  // Sort by date
  allOccurrences.sort((a, b) => a.occurrenceDate.localeCompare(b.occurrenceDate));

  return allOccurrences;
}
