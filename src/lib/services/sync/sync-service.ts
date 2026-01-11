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

  /**
   * Get the last sync time from the store
   */
  getLastSyncTime(): Date | null {
    return useSyncStore.getState().lastSyncTime;
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

      // 3. Notify other tabs
      this.broadcast({ type: 'sync-complete' });

      useSyncStore.getState().finishSync(true);
      log.info('Initial sync complete');
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
   * Smart sync - checks if we need full sync or just push
   *
   * Simple logic:
   * - If local DB is empty → full sync (first load or cache cleared)
   * - If local DB has data → just push queue (Realtime handles incoming)
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

    // Check if we have local data (simple existence check)
    const cardCount = await db.cards.where('workspaceId').equals(this.workspaceId).count();

    if (cardCount === 0) {
      // No local data - need full sync (first time user or cleared cache)
      log.info('No local data, performing initial full sync');
      return this.fullSync();
    }

    // We have local data - Realtime handles incoming, just push any pending changes
    log.debug('Local data exists, processing queue only');
    return this.pushOnlySync();
  }

  /**
   * Push-only sync - pushes local changes to server WITHOUT pulling
   * Realtime handles incoming changes, this just pushes the queue
   */
  async pushOnlySync(): Promise<void> {
    if (!this.workspaceId || this.isSyncing || !navigator.onLine) {
      return;
    }

    this.isSyncing = true;

    try {
      // Just process the outgoing queue - Realtime handles incoming
      await processQueue();
      this.broadcast({ type: 'sync-complete' });
    } catch (error) {
      log.error('Push sync failed:', error instanceof Error ? error.message : 'Unknown error');
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
