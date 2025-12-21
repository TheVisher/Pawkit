/**
 * Sync Service
 * Main singleton class for coordinating sync operations
 *
 * Responsibilities:
 * - Initial (full) sync for new devices
 * - Delta sync for returning users
 * - Queue processing coordination
 * - Cross-tab synchronization via BroadcastChannel
 * - Conflict resolution (Last-Write-Wins)
 */

import { db } from '@/lib/db';
import type {
  LocalWorkspace,
  LocalCollection,
  LocalCard,
  LocalCalendarEvent,
  LocalTodo,
} from '@/lib/db';
import { useSyncStore } from '@/lib/stores/sync-store';
import { useToastStore } from '@/lib/stores/toast-store';
import { processQueue, QUEUE_DEBOUNCE_MS } from './sync-queue';
import { createModuleLogger } from '@/lib/utils/logger';

const log = createModuleLogger('SyncService');

// =============================================================================
// CONSTANTS
// =============================================================================

const SYNC_CHANNEL_NAME = 'pawkit-sync';
const METADATA_LAST_SYNC_KEY = 'lastSyncTime';

// Entity sync order (critical for foreign key dependencies)
const ENTITY_ORDER = ['workspaces', 'collections', 'cards', 'events', 'todos'] as const;
type EntityName = (typeof ENTITY_ORDER)[number];

// =============================================================================
// TYPES
// =============================================================================

interface ServerWorkspace {
  id: string;
  name: string;
  icon?: string;
  userId: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ServerCollection {
  id: string;
  workspaceId: string;
  name: string;
  slug: string;
  parentId?: string;
  position: number;
  coverImage?: string;
  icon?: string;
  isPrivate: boolean;
  isSystem: boolean;
  hidePreview: boolean;
  pinned: boolean;
  deleted: boolean;
  deletedAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface ServerCard {
  id: string;
  workspaceId: string;
  type: string;
  url: string;
  title?: string;
  description?: string;
  content?: string;
  domain?: string;
  image?: string;
  favicon?: string;
  status: string;
  tags: string[];
  collections: string[];
  pinned: boolean;
  scheduledDate?: string;
  deleted: boolean;
  deletedAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface ServerEvent {
  id: string;
  workspaceId: string;
  title: string;
  date: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  isAllDay: boolean;
  description?: string;
  location?: string;
  url?: string;
  color?: string;
  recurrence?: Record<string, unknown>;
  recurrenceParentId?: string;
  excludedDates: string[];
  isException: boolean;
  deleted: boolean;
  deletedAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface ServerTodo {
  id: string;
  workspaceId: string;
  text: string;
  completed: boolean;
  completedAt?: string;
  dueDate?: string;
  priority?: 'high' | 'medium' | 'low';
  linkedCardId?: string;
  deleted: boolean;
  deletedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// =============================================================================
// SYNC SERVICE CLASS
// =============================================================================

class SyncService {
  private static instance: SyncService | null = null;
  private broadcastChannel: BroadcastChannel | null = null;
  private queueDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  private isSyncing = false;
  private workspaceId: string | null = null;

  private constructor() {
    // Initialize broadcast channel for cross-tab sync
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      this.broadcastChannel = new BroadcastChannel(SYNC_CHANNEL_NAME);
      this.broadcastChannel.onmessage = this.handleBroadcastMessage.bind(this);
    }
  }

  /**
   * Get singleton instance
   */
  static getInstance(): SyncService {
    if (!SyncService.instance) {
      SyncService.instance = new SyncService();
    }
    return SyncService.instance;
  }

  /**
   * Set the active workspace for sync operations
   */
  setWorkspace(workspaceId: string | null): void {
    this.workspaceId = workspaceId;
  }

  /**
   * Get the current workspace ID
   */
  getWorkspaceId(): string | null {
    return this.workspaceId;
  }

  // ===========================================================================
  // MAIN SYNC METHODS
  // ===========================================================================

  /**
   * Perform a full sync (initial sync or manual refresh)
   */
  async fullSync(): Promise<void> {
    if (!this.workspaceId) {
      log.warn('No workspace ID set, skipping sync');
      return;
    }

    if (this.isSyncing) {
      log.debug('Sync already in progress, skipping');
      return;
    }

    if (!navigator.onLine) {
      useSyncStore.getState().goOffline();
      return;
    }

    log.info('Starting full sync');
    this.isSyncing = true;
    useSyncStore.getState().startSync();

    try {
      // 1. Process outgoing queue first (push local changes)
      await processQueue();

      // 2. Pull server data in dependency order
      for (const entity of ENTITY_ORDER) {
        await this.pullEntity(entity, null);
      }

      // 3. Update last sync time
      await this.setLastSyncTime(new Date());

      // 4. Notify other tabs
      this.broadcast({ type: 'sync-complete' });

      useSyncStore.getState().finishSync(true);
      useToastStore.getState().toast({ type: 'success', message: 'Sync complete' });
      log.info('Full sync complete');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      log.error('Full sync failed:', message);
      useSyncStore.getState().finishSync(false, message);
      useToastStore.getState().toast({ type: 'error', message: `Sync failed: ${message}` });
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Perform a delta sync (only changes since last sync)
   */
  async deltaSync(): Promise<void> {
    if (!this.workspaceId) {
      log.warn('No workspace ID set, skipping sync');
      return;
    }

    if (this.isSyncing) {
      log.debug('Sync already in progress, skipping');
      return;
    }

    if (!navigator.onLine) {
      useSyncStore.getState().goOffline();
      return;
    }

    const lastSync = await this.getLastSyncTime();

    // If no last sync, do full sync
    if (!lastSync) {
      log.info('No last sync time, performing full sync');
      return this.fullSync();
    }

    log.info('Starting delta sync since', lastSync.toISOString());
    this.isSyncing = true;
    useSyncStore.getState().startSync();

    try {
      // 1. Process outgoing queue first
      await processQueue();

      // 2. Pull changes since last sync (include deleted for cleanup)
      for (const entity of ENTITY_ORDER) {
        await this.pullEntity(entity, lastSync);
      }

      // 3. Update last sync time
      await this.setLastSyncTime(new Date());

      // 4. Notify other tabs
      this.broadcast({ type: 'sync-complete' });

      useSyncStore.getState().finishSync(true);
      useToastStore.getState().toast({ type: 'success', message: 'Sync complete' });
      log.info('Delta sync complete');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      log.error('Delta sync failed:', message);
      useSyncStore.getState().finishSync(false, message);
      useToastStore.getState().toast({ type: 'error', message: `Sync failed: ${message}` });
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Trigger queue processing with debounce
   * Called after local changes
   */
  scheduleQueueProcess(): void {
    if (this.queueDebounceTimer) {
      clearTimeout(this.queueDebounceTimer);
    }

    this.queueDebounceTimer = setTimeout(async () => {
      if (navigator.onLine && !this.isSyncing) {
        await processQueue();
      }
    }, QUEUE_DEBOUNCE_MS);
  }

  /**
   * Immediate queue processing (e.g., on online event)
   */
  async processQueueNow(): Promise<void> {
    if (this.queueDebounceTimer) {
      clearTimeout(this.queueDebounceTimer);
      this.queueDebounceTimer = null;
    }

    if (navigator.onLine && !this.isSyncing) {
      await processQueue();
    }
  }

  // ===========================================================================
  // ENTITY PULL METHODS
  // ===========================================================================

  /**
   * Pull an entity type from server
   */
  private async pullEntity(
    entity: EntityName,
    since: Date | null
  ): Promise<void> {
    if (!this.workspaceId) return;

    const endpoints: Record<EntityName, string> = {
      workspaces: '/api/workspaces',
      collections: '/api/collections',
      cards: '/api/cards',
      events: '/api/events',
      todos: '/api/todos',
    };

    // Build URL with query params
    const url = new URL(endpoints[entity], window.location.origin);

    // Workspaces endpoint doesn't need workspaceId (fetches by auth user)
    if (entity !== 'workspaces') {
      url.searchParams.set('workspaceId', this.workspaceId);
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
    await this.upsertItems(entity, items);
  }

  /**
   * Upsert items to local database with conflict resolution
   */
  private async upsertItems(
    entity: EntityName,
    items: unknown[]
  ): Promise<void> {
    if (items.length === 0) return;

    // Get IDs of items with pending local changes (don't overwrite)
    const pendingIds = await this.getPendingEntityIds(entity);

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
      const localItem = this.serverToLocal(entity, serverItem);

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

  /**
   * Get IDs of entities with pending queue items
   */
  private async getPendingEntityIds(entity: EntityName): Promise<Set<string>> {
    const entityTypeMap: Record<EntityName, string> = {
      workspaces: 'workspace',
      collections: 'collection',
      cards: 'card',
      events: 'event',
      todos: 'todo',
    };

    const queueItems = await db.syncQueue
      .where('entityType')
      .equals(entityTypeMap[entity])
      .toArray();

    return new Set(queueItems.map((item) => item.entityId));
  }

  /**
   * Convert server item to local format
   */
  private serverToLocal(entity: EntityName, serverItem: Record<string, unknown>): Record<string, unknown> {
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

  // ===========================================================================
  // METADATA METHODS
  // ===========================================================================

  /**
   * Get last sync time from metadata
   */
  async getLastSyncTime(): Promise<Date | null> {
    const entry = await db.metadata.get(METADATA_LAST_SYNC_KEY);
    if (entry?.value) {
      return new Date(entry.value as string);
    }
    return null;
  }

  /**
   * Set last sync time in metadata
   */
  private async setLastSyncTime(time: Date): Promise<void> {
    await db.metadata.put({
      key: METADATA_LAST_SYNC_KEY,
      value: time.toISOString(),
    });
    useSyncStore.getState().setLastSyncTime(time);
  }

  // ===========================================================================
  // CROSS-TAB COMMUNICATION
  // ===========================================================================

  /**
   * Broadcast a message to other tabs
   */
  private broadcast(message: { type: string; data?: unknown }): void {
    if (this.broadcastChannel) {
      this.broadcastChannel.postMessage(message);
    }
  }

  /**
   * Handle messages from other tabs
   */
  private handleBroadcastMessage(event: MessageEvent): void {
    const { type } = event.data;

    switch (type) {
      case 'sync-complete':
        // Another tab completed sync, refresh our data from IndexedDB
        log.debug('Another tab completed sync');
        // Stores will reactively update from Dexie changes
        break;

      case 'sync-start':
        // Another tab started syncing, don't duplicate
        this.isSyncing = true;
        break;

      case 'logout':
        // Another tab logged out, clear local data
        this.clearLocalData();
        break;
    }
  }

  // ===========================================================================
  // CLEANUP METHODS
  // ===========================================================================

  /**
   * Clear all local data (on logout)
   */
  async clearLocalData(): Promise<void> {
    log.info('Clearing local data');

    await db.transaction(
      'rw',
      [
        db.workspaces,
        db.collections,
        db.cards,
        db.calendarEvents,
        db.todos,
        db.syncQueue,
        db.metadata,
        db.viewSettings,
        db.collectionNotes,
        db.noteLinks,
        db.noteCardLinks,
      ],
      async () => {
        await db.workspaces.clear();
        await db.collections.clear();
        await db.cards.clear();
        await db.calendarEvents.clear();
        await db.todos.clear();
        await db.syncQueue.clear();
        await db.metadata.clear();
        await db.viewSettings.clear();
        await db.collectionNotes.clear();
        await db.noteLinks.clear();
        await db.noteCardLinks.clear();
      }
    );

    // Reset sync store
    useSyncStore.getState().setLastSyncTime(null);
    useSyncStore.getState().setPendingCount(0);
    useSyncStore.getState().setStatus('idle');

    // Notify other tabs
    this.broadcast({ type: 'logout' });
  }

  /**
   * Destroy the service (cleanup)
   */
  destroy(): void {
    if (this.queueDebounceTimer) {
      clearTimeout(this.queueDebounceTimer);
    }
    if (this.broadcastChannel) {
      this.broadcastChannel.close();
    }
    SyncService.instance = null;
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

export const syncService = SyncService.getInstance();

// Convenience functions
export const fullSync = () => syncService.fullSync();
export const deltaSync = () => syncService.deltaSync();
export const scheduleQueueProcess = () => syncService.scheduleQueueProcess();
export const processQueueNow = () => syncService.processQueueNow();
export const clearLocalData = () => syncService.clearLocalData();
export const setWorkspace = (id: string | null) => syncService.setWorkspace(id);
export const getLastSyncTime = () => syncService.getLastSyncTime();
