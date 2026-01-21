/**
 * Data Store
 * Manages cards and collections with local-first Dexie storage
 */

import { create } from 'zustand';
import { db, createSyncMetadata, markModified, markDeleted, markRestored } from '@/lib/db';
import type { LocalCard, LocalCollection, LocalCalendarEvent, LocalReference } from '@/lib/db';
import { addToQueue, clearAllSyncQueue, resolveConflictOnDelete, triggerSync } from '@/lib/services/sync-queue';
import { queueMetadataFetch } from '@/lib/services/metadata-service';
import { useLayoutCacheStore } from './layout-cache-store';
import { getUpdatedScheduleTagsIfNeeded } from '@/lib/utils/system-tags';
import {
  addCardToPawkit,
  removeCardFromPawkit,
} from '@/lib/migrations/tag-architecture-migration';
import { slugify } from '@/lib/utils';
import { SYSTEM_TAGS } from '@/lib/constants/system-tags';
import { ensureSystemPrivatePawkit, getEffectivePawkitPrivacy } from '@/lib/services/privacy';
import { removeCardFromCalendar } from '@/lib/utils/card-calendar-sync';

// Type declaration for debug helpers exposed on window
declare global {
  interface Window {
    __clearSyncQueue?: typeof clearAllSyncQueue;
  }
}

// Expose debug helper on window for console access
if (typeof window !== 'undefined') {
  window.__clearSyncQueue = clearAllSyncQueue;
}

/**
 * Check if an update only contains local-only fields that shouldn't trigger version conflicts.
 * Local-only fields are organizational metadata that don't represent content changes.
 */
const LOCAL_ONLY_FIELDS = new Set([
  'tags',
  'collections',
  'pinned',
  'isRead',
  'readProgress',
  'headerGradientColor',
  'headerImagePosition',
  // Image optimization fields - extracted locally, no need to sync
  'dominantColor',
  'aspectRatio',
]);

function isLocalOnlyUpdate(updates: Partial<LocalCard>): boolean {
  const updateKeys = Object.keys(updates);
  return updateKeys.length > 0 && updateKeys.every(key => LOCAL_ONLY_FIELDS.has(key));
}

interface DataState {
  // State (cards/collections use useLiveQuery hooks from use-live-data.ts)
  isLoading: boolean;
  error: string | null;

  // Setters
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;

  // Card actions (write to Dexie, useLiveQuery auto-updates UI)
  createCard: (card: Omit<LocalCard, 'id' | 'version' | 'createdAt' | 'updatedAt' | '_synced' | '_lastModified' | '_deleted'>) => Promise<LocalCard>;
  updateCard: (id: string, updates: Partial<LocalCard>) => Promise<void>;
  deleteCard: (id: string) => Promise<void>;
  restoreCard: (id: string) => Promise<void>;
  permanentDeleteCard: (id: string) => Promise<void>;
  addCardToCollection: (cardId: string, collectionSlug: string) => Promise<void>;
  removeCardFromCollection: (cardId: string, collectionSlug: string) => Promise<void>;

  // Trash actions
  loadTrashedCards: (workspaceId: string) => Promise<LocalCard[]>;
  emptyTrash: (workspaceId: string) => Promise<void>;
  purgeOldTrash: (workspaceId: string, maxAgeDays?: number) => Promise<number>;

  // Collection actions (write to Dexie, useLiveQuery auto-updates UI)
  createCollection: (collection: Omit<LocalCollection, 'id' | 'createdAt' | 'updatedAt' | '_synced' | '_lastModified' | '_deleted'>) => Promise<LocalCollection>;
  updateCollection: (id: string, updates: Partial<LocalCollection>) => Promise<void>;
  deleteCollection: (id: string) => Promise<void>;
  renamePawkit: (id: string, newName: string) => Promise<{ success: boolean; error?: string }>;

  // Bulk actions
  loadAll: (workspaceId: string) => Promise<void>;
  clearData: () => void;

  // Event actions (write to Dexie - reads come from DataContext's useLiveQuery)
  createEvent: (event: Omit<LocalCalendarEvent, 'id' | 'createdAt' | 'updatedAt' | '_synced' | '_lastModified' | '_deleted'>) => Promise<LocalCalendarEvent>;
  updateEvent: (id: string, updates: Partial<LocalCalendarEvent>) => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;

  // Reference actions (@ mentions)
  createReference: (ref: Omit<LocalReference, 'id' | 'createdAt' | 'updatedAt' | '_synced' | '_lastModified' | '_deleted'>) => Promise<LocalReference>;
  deleteReference: (id: string) => Promise<void>;
  deleteReferencesBySource: (sourceId: string) => Promise<void>;
  getReferencesForCard: (cardId: string) => Promise<LocalReference[]>;
  getBacklinksForCard: (cardId: string) => Promise<LocalReference[]>;
}


export const useDataStore = create<DataState>((set, get) => ({
  // Initial state
  isLoading: false,
  error: null,

  // Setters
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),

  // ==========================================================================
  // CARD ACTIONS
  // ==========================================================================

  createCard: async (cardData) => {
    // For URL cards, set status to PENDING for metadata fetching
    const isUrlCard = cardData.type === 'url' && cardData.url;

    const card: LocalCard = {
      ...cardData,
      id: crypto.randomUUID(),
      status: isUrlCard ? 'PENDING' : 'READY',
      version: 1, // Initial version for conflict detection
      createdAt: new Date(),
      updatedAt: new Date(),
      ...createSyncMetadata(),
    };

    // Write to Dexie (useLiveQuery will auto-update any observing components)
    await db.cards.add(card);

    // Queue sync and trigger immediately (create is a discrete action)
    await addToQueue('card', card.id, 'create');
    triggerSync();

    // Queue metadata fetch for URL cards (fire-and-forget)
    if (isUrlCard) {
      // Use setTimeout to ensure card is saved before metadata fetch
      setTimeout(() => {
        queueMetadataFetch(card.id);
      }, 100);
    }

    return card;
  },

  updateCard: async (id, updates) => {
    const existing = await db.cards.get(id);
    if (!existing) return;

    const updated = markModified({
      ...existing,
      ...updates,
      updatedAt: new Date(),
    });

    // Write to Dexie (useLiveQuery will auto-update any observing components)
    await db.cards.put(updated);

    // Handle privacy state transitions for tag changes
    if (updates.tags) {
      const oldTags = existing.tags || [];
      const newTags = updates.tags || [];

      const wasLocalOnly = oldTags.includes(SYSTEM_TAGS.LOCAL_ONLY);
      const isNowLocalOnly = newTags.includes(SYSTEM_TAGS.LOCAL_ONLY);

      // Card became local-only → delete from server
      if (!wasLocalOnly && isNowLocalOnly) {
        await addToQueue('card', id, 'delete');
        triggerSync();
        return; // Don't queue an update - we just deleted it
      }

      // Card stopped being local-only → upload to server
      if (wasLocalOnly && !isNowLocalOnly) {
        await addToQueue('card', id, 'create');
        triggerSync();
        return; // Queue a create, not an update
      }

      // Ensure system Private Pawkit exists if #private tag is added
      if (newTags.includes(SYSTEM_TAGS.PRIVATE) && !oldTags.includes(SYSTEM_TAGS.PRIVATE)) {
        await ensureSystemPrivatePawkit(existing.workspaceId);
      }
    }

    // Check if this is a local-only update (tags, metadata) that shouldn't trigger conflicts
    const skipConflictCheck = isLocalOnlyUpdate(updates);

    // Queue sync (addToQueue handles merging duplicate updates)
    await addToQueue('card', id, 'update', updates as Record<string, unknown>, { skipConflictCheck });
  },

  deleteCard: async (id) => {
    const existing = await db.cards.get(id);
    if (!existing) return;

    // Remove associated calendar events before deleting
    try {
      await removeCardFromCalendar(id);
    } catch (err) {
      console.warn('[DataStore] Failed to remove calendar events for card:', id, err);
    }

    // If this card has a conflict partner, resolve the conflict first
    if (existing.conflictWithId) {
      await resolveConflictOnDelete(id);
    }

    const deleted = markDeleted(existing);

    // Soft delete in Dexie (useLiveQuery will auto-update any observing components)
    await db.cards.put(deleted);

    // Clear from layout cache
    useLayoutCacheStore.getState().removeHeight(id);

    // Queue sync and trigger immediately (delete is a discrete action)
    await addToQueue('card', id, 'delete');
    triggerSync();
  },

  restoreCard: async (id) => {
    const existing = await db.cards.get(id);
    if (!existing || !existing._deleted) return;

    const restored = markRestored(existing);

    // Update in Dexie (useLiveQuery will auto-update any observing components)
    await db.cards.put(restored);

    // Queue sync (restore = update with _deleted: false) and trigger immediately
    await addToQueue('card', id, 'update', { _deleted: false });
    triggerSync();
  },

  permanentDeleteCard: async (id) => {
    // Actually remove from IndexedDB (useLiveQuery will auto-update any observing components)
    await db.cards.delete(id);

    // Queue permanent delete for server sync and trigger immediately
    // This triggers a DELETE event in Supabase Realtime, syncing to other devices
    await addToQueue('card', id, 'permanent-delete');
    triggerSync();
  },

  // Add card to Pawkit using tag-based architecture
  // This adds the Pawkit slug AND all ancestor slugs to the card's tags
  // See: .claude/skills/pawkit-tag-architecture/SKILL.md
  addCardToCollection: async (cardId: string, collectionSlug: string) => {
    const card = await db.cards.get(cardId);
    if (!card) return;

    // Use tag-based Pawkit assignment (adds ancestor tags)
    // Note: addCardToPawkit handles queuing with skipConflictCheck=true
    await addCardToPawkit(cardId, collectionSlug, card.workspaceId);
  },

  // Remove card from Pawkit using tag-based architecture
  // This removes the Pawkit slug AND all ancestor slugs from the card's tags
  removeCardFromCollection: async (cardId: string, collectionSlug: string) => {
    const card = await db.cards.get(cardId);
    if (!card) return;

    // Use tag-based Pawkit removal (removes ancestor tags)
    // Note: removeCardFromPawkit handles queuing with skipConflictCheck=true
    await removeCardFromPawkit(cardId, collectionSlug, card.workspaceId);
  },

  // ==========================================================================
  // TRASH ACTIONS
  // ==========================================================================

  loadTrashedCards: async (workspaceId) => {
    return db.cards
      .where('workspaceId')
      .equals(workspaceId)
      .filter((c) => c._deleted === true)
      .toArray();
  },

  emptyTrash: async (workspaceId) => {
    const trashedCards = await db.cards
      .where('workspaceId')
      .equals(workspaceId)
      .filter((c) => c._deleted === true)
      .toArray();

    // Permanently delete all trashed cards and queue for server sync
    await Promise.all(trashedCards.map(async (card) => {
      await db.cards.delete(card.id);
      // Queue permanent delete - triggers DELETE event in Supabase Realtime
      await addToQueue('card', card.id, 'permanent-delete');
    }));

    // Trigger sync immediately for all queued deletes
    if (trashedCards.length > 0) {
      triggerSync();
    }
  },

  purgeOldTrash: async (workspaceId, maxAgeDays = 30) => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - maxAgeDays);

    const oldTrashedCards = await db.cards
      .where('workspaceId')
      .equals(workspaceId)
      .filter((c) => {
        if (!c._deleted) return false;
        // Use _deletedAt if available, fall back to _lastModified
        const deletedAt = c._deletedAt || c._lastModified;
        return deletedAt && new Date(deletedAt) < cutoffDate;
      })
      .toArray();

    // Permanently delete old trashed cards and queue for server sync
    await Promise.all(oldTrashedCards.map(async (card) => {
      await db.cards.delete(card.id);
      // Queue permanent delete - triggers DELETE event in Supabase Realtime
      await addToQueue('card', card.id, 'permanent-delete');
    }));

    // Trigger sync immediately for all queued deletes
    if (oldTrashedCards.length > 0) {
      triggerSync();
    }

    return oldTrashedCards.length;
  },

  // ==========================================================================
  // COLLECTION ACTIONS
  // ==========================================================================

  createCollection: async (collectionData) => {
    // Get current collection count for position
    const existingCount = await db.collections
      .where('workspaceId')
      .equals(collectionData.workspaceId)
      .filter((c) => !c._deleted)
      .count();

    const collection: LocalCollection = {
      ...collectionData,
      id: crypto.randomUUID(),
      position: existingCount, // Add to end
      createdAt: new Date(),
      updatedAt: new Date(),
      ...createSyncMetadata(),
    };

    // Write to Dexie (useLiveQuery will auto-update any observing components)
    await db.collections.add(collection);

    // Queue sync and trigger immediately (create is a discrete action)
    await addToQueue('collection', collection.id, 'create');
    triggerSync();

    return collection;
  },

  updateCollection: async (id, updates) => {
    const existing = await db.collections.get(id);
    if (!existing) return;

    const updated = markModified({
      ...existing,
      ...updates,
      updatedAt: new Date(),
    });

    // Write to Dexie (useLiveQuery will auto-update any observing components)
    await db.collections.put(updated);

    // Handle local-only transition: if Pawkit just became local-only,
    // delete it and all its cards from the server
    const wasLocalOnly = existing.isLocalOnly === true;
    const isNowLocalOnly = updates.isLocalOnly === true;

    if (!wasLocalOnly && isNowLocalOnly) {
      // Get all collections to check for descendants
      const allCollections = await db.collections
        .where('workspaceId')
        .equals(existing.workspaceId)
        .filter((c) => !c._deleted)
        .toArray();

      // Find all descendant Pawkit slugs (children, grandchildren, etc.)
      const descendantSlugs: string[] = [];
      function findDescendants(parentId: string) {
        const children = allCollections.filter((c) => c.parentId === parentId);
        for (const child of children) {
          descendantSlugs.push(child.slug);
          findDescendants(child.id);
        }
      }
      findDescendants(id);

      // All slugs affected: this Pawkit + all descendants
      const affectedSlugs = [existing.slug, ...descendantSlugs];

      // Find all cards that have any of these slugs as tags
      const cardsToDelete = await db.cards
        .where('workspaceId')
        .equals(existing.workspaceId)
        .filter((card) => {
          if (card._deleted) return false;
          const cardTags = card.tags || [];
          return affectedSlugs.some((slug) => cardTags.includes(slug));
        })
        .toArray();

      // Delete collection from server
      await addToQueue('collection', id, 'delete');

      // Delete all descendant collections from server too
      for (const slug of descendantSlugs) {
        const descendantCollection = allCollections.find((c) => c.slug === slug);
        if (descendantCollection) {
          await addToQueue('collection', descendantCollection.id, 'delete');
        }
      }

      // Delete all affected cards from server
      for (const card of cardsToDelete) {
        await addToQueue('card', card.id, 'delete');
      }

      triggerSync();
      return; // Don't queue an update - we queued deletes
    }

    // Handle reverse transition: if Pawkit stopped being local-only,
    // re-upload it and all its cards to the server
    if (wasLocalOnly && !isNowLocalOnly) {
      // Get all collections to check for descendants
      const allCollections = await db.collections
        .where('workspaceId')
        .equals(existing.workspaceId)
        .filter((c) => !c._deleted)
        .toArray();

      // Find all descendant Pawkit slugs
      const descendantSlugs: string[] = [];
      function findDescendants(parentId: string) {
        const children = allCollections.filter((c) => c.parentId === parentId);
        for (const child of children) {
          descendantSlugs.push(child.slug);
          findDescendants(child.id);
        }
      }
      findDescendants(id);

      const affectedSlugs = [existing.slug, ...descendantSlugs];

      // Find all cards that have any of these slugs as tags
      const cardsToCreate = await db.cards
        .where('workspaceId')
        .equals(existing.workspaceId)
        .filter((card) => {
          if (card._deleted) return false;
          const cardTags = card.tags || [];
          return affectedSlugs.some((slug) => cardTags.includes(slug));
        })
        .toArray();

      // Re-upload collection to server
      await addToQueue('collection', id, 'create');

      // Re-upload all descendant collections
      for (const slug of descendantSlugs) {
        const descendantCollection = allCollections.find((c) => c.slug === slug);
        if (descendantCollection) {
          await addToQueue('collection', descendantCollection.id, 'create');
        }
      }

      // Re-upload all affected cards
      for (const card of cardsToCreate) {
        await addToQueue('card', card.id, 'create');
      }

      triggerSync();
      return; // Don't queue an update - we queued creates
    }

    // Queue sync and trigger immediately (update is a discrete action)
    await addToQueue('collection', id, 'update', updates as Record<string, unknown>);
    triggerSync();
  },

  deleteCollection: async (id) => {
    const existing = await db.collections.get(id);
    if (!existing || existing.isSystem) return; // Can't delete system collections

    const deleted = markDeleted(existing);

    // Soft delete in Dexie (useLiveQuery will auto-update any observing components)
    await db.collections.put(deleted);

    // Queue sync and trigger immediately (delete is a discrete action)
    await addToQueue('collection', id, 'delete');
    triggerSync();
  },

  // Rename a Pawkit - updates both name and slug, and updates all card tags
  renamePawkit: async (id, newName) => {
    const existing = await db.collections.get(id);
    if (!existing) return { success: false, error: 'Pawkit not found' };
    if (existing.isSystem) return { success: false, error: 'Cannot rename system Pawkits' };

    const newSlug = slugify(newName);
    const oldSlug = existing.slug;

    // Check if new slug already exists (different collection)
    if (newSlug !== oldSlug) {
      const slugExists = await db.collections
        .where('[workspaceId+slug]')
        .equals([existing.workspaceId, newSlug])
        .first();

      if (slugExists && slugExists.id !== id && !slugExists._deleted) {
        return { success: false, error: 'A Pawkit with this name already exists' };
      }
    }

    // Update the collection
    const updated = markModified({
      ...existing,
      name: newName.trim(),
      slug: newSlug,
      updatedAt: new Date(),
    });

    await db.collections.put(updated);
    await addToQueue('collection', id, 'update', { name: newName.trim(), slug: newSlug });

    // Update all cards that have the old slug in their tags
    if (newSlug !== oldSlug) {
      const cardsWithOldSlug = await db.cards
        .where('workspaceId')
        .equals(existing.workspaceId)
        .filter((card) => !card._deleted && card.tags?.includes(oldSlug))
        .toArray();

      for (const card of cardsWithOldSlug) {
        const newTags = card.tags.map((tag) => (tag === oldSlug ? newSlug : tag));
        await db.cards.update(card.id, {
          tags: newTags,
          _synced: false,
          _lastModified: new Date(),
        });
        // Tag updates are local-only, skip conflict check
        await addToQueue('card', card.id, 'update', { tags: newTags }, { skipConflictCheck: true });
      }
    }

    triggerSync();
    return { success: true };
  },

  // ==========================================================================
  // BULK ACTIONS
  // ==========================================================================

  loadAll: async (workspaceId) => {
    set({ isLoading: true, error: null });
    try {
      // Only check schedule tags once per day (not on every app load)
      // This prevents unnecessary sync queue items and potential race conditions
      const SCHEDULE_CHECK_KEY = 'pawkit:lastScheduleTagCheckDate';
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      const lastCheckDate = localStorage.getItem(SCHEDULE_CHECK_KEY);

      if (lastCheckDate !== today) {
        // It's a new day - check and update schedule tags
        const cards = await db.cards
          .where('workspaceId')
          .equals(workspaceId)
          .filter((c) => !c._deleted)
          .toArray();

        const cardsToUpdate: { id: string; tags: string[] }[] = [];
        for (const card of cards) {
          const updatedTags = getUpdatedScheduleTagsIfNeeded(card);
          if (updatedTags) {
            cardsToUpdate.push({ id: card.id, tags: updatedTags });
          }
        }

        // Batch update cards that need schedule tag sync
        if (cardsToUpdate.length > 0) {
          await Promise.all(
            cardsToUpdate.map(async ({ id, tags }) => {
              await db.cards.update(id, { tags, _synced: false, _lastModified: new Date() });
              // Schedule tag updates are local-only, skip conflict check
              await addToQueue('card', id, 'update', { tags }, { skipConflictCheck: true });
            })
          );
        }

        // Mark today as checked
        localStorage.setItem(SCHEDULE_CHECK_KEY, today);
      }

      set({ isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  clearData: () => {
    set({ error: null });
  },

  // ==========================================================================
  // EVENT ACTIONS (write to Dexie, reads via DataContext's useLiveQuery)
  // ==========================================================================

  createEvent: async (eventData) => {
    const event: LocalCalendarEvent = {
      ...eventData,
      id: crypto.randomUUID(),
      createdAt: new Date(),
      updatedAt: new Date(),
      ...createSyncMetadata(),
    };

    // Write to Dexie (useLiveQuery in DataContext will auto-update)
    await db.calendarEvents.add(event);

    // Queue sync and trigger immediately (create is a discrete action)
    await addToQueue('event', event.id, 'create');
    triggerSync();

    return event;
  },

  updateEvent: async (id, updates) => {
    const existing = await db.calendarEvents.get(id);
    if (!existing) return;

    const updated = markModified({
      ...existing,
      ...updates,
      updatedAt: new Date(),
    });

    // Write to Dexie (useLiveQuery in DataContext will auto-update)
    await db.calendarEvents.put(updated);

    // Queue sync and trigger immediately (update is a discrete action)
    await addToQueue('event', id, 'update', updates as Record<string, unknown>);
    triggerSync();
  },

  deleteEvent: async (id) => {
    const existing = await db.calendarEvents.get(id);
    if (!existing) return;

    const deleted = markDeleted(existing);

    // Soft delete in Dexie (useLiveQuery in DataContext will auto-update)
    await db.calendarEvents.put(deleted);

    // Queue sync and trigger immediately (delete is a discrete action)
    await addToQueue('event', id, 'delete');
    triggerSync();
  },

  // ==========================================================================
  // REFERENCE ACTIONS (@ mentions)
  // ==========================================================================

  createReference: async (refData) => {
    const ref: LocalReference = {
      ...refData,
      id: crypto.randomUUID(),
      createdAt: new Date(),
      updatedAt: new Date(),
      ...createSyncMetadata(),
    };

    // Write to Dexie
    await db.references.add(ref);

    // Queue sync and trigger immediately (create is a discrete action)
    await addToQueue('reference', ref.id, 'create');
    triggerSync();

    return ref;
  },

  deleteReference: async (id) => {
    const existing = await db.references.get(id);
    if (!existing) return;

    const deleted = markDeleted(existing);

    // Soft delete in Dexie
    await db.references.put(deleted);

    // Queue sync and trigger immediately (delete is a discrete action)
    await addToQueue('reference', id, 'delete');
    triggerSync();
  },

  deleteReferencesBySource: async (sourceId) => {
    // Get all references from this source card
    const refs = await db.references
      .where('sourceId')
      .equals(sourceId)
      .filter((r) => !r._deleted)
      .toArray();

    // Delete each one
    for (const ref of refs) {
      const deleted = markDeleted(ref);
      await db.references.put(deleted);
      await addToQueue('reference', ref.id, 'delete');
    }

    // Trigger sync once after all deletions are queued
    if (refs.length > 0) {
      triggerSync();
    }
  },

  getReferencesForCard: async (cardId) => {
    // Get outgoing references (what this card links to)
    return db.references
      .where('sourceId')
      .equals(cardId)
      .filter((r) => !r._deleted)
      .toArray();
  },

  getBacklinksForCard: async (cardId) => {
    // Get incoming references (what links to this card)
    return db.references
      .where('targetId')
      .equals(cardId)
      .filter((r) => !r._deleted && r.targetType === 'card')
      .toArray();
  },
}));

// =============================================================================
// SELECTORS
// =============================================================================

export const selectIsLoading = (state: DataState) => state.isLoading;

export function useDataLoading() {
  return useDataStore(selectIsLoading);
}
