/**
 * Sync Queue Processor
 * Processes pending sync queue items and sends them to the server
 */

import { db } from '@/lib/db';
import type { SyncQueueItem, LocalCard } from '@/lib/db';
import { useSyncStore } from '@/lib/stores/sync-store';
import { useDataStore } from '@/lib/stores/data-store';
import { createModuleLogger } from '@/lib/utils/logger';
import { CONFLICT_TAG, addConflictTag, removeConflictTag } from '@/lib/utils/system-tags';

const log = createModuleLogger('SyncQueue');

// Maximum retry attempts before marking as failed
const MAX_RETRIES = 3;

// Debounce delay for immediate syncs (ms)
export const QUEUE_DEBOUNCE_MS = 2000;

/**
 * Manually trigger a sync (e.g., when modal closes)
 * Only syncs if there are pending items - no wasted requests
 */
export async function triggerSync(): Promise<void> {
  log.debug('triggerSync called');

  if (typeof navigator === 'undefined') {
    log.debug('triggerSync: navigator undefined (SSR?)');
    return;
  }

  if (!navigator.onLine) {
    log.debug('triggerSync: offline, skipping');
    return;
  }

  const count = await getPendingItemCount();
  log.debug(`triggerSync: ${count} pending items`);

  if (count > 0) {
    log.debug('triggerSync: calling processQueue');
    await processQueue();
    log.debug('triggerSync: processQueue completed');
  }
}

/**
 * Get count of pending (non-failed) items in the queue
 */
async function getPendingItemCount(): Promise<number> {
  const items = await db.syncQueue.toArray();
  return items.filter((item) => (item.retryCount || 0) < MAX_RETRIES).length;
}

// =============================================================================
// API ENDPOINT MAPPING
// =============================================================================

type EntityType = SyncQueueItem['entityType'];
type Operation = SyncQueueItem['operation'];

/**
 * Map entity type and operation to API endpoint and method
 */
function getApiEndpoint(
  entityType: EntityType,
  operation: Operation,
  entityId: string
): { url: string; method: string } {
  const baseUrls: Record<EntityType, string> = {
    workspace: '/api/workspaces',
    collection: '/api/collections',
    card: '/api/cards',
    event: '/api/events',
    todo: '/api/todos',
    collectionNote: '/api/collection-notes', // Future
    viewSettings: '/api/view-settings', // Future
  };

  const baseUrl = baseUrls[entityType];

  switch (operation) {
    case 'create':
      return { url: baseUrl, method: 'POST' };
    case 'update':
      return { url: `${baseUrl}/${entityId}`, method: 'PATCH' };
    case 'delete':
      return { url: `${baseUrl}/${entityId}`, method: 'DELETE' };
    default:
      throw new Error(`Unknown operation: ${operation}`);
  }
}

// =============================================================================
// QUEUE PROCESSING
// =============================================================================

export interface QueueProcessResult {
  processed: number;
  failed: number;
  errors: Array<{ id: number; error: string }>;
}

/**
 * Process all pending items in the sync queue
 * Items are processed FIFO (ordered by createdAt)
 */
export async function processQueue(): Promise<QueueProcessResult> {
  const result: QueueProcessResult = {
    processed: 0,
    failed: 0,
    errors: [],
  };

  // Check if online
  if (!navigator.onLine) {
    log.debug('Offline, skipping queue processing');
    return result;
  }

  // Get pending items (exclude failed) ordered by creation time
  const allItems = await db.syncQueue.orderBy('createdAt').toArray();
  const items = allItems.filter((item) => (item.retryCount || 0) < MAX_RETRIES);

  if (items.length === 0) {
    return result;
  }

  log.debug(`Processing ${items.length} pending items (${allItems.length - items.length} failed/parked)`);

  // Update pending count in store
  useSyncStore.getState().setPendingCount(items.length);

  // Process each item sequentially (FIFO)
  for (const item of items) {
    try {
      await processQueueItem(item);
      result.processed++;

      // Update pending count as we process
      useSyncStore.getState().setPendingCount(items.length - result.processed - result.failed);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      log.error(`Failed to process item ${item.id}:`, errorMessage);

      // Increment retry count
      const newRetryCount = (item.retryCount || 0) + 1;

      if (newRetryCount >= MAX_RETRIES) {
        // Mark as permanently failed
        result.failed++;
        result.errors.push({ id: item.id!, error: errorMessage });

        // Update item with error
        await db.syncQueue.update(item.id!, {
          retryCount: newRetryCount,
          lastError: errorMessage,
        });

        // Track failed entity in store for UI
        useSyncStore.getState().addFailedEntity(item.entityId);
      } else {
        // Update retry count for later retry
        await db.syncQueue.update(item.id!, {
          retryCount: newRetryCount,
          lastError: errorMessage,
        });
      }
    }
  }

  // Final pending count update (exclude failed items)
  const remainingCount = await getPendingItemCount();
  useSyncStore.getState().setPendingCount(remainingCount);

  log.debug(`Completed: ${result.processed} processed, ${result.failed} failed`);

  return result;
}

/**
 * Process a single queue item
 * Throws on failure for retry handling
 */
async function processQueueItem(item: SyncQueueItem): Promise<void> {
  const { entityType, entityId, operation, payload } = item;

  // Track that this entity is actively syncing
  useSyncStore.getState().addActivelySyncing(entityId);

  try {
    // Get API endpoint
    const { url, method } = getApiEndpoint(entityType, operation, entityId);

    log.debug(`${method} ${url} (${entityType}/${operation})`);

    // Prepare request body
    let body: string | undefined;

    if (operation === 'create') {
      // For create, we need the full entity from local DB
      const entity = await getLocalEntity(entityType, entityId);
      if (!entity) {
        // Entity was deleted locally, remove from queue
        await db.syncQueue.delete(item.id!);
        return;
      }
      body = JSON.stringify(prepareForServer(entity, entityType));
    } else if (operation === 'update' && payload) {
      // For update, use the payload (partial update)
      // For cards, include expectedVersion for conflict detection
      if (entityType === 'card') {
        const localCard = await db.cards.get(entityId);
        if (localCard) {
          // Send the current local version as expectedVersion
          body = JSON.stringify({
            ...payload,
            expectedVersion: localCard.version || 1,
          });
        } else {
          body = JSON.stringify(payload);
        }
      } else {
        body = JSON.stringify(payload);
      }
    }
    // For delete, no body needed

    // Make API request
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      body,
      credentials: 'include', // Include cookies for auth
    });

    // Handle response
    if (!response.ok) {
      // Check for idempotent create (200 OK means already exists)
      if (operation === 'create' && response.status === 200) {
        // Already exists on server, this is fine (idempotent)
        await db.syncQueue.delete(item.id!);
        await markEntitySynced(entityType, entityId);
        return;
      }

      // Handle 401 (not authenticated) - don't retry
      if (response.status === 401) {
        throw new Error('Not authenticated');
      }

      // Handle 409 (version conflict) for card updates
      if (response.status === 409 && entityType === 'card' && operation === 'update') {
        const conflictData = await response.json();
        if (conflictData.code === 'VERSION_CONFLICT') {
          log.warn(`Version conflict detected for card ${entityId}`);
          await handleCardConflict(entityId, conflictData.serverCard);
          // Remove from queue - conflict has been handled
          await db.syncQueue.delete(item.id!);
          return;
        }
      }

      // Handle 404 for update/delete - entity doesn't exist on server
      if (response.status === 404 && (operation === 'update' || operation === 'delete')) {
        // Entity doesn't exist on server, remove from queue
        await db.syncQueue.delete(item.id!);
        // Mark as synced locally to prevent re-queueing on future edits
        await markEntitySynced(entityType, entityId);
        log.debug(`Entity ${entityId} not found on server, marked as synced locally`);
        return;
      }

      // Other errors
      const errorBody = await response.text();
      throw new Error(`API error ${response.status}: ${errorBody}`);
    }

    // Success - remove from queue and mark as synced
    await db.syncQueue.delete(item.id!);

    if (operation !== 'delete') {
      await markEntitySynced(entityType, entityId);
    }
  } finally {
    // Always remove from actively syncing, regardless of success or failure
    useSyncStore.getState().removeActivelySyncing(entityId);
  }
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get an entity from local database by type and ID
 */
async function getLocalEntity(
  entityType: EntityType,
  entityId: string
): Promise<Record<string, unknown> | undefined> {
  switch (entityType) {
    case 'workspace':
      return db.workspaces.get(entityId) as Promise<Record<string, unknown> | undefined>;
    case 'collection':
      return db.collections.get(entityId) as Promise<Record<string, unknown> | undefined>;
    case 'card':
      return db.cards.get(entityId) as Promise<Record<string, unknown> | undefined>;
    case 'event':
      return db.calendarEvents.get(entityId) as Promise<Record<string, unknown> | undefined>;
    case 'todo':
      return db.todos.get(entityId) as Promise<Record<string, unknown> | undefined>;
    case 'collectionNote':
      return db.collectionNotes.get(entityId) as Promise<Record<string, unknown> | undefined>;
    case 'viewSettings':
      return db.viewSettings.get(entityId) as Promise<Record<string, unknown> | undefined>;
    default:
      return undefined;
  }
}

/**
 * Prepare a local entity for server by removing local-only fields
 */
function prepareForServer(
  entity: Record<string, unknown>,
  entityType: EntityType
): Record<string, unknown> {
  // Remove sync metadata fields (start with underscore)
  const serverEntity: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(entity)) {
    // Skip local-only fields
    if (key.startsWith('_')) continue;

    // Convert Date objects to ISO strings
    if (value instanceof Date) {
      serverEntity[key] = value.toISOString();
    } else {
      serverEntity[key] = value;
    }
  }

  // Map local field names to server field names if needed
  if (entityType === 'card') {
    // Map _deleted to deleted for soft delete
    if (entity._deleted) {
      serverEntity.deleted = true;
    }
  }

  return serverEntity;
}

/**
 * Mark an entity as synced in local database and update Zustand store
 */
async function markEntitySynced(entityType: EntityType, entityId: string): Promise<void> {
  const updates = {
    _synced: true,
    _serverVersion: new Date().toISOString(),
  };

  switch (entityType) {
    case 'workspace':
      await db.workspaces.update(entityId, updates);
      break;
    case 'collection':
      await db.collections.update(entityId, updates);
      // Update Zustand store for collections
      useDataStore.setState((state) => ({
        collections: state.collections.map((c) =>
          c.id === entityId ? { ...c, _synced: true } : c
        ),
      }));
      break;
    case 'card':
      await db.cards.update(entityId, updates);
      // Update Zustand store for cards
      useDataStore.setState((state) => ({
        cards: state.cards.map((c) =>
          c.id === entityId ? { ...c, _synced: true } : c
        ),
      }));
      break;
    case 'event':
      await db.calendarEvents.update(entityId, updates);
      break;
    case 'todo':
      await db.todos.update(entityId, updates);
      break;
    case 'collectionNote':
      await db.collectionNotes.update(entityId, updates);
      break;
    case 'viewSettings':
      await db.viewSettings.update(entityId, updates);
      break;
  }
}

// =============================================================================
// QUEUE MANAGEMENT
// =============================================================================

/**
 * Add an item to the sync queue
 */
export async function addToQueue(
  entityType: EntityType,
  entityId: string,
  operation: Operation,
  payload?: Record<string, unknown>
): Promise<void> {
  // Check if there's already a pending item for this entity
  const existing = await db.syncQueue
    .where('entityId')
    .equals(entityId)
    .first();

  if (existing) {
    // Merge operations intelligently
    if (existing.operation === 'create' && operation === 'update') {
      // Keep create, payload will be fetched fresh
      return;
    }
    if (existing.operation === 'create' && operation === 'delete') {
      // Never synced, just delete the queue item
      await db.syncQueue.delete(existing.id!);
      return;
    }
    if (existing.operation === 'update' && operation === 'delete') {
      // Replace update with delete
      await db.syncQueue.update(existing.id!, {
        operation: 'delete',
        payload: undefined,
      });
      return;
    }
    if (existing.operation === 'update' && operation === 'update') {
      // Merge payloads
      await db.syncQueue.update(existing.id!, {
        payload: { ...existing.payload, ...payload },
      });
      return;
    }
  }

  // Add new queue item
  await db.syncQueue.add({
    entityType,
    entityId,
    operation,
    payload,
    retryCount: 0,
    createdAt: new Date(),
  });

  // Update pending count (new items always have retryCount=0, so count all pending)
  const count = await getPendingItemCount();
  useSyncStore.getState().setPendingCount(count);

  // NOTE: We don't auto-sync here. Sync is triggered explicitly by:
  // - triggerSync() after discrete actions (e.g., Daily Log entry)
  // - Modal close
  // - Tab visibility change
  // - Page unload
  // This prevents wasteful syncing while typing in notes.
}

/**
 * Get count of failed items (exceeded max retries)
 */
export async function getFailedCount(): Promise<number> {
  const items = await db.syncQueue.toArray();
  return items.filter((item) => item.retryCount >= MAX_RETRIES).length;
}

/**
 * Clear all failed items from queue
 */
export async function clearFailedItems(): Promise<void> {
  const items = await db.syncQueue.toArray();
  const failedIds = items
    .filter((item) => item.retryCount >= MAX_RETRIES)
    .map((item) => item.id!);

  await db.syncQueue.bulkDelete(failedIds);

  // Clear failed entities from store
  useSyncStore.getState().clearFailedEntities();

  // After clearing failed, remaining are all pending
  const count = await getPendingItemCount();
  useSyncStore.getState().setPendingCount(count);
}

/**
 * Retry all failed items (reset retry count)
 */
export async function retryFailedItems(): Promise<void> {
  const items = await db.syncQueue.toArray();
  const failed = items.filter((item) => item.retryCount >= MAX_RETRIES);

  for (const item of failed) {
    await db.syncQueue.update(item.id!, {
      retryCount: 0,
      lastError: undefined,
    });
  }

  // Clear failed entities from store since we're retrying
  useSyncStore.getState().clearFailedEntities();
}

/**
 * Clear entire sync queue and mark all entities as synced
 * Use this to reset after a broken sync state
 */
export async function clearAllSyncQueue(): Promise<void> {
  console.log('[SyncQueue] Clearing all sync queue items...');

  // Clear the queue
  const queueCount = await db.syncQueue.count();
  console.log(`[SyncQueue] Queue has ${queueCount} items, clearing...`);
  await db.syncQueue.clear();

  // Mark all cards as synced in IndexedDB
  // (useLiveQuery will automatically update any components observing cards)
  const cardCount = await db.cards.count();
  console.log(`[SyncQueue] Marking ${cardCount} cards as synced in IndexedDB...`);
  await db.cards.toCollection().modify({ _synced: true });

  // Reset pending count
  useSyncStore.getState().setPendingCount(0);

  console.log('[SyncQueue] Done! All cards marked as synced.');
}

// =============================================================================
// ENTITY-LEVEL SYNC STATUS
// =============================================================================

export type EntitySyncStatus = 'synced' | 'queued' | 'syncing' | 'failed';

export interface EntitySyncInfo {
  status: EntitySyncStatus;
  retryCount?: number;
  lastError?: string;
}

/**
 * Get the sync status for a specific entity
 * This allows cards to show whether they're queued, actively syncing, or failed
 */
export async function getSyncStatusForEntity(entityId: string): Promise<EntitySyncInfo> {
  // Check if actively syncing right now
  const activelySyncing = useSyncStore.getState().activelySyncingIds;
  if (activelySyncing.has(entityId)) {
    return { status: 'syncing' };
  }

  // Check the sync queue for this entity
  const queueItem = await db.syncQueue
    .where('entityId')
    .equals(entityId)
    .first();

  if (!queueItem) {
    return { status: 'synced' };
  }

  // Check if failed (exceeded max retries)
  if ((queueItem.retryCount || 0) >= MAX_RETRIES) {
    return {
      status: 'failed',
      retryCount: queueItem.retryCount,
      lastError: queueItem.lastError,
    };
  }

  // In queue, waiting to be processed
  return {
    status: 'queued',
    retryCount: queueItem.retryCount,
  };
}

/**
 * Force sync a specific entity immediately
 * Resets retry count if failed and triggers immediate sync
 */
export async function forceSyncEntity(entityId: string): Promise<boolean> {
  // Check if online
  if (!navigator.onLine) {
    log.debug('Offline, cannot force sync');
    return false;
  }

  // Get the queue item for this entity
  const queueItem = await db.syncQueue
    .where('entityId')
    .equals(entityId)
    .first();

  if (!queueItem) {
    log.debug(`No queue item found for entity ${entityId}`);
    return false;
  }

  // Reset retry count if failed
  if ((queueItem.retryCount || 0) >= MAX_RETRIES) {
    await db.syncQueue.update(queueItem.id!, {
      retryCount: 0,
      lastError: undefined,
    });
    // Remove from failed entities since we're retrying
    useSyncStore.getState().removeFailedEntity(entityId);
    log.debug(`Reset retry count for entity ${entityId}`);
  }

  // Process this specific item immediately
  try {
    const freshItem = await db.syncQueue.get(queueItem.id!);
    if (freshItem) {
      await processQueueItem(freshItem);
      return true;
    }
    return false;
  } catch (error) {
    log.error(`Force sync failed for entity ${entityId}:`, error);
    return false;
  }
}

/**
 * Initialize failed entity IDs from the queue
 * Call this on app startup to restore failed state
 */
export async function initializeFailedEntities(): Promise<void> {
  const items = await db.syncQueue.toArray();
  const failedItems = items.filter((item) => (item.retryCount || 0) >= MAX_RETRIES);

  const store = useSyncStore.getState();
  store.clearFailedEntities();

  for (const item of failedItems) {
    store.addFailedEntity(item.entityId);
  }

  log.debug(`Initialized ${failedItems.length} failed entities`);
}

// =============================================================================
// CONFLICT HANDLING
// =============================================================================

/**
 * Handle a version conflict for a card
 * Creates a conflict copy of the local card and links both with conflict tag
 */
async function handleCardConflict(
  localCardId: string,
  serverCard: Record<string, unknown>
): Promise<void> {
  log.info(`Handling conflict for card ${localCardId}`);

  // Get the local card
  const localCard = await db.cards.get(localCardId);
  if (!localCard) {
    log.error(`Local card ${localCardId} not found for conflict resolution`);
    return;
  }

  // Create a conflict copy of the local card with a new ID
  const conflictCopyId = crypto.randomUUID();
  const conflictCopy: LocalCard = {
    ...localCard,
    id: conflictCopyId,
    title: localCard.title ? `${localCard.title} (Conflict)` : 'Untitled (Conflict)',
    tags: addConflictTag(localCard.tags || []),
    conflictWithId: localCardId, // Link to the original
    version: 1, // Reset version for the copy
    _synced: false,
    _lastModified: new Date(),
    _localOnly: true, // Mark as local only initially
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // Save the conflict copy to local DB
  await db.cards.add(conflictCopy);

  // Update the original local card with server data + conflict tag
  const serverVersion = (serverCard.version as number) || 1;
  const serverTags = (serverCard.tags as string[]) || [];

  await db.cards.update(localCardId, {
    // Update with server values
    title: serverCard.title as string,
    description: serverCard.description as string | undefined,
    content: serverCard.content as string | undefined,
    notes: serverCard.notes as string | undefined,
    image: serverCard.image as string | undefined,
    domain: serverCard.domain as string | undefined,
    favicon: serverCard.favicon as string | undefined,
    tags: addConflictTag(serverTags),
    collections: serverCard.collections as string[] || [],
    pinned: serverCard.pinned as boolean || false,
    status: serverCard.status as string || 'READY',
    version: serverVersion,
    conflictWithId: conflictCopyId, // Link to the conflict copy
    _synced: true, // Server version is authoritative
    _lastModified: new Date(),
  });

  // Update Zustand store with both cards
  const dataStore = useDataStore.getState();
  const currentCards = dataStore.cards;

  // Update the original card in state
  const updatedCards = currentCards.map((c) => {
    if (c.id === localCardId) {
      return {
        ...c,
        title: serverCard.title as string,
        tags: addConflictTag(serverTags),
        conflictWithId: conflictCopyId,
        version: serverVersion,
        _synced: true,
      };
    }
    return c;
  });

  // Add the conflict copy
  updatedCards.push(conflictCopy);

  useDataStore.setState({ cards: updatedCards });

  // Queue the conflict copy for creation on server
  await addToQueue('card', conflictCopyId, 'create');

  log.info(`Created conflict copy ${conflictCopyId} for card ${localCardId}`);
}

/**
 * Resolve a conflict when one of the conflicting cards is deleted
 * Removes the conflict tag and link from the remaining card
 */
export async function resolveConflictOnDelete(deletedCardId: string): Promise<void> {
  // Get the deleted card to find its conflict partner
  const deletedCard = await db.cards.get(deletedCardId);
  if (!deletedCard?.conflictWithId) {
    return; // No conflict to resolve
  }

  const partnerId = deletedCard.conflictWithId;
  const partnerCard = await db.cards.get(partnerId);

  if (partnerCard) {
    // Remove conflict tag and link from the partner
    const updatedTags = removeConflictTag(partnerCard.tags || []);

    await db.cards.update(partnerId, {
      tags: updatedTags,
      conflictWithId: undefined,
      _lastModified: new Date(),
      _synced: false,
    });

    // Update Zustand store
    useDataStore.setState((state) => ({
      cards: state.cards.map((c) =>
        c.id === partnerId
          ? { ...c, tags: updatedTags, conflictWithId: undefined, _synced: false }
          : c
      ),
    }));

    // Queue the partner card update
    await addToQueue('card', partnerId, 'update', {
      tags: updatedTags,
      conflictWithId: null,
    });

    log.info(`Resolved conflict: removed conflict tag from card ${partnerId}`);
  }
}
