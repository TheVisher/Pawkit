import { localDb } from './local-storage';
import { syncQueue } from './sync-queue';
import { CardDTO } from '@/lib/server/cards';
import { CollectionNode } from '@/lib/types';
import { getDeviceMetadata, markDeviceActive } from '@/lib/utils/device-session';

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
  private isSyncing = false;

  /**
   * Full bidirectional sync
   * 1. Pull from server
   * 2. Merge with local (resolve conflicts)
   * 3. Push local changes to server
   */
  async sync(): Promise<SyncResult> {
    if (this.isSyncing) {
      console.log('[SyncService] Sync already in progress, skipping');
      return {
        success: false,
        pulled: { cards: 0, collections: 0 },
        pushed: { cards: 0, collections: 0 },
        conflicts: { cards: 0, collections: 0 },
        errors: ['Sync already in progress'],
      };
    }

    // Mark this device as active when syncing
    markDeviceActive();

    this.isSyncing = true;
    const result: SyncResult = {
      success: true,
      pulled: { cards: 0, collections: 0 },
      pushed: { cards: 0, collections: 0 },
      conflicts: { cards: 0, collections: 0 },
      errors: [],
    };

    try {
      console.log('[SyncService] Starting sync...');

      // Step 1: Pull from server and merge
      const pullResult = await this.pullFromServer();
      result.pulled = pullResult.pulled;
      result.conflicts = pullResult.conflicts;
      result.errors.push(...pullResult.errors);

      // Step 2: Push local changes to server
      const pushResult = await this.pushToServer();
      result.pushed = pushResult.pushed;
      result.errors.push(...pushResult.errors);

      // Step 3: Drain sync queue (retry any failed operations)
      await syncQueue.init();
      const pendingOps = await syncQueue.getPending();
      console.log('[SyncService] Processing', pendingOps.length, 'queued operations');

      // Update last sync time
      await localDb.setLastSyncTime(Date.now());

      console.log('[SyncService] Sync complete:', result);
    } catch (error) {
      console.error('[SyncService] Sync failed:', error);
      result.success = false;
      result.errors.push(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      this.isSyncing = false;
    }

    return result;
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

    try {
      // Fetch from server
      const [cardsRes, collectionsRes] = await Promise.all([
        fetch('/api/cards?limit=10000'),
        fetch('/api/pawkits'),
      ]);

      if (!cardsRes.ok || !collectionsRes.ok) {
        result.errors.push('Failed to fetch from server');
        return result;
      }

      const cardsData = await cardsRes.json();
      const collectionsData = await collectionsRes.json();

      const serverCards: CardDTO[] = cardsData.items || [];
      const serverCollections: CollectionNode[] = collectionsData.tree || [];

      // Flatten collections tree to get accurate count
      const flatServerCollections = this.flattenCollections(serverCollections);

      console.log('[SyncService] Pulled from server:', {
        cards: serverCards.length,
        collections: flatServerCollections.length,
      });

      // Get local data
      const localCards = await localDb.getAllCards();
      const localCollections = await localDb.getAllCollections();

      // Merge cards
      const cardConflicts = await this.mergeCards(serverCards, localCards);
      result.pulled.cards = serverCards.length;
      result.conflicts.cards = cardConflicts;

      // Merge collections
      const collectionConflicts = await this.mergeCollections(serverCollections, localCollections);
      result.pulled.collections = flatServerCollections.length;
      result.conflicts.collections = collectionConflicts;

    } catch (error) {
      console.error('[SyncService] Pull failed:', error);
      result.errors.push(error instanceof Error ? error.message : 'Pull failed');
    }

    return result;
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
      console.log('[SyncService] 🎯 This device is ACTIVE - local changes will be preferred');
    }

    // Create maps for easy lookup
    const localMap = new Map(localCards.map(c => [c.id, c]));
    const serverMap = new Map(serverCards.map(c => [c.id, c]));

    // Process server cards
    for (const serverCard of serverCards) {
      const localCard = localMap.get(serverCard.id);

      if (!localCard) {
        // New card from server - add it ONLY if not deleted on server
        if (!serverCard.deleted) {
          await localDb.saveCard(serverCard, { fromServer: true });
        }
      } else {
        // CRITICAL: If local card is deleted, NEVER overwrite with server version
        // Local deletions always take precedence to prevent resurrection
        if (localCard.deleted) {
          console.log('[SyncService] Local card is deleted, preserving deletion:', localCard.id);
          // Keep local deleted version, will be synced to server in push phase
          continue;
        }

        // Card exists locally and not deleted - check for conflicts
        const serverTime = new Date(serverCard.updatedAt).getTime();
        const localTime = new Date(localCard.updatedAt).getTime();

        // If server version is deleted, accept the deletion
        if (serverCard.deleted) {
          console.log('[SyncService] Server card is deleted, accepting deletion:', serverCard.id);
          await localDb.saveCard(serverCard, { fromServer: true });
          continue;
        }

        // ENHANCED: If this device is active, ALWAYS prefer local version
        if (preferLocal && localTime > 0) {
          console.log('[SyncService] 🎯 Active device - keeping local version:', localCard.id);
          conflicts++;
          continue;
        }

        // Fallback to timestamp comparison
        if (serverTime > localTime) {
          // Server is newer - use server version
          console.log('[SyncService] Server version newer for card:', serverCard.id);
          await localDb.saveCard(serverCard, { fromServer: true });
        } else if (localTime > serverTime) {
          // Local is newer - keep local (will be pushed to server)
          console.log('[SyncService] Local version newer for card:', localCard.id);
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
        console.log('[SyncService] Card exists locally but not on server:', localCard.id);
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
        // New collection from server - add it ONLY if not deleted on server
        if (!serverCollection.deleted) {
          await localDb.saveCollection(serverCollection, { fromServer: true });
        }
      } else {
        // CRITICAL: If local collection is deleted, NEVER overwrite with server version
        // Local deletions always take precedence to prevent resurrection
        if (localCollection.deleted) {
          console.log('[SyncService] Local collection is deleted, preserving deletion:', localCollection.id);
          // Keep local deleted version, will be synced to server in push phase
          continue;
        }

        const serverTime = new Date(serverCollection.updatedAt).getTime();
        const localTime = new Date(localCollection.updatedAt).getTime();

        // If server version is deleted, accept the deletion
        if (serverCollection.deleted) {
          console.log('[SyncService] Server collection is deleted, accepting deletion:', serverCollection.id);
          await localDb.saveCollection(serverCollection, { fromServer: true });
          continue;
        }

        // ENHANCED: If this device is active, ALWAYS prefer local version
        if (preferLocal && localTime > 0) {
          console.log('[SyncService] 🎯 Active device - keeping local collection:', localCollection.id);
          conflicts++;
          continue;
        }

        // Fallback to timestamp comparison
        if (serverTime > localTime) {
          await localDb.saveCollection(serverCollection, { fromServer: true });
        } else if (localTime > serverTime) {
          console.log('[SyncService] Local version newer for collection:', localCollection.id);
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
      console.log('[SyncService] Pushing', modifiedCards.length, 'modified cards to server');

      for (const card of modifiedCards) {
        try {
          // Check if card exists on server (has a real ID, not temp)
          const isTemp = card.id.startsWith('temp_');

          if (isTemp) {
            // Create new card on server
            const response = await fetch('/api/cards', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(card),
            });

            if (response.ok) {
              const serverCard = await response.json();
              // Replace temp card with server card
              await localDb.deleteCard(card.id);
              await localDb.saveCard(serverCard, { fromServer: true });
              result.pushed.cards++;
            } else {
              result.errors.push(`Failed to create card: ${card.id}`);
            }
          } else {
            // Update existing card on server (includes deleted cards)
            const response = await fetch(`/api/cards/${card.id}`, {
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
              const createResponse = await fetch('/api/cards', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(card),
              });

              if (createResponse.ok) {
                const serverCard = await createResponse.json();
                await localDb.markCardSynced(card.id, serverCard.updatedAt);
                result.pushed.cards++;
              } else {
                result.errors.push(`Failed to create card: ${card.id}`);
              }
            } else {
              result.errors.push(`Failed to update card: ${card.id}`);
            }
          }
        } catch (error) {
          console.error('[SyncService] Failed to push card:', card.id, error);
          result.errors.push(`Failed to push card ${card.id}: ${error}`);
        }
      }

      // Push modified collections
      const modifiedCollections = await localDb.getModifiedCollections();
      console.log('[SyncService] Pushing', modifiedCollections.length, 'modified collections to server');

      for (const collection of modifiedCollections) {
        try {
          const isTemp = collection.id.startsWith('temp_');

          if (isTemp) {
            // Create new collection on server
            const response = await fetch('/api/pawkits', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                name: collection.name,
                parentId: collection.parentId,
              }),
            });

            if (response.ok) {
              const serverCollection = await response.json();
              // Replace temp collection with server collection
              await localDb.deleteCollection(collection.id);
              await localDb.saveCollection(serverCollection, { fromServer: true });
              result.pushed.collections++;
            } else {
              result.errors.push(`Failed to create collection: ${collection.id}`);
            }
          } else {
            // Update existing collection on server (includes deleted collections)
            const response = await fetch(`/api/pawkits/${collection.id}`, {
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
              const createResponse = await fetch('/api/pawkits', {
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
                result.errors.push(`Failed to create collection: ${collection.id}`);
              }
            } else {
              result.errors.push(`Failed to update collection: ${collection.id}`);
            }
          }
        } catch (error) {
          console.error('[SyncService] Failed to push collection:', collection.id, error);
          result.errors.push(`Failed to push collection ${collection.id}: ${error}`);
        }
      }
    } catch (error) {
      console.error('[SyncService] Push failed:', error);
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
      isSyncing: this.isSyncing,
    };
  }
}

export const syncService = new SyncService();
