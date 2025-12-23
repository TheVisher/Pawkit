/**
 * Data Store
 * Manages cards and collections with local-first Dexie storage
 */

import { create } from 'zustand';
import { db, createSyncMetadata, markModified, markDeleted } from '@/lib/db';
import type { LocalCard, LocalCollection, LocalCalendarEvent, SyncQueueItem } from '@/lib/db';
import { scheduleQueueProcess } from '@/lib/services/sync-service';
import { queueMetadataFetch } from '@/lib/services/metadata-service';

interface DataState {
  // State
  cards: LocalCard[];
  collections: LocalCollection[];
  events: LocalCalendarEvent[];
  isLoading: boolean;
  error: string | null;

  // Setters
  setCards: (cards: LocalCard[]) => void;
  setCollections: (collections: LocalCollection[]) => void;
  setEvents: (events: LocalCalendarEvent[]) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;

  // Card actions
  loadCards: (workspaceId: string) => Promise<void>;
  createCard: (card: Omit<LocalCard, 'id' | 'createdAt' | 'updatedAt' | '_synced' | '_lastModified' | '_deleted'>) => Promise<LocalCard>;
  updateCard: (id: string, updates: Partial<LocalCard>) => Promise<void>;
  deleteCard: (id: string) => Promise<void>;
  addCardToCollection: (cardId: string, collectionSlug: string) => Promise<void>;
  removeCardFromCollection: (cardId: string, collectionSlug: string) => Promise<void>;

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
}

// Helper to queue sync and trigger processing
async function queueSync(item: Omit<SyncQueueItem, 'id'>) {
  await db.syncQueue.add(item);
  // Schedule queue processing (debounced)
  scheduleQueueProcess();
}

export const useDataStore = create<DataState>((set, get) => ({
  // Initial state
  cards: [],
  collections: [],
  events: [],
  isLoading: false,
  error: null,

  // Setters
  setCards: (cards) => set({ cards }),
  setCollections: (collections) => set({ collections }),
  setEvents: (events) => set({ events }),
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

    // Queue sync
    await queueSync({
      entityType: 'card',
      entityId: card.id,
      operation: 'create',
      payload: card as unknown as Record<string, unknown>,
      retryCount: 0,
      createdAt: new Date(),
    });

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

    // Queue sync
    await queueSync({
      entityType: 'card',
      entityId: id,
      operation: 'update',
      payload: updates,
      retryCount: 0,
      createdAt: new Date(),
    });
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

    // Queue sync
    await queueSync({
      entityType: 'card',
      entityId: id,
      operation: 'delete',
      retryCount: 0,
      createdAt: new Date(),
    });
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
    await queueSync({
      entityType: 'collection',
      entityId: collection.id,
      operation: 'create',
      payload: collection as unknown as Record<string, unknown>,
      retryCount: 0,
      createdAt: new Date(),
    });

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
    await queueSync({
      entityType: 'collection',
      entityId: id,
      operation: 'update',
      payload: updates,
      retryCount: 0,
      createdAt: new Date(),
    });
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
    await queueSync({
      entityType: 'collection',
      entityId: id,
      operation: 'delete',
      retryCount: 0,
      createdAt: new Date(),
    });
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
      ]);
      set({ isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  clearData: () => {
    set({ cards: [], collections: [], events: [], error: null });
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
    await queueSync({
      entityType: 'event',
      entityId: event.id,
      operation: 'create',
      payload: event as unknown as Record<string, unknown>,
      retryCount: 0,
      createdAt: new Date(),
    });

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
    await queueSync({
      entityType: 'event',
      entityId: id,
      operation: 'update',
      payload: updates,
      retryCount: 0,
      createdAt: new Date(),
    });
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
    await queueSync({
      entityType: 'event',
      entityId: id,
      operation: 'delete',
      retryCount: 0,
      createdAt: new Date(),
    });
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
