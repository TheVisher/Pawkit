import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { CardDTO } from '@/lib/server/cards';

// Operation types that can be queued
type OperationType = 'CREATE_CARD' | 'UPDATE_CARD' | 'DELETE_CARD' | 'CREATE_COLLECTION' | 'UPDATE_COLLECTION' | 'DELETE_COLLECTION';

// Queue operation structure
export interface QueueOperation {
  id: string; // Unique operation ID
  type: OperationType;
  payload: any; // Operation-specific data
  tempId?: string; // For CREATE operations, the temporary ID used optimistically
  targetId?: string; // For UPDATE/DELETE operations, the card ID
  timestamp: number;
  retries: number;
  status: 'pending' | 'processing' | 'failed';
}

// IndexedDB schema
interface SyncQueueDB extends DBSchema {
  operations: {
    key: string;
    value: QueueOperation;
    indexes: { 'by-status': string; 'by-timestamp': number };
  };
}

class SyncQueue {
  private db: IDBPDatabase<SyncQueueDB> | null = null;
  private readonly DB_NAME = 'pawkit-sync-queue';
  private readonly DB_VERSION = 1;

  // Initialize the database
  async init(): Promise<void> {
    if (this.db) return;

    this.db = await openDB<SyncQueueDB>(this.DB_NAME, this.DB_VERSION, {
      upgrade(db) {
        // Create operations store if it doesn't exist
        if (!db.objectStoreNames.contains('operations')) {
          const store = db.createObjectStore('operations', { keyPath: 'id' });
          store.createIndex('by-status', 'status');
          store.createIndex('by-timestamp', 'timestamp');
        }
      },
    });
  }

  // Add operation to queue
  async enqueue(operation: Omit<QueueOperation, 'id' | 'timestamp' | 'retries' | 'status'>): Promise<string> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    const id = `op_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const queueOperation: QueueOperation = {
      ...operation,
      id,
      timestamp: Date.now(),
      retries: 0,
      status: 'pending',
    };

    await this.db.add('operations', queueOperation);
    console.log('[SyncQueue] Enqueued operation:', id, operation.type);
    return id;
  }

  // Get all pending operations
  async getPending(): Promise<QueueOperation[]> {
    await this.init();
    if (!this.db) return [];

    const tx = this.db.transaction('operations', 'readonly');
    const index = tx.store.index('by-status');
    const operations = await index.getAll('pending');

    // Sort by timestamp to process in order
    return operations.sort((a, b) => a.timestamp - b.timestamp);
  }

  // Mark operation as processing
  async markProcessing(id: string): Promise<void> {
    await this.init();
    if (!this.db) return;

    const tx = this.db.transaction('operations', 'readwrite');
    const operation = await tx.store.get(id);
    if (operation) {
      operation.status = 'processing';
      await tx.store.put(operation);
    }
    await tx.done;
  }

  // Remove operation from queue (after successful sync)
  async remove(id: string): Promise<void> {
    await this.init();
    if (!this.db) return;

    await this.db.delete('operations', id);
    console.log('[SyncQueue] Removed operation:', id);
  }

  // Mark operation as failed
  async markFailed(id: string): Promise<void> {
    await this.init();
    if (!this.db) return;

    const tx = this.db.transaction('operations', 'readwrite');
    const operation = await tx.store.get(id);
    if (operation) {
      operation.status = 'failed';
      operation.retries += 1;
      await tx.store.put(operation);
      console.error('[SyncQueue] Operation failed:', id, 'retries:', operation.retries);
    }
    await tx.done;
  }

  // Reset failed operation to pending (for manual retry)
  async retryFailed(id: string): Promise<void> {
    await this.init();
    if (!this.db) return;

    const tx = this.db.transaction('operations', 'readwrite');
    const operation = await tx.store.get(id);
    if (operation && operation.status === 'failed') {
      operation.status = 'pending';
      await tx.store.put(operation);
      console.log('[SyncQueue] Retrying operation:', id);
    }
    await tx.done;
  }

  // Clear all operations (use with caution!)
  async clear(): Promise<void> {
    await this.init();
    if (!this.db) return;

    await this.db.clear('operations');
    console.log('[SyncQueue] Cleared all operations');
  }

  // Get count of pending operations
  async getPendingCount(): Promise<number> {
    await this.init();
    if (!this.db) return 0;

    const tx = this.db.transaction('operations', 'readonly');
    const index = tx.store.index('by-status');
    const count = await index.count('pending');
    return count;
  }
}

// Export singleton instance
export const syncQueue = new SyncQueue();
