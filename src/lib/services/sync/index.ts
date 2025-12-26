/**
 * Sync Module
 * Re-exports all sync-related functionality
 */

export { syncService } from './sync-service';

// Re-export types for external use
export type {
  EntityName,
  ServerWorkspace,
  ServerCollection,
  ServerCard,
  ServerEvent,
  ServerTodo,
  BroadcastMessage,
} from './types';

export {
  ENTITY_ORDER,
  SYNC_CHANNEL_NAME,
  METADATA_LAST_SYNC_KEY,
} from './types';

// Convenience functions
import { syncService } from './sync-service';

export const fullSync = () => syncService.fullSync();
export const deltaSync = () => syncService.deltaSync();
export const scheduleQueueProcess = () => syncService.scheduleQueueProcess();
export const processQueueNow = () => syncService.processQueueNow();
export const clearLocalData = () => syncService.clearLocalData();
export const setWorkspace = (id: string | null) => syncService.setWorkspace(id);
export const getLastSyncTime = () => syncService.getLastSyncTime();
