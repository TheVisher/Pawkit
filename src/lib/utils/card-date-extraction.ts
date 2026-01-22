/**
 * Card Date Extraction
 * Extracts date fields from supertag card content for calendar integration
 */

import { getCalendarFieldsFromTags, extractFieldValues } from '@/lib/tags/supertags';

/**
 * Minimal card interface for date extraction
 * Works with both Card (Convex with _id) and LocalCard (Dexie with id)
 */
interface CardLike {
  _id?: string;
  id?: string;
  content?: string | null;
  tags?: string[] | null;
  title?: string | null;
}

export interface ExtractedDate {
  field: string;              // 'birthday', 'renewalDay', etc.
  date: Date | null;          // Parsed date (null if invalid)
  dayOfMonth?: number;        // For monthly recurrence (1-31)
  recurrence: 'yearly' | 'monthly' | 'none';
  originalValue: string;      // Raw value from content
}

// Field name to recurrence type mapping
const FIELD_RECURRENCE: Record<string, 'yearly' | 'monthly' | 'none'> = {
  birthday: 'yearly',
  anniversary: 'yearly',
  renewalday: 'monthly',
  renews: 'monthly',
  expirydate: 'none',
  expiry: 'none',
  date: 'none',
};

/**
 * Parse a date string into a Date object
 * Supports: "Jan 15", "January 15, 1990", "1/15", "01-15-1990", "2026-01-15"
 */
export function parseDateString(value: string): Date | null {
  if (!value || value.trim() === '') return null;

  const cleaned = value.trim();

  // ISO format: 2026-01-15
  if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) {
    const date = new Date(cleaned + 'T00:00:00');
    return isNaN(date.getTime()) ? null : date;
  }

  // US format with year: 1/15/2026 or 01/15/2026
  const usWithYear = cleaned.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (usWithYear) {
    const [, month, day, year] = usWithYear;
    const fullYear = year.length === 2 ? 2000 + parseInt(year) : parseInt(year);
    const date = new Date(fullYear, parseInt(month) - 1, parseInt(day));
    return isNaN(date.getTime()) ? null : date;
  }

  // US format without year: 1/15 or 01/15
  const usNoYear = cleaned.match(/^(\d{1,2})[\/\-](\d{1,2})$/);
  if (usNoYear) {
    const [, month, day] = usNoYear;
    const now = new Date();
    const date = new Date(now.getFullYear(), parseInt(month) - 1, parseInt(day));
    // If date has passed, use next year
    if (date < now) {
      date.setFullYear(date.getFullYear() + 1);
    }
    return isNaN(date.getTime()) ? null : date;
  }

  // Month name format: "Jan 15" or "January 15, 1990"
  const monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  const monthPattern = /^([a-z]+)\s+(\d{1,2})(?:,?\s*(\d{4}))?$/i;
  const monthMatch = cleaned.match(monthPattern);
  if (monthMatch) {
    const [, monthStr, dayStr, yearStr] = monthMatch;
    const monthIndex = monthNames.findIndex(m => monthStr.toLowerCase().startsWith(m));
    if (monthIndex >= 0) {
      const day = parseInt(dayStr);
      const now = new Date();
      const year = yearStr ? parseInt(yearStr) : now.getFullYear();
      const date = new Date(year, monthIndex, day);
      // If no year provided and date has passed, use next year
      if (!yearStr && date < now) {
        date.setFullYear(date.getFullYear() + 1);
      }
      return isNaN(date.getTime()) ? null : date;
    }
  }

  return null;
}

/**
 * Parse a day-of-month value (for monthly recurrence like subscriptions)
 * Supports: "15", "15th", "the 15th"
 */
export function parseDayOfMonth(value: string): number | null {
  if (!value || value.trim() === '') return null;

  const match = value.trim().match(/(\d{1,2})/);
  if (match) {
    const day = parseInt(match[1]);
    if (day >= 1 && day <= 31) {
      return day;
    }
  }
  return null;
}

/**
 * Extract dates from a card based on its supertag calendar fields
 * Works with both Card (Convex) and LocalCard (Dexie) types
 */
export function extractDatesFromCard(card: CardLike): ExtractedDate[] {
  if (!card.content || !card.tags?.length) return [];

  // Get calendar fields defined by the card's supertags
  const calendarFields = getCalendarFieldsFromTags(card.tags);
  if (calendarFields.length === 0) return [];

  // Extract all field values from content
  const fieldValues = extractFieldValues(card.content);

  const results: ExtractedDate[] = [];

  for (const field of calendarFields) {
    // Try to find matching field in content (case-insensitive)
    const fieldLower = field.toLowerCase();
    const matchingKey = Object.keys(fieldValues).find(
      k => k.toLowerCase().replace(/\s+/g, '') === fieldLower.replace(/\s+/g, '')
    );

    if (!matchingKey) continue;

    const value = fieldValues[matchingKey];
    if (!value) continue;

    const recurrence = FIELD_RECURRENCE[fieldLower] || 'none';

    // For monthly recurrence, extract day of month
    if (recurrence === 'monthly') {
      const dayOfMonth = parseDayOfMonth(value);
      if (dayOfMonth) {
        // Calculate next occurrence
        const now = new Date();
        let nextDate = new Date(now.getFullYear(), now.getMonth(), dayOfMonth);
        if (nextDate <= now) {
          nextDate = new Date(now.getFullYear(), now.getMonth() + 1, dayOfMonth);
        }
        results.push({
          field,
          date: nextDate,
          dayOfMonth,
          recurrence,
          originalValue: value,
        });
      }
    } else {
      // For yearly or one-time dates
      const date = parseDateString(value);
      if (date) {
        // For yearly recurrence, calculate next occurrence
        let eventDate = date;
        if (recurrence === 'yearly') {
          const now = new Date();
          const thisYear = now.getFullYear();
          // Create date for this year
          eventDate = new Date(thisYear, date.getMonth(), date.getDate());
          // If it's already passed this year, use next year
          if (eventDate < now) {
            eventDate = new Date(thisYear + 1, date.getMonth(), date.getDate());
          }
        }
        results.push({
          field,
          date: eventDate,
          recurrence,
          originalValue: value,
        });
      }
    }
  }

  return results;
}
