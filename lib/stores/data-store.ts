import { create } from 'zustand';
import { CardDTO } from '@/lib/server/cards';
import { CollectionNode } from '@/lib/types';

type DataStore = {
  // Data
  cards: CardDTO[];
  collections: CollectionNode[];

  // Loading states
  isLoading: boolean;
  isInitialized: boolean;

  // Actions
  initialize: () => Promise<void>;
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

    // Add to store immediately - shows in UI instantly
    set((state) => ({
      cards: [optimisticCard, ...state.cards]
    }));

    // Background sync to server (fire and forget)
    try {
      const response = await fetch('/api/cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cardData)
      });

      if (!response.ok) {
        // Remove optimistic card on error
        set((state) => ({
          cards: state.cards.filter(c => c.id !== tempId)
        }));
        console.error('Failed to create card on server');
      } else {
        // Replace temp card with real server card
        const serverCard = await response.json();
        set((state) => ({
          cards: state.cards.map(c => c.id === tempId ? serverCard : c)
        }));

        // Trigger metadata fetch for URL cards
        if (serverCard.type === 'url' && serverCard.url) {
          fetch(`/api/cards/${serverCard.id}/fetch-metadata`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: serverCard.url })
          }).then(async () => {
            // After metadata fetch completes, get the updated card
            const updatedCardRes = await fetch(`/api/cards/${serverCard.id}`);
            if (updatedCardRes.ok) {
              const updatedCard = await updatedCardRes.json();
              // Update the card in store with new metadata
              set((state) => ({
                cards: state.cards.map(c => c.id === serverCard.id ? updatedCard : c)
              }));
            }
          }).catch(() => {
            // Silently fail - card is already created, just no metadata
          });
        }
      }
    } catch (error) {
      console.error('Failed to sync card to server:', error);
      // Remove optimistic card on error
      set((state) => ({
        cards: state.cards.filter(c => c.id !== tempId)
      }));
    }
  },

  updateCard: async (id: string, updates: Partial<CardDTO>) => {
    // Optimistic update
    const oldCard = get().cards.find(c => c.id === id);
    set((state) => ({
      cards: state.cards.map(c => c.id === id ? { ...c, ...updates } : c)
    }));

    // Background sync
    try {
      const response = await fetch(`/api/cards/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });

      if (!response.ok && oldCard) {
        // Rollback on error
        set((state) => ({
          cards: state.cards.map(c => c.id === id ? oldCard : c)
        }));
      }
    } catch (error) {
      console.error('Failed to sync card update to server:', error);
      // Rollback on error
      if (oldCard) {
        set((state) => ({
          cards: state.cards.map(c => c.id === id ? oldCard : c)
        }));
      }
    }
  },

  deleteCard: async (id: string) => {
    // Optimistic update
    const oldCard = get().cards.find(c => c.id === id);
    set((state) => ({
      cards: state.cards.filter(c => c.id !== id)
    }));

    // Background sync
    try {
      const response = await fetch(`/api/cards/${id}`, {
        method: 'DELETE'
      });

      if (!response.ok && oldCard) {
        // Rollback on error
        set((state) => ({
          cards: [...state.cards, oldCard]
        }));
      }
    } catch (error) {
      console.error('Failed to sync card deletion to server:', error);
      // Rollback on error
      if (oldCard) {
        set((state) => ({
          cards: [...state.cards, oldCard]
        }));
      }
    }
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
