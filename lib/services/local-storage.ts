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
}

class LocalStorage {
  private db: IDBPDatabase<LocalStorageDB> | null = null;
  private readonly DB_NAME = 'pawkit-local-storage';
  private readonly DB_VERSION = 2; // Bumped for new schema

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
      },
    });
  }

  // ==================== CARDS ====================

  async getAllCards(): Promise<CardDTO[]> {
    await this.init();
    if (!this.db) return [];

    const cards = await this.db.getAll('cards');
    // Remove internal flags before returning
    return cards.map(card => {
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

    const cardToSave = {
      ...card,
      _locallyModified: options?.localOnly ? true : (existing?._locallyModified || false),
      _locallyCreated: options?.localOnly && !options?.fromServer ? true : (existing?._locallyCreated || false),
      _serverVersion: options?.fromServer ? card.updatedAt : existing?._serverVersion,
    };

    await this.db.put('cards', cardToSave);
    console.log('[LocalStorage] Saved card:', card.id, options);
  }

  async deleteCard(id: string): Promise<void> {
    await this.init();
    if (!this.db) return;

    await this.db.delete('cards', id);
    console.log('[LocalStorage] Deleted card:', id);
  }

  async permanentlyDeleteCard(id: string): Promise<void> {
    await this.init();
    if (!this.db) return;

    await this.db.delete('cards', id);
    console.log('[LocalStorage] Permanently deleted card:', id);
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

    console.log('[LocalStorage] Emptied trash:', {
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

  async getAllCollections(): Promise<CollectionNode[]> {
    await this.init();
    if (!this.db) return [];

    const collections = await this.db.getAll('collections');
    return collections.map(collection => {
      const { _locallyModified, _locallyCreated, _serverVersion, ...cleanCollection } = collection;
      return cleanCollection as CollectionNode;
    });
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
    console.log('[LocalStorage] Saved collection:', collection.id, options);
  }

  async deleteCollection(id: string): Promise<void> {
    await this.init();
    if (!this.db) return;

    await this.db.delete('collections', id);
    console.log('[LocalStorage] Deleted collection:', id);
  }

  async permanentlyDeleteCollection(id: string): Promise<void> {
    await this.init();
    if (!this.db) return;

    await this.db.delete('collections', id);
    console.log('[LocalStorage] Permanently deleted collection:', id);
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
    console.log('[LocalStorage] Imported data:', {
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

    console.log('[LocalStorage] Cleared all data');
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

// Export singleton instance
export const localStorage = new LocalStorage();
