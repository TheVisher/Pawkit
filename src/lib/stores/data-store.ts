/**
 * Data Store
 * Manages cards and collections with local-first Dexie storage
 */

import { create } from 'zustand';
import { db, createSyncMetadata, markModified, markDeleted, markRestored } from '@/lib/db';
import type { LocalCard, LocalCollection, LocalCalendarEvent, LocalTodo } from '@/lib/db';
import { addToQueue, clearAllSyncQueue } from '@/lib/services/sync-queue';
import { queueMetadataFetch } from '@/lib/services/metadata-service';
import { useLayoutCacheStore } from './layout-cache-store';

// Expose debug helper on window for console access
if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).__clearSyncQueue = clearAllSyncQueue;
}

interface DataState {
  // State
  cards: LocalCard[];
  collections: LocalCollection[];
  events: LocalCalendarEvent[];
  todos: LocalTodo[];
  isLoading: boolean;
  error: string | null;

  // Setters
  setCards: (cards: LocalCard[]) => void;
  setCollections: (collections: LocalCollection[]) => void;
  setEvents: (events: LocalCalendarEvent[]) => void;
  setTodos: (todos: LocalTodo[]) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;

  // Card actions
  loadCards: (workspaceId: string) => Promise<void>;
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

  // Collection actions
  loadCollections: (workspaceId: string) => Promise<void>;
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
  // Initial state
  cards: [],
  collections: [],
  events: [],
  todos: [],
  isLoading: false,
  error: null,

  // Setters
  setCards: (cards) => set({ cards }),
  setCollections: (collections) => set({ collections }),
  setEvents: (events) => set({ events }),
  setTodos: (todos) => set({ todos }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),

  // ==========================================================================
  // CARD ACTIONS
  // ==========================================================================

  loadCards: async (workspaceId) => {
    try {
      const cards = await db.cards
        .where('workspaceId')
        .equals(workspaceId)
        .filter((c) => !c._deleted)
        .toArray();
      set({ cards });
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  createCard: async (cardData) => {
    // For URL cards, set status to PENDING for metadata fetching
    const isUrlCard = cardData.type === 'url' && cardData.url;

    const card: LocalCard = {
      ...cardData,
      id: crypto.randomUUID(),
      status: isUrlCard ? 'PENDING' : 'READY',
      createdAt: new Date(),
      updatedAt: new Date(),
      ...createSyncMetadata(),
    };

    // Write to Dexie first (local-first)
    await db.cards.add(card);

    // Update Zustand state immediately (optimistic)
    set({ cards: [...get().cards, card] });

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

    // Write to Dexie
    await db.cards.put(updated);

    // Update Zustand state
    set({
      cards: get().cards.map((c) => (c.id === id ? updated : c)),
    });

    // Queue sync (addToQueue handles merging duplicate updates)
    await addToQueue('card', id, 'update', updates as Record<string, unknown>);
  },

  deleteCard: async (id) => {
    const existing = await db.cards.get(id);
    if (!existing) return;

    const deleted = markDeleted(existing);

    // Soft delete in Dexie
    await db.cards.put(deleted);

    // Remove from Zustand state
    set({
      cards: get().cards.filter((c) => c.id !== id),
    });

    // Clear from layout cache
    useLayoutCacheStore.getState().removeHeight(id);

    // Queue sync
    await addToQueue('card', id, 'delete');
  },

  restoreCard: async (id) => {
    const existing = await db.cards.get(id);
    if (!existing || !existing._deleted) return;

    const restored = markRestored(existing);

    // Update in Dexie
    await db.cards.put(restored);

    // Add back to Zustand state
    set({
      cards: [...get().cards, restored],
    });

    // Queue sync (restore = update with _deleted: false)
    await addToQueue('card', id, 'update', { _deleted: false });
  },

  permanentDeleteCard: async (id) => {
    // Actually remove from IndexedDB
    await db.cards.delete(id);

    // Ensure removed from Zustand state
    set({
      cards: get().cards.filter((c) => c.id !== id),
    });

    // Note: We don't queue a sync here because the card should already
    // be marked as deleted on the server. If needed, handle server-side
    // permanent deletion separately.
  },

  addCardToCollection: async (cardId: string, collectionSlug: string) => {
    const card = get().cards.find(c => c.id === cardId);
    if (!card) return;

    // Avoid duplicates
    if (card.collections.includes(collectionSlug)) return;

    const newCollections = [...card.collections, collectionSlug];

    await get().updateCard(cardId, { collections: newCollections });
  },

  removeCardFromCollection: async (cardId: string, collectionSlug: string) => {
    const card = get().cards.find(c => c.id === cardId);
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

  loadCollections: async (workspaceId) => {
    try {
      const collections = await db.collections
        .where('workspaceId')
        .equals(workspaceId)
        .filter((c) => !c._deleted)
        .sortBy('position');
      set({ collections });
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  createCollection: async (collectionData) => {
    const { collections } = get();

    const collection: LocalCollection = {
      ...collectionData,
      id: crypto.randomUUID(),
      position: collections.length, // Add to end
      createdAt: new Date(),
      updatedAt: new Date(),
      ...createSyncMetadata(),
    };

    // Write to Dexie
    await db.collections.add(collection);

    // Update Zustand state
    set({ collections: [...collections, collection] });

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

    // Write to Dexie
    await db.collections.put(updated);

    // Update Zustand state
    set({
      collections: get().collections.map((c) => (c.id === id ? updated : c)),
    });

    // Queue sync
    await addToQueue('collection', id, 'update', updates as Record<string, unknown>);
  },

  deleteCollection: async (id) => {
    const existing = await db.collections.get(id);
    if (!existing || existing.isSystem) return; // Can't delete system collections

    const deleted = markDeleted(existing);

    // Soft delete in Dexie
    await db.collections.put(deleted);

    // Remove from Zustand state
    set({
      collections: get().collections.filter((c) => c.id !== id),
    });

    // Queue sync
    await addToQueue('collection', id, 'delete');
  },

  // ==========================================================================
  // BULK ACTIONS
  // ==========================================================================

  loadAll: async (workspaceId) => {
    set({ isLoading: true, error: null });
    try {
      await Promise.all([
        get().loadCards(workspaceId),
        get().loadCollections(workspaceId),
        get().loadEvents(workspaceId),
        get().loadTodos(workspaceId),
      ]);
      set({ isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  clearData: () => {
    set({ cards: [], collections: [], events: [], todos: [], error: null });
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
// SELECTORS
// =============================================================================

export const selectCards = (state: DataState) => state.cards;
export const selectCollections = (state: DataState) => state.collections;
export const selectIsLoading = (state: DataState) => state.isLoading;

export const selectCardById = (id: string) => (state: DataState) =>
  state.cards.find((c) => c.id === id);

export const selectCollectionBySlug = (slug: string) => (state: DataState) =>
  state.collections.find((c) => c.slug === slug);

export const selectCardsByCollection = (collectionSlug: string) => (state: DataState) =>
  state.cards.filter((c) => c.collections.includes(collectionSlug));

export const selectCardsByType = (type: string) => (state: DataState) =>
  state.cards.filter((c) => c.type === type);

export const selectPinnedCards = (state: DataState) =>
  state.cards.filter((c) => c.pinned);

// =============================================================================
// HOOKS
// =============================================================================

export function useCards() {
  return useDataStore(selectCards);
}

export function useCollections() {
  return useDataStore(selectCollections);
}

export function useDataLoading() {
  return useDataStore(selectIsLoading);
}
