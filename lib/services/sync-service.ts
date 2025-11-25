import { localDb } from './local-storage';
import { syncQueue } from './sync-queue';
import { CardDTO } from '@/lib/server/cards';
import { CollectionNode } from '@/lib/types';
import { getDeviceMetadata, markDeviceActive, isTimestampStale } from '@/lib/utils/device-session';

/**
 * BIDIRECTIONAL SYNC SERVICE
 *
 * Sync strategy:
 * 1. Local IndexedDB is ALWAYS the source of truth
 * 2. Server is a backup/sync layer between devices
 * 3. On sync: MERGE server + local (never replace)
 * 4. Conflicts: Last-write-wins by timestamp
 *
 * This ensures:
 * - User never loses data even if server is wiped
 * - Data syncs between devices
 * - Works offline
 */

type SyncResult = {
  success: boolean;
  pulled: { cards: number; collections: number };
  pushed: { cards: number; collections: number };
  conflicts: { cards: number; collections: number };
  errors: string[];
};

class SyncService {
  private syncPromise: Promise<SyncResult> | null = null;
  private broadcastChannel: BroadcastChannel | null = null;
  private otherTabSyncing = false;

  constructor() {
    // Initialize cross-tab coordination
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      this.broadcastChannel = new BroadcastChannel('pawkit-sync-lock');

      this.broadcastChannel.onmessage = (event) => {
        if (event.data.type === 'SYNC_START') {
          this.otherTabSyncing = true;
        } else if (event.data.type === 'SYNC_END') {
          this.otherTabSyncing = false;
        }
      };
    }
  }

  /**
   * Fetch helper with timeout support
   */
  private async fetchWithTimeout(url: string, options?: RequestInit, timeout = 30000): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Request timeout after ${timeout}ms for ${url}`);
      }
      throw error;
    }
  }

  /**
   * Quick check if server has any changes since last sync
   * Returns true if full sync is needed
   * Much faster than full sync (~20-50ms vs 500ms+)
   */
  async checkForChanges(): Promise<boolean> {
    try {
      const lastSync = await localDb.getLastSyncTime();
      const lastSyncISO = lastSync ? new Date(lastSync).toISOString() : null;

      const response = await this.fetchWithTimeout(
        `/api/sync/check?lastSync=${lastSyncISO || ''}`,
        { method: 'GET' },
        5000 // 5 second timeout for quick check
      );

      if (!response.ok) {
        // If check fails, assume changes exist (safe fallback)
        return true;
      }

      const { hasChanges } = await response.json();
      return hasChanges;
    } catch (error) {
      // On error, assume changes exist (safe fallback)
      return true;
    }
  }

  /**
   * Full bidirectional sync
   * 1. Pull from server
   * 2. Merge with local (resolve conflicts)
   * 3. Push local changes to server
   */
  async sync(): Promise<SyncResult> {
    // Return existing promise if sync is already in progress in this tab
    if (this.syncPromise) {
      return this.syncPromise;
    }

    // Check if another tab is syncing
    if (this.otherTabSyncing) {
      return {
        success: false,
        pulled: { cards: 0, collections: 0 },
        pushed: { cards: 0, collections: 0 },
        conflicts: { cards: 0, collections: 0 },
        errors: ['Another tab is syncing'],
      };
    }

    // Mark this device as active when syncing
    markDeviceActive();

    // Notify other tabs that we're starting sync
    this.broadcastChannel?.postMessage({ type: 'SYNC_START' });

    // Create and store the sync promise
    this.syncPromise = this._performSync();
    try {
      const result = await this.syncPromise;
      return result;
    } finally {
      // Clear the promise reference
      this.syncPromise = null;
      // Notify other tabs that we're done
      this.broadcastChannel?.postMessage({ type: 'SYNC_END' });
    }
  }

  /**
   * Internal sync implementation
   */
  private async _performSync(): Promise<SyncResult> {
    const result: SyncResult = {
      success: true,
      pulled: { cards: 0, collections: 0 },
      pushed: { cards: 0, collections: 0 },
      conflicts: { cards: 0, collections: 0 },
      errors: [],
    };

    try {
      // Step 1: Pull from server and merge
      const pullResult = await this.pullFromServer();
      result.pulled = pullResult.pulled;
      result.conflicts = pullResult.conflicts;
      result.errors.push(...pullResult.errors);

      // Step 2: Push local changes to server
      const pushResult = await this.pushToServer();
      result.pushed = pushResult.pushed;
      result.errors.push(...pushResult.errors);

      // Step 3: Process sync queue (retry any failed operations)
      // Note: syncQueue is already initialized by useUserStorage hook
      await syncQueue.process();

      // Update last sync time
      await localDb.setLastSyncTime(Date.now());
    } catch (error) {
      result.success = false;
      result.errors.push(error instanceof Error ? error.message : 'Unknown error');
    }

    return result;
  }

  /**
   * Create a snapshot of current local data for rollback
   */
  private async createSnapshot(): Promise<{
    cards: CardDTO[];
    collections: CollectionNode[];
  }> {
    const cards = await localDb.getAllCards();
    const collections = await localDb.getAllCollections();

    return { cards, collections };
  }

  /**
   * Restore data from snapshot (rollback mechanism)
   */
  private async restoreSnapshot(snapshot: { cards: CardDTO[]; collections: CollectionNode[] }): Promise<void> {

    try {
      // Note: This is a best-effort rollback. Individual saves may fail.
      // In production, consider using IndexedDB transactions for true atomicity.

      const restorePromises: Promise<void>[] = [];

      // Restore cards
      for (const card of snapshot.cards) {
        restorePromises.push(localDb.saveCard(card, { fromServer: false }));
      }

      // Restore collections
      for (const collection of snapshot.collections) {
        restorePromises.push(localDb.saveCollection(collection, { fromServer: false }));
      }

      await Promise.all(restorePromises);

    } catch (error) {
      throw new Error('Rollback failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  }

  /**
   * Pull data from server and merge with local
   */
  private async pullFromServer(): Promise<{
    pulled: { cards: number; collections: number };
    conflicts: { cards: number; collections: number };
    errors: string[];
  }> {
    const result = {
      pulled: { cards: 0, collections: 0 },
      conflicts: { cards: 0, collections: 0 },
      errors: [] as string[],
    };

    // Create snapshot for rollback in case of critical failure
    let snapshot: { cards: CardDTO[]; collections: CollectionNode[] } | null = null;
    let criticalErrorOccurred = false;

    try {
      snapshot = await this.createSnapshot();
    } catch (error) {
      // Continue without snapshot - risky but better than failing entirely
    }

    // Handle cards and collections independently to prevent one failure from affecting the other

    // CARDS SYNC - Independent try-catch
    try {
      // Include deleted cards in sync to properly handle remote deletions
      const cardsRes = await this.fetchWithTimeout('/api/cards?limit=10000&includeDeleted=true');

      if (cardsRes.ok) {
        const cardsData = await cardsRes.json();
        const serverCards: CardDTO[] = cardsData.items || [];


        const localCards = await localDb.getAllCards();

        // Merge cards - wrap in try-catch to detect critical merge failures
        try {
          const cardConflicts = await this.mergeCards(serverCards, localCards);
          result.pulled.cards = serverCards.length;
          result.conflicts.cards = cardConflicts;
        } catch (mergeError) {
          console.error('[SyncService] 🔴 CRITICAL: Card merge operation failed:', mergeError);
          criticalErrorOccurred = true;
          result.errors.push(`CRITICAL: Card merge failed: ${mergeError instanceof Error ? mergeError.message : 'Unknown error'}`);
        }
      } else {
        // Network errors are not critical - can retry later
        result.errors.push(`Failed to fetch cards: HTTP ${cardsRes.status}`);
      }
    } catch (error) {
      // Network/timeout errors are not critical
      result.errors.push(`Cards sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // COLLECTIONS SYNC - Independent try-catch
    try {
      // CRITICAL: Include deleted collections so we can process deletions in local IndexedDB
      const collectionsRes = await this.fetchWithTimeout('/api/pawkits?includeDeleted=true');

      if (collectionsRes.ok) {
        const collectionsData = await collectionsRes.json();
        const serverCollections: CollectionNode[] = collectionsData.tree || [];

        // Flatten collections tree to get accurate count
        const flatServerCollections = this.flattenCollections(serverCollections);

        const localCollections = await localDb.getAllCollections();

        // Merge collections - wrap in try-catch to detect critical merge failures
        try {
          const collectionConflicts = await this.mergeCollections(serverCollections, localCollections);
          result.pulled.collections = flatServerCollections.length;
          result.conflicts.collections = collectionConflicts;
        } catch (mergeError) {
          console.error('[SyncService] 🔴 CRITICAL: Collection merge operation failed:', mergeError);
          criticalErrorOccurred = true;
          result.errors.push(`CRITICAL: Collection merge failed: ${mergeError instanceof Error ? mergeError.message : 'Unknown error'}`);
        }
      } else {
        // Network errors are not critical - can retry later
        result.errors.push(`Failed to fetch collections: HTTP ${collectionsRes.status}`);
      }
    } catch (error) {
      // Network/timeout errors are not critical
      result.errors.push(`Collections sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // ROLLBACK MECHANISM: If critical error occurred during merge, restore from snapshot
    if (criticalErrorOccurred && snapshot) {
      console.error('[SyncService] 🔴 Critical error detected during pull - ROLLING BACK to snapshot');
      try {
        await this.restoreSnapshot(snapshot);
        result.errors.push('ROLLBACK: Critical merge failure - local data restored from snapshot');
      } catch (rollbackError) {
        console.error('[SyncService] 💀 ROLLBACK FAILED:', rollbackError);
        result.errors.push(`FATAL: Rollback failed after critical error: ${rollbackError instanceof Error ? rollbackError.message : 'Unknown error'}`);
      }
    }

    return result;
  }

  /**
   * Calculate metadata quality score based on field richness, not just presence
   */
  private calculateMetadataQuality(card: CardDTO): number {
    let score = 0;

    // Image: Valid URL (length > 10)
    if (card.image && card.image.length > 10) {
      score += 2;
    }

    // Description: Meaningful content (length > 50)
    if (card.description && card.description.length > 50) {
      score += 3;
    }

    // Article Content: Rich content (length > 200)
    if (card.articleContent && card.articleContent.length > 200) {
      score += 4;
    }

    // Metadata: Rich metadata object (more than 3 keys)
    if (card.metadata && typeof card.metadata === 'object') {
      const metadataKeys = Object.keys(card.metadata).length;
      if (metadataKeys > 3) {
        score += 1;
      }
    }

    // Title: Meaningful title (length > 5, not just URL)
    if (card.title && card.title.length > 5 && !card.title.startsWith('http')) {
      score += 1;
    }

    return score;
  }

  /**
   * Merge server cards with local cards
   * Strategy: Active device wins, then last-write-wins by updatedAt timestamp
   * CRITICAL: Local deletions ALWAYS take precedence
   */
  private async mergeCards(serverCards: CardDTO[], localCards: CardDTO[]): Promise<number> {
    let conflicts = 0;

    // Get device metadata - if this device is active, prefer local changes
    const deviceMeta = getDeviceMetadata();
    const preferLocal = deviceMeta.isActive;

    if (preferLocal) {
    }

    // Create maps for easy lookup
    const localMap = new Map(localCards.map(c => [c.id, c]));
    const serverMap = new Map(serverCards.map(c => [c.id, c]));

    // Process server cards
    for (const serverCard of serverCards) {
      const localCard = localMap.get(serverCard.id);

      if (!localCard) {
        // New card from server - save it (including deleted cards for proper sync state)
        // We need to know about deleted cards so the UI doesn't show stale data
        await localDb.saveCard(serverCard, { fromServer: true });
      } else {
        // Card exists locally and on server - check for conflicts
        const serverTime = new Date(serverCard.updatedAt).getTime();
        const localTime = new Date(localCard.updatedAt).getTime();

        // PRIORITY 1: Deletion ALWAYS wins (check first to avoid blocking!)
        // This prevents active device check from blocking incoming deletions
        if (localCard.deleted || serverCard.deleted) {
          // Mark LOCAL version as deleted (don't create duplicate from server)
          localCard.deleted = true;
          localCard.deletedAt = serverCard.deletedAt || localCard.deletedAt || new Date().toISOString();
          localCard.updatedAt = new Date().toISOString();

          // Save the updated LOCAL version (prevents duplicates)
          await localDb.saveCard(localCard, { fromServer: true });
          continue;
        }

        // PRIORITY 2: Active device wins over stale device (for non-deleted items)
        const localDeviceMeta = getDeviceMetadata();
        const serverIsStale = isTimestampStale(serverCard.updatedAt);

        if (localDeviceMeta.isActive && serverIsStale) {
          // This device is active (used within 1 hour), server data is stale (>24 hours old)
          // Keep local version regardless of timestamp
          conflicts++;
          continue;
        }

        // Check if server has metadata that local doesn't have
        // Metadata fields: title, description, image, domain, articleContent, metadata
        const serverHasMetadata = serverCard.image || serverCard.description ||
                                  serverCard.articleContent || serverCard.metadata;
        const localHasMetadata = localCard.image || localCard.description ||
                                 localCard.articleContent || localCard.metadata;

        // SPECIAL CASE: If server has metadata but local doesn't, always merge metadata
        // This ensures metadata fetched on other devices is never lost
        if (serverHasMetadata && !localHasMetadata) {
          const mergedCard = {
            ...localCard,
            // Take metadata fields from server
            title: serverCard.title || localCard.title,
            description: serverCard.description || localCard.description,
            image: serverCard.image || localCard.image,
            domain: serverCard.domain || localCard.domain,
            articleContent: serverCard.articleContent || localCard.articleContent,
            metadata: serverCard.metadata || localCard.metadata,
            // Keep the later updatedAt to avoid re-syncing
            updatedAt: serverTime > localTime ? serverCard.updatedAt : localCard.updatedAt,
          };
          await localDb.saveCard(mergedCard, { fromServer: true });
          continue;
        }

        // If both have metadata, check if server's is higher quality
        if (serverHasMetadata && localHasMetadata) {
          const serverQuality = this.calculateMetadataQuality(serverCard);
          const localQuality = this.calculateMetadataQuality(localCard);

          // If server has significantly better metadata quality, prefer it regardless of timestamp
          if (serverQuality > localQuality) {
            await localDb.saveCard(serverCard, { fromServer: true });
            continue;
          }
        }

        // PRIORITY 3: Timestamp comparison (both devices recently active)
        if (serverTime > localTime) {
          // Server is newer - use server version
          await localDb.saveCard(serverCard, { fromServer: true });
        } else if (localTime > serverTime) {
          // Local is newer - keep local (will be pushed to server)
          conflicts++;
        } else {
          // Same timestamp - update server version marker
          await localDb.saveCard(serverCard, { fromServer: true });
        }
      }
    }

    // Check for cards that exist locally but not on server
    for (const localCard of localCards) {
      if (!serverMap.has(localCard.id)) {
        // Keep it - will be pushed to server
      }
    }

    return conflicts;
  }

  /**
   * Flatten collection tree into a flat array, stripping children
   * The tree structure will be rebuilt from parentId relationships
   */
  private flattenCollections(collections: CollectionNode[]): CollectionNode[] {
    const flattened: CollectionNode[] = [];

    const flatten = (nodes: CollectionNode[]) => {
      for (const node of nodes) {
        // Strip children array - tree will be rebuilt from parentId
        const { children, ...nodeWithoutChildren } = node;
        // Always set children to empty array to ensure clean state
        flattened.push({ ...nodeWithoutChildren, children: [] } as CollectionNode);

        if (children && children.length > 0) {
          flatten(children);
        }
      }
    };

    flatten(collections);
    return flattened;
  }

  /**
   * Merge server collections with local collections
   * Strategy: Active device wins, then last-write-wins by updatedAt timestamp
   * CRITICAL: Local deletions ALWAYS take precedence
   */
  private async mergeCollections(serverCollections: CollectionNode[], localCollections: CollectionNode[]): Promise<number> {
    let conflicts = 0;

    // Get device metadata - if this device is active, prefer local changes
    const deviceMeta = getDeviceMetadata();
    const preferLocal = deviceMeta.isActive;

    // Flatten the tree structure to include all nested pawkits
    const flatServerCollections = this.flattenCollections(serverCollections);

    const localMap = new Map(localCollections.map(c => [c.id, c]));
    const serverMap = new Map(flatServerCollections.map(c => [c.id, c]));

    for (const serverCollection of flatServerCollections) {
      const localCollection = localMap.get(serverCollection.id);

      if (!localCollection) {
        // New collection from server - save it (including deleted for proper sync state)
        await localDb.saveCollection(serverCollection, { fromServer: true });
      } else {
        // Collection exists locally and on server - check for conflicts
        const serverTime = new Date(serverCollection.updatedAt).getTime();
        const localTime = new Date(localCollection.updatedAt).getTime();

        // PRIORITY 1: Deletion ALWAYS wins (check first to avoid blocking!)
        // This prevents active device check from blocking incoming deletions
        if (localCollection.deleted || serverCollection.deleted) {
          // Mark LOCAL version as deleted (don't create duplicate from server)
          localCollection.deleted = true;
          localCollection.deletedAt = serverCollection.deletedAt || localCollection.deletedAt || new Date().toISOString();
          localCollection.updatedAt = new Date().toISOString();

          // Save the updated LOCAL version (prevents duplicates)
          await localDb.saveCollection(localCollection, { fromServer: true });
          continue;
        }

        // PRIORITY 2: Active device wins over stale device (for non-deleted items)
        const localDeviceMeta = getDeviceMetadata();
        const serverIsStale = isTimestampStale(serverCollection.updatedAt);

        if (localDeviceMeta.isActive && serverIsStale) {
          // This device is active (used within 1 hour), server data is stale (>24 hours old)
          // Keep local version regardless of timestamp
          conflicts++;
          continue;
        }

        // PRIORITY 3: Timestamp comparison (both devices recently active)
        if (serverTime > localTime) {
          await localDb.saveCollection(serverCollection, { fromServer: true });
        } else if (localTime > serverTime) {
          conflicts++;
        } else {
          await localDb.saveCollection(serverCollection, { fromServer: true });
        }
      }
    }

    return conflicts;
  }

  /**
   * Push local changes to server
   */
  private async pushToServer(): Promise<{
    pushed: { cards: number; collections: number };
    errors: string[];
  }> {
    const result = {
      pushed: { cards: 0, collections: 0 },
      errors: [] as string[],
    };

    try {
      // Push modified cards
      const modifiedCards = await localDb.getModifiedCards();

      for (const card of modifiedCards) {
        try {
          // Check if card exists on server (has a real ID, not temp)
          const isTemp = card.id.startsWith('temp_');

          if (isTemp) {
            // Create new card on server
            const response = await this.fetchWithTimeout('/api/cards', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(card),
            });

            if (response.ok) {
              const serverCard = await response.json();
              // ATOMIC REPLACEMENT: Save server card first, then permanently delete temp
              // This prevents data loss if operation is interrupted
              await localDb.saveCard(serverCard, { fromServer: true });
              await localDb.permanentlyDeleteCard(card.id);
              result.pushed.cards++;
            } else {
              // Add to retry queue
              await syncQueue.enqueue({
                type: 'CREATE_CARD',
                tempId: card.id,
                payload: card,
              });
              result.errors.push(`Failed to create card ${card.id}: HTTP ${response.status}, queued for retry`);
            }
          } else {
            // Update existing card on server (includes deleted cards)
            const response = await this.fetchWithTimeout(`/api/cards/${card.id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(card),
            });

            if (response.ok) {
              const serverCard = await response.json();
              await localDb.markCardSynced(card.id, serverCard.updatedAt);
              result.pushed.cards++;
            } else if (response.status === 404) {
              // Card doesn't exist on server - create it
              const createResponse = await this.fetchWithTimeout('/api/cards', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(card),
              });

              if (createResponse.ok) {
                const serverCard = await createResponse.json();
                await localDb.markCardSynced(card.id, serverCard.updatedAt);
                result.pushed.cards++;
              } else {
                // Add to retry queue
                await syncQueue.enqueue({
                  type: 'CREATE_CARD',
                  targetId: card.id,
                  payload: card,
                });
                result.errors.push(`Failed to create card ${card.id}: HTTP ${createResponse.status}, queued for retry`);
              }
            } else {
              // Add to retry queue
              await syncQueue.enqueue({
                type: 'UPDATE_CARD',
                targetId: card.id,
                payload: card,
              });
              result.errors.push(`Failed to update card ${card.id}: HTTP ${response.status}, queued for retry`);
            }
          }
        } catch (error) {
          // Add to retry queue on network/unexpected errors
          await syncQueue.enqueue({
            type: card.id.startsWith('temp_') ? 'CREATE_CARD' : 'UPDATE_CARD',
            tempId: card.id.startsWith('temp_') ? card.id : undefined,
            targetId: !card.id.startsWith('temp_') ? card.id : undefined,
            payload: card,
          });
          result.errors.push(`Failed to push card ${card.id}: ${error instanceof Error ? error.message : 'Unknown error'}, queued for retry`);
        }
      }

      // Push modified collections
      const modifiedCollections = await localDb.getModifiedCollections();

      for (const collection of modifiedCollections) {
        try {
          const isTemp = collection.id.startsWith('temp_');

          if (isTemp) {
            // Create new collection on server
            const response = await this.fetchWithTimeout('/api/pawkits', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                name: collection.name,
                parentId: collection.parentId,
              }),
            });

            if (response.ok) {
              const serverCollection = await response.json();
              // ATOMIC REPLACEMENT: Save server collection first, then delete temp
              // This prevents data loss if operation is interrupted
              await localDb.saveCollection(serverCollection, { fromServer: true });
              await localDb.deleteCollection(collection.id);
              result.pushed.collections++;
            } else {
              // Add to retry queue
              await syncQueue.enqueue({
                type: 'CREATE_COLLECTION',
                tempId: collection.id,
                payload: {
                  name: collection.name,
                  parentId: collection.parentId,
                },
              });
              result.errors.push(`Failed to create collection ${collection.id}: HTTP ${response.status}, queued for retry`);
            }
          } else {
            // Update existing collection on server (includes deleted collections)
            const response = await this.fetchWithTimeout(`/api/pawkits/${collection.id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(collection),
            });

            if (response.ok) {
              const serverCollection = await response.json();
              await localDb.markCollectionSynced(collection.id, serverCollection.updatedAt);
              result.pushed.collections++;
            } else if (response.status === 404) {
              // Collection doesn't exist on server - create it
              const createResponse = await this.fetchWithTimeout('/api/pawkits', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  name: collection.name,
                  parentId: collection.parentId,
                }),
              });

              if (createResponse.ok) {
                const serverCollection = await createResponse.json();
                await localDb.markCollectionSynced(collection.id, serverCollection.updatedAt);
                result.pushed.collections++;
              } else {
                // Add to retry queue
                await syncQueue.enqueue({
                  type: 'CREATE_COLLECTION',
                  targetId: collection.id,
                  payload: {
                    name: collection.name,
                    parentId: collection.parentId,
                  },
                });
                result.errors.push(`Failed to create collection ${collection.id}: HTTP ${createResponse.status}, queued for retry`);
              }
            } else {
              // Add to retry queue
              await syncQueue.enqueue({
                type: 'UPDATE_COLLECTION',
                targetId: collection.id,
                payload: collection,
              });
              result.errors.push(`Failed to update collection ${collection.id}: HTTP ${response.status}, queued for retry`);
            }
          }
        } catch (error) {
          // Add to retry queue on network/unexpected errors
          await syncQueue.enqueue({
            type: collection.id.startsWith('temp_') ? 'CREATE_COLLECTION' : 'UPDATE_COLLECTION',
            tempId: collection.id.startsWith('temp_') ? collection.id : undefined,
            targetId: !collection.id.startsWith('temp_') ? collection.id : undefined,
            payload: collection.id.startsWith('temp_') ? {
              name: collection.name,
              parentId: collection.parentId,
            } : collection,
          });
          result.errors.push(`Failed to push collection ${collection.id}: ${error instanceof Error ? error.message : 'Unknown error'}, queued for retry`);
        }
      }
    } catch (error) {
      result.errors.push(error instanceof Error ? error.message : 'Push failed');
    }

    return result;
  }

  /**
   * Quick sync status check
   */
  async getStatus(): Promise<{
    lastSync: number | null;
    pendingChanges: number;
    isSyncing: boolean;
  }> {
    const stats = await localDb.getStats();
    return {
      lastSync: stats.lastSync,
      pendingChanges: stats.modifiedCards,
      isSyncing: this.syncPromise !== null || this.otherTabSyncing,
    };
  }

  /**
   * Cleanup method to close BroadcastChannel
   */
  destroy(): void {
    this.broadcastChannel?.close();
    this.broadcastChannel = null;
  }
}

export const syncService = new SyncService();
