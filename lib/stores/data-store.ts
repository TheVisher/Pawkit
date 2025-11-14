import { create } from 'zustand';
import { CardDTO } from '@/lib/server/cards';
import { CollectionNode } from '@/lib/types';
import { localDb } from '@/lib/services/local-storage';
import { syncService } from '@/lib/services/sync-service';
import { syncQueue } from '@/lib/services/sync-queue';
import { useConflictStore } from '@/lib/stores/conflict-store';
import { useSettingsStore } from '@/lib/hooks/settings-store';
import { markDeviceActive, getSessionId } from '@/lib/utils/device-session';

/**
 * Write guard: Ensures only the active tab/session can modify data
 * Prevents corruption from concurrent writes across multiple tabs
 *
 * NOTE: This only applies to USER-INITIATED writes (data-store methods).
 * Sync operations bypass this by calling localDb methods directly.
 */
function ensureActiveDevice(): boolean {
  const currentSessionId = getSessionId();
  const activeSessionId = localStorage.getItem('pawkit_active_device');

  if (activeSessionId && activeSessionId !== currentSessionId) {
    console.error('[WriteGuard] ❌ Write blocked - another tab is active:', {
      currentSession: currentSessionId,
      activeSession: activeSessionId,
      stack: new Error().stack
    });
    alert('Another tab is active. Please refresh and click "Use This Tab" to continue.');
    return false;
  }

  return true;
}

/**
 * Deduplicate cards: Remove duplicate IDs and clean up temp cards
 * Returns [deduplicated cards, IDs to delete from IndexedDB]
 */
async function deduplicateCards(cards: CardDTO[]): Promise<[CardDTO[], string[]]> {
  const seenCardIds = new Set<string>();
  const seenCardUrls = new Map<string, string>(); // url/title -> cardId mapping
  const cardsToDelete: string[] = []; // IDs of duplicate cards to delete from IndexedDB

  // First pass: detect duplicates by URL/title and mark duplicates for deletion
  for (const card of cards) {
    const key = card.url || card.title || card.id;
    if (seenCardUrls.has(key) && key !== card.id) {
      const existingId = seenCardUrls.get(key);
      const existingCard = cards.find(c => c.id === existingId);
      const isTempExisting = existingId?.startsWith('temp_');
      const isTempDuplicate = card.id.startsWith('temp_');

      console.warn('[DataStore V2] ⚠️ DUPLICATE DETECTED - Same content, different IDs:', {
        existing: existingId,
        duplicate: card.id,
        key,
        isTempExisting,
        isTempDuplicate,
        existingCreatedAt: existingCard?.createdAt,
        duplicateCreatedAt: card.createdAt,
      });

      // Priority 1: If the duplicate is a temp card and the existing is real, delete the temp
      if (isTempDuplicate && !isTempExisting) {
        cardsToDelete.push(card.id);
      }
      // Priority 2: If the existing is temp and the duplicate is real, delete the temp
      else if (isTempExisting && !isTempDuplicate) {
        cardsToDelete.push(existingId!);
        // Update the map to point to the real card
        seenCardUrls.set(key, card.id);
      }
      // Priority 3: Both are REAL server cards - DON'T deduplicate!
      // These are legitimate separate cards that happen to have the same title/URL
      else if (!isTempExisting && !isTempDuplicate) {
        // Don't add to cardsToDelete - keep both cards!
        // Add current card to map with a different key to track it separately
        seenCardUrls.set(card.id, card.id); // Use ID as key to ensure uniqueness
      }
      // Priority 4: Both are temp - keep the older one (by createdAt)
      else {
        const existingTime = existingCard ? new Date(existingCard.createdAt).getTime() : 0;
        const duplicateTime = new Date(card.createdAt).getTime();

        if (duplicateTime > existingTime) {
          // Current card is newer, delete it and keep existing
          cardsToDelete.push(card.id);
        } else {
          // Existing card is newer, delete it and keep current
          cardsToDelete.push(existingId!);
          seenCardUrls.set(key, card.id);
        }
      }
    } else {
      seenCardUrls.set(key, card.id);
    }
  }

  // Delete temp duplicates from IndexedDB (permanently, not soft delete)
  if (cardsToDelete.length > 0) {
    await Promise.all(cardsToDelete.map(id => localDb.permanentlyDeleteCard(id)));
  }

  // Second pass: remove duplicate IDs and temp cards marked for deletion
  const deduplicated = cards.filter(card => {
    // Skip cards marked for deletion
    if (cardsToDelete.includes(card.id)) {
      return false;
    }
    // Skip duplicate IDs
    if (seenCardIds.has(card.id)) {
      return false;
    }
    seenCardIds.add(card.id);
    return true;
  });

  return [deduplicated, cardsToDelete];
}

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
  // Extract all [[...]] patterns from content
  const linkRegex = /\[\[([^\]]+)\]\]/g;
  const matches = [...content.matchAll(linkRegex)];

  // Get existing links to avoid duplicates
  const existingLinks = await localDb.getNoteLinks(sourceId);
  const existingTargets = new Set(existingLinks.map(l => l.targetNoteId));

  // Track which links we found in current content
  const foundTargetIds = new Set<string>();

  for (const match of matches) {
    const linkText = match[1].trim();

    // Find note by fuzzy title match (case-insensitive, partial match)
    const targetNote = allCards.find(c =>
      (c.type === 'md-note' || c.type === 'text-note') &&
      c.title &&
      c.title.toLowerCase().includes(linkText.toLowerCase())
    );

    if (targetNote && targetNote.id !== sourceId) {
      foundTargetIds.add(targetNote.id);

      // Only add link if it doesn't exist yet
      if (!existingTargets.has(targetNote.id)) {
        await localDb.addNoteLink(sourceId, targetNote.id, linkText);
      }
    }
  }

  // Remove links that no longer exist in content
  for (const existingLink of existingLinks) {
    if (!foundTargetIds.has(existingLink.targetNoteId)) {
      await localDb.deleteNoteLink(existingLink.id);
    }
  }
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

/**
 * List of known corrupted collection IDs to auto-delete
 * These are duplicates created by the sync bug before fix (commits b1f077a, bc006be)
 */
const CORRUPTED_COLLECTION_IDS = [
  'cmhwwy77y0007kt04z7v9tgl7', // Personal sub person test (duplicate)
  'cmhwwxzoe0003kt04ic855omr', // Personal test (duplicate)
  'cmhwwxxrh0002kt046cds47og', // Private Test Collection (duplicate)
  'cmhwwv64o0004js04jsjdz6pk', // Secret Projects (duplicate)
  'cmhwwv0pv0002js047hfija03', // Secret Projects (duplicate)
  'cmhwwv34w0003js04eh90xj1t', // Secret Projects (duplicate)
  'cmhwwv9mj0005js0444ell0i4', // Secret Projects (duplicate)
  'cmhwwy1il0004kt04560zk8uk', // Sub personal test (duplicate)
  'cmhwwy3dp0005kt043hxsfqtj', // Sub sub person (duplicate)
  'cmhwwy93j0008kt04dfbdw2dy', // sub sub sub person (duplicate)
  'cmhwwuywv0001js04ss47cw8q', // Test (duplicate)
  'cmhwwux1r0000js046ca2i7ly', // Test Private (duplicate)
  'cmhwwxvvm0001kt04i7lc795s', // Test Private (duplicate)
  'cmhwwy5ay0006kt04qhce1lfp', // Test sub sub again (duplicate)
  'cmhwwxteo0000kt042tkti6e1', // Testing this out (duplicate)
  'cmhwwyl1h0009kt04q6s4nif5', // The Den (duplicate)
];

/**
 * Auto-cleanup corrupted collections on startup
 * Removes known duplicate collections created by sync bug
 */
async function cleanupCorruptedCollections() {

  let cleaned = 0;

  for (const id of CORRUPTED_COLLECTION_IDS) {
    try {
      await localDb.permanentlyDeleteCollection(id);
      cleaned++;
    } catch (e) {
      // Collection doesn't exist or already deleted - that's fine
    }
  }

  if (cleaned > 0) {
  } else {
  }
}

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
      return;
    }

    set({ isLoading: true });

    try {
      // Auto-cleanup corrupted collections BEFORE loading data
      await cleanupCorruptedCollections();

      // ALWAYS load from local IndexedDB first
      const [allCards, allCollections] = await Promise.all([
        localDb.getAllCards(),
        localDb.getAllCollections(),
      ]);

      // CRITICAL: Filter out deleted items (soft-deleted items go to trash)
      const filteredCards = allCards.filter(c => c.deleted !== true);
      const filteredCollections = allCollections.filter(c => c.deleted !== true);

      // DEDUPLICATION: Remove duplicate cards and clean up temp duplicates
      const [cards] = await deduplicateCards(filteredCards);

      // DEDUPLICATION: Remove any duplicate collections by ID
      const seenCollectionIds = new Set<string>();
      const collections = filteredCollections.filter(collection => {
        if (seenCollectionIds.has(collection.id)) {
          return false;
        }
        seenCollectionIds.add(collection.id);
        return true;
      });

      // DEBUG: Log deleted cards before setting state
      const deletedInFiltered = cards.filter(c => c.deleted === true);
      if (deletedInFiltered.length > 0) {
        console.error('[DataStore V2] ❌ BUG: Deleted cards after filtering in initialize():', deletedInFiltered.map(c => ({ id: c.id, title: c.title, deleted: c.deleted })));
      }

      set({
        cards,
        collections,
        isInitialized: true,
        isLoading: false,
      });

      // NOTE: Removed aggressive auto-sync on page load
      // Sync now happens on:
      // - Periodic intervals (every 60s)
      // - Internet reconnection
      // - Before page unload
      // - Manual "Sync Now" button
      // This prevents race conditions and improves performance
    } catch (error) {
      set({ isLoading: false });
    }
  },

  /**
   * Sync: Bidirectional sync with server
   */
  sync: async () => {
    const serverSync = useSettingsStore.getState().serverSync;
    if (!serverSync) {
      return;
    }

    if (get().isSyncing) {
      return;
    }

    set({ isSyncing: true });

    try {
      const result = await syncService.sync();

      if (result.success) {
        // Reload from local storage (which now has merged data)
        const [allCards, allCollections] = await Promise.all([
          localDb.getAllCards(),
          localDb.getAllCollections(),
        ]);

        // CRITICAL: Filter out deleted items to prevent resurrection
        const filteredCards = allCards.filter(c => c.deleted !== true);
        const filteredCollections = allCollections.filter(c => c.deleted !== true);

        // DEDUPLICATION: Remove duplicate cards and clean up temp duplicates
        const [cards] = await deduplicateCards(filteredCards);

        // DEDUPLICATION: Remove any duplicate collections by ID
        const seenCollectionIds = new Set<string>();
        const collections = filteredCollections.filter(collection => {
          if (seenCollectionIds.has(collection.id)) {
            return false;
          }
          seenCollectionIds.add(collection.id);
          return true;
        });

        // DEBUG: Log deleted cards before setting state
        const deletedInFiltered = cards.filter(c => c.deleted === true);
        if (deletedInFiltered.length > 0) {
          console.error('[DataStore V2] ❌ BUG: Deleted cards after filtering in sync():', deletedInFiltered.map(c => ({ id: c.id, title: c.title, deleted: c.deleted })));
        }

        set({ cards, collections });
      } else {
      }
    } catch (error) {
    } finally {
      set({ isSyncing: false });
    }
  },

  /**
   * Refresh: Reload from local storage
   */
  refresh: async () => {
    set({ isLoading: true });

    try {
      const [allCards, allCollections] = await Promise.all([
        localDb.getAllCards(),
        localDb.getAllCollections(),
      ]);

      // Filter out deleted items
      const filteredCards = allCards.filter(c => c.deleted !== true);
      const filteredCollections = allCollections.filter(c => c.deleted !== true);

      // DEDUPLICATION: Remove duplicate cards and clean up temp duplicates
      const [cards] = await deduplicateCards(filteredCards);

      // DEDUPLICATION: Remove any duplicate collections by ID
      const seenCollectionIds = new Set<string>();
      const collections = filteredCollections.filter(collection => {
        if (seenCollectionIds.has(collection.id)) {
          return false;
        }
        seenCollectionIds.add(collection.id);
        return true;
      });

      // DEBUG: Log deleted cards before setting state
      const deletedInFiltered = cards.filter(c => c.deleted === true);
      if (deletedInFiltered.length > 0) {
        console.error('[DataStore V2] ❌ BUG: Deleted cards after filtering in refresh():', deletedInFiltered.map(c => ({ id: c.id, title: c.title, deleted: c.deleted })));
      }

      set({ cards, collections, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
    }
  },

  /**
   * Add card: Save to local first, then sync to server
   */
  addCard: async (cardData: Partial<CardDTO>) => {
    // WRITE GUARD: Ensure this is the active device
    if (!ensureActiveDevice()) {
      return;
    }

    // Mark device as active - this is the source of truth
    markDeviceActive();

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

            // CRITICAL: Remove from sync queue since immediate sync succeeded
            // This prevents duplicate creation when queue drains
            await syncQueue.removeByTempId(tempId);

            // Update link references if this was a temp card
            if (tempId.startsWith('temp_')) {
              await localDb.updateLinkReferences(tempId, serverCard.id);
            }

            // Replace temp card with server card (permanently remove temp, not soft delete)
            await localDb.permanentlyDeleteCard(tempId);
            await localDb.saveCard(serverCard, { fromServer: true });

            // CRITICAL: If server card is deleted, remove from state instead of replacing
            if (serverCard.deleted === true) {
              set((state) => ({
                cards: state.cards.filter(c => c.id !== tempId),
              }));
            } else {
              set((state) => ({
                cards: state.cards.map(c => c.id === tempId ? serverCard : c),
              }));
            }

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

                  // CRITICAL: If card is deleted, remove from state instead of updating
                  if (updatedCard.deleted === true) {
                    set((state) => ({
                      cards: state.cards.filter(c => c.id !== serverCard.id),
                    }));
                  } else {
                    set((state) => ({
                      cards: state.cards.map(c => c.id === serverCard.id ? updatedCard : c),
                    }));
                  }
                }
              }).catch(() => {
                // Silently fail - card is already created
              });
            }
          }
        } catch (error) {
          // Card is safe in local storage - will sync later
        }
      }
    } catch (error) {
      throw error;
    }
  },

  /**
   * Update card: Save to local first, then sync to server
   */
  updateCard: async (id: string, updates: Partial<CardDTO>) => {
    // WRITE GUARD: Ensure this is the active device
    if (!ensureActiveDevice()) {
      return;
    }

    // Mark device as active - this is the source of truth
    markDeviceActive();

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
      if ((updatedCard.type === 'md-note' || updatedCard.type === 'text-note') && 'content' in updates) {
        await extractAndSaveLinks(id, updatedCard.content || '', get().cards);
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

          if (response.status === 409 || response.status === 412) {
            // Conflict - server has newer version
            // 409: Conflict (from our API)
            // 412: Precondition Failed (from Vercel or other middleware)

            // Fetch the latest version from server
            try {
              const latestRes = await fetch(`/api/cards/${id}`);
              if (latestRes.ok) {
                const latestCard = await latestRes.json();

                // Merge: Keep user's changes but update with server's metadata
                const mergedCard = {
                  ...latestCard,
                  ...updates,
                  // Always keep server's metadata if it exists
                  image: latestCard.image || updates.image,
                  description: latestCard.description || updates.description,
                  articleContent: latestCard.articleContent || updates.articleContent,
                  metadata: latestCard.metadata || updates.metadata,
                  updatedAt: new Date().toISOString(),
                };

                // Save merged version locally
                await localDb.saveCard(mergedCard, { localOnly: true });

                // CRITICAL: If merged card is deleted, remove from state instead of updating
                if (mergedCard.deleted === true) {
                  set((state) => ({
                    cards: state.cards.filter(c => c.id !== id),
                  }));
                } else {
                  set((state) => ({
                    cards: state.cards.map(c => c.id === id ? mergedCard : c),
                  }));
                }

                // Retry the update with the new timestamp
                const retryResponse = await fetch(`/api/cards/${id}`, {
                  method: 'PATCH',
                  headers: {
                    'Content-Type': 'application/json',
                    'If-Unmodified-Since': latestCard.updatedAt,
                  },
                  body: JSON.stringify(updates),
                });

                if (retryResponse.ok) {
                  const finalCard = await retryResponse.json();
                  await localDb.saveCard(finalCard, { fromServer: true });

                  // CRITICAL: If final card is deleted, remove from state instead of updating
                  if (finalCard.deleted === true) {
                    set((state) => ({
                      cards: state.cards.filter(c => c.id !== id),
                    }));
                  } else {
                    set((state) => ({
                      cards: state.cards.map(c => c.id === id ? finalCard : c),
                    }));
                  }
                } else {
                }
              }
            } catch (retryError) {
              useConflictStore.getState().addConflict(
                id,
                'This card was modified on another device. Your changes were saved locally.'
              );
            }
          } else if (response.ok) {
            const serverCard = await response.json();
            await localDb.saveCard(serverCard, { fromServer: true });

            // CRITICAL: If server card is deleted, remove from state instead of updating
            if (serverCard.deleted === true) {
              set((state) => ({
                cards: state.cards.filter(c => c.id !== id),
              }));
            } else {
              set((state) => ({
                cards: state.cards.map(c => c.id === id ? serverCard : c),
              }));
            }
          }
        } catch (error) {
          // Card is safe in local storage - will sync later
        }
      }
    } catch (error) {
      throw error;
    }
  },

  /**
   * Delete card: Soft delete locally first, then sync to server via queue
   */
  deleteCard: async (id: string) => {
    // WRITE GUARD: Ensure this is the active device
    if (!ensureActiveDevice()) {
      return;
    }

    // Mark device as active - this is the source of truth
    markDeviceActive();

    try {
      // STEP 0: Delete all note links for this card
      await localDb.deleteAllLinksForNote(id);

      // STEP 1: Soft delete in local storage (mark as deleted, don't remove)
      await localDb.deleteCard(id);

      // STEP 2: Update Zustand for instant UI (filter out deleted cards)
      set((state) => ({
        cards: state.cards.filter(c => c.id !== id),
      }));

      // STEP 3: Sync to server via queue (if enabled and not a temp card)
      const serverSync = useSettingsStore.getState().serverSync;
      if (serverSync && !id.startsWith('temp_')) {
        // Queue for sync (with retry on failure)
        await syncQueue.enqueue({
          type: 'DELETE_CARD',
          targetId: id,
          payload: {}, // Empty payload for DELETE operations
        });

        // Try immediate sync
        try {
          const response = await fetch(`/api/cards/${id}`, {
            method: 'DELETE',
          });

          if (response.ok) {
            // Remove from queue on success
            await syncQueue.removeByTarget('DELETE_CARD', id);
          } else {
          }
        } catch (error) {
          // Sync queue will retry later
        }
      }
    } catch (error) {
      throw error;
    }
  },

  /**
   * Add collection: Save to local first, then sync
   */
  addCollection: async (collectionData: { name: string; parentId?: string | null }) => {
    // WRITE GUARD: Ensure this is the active device
    if (!ensureActiveDevice()) {
      return;
    }

    // Mark device as active - this is the source of truth
    markDeviceActive();

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
      const collections = allCollections.filter(c => c.deleted !== true);
      set({ collections });

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
            const collections = allCollections.filter(c => c.deleted !== true);
            set({ collections });
          }
        } catch (error) {
        }
      }
    } catch (error) {
      throw error;
    }
  },

  updateCollection: async (id: string, updates: { name?: string; parentId?: string | null; pinned?: boolean; isPrivate?: boolean; hidePreview?: boolean; useCoverAsBackground?: boolean; coverImage?: string | null; coverImagePosition?: number | null }) => {
    // WRITE GUARD: Ensure this is the active device
    if (!ensureActiveDevice()) {
      return;
    }

    // Mark device as active - this is the source of truth
    markDeviceActive();

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
        const activeCollections = allCollections.filter(c => c.deleted !== true);
        set({ collections: activeCollections });
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
            // Success - collection synced
          }
        } catch (error) {
        }
      }
    } catch (error) {
      throw error;
    }
  },

  deleteCollection: async (id: string, deleteCards = false, deleteSubPawkits = false) => {
    // WRITE GUARD: Ensure this is the active device
    if (!ensureActiveDevice()) {
      return;
    }

    // Mark device as active - this is the source of truth
    markDeviceActive();

    try {
      const now = new Date().toISOString();

      // STEP 1: Delete from local storage FIRST (local-first!)
      // IMPORTANT: Get collections as FLAT list, not tree structure
      // We need to work with parentId relationships, which only work on flat lists
      const collectionTree = await localDb.getAllCollections(true);

      // Flatten tree to work with parentId relationships
      const flattenTree = (nodes: CollectionNode[]): CollectionNode[] => {
        const result: CollectionNode[] = [];
        for (const node of nodes) {
          result.push(node);
          if (node.children && node.children.length > 0) {
            result.push(...flattenTree(node.children));
          }
        }
        return result;
      };

      const collections = flattenTree(collectionTree);
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
        const activeCollections = allCollections.filter(c => c.deleted !== true);
        set({ collections: activeCollections });
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
            // Success - collection deleted
          }
        } catch (error) {
        }
      }
    } catch (error) {
      throw error;
    }
  },

  /**
   * Drain queue: For compatibility with old data-store
   * Just calls sync()
   */
  drainQueue: async () => {
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
    } catch (error) {
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
    } catch (error) {
      throw error;
    }
  },
}));
