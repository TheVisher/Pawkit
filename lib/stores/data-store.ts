import { create } from 'zustand';
import { CardDTO } from '@/lib/server/cards';
import { CollectionNode } from '@/lib/types';
import { localDb } from '@/lib/services/local-storage';
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

/**
 * Extract tags from content (#tag syntax)
 */
export function extractTags(content: string): string[] {
  const tagRegex = /#([a-zA-Z0-9_-]+)/g;
  const matches = [...content.matchAll(tagRegex)];
  const tags = matches.map(match => match[1].toLowerCase());
  return [...new Set(tags)]; // Remove duplicates
}

/**
 * Extract wiki-links from note content and save to IndexedDB
 * Wiki-link syntax: [[Note Title]]
 */
export async function extractAndSaveLinks(sourceId: string, content: string, allCards: CardDTO[]): Promise<void> {
  console.log('[extractAndSaveLinks] Starting extraction for:', sourceId);
  console.log('[extractAndSaveLinks] Content:', content);
  console.log('[extractAndSaveLinks] Available cards:', allCards.length);

  // Extract all [[...]] patterns from content
  const linkRegex = /\[\[([^\]]+)\]\]/g;
  const matches = [...content.matchAll(linkRegex)];

  console.log('[extractAndSaveLinks] Found matches:', matches.map(m => m[1]));

  // Get existing links to avoid duplicates
  const existingLinks = await localDb.getNoteLinks(sourceId);
  const existingTargets = new Set(existingLinks.map(l => l.targetNoteId));

  console.log('[extractAndSaveLinks] Existing links:', existingLinks.length);

  // Track which links we found in current content
  const foundTargetIds = new Set<string>();

  for (const match of matches) {
    const linkText = match[1].trim();

    console.log('[extractAndSaveLinks] Looking for note titled:', linkText);

    // Find note by fuzzy title match (case-insensitive, partial match)
    const targetNote = allCards.find(c =>
      (c.type === 'md-note' || c.type === 'text-note') &&
      c.title &&
      c.title.toLowerCase().includes(linkText.toLowerCase())
    );

    console.log('[extractAndSaveLinks] Found target note:', targetNote ? targetNote.id : 'NOT FOUND');

    if (targetNote && targetNote.id !== sourceId) {
      foundTargetIds.add(targetNote.id);

      // Only add link if it doesn't exist yet
      if (!existingTargets.has(targetNote.id)) {
        await localDb.addNoteLink(sourceId, targetNote.id, linkText);
        console.log('[DataStore V2] Created link:', sourceId, '->', targetNote.id);
      } else {
        console.log('[extractAndSaveLinks] Link already exists:', sourceId, '->', targetNote.id);
      }
    }
  }

  // Remove links that no longer exist in content
  for (const existingLink of existingLinks) {
    if (!foundTargetIds.has(existingLink.targetNoteId)) {
      await localDb.deleteNoteLink(existingLink.id);
      console.log('[DataStore V2] Removed link:', existingLink.id);
    }
  }

  console.log('[extractAndSaveLinks] Extraction complete. Created/kept:', foundTargetIds.size, 'links');
}

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
  addCard: (cardData: Partial<CardDTO>) => Promise<void>;
  updateCard: (id: string, updates: Partial<CardDTO>) => Promise<void>;
  deleteCard: (id: string) => Promise<void>;
  addCollection: (collectionData: { name: string; parentId?: string | null }) => Promise<void>;
  updateCollection: (id: string, updates: { name?: string; parentId?: string | null; pinned?: boolean; isPrivate?: boolean; hidePreview?: boolean; useCoverAsBackground?: boolean; coverImage?: string | null; coverImagePosition?: number | null }) => Promise<void>;
  deleteCollection: (id: string, deleteCards?: boolean, deleteSubPawkits?: boolean) => Promise<void>;
  refresh: () => Promise<void>;
  drainQueue: () => Promise<void>;
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
        localDb.getAllCards(),
        localDb.getAllCollections(),
      ]);

      // CRITICAL: Filter out deleted items (soft-deleted items go to trash)
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

      // NOTE: Removed aggressive auto-sync on page load
      // Sync now happens on:
      // - Periodic intervals (every 60s)
      // - Internet reconnection
      // - Before page unload
      // - Manual "Sync Now" button
      // This prevents race conditions and improves performance
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
        const [cards, collections] = await Promise.all([
          localDb.getAllCards(),
          localDb.getAllCollections(),
        ]);

        set({ cards, collections });

        console.log('[DataStore V2] Sync complete:', result);
      } else {
        console.error('[DataStore V2] Sync failed:', result.errors);
      }
    } catch (error) {
      console.error('[DataStore V2] Sync error:', error);
    } finally {
      set({ isSyncing: false });
    }
  },

  /**
   * Refresh: Reload from local storage
   */
  refresh: async () => {
    console.log('[DataStore V2] Refreshing from local storage...');
    set({ isLoading: true });

    try {
      const [allCards, allCollections] = await Promise.all([
        localDb.getAllCards(),
        localDb.getAllCollections(),
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
      await localDb.saveCard(newCard, { localOnly: true });

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

            // Update link references if this was a temp card
            if (tempId.startsWith('temp_')) {
              await localDb.updateLinkReferences(tempId, serverCard.id);
            }

            // Replace temp card with server card
            await localDb.deleteCard(tempId);
            await localDb.saveCard(serverCard, { fromServer: true });

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
                  await localDb.saveCard(updatedCard, { fromServer: true });
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
      await localDb.saveCard(updatedCard, { localOnly: true });

      // STEP 1.5: Extract and save wiki-links if this is a note
      console.log('[DataStore V2] Checking extraction condition:', {
        cardType: updatedCard.type,
        isNote: updatedCard.type === 'md-note' || updatedCard.type === 'text-note',
        hasContentInUpdates: 'content' in updates,
        updatesKeys: Object.keys(updates),
        content: updatedCard.content?.substring(0, 100) + '...'
      });

      if ((updatedCard.type === 'md-note' || updatedCard.type === 'text-note') && 'content' in updates) {
        console.log('[DataStore V2] CALLING extractAndSaveLinks');
        await extractAndSaveLinks(id, updatedCard.content || '', get().cards);
      } else {
        console.log('[DataStore V2] SKIPPED extraction - condition not met');
      }

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
            await localDb.saveCard(serverCard, { fromServer: true });
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
   * Delete card: Remove from local first, then sync to server
   */
  deleteCard: async (id: string) => {
    try {
      // STEP 0: Delete all note links for this card
      await localDb.deleteAllLinksForNote(id);

      // STEP 1: Remove from local storage
      await localDb.deleteCard(id);

      // STEP 2: Update Zustand for instant UI
      set((state) => ({
        cards: state.cards.filter(c => c.id !== id),
      }));

      console.log('[DataStore V2] Card deleted from local storage:', id);

      // STEP 3: Sync to server (if enabled and not a temp card)
      const serverSync = useSettingsStore.getState().serverSync;
      if (serverSync && !id.startsWith('temp_')) {
        try {
          await fetch(`/api/cards/${id}`, {
            method: 'DELETE',
          });
          console.log('[DataStore V2] Card deleted from server:', id);
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
      await localDb.saveCollection(newCollection, { localOnly: true });

      // Refresh collections from local storage to get proper tree structure
      const allCollections = await localDb.getAllCollections();
      const collections = allCollections.filter(c => !c.deleted);
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
            const serverCollection = await response.json();

            // Replace temp collection with server collection
            await localDb.deleteCollection(tempId);
            await localDb.saveCollection(serverCollection, { fromServer: true });

            // Refresh collections to get updated tree structure
            const allCollections = await localDb.getAllCollections();
            const collections = allCollections.filter(c => !c.deleted);
            set({ collections });

            console.log('[DataStore V2] Collection synced to server:', serverCollection.id);
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

  updateCollection: async (id: string, updates: { name?: string; parentId?: string | null; pinned?: boolean; isPrivate?: boolean; hidePreview?: boolean; useCoverAsBackground?: boolean; coverImage?: string | null; coverImagePosition?: number | null }) => {
    try {
      // STEP 1: Update local storage FIRST (local-first!)
      const collections = await localDb.getAllCollections();
      const collection = collections.find(c => c.id === id);

      if (collection) {
        const updatedCollection = {
          ...collection,
          ...updates,
          updatedAt: new Date().toISOString()
        };

        await localDb.saveCollection(updatedCollection, { localOnly: true });

        // STEP 2: Update Zustand state immediately (UI updates instantly)
        const allCollections = await localDb.getAllCollections();
        const activeCollections = allCollections.filter(c => !c.deleted);
        set({ collections: activeCollections });

        console.log('[DataStore V2] Collection updated locally:', id);
      }

      // STEP 3: Sync to server in background (if enabled)
      const serverSync = useSettingsStore.getState().serverSync;
      if (serverSync && !id.startsWith('temp_')) {
        try {
          const response = await fetch(`/api/pawkits/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates),
          });

          if (response.ok) {
            console.log('[DataStore V2] Collection synced to server:', id);
          }
        } catch (error) {
          console.error('[DataStore V2] Failed to sync collection to server:', error);
        }
      }
    } catch (error) {
      console.error('[DataStore V2] Failed to update collection:', error);
      throw error;
    }
  },

  deleteCollection: async (id: string, deleteCards = false, deleteSubPawkits = false) => {
    try {
      const now = new Date().toISOString();

      // STEP 1: Delete from local storage FIRST (local-first!)
      const collections = await localDb.getAllCollections();
      const collection = collections.find(c => c.id === id);

      if (collection) {
        let collectionsToDelete = [id];

        // If deleting sub-pawkits, recursively find all descendants
        if (deleteSubPawkits) {
          const findDescendants = (parentId: string): string[] => {
            const children = collections.filter(c => c.parentId === parentId);
            const childIds = children.map(c => c.id);
            const allDescendants = [...childIds];

            for (const childId of childIds) {
              allDescendants.push(...findDescendants(childId));
            }

            return allDescendants;
          };

          const descendants = findDescendants(id);
          collectionsToDelete = [id, ...descendants];
        } else {
          // Move children to parent (preserve sub-pawkits)
          const children = collections.filter(c => c.parentId === id);
          for (const child of children) {
            const updatedChild = {
              ...child,
              parentId: collection.parentId,
              updatedAt: now
            };
            await localDb.saveCollection(updatedChild, { localOnly: true });
          }
        }

        // Mark collections as deleted
        for (const collectionId of collectionsToDelete) {
          const coll = collections.find(c => c.id === collectionId);
          if (coll) {
            const deletedCollection = {
              ...coll,
              deleted: true,
              deletedAt: now,
              updatedAt: now
            };
            await localDb.saveCollection(deletedCollection, { localOnly: true });
          }
        }

        // STEP 2: Update Zustand state immediately (UI updates instantly)
        // CRITICAL: Filter out deleted collections from Zustand state
        const allCollections = await localDb.getAllCollections();
        const activeCollections = allCollections.filter(c => !c.deleted);
        set({ collections: activeCollections });

        console.log('[DataStore V2] Collection(s) deleted locally:', collectionsToDelete);
      }

      // STEP 3: Sync to server in background (if enabled)
      const serverSync = useSettingsStore.getState().serverSync;
      if (serverSync && !id.startsWith('temp_')) {
        try {
          const params = new URLSearchParams();
          if (deleteCards) params.set('deleteCards', 'true');
          if (deleteSubPawkits) params.set('deleteSubPawkits', 'true');

          const url = `/api/pawkits/${id}${params.toString() ? `?${params.toString()}` : ''}`;

          const response = await fetch(url, {
            method: 'DELETE',
          });

          if (response.ok) {
            console.log('[DataStore V2] Collection synced to server:', id);
          }
        } catch (error) {
          console.error('[DataStore V2] Failed to sync deletion to server:', error);
        }
      }
    } catch (error) {
      console.error('[DataStore V2] Failed to delete collection:', error);
      throw error;
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
   * Export data: Download as JSON file
   */
  exportData: async () => {
    try {
      const data = await localDb.exportAllData();

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

      await localDb.importData(data);

      // Refresh UI from local storage
      await get().refresh();

      console.log('[DataStore V2] Data imported successfully');
    } catch (error) {
      console.error('[DataStore V2] Failed to import data:', error);
      throw error;
    }
  },
}));
