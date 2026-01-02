/**
 * Date Tag Utilities
 *
 * Handles date-based tags for scheduling cards via tags instead of
 * dedicated scheduledDate fields.
 *
 * Format: ISO 8601 date strings as tags
 * - Date: "2026-01-30" (YYYY-MM-DD)
 * - Time: "time-14-00" (time-HH-MM)
 *
 * See: .claude/skills/pawkit-tag-architecture/SKILL.md
 */

// =============================================================================
// PATTERNS
// =============================================================================

/** ISO date tag pattern: 2026-01-30 */
export const DATE_TAG_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Time tag pattern: time-14-00 */
export const TIME_TAG_PATTERN = /^time-(\d{2})-(\d{2})$/;

/** Smart date keywords */
const SMART_DATE_KEYWORDS: Record<string, (today: Date) => Date> = {
  today: (today) => today,
  tomorrow: (today) => addDays(today, 1),
  yesterday: (today) => addDays(today, -1),
  'next week': (today) => addDays(today, 7),
  'next month': (today) => addMonths(today, 1),
};

// =============================================================================
// DATE HELPERS
// =============================================================================

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

function getNextDayOfWeek(dayName: string, fromDate: Date): Date {
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const targetDay = days.indexOf(dayName.toLowerCase());
  if (targetDay === -1) return fromDate;

  const result = new Date(fromDate);
  const currentDay = result.getDay();
  const daysUntilTarget = (targetDay - currentDay + 7) % 7 || 7;
  result.setDate(result.getDate() + daysUntilTarget);
  return result;
}

// =============================================================================
// TAG DETECTION
// =============================================================================

/**
 * Check if a tag is a date tag (YYYY-MM-DD format)
 */
export function isDateTag(tag: string): boolean {
  return DATE_TAG_PATTERN.test(tag);
}

/**
 * Check if a tag is a time tag (time-HH-MM format)
 */
export function isTimeTag(tag: string): boolean {
  return TIME_TAG_PATTERN.test(tag);
}

/**
 * Check if a tag is any scheduling-related tag (date or time)
 */
export function isSchedulingTag(tag: string): boolean {
  return isDateTag(tag) || isTimeTag(tag);
}

// =============================================================================
// TAG PARSING
// =============================================================================

/**
 * Parse a date tag into a Date object
 * Returns null if not a valid date tag
 */
export function parseDateTag(tag: string): Date | null {
  const match = tag.match(DATE_TAG_PATTERN);
  if (!match) return null;

  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10) - 1; // JS months are 0-indexed
  const day = parseInt(match[3], 10);

  const date = new Date(year, month, day);

  // Validate the date is real (handles Feb 30, etc.)
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
}

/**
 * Parse a time tag into hours and minutes
 * Returns null if not a valid time tag
 */
export function parseTimeTag(tag: string): { hours: number; minutes: number } | null {
  const match = tag.match(TIME_TAG_PATTERN);
  if (!match) return null;

  const hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);

  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return null;
  }

  return { hours, minutes };
}

// =============================================================================
// TAG CREATION
// =============================================================================

/**
 * Create a date tag from a Date object
 * Format: YYYY-MM-DD
 */
export function createDateTag(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Create a time tag from hours and minutes
 * Format: time-HH-MM
 */
export function createTimeTag(hours: number, minutes: number): string {
  const h = String(hours).padStart(2, '0');
  const m = String(minutes).padStart(2, '0');
  return `time-${h}-${m}`;
}

/**
 * Create a time tag from a Date object
 */
export function createTimeTagFromDate(date: Date): string {
  return createTimeTag(date.getHours(), date.getMinutes());
}

// =============================================================================
// NATURAL LANGUAGE PARSING
// =============================================================================

/**
 * Parse natural language date input into a date tag
 *
 * Supports:
 * - "today", "tomorrow", "yesterday"
 * - "next week", "next month"
 * - "monday", "tuesday", etc. (next occurrence)
 * - "jan 30", "january 30"
 * - "1/30", "1/30/26", "01/30/2026"
 * - "2026-01-30" (ISO format)
 *
 * Returns null if unable to parse
 */
export function parseNaturalDate(input: string): string | null {
  const trimmed = input.toLowerCase().trim();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Check smart keywords
  if (trimmed in SMART_DATE_KEYWORDS) {
    return createDateTag(SMART_DATE_KEYWORDS[trimmed](today));
  }

  // Check day names (next occurrence)
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  if (days.includes(trimmed)) {
    return createDateTag(getNextDayOfWeek(trimmed, today));
  }

  // Check "next <day>"
  const nextDayMatch = trimmed.match(/^next\s+(sunday|monday|tuesday|wednesday|thursday|friday|saturday)$/);
  if (nextDayMatch) {
    return createDateTag(getNextDayOfWeek(nextDayMatch[1], today));
  }

  // Already ISO format?
  if (DATE_TAG_PATTERN.test(trimmed)) {
    return trimmed;
  }

  // Try parsing various date formats
  const parsed = tryParseDateFormats(trimmed, today);
  if (parsed) {
    return createDateTag(parsed);
  }

  return null;
}

/**
 * Try parsing various date formats
 */
function tryParseDateFormats(input: string, today: Date): Date | null {
  const currentYear = today.getFullYear();

  // Month name + day: "jan 30", "january 30"
  const monthDayMatch = input.match(
    /^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+(\d{1,2})$/
  );
  if (monthDayMatch) {
    const months: Record<string, number> = {
      jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
      jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
    };
    const month = months[monthDayMatch[1]];
    const day = parseInt(monthDayMatch[2], 10);

    // Use current year, or next year if date has passed
    let year = currentYear;
    const tentative = new Date(year, month, day);
    if (tentative < today) {
      year = currentYear + 1;
    }

    return new Date(year, month, day);
  }

  // US format: 1/30, 1/30/26, 01/30/2026
  const usDateMatch = input.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/);
  if (usDateMatch) {
    const month = parseInt(usDateMatch[1], 10) - 1;
    const day = parseInt(usDateMatch[2], 10);
    let year = currentYear;

    if (usDateMatch[3]) {
      year = parseInt(usDateMatch[3], 10);
      if (year < 100) {
        year += 2000; // 26 -> 2026
      }
    } else {
      // No year specified - use current or next year
      const tentative = new Date(year, month, day);
      if (tentative < today) {
        year = currentYear + 1;
      }
    }

    return new Date(year, month, day);
  }

  return null;
}

/**
 * Parse natural language time input into a time tag
 *
 * Supports:
 * - "2pm", "2:30pm", "14:00"
 * - "2 pm", "2:30 pm"
 * - "noon", "midnight"
 *
 * Returns null if unable to parse
 */
export function parseNaturalTime(input: string): string | null {
  const trimmed = input.toLowerCase().trim();

  // Special keywords
  if (trimmed === 'noon') {
    return createTimeTag(12, 0);
  }
  if (trimmed === 'midnight') {
    return createTimeTag(0, 0);
  }

  // Already in time tag format?
  if (TIME_TAG_PATTERN.test(trimmed)) {
    return trimmed;
  }

  // 24-hour format: 14:00, 14:30
  const time24Match = trimmed.match(/^(\d{1,2}):(\d{2})$/);
  if (time24Match) {
    const hours = parseInt(time24Match[1], 10);
    const minutes = parseInt(time24Match[2], 10);
    if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
      return createTimeTag(hours, minutes);
    }
  }

  // 12-hour format: 2pm, 2:30pm, 2 pm, 2:30 pm
  const time12Match = trimmed.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/);
  if (time12Match) {
    let hours = parseInt(time12Match[1], 10);
    const minutes = time12Match[2] ? parseInt(time12Match[2], 10) : 0;
    const period = time12Match[3];

    if (hours < 1 || hours > 12 || minutes < 0 || minutes > 59) {
      return null;
    }

    // Convert to 24-hour
    if (period === 'pm' && hours !== 12) {
      hours += 12;
    } else if (period === 'am' && hours === 12) {
      hours = 0;
    }

    return createTimeTag(hours, minutes);
  }

  return null;
}

// =============================================================================
// DISPLAY FORMATTING
// =============================================================================

/**
 * Format a date tag for display
 * "2026-01-30" -> "Jan 30, 2026"
 */
export function formatDateTag(tag: string): string {
  const date = parseDateTag(tag);
  if (!date) return tag;

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Format a date tag relative to today
 * "2026-01-30" -> "Tomorrow" or "Wed, Jan 30"
 */
export function formatDateTagRelative(tag: string): string {
  const date = parseDateTag(tag);
  if (!date) return tag;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const diffDays = Math.round((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays === -1) return 'Yesterday';

  if (diffDays > 0 && diffDays <= 7) {
    return date.toLocaleDateString('en-US', { weekday: 'long' });
  }

  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Format a time tag for display
 * "time-14-00" -> "2:00 PM"
 */
export function formatTimeTag(tag: string): string {
  const time = parseTimeTag(tag);
  if (!time) return tag;

  const date = new Date();
  date.setHours(time.hours, time.minutes, 0, 0);

  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

// =============================================================================
// CARD HELPERS
// =============================================================================

/**
 * Get all date tags from a card's tags array
 */
export function getDateTagsFromCard(tags: string[]): string[] {
  return tags.filter(isDateTag);
}

/**
 * Get all time tags from a card's tags array
 */
export function getTimeTagsFromCard(tags: string[]): string[] {
  return tags.filter(isTimeTag);
}

/**
 * Get the primary (first) scheduled date from a card's tags
 */
export function getPrimaryDateFromCard(tags: string[]): Date | null {
  const dateTags = getDateTagsFromCard(tags);
  if (dateTags.length === 0) return null;

  // Sort chronologically and return earliest
  const sorted = dateTags
    .map((t) => ({ tag: t, date: parseDateTag(t)! }))
    .filter((x) => x.date !== null)
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  return sorted[0]?.date ?? null;
}

/**
 * Add or update the date for a card
 * Removes any existing date tags and adds the new one
 */
export function updateCardDateTags(
  currentTags: string[],
  newDate: Date | null
): string[] {
  // Remove existing date tags
  const withoutDates = currentTags.filter((t) => !isDateTag(t));

  // Add new date tag if provided
  if (newDate) {
    return [...withoutDates, createDateTag(newDate)];
  }

  return withoutDates;
}

/**
 * Add or update the time for a card
 * Removes any existing time tags and adds the new one
 */
export function updateCardTimeTags(
  currentTags: string[],
  hours: number | null,
  minutes: number | null
): string[] {
  // Remove existing time tags
  const withoutTimes = currentTags.filter((t) => !isTimeTag(t));

  // Add new time tag if provided
  if (hours !== null && minutes !== null) {
    return [...withoutTimes, createTimeTag(hours, minutes)];
  }

  return withoutTimes;
}
