/**
 * Mention Search Hook
 *
 * Provides instant search for @ mentions across cards, Pawkits, and dates.
 * Uses chrono-node for natural language date parsing.
 */

import { useMemo } from 'react';
import * as chrono from 'chrono-node';
import { format, addDays, startOfWeek, addWeeks, addMonths } from 'date-fns';
import { useCards, useCollections } from '@/lib/hooks/use-live-data';
import type { LocalCard, LocalCollection } from '@/lib/db';
import type { MentionType } from '@/lib/tiptap/extensions/mention';

export interface MentionItem {
  id: string;
  label: string;
  type: MentionType;
  icon?: string;
  subtitle?: string;
  date?: Date; // For date type mentions
}

export interface MentionSearchResult {
  dates: MentionItem[];
  recent: MentionItem[];
  notes: MentionItem[];
  bookmarks: MentionItem[];
  pawkits: MentionItem[];
  isEmpty: boolean;
}

/**
 * Strip emoji and special characters from query for matching
 */
function normalizeQuery(query: string): string {
  return query
    .replace(/[\u{1F600}-\u{1F6FF}]/gu, '') // Remove emoji
    .replace(/[^\w\s-]/g, '') // Remove special chars except hyphen
    .toLowerCase()
    .trim();
}

/**
 * Get quick date shortcuts for empty query state
 */
function getDateShortcuts(): MentionItem[] {
  const today = new Date();
  const tomorrow = addDays(today, 1);
  const nextMonday = startOfWeek(addWeeks(today, 1), { weekStartsOn: 1 });

  return [
    {
      id: format(today, 'yyyy-MM-dd'),
      label: 'Today',
      type: 'date',
      icon: '📅',
      subtitle: format(today, 'EEE, MMM d'),
      date: today,
    },
    {
      id: format(tomorrow, 'yyyy-MM-dd'),
      label: 'Tomorrow',
      type: 'date',
      icon: '📅',
      subtitle: format(tomorrow, 'EEE, MMM d'),
      date: tomorrow,
    },
    {
      id: format(nextMonday, 'yyyy-MM-dd'),
      label: 'Next Monday',
      type: 'date',
      icon: '📅',
      subtitle: format(nextMonday, 'MMM d'),
      date: nextMonday,
    },
  ];
}

/**
 * Parse date from natural language query using chrono-node
 */
function parseDateFromQuery(query: string): MentionItem | null {
  if (!query.trim()) return null;

  try {
    const parsed = chrono.parseDate(query);
    if (parsed) {
      return {
        id: format(parsed, 'yyyy-MM-dd'),
        label: format(parsed, 'MMMM d, yyyy'),
        type: 'date',
        icon: '📅',
        subtitle: format(parsed, 'EEEE'),
        date: parsed,
      };
    }
  } catch {
    // Ignore parse errors
  }

  return null;
}

/**
 * Convert card to mention item
 */
function cardToMentionItem(card: LocalCard): MentionItem {
  const isNote = ['md-note', 'text-note', 'quick-note'].includes(card.type);

  return {
    id: card.id,
    label: card.title || card.url || 'Untitled',
    type: 'card',
    icon: isNote ? '📄' : '🔗',
    subtitle: isNote ? 'Note' : card.domain || undefined,
  };
}

/**
 * Convert collection (Pawkit) to mention item
 */
function collectionToMentionItem(collection: LocalCollection): MentionItem {
  return {
    id: collection.slug,
    label: collection.name,
    type: 'pawkit',
    icon: collection.icon || '📁',
  };
}

/**
 * Match card against normalized query
 */
function matchesCard(card: LocalCard, query: string): boolean {
  const title = (card.title || '').toLowerCase();
  const domain = (card.domain || '').toLowerCase();
  const url = (card.url || '').toLowerCase();

  return (
    title.includes(query) ||
    domain.includes(query) ||
    url.includes(query)
  );
}

/**
 * Match collection against normalized query
 */
function matchesCollection(collection: LocalCollection, query: string): boolean {
  return collection.name.toLowerCase().includes(query);
}

/**
 * Hook for searching mentions
 *
 * @param query - The search query (text after @)
 * @param workspaceId - Current workspace ID
 * @param maxResults - Maximum results per category (default 5)
 */
export function useMentionSearch(
  query: string,
  workspaceId: string | undefined,
  maxResults = 5
): MentionSearchResult {
  // Get all cards and collections via live query
  const cards = useCards(workspaceId);
  const collections = useCollections(workspaceId);

  return useMemo(() => {
    const normalized = normalizeQuery(query);
    const isEmpty = !normalized;

    // Empty query: show date shortcuts + recent items
    if (isEmpty) {
      const dates = getDateShortcuts();

      // Get recently updated cards (last 5)
      const recentCards = [...(cards || [])]
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        .slice(0, maxResults)
        .map(cardToMentionItem);

      // Get recently updated Pawkits (first 2)
      const recentPawkits = [...(collections || [])]
        .filter(c => !c.isSystem)
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        .slice(0, 2)
        .map(collectionToMentionItem);

      return {
        dates,
        recent: [...recentCards, ...recentPawkits],
        notes: [],
        bookmarks: [],
        pawkits: [],
        isEmpty: false,
      };
    }

    // Parse date from query
    const parsedDate = parseDateFromQuery(query);
    const dates = parsedDate ? [parsedDate] : [];

    // Filter cards
    const matchingCards = (cards || []).filter(card => matchesCard(card, normalized));

    // Separate notes and bookmarks
    const notes = matchingCards
      .filter(c => ['md-note', 'text-note', 'quick-note'].includes(c.type))
      .slice(0, maxResults)
      .map(cardToMentionItem);

    const bookmarks = matchingCards
      .filter(c => c.type === 'url')
      .slice(0, maxResults)
      .map(cardToMentionItem);

    // Filter Pawkits
    const pawkits = (collections || [])
      .filter(c => !c.isSystem && matchesCollection(c, normalized))
      .slice(0, maxResults)
      .map(collectionToMentionItem);

    const hasResults = dates.length > 0 || notes.length > 0 || bookmarks.length > 0 || pawkits.length > 0;

    return {
      dates,
      recent: [],
      notes,
      bookmarks,
      pawkits,
      isEmpty: !hasResults,
    };
  }, [query, cards, collections, maxResults]);
}

export default useMentionSearch;
