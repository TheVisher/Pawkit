/**
 * Dexie Database - Main Export
 *
 * Local-first IndexedDB storage for Pawkit
 *
 * Usage:
 *   import { db } from '@/lib/db';
 *   const cards = await db.cards.where('workspaceId').equals(workspaceId).toArray();
 */

// Database instance and class
export { db, PawkitDB } from './schema';

// Helper functions
export {
  createSyncMetadata,
  markModified,
  markSynced,
  markDeleted,
  markRestored,
  getCardsForWorkspace,
  getCollectionsForWorkspace,
  getCardsByType,
  getPendingSyncItems,
  getUnsyncedItems,
} from './schema';

// Types
export type {
  SyncMetadata,
  WorkspacePreferences,
  LocalWorkspace,
  LocalViewSettings,
  LocalCard,
  LocalCollection,
  LocalCollectionNote,
  LocalCalendarEvent,
  SyncQueueItem,
  MetadataEntry,
  NoteLink,
  NoteCardLink,
  LocalReference,
  CachedImage,
} from './types';

// Constants
export {
  IMAGE_CACHE_MAX_SIZE_MB,
  IMAGE_CACHE_MAX_AGE_DAYS,
} from './types';
