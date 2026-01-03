/**
 * Card Calendar Sync
 * Syncs dates from supertag cards to calendar events
 */

import { db } from '@/lib/db';
import type { LocalCard, LocalCalendarEvent } from '@/lib/db';
import { extractDatesFromCard } from './card-date-extraction';

// Minimal unicode prefixes by field type
const EVENT_PREFIXES: Record<string, string> = {
  birthday: '○',
  anniversary: '○',
  renewalDay: '↻',
  renews: '↻',
  expiryDate: '△',
  expiry: '△',
  date: '◇',
};

/**
 * Generate a deterministic event ID from card and field
 */
function generateEventId(cardId: string, field: string): string {
  return `card-${cardId}-${field.toLowerCase().replace(/\s+/g, '-')}`;
}

/**
 * Format date as YYYY-MM-DD
 */
function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

// Type for event data before timestamps are added
type EventData = Omit<LocalCalendarEvent, 'createdAt' | 'updatedAt' | '_synced' | '_lastModified' | '_deleted' | 'version'>;

/**
 * Generate calendar event data from extracted dates
 */
export function generateEventsFromCard(
  card: LocalCard,
  workspaceId: string
): EventData[] {
  const extractedDates = extractDatesFromCard(card);
  if (extractedDates.length === 0) return [];

  return extractedDates.map((extracted) => {
    const prefix = EVENT_PREFIXES[extracted.field.toLowerCase()] || '◦';
    const cardTitle = card.title || 'Untitled';

    // Format title based on field type
    let eventTitle: string;
    if (extracted.field.toLowerCase() === 'birthday') {
      eventTitle = `${prefix} ${cardTitle}'s Birthday`;
    } else if (extracted.field.toLowerCase() === 'anniversary') {
      eventTitle = `${prefix} ${cardTitle}'s Anniversary`;
    } else if (['renewalday', 'renews'].includes(extracted.field.toLowerCase())) {
      eventTitle = `${prefix} ${cardTitle} Renewal`;
    } else if (['expirydate', 'expiry'].includes(extracted.field.toLowerCase())) {
      eventTitle = `${prefix} ${cardTitle} Expires`;
    } else {
      eventTitle = `${prefix} ${cardTitle}`;
    }

    // Build recurrence object if applicable
    let recurrence: LocalCalendarEvent['recurrence'];
    if (extracted.recurrence === 'yearly') {
      recurrence = { freq: 'yearly', interval: 1 };
    } else if (extracted.recurrence === 'monthly') {
      recurrence = { freq: 'monthly', interval: 1 };
    }

    return {
      id: generateEventId(card.id, extracted.field),
      workspaceId,
      title: eventTitle,
      date: formatDate(extracted.date!),
      isAllDay: true,
      recurrence,
      excludedDates: [],
      isException: false,
      source: {
        type: 'card' as const,
        cardId: card.id,
      },
    };
  });
}

/**
 * Sync a card's dates to the calendar
 * Creates, updates, or deletes events as needed
 */
export async function syncCardToCalendar(
  card: LocalCard,
  workspaceId: string
): Promise<{ created: number; updated: number; deleted: number }> {
  const stats = { created: 0, updated: 0, deleted: 0 };

  // Get existing events for this card (filter since source.cardId isn't indexed)
  const existingEvents = await db.calendarEvents
    .where('workspaceId')
    .equals(workspaceId)
    .filter((e) => !e._deleted && e.source?.cardId === card.id)
    .toArray();

  const existingMap = new Map(existingEvents.map((e) => [e.id, e]));

  // Generate new events from card
  const newEvents = generateEventsFromCard(card, workspaceId);
  const newEventIds = new Set(newEvents.map((e) => e.id));

  const now = new Date();

  // Create or update events
  for (const eventData of newEvents) {
    const existing = existingMap.get(eventData.id);

    if (existing) {
      // Check if update needed
      if (
        existing.title !== eventData.title ||
        existing.date !== eventData.date ||
        existing.color !== eventData.color ||
        JSON.stringify(existing.recurrence) !== JSON.stringify(eventData.recurrence)
      ) {
        await db.calendarEvents.update(eventData.id, {
          ...eventData,
          updatedAt: now,
        });
        stats.updated++;
      }
    } else {
      // Create new event (use put to handle race conditions)
      await db.calendarEvents.put({
        ...eventData,
        createdAt: now,
        updatedAt: now,
      } as LocalCalendarEvent);
      stats.created++;
    }
  }

  // Delete events that no longer exist
  for (const [existingId] of existingMap) {
    if (!newEventIds.has(existingId)) {
      await db.calendarEvents.update(existingId, {
        _deleted: true,
        updatedAt: now,
      });
      stats.deleted++;
    }
  }

  return stats;
}

/**
 * Remove all calendar events for a card
 */
export async function removeCardFromCalendar(cardId: string): Promise<number> {
  // Filter all events since source.cardId isn't indexed
  const events = await db.calendarEvents
    .filter((e) => !e._deleted && e.source?.cardId === cardId)
    .toArray();

  const now = new Date();
  for (const event of events) {
    await db.calendarEvents.update(event.id, {
      _deleted: true,
      updatedAt: now,
    });
  }

  return events.length;
}
