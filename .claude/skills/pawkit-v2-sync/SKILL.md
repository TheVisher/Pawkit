# Pawkit V2 Sync System

**Purpose**: Dexie patterns, sync queue, conflict resolution, cross-tab coordination

**Created**: December 20, 2025

---

## ARCHITECTURE OVERVIEW

```
User Action (click, type, drag)
       ↓
   Zustand Store (immediate UI update)
       ↓
   Dexie.js (persist to IndexedDB)
       ↓
   UI renders (instant, from local data)
       ↓
   Sync Queue (debounced, 2s)
       ↓
   Background API Call
       ↓
   Supabase (server backup)
       ↓
   Other devices (via next sync)
```

---

## SYNC QUEUE

### Queue Item Structure

```typescript
interface SyncQueueItem {
  id?: number;
  entityType: 'card' | 'collection' | 'event' | 'todo';
  entityId: string;
  operation: 'create' | 'update' | 'delete';
  payload: any;
  createdAt: Date;
  attempts: number;
  lastError?: string;
}
```

### Retry Configuration

```typescript
const SYNC_RETRY_CONFIG = {
  maxAttempts: 3,
  backoffMs: [1000, 5000, 15000],  // Exponential backoff
  giveUpAfterMs: 24 * 60 * 60 * 1000  // Give up after 24 hours
};
```

---

## DATA CHANGE FLOW

```typescript
async function updateCard(id: string, updates: Partial<Card>) {
  // 1. Update Dexie immediately
  await db.cards.update(id, {
    ...updates,
    updatedAt: new Date().toISOString(),
    _pendingSync: true
  });

  // 2. Update Zustand (triggers re-render)
  cardsStore.getState().updateCard(id, updates);

  // 3. Queue sync (debounced)
  syncService.queueSync({
    entityType: 'card',
    entityId: id,
    operation: 'update',
    payload: updates
  });
}
```

---

## SYNC SERVICE

```typescript
class SyncService {
  private syncTimeout: NodeJS.Timeout | null = null;
  private readonly DEBOUNCE_MS = 2000;
  private syncChannel = new BroadcastChannel('pawkit-sync');

  queueSync(item: Omit<SyncQueueItem, 'id' | 'createdAt' | 'attempts'>) {
    // Add to queue
    db.syncQueue.add({
      ...item,
      createdAt: new Date(),
      attempts: 0
    });

    // Debounce actual sync
    this.scheduleSync();
  }

  private scheduleSync() {
    if (this.syncTimeout) clearTimeout(this.syncTimeout);
    this.syncTimeout = setTimeout(() => this.processQueue(), this.DEBOUNCE_MS);
  }

  private async processQueue() {
    const items = await db.syncQueue.orderBy('createdAt').toArray();

    for (const item of items) {
      try {
        await this.syncItem(item);
        await db.syncQueue.delete(item.id);

        // Notify other tabs
        this.syncChannel.postMessage({
          type: 'ITEM_SYNCED',
          entityId: item.entityId
        });
      } catch (error) {
        await this.handleSyncError(item, error);
      }
    }
  }
}
```

---

## CONFLICT RESOLUTION

### Strategy: Last-write-wins with smart priorities

```typescript
function resolveConflict(local: Card, server: Card): Card {
  // PRIORITY 1: Deletion always wins
  if (local.deleted || server.deleted) {
    return {
      ...(local.deleted ? local : server),
      deleted: true,
      _pendingSync: false
    };
  }

  // PRIORITY 2: Active device wins over stale server
  const deviceMeta = getDeviceMetadata();
  const serverIsStale = isTimestampStale(server.updatedAt, 24 * 60 * 60 * 1000);

  if (deviceMeta.isActive && serverIsStale) {
    return { ...local, _pendingSync: true };
  }

  // PRIORITY 3: Better metadata wins
  const serverQuality = calculateMetadataQuality(server);
  const localQuality = calculateMetadataQuality(local);

  if (serverQuality > localQuality) {
    return { ...server, _pendingSync: false, _serverVersion: server.updatedAt };
  }

  // PRIORITY 4: Last-write-wins by timestamp
  if (new Date(server.updatedAt) > new Date(local.updatedAt)) {
    return { ...server, _pendingSync: false, _serverVersion: server.updatedAt };
  }

  // Local is newer, keep local, mark for sync
  return { ...local, _pendingSync: true };
}
```

### Metadata Quality Scoring

```typescript
function calculateMetadataQuality(card: Card): number {
  let score = 0;
  if (card.title) score += 10;
  if (card.description) score += 10;
  if (card.image) score += 15;
  if (card.articleContent) score += 20;
  if (card.metadata) score += 5;
  return score;
}
```

---

## CROSS-TAB COORDINATION

```typescript
// lib/services/sync-service.ts
const syncChannel = new BroadcastChannel('pawkit-sync');

syncChannel.onmessage = (event) => {
  switch (event.data.type) {
    case 'SYNC_STARTED':
      // Prevent duplicate syncs from multiple tabs
      break;
    case 'ITEM_SYNCED':
      // Refresh local state if needed
      refreshEntity(event.data.entityId);
      break;
    case 'CONFLICT_DETECTED':
      // Show notification in this tab too
      conflictStore.getState().addConflict(event.data.conflict);
      break;
  }
};
```

---

## DELTA SYNC ON APP LOAD

```typescript
async function initialSync(workspaceId: string) {
  // Get last sync time
  const lastSync = await db.metadata.get('lastSyncTime');

  // Fetch only changed items from server
  const response = await fetch(
    `/api/sync/delta?since=${lastSync?.value || 0}&workspaceId=${workspaceId}`
  );
  const { cards, collections, events, todos, deletedIds } = await response.json();

  // Merge server changes into local
  await db.transaction('rw', [db.cards, db.collections, db.events, db.todos], async () => {
    for (const card of cards) {
      const local = await db.cards.get(card.id);
      if (!local || !local._pendingSync) {
        await db.cards.put(card);
      }
      // If local has pending changes, don't overwrite
    }
    // Handle deletions
    for (const { type, id } of deletedIds) {
      await db[type + 's'].update(id, { deleted: true, deletedAt: new Date() });
    }
  });

  // Update last sync time
  await db.metadata.put({ key: 'lastSyncTime', value: Date.now() });

  // Push local pending changes
  await syncService.processQueue();
}
```

---

## CONFLICT NOTIFICATION STORE

```typescript
// lib/stores/conflict-store.ts
interface ConflictNotification {
  id: string;
  message: string;
  cardId?: string;
  timestamp: Date;
  type: 'sync' | 'edit' | 'delete' | 'metadata';
}

interface ConflictStore {
  conflicts: ConflictNotification[];
  addConflict: (conflict: Omit<ConflictNotification, 'id' | 'timestamp'>) => void;
  dismissConflict: (id: string) => void;
  clearAll: () => void;
}

// Auto-dismiss after 10 seconds
```

---

## OFFLINE BEHAVIOR

1. All CRUD operations work offline
2. Operations queued in sync queue
3. When online, queue processes in order
4. Network status monitored via `navigator.onLine`
5. User can disable server sync entirely (`serverSync` toggle)

---

## LOCAL-ONLY MODE

```typescript
// User preference stored in User model
model User {
  serverSync Boolean @default(true)
}

// Check before syncing
if (!userStore.getState().user?.serverSync) {
  // Skip sync, data stays local only
  return;
}
```

---

## KEY PATTERNS

### Always mark pending before sync
```typescript
await db.cards.update(id, {
  ...updates,
  _pendingSync: true
});
```

### Clear pending after successful sync
```typescript
await db.cards.update(id, {
  _pendingSync: false,
  _serverVersion: serverResponse.updatedAt
});
```

### Use transactions for batch operations
```typescript
await db.transaction('rw', [db.cards, db.collections], async () => {
  // All or nothing
});
```

---

**Last Updated**: December 20, 2025
