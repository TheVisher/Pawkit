'use client';

/**
 * Live Data Hooks
 *
 * These hooks read from the DataContext when available (inside DashboardShell),
 * or fall back to direct Dexie queries (for Portal, extensions, etc).
 *
 * The DataContext runs a single useLiveQuery for each data type, eliminating
 * duplicate queries across components (7+ queries → 1 per data type).
 *
 * All windows (main app, portal, extensions) see the same data
 * and automatically update when data changes.
 *
 * This replaces reading from Zustand stores for data.
 * Zustand is still used for UI state (modals, sidebar, etc.)
 *
 * @see Phase 2 of performance optimization plan
 */

import { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import type { LocalCard, LocalCollection, LocalWorkspace, LocalCalendarEvent } from '@/lib/db/types';
import {
  useIsInDataProvider,
  useCardsFromContext,
  useCollectionsFromContext,
  useCalendarEventsFromContext,
} from '@/lib/contexts/data-context';

/**
 * Get all cards for a workspace
 * Uses DataContext when available, falls back to direct query otherwise
 */
export function useCards(workspaceId: string | undefined): LocalCard[] {
  const isInProvider = useIsInDataProvider();
  const contextCards = useCardsFromContext();

  // Direct query fallback (for Portal, extensions, etc)
  const directCards = useLiveQuery(
    async () => {
      // Skip query if we're using context
      if (isInProvider) return [];
      if (!workspaceId) return [];
      return db.cards
        .where('workspaceId')
        .equals(workspaceId)
        .filter((c) => !c._deleted)
        .toArray();
    },
    [workspaceId, isInProvider],
    [] as LocalCard[]
  );

  // Use context if available, otherwise fall back to direct query
  return isInProvider ? contextCards : directCards;
}

/**
 * Get a single card by ID
 * Uses context lookup when available, falls back to direct query otherwise
 */
export function useCard(cardId: string | undefined): LocalCard | undefined {
  const isInProvider = useIsInDataProvider();
  const contextCards = useCardsFromContext();

  // Find card in context (memoized to prevent unnecessary re-renders)
  const contextCard = useMemo(
    () => cardId ? contextCards.find((c) => c.id === cardId) : undefined,
    [contextCards, cardId]
  );

  // Direct query fallback
  const directCard = useLiveQuery(
    async () => {
      if (isInProvider) return undefined;
      if (!cardId) return undefined;
      const c = await db.cards.get(cardId);
      return c?._deleted ? undefined : c;
    },
    [cardId, isInProvider],
    undefined
  );

  return isInProvider ? contextCard : directCard;
}

/**
 * Get all collections for a workspace
 * Uses DataContext when available, falls back to direct query otherwise
 */
export function useCollections(workspaceId: string | undefined): LocalCollection[] {
  const isInProvider = useIsInDataProvider();
  const contextCollections = useCollectionsFromContext();

  // Direct query fallback
  const directCollections = useLiveQuery(
    async () => {
      if (isInProvider) return [];
      if (!workspaceId) return [];
      return db.collections
        .where('workspaceId')
        .equals(workspaceId)
        .filter((c) => !c._deleted)
        .toArray();
    },
    [workspaceId, isInProvider],
    [] as LocalCollection[]
  );

  return isInProvider ? contextCollections : directCollections;
}

/**
 * Get a single collection by slug
 * Uses context lookup when available
 */
export function useCollection(
  workspaceId: string | undefined,
  slug: string | undefined
): LocalCollection | undefined {
  const isInProvider = useIsInDataProvider();
  const contextCollections = useCollectionsFromContext();

  // Find collection in context
  const contextCollection = useMemo(
    () => slug ? contextCollections.find((c) => c.slug === slug) : undefined,
    [contextCollections, slug]
  );

  // Direct query fallback
  const directCollection = useLiveQuery(
    async () => {
      if (isInProvider) return undefined;
      if (!workspaceId || !slug) return undefined;
      const collections = await db.collections
        .where('workspaceId')
        .equals(workspaceId)
        .filter((c) => c.slug === slug && !c._deleted)
        .toArray();
      return collections[0];
    },
    [workspaceId, slug, isInProvider],
    undefined
  );

  return isInProvider ? contextCollection : directCollection;
}

/**
 * Get cards in a specific Pawkit (collection)
 *
 * Uses TAG-BASED architecture with LEAF-ONLY display:
 * - Cards are in a Pawkit if they have the Pawkit's slug as a tag
 * - Cards only show in their DEEPEST Pawkit (not parent Pawkits)
 * - A card in "Contacts > Work" has tags [#contacts, #work] but only shows in "Work"
 *
 * Uses context data when available for better performance.
 *
 * See: .claude/skills/pawkit-tag-architecture/SKILL.md
 */
export function useCardsInCollection(
  workspaceId: string | undefined,
  collectionSlug: string | undefined
): LocalCard[] {
  const isInProvider = useIsInDataProvider();
  const contextCards = useCardsFromContext();
  const contextCollections = useCollectionsFromContext();

  // Compute from context (memoized)
  const contextResult = useMemo(() => {
    if (!isInProvider) return [];

    // If no collection specified, return all cards
    if (!collectionSlug) return contextCards;

    // Build descendant slugs for this Pawkit
    const descendantSlugs = getDescendantSlugsSync(collectionSlug, contextCollections);

    // Filter cards that have this collection's tag
    const cardsWithTag = contextCards.filter((c) => c.tags?.includes(collectionSlug));

    // Leaf-only: exclude cards that have a descendant Pawkit tag
    return cardsWithTag.filter((card) => {
      const hasDescendantTag = descendantSlugs.some((d) => card.tags?.includes(d));
      return !hasDescendantTag;
    });
  }, [isInProvider, contextCards, contextCollections, collectionSlug]);

  // Direct query fallback for Portal/extensions
  const directCollections = useLiveQuery(
    async () => {
      if (isInProvider) return [];
      if (!workspaceId) return [];
      return db.collections
        .where('workspaceId')
        .equals(workspaceId)
        .filter((c) => !c._deleted)
        .toArray();
    },
    [workspaceId, isInProvider],
    [] as LocalCollection[]
  );

  const directCards = useLiveQuery(
    async () => {
      if (isInProvider) return [];
      if (!workspaceId) return [];

      // If no collection specified, return all cards
      if (!collectionSlug) {
        return db.cards
          .where('workspaceId')
          .equals(workspaceId)
          .filter((c) => !c._deleted)
          .toArray();
      }

      // Build descendant slugs for this Pawkit
      const descendantSlugs = getDescendantSlugsSync(collectionSlug, directCollections);

      // Use indexed tag query, then filter for leaf-only display
      const cardsWithTag = await db.cards
        .where('tags')
        .equals(collectionSlug)
        .filter((c) => c.workspaceId === workspaceId && !c._deleted)
        .toArray();

      // Leaf-only: exclude cards that have a descendant Pawkit tag
      return cardsWithTag.filter((card) => {
        const hasDescendantTag = descendantSlugs.some((d) => card.tags?.includes(d));
        return !hasDescendantTag;
      });
    },
    [workspaceId, collectionSlug, directCollections, isInProvider],
    [] as LocalCard[]
  );

  return isInProvider ? contextResult : directCards;
}

/**
 * Helper: Get all descendant Pawkit slugs synchronously
 * (Used in useLiveQuery where we can't await)
 */
function getDescendantSlugsSync(
  pawkitSlug: string,
  collections: LocalCollection[]
): string[] {
  // Find the Pawkit by slug
  const pawkit = collections.find((c) => c.slug === pawkitSlug);
  if (!pawkit) return [];

  const descendants: string[] = [];

  function findChildren(parentId: string) {
    const children = collections.filter((c) => c.parentId === parentId);
    for (const child of children) {
      descendants.push(child.slug);
      findChildren(child.id);
    }
  }

  findChildren(pawkit.id);
  return descendants;
}

/**
 * Get all workspaces
 */
export function useWorkspaces(): LocalWorkspace[] {
  const workspaces = useLiveQuery(
    async () => {
      return db.workspaces.filter((w) => !w._deleted).toArray();
    },
    [],
    []
  );

  return workspaces;
}

/**
 * Get the current/default workspace
 */
export function useDefaultWorkspace(): LocalWorkspace | null {
  const workspace = useLiveQuery(
    async () => {
      const workspaces = await db.workspaces.filter((w) => !w._deleted).toArray();
      return workspaces.find((w) => w.isDefault) || workspaces[0] || null;
    },
    [],
    null
  );

  return workspace;
}

/**
 * Get all calendar events for a workspace
 * Uses DataContext when available, falls back to direct query otherwise
 * This enables real-time updates when supertag cards generate calendar events
 */
export function useCalendarEvents(workspaceId: string | undefined): LocalCalendarEvent[] {
  const isInProvider = useIsInDataProvider();
  const contextEvents = useCalendarEventsFromContext();

  // Direct query fallback
  const directEvents = useLiveQuery(
    async () => {
      if (isInProvider) return [];
      if (!workspaceId) return [];
      return db.calendarEvents
        .where('workspaceId')
        .equals(workspaceId)
        .filter((e) => !e._deleted)
        .toArray();
    },
    [workspaceId, isInProvider],
    [] as LocalCalendarEvent[]
  );

  return isInProvider ? contextEvents : directEvents;
}
