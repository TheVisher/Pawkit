import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { CardDTO } from '@/lib/server/cards';

// Default workspace ID (matches local-storage.ts)
export const DEFAULT_WORKSPACE_ID = 'default';

// Operation types that can be queued
export type OperationType = 'CREATE_CARD' | 'UPDATE_CARD' | 'DELETE_CARD' | 'CREATE_COLLECTION' | 'UPDATE_COLLECTION' | 'DELETE_COLLECTION';

// Operation-specific payload types
// Note: CreateCardPayload is just Partial<CardDTO> - the url/title are already in CardDTO
export type CreateCardPayload = Partial<CardDTO>;
export type UpdateCardPayload = Partial<CardDTO>;
export type DeleteCardPayload = { id: string };
export type CreateCollectionPayload = { name: string; parentId?: string | null };
export type UpdateCollectionPayload = { id: string; name?: string; parentId?: string | null };
export type DeleteCollectionPayload = { id: string };

// Legacy union type (kept for backwards compatibility)
export type QueueOperationPayload =
  | CreateCardPayload
  | UpdateCardPayload
  | DeleteCardPayload
  | CreateCollectionPayload
  | UpdateCollectionPayload
  | DeleteCollectionPayload;

// Base fields shared by all operations (used internally for storage)
interface BaseOperationFields {
  id: string;
  timestamp: number;
  retries: number;
  status: 'pending' | 'processing' | 'failed';
}

// Discriminated union types for type-safe operations
export type CreateCardOperation = BaseOperationFields & {
  type: 'CREATE_CARD';
  payload: CreateCardPayload;
  tempId: string;
  targetId?: undefined;
};

export type UpdateCardOperation = BaseOperationFields & {
  type: 'UPDATE_CARD';
  payload: UpdateCardPayload;
  targetId: string;
  tempId?: undefined;
};

export type DeleteCardOperation = BaseOperationFields & {
  type: 'DELETE_CARD';
  payload: DeleteCardPayload;
  targetId: string;
  tempId?: undefined;
};

export type CreateCollectionOperation = BaseOperationFields & {
  type: 'CREATE_COLLECTION';
  payload: CreateCollectionPayload;
  tempId: string;
  targetId?: undefined;
};

export type UpdateCollectionOperation = BaseOperationFields & {
  type: 'UPDATE_COLLECTION';
  payload: UpdateCollectionPayload;
  targetId: string;
  tempId?: undefined;
};

export type DeleteCollectionOperation = BaseOperationFields & {
  type: 'DELETE_COLLECTION';
  payload: DeleteCollectionPayload;
  targetId: string;
  tempId?: undefined;
};

// Discriminated union of all operation types
export type QueueOperation =
  | CreateCardOperation
  | UpdateCardOperation
  | DeleteCardOperation
  | CreateCollectionOperation
  | UpdateCollectionOperation
  | DeleteCollectionOperation;

// Input types for enqueue (without auto-generated fields)
type EnqueueInput<T extends QueueOperation> = Omit<T, 'id' | 'timestamp' | 'retries' | 'status'>;

export type CreateCardInput = EnqueueInput<CreateCardOperation>;
export type UpdateCardInput = EnqueueInput<UpdateCardOperation>;
export type DeleteCardInput = EnqueueInput<DeleteCardOperation>;
export type CreateCollectionInput = EnqueueInput<CreateCollectionOperation>;
export type UpdateCollectionInput = EnqueueInput<UpdateCollectionOperation>;
export type DeleteCollectionInput = EnqueueInput<DeleteCollectionOperation>;

export type QueueOperationInput =
  | CreateCardInput
  | UpdateCardInput
  | DeleteCardInput
  | CreateCollectionInput
  | UpdateCollectionInput
  | DeleteCollectionInput;

// Type-safe builder functions to prevent type/payload mismatches
export function createCardOp(tempId: string, payload: CreateCardPayload): CreateCardInput {
  return { type: 'CREATE_CARD', tempId, payload };
}

export function updateCardOp(targetId: string, payload: UpdateCardPayload): UpdateCardInput {
  return { type: 'UPDATE_CARD', targetId, payload };
}

export function deleteCardOp(targetId: string, payload: DeleteCardPayload = { id: targetId }): DeleteCardInput {
  return { type: 'DELETE_CARD', targetId, payload };
}

export function createCollectionOp(tempId: string, payload: CreateCollectionPayload): CreateCollectionInput {
  return { type: 'CREATE_COLLECTION', tempId, payload };
}

export function updateCollectionOp(targetId: string, payload: UpdateCollectionPayload): UpdateCollectionInput {
  return { type: 'UPDATE_COLLECTION', targetId, payload };
}

export function deleteCollectionOp(targetId: string, payload: DeleteCollectionPayload = { id: targetId }): DeleteCollectionInput {
  return { type: 'DELETE_COLLECTION', targetId, payload };
}

// Type guards for narrowing operation types
export function isCreateCardOp(op: QueueOperation): op is CreateCardOperation {
  return op.type === 'CREATE_CARD';
}

export function isUpdateCardOp(op: QueueOperation): op is UpdateCardOperation {
  return op.type === 'UPDATE_CARD';
}

export function isDeleteCardOp(op: QueueOperation): op is DeleteCardOperation {
  return op.type === 'DELETE_CARD';
}

export function isCardOperation(op: QueueOperation): op is CreateCardOperation | UpdateCardOperation | DeleteCardOperation {
  return op.type === 'CREATE_CARD' || op.type === 'UPDATE_CARD' || op.type === 'DELETE_CARD';
}

export function isCollectionOperation(op: QueueOperation): op is CreateCollectionOperation | UpdateCollectionOperation | DeleteCollectionOperation {
  return op.type === 'CREATE_COLLECTION' || op.type === 'UPDATE_COLLECTION' || op.type === 'DELETE_COLLECTION';
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
  private userId: string | null = null;
  private workspaceId: string | null = null;
  private readonly DB_VERSION = 1;

  /**
   * Get user-specific database name with workspace support
   */
  private getDbName(): string {
    if (!this.userId) {
      throw new Error('[SyncQueue] userId not initialized - cannot get database name');
    }
    if (!this.workspaceId) {
      throw new Error('[SyncQueue] workspaceId not initialized - cannot get database name');
    }
    return `pawkit-${this.userId}-${this.workspaceId}-sync-queue`;
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
      console.log('[SyncQueue] Switching context, closing old database', {
        from: { userId: this.userId, workspaceId: this.workspaceId },
        to: { userId, workspaceId }
      });
      this.db.close();
      this.db = null;
    }

    this.userId = userId;
    this.workspaceId = workspaceId;

    this.db = await openDB<SyncQueueDB>(this.getDbName(), this.DB_VERSION, {
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

  /**
   * Clear ALL workspace data for a specific user (used on logout)
   * This deletes all workspace sync queues for the user
   */
  async clearUserData(userId: string): Promise<void> {

    // Get all databases and find ones matching this user
    const databases = await indexedDB.databases();
    const userDatabases = databases.filter(db =>
      db.name?.startsWith(`pawkit-${userId}-`) && db.name?.endsWith('-sync-queue')
    );


    // Delete all workspace databases for this user
    for (const db of userDatabases) {
      if (db.name) {
        await indexedDB.deleteDatabase(db.name);
      }
    }
  }

  /**
   * Clear data for a specific workspace
   */
  async clearWorkspaceData(userId: string, workspaceId: string): Promise<void> {
    const dbName = `pawkit-${userId}-${workspaceId}-sync-queue`;
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

  // Add operation to queue
  async enqueue(operation: QueueOperationInput): Promise<string> {
    if (!this.db) {
      throw new Error('[SyncQueue] Database not initialized. Call init(userId, workspaceId) first.');
    }

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
    return id;
  }

  // Get all pending operations
  async getPending(): Promise<QueueOperation[]> {
    if (!this.db) {
      throw new Error('[SyncQueue] Database not initialized. Call init(userId, workspaceId) first.');
    }

    const tx = this.db.transaction('operations', 'readonly');
    const index = tx.store.index('by-status');
    const operations = await index.getAll('pending');

    // Sort by timestamp to process in order
    return operations.sort((a, b) => a.timestamp - b.timestamp);
  }

  // Mark operation as processing
  async markProcessing(id: string): Promise<void> {
    if (!this.db) {
      throw new Error('[SyncQueue] Database not initialized. Call init(userId, workspaceId) first.');
    }

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
    if (!this.db) {
      throw new Error('[SyncQueue] Database not initialized. Call init(userId, workspaceId) first.');
    }

    await this.db.delete('operations', id);
  }

  // Remove operation by type and target ID (for immediate sync success)
  async removeByTarget(type: OperationType, targetId: string): Promise<void> {
    if (!this.db) {
      throw new Error('[SyncQueue] Database not initialized. Call init(userId, workspaceId) first.');
    }

    const operations = await this.db.getAll('operations');
    const toRemove = operations.filter(op =>
      op.type === type && op.targetId === targetId
    );

    for (const op of toRemove) {
      await this.db.delete('operations', op.id);
    }
  }

  // Remove operation by tempId (for CREATE operations that succeeded immediately)
  async removeByTempId(tempId: string): Promise<void> {
    if (!this.db) {
      throw new Error('[SyncQueue] Database not initialized. Call init(userId, workspaceId) first.');
    }

    const operations = await this.db.getAll('operations');
    const toRemove = operations.filter(op => op.tempId === tempId);

    for (const op of toRemove) {
      await this.db.delete('operations', op.id);
    }
  }

  // Mark operation as failed
  async markFailed(id: string): Promise<void> {
    if (!this.db) {
      throw new Error('[SyncQueue] Database not initialized. Call init(userId, workspaceId) first.');
    }

    const tx = this.db.transaction('operations', 'readwrite');
    const operation = await tx.store.get(id);
    if (operation) {
      operation.status = 'failed';
      operation.retries += 1;
      await tx.store.put(operation);
    }
    await tx.done;
  }

  // Reset failed operation to pending (for manual retry)
  async retryFailed(id: string): Promise<void> {
    if (!this.db) {
      throw new Error('[SyncQueue] Database not initialized. Call init(userId, workspaceId) first.');
    }

    const tx = this.db.transaction('operations', 'readwrite');
    const operation = await tx.store.get(id);
    if (operation && operation.status === 'failed') {
      operation.status = 'pending';
      await tx.store.put(operation);
    }
    await tx.done;
  }

  // Clear all operations (use with caution!)
  async clear(): Promise<void> {
    if (!this.db) {
      throw new Error('[SyncQueue] Database not initialized. Call init(userId, workspaceId) first.');
    }

    await this.db.clear('operations');
  }

  // Get count of pending operations
  async getPendingCount(): Promise<number> {
    if (!this.db) {
      return 0;
    }

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


    for (const operation of pending) {
      try {
        // Skip file cards - they're local-only and should never be synced
        // With discriminated unions, payload is automatically narrowed based on type
        if (operation.type === 'CREATE_CARD' || operation.type === 'UPDATE_CARD') {
          // TypeScript now knows operation.payload is CreateCardPayload | UpdateCardPayload
          const isFileCard = operation.payload.type === 'file' || operation.payload.isFileCard === true;
          if (isFileCard) {
            console.log('[SyncQueue] Skipping file card operation:', operation.id);
            await this.remove(operation.id);
            continue;
          }
        }

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
            // TypeScript exhaustive check - all types handled above
            const _exhaustiveCheck: never = operation;
            throw new Error(`Unknown operation type: ${(_exhaustiveCheck as QueueOperation).type}`);
        }

        if (response.ok) {
          await this.remove(operation.id);
          success++;
        } else {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
      } catch (error) {
        await this.markFailed(operation.id);
        failed++;

        // Stop processing if too many failures (likely offline)
        if (failed >= 3) {
          break;
        }
      }
    }

    return { success, failed };
  }
}

// Export singleton instance
export const syncQueue = new SyncQueue();
