import { create } from 'zustand';
import { CardDTO } from '@/lib/server/cards';
import { CollectionNode } from '@/lib/types';
import { localDb } from '@/lib/services/local-storage';
import { syncService } from '@/lib/services/sync-service';
import { syncQueue } from '@/lib/services/sync-queue';
import { useConflictStore } from '@/lib/stores/conflict-store';
import { useSettingsStore } from '@/lib/hooks/settings-store';
import { markDeviceActive } from '@/lib/utils/device-session';
import { useToastStore } from '@/lib/stores/toast-store';
import { useEventStore } from '@/lib/hooks/use-event-store';
import { processCardForDates } from '@/lib/utils/calendar-prompt';
import { useConnectorStore } from '@/lib/stores/connector-store';

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
  deleteCard: (id: string, options?: { deleteLinkedEvents?: boolean; skipEventCheck?: boolean; deleteFromBackup?: boolean }) => Promise<void>;
  addCollection: (collectionData: { name: string; parentId?: string | null; metadata?: Record<string, unknown> }) => Promise<void>;
  updateCollection: (id: string, updates: { name?: string; parentId?: string | null; pinned?: boolean; isPrivate?: boolean; hidePreview?: boolean; useCoverAsBackground?: boolean; coverImage?: string | null; coverImagePosition?: number | null; metadata?: Record<string, unknown> }) => Promise<void>;
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

      // Pre-cache card images in background (non-blocking)
      // This dramatically improves load times on slow connections by caching
      // images to IndexedDB for instant loading on subsequent visits
      if (typeof window !== 'undefined') {
        const preCacheImages = async () => {
          try {
            const { imageCache } = await import('@/lib/services/image-cache');
            const imageUrls = cards
              .filter(c => c.image && !c.isFileCard && c.type !== 'file')
              .map(c => c.image as string);

            if (imageUrls.length > 0) {
              console.log(`[DataStore] Pre-caching ${imageUrls.length} card images in background`);
              await imageCache.preCacheImages(imageUrls);
            }
          } catch (error) {
            // Non-critical - silently fail
          }
        };

        // Use requestIdleCallback to avoid blocking the UI
        if (typeof requestIdleCallback !== 'undefined') {
          requestIdleCallback(() => preCacheImages(), { timeout: 5000 });
        } else {
          setTimeout(preCacheImages, 2000);
        }
      }

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
    // Mark device as active
    markDeviceActive();

    // Generate ID for the card
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const newCard: CardDTO = {
      id: tempId,
      url: cardData.url || '',
      title: cardData.title || null,
      notes: cardData.notes || null,
      content: cardData.content || null,
      type: (cardData.type as 'url' | 'md-note' | 'text-note' | 'file') || 'url',
      status: (cardData.status as 'PENDING' | 'READY' | 'ERROR') || 'PENDING',
      collections: cardData.collections || [],
      tags: cardData.tags || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      userId: '',
      deleted: false,
      deletedAt: null,
      pinned: cardData.pinned || false,
      domain: null,
      image: cardData.image || null,
      description: null,
      articleContent: null,
      metadata: cardData.metadata || undefined,
      inDen: cardData.inDen || false,
      encryptedContent: null,
      scheduledDate: cardData.scheduledDate || null,
      scheduledStartTime: cardData.scheduledStartTime || null,
      scheduledEndTime: cardData.scheduledEndTime || null,
      // File attachment fields
      isFileCard: cardData.isFileCard || false,
      fileId: cardData.fileId || undefined,
      attachedFileIds: cardData.attachedFileIds || undefined,
    };

    try {
      // STEP 1: Save to local storage FIRST (source of truth)
      await localDb.saveCard(newCard, { localOnly: true });

      // STEP 2: Update Zustand for instant UI
      set((state) => ({
        cards: [newCard, ...state.cards],
      }));

      // STEP 3: Sync to server in background (if enabled)
      // Skip server sync for file cards - they're local-only (files stored in IndexedDB)
      const isFileCard = newCard.type === 'file' || newCard.isFileCard;
      const serverSync = useSettingsStore.getState().serverSync;
      if (serverSync && !isFileCard) {
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

          // Check for duplicate URL (409 Conflict)
          if (response.status === 409) {
            // Parse response to check if it's a trashed duplicate
            const errorData = await response.json();
            const isInTrash = errorData.details?.code === 'DUPLICATE_URL_IN_TRASH';

            // Remove the temp card from local storage and state
            await localDb.permanentlyDeleteCard(tempId);
            await syncQueue.removeByTempId(tempId);
            set((state) => ({
              cards: state.cards.filter(c => c.id !== tempId),
            }));

            // Throw appropriate error so the UI can catch and show toast
            throw new Error(isInTrash ? 'DUPLICATE_URL_IN_TRASH' : 'DUPLICATE_URL');
          }

          // Handle auth errors gracefully (common during initial load)
          if (response.status === 401) {
            console.log('[DataStore] Auth not ready yet, card will sync later');
            // Card is safe in local storage - will sync when auth is ready
            return;
          }

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

                    // Extract dates and show calendar prompt if found
                    if (updatedCard.metadata) {
                      processCardForDates(updatedCard);
                    }
                  }
                }
              }).catch(() => {
                // Silently fail - card is already created
              });
            }
          }
        } catch (error) {
          // Re-throw duplicate URL errors so the UI can show toast
          if (error instanceof Error && (error.message === 'DUPLICATE_URL' || error.message === 'DUPLICATE_URL_IN_TRASH')) {
            throw error;
          }
          // Other errors: Card is safe in local storage - will sync later
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
    // Mark device as active
    markDeviceActive();

    const oldCard = get().cards.find(c => c.id === id);
    if (!oldCard) return;

    // Check if only sync metadata is being updated (don't bump updatedAt for these)
    const syncMetadataFields = ['cloudId', 'cloudProvider', 'cloudSyncedAt'];
    const updateKeys = Object.keys(updates);
    const isOnlySyncMetadata = updateKeys.every(key => syncMetadataFields.includes(key));

    const updatedCard = {
      ...oldCard,
      ...updates,
      // Only update timestamp if actual content changed, not just sync metadata
      updatedAt: isOnlySyncMetadata ? oldCard.updatedAt : new Date().toISOString(),
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
      // Skip server sync for sync-metadata-only updates (cloudId, cloudProvider, cloudSyncedAt)
      // These are local-only fields for Filen sync, server doesn't need them
      const serverSync = useSettingsStore.getState().serverSync;
      if (serverSync && !id.startsWith('temp_') && !isOnlySyncMetadata) {
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
   * If card has linked calendar events, shows a prompt to delete those too
   */
  deleteCard: async (id: string, options?: { deleteLinkedEvents?: boolean; skipEventCheck?: boolean; deleteFromBackup?: boolean }) => {
    // Mark device as active
    markDeviceActive();

    // Check for linked calendar events (unless skipping)
    if (!options?.skipEventCheck) {
      const eventStore = useEventStore.getState();
      const linkedEvents = eventStore.getEventsByCardId(id);

      if (linkedEvents.length > 0) {
        // Show prompt to user
        useToastStore.getState().withTwoActions(
          'This bookmark has a linked calendar event',
          {
            label: 'Delete Both',
            onClick: async () => {
              // Delete linked events first
              for (const event of linkedEvents) {
                await eventStore.deleteEvent(event.id);
              }
              // Then delete the card (skip event check to avoid recursion)
              await get().deleteCard(id, { skipEventCheck: true });
            },
          },
          {
            label: 'Keep Event',
            onClick: async () => {
              // Update events to clear their source link
              for (const event of linkedEvents) {
                await eventStore.updateEvent(event.id, { source: undefined });
              }
              // Then delete just the card
              await get().deleteCard(id, { skipEventCheck: true });
            },
          },
          'calendar',
          10000 // 10 seconds to decide
        );
        return; // Don't delete yet - wait for user choice
      }
    }

    try {
      // STEP 0: Delete all note links for this card
      await localDb.deleteAllLinksForNote(id);

      // STEP 0.5: Soft delete associated files
      // Get the card to check if it's a file card
      const cardToDelete = get().cards.find(c => c.id === id);

      // Delete attachments and main file (includes Filen sync)
      const { useFileStore } = await import('@/lib/stores/file-store');
      const fileStore = useFileStore.getState();

      // Delete attachments (files with cardId === id)
      const attachments = fileStore.getFilesByCardId(id);
      for (const attachment of attachments) {
        await fileStore.deleteFile(attachment.id);
      }

      // Delete the main file if this is a file card
      if (cardToDelete?.isFileCard && cardToDelete.fileId) {
        await fileStore.deleteFile(cardToDelete.fileId);
      }

      // STEP 0.6: Delete synced note from cloud providers
      // If this is a note with a cloudId, delete the .md file from cloud storage
      if (cardToDelete?.cloudId && (cardToDelete.type === 'md-note' || cardToDelete.type === 'text-note')) {
        // Get storage strategy to determine delete behavior
        const { useStorageStrategyStore, getContentTypeFromCard } = await import('@/lib/stores/storage-strategy-store');
        const { strategy, getDestinations } = useStorageStrategyStore.getState();
        const contentType = getContentTypeFromCard(cardToDelete.type);
        const destinations = getDestinations(contentType);

        // Determine if we should delete from backup
        const shouldDeleteFromBackup =
          strategy.backupBehavior === "mirror" || // Mirror mode always deletes both
          options?.deleteFromBackup === true; // User explicitly chose to delete backup

        // Helper to check if a provider is primary or backup
        const isPrimaryDestination = (providerId: string) => {
          if (destinations.length === 0) return true; // No strategy, delete from all
          return destinations[0] === providerId;
        };

        const isBackupDestination = (providerId: string) => {
          if (destinations.length < 2) return false;
          return destinations[1] === providerId;
        };

        // Generate the filename used for sync
        const safeTitle = (cardToDelete.title || "Untitled")
          .replace(/[/\\:*?"<>|]/g, "_")
          .substring(0, 100);
        const filename = `${safeTitle}.md`;

        // Delete from Filen if connected and should delete
        const { filen } = useConnectorStore.getState();
        if (filen.connected) {
          const shouldDelete = isPrimaryDestination("filen") || (isBackupDestination("filen") && shouldDeleteFromBackup);
          if (shouldDelete) {
            try {
              const { filenService } = await import('@/lib/services/filen-service');
              console.warn(`[DataStore] Deleting synced note from Filen: ${cardToDelete.cloudId}`);
              await filenService.deleteFile(cardToDelete.cloudId);
              console.warn(`[DataStore] Successfully deleted note from Filen`);
            } catch (error) {
              console.error(`[DataStore] Failed to delete note from Filen:`, error);
            }
          } else {
            console.warn(`[DataStore] Skipping Filen delete (backup preserved)`);
          }
        }

        // Delete from Google Drive if connected and should delete
        const { googleDrive } = useConnectorStore.getState();
        if (googleDrive.connected) {
          const shouldDelete = isPrimaryDestination("google-drive") || (isBackupDestination("google-drive") && shouldDeleteFromBackup);
          if (shouldDelete) {
            try {
              const { gdriveProvider } = await import('@/lib/services/google-drive/gdrive-provider');
              const files = await gdriveProvider.listFiles("/Pawkit/_Notes");
              const matchingFile = files.find(f => f.name === filename);

              if (matchingFile) {
                console.warn(`[DataStore] Deleting synced note from Google Drive: ${matchingFile.cloudId}`);
                await gdriveProvider.deleteFile(matchingFile.cloudId);
                console.warn(`[DataStore] Successfully deleted note from Google Drive`);
              }
            } catch (error) {
              console.error(`[DataStore] Failed to delete note from Google Drive:`, error);
            }
          } else {
            console.warn(`[DataStore] Skipping Google Drive delete (backup preserved)`);
          }
        }

        // Delete from Dropbox if connected and should delete
        const { dropbox } = useConnectorStore.getState();
        if (dropbox.connected) {
          const shouldDelete = isPrimaryDestination("dropbox") || (isBackupDestination("dropbox") && shouldDeleteFromBackup);
          if (shouldDelete) {
            try {
              const { dropboxProvider } = await import('@/lib/services/dropbox/dropbox-provider');
              const files = await dropboxProvider.listFiles("/Pawkit/_Notes");
              const matchingFile = files.find(f => f.name === filename);

              if (matchingFile) {
                console.warn(`[DataStore] Deleting synced note from Dropbox: ${matchingFile.cloudId}`);
                await dropboxProvider.deleteFile(matchingFile.cloudId);
                console.warn(`[DataStore] Successfully deleted note from Dropbox`);
              }
            } catch (error) {
              console.error(`[DataStore] Failed to delete note from Dropbox:`, error);
            }
          } else {
            console.warn(`[DataStore] Skipping Dropbox delete (backup preserved)`);
          }
        }

        // Delete from OneDrive if connected and should delete
        const { onedrive } = useConnectorStore.getState();
        if (onedrive.connected) {
          const shouldDelete = isPrimaryDestination("onedrive") || (isBackupDestination("onedrive") && shouldDeleteFromBackup);
          if (shouldDelete) {
            try {
              const { onedriveProvider } = await import('@/lib/services/onedrive/onedrive-provider');
              const files = await onedriveProvider.listFiles("/Pawkit/_Notes");
              const matchingFile = files.find(f => f.name === filename);

              if (matchingFile) {
                console.warn(`[DataStore] Deleting synced note from OneDrive: ${matchingFile.cloudId}`);
                await onedriveProvider.deleteFile(matchingFile.cloudId);
                console.warn(`[DataStore] Successfully deleted note from OneDrive`);
              }
            } catch (error) {
              console.error(`[DataStore] Failed to delete note from OneDrive:`, error);
            }
          } else {
            console.warn(`[DataStore] Skipping OneDrive delete (backup preserved)`);
          }
        }
      }

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
  addCollection: async (collectionData: { name: string; parentId?: string | null; metadata?: Record<string, unknown> }) => {
    // Mark device as active
    markDeviceActive();

    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const newCollection: CollectionNode = {
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
      metadata: collectionData.metadata,
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

          // Handle auth errors gracefully
          if (response.status === 401) {
            console.log('[DataStore] Auth not ready yet, collection will sync later');
            return;
          }

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

  updateCollection: async (id: string, updates: { name?: string; parentId?: string | null; pinned?: boolean; isPrivate?: boolean; hidePreview?: boolean; useCoverAsBackground?: boolean; coverImage?: string | null; coverImagePosition?: number | null; metadata?: Record<string, unknown> }) => {
    // Mark device as active
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
    // Mark device as active
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

        // If deleteCards is true, soft-delete cards and their files locally
        if (deleteCards) {
          const { cards } = get();
          const { useFileStore } = await import('@/lib/stores/file-store');
          const fileStore = useFileStore.getState();

          for (const collectionId of collectionsToDelete) {
            const collectionSlug = collections.find(c => c.id === collectionId)?.slug;
            // Find cards in this collection
            const cardsInCollection = cards.filter(c =>
              c.collections?.includes(collectionId) || c.collections?.includes(collectionSlug || '')
            );

            for (const card of cardsInCollection) {
              // Delete attachments (includes Filen sync)
              const attachments = fileStore.getFilesByCardId(card.id);
              for (const attachment of attachments) {
                await fileStore.deleteFile(attachment.id);
              }
              // Delete file for file cards (includes Filen sync)
              if (card.isFileCard && card.fileId) {
                await fileStore.deleteFile(card.fileId);
              }
              // Soft delete the card
              await localDb.deleteCard(card.id);
            }
          }

          // Also update cards state
          const allCards = await localDb.getAllCards();
          const activeCards = allCards.filter(c => c.deleted !== true);
          set({ cards: activeCards });
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
