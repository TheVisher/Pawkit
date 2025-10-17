import { create } from 'zustand';
import { CardDTO } from '@/lib/server/cards';
import { CollectionNode } from '@/lib/types';
import { localStorage } from '@/lib/services/local-storage';
import { syncService } from '@/lib/services/sync-service';
import { syncQueue } from '@/lib/services/sync-queue';
import { useConflictStore } from '@/lib/stores/conflict-store';
import { useSettingsStore } from '@/lib/hooks/settings-store';

/**
 * LOCAL-FIRST DATA STORE V2
 *
 * Architecture:
 * - IndexedDB = PRIMARY source of truth (NEVER cleared)
 * - Server = Backup/sync layer (optional)
 * - Zustand = UI state (derived from IndexedDB)
 *
 * Data flow:
 * 1. User action → Save to IndexedDB immediately
 * 2. Update Zustand for instant UI
 * 3. Sync to server in background (if enabled)
 *
 * If server is wiped:
 * - Local data is preserved
 * - Next sync pushes local data back to server
 * - User never loses anything!
 */

type DataStore = {
  // Data
  cards: CardDTO[];
  collections: CollectionNode[];

  // Loading states
  isLoading: boolean;
  isInitialized: boolean;
  isSyncing: boolean;

  // Actions
  initialize: () => Promise<void>;
  sync: () => Promise<void>;
  drainQueue: () => Promise<void>; // For compatibility
  addCard: (cardData: Partial<CardDTO>) => Promise<void>;
  updateCard: (id: string, updates: Partial<CardDTO>) => Promise<void>;
  deleteCard: (id: string) => Promise<void>;
  addCollection: (collectionData: { name: string; parentId?: string | null }) => Promise<void>;
  updateCollection: (id: string, updates: { name?: string; parentId?: string | null; pinned?: boolean }) => Promise<void>;
  deleteCollection: (id: string, deleteCards?: boolean) => Promise<void>;
  refresh: () => Promise<void>;
  exportData: () => Promise<void>;
  importData: (file: File) => Promise<void>;
};

export const useDataStore = create<DataStore>((set, get) => ({
  cards: [],
  collections: [],
  isLoading: false,
  isInitialized: false,
  isSyncing: false,

  /**
   * Initialize: Load from IndexedDB (source of truth)
   */
  initialize: async () => {
    if (get().isInitialized) {
      console.log('[DataStore V2] Already initialized');
      return;
    }

    console.log('[DataStore V2] Initializing from local storage...');
    set({ isLoading: true });

    try {
      // ALWAYS load from local IndexedDB first
      const [allCards, allCollections] = await Promise.all([
        localStorage.getAllCards(),
        localStorage.getAllCollections(),
      ]);

      // Filter out deleted cards and collections (soft-deleted items go to trash)
      const cards = allCards.filter(c => !c.deleted);
      const collections = allCollections.filter(c => !c.deleted);

      set({
        cards,
        collections,
        isInitialized: true,
        isLoading: false,
      });

      console.log('[DataStore V2] Loaded from local:', {
        cards: cards.length,
        collections: collections.length,
      });

      // Sync with server in background if enabled
      const serverSync = useSettingsStore.getState().serverSync;
      if (serverSync) {
        console.log('[DataStore V2] Syncing with server in background...');
        get().sync().catch(err => {
          console.error('[DataStore V2] Background sync failed:', err);
        });
      } else {
        console.log('[DataStore V2] Server sync disabled - local-only mode');
      }
    } catch (error) {
      console.error('[DataStore V2] Failed to initialize:', error);
      set({ isLoading: false });
    }
  },

  /**
   * Sync: Bidirectional sync with server
   */
  sync: async () => {
    const serverSync = useSettingsStore.getState().serverSync;
    if (!serverSync) {
      console.log('[DataStore V2] Sync skipped - server sync disabled');
      return;
    }

    if (get().isSyncing) {
      console.log('[DataStore V2] Sync already in progress');
      return;
    }

    set({ isSyncing: true });

    try {
      console.log('[DataStore V2] Starting sync...');
      const result = await syncService.sync();

      if (result.success) {
        // Reload from local storage (which now has merged data)
        const [allCards, allCollections] = await Promise.all([
          localStorage.getAllCards(),
          localStorage.getAllCollections(),
        ]);

        // Filter out deleted items (they belong in trash, not active lists)
        const cards = allCards.filter(c => !c.deleted);
        const collections = allCollections.filter(c => !c.deleted);

        set({ cards, collections });

        console.log('[DataStore V2] Sync complete:', result);
      } else{
        console.error('[DataStore V2] Sync failed:', result.errors);
      }
    } catch (error) {
      console.error('[DataStore V2] Sync error:', error);
    } finally {
      set({ isSyncing: false });
    }
  },

  /**
   * Drain queue: For compatibility with old data-store
   * Just calls sync()
   */
  drainQueue: async () => {
    console.log('[DataStore V2] drainQueue() called - redirecting to sync()');
    await get().sync();
  },

  /**
   * Refresh: Reload from local storage
   */
  refresh: async () => {
    console.log('[DataStore V2] Refreshing from local storage...');
    set({ isLoading: true });

    try {
      const [allCards, allCollections] = await Promise.all([
        localStorage.getAllCards(),
        localStorage.getAllCollections(),
      ]);

      // Filter out deleted items
      const cards = allCards.filter(c => !c.deleted);
      const collections = allCollections.filter(c => !c.deleted);

      set({ cards, collections, isLoading: false });

      console.log('[DataStore V2] Refreshed:', {
        cards: cards.length,
        collections: collections.length,
      });
    } catch (error) {
      console.error('[DataStore V2] Refresh failed:', error);
      set({ isLoading: false });
    }
  },

  /**
   * Add card: Save to local first, then sync to server
   */
  addCard: async (cardData: Partial<CardDTO>) => {
    // Generate ID for the card
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const newCard: CardDTO = {
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
      userId: '',
      deleted: false,
      deletedAt: null,
      pinned: cardData.pinned || false,
      domain: null,
      image: null,
      description: null,
      articleContent: null,
      metadata: undefined,
      inDen: cardData.inDen || false,
      encryptedContent: null,
      scheduledDate: cardData.scheduledDate || null,
    };

    try {
      // STEP 1: Save to local storage FIRST (source of truth)
      await localStorage.saveCard(newCard, { localOnly: true });

      // STEP 2: Update Zustand for instant UI
      set((state) => ({
        cards: [newCard, ...state.cards],
      }));

      console.log('[DataStore V2] Card added to local storage:', newCard.id);

      // STEP 3: Sync to server in background (if enabled)
      const serverSync = useSettingsStore.getState().serverSync;
      if (serverSync) {
        // Queue for sync
        await syncQueue.enqueue({
          type: 'CREATE_CARD',
          payload: cardData,
          tempId: newCard.id,
        });

        // Try immediate sync
        try {
          const response = await fetch('/api/cards', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(cardData),
          });

          if (response.ok) {
            const serverCard = await response.json();

            // Replace temp card with server card
            await localStorage.deleteCard(tempId);
            await localStorage.saveCard(serverCard, { fromServer: true });

            set((state) => ({
              cards: state.cards.map(c => c.id === tempId ? serverCard : c),
            }));

            console.log('[DataStore V2] Card synced to server:', serverCard.id);

            // Fetch metadata if it's a URL card
            if (serverCard.type === 'url' && serverCard.url) {
              fetch(`/api/cards/${serverCard.id}/fetch-metadata`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: serverCard.url }),
              }).then(async () => {
                const updatedCardRes = await fetch(`/api/cards/${serverCard.id}`);
                if (updatedCardRes.ok) {
                  const updatedCard = await updatedCardRes.json();
                  await localStorage.saveCard(updatedCard, { fromServer: true });
                  set((state) => ({
                    cards: state.cards.map(c => c.id === serverCard.id ? updatedCard : c),
                  }));
                }
              }).catch(() => {
                // Silently fail - card is already created
              });
            }
          }
        } catch (error) {
          console.error('[DataStore V2] Failed to sync card to server:', error);
          // Card is safe in local storage - will sync later
        }
      }
    } catch (error) {
      console.error('[DataStore V2] Failed to add card:', error);
      throw error;
    }
  },

  /**
   * Update card: Save to local first, then sync to server
   */
  updateCard: async (id: string, updates: Partial<CardDTO>) => {
    const oldCard = get().cards.find(c => c.id === id);
    if (!oldCard) return;

    const updatedCard = {
      ...oldCard,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    try {
      // STEP 1: Save to local storage FIRST
      await localStorage.saveCard(updatedCard, { localOnly: true });

      // STEP 2: Update Zustand for instant UI
      set((state) => ({
        cards: state.cards.map(c => c.id === id ? updatedCard : c),
      }));

      console.log('[DataStore V2] Card updated in local storage:', id);

      // STEP 3: Sync to server in background (if enabled)
      const serverSync = useSettingsStore.getState().serverSync;
      if (serverSync && !id.startsWith('temp_')) {
        try {
          const response = await fetch(`/api/cards/${id}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'If-Unmodified-Since': oldCard.updatedAt,
            },
            body: JSON.stringify(updates),
          });

          if (response.status === 409) {
            // Conflict - server has newer version
            const conflict = await response.json();
            console.warn('[DataStore V2] Conflict detected:', conflict.message);

            useConflictStore.getState().addConflict(
              id,
              'This card was modified on another device. Your changes were saved locally.'
            );

            // Keep local version but mark it for manual resolution
          } else if (response.ok) {
            const serverCard = await response.json();
            await localStorage.saveCard(serverCard, { fromServer: true });
            set((state) => ({
              cards: state.cards.map(c => c.id === id ? serverCard : c),
            }));
            console.log('[DataStore V2] Card synced to server:', id);
          }
        } catch (error) {
          console.error('[DataStore V2] Failed to sync card update:', error);
          // Card is safe in local storage - will sync later
        }
      }
    } catch (error) {
      console.error('[DataStore V2] Failed to update card:', error);
      throw error;
    }
  },

  /**
   * Delete card: Soft delete (mark as deleted), don't remove from storage
   */
  deleteCard: async (id: string) => {
    try {
      // STEP 1: Soft delete in local storage (mark as deleted)
      const card = await localStorage.getCard(id);
      if (!card) {
        console.warn('[DataStore V2] Card not found:', id);
        return;
      }

      const deletedCard = {
        ...card,
        deleted: true,
        deletedAt: new Date().toISOString(),
      };

      await localStorage.saveCard(deletedCard, { localOnly: true });

      // STEP 2: Update Zustand - remove from active cards list
      set((state) => ({
        cards: state.cards.filter(c => c.id !== id),
      }));

      console.log('[DataStore V2] Card soft-deleted in local storage:', id);

      // STEP 3: Sync to server (if enabled and not a temp card)
      const serverSync = useSettingsStore.getState().serverSync;
      if (serverSync && !id.startsWith('temp_')) {
        try {
          const response = await fetch(`/api/cards/${id}`, {
            method: 'DELETE',
          });

          if (response.ok) {
            // Server returns the soft-deleted card or just { ok: true }
            // Update local storage to match server state
            const updatedCard = { ...deletedCard };
            await localStorage.saveCard(updatedCard, { fromServer: true });
            console.log('[DataStore V2] Card soft-deleted on server:', id);
          }
        } catch (error) {
          console.error('[DataStore V2] Failed to sync card deletion:', error);
          // Deletion is safe in local storage
        }
      }
    } catch (error) {
      console.error('[DataStore V2] Failed to delete card:', error);
      throw error;
    }
  },

  /**
   * Add collection: Save to local first, then sync
   */
  addCollection: async (collectionData: { name: string; parentId?: string | null }) => {
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const newCollection: any = {
      id: tempId,
      name: collectionData.name,
      slug: collectionData.name.toLowerCase().replace(/\s+/g, '-'),
      parentId: collectionData.parentId || null,
      pinned: false,
      deleted: false,
      inDen: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      userId: '',
      children: [],
    };

    try {
      await localStorage.saveCollection(newCollection, { localOnly: true });

      // Refresh collections from local storage to get proper tree structure
      const collections = await localStorage.getAllCollections();
      set({ collections });

      console.log('[DataStore V2] Collection added to local storage:', newCollection.id);

      // Sync to server if enabled
      const serverSync = useSettingsStore.getState().serverSync;
      if (serverSync) {
        try {
          const response = await fetch('/api/pawkits', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(collectionData),
          });

          if (response.ok) {
            await get().refresh();
            console.log('[DataStore V2] Collection synced to server');
          }
        } catch (error) {
          console.error('[DataStore V2] Failed to sync collection:', error);
        }
      }
    } catch (error) {
      console.error('[DataStore V2] Failed to add collection:', error);
      throw error;
    }
  },

  updateCollection: async (id: string, updates: { name?: string; parentId?: string | null; pinned?: boolean }) => {
    try {
      // For now, just sync to server directly since we don't have collections in local storage fully implemented
      const serverSync = useSettingsStore.getState().serverSync;
      if (serverSync && !id.startsWith('temp_')) {
        try {
          const response = await fetch(`/api/pawkits/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates),
          });

          if (response.ok) {
            await get().refresh();
            console.log('[DataStore V2] Collection updated:', id);
          }
        } catch (error) {
          console.error('[DataStore V2] Failed to update collection:', error);
        }
      }
    } catch (error) {
      console.error('[DataStore V2] Failed to update collection:', error);
      throw error;
    }
  },

  deleteCollection: async (id: string, deleteCards = false) => {
    try {
      const serverSync = useSettingsStore.getState().serverSync;
      if (serverSync && !id.startsWith('temp_')) {
        try {
          const url = deleteCards
            ? `/api/pawkits/${id}?deleteCards=true`
            : `/api/pawkits/${id}`;

          const response = await fetch(url, {
            method: 'DELETE',
          });

          if (response.ok) {
            await get().refresh();
            console.log('[DataStore V2] Collection deleted:', id);
          }
        } catch (error) {
          console.error('[DataStore V2] Failed to delete collection:', error);
        }
      }
    } catch (error) {
      console.error('[DataStore V2] Failed to delete collection:', error);
      throw error;
    }
  },

  /**
   * Export data: Download as JSON file
   */
  exportData: async () => {
    try {
      const data = await localStorage.exportAllData();

      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json',
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pawkit-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      console.log('[DataStore V2] Data exported successfully');
    } catch (error) {
      console.error('[DataStore V2] Failed to export data:', error);
      throw error;
    }
  },

  /**
   * Import data: Load from JSON file
   */
  importData: async (file: File) => {
    try {
      const text = await file.text();
      const data = JSON.parse(text);

      await localStorage.importData(data);

      // Refresh UI from local storage
      await get().refresh();

      console.log('[DataStore V2] Data imported successfully');
    } catch (error) {
      console.error('[DataStore V2] Failed to import data:', error);
      throw error;
    }
  },
}));
