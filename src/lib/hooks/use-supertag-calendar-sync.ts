/**
 * Supertag Calendar Sync Hook
 * Syncs dates from supertag cards to calendar events in Convex
 *
 * Handles:
 * - Birthdays from #contact
 * - Renewal dates from #subscription
 * - Warranty expiration from #warranty
 * - Any other supertag with calendarFields defined
 */

import { useCallback } from 'react';
import { useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { extractDatesFromCard, type ExtractedDate } from '@/lib/utils/card-date-extraction';
import type { Card, CalendarEvent, Id } from '@/lib/types/convex';

// Minimal unicode prefixes by field type
const EVENT_PREFIXES: Record<string, string> = {
  birthday: '🎂',
  anniversary: '💍',
  renewalday: '↻',
  renews: '↻',
  expirydate: '⚠️',
  expiry: '⚠️',
  warranty: '🛡️',
  deadline: '📅',
  date: '◇',
};

/**
 * Generate a deterministic event title from card and field
 */
function generateEventTitle(cardTitle: string, field: string): string {
  const prefix = EVENT_PREFIXES[field.toLowerCase()] || '◇';
  const normalizedField = field.toLowerCase();

  if (normalizedField === 'birthday') {
    return `${prefix} ${cardTitle}'s Birthday`;
  } else if (normalizedField === 'anniversary') {
    return `${prefix} ${cardTitle}'s Anniversary`;
  } else if (['renewalday', 'renews'].includes(normalizedField)) {
    return `${prefix} ${cardTitle} Renewal`;
  } else if (['expirydate', 'expiry', 'warranty'].includes(normalizedField)) {
    return `${prefix} ${cardTitle} Expires`;
  } else if (normalizedField === 'deadline') {
    return `${prefix} ${cardTitle} Deadline`;
  } else {
    return `${prefix} ${cardTitle}`;
  }
}

/**
 * Format date as YYYY-MM-DD
 */
function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Build recurrence object from ExtractedDate
 */
function buildRecurrence(extracted: ExtractedDate): { freq: string; interval: number } | undefined {
  if (extracted.recurrence === 'yearly') {
    return { freq: 'yearly', interval: 1 };
  } else if (extracted.recurrence === 'monthly') {
    return { freq: 'monthly', interval: 1 };
  }
  return undefined;
}

/**
 * Generate calendar event data from extracted dates
 */
export function generateEventsFromCard(
  card: Card,
  workspaceId: string
): Array<{
  title: string;
  date: string;
  recurrence?: { freq: string; interval: number };
  source: { type: 'card'; cardId: string; field: string };
}> {
  const extractedDates = extractDatesFromCard(card);
  if (extractedDates.length === 0) return [];

  return extractedDates
    .filter((extracted) => extracted.date !== null)
    .map((extracted) => ({
      title: generateEventTitle(card.title || 'Untitled', extracted.field),
      date: formatDate(extracted.date!),
      recurrence: buildRecurrence(extracted),
      source: {
        type: 'card' as const,
        cardId: card._id,
        field: extracted.field,
      },
    }));
}

/**
 * Hook to sync supertag dates to calendar events
 */
export function useSupertagCalendarSync() {
  const createEvent = useMutation(api.events.create);
  const updateEvent = useMutation(api.events.update);
  const deleteEvent = useMutation(api.events.remove);

  /**
   * Sync a card's supertag dates to calendar events
   * Creates new events, updates existing ones, and deletes stale ones
   */
  const syncCardToCalendar = useCallback(async (
    card: Card,
    workspaceId: Id<'workspaces'>,
    existingEvents: CalendarEvent[]
  ): Promise<{ created: number; updated: number; deleted: number }> => {
    const stats = { created: 0, updated: 0, deleted: 0 };

    // Get existing events for this card
    const cardEvents = existingEvents.filter(
      (e) => e.source?.type === 'card' && e.source?.cardId === card._id && !e.deleted
    );
    const existingByField = new Map(
      cardEvents.map((e) => [e.source?.field || '', e])
    );

    // Generate new events from card content
    const newEvents = generateEventsFromCard(card, workspaceId);
    const newEventFields = new Set(newEvents.map((e) => e.source.field));

    // Create or update events
    for (const eventData of newEvents) {
      const existing = existingByField.get(eventData.source.field);

      if (existing) {
        // Check if update needed
        const needsUpdate =
          existing.title !== eventData.title ||
          existing.date !== eventData.date ||
          JSON.stringify(existing.recurrence) !== JSON.stringify(eventData.recurrence);

        if (needsUpdate) {
          await updateEvent({
            id: existing._id,
            title: eventData.title,
            date: eventData.date,
            recurrence: eventData.recurrence,
            source: eventData.source,
          });
          stats.updated++;
        }
      } else {
        // Create new event
        await createEvent({
          workspaceId,
          title: eventData.title,
          date: eventData.date,
          isAllDay: true,
          recurrence: eventData.recurrence,
          source: eventData.source,
        });
        stats.created++;
      }
    }

    // Delete stale events (fields that no longer exist in card)
    for (const [field, event] of existingByField) {
      if (!newEventFields.has(field)) {
        await deleteEvent({ id: event._id });
        stats.deleted++;
      }
    }

    return stats;
  }, [createEvent, updateEvent, deleteEvent]);

  /**
   * Remove all calendar events associated with a card
   */
  const removeCardEvents = useCallback(async (
    cardId: string,
    existingEvents: CalendarEvent[]
  ): Promise<number> => {
    const cardEvents = existingEvents.filter(
      (e) => e.source?.type === 'card' && e.source?.cardId === cardId && !e.deleted
    );

    for (const event of cardEvents) {
      await deleteEvent({ id: event._id });
    }

    return cardEvents.length;
  }, [deleteEvent]);

  return {
    syncCardToCalendar,
    removeCardEvents,
    generateEventsFromCard,
  };
}
