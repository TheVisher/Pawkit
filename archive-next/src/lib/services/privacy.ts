/**
 * Privacy Service
 * Core functions for computing privacy state of Pawkits and Cards
 */

import type { LocalCard, LocalCollection } from '@/lib/db';
import { db } from '@/lib/db';
import { SYSTEM_TAGS } from '@/lib/constants/system-tags';

// =============================================================================
// TYPES
// =============================================================================

export interface PrivacyState {
  isPrivate: boolean;
  isLocalOnly: boolean;
  inherited: boolean;
}

export interface CardPrivacy {
  isPrivate: boolean;
  isLocalOnly: boolean;
  source: 'tag' | 'pawkit' | 'normal';
}

// =============================================================================
// SYSTEM PRIVATE PAWKIT
// =============================================================================

const SYSTEM_PRIVATE_PAWKIT = {
  slug: 'private',
  name: 'Private',
  isPrivate: true,
  isLocalOnly: false,
  isSystem: true,
} as const;

/**
 * Ensure the system Private Pawkit exists for a workspace
 * Auto-creates on first use of #private tag
 */
export async function ensureSystemPrivatePawkit(workspaceId: string): Promise<LocalCollection> {
  const existing = await db.collections
    .where('[workspaceId+slug]')
    .equals([workspaceId, SYSTEM_PRIVATE_PAWKIT.slug])
    .first();

  if (existing) return existing;

  const pawkit: LocalCollection = {
    id: crypto.randomUUID(),
    slug: SYSTEM_PRIVATE_PAWKIT.slug,
    name: SYSTEM_PRIVATE_PAWKIT.name,
    workspaceId,
    parentId: undefined,
    position: 999999, // Put at end
    isPrivate: true,
    isLocalOnly: false,
    isSystem: true,
    hidePreview: false,
    useCoverAsBackground: false,
    pinned: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    _synced: false,
    _lastModified: new Date(),
    _deleted: false,
  };

  await db.collections.add(pawkit);
  // Note: System pawkits are created locally on each device, not synced
  return pawkit;
}

// =============================================================================
// PAWKIT PRIVACY (with inheritance)
// =============================================================================

/**
 * Get the effective privacy state for a Pawkit, including inheritance from parents
 */
export function getEffectivePawkitPrivacy(
  pawkit: LocalCollection,
  allPawkits: LocalCollection[]
): PrivacyState {
  // Explicit setting on this pawkit takes priority
  const hasExplicitPrivate = pawkit.isPrivate === true;
  const hasExplicitLocalOnly = pawkit.isLocalOnly === true;

  if (hasExplicitPrivate || hasExplicitLocalOnly) {
    return {
      isPrivate: pawkit.isPrivate ?? false,
      isLocalOnly: pawkit.isLocalOnly ?? false,
      inherited: false,
    };
  }

  // Inherit from parent
  if (pawkit.parentId) {
    const parent = allPawkits.find((p) => p.id === pawkit.parentId);
    if (parent) {
      const parentPrivacy = getEffectivePawkitPrivacy(parent, allPawkits);
      if (parentPrivacy.isPrivate || parentPrivacy.isLocalOnly) {
        return {
          ...parentPrivacy,
          inherited: true,
        };
      }
    }
  }

  // Default: normal (not private, not local-only)
  return { isPrivate: false, isLocalOnly: false, inherited: false };
}

// =============================================================================
// CARD PRIVACY
// =============================================================================

/**
 * Get the privacy state for a card based on its tags and Pawkit memberships
 */
export function getCardPrivacy(card: LocalCard, pawkits: LocalCollection[]): CardPrivacy {
  // 1. Direct tags take priority (most restrictive wins)
  const hasPrivateTag = card.tags?.includes(SYSTEM_TAGS.PRIVATE) ?? false;
  const hasLocalOnlyTag = card.tags?.includes(SYSTEM_TAGS.LOCAL_ONLY) ?? false;

  if (hasPrivateTag || hasLocalOnlyTag) {
    return {
      isPrivate: hasPrivateTag,
      isLocalOnly: hasLocalOnlyTag,
      source: 'tag',
    };
  }

  // 2. Check Pawkit membership - find the most restrictive Pawkit
  const cardTags = card.tags || [];
  for (const tag of cardTags) {
    const pawkit = pawkits.find((p) => p.slug === tag && !p._deleted);
    if (pawkit) {
      const pawkitPrivacy = getEffectivePawkitPrivacy(pawkit, pawkits);
      if (pawkitPrivacy.isPrivate || pawkitPrivacy.isLocalOnly) {
        return {
          isPrivate: pawkitPrivacy.isPrivate,
          isLocalOnly: pawkitPrivacy.isLocalOnly,
          source: 'pawkit',
        };
      }
    }
  }

  // 3. Normal card (not private, not local-only)
  return { isPrivate: false, isLocalOnly: false, source: 'normal' };
}

// =============================================================================
// SYNC HELPERS
// =============================================================================

/**
 * Check if a card should be synced to the server
 * Returns false if card is local-only (via tag or Pawkit)
 */
export function shouldSyncCard(card: LocalCard, pawkits: LocalCollection[]): boolean {
  const privacy = getCardPrivacy(card, pawkits);
  return !privacy.isLocalOnly;
}

// =============================================================================
// FILTERING HELPERS
// =============================================================================

/**
 * Filter cards for Library view (excludes private cards)
 */
export function filterLibraryCards(cards: LocalCard[], pawkits: LocalCollection[]): LocalCard[] {
  return cards.filter((card) => {
    const privacy = getCardPrivacy(card, pawkits);
    return !privacy.isPrivate;
  });
}

/**
 * Filter cards for search results (excludes private cards)
 */
export function filterSearchCards(cards: LocalCard[], pawkits: LocalCollection[]): LocalCard[] {
  return cards.filter((card) => {
    const privacy = getCardPrivacy(card, pawkits);
    return !privacy.isPrivate;
  });
}

/**
 * Filter cards for Kit AI context (excludes private cards)
 */
export function filterKitContextCards(cards: LocalCard[], pawkits: LocalCollection[]): LocalCard[] {
  return cards.filter((card) => {
    const privacy = getCardPrivacy(card, pawkits);
    return !privacy.isPrivate;
  });
}

/**
 * Filter cards for calendar view (excludes private cards)
 */
export function filterCalendarCards(cards: LocalCard[], pawkits: LocalCollection[]): LocalCard[] {
  return cards.filter((card) => {
    if (!card.scheduledDates?.length && !card.scheduledDate) return false;
    const privacy = getCardPrivacy(card, pawkits);
    return !privacy.isPrivate;
  });
}
