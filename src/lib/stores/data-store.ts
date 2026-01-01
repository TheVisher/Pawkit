/**
 * Data Store
 * Manages cards and collections with local-first Dexie storage
 */

import { create } from 'zustand';
import { db, createSyncMetadata, markModified, markDeleted, markRestored } from '@/lib/db';
import type { LocalCard, LocalCollection, LocalCalendarEvent, LocalTodo } from '@/lib/db';
import { addToQueue, clearAllSyncQueue, resolveConflictOnDelete } from '@/lib/services/sync-queue';
import { queueMetadataFetch } from '@/lib/services/metadata-service';
import { useLayoutCacheStore } from './layout-cache-store';
import { getUpdatedScheduleTagsIfNeeded } from '@/lib/utils/system-tags';

// Expose debug helper on window for console access
if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).__clearSyncQueue = clearAllSyncQueue;
}

interface DataState {
  // State (cards/collections removed - use useLiveQuery hooks from use-live-data.ts)
  events: LocalCalendarEvent[];
  todos: LocalTodo[];
  isLoading: boolean;
  error: string | null;

  // Setters
  setEvents: (events: LocalCalendarEvent[]) => void;
  setTodos: (todos: LocalTodo[]) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;

  // Card actions (write to Dexie, useLiveQuery auto-updates UI)
  createCard: (card: Omit<LocalCard, 'id' | 'createdAt' | 'updatedAt' | '_synced' | '_lastModified' | '_deleted'>) => Promise<LocalCard>;
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

  // Bulk actions
  loadAll: (workspaceId: string) => Promise<void>;
  clearData: () => void;

  // Event actions
  loadEvents: (workspaceId: string) => Promise<void>;
  createEvent: (event: Omit<LocalCalendarEvent, 'id' | 'createdAt' | 'updatedAt' | '_synced' | '_lastModified' | '_deleted'>) => Promise<LocalCalendarEvent>;
  updateEvent: (id: string, updates: Partial<LocalCalendarEvent>) => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;

  // Todo actions
  loadTodos: (workspaceId: string) => Promise<void>;
  createTodo: (todo: Omit<LocalTodo, 'id' | 'createdAt' | 'updatedAt' | '_synced' | '_lastModified' | '_deleted'>) => Promise<LocalTodo>;
  updateTodo: (id: string, updates: Partial<LocalTodo>) => Promise<void>;
  deleteTodo: (id: string) => Promise<void>;
}


export const useDataStore = create<DataState>((set, get) => ({
  // Initial state (cards/collections removed - use useLiveQuery from use-live-data.ts)
  events: [],
  todos: [],
  isLoading: false,
  error: null,

  // Setters
  setEvents: (events) => set({ events }),
  setTodos: (todos) => set({ todos }),
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

    // Queue sync (addToQueue handles merging duplicate updates)
    await addToQueue('card', card.id, 'create');

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

    // Queue sync (addToQueue handles merging duplicate updates)
    await addToQueue('card', id, 'update', updates as Record<string, unknown>);
  },

  deleteCard: async (id) => {
    const existing = await db.cards.get(id);
    if (!existing) return;

    // If this card has a conflict partner, resolve the conflict first
    if (existing.conflictWithId) {
      await resolveConflictOnDelete(id);
    }

    const deleted = markDeleted(existing);

    // Soft delete in Dexie (useLiveQuery will auto-update any observing components)
    await db.cards.put(deleted);

    // Clear from layout cache
    useLayoutCacheStore.getState().removeHeight(id);

    // Queue sync
    await addToQueue('card', id, 'delete');
  },

  restoreCard: async (id) => {
    const existing = await db.cards.get(id);
    if (!existing || !existing._deleted) return;

    const restored = markRestored(existing);

    // Update in Dexie (useLiveQuery will auto-update any observing components)
    await db.cards.put(restored);

    // Queue sync (restore = update with _deleted: false)
    await addToQueue('card', id, 'update', { _deleted: false });
  },

  permanentDeleteCard: async (id) => {
    // Actually remove from IndexedDB (useLiveQuery will auto-update any observing components)
    await db.cards.delete(id);

    // Note: We don't queue a sync here because the card should already
    // be marked as deleted on the server. If needed, handle server-side
    // permanent deletion separately.
  },

  addCardToCollection: async (cardId: string, collectionSlug: string) => {
    const card = await db.cards.get(cardId);
    if (!card) return;

    // Avoid duplicates
    if (card.collections.includes(collectionSlug)) return;

    const newCollections = [...card.collections, collectionSlug];

    await get().updateCard(cardId, { collections: newCollections });
  },

  removeCardFromCollection: async (cardId: string, collectionSlug: string) => {
    const card = await db.cards.get(cardId);
    if (!card) return;

    const newCollections = card.collections.filter(s => s !== collectionSlug);

    await get().updateCard(cardId, { collections: newCollections });
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

    // Permanently delete all trashed cards
    await Promise.all(trashedCards.map((card) => db.cards.delete(card.id)));
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

    // Permanently delete old trashed cards
    await Promise.all(oldTrashedCards.map((card) => db.cards.delete(card.id)));

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

    // Queue sync
    await addToQueue('collection', collection.id, 'create');

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

    // Queue sync
    await addToQueue('collection', id, 'update', updates as Record<string, unknown>);
  },

  deleteCollection: async (id) => {
    const existing = await db.collections.get(id);
    if (!existing || existing.isSystem) return; // Can't delete system collections

    const deleted = markDeleted(existing);

    // Soft delete in Dexie (useLiveQuery will auto-update any observing components)
    await db.collections.put(deleted);

    // Queue sync
    await addToQueue('collection', id, 'delete');
  },

  // ==========================================================================
  // BULK ACTIONS
  // ==========================================================================

  loadAll: async (workspaceId) => {
    set({ isLoading: true, error: null });
    try {
      // Sync schedule tags for cards (handle day changes: scheduled -> due-today -> overdue)
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
            await addToQueue('card', id, 'update', { tags });
          })
        );
      }

      // Load events and todos (these still use Zustand state)
      await Promise.all([
        get().loadEvents(workspaceId),
        get().loadTodos(workspaceId),
      ]);
      set({ isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  clearData: () => {
    set({ events: [], todos: [], error: null });
  },

  // ==========================================================================
  // EVENT ACTIONS
  // ==========================================================================

  loadEvents: async (workspaceId) => {
    try {
      const events = await db.calendarEvents
        .where('workspaceId')
        .equals(workspaceId)
        .filter((e) => !e._deleted)
        .toArray();
      set({ events });
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  createEvent: async (eventData) => {
    const { events } = get();

    const event: LocalCalendarEvent = {
      ...eventData,
      id: crypto.randomUUID(),
      createdAt: new Date(),
      updatedAt: new Date(),
      ...createSyncMetadata(),
    };

    // Write to Dexie
    await db.calendarEvents.add(event);

    // Update Zustand state
    set({ events: [...events, event] });

    // Queue sync
    await addToQueue('event', event.id, 'create');

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

    // Write to Dexie
    await db.calendarEvents.put(updated);

    // Update Zustand state
    set({
      events: get().events.map((e) => (e.id === id ? updated : e)),
    });

    // Queue sync
    await addToQueue('event', id, 'update', updates as Record<string, unknown>);
  },

  deleteEvent: async (id) => {
    const existing = await db.calendarEvents.get(id);
    if (!existing) return;

    const deleted = markDeleted(existing);

    // Soft delete in Dexie
    await db.calendarEvents.put(deleted);

    // Remove from Zustand state
    set({
      events: get().events.filter((e) => e.id !== id),
    });

    // Queue sync
    await addToQueue('event', id, 'delete');
  },

  // ==========================================================================
  // TODO ACTIONS
  // ==========================================================================

  loadTodos: async (workspaceId) => {
    try {
      const todos = await db.todos
        .where('workspaceId')
        .equals(workspaceId)
        .filter((t) => !t._deleted)
        .toArray();
      set({ todos });
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  createTodo: async (todoData) => {
    const { todos } = get();

    const todo: LocalTodo = {
      ...todoData,
      id: crypto.randomUUID(),
      createdAt: new Date(),
      updatedAt: new Date(),
      ...createSyncMetadata(),
    };

    // Write to Dexie
    await db.todos.add(todo);

    // Update Zustand state
    set({ todos: [...todos, todo] });

    // Queue sync
    await addToQueue('todo', todo.id, 'create');

    return todo;
  },

  updateTodo: async (id, updates) => {
    const existing = await db.todos.get(id);
    if (!existing) return;

    const updated = markModified({
      ...existing,
      ...updates,
      updatedAt: new Date(),
    });

    // Write to Dexie
    await db.todos.put(updated);

    // Update Zustand state
    set({
      todos: get().todos.map((t) => (t.id === id ? updated : t)),
    });

    // Queue sync
    await addToQueue('todo', id, 'update', updates as Record<string, unknown>);
  },

  deleteTodo: async (id) => {
    const existing = await db.todos.get(id);
    if (!existing) return;

    const deleted = markDeleted(existing);

    // Soft delete in Dexie
    await db.todos.put(deleted);

    // Remove from Zustand state
    set({
      todos: get().todos.filter((t) => t.id !== id),
    });

    // Queue sync
    await addToQueue('todo', id, 'delete');
  },
}));

// =============================================================================
// SELECTORS (cards/collections removed - use useLiveQuery hooks from use-live-data.ts)
// =============================================================================

export const selectIsLoading = (state: DataState) => state.isLoading;

export function useDataLoading() {
  return useDataStore(selectIsLoading);
}
