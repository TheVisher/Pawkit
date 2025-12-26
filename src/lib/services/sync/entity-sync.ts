/**
 * Entity Sync Operations
 * Logic for pulling and upserting entities from server
 */

import { db } from '@/lib/db';
import type {
  LocalWorkspace,
  LocalCollection,
  LocalCard,
  LocalCalendarEvent,
  LocalTodo,
} from '@/lib/db';
import { createModuleLogger } from '@/lib/utils/logger';
import { type EntityName, ENTITY_ENDPOINTS, ENTITY_TYPE_MAP } from './types';

const log = createModuleLogger('EntitySync');

// =============================================================================
// ENTITY PULLING
// =============================================================================

/**
 * Pull an entity type from server
 */
export async function pullEntity(
  entity: EntityName,
  workspaceId: string,
  since: Date | null
): Promise<void> {
  // Build URL with query params
  const url = new URL(ENTITY_ENDPOINTS[entity], window.location.origin);

  // Workspaces endpoint doesn't need workspaceId (fetches by auth user)
  if (entity !== 'workspaces') {
    url.searchParams.set('workspaceId', workspaceId);
    url.searchParams.set('deleted', 'true'); // Include deleted for cleanup
  }

  if (since) {
    url.searchParams.set('since', since.toISOString());
  }

  log.debug(`Pulling ${entity}...`);

  const response = await fetch(url.toString(), {
    credentials: 'include',
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Not authenticated');
    }
    throw new Error(`Failed to fetch ${entity}: ${response.status}`);
  }

  const data = await response.json();
  const items = data[entity] || [];

  log.debug(`Received ${items.length} ${entity}`);

  // Upsert items to local database
  await upsertItems(entity, items);
}

// =============================================================================
// ENTITY UPSERTING
// =============================================================================

/**
 * Upsert items to local database with conflict resolution
 */
export async function upsertItems(
  entity: EntityName,
  items: unknown[]
): Promise<void> {
  if (items.length === 0) return;

  // Get IDs of items with pending local changes (don't overwrite)
  const pendingIds = await getPendingEntityIds(entity);

  // Filter and convert items
  const itemsToUpsert: Array<Record<string, unknown>> = [];

  for (const item of items) {
    const serverItem = item as { id: string; deleted?: boolean };

    // Skip if we have pending local changes (LWW - local wins if pending)
    if (pendingIds.has(serverItem.id)) {
      log.debug(`Skipping ${entity}/${serverItem.id} (pending local changes)`);
      continue;
    }

    // Convert server item to local format
    const localItem = serverToLocal(serverItem);

    // Handle soft delete
    if (serverItem.deleted) {
      localItem._deleted = true;
    }

    itemsToUpsert.push(localItem);
  }

  if (itemsToUpsert.length === 0) return;

  // Upsert by entity type (typed correctly for each table)
  switch (entity) {
    case 'workspaces':
      await db.workspaces.bulkPut(itemsToUpsert as unknown as LocalWorkspace[]);
      break;
    case 'collections':
      await db.collections.bulkPut(itemsToUpsert as unknown as LocalCollection[]);
      break;
    case 'cards':
      await db.cards.bulkPut(itemsToUpsert as unknown as LocalCard[]);
      break;
    case 'events':
      await db.calendarEvents.bulkPut(itemsToUpsert as unknown as LocalCalendarEvent[]);
      break;
    case 'todos':
      await db.todos.bulkPut(itemsToUpsert as unknown as LocalTodo[]);
      break;
  }
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get IDs of entities with pending queue items
 */
async function getPendingEntityIds(entity: EntityName): Promise<Set<string>> {
  const queueItems = await db.syncQueue
    .where('entityType')
    .equals(ENTITY_TYPE_MAP[entity])
    .toArray();

  return new Set(queueItems.map((item) => item.entityId));
}

/**
 * Convert server item to local format
 */
function serverToLocal(serverItem: Record<string, unknown>): Record<string, unknown> {
  const localItem: Record<string, unknown> = {
    ...serverItem,
    _synced: true,
    _lastModified: new Date(serverItem.updatedAt as string),
    _deleted: false,
    _serverVersion: serverItem.updatedAt as string,
  };

  // Convert date strings to Date objects
  const dateFields = ['createdAt', 'updatedAt', 'deletedAt', 'completedAt', 'scheduledDate', 'dueDate'];
  for (const field of dateFields) {
    if (localItem[field] && typeof localItem[field] === 'string') {
      localItem[field] = new Date(localItem[field] as string);
    }
  }

  return localItem;
}
