/**
 * Sync Queue Processor
 * Processes pending sync queue items and sends them to the server
 */

import { db } from '@/lib/db';
import type { SyncQueueItem } from '@/lib/db';
import { useSyncStore } from '@/lib/stores/sync-store';

// Maximum retry attempts before marking as failed
const MAX_RETRIES = 3;

// Debounce delay for queue processing (ms)
export const QUEUE_DEBOUNCE_MS = 2000;

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
    console.log('[SyncQueue] Offline, skipping queue processing');
    return result;
  }

  // Get all pending items ordered by creation time
  const items = await db.syncQueue.orderBy('createdAt').toArray();

  if (items.length === 0) {
    return result;
  }

  console.log(`[SyncQueue] Processing ${items.length} items`);

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
      console.error(`[SyncQueue] Failed to process item ${item.id}:`, errorMessage);

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
      } else {
        // Update retry count for later retry
        await db.syncQueue.update(item.id!, {
          retryCount: newRetryCount,
          lastError: errorMessage,
        });
      }
    }
  }

  // Final pending count update
  const remainingCount = await db.syncQueue.count();
  useSyncStore.getState().setPendingCount(remainingCount);

  console.log(`[SyncQueue] Completed: ${result.processed} processed, ${result.failed} failed`);

  return result;
}

/**
 * Process a single queue item
 * Throws on failure for retry handling
 */
async function processQueueItem(item: SyncQueueItem): Promise<void> {
  const { entityType, entityId, operation, payload } = item;

  // Get API endpoint
  const { url, method } = getApiEndpoint(entityType, operation, entityId);

  console.log(`[SyncQueue] ${method} ${url} (${entityType}/${operation})`);

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
    body = JSON.stringify(payload);
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

    // Handle 404 for update/delete - entity doesn't exist on server
    if (response.status === 404 && (operation === 'update' || operation === 'delete')) {
      // Entity doesn't exist on server, remove from queue
      await db.syncQueue.delete(item.id!);
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
 * Mark an entity as synced in local database
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
      break;
    case 'card':
      await db.cards.update(entityId, updates);
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

  // Update pending count
  const count = await db.syncQueue.count();
  useSyncStore.getState().setPendingCount(count);
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

  const count = await db.syncQueue.count();
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
}
