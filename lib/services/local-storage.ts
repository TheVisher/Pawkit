import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { CardDTO } from '@/lib/server/cards';
import { CollectionNode, StoredFile } from '@/lib/types';
import { CalendarEvent } from '@/lib/types/calendar';

/**
 * LOCAL-FIRST STORAGE LAYER WITH WORKSPACE SUPPORT
 *
 * This is the PRIMARY source of truth for all user data.
 * The server is ONLY used for:
 * - Syncing between devices
 * - Backup/recovery
 *
 * User data is NEVER lost even if server is wiped.
 *
 * SECURITY: Each user has isolated IndexedDB databases per workspace.
 * Database naming: pawkit-${userId}-${workspaceId}-local-storage
 * Default workspace: "default" (until workspace UI is implemented)
 */

// Default workspace ID (used until workspace feature is built)
export const DEFAULT_WORKSPACE_ID = 'default';

// IndexedDB schema for local storage
interface LocalStorageDB extends DBSchema {
  cards: {
    key: string; // card.id
    value: CardDTO & {
      _locallyModified?: boolean; // Flag for unsaved changes
      _locallyCreated?: boolean;  // Flag for cards not yet on server
      _serverVersion?: string;     // Server's last known updatedAt
    };
    indexes: {
      'by-created': string;
      'by-updated': string;
      'by-collection': string;
      'by-deleted': string;
    };
  };
  collections: {
    key: string; // collection.id
    value: CollectionNode & {
      _locallyModified?: boolean;
      _locallyCreated?: boolean;
      _serverVersion?: string;
    };
    indexes: {
      'by-name': string;
      'by-deleted': string;
    };
  };
  metadata: {
    key: string; // metadata key
    value: {
      key: string;
      value: unknown;
      updatedAt: number;
    };
  };
  noteLinks: {
    key: string; // link.id
    value: {
      id: string;
      sourceNoteId: string;
      targetNoteId: string;
      linkText: string;
      createdAt: string;
    };
    indexes: {
      'by-source': string;
      'by-target': string;
    };
  };
  noteCardLinks: {
    key: string; // link.id
    value: {
      id: string;
      sourceNoteId: string;
      targetCardId: string;
      linkText: string;
      linkType: 'card' | 'url'; // 'card' for [[card:Title]], 'url' for [[URL]]
      createdAt: string;
    };
    indexes: {
      'by-source': string;
      'by-target': string;
    };
  };
  events: {
    key: string; // event.id
    value: CalendarEvent & {
      _locallyModified?: boolean;
      _locallyCreated?: boolean;
      _serverVersion?: string;
    };
    indexes: {
      'by-date': string;
      'by-deleted': string;
      'by-recurrence-parent': string;
    };
  };
  files: {
    key: string; // file.id
    value: StoredFile & {
      _locallyModified?: boolean;
      _locallyCreated?: boolean;
    };
    indexes: {
      'by-card': string;
      'by-deleted': string;
      'by-category': string;
    };
  };
  imageCache: {
    key: string; // URL or image ID (normalized)
    value: {
      id: string;           // Original URL or Supabase path (normalized)
      blob: Blob;           // The actual image data
      mimeType: string;     // e.g., 'image/jpeg'
      size: number;         // Bytes
      cachedAt: number;     // Timestamp when cached
      lastAccessedAt: number; // For LRU eviction if needed
    };
    indexes: {
      'by-cached-at': number;
      'by-last-accessed': number;
    };
  };
}

class LocalStorage {
  private db: IDBPDatabase<LocalStorageDB> | null = null;
  private userId: string | null = null;
  private workspaceId: string | null = null;
  private readonly DB_VERSION = 8; // Version 8: added 'imageCache' store for thumbnail caching

  /**
   * Get user-specific database name with workspace support
   */
  private getDbName(): string {
    if (!this.userId) {
      throw new Error('[LocalStorage] userId not initialized - cannot get database name');
    }
    if (!this.workspaceId) {
      throw new Error('[LocalStorage] workspaceId not initialized - cannot get database name');
    }
    return `pawkit-${this.userId}-${this.workspaceId}-local-storage`;
  }

  /**
   * Initialize database for specific user and workspace
   * @param userId - User's unique ID
   * @param workspaceId - Workspace ID (defaults to DEFAULT_WORKSPACE_ID)
   */
  async init(userId: string, workspaceId: string = DEFAULT_WORKSPACE_ID): Promise<void> {
    // Already initialized for this user and workspace
    if (this.db && this.userId === userId && this.workspaceId === workspaceId) {
      return;
    }

    // Switching users or workspaces - close old database
    if (this.db && (this.userId !== userId || this.workspaceId !== workspaceId)) {
      console.log('[LocalStorage] Switching context, closing old database', {
        from: { userId: this.userId, workspaceId: this.workspaceId },
        to: { userId, workspaceId }
      });
      this.db.close();
      this.db = null;
    }

    this.userId = userId;
    this.workspaceId = workspaceId;

    this.db = await openDB<LocalStorageDB>(this.getDbName(), this.DB_VERSION, {
      upgrade(db, oldVersion, newVersion, transaction) {
        // Create cards store
        if (!db.objectStoreNames.contains('cards')) {
          const cardStore = db.createObjectStore('cards', { keyPath: 'id' });
          cardStore.createIndex('by-created', 'createdAt');
          cardStore.createIndex('by-updated', 'updatedAt');
          cardStore.createIndex('by-collection', 'collections', { multiEntry: true });
          cardStore.createIndex('by-deleted', 'deleted');
        } else {
          // Add new index to existing cards store (version 5)
          const cardStore = transaction.objectStore('cards');
          if (!cardStore.indexNames.contains('by-deleted')) {
            cardStore.createIndex('by-deleted', 'deleted');
          }
        }

        // Create collections store
        if (!db.objectStoreNames.contains('collections')) {
          const collectionStore = db.createObjectStore('collections', { keyPath: 'id' });
          collectionStore.createIndex('by-name', 'name');
          collectionStore.createIndex('by-deleted', 'deleted');
        } else {
          // Add new index to existing collections store (version 5)
          const collectionStore = transaction.objectStore('collections');
          if (!collectionStore.indexNames.contains('by-deleted')) {
            collectionStore.createIndex('by-deleted', 'deleted');
          }
        }

        // Create metadata store
        if (!db.objectStoreNames.contains('metadata')) {
          db.createObjectStore('metadata', { keyPath: 'key' });
        }

        // Create note links store (added in v3)
        if (!db.objectStoreNames.contains('noteLinks')) {
          const noteLinksStore = db.createObjectStore('noteLinks', { keyPath: 'id' });
          noteLinksStore.createIndex('by-source', 'sourceNoteId');
          noteLinksStore.createIndex('by-target', 'targetNoteId');
        }

        // Create note card links store (added in v4)
        if (!db.objectStoreNames.contains('noteCardLinks')) {
          const noteCardLinksStore = db.createObjectStore('noteCardLinks', { keyPath: 'id' });
          noteCardLinksStore.createIndex('by-source', 'sourceNoteId');
          noteCardLinksStore.createIndex('by-target', 'targetCardId');
        }

        // Create events store (added in v6)
        if (!db.objectStoreNames.contains('events')) {
          const eventsStore = db.createObjectStore('events', { keyPath: 'id' });
          eventsStore.createIndex('by-date', 'date');
          eventsStore.createIndex('by-deleted', 'deleted');
          eventsStore.createIndex('by-recurrence-parent', 'recurrenceParentId');
        }

        // Create files store (added in v7)
        if (!db.objectStoreNames.contains('files')) {
          const filesStore = db.createObjectStore('files', { keyPath: 'id' });
          filesStore.createIndex('by-card', 'cardId');
          filesStore.createIndex('by-deleted', 'deleted');
          filesStore.createIndex('by-category', 'category');
        }

        // Create imageCache store (added in v8)
        if (!db.objectStoreNames.contains('imageCache')) {
          const imageCacheStore = db.createObjectStore('imageCache', { keyPath: 'id' });
          imageCacheStore.createIndex('by-cached-at', 'cachedAt');
          imageCacheStore.createIndex('by-last-accessed', 'lastAccessedAt');
        }
      },
    });

  }

  /**
   * Clear ALL workspace data for a specific user (used on logout)
   * This deletes all workspace databases for the user
   */
  async clearUserData(userId: string): Promise<void> {

    // Get all databases and find ones matching this user
    const databases = await indexedDB.databases();
    const userDatabases = databases.filter(db =>
      db.name?.startsWith(`pawkit-${userId}-`) && db.name?.endsWith('-local-storage')
    );


    // Delete all workspace databases for this user
    for (const db of userDatabases) {
      if (db.name) {
        await indexedDB.deleteDatabase(db.name);
      }
    }
  }

  /**
   * Clear data for a specific workspace (used when deleting a workspace)
   */
  async clearWorkspaceData(userId: string, workspaceId: string): Promise<void> {
    const dbName = `pawkit-${userId}-${workspaceId}-local-storage`;
    await indexedDB.deleteDatabase(dbName);
  }

  /**
   * Close current database connection and clear context
   */
  async close(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.userId = null;
      this.workspaceId = null;
    }
  }

  /**
   * Get current user context (for debugging)
   */
  getContext(): { userId: string | null; workspaceId: string | null; isInitialized: boolean } {
    return {
      userId: this.userId,
      workspaceId: this.workspaceId,
      isInitialized: this.db !== null
    };
  }

  // ==================== CARDS ====================

  async getAllCards(includeDeleted = false): Promise<CardDTO[]> {
    if (!this.db) {
      throw new Error('[LocalStorage] Database not initialized. Call init(userId, workspaceId) first.');
    }

    const cards = await this.db.getAll('cards');
    // Filter out soft-deleted cards unless explicitly requested
    // NOTE: We're not using an index for this yet because IndexedDB
    // doesn't handle boolean indexes well cross-browser. Future optimization:
    // convert deleted to a string field ("true"/"false") or use a compound index.
    return cards
      .filter(card => includeDeleted || card.deleted !== true)
      .map(card => {
        const { _locallyModified, _locallyCreated, _serverVersion, ...cleanCard } = card;
        return cleanCard as CardDTO;
      });
  }

  async getCard(id: string): Promise<CardDTO | undefined> {
    if (!this.db) {
      throw new Error('[LocalStorage] Database not initialized. Call init(userId, workspaceId) first.');
    }

    const card = await this.db.get('cards', id);
    if (!card) return undefined;

    const { _locallyModified, _locallyCreated, _serverVersion, ...cleanCard } = card;
    return cleanCard as CardDTO;
  }

  async saveCard(card: CardDTO, options?: { localOnly?: boolean; fromServer?: boolean }): Promise<void> {
    if (!this.db) {
      throw new Error('[LocalStorage] Database not initialized. Call init(userId, workspaceId) first.');
    }

    const existing = await this.db.get('cards', card.id);

    // Sanitize content to remove any characters that cause IndexedDB errors
    // Some browsers/platforms have issues with certain Unicode characters
    const sanitizedCard = {
      ...card,
      content: card.content ? this.sanitizeForIndexedDB(card.content) : card.content,
      notes: card.notes ? this.sanitizeForIndexedDB(card.notes) : card.notes,
      title: card.title ? this.sanitizeForIndexedDB(card.title) : card.title,
    };

    const cardToSave = {
      ...sanitizedCard,
      _locallyModified: options?.localOnly ? true : (existing?._locallyModified || false),
      _locallyCreated: options?.localOnly && !options?.fromServer ? true : (existing?._locallyCreated || false),
      _serverVersion: options?.fromServer ? card.updatedAt : existing?._serverVersion,
    };

    try {
      await this.db.put('cards', cardToSave);
      // console.log('[LocalStorage] Saved card:', card.id, options);
    } catch (error) {
      throw error;
    }
  }

  // Sanitize strings for IndexedDB compatibility
  private sanitizeForIndexedDB(str: string): string {
    // Remove characters that cause structuredClone to fail
    // This includes:
    // - Null bytes (\x00)
    // - Unpaired surrogate halves (broken emoji encoding)
    // - Some control characters

    // First remove null bytes
    let cleaned = str.replace(/\x00/g, '');

    // Then fix unpaired surrogates (common cause of structuredClone errors)
    // This regex matches lone surrogate halves that aren't part of a proper pair
    cleaned = cleaned.replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF]/g, '?');

    return cleaned;
  }

  async deleteCard(id: string): Promise<void> {
    if (!this.db) {
      throw new Error('[LocalStorage] Database not initialized. Call init(userId, workspaceId) first.');
    }

    // Soft delete: mark as deleted instead of removing
    const card = await this.db.get('cards', id);
    if (card) {
      card.deleted = true;
      card.deletedAt = new Date().toISOString();
      await this.db.put('cards', card);
    }
  }

  async permanentlyDeleteCard(id: string): Promise<void> {
    if (!this.db) {
      throw new Error('[LocalStorage] Database not initialized. Call init(userId, workspaceId) first.');
    }

    await this.db.delete('cards', id);
  }

  async emptyTrash(): Promise<void> {
    if (!this.db) {
      throw new Error('[LocalStorage] Database not initialized. Call init(userId, workspaceId) first.');
    }

    // Get all deleted cards and collections
    const allCards = await this.db.getAll('cards');
    const allCollections = await this.db.getAll('collections');

    const deletedCards = allCards.filter(card => card.deleted === true);
    const deletedCollections = allCollections.filter(col => col.deleted === true);

    // Delete them from IndexedDB
    const tx = this.db.transaction(['cards', 'collections'], 'readwrite');

    for (const card of deletedCards) {
      await tx.objectStore('cards').delete(card.id);
    }

    for (const collection of deletedCollections) {
      await tx.objectStore('collections').delete(collection.id);
    }

    await tx.done;
  }

  async getModifiedCards(): Promise<CardDTO[]> {
    if (!this.db) {
      throw new Error('[LocalStorage] Database not initialized. Call init(userId, workspaceId) first.');
    }

    const allCards = await this.db.getAll('cards');
    return allCards
      .filter(card => card._locallyModified || card._locallyCreated)
      .map(card => {
        const { _locallyModified, _locallyCreated, _serverVersion, ...cleanCard } = card;
        return cleanCard as CardDTO;
      });
  }

  async markCardSynced(id: string, serverVersion: string): Promise<void> {
    if (!this.db) {
      throw new Error('[LocalStorage] Database not initialized. Call init(userId, workspaceId) first.');
    }

    const card = await this.db.get('cards', id);
    if (!card) return;

    await this.db.put('cards', {
      ...card,
      _locallyModified: false,
      _locallyCreated: false,
      _serverVersion: serverVersion,
    });
  }

  // ==================== COLLECTIONS ====================

  async getAllCollections(includeDeleted = false): Promise<CollectionNode[]> {
    if (!this.db) {
      throw new Error('[LocalStorage] Database not initialized. Call init(userId, workspaceId) first.');
    }

    const collections = await this.db.getAll('collections');
    const cleanCollections = collections
      .filter(collection => includeDeleted || collection.deleted !== true)
      .map(collection => {
        const { _locallyModified, _locallyCreated, _serverVersion, ...cleanCollection } = collection;
        return cleanCollection as CollectionNode;
      });

    // Build tree structure from flat list based on parentId
    return this.buildCollectionTree(cleanCollections);
  }

  /**
   * Build tree structure from flat collection list
   */
  private buildCollectionTree(flatCollections: CollectionNode[]): CollectionNode[] {
    const nodes = new Map<string, CollectionNode>();
    const roots: CollectionNode[] = [];

    // Initialize nodes with empty children arrays
    flatCollections.forEach((collection) => {
      nodes.set(collection.id, { ...collection, children: [] });
    });

    // Build parent-child relationships
    nodes.forEach((node) => {
      if (node.parentId) {
        const parent = nodes.get(node.parentId);
        if (parent) {
          parent.children.push(node);
        } else {
          roots.push(node);
        }
      } else {
        roots.push(node);
      }
    });

    // Sort tree
    const sortTree = (tree: CollectionNode[]) => {
      tree.sort((a, b) => a.name.localeCompare(b.name));
      tree.forEach((node) => sortTree(node.children));
    };

    sortTree(roots);

    return roots;
  }

  async saveCollection(collection: CollectionNode, options?: { localOnly?: boolean; fromServer?: boolean }): Promise<void> {
    if (!this.db) {
      throw new Error('[LocalStorage] Database not initialized. Call init(userId, workspaceId) first.');
    }

    const existing = await this.db.get('collections', collection.id);

    const collectionToSave = {
      ...collection,
      _locallyModified: options?.localOnly ? true : (existing?._locallyModified || false),
      _locallyCreated: options?.localOnly && !options?.fromServer ? true : (existing?._locallyCreated || false),
      _serverVersion: options?.fromServer ? collection.updatedAt : existing?._serverVersion,
    };

    await this.db.put('collections', collectionToSave);
  }

  async deleteCollection(id: string): Promise<void> {
    if (!this.db) {
      throw new Error('[LocalStorage] Database not initialized. Call init(userId, workspaceId) first.');
    }

    await this.db.delete('collections', id);
  }

  async permanentlyDeleteCollection(id: string): Promise<void> {
    if (!this.db) {
      throw new Error('[LocalStorage] Database not initialized. Call init(userId, workspaceId) first.');
    }

    await this.db.delete('collections', id);
  }

  async getModifiedCollections(): Promise<CollectionNode[]> {
    if (!this.db) {
      throw new Error('[LocalStorage] Database not initialized. Call init(userId, workspaceId) first.');
    }

    const allCollections = await this.db.getAll('collections');
    return allCollections
      .filter(collection => collection._locallyModified || collection._locallyCreated)
      .map(collection => {
        const { _locallyModified, _locallyCreated, _serverVersion, ...cleanCollection } = collection;
        return cleanCollection as CollectionNode;
      });
  }

  async markCollectionSynced(id: string, serverVersion: string): Promise<void> {
    if (!this.db) {
      throw new Error('[LocalStorage] Database not initialized. Call init(userId, workspaceId) first.');
    }

    const collection = await this.db.get('collections', id);
    if (!collection) return;

    await this.db.put('collections', {
      ...collection,
      _locallyModified: false,
      _locallyCreated: false,
      _serverVersion: serverVersion,
    });
  }

  // ==================== METADATA ====================

  async getMetadata<T = unknown>(key: string): Promise<T | undefined> {
    if (!this.db) {
      throw new Error('[LocalStorage] Database not initialized. Call init(userId, workspaceId) first.');
    }

    const item = await this.db.get('metadata', key);
    return item?.value as T | undefined;
  }

  async setMetadata(key: string, value: unknown): Promise<void> {
    if (!this.db) {
      throw new Error('[LocalStorage] Database not initialized. Call init(userId, workspaceId) first.');
    }

    await this.db.put('metadata', {
      key,
      value,
      updatedAt: Date.now(),
    });
  }

  // ==================== SYNC HELPERS ====================

  async getLastSyncTime(): Promise<number | null> {
    return await this.getMetadata<number>('lastSyncTime') ?? null;
  }

  async setLastSyncTime(timestamp: number): Promise<void> {
    await this.setMetadata('lastSyncTime', timestamp);
  }

  // ==================== EXPORT/IMPORT ====================

  async exportAllData(): Promise<{
    cards: CardDTO[];
    collections: CollectionNode[];
    exportedAt: string;
    version: number;
  }> {
    if (!this.db) {
      throw new Error('[LocalStorage] Database not initialized. Call init(userId, workspaceId) first.');
    }

    const cards = await this.getAllCards();
    const collections = await this.getAllCollections();

    return {
      cards,
      collections,
      exportedAt: new Date().toISOString(),
      version: this.DB_VERSION,
    };
  }

  async importData(data: {
    cards?: CardDTO[];
    collections?: CollectionNode[];
  }): Promise<void> {
    if (!this.db) {
      throw new Error('[LocalStorage] Database not initialized. Call init(userId, workspaceId) first.');
    }

    const tx = this.db.transaction(['cards', 'collections'], 'readwrite');

    // Import cards
    if (data.cards) {
      for (const card of data.cards) {
        await tx.objectStore('cards').put({
          ...card,
          _locallyModified: false,
          _locallyCreated: false,
          _serverVersion: card.updatedAt,
        });
      }
    }

    // Import collections
    if (data.collections) {
      for (const collection of data.collections) {
        await tx.objectStore('collections').put({
          ...collection,
          _locallyModified: false,
          _locallyCreated: false,
          _serverVersion: collection.updatedAt,
        });
      }
    }

    await tx.done;
  }

  async clear(): Promise<void> {
    if (!this.db) {
      throw new Error('[LocalStorage] Database not initialized. Call init(userId, workspaceId) first.');
    }

    const tx = this.db.transaction(['cards', 'collections', 'metadata'], 'readwrite');
    await tx.objectStore('cards').clear();
    await tx.objectStore('collections').clear();
    await tx.objectStore('metadata').clear();
    await tx.done;
  }

  // ==================== NOTE LINKS ====================

  async addNoteLink(sourceId: string, targetId: string, linkText: string): Promise<void> {
    if (!this.db) {
      throw new Error('[LocalStorage] Database not initialized. Call init(userId, workspaceId) first.');
    }

    const link = {
      id: `${sourceId}-${targetId}`,
      sourceNoteId: sourceId,
      targetNoteId: targetId,
      linkText,
      createdAt: new Date().toISOString(),
    };

    await this.db.put('noteLinks', link);
  }

  async getNoteLinks(noteId: string): Promise<Array<{ id: string; targetNoteId: string; linkText: string; createdAt: string }>> {
    if (!this.db) {
      throw new Error('[LocalStorage] Database not initialized. Call init(userId, workspaceId) first.');
    }

    const links = await this.db.getAllFromIndex('noteLinks', 'by-source', noteId);
    return links;
  }

  async getBacklinks(noteId: string): Promise<Array<{ id: string; sourceNoteId: string; linkText: string; createdAt: string }>> {
    if (!this.db) {
      throw new Error('[LocalStorage] Database not initialized. Call init(userId, workspaceId) first.');
    }

    const backlinks = await this.db.getAllFromIndex('noteLinks', 'by-target', noteId);
    return backlinks;
  }

  async deleteNoteLink(linkId: string): Promise<void> {
    if (!this.db) {
      throw new Error('[LocalStorage] Database not initialized. Call init(userId, workspaceId) first.');
    }

    await this.db.delete('noteLinks', linkId);
  }

  async deleteAllLinksForNote(noteId: string): Promise<void> {
    if (!this.db) {
      throw new Error('[LocalStorage] Database not initialized. Call init(userId, workspaceId) first.');
    }

    // Delete all outgoing links (where this note is the source)
    const outgoingLinks = await this.getNoteLinks(noteId);
    // Delete all incoming links (where this note is the target)
    const incomingLinks = await this.getBacklinks(noteId);

    const tx = this.db.transaction(['noteLinks'], 'readwrite');
    const store = tx.objectStore('noteLinks');

    for (const link of outgoingLinks) {
      await store.delete(link.id);
    }

    for (const link of incomingLinks) {
      await store.delete(link.id);
    }

    await tx.done;

  }

  async updateLinkReferences(oldNoteId: string, newNoteId: string): Promise<void> {
    if (!this.db) {
      throw new Error('[LocalStorage] Database not initialized. Call init(userId, workspaceId) first.');
    }

    const outgoingLinks = await this.getNoteLinks(oldNoteId);
    const incomingLinks = await this.getBacklinks(oldNoteId);

    const tx = this.db.transaction(['noteLinks'], 'readwrite');
    const store = tx.objectStore('noteLinks');

    // Update outgoing links (where oldNoteId is the source)
    for (const link of outgoingLinks) {
      await store.delete(link.id);
      await store.put({
        ...link,
        id: `${newNoteId}-${link.targetNoteId}`,
        sourceNoteId: newNoteId,
      });
    }

    // Update incoming links (where oldNoteId is the target)
    for (const link of incomingLinks) {
      await store.delete(link.id);
      await store.put({
        ...link,
        id: `${link.sourceNoteId}-${newNoteId}`,
        targetNoteId: newNoteId,
      });
    }

    await tx.done;

  }

  // ==================== NOTE CARD LINKS ====================

  async addNoteCardLink(sourceId: string, targetCardId: string, linkText: string, linkType: 'card' | 'url'): Promise<void> {
    if (!this.db) {
      throw new Error('[LocalStorage] Database not initialized. Call init(userId, workspaceId) first.');
    }

    const link = {
      id: `${sourceId}-card-${targetCardId}`,
      sourceNoteId: sourceId,
      targetCardId: targetCardId,
      linkText,
      linkType,
      createdAt: new Date().toISOString(),
    };

    await this.db.put('noteCardLinks', link);
  }

  async getNoteCardLinks(noteId: string): Promise<Array<{ id: string; targetCardId: string; linkText: string; linkType: 'card' | 'url'; createdAt: string }>> {
    if (!this.db) {
      throw new Error('[LocalStorage] Database not initialized. Call init(userId, workspaceId) first.');
    }

    const links = await this.db.getAllFromIndex('noteCardLinks', 'by-source', noteId);
    return links;
  }

  async getCardBacklinks(cardId: string): Promise<Array<{ id: string; sourceNoteId: string; linkText: string; linkType: 'card' | 'url'; createdAt: string }>> {
    if (!this.db) {
      throw new Error('[LocalStorage] Database not initialized. Call init(userId, workspaceId) first.');
    }

    const backlinks = await this.db.getAllFromIndex('noteCardLinks', 'by-target', cardId);
    return backlinks;
  }

  async deleteNoteCardLink(linkId: string): Promise<void> {
    if (!this.db) {
      throw new Error('[LocalStorage] Database not initialized. Call init(userId, workspaceId) first.');
    }

    await this.db.delete('noteCardLinks', linkId);
  }

  async deleteAllCardLinksForNote(noteId: string): Promise<void> {
    if (!this.db) {
      throw new Error('[LocalStorage] Database not initialized. Call init(userId, workspaceId) first.');
    }

    const outgoingLinks = await this.getNoteCardLinks(noteId);
    const incomingLinks = await this.getCardBacklinks(noteId);

    const tx = this.db.transaction(['noteCardLinks'], 'readwrite');
    const store = tx.objectStore('noteCardLinks');

    for (const link of outgoingLinks) {
      await store.delete(link.id);
    }

    for (const link of incomingLinks) {
      await store.delete(link.id);
    }

    await tx.done;

  }

  // ==================== STATS ====================

  async getStats(): Promise<{
    totalCards: number;
    totalCollections: number;
    modifiedCards: number;
    lastSync: number | null;
  }> {
    if (!this.db) {
      return {
        totalCards: 0,
        totalCollections: 0,
        modifiedCards: 0,
        lastSync: null,
      };
    }

    const allCards = await this.db.getAll('cards');
    const allCollections = await this.db.getAll('collections');
    const modifiedCards = allCards.filter(c => c._locallyModified || c._locallyCreated);
    const lastSync = await this.getLastSyncTime();

    return {
      totalCards: allCards.length,
      totalCollections: allCollections.length,
      modifiedCards: modifiedCards.length,
      lastSync,
    };
  }

  // ==================== EVENTS ====================

  async getAllEvents(includeDeleted = false): Promise<CalendarEvent[]> {
    if (!this.db) {
      throw new Error('[LocalStorage] Database not initialized. Call init(userId, workspaceId) first.');
    }

    const events = await this.db.getAll('events');
    return events
      .filter(event => includeDeleted || event.deleted !== true)
      .map(event => {
        const { _locallyModified, _locallyCreated, _serverVersion, ...cleanEvent } = event;
        return cleanEvent as CalendarEvent;
      });
  }

  async getEvent(id: string): Promise<CalendarEvent | undefined> {
    if (!this.db) {
      throw new Error('[LocalStorage] Database not initialized. Call init(userId, workspaceId) first.');
    }

    const event = await this.db.get('events', id);
    if (!event) return undefined;

    const { _locallyModified, _locallyCreated, _serverVersion, ...cleanEvent } = event;
    return cleanEvent as CalendarEvent;
  }

  async getEventsByDateRange(startDate: string, endDate: string, includeDeleted = false): Promise<CalendarEvent[]> {
    if (!this.db) {
      throw new Error('[LocalStorage] Database not initialized. Call init(userId, workspaceId) first.');
    }

    // Get all events and filter by date range
    // Note: For better performance with large datasets, consider using a cursor
    const events = await this.db.getAll('events');
    return events
      .filter(event => {
        if (!includeDeleted && event.deleted === true) return false;
        return event.date >= startDate && event.date <= endDate;
      })
      .map(event => {
        const { _locallyModified, _locallyCreated, _serverVersion, ...cleanEvent } = event;
        return cleanEvent as CalendarEvent;
      });
  }

  async getEventsByRecurrenceParent(parentId: string): Promise<CalendarEvent[]> {
    if (!this.db) {
      throw new Error('[LocalStorage] Database not initialized. Call init(userId, workspaceId) first.');
    }

    const events = await this.db.getAllFromIndex('events', 'by-recurrence-parent', parentId);
    return events.map(event => {
      const { _locallyModified, _locallyCreated, _serverVersion, ...cleanEvent } = event;
      return cleanEvent as CalendarEvent;
    });
  }

  async saveEvent(event: CalendarEvent, options?: { localOnly?: boolean; fromServer?: boolean }): Promise<void> {
    if (!this.db) {
      throw new Error('[LocalStorage] Database not initialized. Call init(userId, workspaceId) first.');
    }

    const existing = await this.db.get('events', event.id);

    // Sanitize content to remove any characters that cause IndexedDB errors
    const sanitizedEvent = {
      ...event,
      title: event.title ? this.sanitizeForIndexedDB(event.title) : event.title,
      description: event.description ? this.sanitizeForIndexedDB(event.description) : event.description,
      location: event.location ? this.sanitizeForIndexedDB(event.location) : event.location,
    };

    const eventToSave = {
      ...sanitizedEvent,
      _locallyModified: options?.localOnly ? true : (existing?._locallyModified || false),
      _locallyCreated: options?.localOnly && !options?.fromServer ? true : (existing?._locallyCreated || false),
      _serverVersion: options?.fromServer ? event.updatedAt : existing?._serverVersion,
    };

    try {
      await this.db.put('events', eventToSave);
    } catch (error) {
      throw error;
    }
  }

  async deleteEvent(id: string): Promise<void> {
    if (!this.db) {
      throw new Error('[LocalStorage] Database not initialized. Call init(userId, workspaceId) first.');
    }

    // Soft delete: mark as deleted instead of removing
    const event = await this.db.get('events', id);
    if (event) {
      event.deleted = true;
      event.deletedAt = new Date().toISOString();
      await this.db.put('events', event);
    }
  }

  async permanentlyDeleteEvent(id: string): Promise<void> {
    if (!this.db) {
      throw new Error('[LocalStorage] Database not initialized. Call init(userId, workspaceId) first.');
    }

    await this.db.delete('events', id);
  }

  async getModifiedEvents(): Promise<CalendarEvent[]> {
    if (!this.db) {
      throw new Error('[LocalStorage] Database not initialized. Call init(userId, workspaceId) first.');
    }

    const allEvents = await this.db.getAll('events');
    return allEvents
      .filter(event => event._locallyModified || event._locallyCreated)
      .map(event => {
        const { _locallyModified, _locallyCreated, _serverVersion, ...cleanEvent } = event;
        return cleanEvent as CalendarEvent;
      });
  }

  async markEventSynced(id: string, serverVersion: string): Promise<void> {
    if (!this.db) {
      throw new Error('[LocalStorage] Database not initialized. Call init(userId, workspaceId) first.');
    }

    const event = await this.db.get('events', id);
    if (!event) return;

    await this.db.put('events', {
      ...event,
      _locallyModified: false,
      _locallyCreated: false,
      _serverVersion: serverVersion,
    });
  }

  // ==================== FILES ====================

  async getAllFiles(includeDeleted = false): Promise<StoredFile[]> {
    if (!this.db) {
      throw new Error('[LocalStorage] Database not initialized. Call init(userId, workspaceId) first.');
    }

    const files = await this.db.getAll('files');
    return files
      .filter(file => includeDeleted || file.deleted !== true)
      .map(file => {
        const { _locallyModified, _locallyCreated, ...cleanFile } = file;
        return cleanFile as StoredFile;
      });
  }

  async getFile(id: string): Promise<StoredFile | undefined> {
    if (!this.db) {
      throw new Error('[LocalStorage] Database not initialized. Call init(userId, workspaceId) first.');
    }

    const file = await this.db.get('files', id);
    if (!file || file.deleted) return undefined;

    const { _locallyModified, _locallyCreated, ...cleanFile } = file;
    return cleanFile as StoredFile;
  }

  async getFilesByCardId(cardId: string): Promise<StoredFile[]> {
    if (!this.db) {
      throw new Error('[LocalStorage] Database not initialized. Call init(userId, workspaceId) first.');
    }

    const files = await this.db.getAllFromIndex('files', 'by-card', cardId);
    return files
      .filter(file => file.deleted !== true)
      .map(file => {
        const { _locallyModified, _locallyCreated, ...cleanFile } = file;
        return cleanFile as StoredFile;
      });
  }

  async getStandaloneFiles(): Promise<StoredFile[]> {
    if (!this.db) {
      throw new Error('[LocalStorage] Database not initialized. Call init(userId, workspaceId) first.');
    }

    // Get all files where cardId is undefined (standalone files)
    const allFiles = await this.db.getAll('files');
    return allFiles
      .filter(file => !file.cardId && file.deleted !== true)
      .map(file => {
        const { _locallyModified, _locallyCreated, ...cleanFile } = file;
        return cleanFile as StoredFile;
      });
  }

  async getFilesByCategory(category: string): Promise<StoredFile[]> {
    if (!this.db) {
      throw new Error('[LocalStorage] Database not initialized. Call init(userId, workspaceId) first.');
    }

    const files = await this.db.getAllFromIndex('files', 'by-category', category);
    return files
      .filter(file => file.deleted !== true)
      .map(file => {
        const { _locallyModified, _locallyCreated, ...cleanFile } = file;
        return cleanFile as StoredFile;
      });
  }

  async saveFile(file: StoredFile, options?: { localOnly?: boolean }): Promise<void> {
    if (!this.db) {
      throw new Error('[LocalStorage] Database not initialized. Call init(userId, workspaceId) first.');
    }

    const existing = await this.db.get('files', file.id);

    const fileToSave = {
      ...file,
      _locallyModified: options?.localOnly ? true : (existing?._locallyModified || false),
      _locallyCreated: options?.localOnly ? true : (existing?._locallyCreated || false),
    };

    try {
      await this.db.put('files', fileToSave);
    } catch (error) {
      console.error('[LocalStorage] Failed to save file:', error);
      throw error;
    }
  }

  async deleteFile(id: string): Promise<void> {
    if (!this.db) {
      throw new Error('[LocalStorage] Database not initialized. Call init(userId, workspaceId) first.');
    }

    // Soft delete: mark as deleted instead of removing
    const file = await this.db.get('files', id);
    if (file) {
      file.deleted = true;
      file.deletedAt = new Date().toISOString();
      await this.db.put('files', file);
    }
  }

  async permanentlyDeleteFile(id: string): Promise<void> {
    if (!this.db) {
      throw new Error('[LocalStorage] Database not initialized. Call init(userId, workspaceId) first.');
    }

    await this.db.delete('files', id);
  }

  async deleteFilesByCardId(cardId: string): Promise<void> {
    if (!this.db) {
      throw new Error('[LocalStorage] Database not initialized. Call init(userId, workspaceId) first.');
    }

    const files = await this.db.getAllFromIndex('files', 'by-card', cardId);
    for (const file of files) {
      file.deleted = true;
      file.deletedAt = new Date().toISOString();
      await this.db.put('files', file);
    }
  }

  async getTotalFileSize(): Promise<number> {
    if (!this.db) {
      throw new Error('[LocalStorage] Database not initialized. Call init(userId, workspaceId) first.');
    }

    const files = await this.db.getAll('files');
    return files
      .filter(file => file.deleted !== true)
      .reduce((total, file) => total + file.size, 0);
  }

  async getFileStats(): Promise<{
    totalFiles: number;
    totalSize: number;
    byCategory: Record<string, { count: number; size: number }>;
  }> {
    if (!this.db) {
      return {
        totalFiles: 0,
        totalSize: 0,
        byCategory: {},
      };
    }

    const files = await this.db.getAll('files');
    const activeFiles = files.filter(file => file.deleted !== true);

    const byCategory: Record<string, { count: number; size: number }> = {};
    for (const file of activeFiles) {
      if (!byCategory[file.category]) {
        byCategory[file.category] = { count: 0, size: 0 };
      }
      byCategory[file.category].count++;
      byCategory[file.category].size += file.size;
    }

    return {
      totalFiles: activeFiles.length,
      totalSize: activeFiles.reduce((total, file) => total + file.size, 0),
      byCategory,
    };
  }

  // ==================== IMAGE CACHE ====================

  /**
   * Get cached image by normalized URL/ID
   */
  async getCachedImage(id: string): Promise<{
    id: string;
    blob: Blob;
    mimeType: string;
    size: number;
    cachedAt: number;
    lastAccessedAt: number;
  } | undefined> {
    if (!this.db) {
      return undefined;
    }

    const cached = await this.db.get('imageCache', id);
    if (!cached) return undefined;

    // Update lastAccessedAt
    await this.db.put('imageCache', {
      ...cached,
      lastAccessedAt: Date.now(),
    });

    return cached;
  }

  /**
   * Save image to cache
   */
  async cacheImage(
    id: string,
    blob: Blob,
    mimeType: string
  ): Promise<void> {
    if (!this.db) {
      throw new Error('[LocalStorage] Database not initialized. Call init(userId, workspaceId) first.');
    }

    const now = Date.now();
    await this.db.put('imageCache', {
      id,
      blob,
      mimeType,
      size: blob.size,
      cachedAt: now,
      lastAccessedAt: now,
    });
  }

  /**
   * Check if image is cached
   */
  async isImageCached(id: string): Promise<boolean> {
    if (!this.db) {
      return false;
    }

    const cached = await this.db.get('imageCache', id);
    return !!cached;
  }

  /**
   * Delete cached image
   */
  async deleteCachedImage(id: string): Promise<void> {
    if (!this.db) {
      return;
    }

    await this.db.delete('imageCache', id);
  }

  /**
   * Get image cache statistics
   */
  async getImageCacheStats(): Promise<{
    count: number;
    totalSize: number;
  }> {
    if (!this.db) {
      return { count: 0, totalSize: 0 };
    }

    const images = await this.db.getAll('imageCache');
    return {
      count: images.length,
      totalSize: images.reduce((total, img) => total + img.size, 0),
    };
  }

  /**
   * Get all cached image IDs (for eviction decisions)
   */
  async getAllCachedImageIds(): Promise<string[]> {
    if (!this.db) {
      return [];
    }

    const images = await this.db.getAll('imageCache');
    return images.map(img => img.id);
  }

  /**
   * Get oldest cached images (by lastAccessedAt) for LRU eviction
   */
  async getOldestCachedImages(limit: number): Promise<Array<{
    id: string;
    size: number;
    lastAccessedAt: number;
  }>> {
    if (!this.db) {
      return [];
    }

    const images = await this.db.getAllFromIndex('imageCache', 'by-last-accessed');
    return images.slice(0, limit).map(img => ({
      id: img.id,
      size: img.size,
      lastAccessedAt: img.lastAccessedAt,
    }));
  }

  /**
   * Clear all cached images
   */
  async clearImageCache(): Promise<void> {
    if (!this.db) {
      return;
    }

    await this.db.clear('imageCache');
  }
}

// Export singleton instance (renamed from localStorage to avoid confusion with browser's localStorage)
export const localDb = new LocalStorage();
