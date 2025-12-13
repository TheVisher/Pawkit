/**
 * Time Grid Utilities
 * Utility functions for the calendar week view time grid layout
 */

import { CalendarEvent } from "@/lib/types/calendar";

// Constants
export const HOUR_HEIGHT = 60; // 60px per hour
export const GRID_HEIGHT = 24 * HOUR_HEIGHT; // 1440px total (24 hours)
export const TIME_LABEL_WIDTH = 60; // Width of time labels column
export const MIN_EVENT_HEIGHT = 20; // Minimum height for very short events

/**
 * Convert time string (HH:mm) to minutes from midnight
 * @param time - Time in HH:mm format (e.g., "09:30")
 * @returns Minutes from midnight (e.g., 570)
 */
export function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

/**
 * Convert minutes from midnight to pixels from top of grid
 * @param minutes - Minutes from midnight
 * @param hourHeight - Height of one hour in pixels
 * @returns Pixel offset from top
 */
export function minutesToPixels(minutes: number, hourHeight: number = HOUR_HEIGHT): number {
  return (minutes / 60) * hourHeight;
}

/**
 * Get duration between two times in minutes
 * @param startTime - Start time in HH:mm format
 * @param endTime - End time in HH:mm format
 * @returns Duration in minutes
 */
export function getEventDuration(startTime: string, endTime: string): number {
  const start = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);

  // Handle events that cross midnight (end < start)
  if (end < start) {
    return (24 * 60 - start) + end;
  }

  return end - start;
}

/**
 * Format time in 12-hour format
 * @param time24 - Time in HH:mm format
 * @returns Formatted time (e.g., "9:30 AM")
 */
export function formatTime12h(time24: string): string {
  const [hours, minutes] = time24.split(":").map(Number);
  const period = hours >= 12 ? "PM" : "AM";
  const hours12 = hours % 12 || 12;
  return `${hours12}:${minutes.toString().padStart(2, "0")} ${period}`;
}

/**
 * Format hour label for time grid
 * @param hour - Hour (0-23)
 * @returns Formatted hour label (e.g., "9 AM", "12 PM")
 */
export function formatHourLabel(hour: number): string {
  if (hour === 0) return "12 AM";
  if (hour === 12) return "12 PM";
  const period = hour >= 12 ? "PM" : "AM";
  const hours12 = hour % 12;
  return `${hours12} ${period}`;
}

// ============================================
// Event Positioning Types and Functions
// ============================================

export interface PositionedEvent {
  event: CalendarEvent;
  top: number; // Pixels from top of grid
  height: number; // Pixels
  left: string; // Percentage (for overlap handling)
  width: string; // Percentage (for overlap handling)
  column: number; // Column index in collision group
  totalColumns: number; // Total columns in collision group
}

interface TimeRange {
  eventId: string;
  start: number; // Minutes from midnight
  end: number; // Minutes from midnight
  event: CalendarEvent;
}

/**
 * Detect overlapping events and group them together
 * Uses a sweep line algorithm to find collision groups
 */
export function detectOverlaps(events: CalendarEvent[]): CalendarEvent[][] {
  if (events.length === 0) return [];
  if (events.length === 1) return [[events[0]]];

  // Convert events to time ranges
  const ranges: TimeRange[] = events
    .filter((e) => e.startTime) // Only process timed events
    .map((e) => ({
      eventId: e.id,
      start: timeToMinutes(e.startTime!),
      end: e.endTime ? timeToMinutes(e.endTime) : timeToMinutes(e.startTime!) + 60, // Default 1 hour
      event: e,
    }));

  // Sort by start time
  ranges.sort((a, b) => a.start - b.start);

  // Group overlapping events
  const groups: CalendarEvent[][] = [];
  let currentGroup: CalendarEvent[] = [];
  let currentEnd = -1;

  for (const range of ranges) {
    if (currentGroup.length === 0 || range.start < currentEnd) {
      // Overlaps with current group (or first event)
      currentGroup.push(range.event);
      currentEnd = Math.max(currentEnd, range.end);
    } else {
      // No overlap - start new group
      if (currentGroup.length > 0) {
        groups.push([...currentGroup]);
      }
      currentGroup = [range.event];
      currentEnd = range.end;
    }
  }

  // Don't forget the last group
  if (currentGroup.length > 0) {
    groups.push(currentGroup);
  }

  return groups;
}

/**
 * Assign column positions to events within an overlap group
 * Returns a map of event ID to column info
 */
export function assignColumns(events: CalendarEvent[]): Map<string, { column: number; total: number }> {
  const result = new Map<string, { column: number; total: number }>();

  if (events.length === 0) return result;
  if (events.length === 1) {
    result.set(events[0].id, { column: 0, total: 1 });
    return result;
  }

  // Sort by start time
  const sorted = [...events].sort((a, b) => {
    const aStart = a.startTime ? timeToMinutes(a.startTime) : 0;
    const bStart = b.startTime ? timeToMinutes(b.startTime) : 0;
    return aStart - bStart;
  });

  // Track end times for each column
  const columns: number[] = [];

  for (const event of sorted) {
    const start = event.startTime ? timeToMinutes(event.startTime) : 0;
    const end = event.endTime ? timeToMinutes(event.endTime) : start + 60;

    // Find first available column (where end time <= start)
    let col = columns.findIndex((endTime) => endTime <= start);

    if (col === -1) {
      // No available column, create new one
      col = columns.length;
      columns.push(end);
    } else {
      // Use existing column
      columns[col] = end;
    }

    result.set(event.id, { column: col, total: 0 }); // total updated below
  }

  // Update total columns for all events in group
  const maxCol = Math.max(...Array.from(result.values()).map((v) => v.column)) + 1;
  for (const [id, val] of result) {
    result.set(id, { ...val, total: maxCol });
  }

  return result;
}

/**
 * Position all events for a single day
 * Handles overlap detection and column assignment
 */
export function positionEvents(
  events: CalendarEvent[],
  hourHeight: number = HOUR_HEIGHT
): PositionedEvent[] {
  // Filter to only timed events (not all-day)
  const timedEvents = events.filter((e) => !e.isAllDay && e.startTime);

  if (timedEvents.length === 0) return [];

  // Detect overlap groups
  const overlapGroups = detectOverlaps(timedEvents);

  // Build positioned events
  const positioned: PositionedEvent[] = [];

  for (const group of overlapGroups) {
    // Assign columns within this group
    const columnMap = assignColumns(group);

    for (const event of group) {
      const startMinutes = event.startTime ? timeToMinutes(event.startTime) : 0;
      const endMinutes = event.endTime
        ? timeToMinutes(event.endTime)
        : startMinutes + 60; // Default 1 hour duration

      const duration = endMinutes - startMinutes;
      const columnInfo = columnMap.get(event.id) || { column: 0, total: 1 };

      // Calculate pixel positions
      const top = minutesToPixels(startMinutes, hourHeight);
      const height = Math.max(minutesToPixels(duration, hourHeight), MIN_EVENT_HEIGHT);

      // Calculate percentage positions for overlap handling
      const widthPercent = 100 / columnInfo.total;
      const leftPercent = columnInfo.column * widthPercent;

      positioned.push({
        event,
        top,
        height,
        left: `${leftPercent}%`,
        width: `${widthPercent}%`,
        column: columnInfo.column,
        totalColumns: columnInfo.total,
      });
    }
  }

  return positioned;
}

/**
 * Get current time position in pixels
 * @param hourHeight - Height of one hour in pixels
 * @returns Pixel offset from top for current time
 */
export function getCurrentTimePosition(hourHeight: number = HOUR_HEIGHT): number {
  const now = new Date();
  const minutes = now.getHours() * 60 + now.getMinutes();
  return minutesToPixels(minutes, hourHeight);
}

/**
 * Get scroll position to center current time in view
 * @param viewHeight - Height of the visible viewport
 * @param hourHeight - Height of one hour in pixels
 * @returns Scroll position to center current time
 */
export function getScrollToCurrentTime(viewHeight: number, hourHeight: number = HOUR_HEIGHT): number {
  const currentPosition = getCurrentTimePosition(hourHeight);
  const scrollTo = currentPosition - viewHeight / 2;
  return Math.max(0, Math.min(scrollTo, GRID_HEIGHT - viewHeight));
}
