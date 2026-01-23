/**
 * Card Date Extraction
 * Extracts date fields from supertag card content for calendar integration
 */

import { getCalendarFieldsFromTags, extractFieldValues } from '@/lib/tags/supertags';
import { isPlateJson, parseJsonContent, getContentText } from '@/lib/plate/html-to-plate';

// Field label aliases for text-based fallback
const FIELD_LABEL_ALIASES: Record<string, string[]> = {
  birthday: ['birthday'],
  anniversary: ['anniversary'],
  renewalday: ['renewal day', 'renewal', 'renews'],
  renews: ['renews', 'renewal day', 'renewal'],
  expirydate: ['expiry date', 'expiry'],
  expiry: ['expiry'],
  date: ['date'],
  deadline: ['deadline'],
  due: ['due', 'due date'],
  duedate: ['due date', 'due'],
  warranty: ['warranty', 'expiry'],
};

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function extractTextFromPlateNode(node: unknown): string {
  if (!node || typeof node !== 'object') return '';
  const record = node as Record<string, unknown>;
  if (typeof record.text === 'string') return record.text;
  const children = record.children;
  if (Array.isArray(children)) {
    return children.map(extractTextFromPlateNode).join('');
  }
  return '';
}

function extractTextFromPlateContent(content: unknown[]): string {
  return content.map(extractTextFromPlateNode).join('\n');
}

function getContentLines(content: unknown): string[] {
  if (!content) return [];
  let text = '';

  if (Array.isArray(content)) {
    text = extractTextFromPlateContent(content);
  } else if (typeof content === 'string') {
    if (isPlateJson(content)) {
      const parsed = parseJsonContent(content);
      if (parsed) {
        text = extractTextFromPlateContent(parsed);
      }
    }
    if (!text) {
      try {
        if (typeof DOMParser !== 'undefined') {
          const doc = new DOMParser().parseFromString(content, 'text/html');
          text = doc.body.textContent || '';
        } else {
          text = content;
        }
      } catch {
        text = content;
      }
    }
  }

  return text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function findFieldValueInLines(field: string, lines: string[]): string | null {
  const normalizedField = field.toLowerCase().replace(/\s+/g, '');
  const aliases = FIELD_LABEL_ALIASES[normalizedField] || [field];

  for (const alias of aliases) {
    const aliasLower = alias.toLowerCase();
    for (const line of lines) {
      const lowerLine = line.toLowerCase();
      if (lowerLine.startsWith(`${aliasLower}:`)) {
        const value = line.slice(line.indexOf(':') + 1).trim();
        if (value) return value;
      }
    }
  }

  return null;
}

function findFieldValueInText(field: string, text: string): string | null {
  if (!text) return null;
  const normalizedField = field.toLowerCase().replace(/\s+/g, '');
  const aliases = FIELD_LABEL_ALIASES[normalizedField] || [field];

  for (const alias of aliases) {
    const pattern = new RegExp(`${escapeRegExp(alias)}\\s*:\\s*([^\\n]+)`, 'i');
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }

  return null;
}

/**
 * Minimal card interface for date extraction
 * Works with both Card (Convex with _id) and LocalCard (Dexie with id)
 */
interface CardLike {
  _id?: string;
  id?: string;
  content?: unknown;
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
// Keys are lowercase with spaces removed (to match field normalization)
const FIELD_RECURRENCE: Record<string, 'yearly' | 'monthly' | 'none'> = {
  // Contact fields (yearly)
  birthday: 'yearly',
  anniversary: 'yearly',
  // Subscription fields (monthly)
  renewalday: 'monthly',
  renews: 'monthly',
  // One-time dates (none)
  expirydate: 'none',
  expiry: 'none',
  date: 'none',
  deadline: 'none',
  due: 'none',
  duedate: 'none',
  warranty: 'none',
};

/**
 * Parse a date string into a Date object
 * Supports: "Jan 15", "January 15, 1990", "1/15", "01-15-1990", "2026-01-15"
 */
export function parseDateString(value: string): Date | null {
  if (!value || value.trim() === '') return null;

  const cleaned = value.trim();

  const isoMatch = cleaned.match(/\d{4}-\d{2}-\d{2}/);
  if (isoMatch) {
    const date = new Date(isoMatch[0] + 'T00:00:00');
    return isNaN(date.getTime()) ? null : date;
  }

  // US format with year: 1/15/2026 or 01/15/2026
  const usWithYear = cleaned.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
  if (usWithYear) {
    const [, month, day, year] = usWithYear;
    const fullYear = year.length === 2 ? 2000 + parseInt(year) : parseInt(year);
    const date = new Date(fullYear, parseInt(month) - 1, parseInt(day));
    return isNaN(date.getTime()) ? null : date;
  }

  // US format without year: 1/15 or 01/15
  const usNoYear = cleaned.match(/(\d{1,2})[\/\-](\d{1,2})/);
  if (usNoYear) {
    const [, month, day] = usNoYear;
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const date = new Date(now.getFullYear(), parseInt(month) - 1, parseInt(day));
    // If date has passed (before today), use next year
    if (date < todayStart) {
      date.setFullYear(date.getFullYear() + 1);
    }
    return isNaN(date.getTime()) ? null : date;
  }

  // Month name format: "Jan 15" or "January 15, 1990"
  const monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  const monthPattern = /([a-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s*(\d{4}))?/i;
  const monthMatch = cleaned.match(monthPattern);
  if (monthMatch) {
    const [, monthStr, dayStr, yearStr] = monthMatch;
    const monthIndex = monthNames.findIndex(m => monthStr.toLowerCase().startsWith(m));
    if (monthIndex >= 0) {
      const day = parseInt(dayStr);
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const year = yearStr ? parseInt(yearStr) : now.getFullYear();
      const date = new Date(year, monthIndex, day);
      // If no year provided and date has passed, use next year
      if (!yearStr && date < todayStart) {
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

function buildMonthlyBaseDate(dayOfMonth: number, reference: Date): Date {
  const referenceStart = new Date(
    reference.getFullYear(),
    reference.getMonth(),
    reference.getDate(),
  );
  const year = referenceStart.getFullYear();
  const month = referenceStart.getMonth();
  const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
  const clampedDay = Math.min(dayOfMonth, lastDayOfMonth);
  let candidate = new Date(year, month, clampedDay);

  if (candidate < referenceStart) {
    const nextMonthDate = new Date(year, month + 1, 1);
    const nextYear = nextMonthDate.getFullYear();
    const nextMonth = nextMonthDate.getMonth();
    const lastDayNextMonth = new Date(nextYear, nextMonth + 1, 0).getDate();
    const clampedNext = Math.min(dayOfMonth, lastDayNextMonth);
    candidate = new Date(nextYear, nextMonth, clampedNext);
  }

  return candidate;
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
  const contentLines = getContentLines(card.content);
  const contentText = getContentText(card.content);

  const results: ExtractedDate[] = [];

  for (const field of calendarFields) {
    // Try to find matching field in content (case-insensitive)
    const fieldLower = field.toLowerCase();
    const normalizedField = fieldLower.replace(/\s+/g, '');
    const matchingKey = Object.keys(fieldValues).find(
      k => k.toLowerCase().replace(/\s+/g, '') === normalizedField
    );

    const value =
      (matchingKey ? fieldValues[matchingKey] : null) ||
      findFieldValueInLines(fieldLower, contentLines) ||
      findFieldValueInText(fieldLower, contentText);
    if (!value) continue;

    const recurrence = FIELD_RECURRENCE[fieldLower] || 'none';

    // For monthly recurrence, extract day of month
    if (recurrence === 'monthly') {
      const dayOfMonth = parseDayOfMonth(value);
      if (dayOfMonth) {
        const nextDate = buildMonthlyBaseDate(dayOfMonth, new Date());
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
          const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          const thisYear = now.getFullYear();
          // Create date for this year
          eventDate = new Date(thisYear, date.getMonth(), date.getDate());
          // If it's already passed this year, use next year
          if (eventDate < todayStart) {
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
