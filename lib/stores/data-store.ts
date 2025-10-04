import { create } from 'zustand';
import { CardDTO } from '@/lib/server/cards';
import { CollectionNode } from '@/lib/types';
import { syncQueue, QueueOperation } from '@/lib/services/sync-queue';

type DataStore = {
  // Data
  cards: CardDTO[];
  collections: CollectionNode[];

  // Loading states
  isLoading: boolean;
  isInitialized: boolean;

  // Actions
  initialize: () => Promise<void>;
  drainQueue: () => Promise<void>;
  addCard: (cardData: Partial<CardDTO>) => Promise<void>;
  updateCard: (id: string, updates: Partial<CardDTO>) => Promise<void>;
  deleteCard: (id: string) => Promise<void>;
  addCollection: (collection: CollectionNode) => Promise<void>;
  updateCollection: (id: string, updates: Partial<CollectionNode>) => Promise<void>;
  deleteCollection: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
};

export const useDataStore = create<DataStore>((set, get) => ({
  cards: [],
  collections: [],
  isLoading: false,
  isInitialized: false,

  initialize: async () => {
    if (get().isInitialized) {
      console.log('[DataStore] initialize() skipped - already initialized');
      return;
    }

    console.log('[DataStore] initialize() starting...');
    set({ isLoading: true });

    try {
      console.log('[DataStore] Fetching cards and collections...');
      // Fetch ALL data once
      const [cardsRes, collectionsRes] = await Promise.all([
        fetch('/api/cards?limit=1000'), // Get all cards
        fetch('/api/pawkits')
      ]);

      const cardsData = await cardsRes.json();
      const collectionsData = await collectionsRes.json();

      console.log('[DataStore] Fetched', (cardsData.items || []).length, 'cards and', (collectionsData.tree || []).length, 'collections');

      set({
        cards: cardsData.items || [],
        collections: collectionsData.tree || [],
        isInitialized: true,
        isLoading: false
      });

      console.log('[DataStore] initialize() complete');
    } catch (error) {
      console.error('Failed to initialize data store:', error);
      set({ isLoading: false });
    }
  },

  refresh: async () => {
    console.log('[DataStore] refresh() called');

    // Force re-fetch by directly calling the fetch logic, bypassing the isInitialized check
    set({ isLoading: true, isInitialized: false });

    try {
      console.log('[DataStore] Fetching cards and collections...');
      const [cardsRes, collectionsRes] = await Promise.all([
        fetch('/api/cards?limit=1000'),
        fetch('/api/pawkits')
      ]);

      const cardsData = await cardsRes.json();
      const collectionsData = await collectionsRes.json();

      console.log('[DataStore] Fetched', (cardsData.items || []).length, 'cards and', (collectionsData.tree || []).length, 'collections');
      console.log('[DataStore] Collections tree:', collectionsData.tree);

      set({
        cards: cardsData.items || [],
        collections: collectionsData.tree || [],
        isInitialized: true,
        isLoading: false
      });

      console.log('[DataStore] refresh() complete');
    } catch (error) {
      console.error('Failed to refresh data store:', error);
      set({ isLoading: false, isInitialized: true }); // Keep initialized true on error
    }
  },

  drainQueue: async () => {
    console.log('[DataStore] drainQueue() called');

    const pendingOps = await syncQueue.getPending();
    console.log('[DataStore] Found', pendingOps.length, 'pending operations');

    for (const op of pendingOps) {
      console.log('[DataStore] Processing queued operation:', op.id, op.type);

      try {
        await syncQueue.markProcessing(op.id);

        // Execute the operation based on type
        if (op.type === 'CREATE_CARD') {
          await executeCreateCard(op, set, get);
        } else if (op.type === 'UPDATE_CARD') {
          await executeUpdateCard(op, set, get);
        } else if (op.type === 'DELETE_CARD') {
          await executeDeleteCard(op, set, get);
        }

        // Remove from queue on success
        await syncQueue.remove(op.id);
      } catch (error) {
        console.error('[DataStore] Failed to process queued operation:', op.id, error);
        await syncQueue.markFailed(op.id);
      }
    }

    console.log('[DataStore] drainQueue() complete');
  },

  addCard: async (cardData: Partial<CardDTO>) => {
    // Generate optimistic card with temp ID
    const tempId = `temp_${Date.now()}_${Math.random()}`;
    const optimisticCard: CardDTO = {
      id: tempId,
      url: cardData.url || '',
      title: cardData.title || null,
      notes: cardData.notes || null,
      content: cardData.content || null,
      type: (cardData.type as 'url' | 'md-note' | 'text-note') || 'url',
      status: 'PENDING',
      collections: cardData.collections || [],
      tags: cardData.tags || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      userId: '', // Will be set by server
      deleted: false,
      deletedAt: null,
      pinned: false,
      domain: null,
      image: null,
      description: null,
      articleContent: null,
      metadata: undefined
    };

    // STEP 1: Persist to queue FIRST (prevents data loss on refresh)
    await syncQueue.enqueue({
      type: 'CREATE_CARD',
      payload: cardData,
      tempId
    });

    // STEP 2: Add to store for immediate UI update
    set((state) => ({
      cards: [optimisticCard, ...state.cards]
    }));

    // STEP 3: Execute sync in background
    await executeCreateCard({ type: 'CREATE_CARD', payload: cardData, tempId } as QueueOperation, set, get);
  },

  updateCard: async (id: string, updates: Partial<CardDTO>) => {
    const oldCard = get().cards.find(c => c.id === id);

    // STEP 1: Persist to queue FIRST
    await syncQueue.enqueue({
      type: 'UPDATE_CARD',
      payload: updates,
      targetId: id
    });

    // STEP 2: Optimistic update for immediate UI
    set((state) => ({
      cards: state.cards.map(c => c.id === id ? { ...c, ...updates } : c)
    }));

    // STEP 3: Execute sync in background
    await executeUpdateCard({ type: 'UPDATE_CARD', payload: updates, targetId: id } as QueueOperation, set, get);
  },

  deleteCard: async (id: string) => {
    const oldCard = get().cards.find(c => c.id === id);

    // STEP 1: Persist to queue FIRST
    await syncQueue.enqueue({
      type: 'DELETE_CARD',
      payload: oldCard,
      targetId: id
    });

    // STEP 2: Optimistic update for immediate UI
    set((state) => ({
      cards: state.cards.filter(c => c.id !== id)
    }));

    // STEP 3: Execute sync in background
    await executeDeleteCard({ type: 'DELETE_CARD', payload: oldCard, targetId: id } as QueueOperation, set, get);
  },

  addCollection: async (collection: CollectionNode) => {
    // For collections, just refresh since tree structure is complex
    await get().refresh();
  },

  updateCollection: async (id: string, updates: Partial<CollectionNode>) => {
    await get().refresh();
  },

  deleteCollection: async (id: string) => {
    await get().refresh();
  }
}));

// Helper functions to execute queued operations
async function executeCreateCard(op: QueueOperation, set: any, get: any) {
  const { payload, tempId } = op;

  try {
    const response = await fetch('/api/cards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      // Remove optimistic card on error
      set((state: any) => ({
        cards: state.cards.filter((c: CardDTO) => c.id !== tempId)
      }));
      throw new Error('Failed to create card on server');
    }

    // Replace temp card with real server card
    const serverCard = await response.json();
    set((state: any) => ({
      cards: state.cards.map((c: CardDTO) => c.id === tempId ? serverCard : c)
    }));

    // Trigger metadata fetch for URL cards
    if (serverCard.type === 'url' && serverCard.url) {
      fetch(`/api/cards/${serverCard.id}/fetch-metadata`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: serverCard.url })
      }).then(async () => {
        const updatedCardRes = await fetch(`/api/cards/${serverCard.id}`);
        if (updatedCardRes.ok) {
          const updatedCard = await updatedCardRes.json();
          set((state: any) => ({
            cards: state.cards.map((c: CardDTO) => c.id === serverCard.id ? updatedCard : c)
          }));
        }
      }).catch(() => {
        // Silently fail - card is already created, just no metadata
      });
    }

    // Remove from queue after successful sync
    if (op.id) {
      await syncQueue.remove(op.id);
    }
  } catch (error) {
    console.error('Failed to execute create card:', error);
    throw error;
  }
}

async function executeUpdateCard(op: QueueOperation, set: any, get: any) {
  const { payload, targetId } = op;
  const oldCard = get().cards.find((c: CardDTO) => c.id === targetId);

  try {
    const response = await fetch(`/api/cards/${targetId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      // Rollback on error
      if (oldCard) {
        set((state: any) => ({
          cards: state.cards.map((c: CardDTO) => c.id === targetId ? oldCard : c)
        }));
      }
      throw new Error('Failed to update card on server');
    }

    // Remove from queue after successful sync
    if (op.id) {
      await syncQueue.remove(op.id);
    }
  } catch (error) {
    console.error('Failed to execute update card:', error);
    throw error;
  }
}

async function executeDeleteCard(op: QueueOperation, set: any, get: any) {
  const { targetId, payload } = op;
  const oldCard = payload;

  try {
    const response = await fetch(`/api/cards/${targetId}`, {
      method: 'DELETE'
    });

    if (!response.ok) {
      // Rollback on error
      if (oldCard) {
        set((state: any) => ({
          cards: [...state.cards, oldCard]
        }));
      }
      throw new Error('Failed to delete card on server');
    }

    // Remove from queue after successful sync
    if (op.id) {
      await syncQueue.remove(op.id);
    }
  } catch (error) {
    console.error('Failed to execute delete card:', error);
    throw error;
  }
}
