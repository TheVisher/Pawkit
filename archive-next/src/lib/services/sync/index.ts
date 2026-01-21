/**
 * Sync Module
 * Re-exports all sync-related functionality
 */

// Extend Window interface to include debug helpers
declare global {
  interface Window {
    __pawkitSync?: {
      clearQueue: () => Promise<void>;
      fullSync: () => Promise<void>;
      processQueueNow: () => Promise<void>;
      repairUnsyncedReferences: () => Promise<number>;
    };
  }
}

export { syncService } from './sync-service';

// Re-export types for external use
export type {
  EntityName,
  ServerWorkspace,
  ServerCollection,
  ServerCard,
  ServerEvent,
  BroadcastMessage,
} from './types';

export {
  ENTITY_ORDER,
  SYNC_CHANNEL_NAME,
  METADATA_LAST_SYNC_KEY,
} from './types';

// Convenience functions
import { syncService } from './sync-service';
import { clearAllSyncQueue, addToQueue, triggerSync } from '../sync-queue';
import { db } from '@/lib/db';

export const fullSync = () => syncService.fullSync();
export const deltaSync = () => syncService.deltaSync();
export const pushOnlySync = () => syncService.pushOnlySync();
export const scheduleQueueProcess = () => syncService.scheduleQueueProcess();
export const processQueueNow = () => syncService.processQueueNow();
export const clearLocalData = () => syncService.clearLocalData();
export const setWorkspace = (id: string | null) => syncService.setWorkspace(id);
export const getLastSyncTime = () => syncService.getLastSyncTime();
export { clearAllSyncQueue };

/**
 * Repair function: Re-queue all unsynced references
 * Use this to fix references that failed to sync due to missing case statement
 */
export async function repairUnsyncedReferences(): Promise<number> {
  const unsyncedRefs = await db.references
    .filter((ref) => !ref._synced && !ref._deleted)
    .toArray();

  console.log(`[Sync Repair] Found ${unsyncedRefs.length} unsynced references`);

  for (const ref of unsyncedRefs) {
    await addToQueue('reference', ref.id, 'create');
  }

  if (unsyncedRefs.length > 0) {
    await triggerSync();
  }

  return unsyncedRefs.length;
}

// Expose debug helpers on window for console access
if (typeof window !== 'undefined') {
  window.__pawkitSync = {
    clearQueue: clearAllSyncQueue,
    fullSync,
    processQueueNow,
    repairUnsyncedReferences,
  };
}
