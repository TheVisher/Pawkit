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
  LocalReference,
  SyncMetadata,
} from '@/lib/db';
import { createModuleLogger } from '@/lib/utils/logger';
import { cleanCorruptedTags } from '@/lib/utils/tag-normalizer';
import {
  type EntityName,
  type ServerWorkspace,
  type ServerCollection,
  type ServerCard,
  type ServerEvent,
  type ServerReference,
  ENTITY_ENDPOINTS,
  ENTITY_TYPE_MAP,
} from './types';

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
 * Base sync metadata added to all server items when converting to local format
 */
function createSyncMetadataFromServer(serverUpdatedAt: string, deleted?: boolean): SyncMetadata {
  return {
    _synced: true,
    _lastModified: new Date(serverUpdatedAt),
    _deleted: deleted ?? false,
    _serverVersion: serverUpdatedAt,
  };
}

/**
 * Convert server workspace to local format
 */
function serverWorkspaceToLocal(server: ServerWorkspace & { deleted?: boolean }): LocalWorkspace {
  return {
    id: server.id,
    name: server.name,
    icon: server.icon,
    userId: server.userId,
    isDefault: server.isDefault,
    preferences: server.preferences,
    createdAt: new Date(server.createdAt),
    updatedAt: new Date(server.updatedAt),
    ...createSyncMetadataFromServer(server.updatedAt, server.deleted),
  };
}

/**
 * Convert server collection to local format
 */
function serverCollectionToLocal(server: ServerCollection): LocalCollection {
  return {
    id: server.id,
    workspaceId: server.workspaceId,
    name: server.name,
    slug: server.slug,
    parentId: server.parentId,
    position: server.position,
    coverImage: server.coverImage,
    icon: server.icon,
    isPrivate: server.isPrivate,
    isSystem: server.isSystem,
    hidePreview: server.hidePreview,
    useCoverAsBackground: false, // Default, not in server type
    pinned: server.pinned,
    createdAt: new Date(server.createdAt),
    updatedAt: new Date(server.updatedAt),
    ...createSyncMetadataFromServer(server.updatedAt, server.deleted),
  };
}

/**
 * Convert server card to local format
 */
function serverCardToLocal(server: ServerCard): LocalCard {
  // Clean any corrupted tags (e.g., "pkms-1768120212610" -> "pkms")
  // This fixes a bug where the extension used collection ID as fallback when slug was missing
  const tags = server.tags ? cleanCorruptedTags(server.tags) : [];

  return {
    id: server.id,
    workspaceId: server.workspaceId,
    type: server.type,
    url: server.url,
    title: server.title,
    description: server.description,
    content: server.content,
    domain: server.domain,
    image: server.image,
    favicon: server.favicon,
    status: server.status,
    tags,
    // collections field removed - Pawkit membership now uses tags
    pinned: server.pinned,
    scheduledDate: server.scheduledDate ? new Date(server.scheduledDate) : undefined,
    isFileCard: false, // Default, not in server type
    version: server.version || 1, // Use server version for conflict detection
    createdAt: new Date(server.createdAt),
    updatedAt: new Date(server.updatedAt),
    ...createSyncMetadataFromServer(server.updatedAt, server.deleted),
  };
}

/**
 * Convert server event to local format
 */
function serverEventToLocal(server: ServerEvent): LocalCalendarEvent {
  return {
    id: server.id,
    workspaceId: server.workspaceId,
    title: server.title,
    date: server.date,
    endDate: server.endDate,
    startTime: server.startTime,
    endTime: server.endTime,
    isAllDay: server.isAllDay,
    description: server.description,
    location: server.location,
    url: server.url,
    color: server.color,
    recurrence: server.recurrence as LocalCalendarEvent['recurrence'],
    recurrenceParentId: server.recurrenceParentId,
    excludedDates: server.excludedDates,
    isException: server.isException,
    createdAt: new Date(server.createdAt),
    updatedAt: new Date(server.updatedAt),
    ...createSyncMetadataFromServer(server.updatedAt, server.deleted),
  };
}

/**
 * Convert server reference to local format
 */
function serverReferenceToLocal(server: ServerReference): LocalReference {
  return {
    id: server.id,
    workspaceId: server.workspaceId,
    sourceId: server.sourceId,
    targetId: server.targetId,
    targetType: server.targetType,
    linkText: server.linkText,
    createdAt: new Date(server.createdAt),
    updatedAt: new Date(server.updatedAt),
    ...createSyncMetadataFromServer(server.updatedAt, server.deleted),
  };
}

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

  // Filter items that don't have pending local changes
  const filteredItems = items.filter((item) => {
    const serverItem = item as { id: string };
    if (pendingIds.has(serverItem.id)) {
      log.debug(`Skipping ${entity}/${serverItem.id} (pending local changes)`);
      return false;
    }
    return true;
  });

  if (filteredItems.length === 0) return;

  // Convert and upsert by entity type with proper typing
  switch (entity) {
    case 'workspaces': {
      const localItems = (filteredItems as (ServerWorkspace & { deleted?: boolean })[])
        .map(serverWorkspaceToLocal);
      await db.workspaces.bulkPut(localItems);
      break;
    }
    case 'collections': {
      const localItems = (filteredItems as ServerCollection[]).map(serverCollectionToLocal);
      // Preserve local-only fields that shouldn't be overwritten by server data
      const ids = localItems.map((item) => item.id);
      const existingCollections = await db.collections.bulkGet(ids);
      const existingMap = new Map(
        existingCollections
          .filter((c): c is LocalCollection => c !== undefined)
          .map((c) => [c.id, c])
      );
      const mergedItems = localItems.map((item) => {
        const existing = existingMap.get(item.id);
        if (existing) {
          // Preserve local-only fields from existing record
          return {
            ...item,
            isLocalOnly: existing.isLocalOnly,
            useCoverAsBackground: existing.useCoverAsBackground,
          };
        }
        return item;
      });
      await db.collections.bulkPut(mergedItems);
      break;
    }
    case 'cards': {
      const localItems = (filteredItems as ServerCard[]).map(serverCardToLocal);

      // Get existing local cards to check for local-only status
      const ids = localItems.map((item) => item.id);
      const existingCards = await db.cards.bulkGet(ids);
      const existingMap = new Map(
        existingCards
          .filter((c): c is LocalCard => c !== undefined)
          .map((c) => [c.id, c])
      );

      // Filter out cards that shouldn't be overwritten with server data:
      // 1. Cards with #local-only tag (never sync these)
      // 2. Cards with pending local changes (_synced === false) - don't overwrite unsynced edits
      // 3. Cards where local data is newer than server data (prevents race condition where stale poll overwrites recent push)
      const SYSTEM_LOCAL_ONLY_TAG = '#local-only';
      const cardsToUpsert = localItems.filter((serverCard) => {
        const existingCard = existingMap.get(serverCard.id);
        if (existingCard?.tags?.includes(SYSTEM_LOCAL_ONLY_TAG)) {
          log.debug(`Skipping card/${serverCard.id} (local-only card - preserving local data)`);
          return false;
        }
        // Don't overwrite local cards that have pending changes (notes, content, etc.)
        if (existingCard && existingCard._synced === false) {
          log.debug(`Skipping card/${serverCard.id} (has pending local changes - will sync later)`);
          return false;
        }
        // Don't overwrite if local data is newer than server data
        // This prevents race condition: poll fetches stale data before push completes
        if (existingCard?._lastModified && serverCard._lastModified) {
          const localTime = existingCard._lastModified.getTime();
          const serverTime = serverCard._lastModified.getTime();
          if (localTime > serverTime) {
            log.debug(`Skipping card/${serverCard.id} (local data is newer: ${new Date(localTime).toISOString()} > ${new Date(serverTime).toISOString()})`);
            return false;
          }
        }
        return true;
      });

      if (cardsToUpsert.length > 0) {
        await db.cards.bulkPut(cardsToUpsert);
      }
      break;
    }
    case 'events': {
      const localItems = (filteredItems as ServerEvent[]).map(serverEventToLocal);
      await db.calendarEvents.bulkPut(localItems);
      break;
    }
    case 'references': {
      const localItems = (filteredItems as ServerReference[]).map(serverReferenceToLocal);
      await db.references.bulkPut(localItems);
      break;
    }
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
