/**
 * Card Calendar Sync Hook
 * Automatically syncs card dates to calendar when content changes
 */

import { useEffect, useRef } from 'react';
import type { LocalCard } from '@/lib/db';
import { syncCardToCalendar, removeCardFromCalendar } from '@/lib/utils/card-calendar-sync';
import { getCalendarFieldsFromTags } from '@/lib/tags/supertags';

const SYNC_DEBOUNCE_MS = 500;

/**
 * Hook to sync card dates to the calendar
 * Triggers on content changes with debounce
 */
export function useCardCalendarSync(card: LocalCard | null) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSyncKeyRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!card) return;

    // Check if card has any calendar-relevant supertags
    const calendarFields = getCalendarFieldsFromTags(card.tags || []);
    if (calendarFields.length === 0) {
      // No calendar fields - remove any existing events for this card
      removeCardFromCalendar(card.id);
      return;
    }

    // Skip if nothing relevant has changed (content or title)
    const syncKey = `${card.title}|${card.content}`;
    if (lastSyncKeyRef.current === syncKey) return;
    lastSyncKeyRef.current = syncKey;

    // Clear existing timer
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    // Debounced sync
    timerRef.current = setTimeout(() => {
      syncCardToCalendar(card, card.workspaceId);
    }, SYNC_DEBOUNCE_MS);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [card?.id, card?.content, card?.tags, card?.workspaceId, card?.title]);
}
