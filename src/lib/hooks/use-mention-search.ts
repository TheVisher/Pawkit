/**
 * Mention Search Hook
 *
 * Provides instant search for @ mentions across cards, Pawkits, and dates.
 * Uses chrono-node for natural language date parsing (lazy-loaded).
 */

import { useMemo, useState, useEffect } from 'react';
import { format, addDays, startOfWeek, addWeeks } from 'date-fns';

// Lazy-loaded chrono-node module (loaded on first date parse attempt)
let chronoModule: typeof import('chrono-node') | null = null;
let chronoLoadPromise: Promise<typeof import('chrono-node')> | null = null;

/**
 * Load chrono-node lazily
 */
async function loadChrono(): Promise<typeof import('chrono-node')> {
  if (chronoModule) return chronoModule;
  if (chronoLoadPromise) return chronoLoadPromise;

  chronoLoadPromise = import('chrono-node').then((mod) => {
    chronoModule = mod;
    return mod;
  });

  return chronoLoadPromise;
}

import { useCards, useCollections } from '@/lib/contexts/convex-data-context';
import type { Card, Collection } from '@/lib/types/convex';
import type { MentionType } from '@/lib/plate/mention-parser';

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
 * Parse date from natural language query using chrono-node (sync, uses cached module)
 * Returns null if chrono isn't loaded yet - the hook will trigger a re-render when it loads
 */
function parseDateFromQuery(query: string): MentionItem | null {
  if (!query.trim()) return null;
  if (!chronoModule) return null; // Not loaded yet

  try {
    const parsed = chronoModule.parseDate(query);
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
function cardToMentionItem(card: Card): MentionItem {
  const isNote = ['md-note', 'text-note'].includes(card.type);

  return {
    id: card._id,
    label: card.title || card.url || 'Untitled',
    type: 'card',
    icon: isNote ? '📄' : '🔗',
    subtitle: isNote ? 'Note' : card.domain || undefined,
  };
}

/**
 * Convert collection (Pawkit) to mention item
 */
function collectionToMentionItem(collection: Collection): MentionItem {
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
function matchesCard(card: Card, query: string): boolean {
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
function matchesCollection(collection: Collection, query: string): boolean {
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
  const cards = useCards();
  const collections = useCollections();

  // Track if chrono is loaded (for re-render trigger)
  const [chronoLoaded, setChronoLoaded] = useState(!!chronoModule);

  // Load chrono lazily when there's a query that might be a date
  useEffect(() => {
    if (query.trim() && !chronoModule) {
      loadChrono()
        .then(() => setChronoLoaded(true))
        .catch(() => {
          setChronoLoaded(false);
        });
    }
  }, [query]);

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
      .filter(c => ['md-note', 'text-note'].includes(c.type))
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
  }, [query, cards, collections, maxResults, chronoLoaded]);
}

export default useMentionSearch;
