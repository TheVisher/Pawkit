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
import { useSyncStore } from '@/lib/stores/sync-store';
import { useToastStore } from '@/lib/stores/toast-store';
import { processQueue, QUEUE_DEBOUNCE_MS } from '../sync-queue';
import { createModuleLogger } from '@/lib/utils/logger';
import { pullEntity } from './entity-sync';
import {
  type BroadcastMessage,
  SYNC_CHANNEL_NAME,
  METADATA_LAST_SYNC_KEY,
  ENTITY_ORDER,
} from './types';

const log = createModuleLogger('SyncService');

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
        await pullEntity(entity, this.workspaceId, null);
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
   * NOTE: This now uses push-only to preserve local-first architecture
   * Full pull only happens on fullSync() - initial load or manual refresh
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

    // If no last sync, do full sync (initial load)
    if (!lastSync) {
      log.info('No last sync time, performing full sync');
      return this.fullSync();
    }

    // LOCAL-FIRST: After initial sync, only push changes (never pull)
    // This prevents server from overwriting local-only data like daily notes
    log.info('Starting push-only sync (local-first mode)');
    return this.pushOnlySync();
  }

  /**
   * Push-only sync - pushes local changes to server WITHOUT pulling
   * Use this for ongoing syncs AFTER initial load
   * This is the LOCAL-FIRST approach: Zustand/Dexie is source of truth
   */
  async pushOnlySync(): Promise<void> {
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

    log.info('Starting push-only sync');
    this.isSyncing = true;
    useSyncStore.getState().startSync();

    try {
      // ONLY process outgoing queue - NO pull from server
      await processQueue();

      // Update last sync time
      await this.setLastSyncTime(new Date());

      // Notify other tabs
      this.broadcast({ type: 'sync-complete' });

      useSyncStore.getState().finishSync(true);
      log.info('Push-only sync complete');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      log.error('Push-only sync failed:', message);
      useSyncStore.getState().finishSync(false, message);
    } finally {
      this.isSyncing = false;
    }
  }

  // ===========================================================================
  // QUEUE PROCESSING
  // ===========================================================================

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
  private broadcast(message: BroadcastMessage): void {
    if (this.broadcastChannel) {
      this.broadcastChannel.postMessage(message);
    }
  }

  /**
   * Handle messages from other tabs
   */
  private handleBroadcastMessage(event: MessageEvent): void {
    const { type } = event.data as BroadcastMessage;

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
// SINGLETON INSTANCE
// =============================================================================

export const syncService = SyncService.getInstance();
