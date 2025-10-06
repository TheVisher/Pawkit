import { create } from 'zustand';
import { CardDTO } from '@/lib/server/cards';
import { CollectionNode } from '@/lib/types';
import { syncQueue, QueueOperation } from '@/lib/services/sync-queue';
import { useConflictStore } from '@/lib/stores/conflict-store';

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
  addCollection: (collectionData: { name: string; parentId?: string | null }) => Promise<void>;
  updateCollection: (id: string, updates: { name?: string; parentId?: string | null; pinned?: boolean }) => Promise<void>;
  deleteCollection: (id: string, deleteCards?: boolean) => Promise<void>;
  refresh: () => Promise<void>;
};

// Set up BroadcastChannel listener once at module level
if (typeof window !== 'undefined' && typeof BroadcastChannel !== 'undefined') {
  console.log('[DataStore] Setting up BroadcastChannel listener...');
  const channel = new BroadcastChannel('pawkit-extension');
  channel.onmessage = (event) => {
    console.log('[DataStore] BroadcastChannel received message:', event.data);
    if (event.data.type === 'CARD_CREATED') {
      console.log('[DataStore] Extension created a card, refreshing...');
      useDataStore.getState().refresh();
    }
  };
  console.log('[DataStore] BroadcastChannel listener ready');

  // Also set up polling as a fallback in case content script doesn't load
  // Check for new cards every 3 seconds when page is visible
  let lastCardCount = 0;
  setInterval(() => {
    if (document.visibilityState === 'visible') {
      const currentCount = useDataStore.getState().cards.length;
      if (lastCardCount > 0 && currentCount > lastCardCount) {
        console.log('[DataStore] Detected new cards via polling, count changed from', lastCardCount, 'to', currentCount);
      }
      lastCardCount = currentCount;

      // Silently refresh to check for new cards
      useDataStore.getState().refresh();
    }
  }, 3000);
  console.log('[DataStore] Polling fallback enabled (3s interval)');
}

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

      // Check queue for pending create operations with temp cards
      const pendingOps = await syncQueue.getPending();
      const tempCards: CardDTO[] = [];

      for (const op of pendingOps) {
        if (op.type === 'CREATE_CARD' && op.tempId && op.payload) {
          // Recreate the optimistic temp card
          const tempCard: CardDTO = {
            id: op.tempId,
            url: op.payload.url || '',
            title: op.payload.title || null,
            notes: op.payload.notes || null,
            content: op.payload.content || null,
            type: (op.payload.type as 'url' | 'md-note' | 'text-note') || 'url',
            status: 'PENDING',
            collections: op.payload.collections || [],
            tags: op.payload.tags || [],
            createdAt: new Date(op.timestamp).toISOString(),
            updatedAt: new Date(op.timestamp).toISOString(),
            userId: '',
            deleted: false,
            deletedAt: null,
            pinned: false,
            domain: null,
            image: null,
            description: null,
            articleContent: null,
            metadata: undefined,
            inDen: false,
            encryptedContent: null
          };
          tempCards.push(tempCard);
        }
      }

      console.log('[DataStore] Found', tempCards.length, 'pending temp cards from queue');

      set({
        cards: [...tempCards, ...(cardsData.items || [])],
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

      // Check queue for pending create operations with temp cards
      const pendingOps = await syncQueue.getPending();
      const tempCards: CardDTO[] = [];

      for (const op of pendingOps) {
        if (op.type === 'CREATE_CARD' && op.tempId && op.payload) {
          // Recreate the optimistic temp card
          const tempCard: CardDTO = {
            id: op.tempId,
            url: op.payload.url || '',
            title: op.payload.title || null,
            notes: op.payload.notes || null,
            content: op.payload.content || null,
            type: (op.payload.type as 'url' | 'md-note' | 'text-note') || 'url',
            status: 'PENDING',
            collections: op.payload.collections || [],
            tags: op.payload.tags || [],
            createdAt: new Date(op.timestamp).toISOString(),
            updatedAt: new Date(op.timestamp).toISOString(),
            userId: '',
            deleted: false,
            deletedAt: null,
            pinned: false,
            domain: null,
            image: null,
            description: null,
            articleContent: null,
            metadata: undefined,
            inDen: false,
            encryptedContent: null
          };
          tempCards.push(tempCard);
        }
      }

      console.log('[DataStore] Found', tempCards.length, 'pending temp cards from queue');

      set({
        cards: [...tempCards, ...(cardsData.items || [])],
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
        } else if (op.type === 'CREATE_COLLECTION') {
          await executeCreateCollection(op, set, get);
        } else if (op.type === 'UPDATE_COLLECTION') {
          await executeUpdateCollection(op, set, get);
        } else if (op.type === 'DELETE_COLLECTION') {
          await executeDeleteCollection(op, set, get);
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
      metadata: undefined,
      inDen: false,
      encryptedContent: null
    };

    // STEP 1: Persist to queue FIRST (prevents data loss on refresh)
    const operationId = await syncQueue.enqueue({
      type: 'CREATE_CARD',
      payload: cardData,
      tempId
    });

    // STEP 2: Add to store for immediate UI update
    set((state) => ({
      cards: [optimisticCard, ...state.cards]
    }));

    // STEP 3: Execute sync in background with operation ID
    executeCreateCard({ id: operationId, type: 'CREATE_CARD', payload: cardData, tempId, timestamp: Date.now(), retries: 0, status: 'processing' } as QueueOperation, set, get).catch(() => {
      // Silently fail - operation will be retried on next drain
    });
  },

  updateCard: async (id: string, updates: Partial<CardDTO>) => {
    const oldCard = get().cards.find(c => c.id === id);

    // STEP 1: Persist to queue FIRST
    const operationId = await syncQueue.enqueue({
      type: 'UPDATE_CARD',
      payload: updates,
      targetId: id
    });

    // STEP 2: Optimistic update for immediate UI
    set((state) => ({
      cards: state.cards.map(c => c.id === id ? { ...c, ...updates } : c)
    }));

    // STEP 3: Execute sync in background with operation ID
    executeUpdateCard({ id: operationId, type: 'UPDATE_CARD', payload: updates, targetId: id, timestamp: Date.now(), retries: 0, status: 'processing' } as QueueOperation, set, get).catch(() => {
      // Silently fail - operation will be retried on next drain
    });
  },

  deleteCard: async (id: string) => {
    const oldCard = get().cards.find(c => c.id === id);

    // STEP 1: Persist to queue FIRST
    const operationId = await syncQueue.enqueue({
      type: 'DELETE_CARD',
      payload: oldCard,
      targetId: id
    });

    // STEP 2: Optimistic update for immediate UI
    set((state) => ({
      cards: state.cards.filter(c => c.id !== id)
    }));

    // STEP 3: Execute sync in background with operation ID
    executeDeleteCard({ id: operationId, type: 'DELETE_CARD', payload: oldCard, targetId: id, timestamp: Date.now(), retries: 0, status: 'processing' } as QueueOperation, set, get).catch(() => {
      // Silently fail - operation will be retried on next drain
    });
  },

  addCollection: async (collectionData: { name: string; parentId?: string | null }) => {
    // Queue the operation
    const operationId = await syncQueue.enqueue({
      type: 'CREATE_COLLECTION',
      payload: collectionData
    });

    // Execute in background
    executeCreateCollection(
      { id: operationId, type: 'CREATE_COLLECTION', payload: collectionData, timestamp: Date.now(), retries: 0, status: 'processing' } as QueueOperation,
      set,
      get
    ).catch(() => {
      // Silently fail - operation will be retried on next drain
    });
  },

  updateCollection: async (id: string, updates: { name?: string; parentId?: string | null; pinned?: boolean }) => {
    // Queue the operation
    const operationId = await syncQueue.enqueue({
      type: 'UPDATE_COLLECTION',
      payload: updates,
      targetId: id
    });

    // Execute in background
    executeUpdateCollection(
      { id: operationId, type: 'UPDATE_COLLECTION', payload: updates, targetId: id, timestamp: Date.now(), retries: 0, status: 'processing' } as QueueOperation,
      set,
      get
    ).catch(() => {
      // Silently fail - operation will be retried on next drain
    });
  },

  deleteCollection: async (id: string, deleteCards = false) => {
    // Queue the operation
    const operationId = await syncQueue.enqueue({
      type: 'DELETE_COLLECTION',
      payload: { deleteCards },
      targetId: id
    });

    // Execute in background
    executeDeleteCollection(
      { id: operationId, type: 'DELETE_COLLECTION', payload: { deleteCards }, targetId: id, timestamp: Date.now(), retries: 0, status: 'processing' } as QueueOperation,
      set,
      get
    ).catch(() => {
      // Silently fail - operation will be retried on next drain
    });
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
    // Add conflict detection header with card's last known timestamp
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    if (oldCard?.updatedAt) {
      headers['If-Unmodified-Since'] = oldCard.updatedAt;
    }

    const response = await fetch(`/api/cards/${targetId}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(payload)
    });

    // Handle conflict (409)
    if (response.status === 409) {
      const conflict = await response.json();
      console.warn('[DataStore] Conflict detected:', conflict.message);

      // Notify user about the conflict
      if (targetId) {
        useConflictStore.getState().addConflict(
          targetId,
          'This card was modified on another device. Your changes were not saved.'
        );
      }

      // Update with server version and mark operation as failed
      if (conflict.serverCard) {
        set((state: any) => ({
          cards: state.cards.map((c: CardDTO) =>
            c.id === targetId ? conflict.serverCard : c
          )
        }));
      }

      // Mark as failed so it doesn't retry endlessly
      if (op.id) {
        await syncQueue.markFailed(op.id);
      }

      throw new Error(`Conflict: ${conflict.message}`);
    }

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

// Collection operation helpers
async function executeCreateCollection(op: QueueOperation, set: any, get: any) {
  const { payload } = op;

  try {
    const response = await fetch('/api/pawkits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error('Failed to create collection on server');
    }

    // Refresh collections tree from server
    const collectionsRes = await fetch('/api/pawkits');
    if (collectionsRes.ok) {
      const collectionsData = await collectionsRes.json();
      set({ collections: collectionsData.tree || [] });
    }

    // Remove from queue after successful sync
    if (op.id) {
      await syncQueue.remove(op.id);
    }
  } catch (error) {
    console.error('Failed to execute create collection:', error);
    throw error;
  }
}

async function executeUpdateCollection(op: QueueOperation, set: any, get: any) {
  const { payload, targetId } = op;

  try {
    const response = await fetch(`/api/pawkits/${targetId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error('Failed to update collection on server');
    }

    // Refresh collections tree from server
    const collectionsRes = await fetch('/api/pawkits');
    if (collectionsRes.ok) {
      const collectionsData = await collectionsRes.json();
      set({ collections: collectionsData.tree || [] });
    }

    // Remove from queue after successful sync
    if (op.id) {
      await syncQueue.remove(op.id);
    }
  } catch (error) {
    console.error('Failed to execute update collection:', error);
    throw error;
  }
}

async function executeDeleteCollection(op: QueueOperation, set: any, get: any) {
  const { targetId, payload } = op;

  try {
    const url = payload?.deleteCards
      ? `/api/pawkits/${targetId}?deleteCards=true`
      : `/api/pawkits/${targetId}`;

    const response = await fetch(url, {
      method: 'DELETE'
    });

    if (!response.ok) {
      throw new Error('Failed to delete collection on server');
    }

    // Refresh collections tree from server
    const collectionsRes = await fetch('/api/pawkits');
    if (collectionsRes.ok) {
      const collectionsData = await collectionsRes.json();
      set({ collections: collectionsData.tree || [] });
    }

    // Remove from queue after successful sync
    if (op.id) {
      await syncQueue.remove(op.id);
    }
  } catch (error) {
    console.error('Failed to execute delete collection:', error);
    throw error;
  }
}
