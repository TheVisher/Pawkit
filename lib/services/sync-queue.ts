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

    // Check for duplicate pending operations
    const existing = await this.db.getAll('operations');
    const duplicate = existing.find(op => {
      // Same operation type
      if (op.type !== operation.type) return false;

      // For updates/deletes, check if targeting same resource
      if ((op.type === 'UPDATE_CARD' || op.type === 'DELETE_CARD' ||
           op.type === 'UPDATE_COLLECTION' || op.type === 'DELETE_COLLECTION') &&
          op.targetId === operation.targetId &&
          (op.status === 'pending' || op.status === 'processing')) {
        return true;
      }

      // For creates, check if same temp ID (prevents duplicate creates)
      if ((op.type === 'CREATE_CARD' || op.type === 'CREATE_COLLECTION') &&
          op.tempId === operation.tempId &&
          (op.status === 'pending' || op.status === 'processing')) {
        return true;
      }

      return false;
    });

    if (duplicate) {
      console.log('[SyncQueue] Duplicate operation detected, skipping:', duplicate.id);
      return duplicate.id; // Return existing operation ID
    }

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

  // Process all pending operations
  async process(): Promise<{ success: number; failed: number }> {
    const pending = await this.getPending();
    let success = 0;
    let failed = 0;

    console.log('[SyncQueue] Processing', pending.length, 'operations');

    for (const operation of pending) {
      try {
        await this.markProcessing(operation.id);

        // Process based on operation type
        let response: Response;
        switch (operation.type) {
          case 'CREATE_CARD':
            response = await fetch('/api/cards', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(operation.payload),
            });
            break;

          case 'UPDATE_CARD':
            response = await fetch(`/api/cards/${operation.targetId}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(operation.payload),
            });
            break;

          case 'DELETE_CARD':
            response = await fetch(`/api/cards/${operation.targetId}`, {
              method: 'DELETE',
            });
            break;

          case 'CREATE_COLLECTION':
            response = await fetch('/api/pawkits', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(operation.payload),
            });
            break;

          case 'UPDATE_COLLECTION':
            response = await fetch(`/api/pawkits/${operation.targetId}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(operation.payload),
            });
            break;

          case 'DELETE_COLLECTION':
            response = await fetch(`/api/pawkits/${operation.targetId}`, {
              method: 'DELETE',
            });
            break;

          default:
            throw new Error(`Unknown operation type: ${operation.type}`);
        }

        if (response.ok) {
          await this.remove(operation.id);
          success++;
          console.log('[SyncQueue] Operation completed:', operation.id);
        } else {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
      } catch (error) {
        console.error('[SyncQueue] Operation failed:', operation.id, error);
        await this.markFailed(operation.id);
        failed++;

        // Stop processing if too many failures (likely offline)
        if (failed >= 3) {
          console.error('[SyncQueue] Too many failures, stopping');
          break;
        }
      }
    }

    console.log('[SyncQueue] Processing complete:', { success, failed });
    return { success, failed };
  }
}

// Export singleton instance
export const syncQueue = new SyncQueue();
