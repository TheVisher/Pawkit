/**
 * Dexie Database Schema
 * IndexedDB database for local-first data storage
 */

import Dexie, { type Table } from 'dexie';
import type {
  LocalWorkspace,
  LocalViewSettings,
  LocalCard,
  LocalCollection,
  LocalCollectionNote,
  LocalCalendarEvent,
  LocalTodo,
  SyncQueueItem,
  MetadataEntry,
  NoteLink,
  NoteCardLink,
  CachedImage,
} from './types';

// Re-export types for convenience
export type { LocalCard } from './types';

export class PawkitDB extends Dexie {
  // Core entities
  workspaces!: Table<LocalWorkspace>;
  viewSettings!: Table<LocalViewSettings>;

  // Content entities
  cards!: Table<LocalCard>;
  collections!: Table<LocalCollection>;
  collectionNotes!: Table<LocalCollectionNote>;

  // Organization entities
  calendarEvents!: Table<LocalCalendarEvent>;
  todos!: Table<LocalTodo>;

  // Sync & utility
  syncQueue!: Table<SyncQueueItem>;
  metadata!: Table<MetadataEntry>;

  // Wiki-links
  noteLinks!: Table<NoteLink>;
  noteCardLinks!: Table<NoteCardLink>;

  // Image cache
  imageCache!: Table<CachedImage>;

  constructor() {
    super('pawkit');

    this.version(1).stores({
      // Core entities
      // Indexes: primary key, then commonly queried fields
      workspaces: 'id, userId, [userId+isDefault]',
      viewSettings: 'id, workspaceId, [workspaceId+viewKey]',

      // Content entities
      cards: [
        'id',
        'workspaceId',
        '[workspaceId+_deleted]',
        '[workspaceId+type]',
        '[workspaceId+status]',
        '[workspaceId+pinned]',
        '[workspaceId+scheduledDate]',
        '[workspaceId+isRead]',
        '[workspaceId+isDailyNote]',
        '[workspaceId+linkStatus]',
        'updatedAt',
        '_synced',
        '_lastModified',
      ].join(', '),

      collections: [
        'id',
        'workspaceId',
        '[workspaceId+slug]',
        '[workspaceId+_deleted]',
        '[workspaceId+parentId]',
        '[workspaceId+isPrivate]',
        'position',
      ].join(', '),

      collectionNotes: [
        'id',
        'collectionId',
        'cardId',
        '[collectionId+cardId]',
        '[collectionId+position]',
      ].join(', '),

      // Organization entities
      calendarEvents: [
        'id',
        'workspaceId',
        '[workspaceId+date]',
        '[workspaceId+_deleted]',
        'recurrenceParentId',
      ].join(', '),

      todos: [
        'id',
        'workspaceId',
        '[workspaceId+completed]',
        '[workspaceId+dueDate]',
        '[workspaceId+_deleted]',
      ].join(', '),

      // Sync queue - auto-increment primary key
      syncQueue: '++id, entityType, entityId, operation, createdAt',

      // Key-value metadata store
      metadata: 'key',

      // Wiki-links for note interconnections
      noteLinks: 'id, sourceNoteId, targetNoteId, [sourceNoteId+targetNoteId]',
      noteCardLinks: 'id, sourceNoteId, targetCardId',

      // Image cache with LRU support
      imageCache: 'id, cachedAt, lastAccessedAt, size',
    });
  }
}

// Singleton database instance (lazy initialization for SSR compatibility)
let _db: PawkitDB | null = null;

function getDB(): PawkitDB {
  if (typeof window === 'undefined') {
    throw new Error('Dexie can only be used in the browser');
  }
  if (!_db) {
    _db = new PawkitDB();
  }
  return _db;
}

// Export a proxy that lazily initializes the database
export const db = new Proxy({} as PawkitDB, {
  get(_target, prop) {
    return getDB()[prop as keyof PawkitDB];
  },
});

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Create sync metadata for a new entity
 */
export function createSyncMetadata(isLocalOnly = false) {
  return {
    _synced: false,
    _lastModified: new Date(),
    _deleted: false,
    _localOnly: isLocalOnly,
  };
}

/**
 * Mark an entity as modified (needs sync)
 */
export function markModified<T extends { _synced: boolean; _lastModified: Date }>(
  entity: T
): T {
  return {
    ...entity,
    _synced: false,
    _lastModified: new Date(),
  };
}

/**
 * Mark an entity as synced
 */
export function markSynced<T extends { _synced: boolean; _serverVersion?: string }>(
  entity: T,
  serverVersion: string
): T {
  return {
    ...entity,
    _synced: true,
    _serverVersion: serverVersion,
    _localOnly: false,
  };
}

/**
 * Soft delete an entity (mark for sync deletion)
 */
export function markDeleted<T extends { _deleted: boolean; _synced: boolean; _lastModified: Date }>(
  entity: T
): T {
  return {
    ...entity,
    _deleted: true,
    _synced: false,
    _lastModified: new Date(),
  };
}

// =============================================================================
// WORKSPACE-SCOPED QUERIES
// =============================================================================

/**
 * Get all non-deleted cards for a workspace
 */
export async function getCardsForWorkspace(workspaceId: string) {
  return db.cards
    .where('workspaceId')
    .equals(workspaceId)
    .filter(card => !card._deleted)
    .toArray();
}

/**
 * Get all non-deleted collections for a workspace
 */
export async function getCollectionsForWorkspace(workspaceId: string) {
  return db.collections
    .where('workspaceId')
    .equals(workspaceId)
    .filter(collection => !collection._deleted)
    .sortBy('position');
}

/**
 * Get cards by type for a workspace
 */
export async function getCardsByType(workspaceId: string, type: string) {
  return db.cards
    .where('workspaceId')
    .equals(workspaceId)
    .filter(card => card.type === type && !card._deleted)
    .toArray();
}

/**
 * Get pending sync items
 */
export async function getPendingSyncItems() {
  return db.syncQueue.orderBy('createdAt').toArray();
}

/**
 * Get items that need syncing
 */
export async function getUnsyncedItems(workspaceId: string) {
  const [cards, collections, events, todos] = await Promise.all([
    db.cards.where('workspaceId').equals(workspaceId).filter(c => !c._synced).toArray(),
    db.collections.where('workspaceId').equals(workspaceId).filter(c => !c._synced).toArray(),
    db.calendarEvents.where('workspaceId').equals(workspaceId).filter(e => !e._synced).toArray(),
    db.todos.where('workspaceId').equals(workspaceId).filter(t => !t._synced).toArray(),
  ]);

  return { cards, collections, events, todos };
}

// =============================================================================
// DAILY NOTE HELPERS
// =============================================================================

/**
 * Get the daily note for a specific date
 * Returns null if no daily note exists for that date
 */
export async function getDailyNote(workspaceId: string, date: Date) {
  // Normalize date to YYYY-MM-DD for comparison
  const dateStr = date.toISOString().split('T')[0];

  const notes = await db.cards
    .where('workspaceId')
    .equals(workspaceId)
    .filter(card =>
      card.isDailyNote === true &&
      !card._deleted &&
      card.scheduledDate?.toISOString().split('T')[0] === dateStr
    )
    .toArray();

  return notes[0] || null;
}

/**
 * Get or create a daily note for a specific date
 */
export async function getOrCreateDailyNote(
  workspaceId: string,
  date: Date,
  createFn: (date: Date) => Promise<LocalCard>
): Promise<LocalCard> {
  const existing = await getDailyNote(workspaceId, date);
  if (existing) return existing;

  return createFn(date);
}

/**
 * Get all daily notes for a workspace
 */
export async function getAllDailyNotes(workspaceId: string) {
  return db.cards
    .where('workspaceId')
    .equals(workspaceId)
    .filter(card => card.isDailyNote === true && !card._deleted)
    .sortBy('scheduledDate');
}

// =============================================================================
// READING STATUS HELPERS
// =============================================================================

/**
 * Get unread cards for a workspace
 */
export async function getUnreadCards(workspaceId: string) {
  return db.cards
    .where('workspaceId')
    .equals(workspaceId)
    .filter(card =>
      !card._deleted &&
      card.type === 'url' &&
      (card.isRead === false || card.isRead === undefined)
    )
    .toArray();
}

/**
 * Get cards in progress (partially read)
 */
export async function getInProgressCards(workspaceId: string) {
  return db.cards
    .where('workspaceId')
    .equals(workspaceId)
    .filter(card =>
      !card._deleted &&
      card.type === 'url' &&
      card.readProgress !== undefined &&
      card.readProgress > 0 &&
      card.readProgress < 100
    )
    .toArray();
}

/**
 * Calculate reading time from word count
 * Uses 225 WPM (average adult reading speed)
 */
export function calculateReadingTime(wordCount: number): number {
  return Math.max(1, Math.ceil(wordCount / 225));
}

// =============================================================================
// LINK HEALTH HELPERS
// =============================================================================

/**
 * Get cards with broken links
 */
export async function getBrokenLinkCards(workspaceId: string) {
  return db.cards
    .where('workspaceId')
    .equals(workspaceId)
    .filter(card =>
      !card._deleted &&
      card.type === 'url' &&
      card.linkStatus === 'broken'
    )
    .toArray();
}

/**
 * Get cards that haven't been checked recently
 */
export async function getCardsNeedingLinkCheck(workspaceId: string, maxAgeDays = 7) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - maxAgeDays);

  return db.cards
    .where('workspaceId')
    .equals(workspaceId)
    .filter(card => {
      if (card._deleted || card.type !== 'url') return false;
      if (card.linkStatus === 'unchecked' || card.linkStatus === undefined) return true;
      if (card.lastLinkCheck && new Date(card.lastLinkCheck) < cutoffDate) return true;
      return false;
    })
    .toArray();
}
