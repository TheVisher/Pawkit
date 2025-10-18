import { create } from 'zustand';
import { CardDTO } from '@/lib/server/cards';
import { CollectionNode } from '@/lib/types';
import { localStorage } from '@/lib/services/local-storage';
import { syncService } from '@/lib/services/sync-service';
import { syncQueue } from '@/lib/services/sync-queue';
import { useConflictStore } from '@/lib/stores/conflict-store';
import { useSettingsStore } from '@/lib/hooks/settings-store';
import { findBestFuzzyMatch, areTitlesSimilar } from '@/lib/utils/fuzzy-match';

/**
 * Update link text in notes when a card title changes
 */
async function updateLinkTextInNotes(cardId: string, oldTitle: string, newTitle: string): Promise<void> {
  // console.log('[updateLinkTextInNotes] Updating links for card:', cardId, 'from:', oldTitle, 'to:', newTitle);
  
  // Get all notes that link to this card
  const cardBacklinks = await localStorage.getCardBacklinks(cardId);
  
  for (const backlink of cardBacklinks) {
    try {
      // Get the note content
      const note = await localStorage.getCard(backlink.sourceNoteId);
      if (!note || !note.content) continue;
      
      let updatedContent = note.content;
      let hasChanges = false;
      
      // Update different types of links
      if (backlink.linkType === 'card' && backlink.linkText.startsWith('card:')) {
        // Update [[card:OldTitle]] to [[card:NewTitle]]
        const oldLinkText = `[[${backlink.linkText}]]`;
        const newLinkText = `[[card:${newTitle}]]`;
        
        if (updatedContent.includes(oldLinkText)) {
          updatedContent = updatedContent.replace(oldLinkText, newLinkText);
          hasChanges = true;
        }
      } else if (backlink.linkType === 'card') {
        // Update [[OldTitle]] to [[NewTitle]]
        const oldLinkText = `[[${backlink.linkText}]]`;
        const newLinkText = `[[${newTitle}]]`;
        
        if (updatedContent.includes(oldLinkText)) {
          updatedContent = updatedContent.replace(oldLinkText, newLinkText);
          hasChanges = true;
        }
      }
      
      // Save the updated content if there were changes
      if (hasChanges) {
        await localStorage.saveCard({ ...note, content: updatedContent }, { localOnly: true });
        // console.log('[updateLinkTextInNotes] Updated note:', backlink.sourceNoteId);
      }
    } catch (error) {
      console.error('[updateLinkTextInNotes] Failed to update note:', backlink.sourceNoteId, error);
    }
  }
}

/**
 * Extract wiki-links from note content and save to IndexedDB
 */
async function extractAndSaveLinks(sourceId: string, content: string, allCards: CardDTO[]): Promise<void> {
  // console.log('[extractAndSaveLinks] Starting extraction for:', sourceId);
  // console.log('[extractAndSaveLinks] Content:', content);
  // console.log('[extractAndSaveLinks] Available cards:', allCards.length);

  // Extract all [[...]] patterns from content
  const linkRegex = /\[\[([^\]]+)\]\]/g;
  const matches = [...content.matchAll(linkRegex)];

  // console.log('[extractAndSaveLinks] Found matches:', matches.map(m => m[1]));

  // Get existing links to avoid duplicates
  const existingLinks = await localStorage.getNoteLinks(sourceId);
  const existingCardLinks = await localStorage.getNoteCardLinks(sourceId);
  const existingTargets = new Set(existingLinks.map(l => l.targetNoteId));
  const existingCardTargets = new Set(existingCardLinks.map(l => l.targetCardId));

  // console.log('[extractAndSaveLinks] Existing note links:', existingLinks.length);
  // console.log('[extractAndSaveLinks] Existing card links:', existingCardLinks.length);

  // Track which links we found in current content
  const foundTargetIds = new Set<string>();
  const foundCardTargetIds = new Set<string>();

  // Early exit if no links found and no existing links
  if (matches.length === 0 && existingLinks.length === 0 && existingCardLinks.length === 0) {
    return;
  }

  for (const match of matches) {
    const linkText = match[1].trim();

    // Check if this is a card reference: [[card:Title]]
    if (linkText.startsWith('card:')) {
      const cardTitle = linkText.substring(5).trim(); // Remove 'card:' prefix

      // Find card by improved fuzzy title match
      const targetCard = findBestFuzzyMatch(
        cardTitle,
        allCards.filter(c => c.title && c.title.trim() !== '') as Array<{ title: string; id: string }>,
        0.6 // Lower threshold for card: prefix matches
      );

      if (targetCard) {
        foundCardTargetIds.add(targetCard.id);

        // Only add link if it doesn't exist yet
        if (!existingCardTargets.has(targetCard.id)) {
          await localStorage.addNoteCardLink(sourceId, targetCard.id, linkText, 'card');
        }
      }
    }
    // Check if this is a URL: [[https://...]] or [[http://...]]
    else if (linkText.startsWith('http://') || linkText.startsWith('https://')) {
      // Find card by exact URL match
      const targetCard = allCards.find(c => c.url === linkText);

      if (targetCard) {
        foundCardTargetIds.add(targetCard.id);

        // Only add link if it doesn't exist yet
        if (!existingCardTargets.has(targetCard.id)) {
          await localStorage.addNoteCardLink(sourceId, targetCard.id, linkText, 'url');
        }
      }
    }
    // Otherwise, treat as note/card reference: [[Title]]
    else {
      // First try to find a note with this title using improved fuzzy matching
      const notes = allCards.filter(c => 
        (c.type === 'md-note' || c.type === 'text-note') && c.title && c.title.trim() !== ''
      ) as Array<{ title: string; id: string }>;
      let targetNote = findBestFuzzyMatch(linkText, notes, 0.7);

      // If no note found, try to find a card (bookmark) with this title
      if (!targetNote) {
        const cards = allCards.filter(c => c.title && c.title.trim() !== '') as Array<{ title: string; id: string }>;
        const targetCard = findBestFuzzyMatch(linkText, cards, 0.7);

        if (targetCard) {
          foundCardTargetIds.add(targetCard.id);

          // Only add link if it doesn't exist yet
          if (!existingCardTargets.has(targetCard.id)) {
            await localStorage.addNoteCardLink(sourceId, targetCard.id, linkText, 'card');
          }
        }
      } else {
        if (targetNote.id !== sourceId) {
          foundTargetIds.add(targetNote.id);

          // Only add link if it doesn't exist yet
          if (!existingTargets.has(targetNote.id)) {
            await localStorage.addNoteLink(sourceId, targetNote.id, linkText);
          }
        }
      }
    }
  }

  // Batch remove note links that no longer exist in content
  const noteLinksToRemove = existingLinks.filter(link => !foundTargetIds.has(link.targetNoteId));
  for (const link of noteLinksToRemove) {
    await localStorage.deleteNoteLink(link.id);
  }

  // Batch remove card links that no longer exist in content
  const cardLinksToRemove = existingCardLinks.filter(link => !foundCardTargetIds.has(link.targetCardId));
  for (const link of cardLinksToRemove) {
    await localStorage.deleteNoteCardLink(link.id);
  }
}

// Debounce map for link extraction
const extractionTimeouts = new Map<string, NodeJS.Timeout>();

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
  addCollection: (collectionData: { name: string; parentId?: string | null; inDen?: boolean }) => Promise<void>;
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

      // STEP 1.5: Update link text in notes if title changed
      if ('title' in updates && oldCard.title !== updatedCard.title) {
        console.log('[DataStore] Title changed, updating link text in notes');
        try {
          await updateLinkTextInNotes(id, oldCard.title || '', updatedCard.title || '');
        } catch (error) {
          console.error('[DataStore] Failed to update link text in notes:', error);
        }
      }

      // STEP 1.6: Extract and save wiki-links if this is a note with content update
      console.log('[DataStore] Checking extraction condition:', {
        cardType: updatedCard.type,
        isNote: updatedCard.type === 'md-note' || updatedCard.type === 'text-note',
        hasContentInUpdates: 'content' in updates,
        updatesKeys: Object.keys(updates),
      });

      if ((updatedCard.type === 'md-note' || updatedCard.type === 'text-note') && 'content' in updates) {
        // Only run extraction if content actually changed
        const oldContent = oldCard.content || '';
        const newContent = updatedCard.content || '';
        
        if (oldContent !== newContent) {
          // Clear existing timeout for this card
          const existingTimeout = extractionTimeouts.get(id);
          if (existingTimeout) {
            clearTimeout(existingTimeout);
          }
          
          // Set new debounced timeout
          const timeout = setTimeout(async () => {
            try {
              await extractAndSaveLinks(id, updatedCard.content || '', get().cards);
              extractionTimeouts.delete(id);
            } catch (error) {
              console.error('[DataStore] Link extraction failed:', error);
              extractionTimeouts.delete(id);
            }
          }, 1000); // 1 second debounce
          
          extractionTimeouts.set(id, timeout);
        }
      }

      // STEP 2: Update Zustand for instant UI
      set((state) => ({
        cards: state.cards.map(c => c.id === id ? updatedCard : c),
      }));


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

      // STEP 1.5: Delete all links associated with this note
      if (card.type === 'md-note' || card.type === 'text-note') {
        await localStorage.deleteAllLinksForNote(id);
        console.log('[DataStore] Deleted all links for note:', id);
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
  addCollection: async (collectionData: { name: string; parentId?: string | null; inDen?: boolean }) => {
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const newCollection: any = {
      id: tempId,
      name: collectionData.name,
      slug: collectionData.name.toLowerCase().replace(/\s+/g, '-'),
      parentId: collectionData.parentId || null,
      pinned: false,
      deleted: false,
      inDen: collectionData.inDen || false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      userId: '',
      children: [],
    };

    try {
      await localStorage.saveCollection(newCollection, { localOnly: true });

      // Refresh collections from local storage (filtered for non-deleted)
      const allCollections = await localStorage.getAllCollections();
      const activeCollections = allCollections.filter(c => !c.deleted);
      set({ collections: activeCollections });

      console.log('[DataStore V2] Collection added to local storage:', newCollection.id);

      // Sync to server if enabled
      const serverSync = useSettingsStore.getState().serverSync;
      if (serverSync) {
        try {
          // Use Den API if inDen flag is set
          const apiPath = collectionData.inDen ? '/api/den/pawkits' : '/api/pawkits';
          const response = await fetch(apiPath, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(collectionData),
          });

          if (response.ok) {
            const serverCollection = await response.json();

            // Replace temp collection with server collection
            await localStorage.deleteCollection(tempId);
            await localStorage.saveCollection(serverCollection, { fromServer: true });

            // Refresh collections from local storage (filtered for non-deleted)
            const allCollections = await localStorage.getAllCollections();
            const activeCollections = allCollections.filter(c => !c.deleted);
            set({ collections: activeCollections });

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

  updateCollection: async (id: string, updates: { name?: string; parentId?: string | null; pinned?: boolean }) => {
    try {
      // STEP 1: Update in local storage first
      const collections = await localStorage.getAllCollections();
      const collection = collections.find(c => c.id === id);

      if (collection) {
        const updatedCollection: any = {
          ...collection,
          ...updates,
          updatedAt: new Date().toISOString(),
        };

        // If name changed, update slug
        if (updates.name) {
          updatedCollection.slug = updates.name.toLowerCase().replace(/\s+/g, '-');
        }

        await localStorage.saveCollection(updatedCollection, { localOnly: true });

        // STEP 2: Update Zustand for instant UI
        const allCollections = await localStorage.getAllCollections();
        const activeCollections = allCollections.filter(c => !c.deleted);
        set({ collections: activeCollections });

        console.log('[DataStore V2] Collection updated in local storage:', id);
      }

      // STEP 3: Sync to server (if enabled and not temp)
      const serverSync = useSettingsStore.getState().serverSync;
      if (serverSync && !id.startsWith('temp_')) {
        try {
          // Use Den API if collection is in Den
          const collection = collections.find(c => c.id === id);
          const apiPath = collection?.inDen ? `/api/den/pawkits/${id}` : `/api/pawkits/${id}`;
          const response = await fetch(apiPath, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates),
          });

          if (response.ok) {
            console.log('[DataStore V2] Collection updated on server:', id);
          } else {
            console.error('[DataStore V2] Server update failed:', await response.text());
          }
        } catch (error) {
          console.error('[DataStore V2] Failed to sync collection update:', error);
          // Update is safe in local storage
        }
      }
    } catch (error) {
      console.error('[DataStore V2] Failed to update collection:', error);
      throw error;
    }
  },

  deleteCollection: async (id: string, deleteCards = false) => {
    try {
      // STEP 1: Soft delete in local storage first
      const collections = await localStorage.getAllCollections();
      const collection = collections.find(c => c.id === id);

      if (collection) {
        const deletedCollection: any = {
          ...collection,
          deleted: true,
          deletedAt: new Date().toISOString(),
        };

        await localStorage.saveCollection(deletedCollection, { localOnly: true });

        // Update Zustand - remove from active collections
        set((state) => ({
          collections: state.collections.filter(c => c.id !== id),
        }));

        console.log('[DataStore V2] Collection soft-deleted in local storage:', id);
      }

      // STEP 2: Sync to server (if enabled and not a temp collection)
      const serverSync = useSettingsStore.getState().serverSync;
      if (serverSync && !id.startsWith('temp_')) {
        try {
          // Use Den API if collection is in Den
          const baseUrl = collection?.inDen ? `/api/den/pawkits/${id}` : `/api/pawkits/${id}`;
          const url = deleteCards ? `${baseUrl}?deleteCards=true` : baseUrl;

          const response = await fetch(url, {
            method: 'DELETE',
          });

          if (response.ok) {
            console.log('[DataStore V2] Collection soft-deleted on server:', id);

            // If deleteCards was true, refresh to get updated card list
            if (deleteCards) {
              await get().sync();
            }
          } else {
            console.error('[DataStore V2] Server delete failed:', await response.text());
          }
        } catch (error) {
          console.error('[DataStore V2] Failed to delete collection on server:', error);
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
