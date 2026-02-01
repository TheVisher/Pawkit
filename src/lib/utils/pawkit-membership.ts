/**
 * Pawkit Membership Utilities
 *
 * ARCHITECTURE DECISION: Tags are canonical for Pawkit membership.
 * See: docs/adr/0001-tags-canonical-membership.md
 *
 * A card belongs to a Pawkit if and only if the card's `tags` array
 * contains the Pawkit's `slug`. The `collectionNotes` table is used
 * solely for card ordering within a Pawkit.
 *
 * WARNING: Pawkit slug tags are reserved. Users should not manually
 * create tags that match Pawkit slugs.
 */

import type { Card, Collection } from '@/lib/types/convex';

/**
 * Check if a card belongs to a specific Pawkit.
 * A card is in a Pawkit if its tags array contains the Pawkit's slug.
 */
export function isCardInPawkit(card: Card, pawkitSlug: string): boolean {
  return card.tags?.includes(pawkitSlug) ?? false;
}

/**
 * Check if a card belongs to any Pawkit in the given set.
 * Used for "No Pawkits" filter - returns true if any tag matches a Pawkit slug.
 */
export function isCardInAnyPawkit(card: Card, pawkitSlugs: Set<string>): boolean {
  if (!card.tags || card.tags.length === 0) return false;
  return card.tags.some((tag) => pawkitSlugs.has(tag));
}

/**
 * Build a Set of all Pawkit slugs from collections.
 * Useful for efficient O(1) membership checks.
 */
export function buildPawkitSlugSet(collections: Collection[]): Set<string> {
  return new Set(collections.filter((c) => !c.deleted).map((c) => c.slug));
}

/**
 * Get all descendant slugs for a Pawkit.
 * Used for "leaf-only" display logic: a card tagged with a parent Pawkit
 * should not appear in the parent if it's also tagged with a child Pawkit.
 */
export function getDescendantSlugs(pawkitSlug: string, collections: Collection[]): string[] {
  const pawkit = collections.find((c) => c.slug === pawkitSlug && !c.deleted);
  if (!pawkit) return [];

  const descendants: string[] = [];

  function findChildren(parentId: string) {
    const children = collections.filter((c) => c.parentId === parentId && !c.deleted);
    for (const child of children) {
      descendants.push(child.slug);
      findChildren(child._id);
    }
  }

  findChildren(pawkit._id);
  return descendants;
}

/**
 * Options for getCardsInPawkit filtering.
 */
export interface GetCardsInPawkitOptions {
  /**
   * If true, excludes cards that also have a descendant Pawkit tag.
   * This creates "leaf-only" display where cards appear in the most
   * specific Pawkit they belong to.
   * @default true
   */
  leafOnly?: boolean;
}

/**
 * Get all cards that belong to a Pawkit.
 *
 * By default uses "leaf-only" logic: if a card is tagged with both
 * a parent Pawkit and a child Pawkit, it only appears in the child.
 *
 * @param cards - All cards to filter
 * @param pawkitSlug - The slug of the Pawkit
 * @param collections - All collections (for descendant lookup)
 * @param options - Filtering options
 */
export function getCardsInPawkit(
  cards: Card[],
  pawkitSlug: string,
  collections: Collection[],
  options: GetCardsInPawkitOptions = {}
): Card[] {
  const { leafOnly = true } = options;

  // Get descendant slugs for leaf-only filtering
  const descendantSlugs = leafOnly ? getDescendantSlugs(pawkitSlug, collections) : [];

  return cards.filter((card) => {
    if (card.deleted) return false;
    if (!isCardInPawkit(card, pawkitSlug)) return false;

    // Leaf-only: exclude cards that also have a descendant Pawkit tag
    if (leafOnly && descendantSlugs.length > 0) {
      const hasDescendantTag = descendantSlugs.some((d) => card.tags?.includes(d));
      if (hasDescendantTag) return false;
    }

    return true;
  });
}

/**
 * Check if a card is in a private Pawkit.
 * A card is in a private Pawkit if any of its tags match a private collection slug.
 */
export function isCardInPrivatePawkit(card: Card, privateSlugs: Set<string>): boolean {
  if (privateSlugs.size === 0) return false;
  if (!card.tags || card.tags.length === 0) return false;
  return card.tags.some((tag) => privateSlugs.has(tag));
}

/**
 * Filter cards to exclude those in private Pawkits.
 * Used by Library, Search, Omnibar - views that should not show private cards.
 */
export function filterNonPrivateCards(cards: Card[], privateSlugs: Set<string>): Card[] {
  if (privateSlugs.size === 0) return cards;
  return cards.filter((card) => !isCardInPrivatePawkit(card, privateSlugs));
}
