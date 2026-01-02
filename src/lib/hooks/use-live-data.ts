'use client';

/**
 * Live Data Hooks
 *
 * These hooks read directly from Dexie using useLiveQuery.
 * All windows (main app, portal, extensions) see the same data
 * and automatically update when data changes.
 *
 * This replaces reading from Zustand stores for data.
 * Zustand is still used for UI state (modals, sidebar, etc.)
 */

import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import type { LocalCard, LocalCollection, LocalWorkspace } from '@/lib/db/types';

/**
 * Get all cards for a workspace
 * Automatically updates when cards change in Dexie
 */
export function useCards(workspaceId: string | undefined): LocalCard[] {
  const cards = useLiveQuery(
    async () => {
      if (!workspaceId) return [];
      return db.cards
        .where('workspaceId')
        .equals(workspaceId)
        .filter((c) => !c._deleted)
        .toArray();
    },
    [workspaceId],
    [] // Default value while loading
  );

  return cards;
}

/**
 * Get a single card by ID
 * Automatically updates when the card changes
 */
export function useCard(cardId: string | undefined): LocalCard | undefined {
  const card = useLiveQuery(
    async () => {
      if (!cardId) return undefined;
      const c = await db.cards.get(cardId);
      return c?._deleted ? undefined : c;
    },
    [cardId],
    undefined
  );

  return card;
}

/**
 * Get all collections for a workspace
 * Automatically updates when collections change in Dexie
 */
export function useCollections(workspaceId: string | undefined): LocalCollection[] {
  const collections = useLiveQuery(
    async () => {
      if (!workspaceId) return [];
      return db.collections
        .where('workspaceId')
        .equals(workspaceId)
        .filter((c) => !c._deleted)
        .toArray();
    },
    [workspaceId],
    []
  );

  return collections;
}

/**
 * Get a single collection by slug
 */
export function useCollection(
  workspaceId: string | undefined,
  slug: string | undefined
): LocalCollection | undefined {
  const collection = useLiveQuery(
    async () => {
      if (!workspaceId || !slug) return undefined;
      const collections = await db.collections
        .where('workspaceId')
        .equals(workspaceId)
        .filter((c) => c.slug === slug && !c._deleted)
        .toArray();
      return collections[0];
    },
    [workspaceId, slug],
    undefined
  );

  return collection;
}

/**
 * Get cards in a specific Pawkit (collection)
 *
 * Uses TAG-BASED architecture with LEAF-ONLY display:
 * - Cards are in a Pawkit if they have the Pawkit's slug as a tag
 * - Cards only show in their DEEPEST Pawkit (not parent Pawkits)
 * - A card in "Contacts > Work" has tags [#contacts, #work] but only shows in "Work"
 *
 * See: .claude/skills/pawkit-tag-architecture/SKILL.md
 */
export function useCardsInCollection(
  workspaceId: string | undefined,
  collectionSlug: string | undefined
): LocalCard[] {
  // Get all collections to build descendant lookup
  const collections = useLiveQuery(
    async () => {
      if (!workspaceId) return [];
      return db.collections
        .where('workspaceId')
        .equals(workspaceId)
        .filter((c) => !c._deleted)
        .toArray();
    },
    [workspaceId],
    []
  );

  const cards = useLiveQuery(
    async () => {
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
      const descendantSlugs = getDescendantSlugsSync(collectionSlug, collections);

      // Use indexed tag query, then filter for leaf-only display
      const cardsWithTag = await db.cards
        .where('tags')
        .equals(collectionSlug)
        .filter((c) => c.workspaceId === workspaceId && !c._deleted)
        .toArray();

      // Leaf-only: exclude cards that have a descendant Pawkit tag
      // (those cards "live" in the child Pawkit, not this one)
      return cardsWithTag.filter((card) => {
        const hasDescendantTag = descendantSlugs.some((d) =>
          card.tags?.includes(d)
        );
        return !hasDescendantTag;
      });
    },
    [workspaceId, collectionSlug, collections],
    []
  );

  return cards;
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
