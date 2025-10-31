import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { CardDTO } from '@/lib/server/cards';
import { CollectionNode } from '@/lib/types';

/**
 * LOCAL-FIRST STORAGE LAYER
 *
 * This is the PRIMARY source of truth for all user data.
 * The server is ONLY used for:
 * - Syncing between devices
 * - Backup/recovery
 *
 * User data is NEVER lost even if server is wiped.
 */

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
    };
  };
  metadata: {
    key: string; // metadata key
    value: {
      key: string;
      value: any;
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
}

class LocalStorage {
  private db: IDBPDatabase<LocalStorageDB> | null = null;
  private readonly DB_NAME = 'pawkit-local-storage';
  private readonly DB_VERSION = 4; // Bumped for note card links support

  async init(): Promise<void> {
    if (this.db) return;

    this.db = await openDB<LocalStorageDB>(this.DB_NAME, this.DB_VERSION, {
      upgrade(db, oldVersion, newVersion, transaction) {
        // Create cards store
        if (!db.objectStoreNames.contains('cards')) {
          const cardStore = db.createObjectStore('cards', { keyPath: 'id' });
          cardStore.createIndex('by-created', 'createdAt');
          cardStore.createIndex('by-updated', 'updatedAt');
          cardStore.createIndex('by-collection', 'collections', { multiEntry: true });
        }

        // Create collections store
        if (!db.objectStoreNames.contains('collections')) {
          const collectionStore = db.createObjectStore('collections', { keyPath: 'id' });
          collectionStore.createIndex('by-name', 'name');
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
      },
    });
  }

  // ==================== CARDS ====================

  async getAllCards(includeDeleted = false): Promise<CardDTO[]> {
    await this.init();
    if (!this.db) return [];

    const cards = await this.db.getAll('cards');
    // Filter out soft-deleted cards unless explicitly requested
    return cards
      .filter(card => includeDeleted || card.deleted !== true)
      .map(card => {
        const { _locallyModified, _locallyCreated, _serverVersion, ...cleanCard } = card;
        return cleanCard as CardDTO;
      });
  }

  async getCard(id: string): Promise<CardDTO | undefined> {
    await this.init();
    if (!this.db) return undefined;

    const card = await this.db.get('cards', id);
    if (!card) return undefined;

    const { _locallyModified, _locallyCreated, _serverVersion, ...cleanCard } = card;
    return cleanCard as CardDTO;
  }

  async saveCard(card: CardDTO, options?: { localOnly?: boolean; fromServer?: boolean }): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

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
      console.error('[LocalStorage] Failed to save card to IndexedDB:', error);
      console.error('[LocalStorage] Card content length:', card.content?.length);
      console.error('[LocalStorage] Problematic card:', { id: card.id, title: card.title });
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
    await this.init();
    if (!this.db) return;

    // Soft delete: mark as deleted instead of removing
    const card = await this.db.get('cards', id);
    if (card) {
      card.deleted = true;
      card.deletedAt = new Date().toISOString();
      await this.db.put('cards', card);
    }
  }

  async permanentlyDeleteCard(id: string): Promise<void> {
    await this.init();
    if (!this.db) return;

    await this.db.delete('cards', id);
  }

  async emptyTrash(): Promise<void> {
    await this.init();
    if (!this.db) return;

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

      cards: deletedCards.length,
      collections: deletedCollections.length
    });
  }

  async getModifiedCards(): Promise<CardDTO[]> {
    await this.init();
    if (!this.db) return [];

    const allCards = await this.db.getAll('cards');
    return allCards
      .filter(card => card._locallyModified || card._locallyCreated)
      .map(card => {
        const { _locallyModified, _locallyCreated, _serverVersion, ...cleanCard } = card;
        return cleanCard as CardDTO;
      });
  }

  async markCardSynced(id: string, serverVersion: string): Promise<void> {
    await this.init();
    if (!this.db) return;

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
    await this.init();
    if (!this.db) return [];

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
      if (node.parentId && nodes.has(node.parentId)) {
        nodes.get(node.parentId)!.children.push(node);
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
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

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
    await this.init();
    if (!this.db) return;

    await this.db.delete('collections', id);
  }

  async permanentlyDeleteCollection(id: string): Promise<void> {
    await this.init();
    if (!this.db) return;

    await this.db.delete('collections', id);
  }

  async getModifiedCollections(): Promise<CollectionNode[]> {
    await this.init();
    if (!this.db) return [];

    const allCollections = await this.db.getAll('collections');
    return allCollections
      .filter(collection => collection._locallyModified || collection._locallyCreated)
      .map(collection => {
        const { _locallyModified, _locallyCreated, _serverVersion, ...cleanCollection } = collection;
        return cleanCollection as CollectionNode;
      });
  }

  async markCollectionSynced(id: string, serverVersion: string): Promise<void> {
    await this.init();
    if (!this.db) return;

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

  async getMetadata(key: string): Promise<any> {
    await this.init();
    if (!this.db) return null;

    const item = await this.db.get('metadata', key);
    return item?.value;
  }

  async setMetadata(key: string, value: any): Promise<void> {
    await this.init();
    if (!this.db) return;

    await this.db.put('metadata', {
      key,
      value,
      updatedAt: Date.now(),
    });
  }

  // ==================== SYNC HELPERS ====================

  async getLastSyncTime(): Promise<number | null> {
    return await this.getMetadata('lastSyncTime');
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
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

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
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

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
      cards: data.cards?.length || 0,
      collections: data.collections?.length || 0,
    });
  }

  async clear(): Promise<void> {
    await this.init();
    if (!this.db) return;

    const tx = this.db.transaction(['cards', 'collections', 'metadata'], 'readwrite');
    await tx.objectStore('cards').clear();
    await tx.objectStore('collections').clear();
    await tx.objectStore('metadata').clear();
    await tx.done;

  }

  // ==================== NOTE LINKS ====================

  async addNoteLink(sourceId: string, targetId: string, linkText: string): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

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
    await this.init();
    if (!this.db) return [];

    const links = await this.db.getAllFromIndex('noteLinks', 'by-source', noteId);
    return links;
  }

  async getBacklinks(noteId: string): Promise<Array<{ id: string; sourceNoteId: string; linkText: string; createdAt: string }>> {
    await this.init();
    if (!this.db) return [];

    const backlinks = await this.db.getAllFromIndex('noteLinks', 'by-target', noteId);
    return backlinks;
  }

  async deleteNoteLink(linkId: string): Promise<void> {
    await this.init();
    if (!this.db) return;

    await this.db.delete('noteLinks', linkId);
  }

  async deleteAllLinksForNote(noteId: string): Promise<void> {
    await this.init();
    if (!this.db) return;

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

      outgoing: outgoingLinks.length,
      incoming: incomingLinks.length,
    });
  }

  async updateLinkReferences(oldNoteId: string, newNoteId: string): Promise<void> {
    await this.init();
    if (!this.db) return;

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

      outgoing: outgoingLinks.length,
      incoming: incomingLinks.length,
    });
  }

  // ==================== NOTE CARD LINKS ====================

  async addNoteCardLink(sourceId: string, targetCardId: string, linkText: string, linkType: 'card' | 'url'): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

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
    await this.init();
    if (!this.db) return [];

    const links = await this.db.getAllFromIndex('noteCardLinks', 'by-source', noteId);
    return links;
  }

  async getCardBacklinks(cardId: string): Promise<Array<{ id: string; sourceNoteId: string; linkText: string; linkType: 'card' | 'url'; createdAt: string }>> {
    await this.init();
    if (!this.db) return [];

    const backlinks = await this.db.getAllFromIndex('noteCardLinks', 'by-target', cardId);
    return backlinks;
  }

  async deleteNoteCardLink(linkId: string): Promise<void> {
    await this.init();
    if (!this.db) return;

    await this.db.delete('noteCardLinks', linkId);
  }

  async deleteAllCardLinksForNote(noteId: string): Promise<void> {
    await this.init();
    if (!this.db) return;

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

      outgoing: outgoingLinks.length,
      incoming: incomingLinks.length,
    });
  }

  // ==================== STATS ====================

  async getStats(): Promise<{
    totalCards: number;
    totalCollections: number;
    modifiedCards: number;
    lastSync: number | null;
  }> {
    await this.init();
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
}

// Export singleton instance (renamed from localStorage to avoid confusion with browser's localStorage)
export const localDb = new LocalStorage();
