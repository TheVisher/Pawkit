/**
 * System Tags Utility
 *
 * Two types of system tags:
 * 1. Stored tags (real tags in card.tags array): read, reading time (e.g., "5m")
 * 2. Computed tags (virtual, based on metadata): scheduled, overdue
 *
 * Stored tags appear in the Tags page and can be filtered like any user tag.
 * Computed tags are generated at render time based on scheduledDate.
 */

import type { LucideIcon } from 'lucide-react';
import { CalendarDays, AlertTriangle, AlertCircle } from 'lucide-react';
import type { LocalCard } from '@/lib/db';

// =============================================================================
// CONSTANTS
// =============================================================================

/** Tag added when article is marked as read */
export const READ_TAG = 'read';

/** Schedule-related tags */
export const SCHEDULED_TAG = 'scheduled';
export const DUE_TODAY_TAG = 'due-today';
export const OVERDUE_TAG = 'overdue';

/** All schedule tags for easy removal */
export const ALL_SCHEDULE_TAGS = [SCHEDULED_TAG, DUE_TODAY_TAG, OVERDUE_TAG];

/** Sync conflict tag - added when card has a sync conflict */
export const CONFLICT_TAG = 'conflict';

/** Reading time tag buckets */
export const READING_TIME_BUCKETS = [
  { max: 3, label: '3m' },
  { max: 5, label: '5m' },
  { max: 8, label: '8m' },
  { max: 10, label: '10m' },
  { max: 15, label: '15m' },
  { max: 20, label: '20m' },
  { max: 25, label: '25m' },
  { max: 30, label: '30m' },
  { max: 45, label: '45m' },
  { max: Infinity, label: '60m+' },
];

// =============================================================================
// TYPES
// =============================================================================

export type SystemTagType = 'read' | 'reading-time' | 'scheduled' | 'overdue' | 'conflict';

export type SystemTagColor = 'green' | 'slate' | 'blue' | 'red' | 'amber';

export interface SystemTag {
  type: SystemTagType;
  id: string;           // Unique ID for React keys, e.g., 'read', 'time:8m', 'scheduled:12'
  label: string;        // Display text
  icon: LucideIcon;     // Icon component
  color: SystemTagColor;
  filterKey?: string;   // Filter key for click-to-filter (maps to view store)
  filterValue?: string; // Value to set when clicked
}

// =============================================================================
// COLOR SCHEMES
// =============================================================================

export const SYSTEM_TAG_COLORS: Record<SystemTagColor, { bg: string; text: string; border: string }> = {
  green: {
    bg: 'rgba(34, 197, 94, 0.15)',
    text: '#22c55e',
    border: 'rgba(34, 197, 94, 0.25)',
  },
  slate: {
    bg: 'rgba(148, 163, 184, 0.15)',
    text: '#94a3b8',
    border: 'rgba(148, 163, 184, 0.25)',
  },
  blue: {
    bg: 'rgba(59, 130, 246, 0.15)',
    text: '#3b82f6',
    border: 'rgba(59, 130, 246, 0.25)',
  },
  red: {
    bg: 'rgba(239, 68, 68, 0.15)',
    text: '#ef4444',
    border: 'rgba(239, 68, 68, 0.25)',
  },
  amber: {
    bg: 'rgba(245, 158, 11, 0.15)',
    text: '#f59e0b',
    border: 'rgba(245, 158, 11, 0.25)',
  },
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get the bucketed reading time tag for a given number of minutes
 * Returns the tag label (e.g., "5m", "10m", "60m+")
 */
export function getReadingTimeTag(minutes: number): string {
  if (minutes <= 0) return '';
  for (const bucket of READING_TIME_BUCKETS) {
    if (minutes <= bucket.max) {
      return bucket.label;
    }
  }
  return '60m+';
}

/**
 * Format reading time as a compact string (for display)
 * Uses the same bucketing as getReadingTimeTag
 */
export function formatReadingTime(minutes: number): string {
  return getReadingTimeTag(minutes);
}

/**
 * Check if a tag is a reading time tag (e.g., "5m", "10m", "60m+")
 */
export function isReadingTimeTag(tag: string): boolean {
  return READING_TIME_BUCKETS.some(bucket => bucket.label === tag);
}

/**
 * Add a stored system tag to a card's tags array
 * Returns the new tags array (does not mutate)
 */
export function addSystemTag(currentTags: string[], tag: string): string[] {
  if (currentTags.includes(tag)) return currentTags;
  return [...currentTags, tag];
}

/**
 * Remove a stored system tag from a card's tags array
 * Returns the new tags array (does not mutate)
 */
export function removeSystemTag(currentTags: string[], tag: string): string[] {
  return currentTags.filter(t => t !== tag);
}

/**
 * Remove all reading time tags from a card's tags array
 * (Useful when reading time changes and we need to update the tag)
 */
export function removeAllReadingTimeTags(currentTags: string[]): string[] {
  return currentTags.filter(t => !isReadingTimeTag(t));
}

/**
 * Update a card's tags with the correct reading time tag
 * Removes any existing reading time tags and adds the new one
 */
export function updateReadingTimeTag(currentTags: string[], readingTimeMinutes: number): string[] {
  const withoutOldTags = removeAllReadingTimeTags(currentTags);
  const newTag = getReadingTimeTag(readingTimeMinutes);
  if (!newTag) return withoutOldTags;
  return addSystemTag(withoutOldTags, newTag);
}

/**
 * Update a card's tags based on read status
 * Adds "read" tag if isRead is true, removes it if false
 */
export function updateReadTag(currentTags: string[], isRead: boolean): string[] {
  if (isRead) {
    return addSystemTag(currentTags, READ_TAG);
  }
  return removeSystemTag(currentTags, READ_TAG);
}

/**
 * Check if today matches a given date (ignoring time)
 */
export function isToday(date: Date | string): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const checkDate = new Date(date);
  checkDate.setHours(0, 0, 0, 0);
  return today.getTime() === checkDate.getTime();
}

/**
 * Check if a tag is a schedule-related tag
 */
export function isScheduleTag(tag: string): boolean {
  return ALL_SCHEDULE_TAGS.includes(tag);
}

/**
 * Check if a tag is the conflict tag
 */
export function isConflictTag(tag: string): boolean {
  return tag === CONFLICT_TAG;
}

/**
 * Add conflict tag to a card's tags array
 */
export function addConflictTag(currentTags: string[]): string[] {
  return addSystemTag(currentTags, CONFLICT_TAG);
}

/**
 * Remove conflict tag from a card's tags array
 */
export function removeConflictTag(currentTags: string[]): string[] {
  return removeSystemTag(currentTags, CONFLICT_TAG);
}

/**
 * Check if a card has the conflict tag
 */
export function hasConflictTag(tags: string[]): boolean {
  return tags.includes(CONFLICT_TAG);
}

/**
 * Remove all schedule-related tags from a card's tags array
 */
export function removeAllScheduleTags(currentTags: string[]): string[] {
  return currentTags.filter(t => !isScheduleTag(t));
}

/**
 * Get the correct schedule tag based on scheduled date
 * Returns: 'overdue' | 'due-today' | 'scheduled' | null
 */
export function getScheduleTagForDate(scheduledDate: Date | string | undefined | null): string | null {
  if (!scheduledDate) return null;

  if (isOverdue(scheduledDate)) {
    return OVERDUE_TAG;
  }
  if (isToday(scheduledDate)) {
    return DUE_TODAY_TAG;
  }
  return SCHEDULED_TAG;
}

/**
 * Update a card's tags based on scheduled date
 * Removes old schedule tags and adds the correct one based on current date
 */
export function updateScheduleTags(currentTags: string[], scheduledDate: Date | string | undefined | null): string[] {
  // Remove any existing schedule tags
  let tags = removeAllScheduleTags(currentTags);

  // Add the correct tag based on the date
  const scheduleTag = getScheduleTagForDate(scheduledDate);
  if (scheduleTag) {
    tags = addSystemTag(tags, scheduleTag);
  }

  return tags;
}

/**
 * Check if a scheduled date is overdue (in the past)
 */
export function isOverdue(scheduledDate: Date | string | undefined): boolean {
  if (!scheduledDate) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const scheduled = new Date(scheduledDate);
  scheduled.setHours(0, 0, 0, 0);
  return scheduled < today;
}

/**
 * Check if a card is a note type (doesn't have reading time)
 */
function isNoteCard(type: string): boolean {
  return type === 'md-note' || type === 'text-note';
}


// =============================================================================
// MAIN FUNCTION
// =============================================================================

/**
 * Generate system tags for a card based on its metadata
 * Returns an array of SystemTag objects to render in the footer
 *
 * NOTE: All system tags are now STORED TAGS (in card.tags array):
 * - read, reading time (3m, 5m, etc.)
 * - scheduled, due-today, overdue
 *
 * This function now returns an empty array since all tags are stored.
 * It's kept for backward compatibility but may be removed in the future.
 */
export function getSystemTagsForCard(_card: LocalCard): SystemTag[] {
  // All system tags are now stored in card.tags, so we don't compute any here
  return [];
}

/**
 * Get the effective scheduled date for a card
 * Handles both old scheduledDate (Date) and new scheduledDates (string[]) formats
 */
function getEffectiveScheduledDate(card: LocalCard): Date | string | null {
  // New format: scheduledDates is an array of ISO date strings (YYYY-MM-DD)
  if (card.scheduledDates && card.scheduledDates.length > 0) {
    // Return the earliest date for schedule tag purposes
    return card.scheduledDates[0];
  }
  // Old format: scheduledDate is a Date object
  if (card.scheduledDate) {
    return card.scheduledDate;
  }
  return null;
}

/**
 * Check if a card's schedule tags need updating
 * Returns the new tags array if update needed, or null if no update needed
 */
export function getUpdatedScheduleTagsIfNeeded(card: LocalCard): string[] | null {
  const scheduledDate = getEffectiveScheduledDate(card);

  if (!scheduledDate) {
    // No scheduled date - remove any schedule tags if present
    const hasScheduleTags = (card.tags || []).some(t => isScheduleTag(t));
    if (hasScheduleTags) {
      return removeAllScheduleTags(card.tags || []);
    }
    return null;
  }

  const currentScheduleTag = (card.tags || []).find(t => isScheduleTag(t));
  const correctScheduleTag = getScheduleTagForDate(scheduledDate);

  // If the tag is already correct, no update needed
  if (currentScheduleTag === correctScheduleTag) {
    return null;
  }

  // Update needed - return new tags
  return updateScheduleTags(card.tags || [], scheduledDate);
}
