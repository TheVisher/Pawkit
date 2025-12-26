import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { db } from '@/lib/db';
import type { SyncQueueItem } from '@/lib/db';

// Mock the stores before importing sync service
vi.mock('@/lib/stores/sync-store', () => ({
  useSyncStore: {
    getState: () => ({
      startSync: vi.fn(),
      finishSync: vi.fn(),
      goOffline: vi.fn(),
      setLastSyncTime: vi.fn(),
      setPendingCount: vi.fn(),
      setStatus: vi.fn(),
    }),
  },
}));

vi.mock('@/lib/stores/toast-store', () => ({
  useToastStore: {
    getState: () => ({
      toast: vi.fn(),
    }),
  },
}));

vi.mock('@/lib/stores/data-store', () => ({
  useDataStore: {
    getState: () => ({}),
    setState: vi.fn(),
  },
}));

// Import after mocks
import { syncService } from './sync-service';
import { pullEntity, upsertItems } from './entity-sync';
import {
  processQueue,
  addToQueue,
  getFailedCount,
  clearFailedItems,
  retryFailedItems,
} from '../sync-queue';

describe('Sync Service', () => {
  beforeEach(async () => {
    // Clear all tables before each test
    await db.workspaces.clear();
    await db.collections.clear();
    await db.cards.clear();
    await db.calendarEvents.clear();
    await db.todos.clear();
    await db.syncQueue.clear();
    await db.metadata.clear();

    // Reset navigator.onLine
    Object.defineProperty(navigator, 'onLine', { value: true, writable: true });

    // Reset fetch mock
    vi.mocked(global.fetch).mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Workspace Management', () => {
    it('should set and get workspace ID', () => {
      syncService.setWorkspace('workspace-123');
      expect(syncService.getWorkspaceId()).toBe('workspace-123');
    });

    it('should allow setting workspace to null', () => {
      syncService.setWorkspace('workspace-123');
      syncService.setWorkspace(null);
      expect(syncService.getWorkspaceId()).toBeNull();
    });
  });

  describe('Last Sync Time', () => {
    it('should return null when no sync has occurred', async () => {
      const lastSync = await syncService.getLastSyncTime();
      expect(lastSync).toBeNull();
    });

    it('should store and retrieve last sync time', async () => {
      // Set a sync time by adding metadata directly
      const testTime = new Date('2025-01-01T00:00:00Z');
      await db.metadata.put({
        key: 'lastSyncTime',
        value: testTime.toISOString(),
      });

      const lastSync = await syncService.getLastSyncTime();
      expect(lastSync?.toISOString()).toBe(testTime.toISOString());
    });
  });

  describe('Offline Handling', () => {
    it('should skip sync when offline', async () => {
      Object.defineProperty(navigator, 'onLine', { value: false });
      syncService.setWorkspace('workspace-123');

      await syncService.fullSync();

      // Fetch should not be called when offline
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });
});

describe('Entity Sync - Conflict Resolution (Last-Write-Wins)', () => {
  beforeEach(async () => {
    await db.cards.clear();
    await db.syncQueue.clear();
  });

  it('should skip server items when local changes are pending', async () => {
    // Add a pending local change to the queue
    await db.syncQueue.add({
      entityType: 'card',
      entityId: 'card-123',
      operation: 'update',
      payload: { title: 'Local Title' },
      retryCount: 0,
      createdAt: new Date(),
    });

    // Simulate server items coming in
    const serverItems = [
      {
        id: 'card-123',
        workspaceId: 'ws-1',
        type: 'url',
        url: 'https://example.com',
        title: 'Server Title', // Server has different title
        status: 'READY',
        tags: [],
        collections: [],
        pinned: false,
        deleted: false,
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z',
      },
    ];

    await upsertItems('cards', serverItems);

    // Card should NOT be in local DB because local changes are pending
    const card = await db.cards.get('card-123');
    expect(card).toBeUndefined();
  });

  it('should accept server items when no local changes are pending', async () => {
    // No pending changes in queue

    const serverItems = [
      {
        id: 'card-456',
        workspaceId: 'ws-1',
        type: 'url',
        url: 'https://example.com',
        title: 'Server Title',
        status: 'READY',
        tags: [],
        collections: [],
        pinned: false,
        deleted: false,
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z',
      },
    ];

    await upsertItems('cards', serverItems);

    // Card SHOULD be in local DB
    const card = await db.cards.get('card-456');
    expect(card).toBeDefined();
    expect(card?.title).toBe('Server Title');
    expect(card?._synced).toBe(true);
  });

  it('should mark server items as deleted when deleted flag is true', async () => {
    const serverItems = [
      {
        id: 'card-789',
        workspaceId: 'ws-1',
        type: 'url',
        url: 'https://example.com',
        title: 'Deleted Card',
        status: 'READY',
        tags: [],
        collections: [],
        pinned: false,
        deleted: true, // Marked as deleted on server
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z',
      },
    ];

    await upsertItems('cards', serverItems);

    const card = await db.cards.get('card-789');
    expect(card).toBeDefined();
    expect(card?._deleted).toBe(true);
  });
});

describe('Queue Processing - Retry Logic', () => {
  beforeEach(async () => {
    await db.syncQueue.clear();
    await db.cards.clear();
    Object.defineProperty(navigator, 'onLine', { value: true });
  });

  it('should process queue items in FIFO order', async () => {
    // Add items to queue in order
    await db.syncQueue.add({
      entityType: 'card',
      entityId: 'card-1',
      operation: 'create',
      retryCount: 0,
      createdAt: new Date('2025-01-01T00:00:00Z'),
    });

    await db.syncQueue.add({
      entityType: 'card',
      entityId: 'card-2',
      operation: 'create',
      retryCount: 0,
      createdAt: new Date('2025-01-01T00:00:01Z'),
    });

    // Add cards to local DB for create operations
    await db.cards.add({
      id: 'card-1',
      workspaceId: 'ws-1',
      type: 'url',
      url: 'https://example1.com',
      status: 'READY',
      tags: [],
      collections: [],
      pinned: false,
      _synced: false,
      _lastModified: new Date(),
      _deleted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await db.cards.add({
      id: 'card-2',
      workspaceId: 'ws-1',
      type: 'url',
      url: 'https://example2.com',
      status: 'READY',
      tags: [],
      collections: [],
      pinned: false,
      _synced: false,
      _lastModified: new Date(),
      _deleted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Mock successful API responses
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({}),
    } as Response);

    const result = await processQueue();

    expect(result.processed).toBe(2);
    expect(result.failed).toBe(0);

    // Queue should be empty
    const remaining = await db.syncQueue.toArray();
    expect(remaining.length).toBe(0);
  });

  it('should increment retry count on failure', async () => {
    await db.syncQueue.add({
      entityType: 'card',
      entityId: 'card-fail',
      operation: 'update',
      payload: { title: 'Updated' },
      retryCount: 0,
      createdAt: new Date(),
    });

    // Mock API failure
    vi.mocked(global.fetch).mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => 'Internal Server Error',
    } as Response);

    await processQueue();

    const items = await db.syncQueue.toArray();
    expect(items.length).toBe(1);
    expect(items[0].retryCount).toBe(1);
    expect(items[0].lastError).toBe('API error 500: Internal Server Error');
  });

  it('should park items after max retries (3)', async () => {
    await db.syncQueue.add({
      entityType: 'card',
      entityId: 'card-park',
      operation: 'update',
      payload: { title: 'Updated' },
      retryCount: 2, // Already failed twice
      createdAt: new Date(),
    });

    // Mock API failure
    vi.mocked(global.fetch).mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => 'Internal Server Error',
    } as Response);

    const result = await processQueue();

    expect(result.failed).toBe(1);

    const items = await db.syncQueue.toArray();
    expect(items[0].retryCount).toBe(3); // Now at max retries

    // Item should be parked (not processed in future runs)
    const failedCount = await getFailedCount();
    expect(failedCount).toBe(1);
  });

  it('should skip processing when offline', async () => {
    Object.defineProperty(navigator, 'onLine', { value: false });

    await db.syncQueue.add({
      entityType: 'card',
      entityId: 'card-offline',
      operation: 'create',
      retryCount: 0,
      createdAt: new Date(),
    });

    const result = await processQueue();

    expect(result.processed).toBe(0);
    expect(global.fetch).not.toHaveBeenCalled();
  });
});

describe('Queue Management - Failed Sync Parking', () => {
  beforeEach(async () => {
    await db.syncQueue.clear();
  });

  it('should count failed items correctly', async () => {
    // Add items with different retry counts
    await db.syncQueue.add({
      entityType: 'card',
      entityId: 'card-ok',
      operation: 'update',
      retryCount: 1, // Still retrying
      createdAt: new Date(),
    });

    await db.syncQueue.add({
      entityType: 'card',
      entityId: 'card-failed',
      operation: 'update',
      retryCount: 3, // Max retries reached
      createdAt: new Date(),
    });

    const failedCount = await getFailedCount();
    expect(failedCount).toBe(1);
  });

  it('should clear failed items', async () => {
    await db.syncQueue.add({
      entityType: 'card',
      entityId: 'card-failed-1',
      operation: 'update',
      retryCount: 3,
      createdAt: new Date(),
    });

    await db.syncQueue.add({
      entityType: 'card',
      entityId: 'card-pending',
      operation: 'update',
      retryCount: 1,
      createdAt: new Date(),
    });

    await clearFailedItems();

    const items = await db.syncQueue.toArray();
    expect(items.length).toBe(1);
    expect(items[0].entityId).toBe('card-pending');
  });

  it('should retry failed items by resetting retry count', async () => {
    await db.syncQueue.add({
      entityType: 'card',
      entityId: 'card-retry',
      operation: 'update',
      retryCount: 3,
      lastError: 'Previous error',
      createdAt: new Date(),
    });

    await retryFailedItems();

    const items = await db.syncQueue.toArray();
    expect(items[0].retryCount).toBe(0);
    expect(items[0].lastError).toBeUndefined();
  });
});

describe('Queue Merging', () => {
  beforeEach(async () => {
    await db.syncQueue.clear();
  });

  it('should merge update operations for same entity', async () => {
    await addToQueue('card', 'card-merge', 'update', { title: 'First' });
    await addToQueue('card', 'card-merge', 'update', { description: 'Second' });

    const items = await db.syncQueue.toArray();
    expect(items.length).toBe(1);
    expect(items[0].payload).toEqual({ title: 'First', description: 'Second' });
  });

  it('should keep create when update follows', async () => {
    await addToQueue('card', 'card-new', 'create');
    await addToQueue('card', 'card-new', 'update', { title: 'Updated' });

    const items = await db.syncQueue.toArray();
    expect(items.length).toBe(1);
    expect(items[0].operation).toBe('create');
  });

  it('should remove queue item when delete follows create', async () => {
    await addToQueue('card', 'card-temp', 'create');
    await addToQueue('card', 'card-temp', 'delete');

    const items = await db.syncQueue.toArray();
    expect(items.length).toBe(0);
  });

  it('should replace update with delete', async () => {
    await addToQueue('card', 'card-delete', 'update', { title: 'Updated' });
    await addToQueue('card', 'card-delete', 'delete');

    const items = await db.syncQueue.toArray();
    expect(items.length).toBe(1);
    expect(items[0].operation).toBe('delete');
    expect(items[0].payload).toBeUndefined();
  });
});

describe('Cross-Tab Sync via BroadcastChannel', () => {
  it('should have BroadcastChannel initialized', () => {
    // The mock BroadcastChannel should be available
    expect(BroadcastChannel).toBeDefined();
  });

  it('should handle sync-complete message', () => {
    // This test verifies the BroadcastChannel is set up correctly
    // In real usage, other tabs receiving 'sync-complete' would refresh from IndexedDB
    const channel = new BroadcastChannel('pawkit-sync');
    expect(channel.name).toBe('pawkit-sync');
    channel.close();
  });
});

describe('API Error Handling', () => {
  beforeEach(async () => {
    await db.syncQueue.clear();
    await db.cards.clear();
    Object.defineProperty(navigator, 'onLine', { value: true });
  });

  it('should handle 401 errors without retry', async () => {
    await db.syncQueue.add({
      entityType: 'card',
      entityId: 'card-auth',
      operation: 'update',
      payload: { title: 'Updated' },
      retryCount: 0,
      createdAt: new Date(),
    });

    vi.mocked(global.fetch).mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => 'Unauthorized',
    } as Response);

    await processQueue();

    // Item should still be in queue but with error
    const items = await db.syncQueue.toArray();
    expect(items[0].lastError).toContain('Not authenticated');
  });

  it('should remove queue item on 404 for update/delete', async () => {
    await db.syncQueue.add({
      entityType: 'card',
      entityId: 'card-404',
      operation: 'update',
      payload: { title: 'Updated' },
      retryCount: 0,
      createdAt: new Date(),
    });

    vi.mocked(global.fetch).mockResolvedValue({
      ok: false,
      status: 404,
      text: async () => 'Not Found',
    } as Response);

    await processQueue();

    // Item should be removed (entity doesn't exist on server)
    const items = await db.syncQueue.toArray();
    expect(items.length).toBe(0);
  });

  it('should handle idempotent create (200 response)', async () => {
    await db.syncQueue.add({
      entityType: 'card',
      entityId: 'card-exists',
      operation: 'create',
      retryCount: 0,
      createdAt: new Date(),
    });

    await db.cards.add({
      id: 'card-exists',
      workspaceId: 'ws-1',
      type: 'url',
      url: 'https://example.com',
      status: 'READY',
      tags: [],
      collections: [],
      pinned: false,
      _synced: false,
      _lastModified: new Date(),
      _deleted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // 200 means already exists - should be treated as success
    vi.mocked(global.fetch).mockResolvedValue({
      ok: false,
      status: 200,
      json: async () => ({}),
    } as Response);

    await processQueue();

    // Item should be removed from queue
    const items = await db.syncQueue.toArray();
    expect(items.length).toBe(0);

    // Card should be marked as synced
    const card = await db.cards.get('card-exists');
    expect(card?._synced).toBe(true);
  });
});
