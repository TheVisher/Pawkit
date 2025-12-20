# Pawkit V2 Sync Implementation Plan

**Created**: December 20, 2025
**Status**: Ready for Implementation

---

## Current State

### What EXISTS ✅

**Local Layer (Complete)**
- Dexie database with 10 tables, proper indexes
- Sync metadata fields: `_synced`, `_lastModified`, `_deleted`, `_serverVersion`
- Sync queue table: `syncQueue`
- Helper functions: `createSyncMetadata()`, `markModified()`, `markSynced()`, `markDeleted()`
- Query helpers: `getPendingSyncItems()`, `getUnsyncedItems()`

**Zustand Stores (Complete)**
- `data-store.ts`: Cards + Collections CRUD with sync queue integration
- `workspace-store.ts`: Workspaces CRUD with sync queue integration
- `view-store.ts`: View settings CRUD with Dexie

**Prisma Schema (Complete)**
- All models defined: User, Workspace, Card, Collection, CollectionNote, CalendarEvent, Todo, UserViewSettings
- Indexes for efficient queries
- Soft delete pattern on all entities

### What's MISSING ❌

**API Routes (0% complete)**
- No CRUD endpoints for any entity
- No sync endpoints
- Only OAuth callback exists

**Sync Service (0% complete)**
- No queue processor
- No delta sync
- No conflict resolution implementation
- No cross-tab coordination

---

## Implementation Phases

### Phase 1: Core API Routes (Foundation)

Build the essential CRUD endpoints that the sync service will use.

```
app/api/
├── cards/
│   ├── route.ts          # GET (list), POST (create)
│   └── [id]/
│       └── route.ts      # GET (single), PATCH (update), DELETE (soft delete)
├── collections/
│   ├── route.ts          # GET (list), POST (create)
│   └── [id]/
│       └── route.ts      # GET, PATCH, DELETE
├── workspaces/
│   ├── route.ts          # GET (list), POST (create)
│   └── [id]/
│       └── route.ts      # GET, PATCH, DELETE
└── view-settings/
    └── route.ts          # GET, PUT (upsert by viewKey)
```

**Each endpoint must:**
1. Authenticate via session (NextAuth) or extension token
2. Filter by workspaceId (workspace isolation)
3. Return `updatedAt` for conflict detection
4. Support soft delete (`deleted: true`, `deletedAt: timestamp`)

**Example Card Route:**
```typescript
// app/api/cards/route.ts
export async function GET(req: Request) {
  const session = await auth();
  if (!session) return unauthorized();

  const { searchParams } = new URL(req.url);
  const workspaceId = searchParams.get('workspaceId');
  const since = searchParams.get('since'); // For delta sync

  const cards = await prisma.card.findMany({
    where: {
      workspaceId,
      workspace: { userId: session.user.id },
      ...(since && { updatedAt: { gt: new Date(since) } })
    }
  });

  return Response.json({ cards });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session) return unauthorized();

  const body = await req.json();

  // Verify workspace belongs to user
  const workspace = await prisma.workspace.findFirst({
    where: { id: body.workspaceId, userId: session.user.id }
  });
  if (!workspace) return forbidden();

  const card = await prisma.card.create({
    data: { ...body, id: body.id } // Accept client-generated cuid
  });

  return Response.json({ card });
}
```

---

### Phase 2: Sync Service

Build the client-side service that processes the sync queue.

**File:** `lib/services/sync-service.ts`

```typescript
class SyncService {
  private syncTimeout: NodeJS.Timeout | null = null;
  private readonly DEBOUNCE_MS = 2000;
  private syncChannel: BroadcastChannel;
  private isSyncing = false;

  constructor() {
    if (typeof window !== 'undefined') {
      this.syncChannel = new BroadcastChannel('pawkit-sync');
      this.syncChannel.onmessage = this.handleBroadcast.bind(this);
    }
  }

  // Queue an operation for sync
  queueSync(item: SyncQueueItem) {
    db.syncQueue.add(item);
    this.scheduleSync();
  }

  // Debounced sync trigger
  private scheduleSync() {
    if (this.syncTimeout) clearTimeout(this.syncTimeout);
    this.syncTimeout = setTimeout(() => this.processQueue(), this.DEBOUNCE_MS);
  }

  // Process all queued operations
  async processQueue() {
    if (this.isSyncing) return;

    // Check if user has serverSync enabled
    const user = useAuthStore.getState().user;
    if (!user?.serverSync) return;

    // Notify other tabs we're syncing
    this.syncChannel.postMessage({ type: 'SYNC_STARTED' });
    this.isSyncing = true;

    try {
      const items = await db.syncQueue.orderBy('createdAt').toArray();

      for (const item of items) {
        try {
          await this.syncItem(item);
          await db.syncQueue.delete(item.id);

          // Update entity's sync status
          await this.markSynced(item.entityType, item.entityId);

          this.syncChannel.postMessage({
            type: 'ITEM_SYNCED',
            entityType: item.entityType,
            entityId: item.entityId
          });
        } catch (error) {
          await this.handleSyncError(item, error);
        }
      }
    } finally {
      this.isSyncing = false;
      this.syncChannel.postMessage({ type: 'SYNC_COMPLETED' });
    }
  }

  private async syncItem(item: SyncQueueItem) {
    const endpoint = `/api/${item.entityType}s`;

    switch (item.operation) {
      case 'create':
        await fetch(endpoint, {
          method: 'POST',
          body: JSON.stringify(item.payload)
        });
        break;

      case 'update':
        await fetch(`${endpoint}/${item.entityId}`, {
          method: 'PATCH',
          body: JSON.stringify(item.payload)
        });
        break;

      case 'delete':
        await fetch(`${endpoint}/${item.entityId}`, {
          method: 'DELETE'
        });
        break;
    }
  }
}

export const syncService = new SyncService();
```

---

### Phase 3: Delta Sync Endpoint

Single endpoint for efficient app-load sync.

**File:** `app/api/sync/delta/route.ts`

```typescript
export async function GET(req: Request) {
  const session = await auth();
  if (!session) return unauthorized();

  const { searchParams } = new URL(req.url);
  const workspaceId = searchParams.get('workspaceId');
  const since = searchParams.get('since') || '1970-01-01';
  const sinceDate = new Date(since);

  // Fetch all entities modified since last sync
  const [cards, collections, events, todos, viewSettings] = await Promise.all([
    prisma.card.findMany({
      where: { workspaceId, updatedAt: { gt: sinceDate } }
    }),
    prisma.collection.findMany({
      where: { workspaceId, updatedAt: { gt: sinceDate } }
    }),
    prisma.calendarEvent.findMany({
      where: { workspaceId, updatedAt: { gt: sinceDate } }
    }),
    prisma.todo.findMany({
      where: { workspaceId, updatedAt: { gt: sinceDate } }
    }),
    prisma.userViewSettings.findMany({
      where: { workspaceId, updatedAt: { gt: sinceDate } }
    })
  ]);

  return Response.json({
    cards,
    collections,
    events,
    todos,
    viewSettings,
    serverTime: new Date().toISOString()
  });
}
```

---

### Phase 4: Initial Sync Flow

When user opens app, merge server state with local.

**File:** `lib/services/initial-sync.ts`

```typescript
export async function performInitialSync(workspaceId: string) {
  // 1. Get last sync time
  const lastSync = await db.metadata.get('lastSyncTime');

  // 2. Fetch delta from server
  const response = await fetch(
    `/api/sync/delta?workspaceId=${workspaceId}&since=${lastSync?.value || 0}`
  );
  const serverData = await response.json();

  // 3. Merge into Dexie with conflict resolution
  await db.transaction('rw', [db.cards, db.collections, db.events, db.todos, db.viewSettings], async () => {
    for (const serverCard of serverData.cards) {
      const localCard = await db.cards.get(serverCard.id);

      if (!localCard) {
        // New from server, add locally
        await db.cards.put({ ...serverCard, _synced: true });
      } else if (localCard._synced === false) {
        // Local has pending changes, resolve conflict
        const resolved = resolveConflict(localCard, serverCard);
        await db.cards.put(resolved);
      } else {
        // No local changes, accept server version
        await db.cards.put({ ...serverCard, _synced: true });
      }
    }

    // Similar for collections, events, todos, viewSettings...
  });

  // 4. Update last sync time
  await db.metadata.put({ key: 'lastSyncTime', value: serverData.serverTime });

  // 5. Push any local pending changes to server
  await syncService.processQueue();
}
```

---

### Phase 5: Conflict Resolution

Implement the documented conflict strategy.

**File:** `lib/services/conflict-resolution.ts`

```typescript
export function resolveConflict<T extends SyncableEntity>(
  local: T,
  server: T
): T {
  // PRIORITY 1: Deletion always wins
  if (local.deleted || server.deleted) {
    return { ...local, deleted: true, _synced: true };
  }

  // PRIORITY 2: If local has pending sync, compare timestamps
  if (!local._synced) {
    const localTime = new Date(local._lastModified);
    const serverTime = new Date(server.updatedAt);

    // Local is newer - keep local, push to server
    if (localTime > serverTime) {
      return { ...local, _synced: false };
    }
  }

  // PRIORITY 3: For cards, better metadata wins
  if ('metadata' in local) {
    const serverQuality = calculateMetadataQuality(server as Card);
    const localQuality = calculateMetadataQuality(local as Card);

    if (serverQuality > localQuality) {
      return { ...server, _synced: true, _serverVersion: server.updatedAt };
    }
  }

  // PRIORITY 4: Last-write-wins by timestamp
  if (new Date(server.updatedAt) > new Date(local._lastModified)) {
    return { ...server, _synced: true, _serverVersion: server.updatedAt };
  }

  // Local is newer or equal, keep local
  return { ...local, _synced: false };
}

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

## Implementation Order

1. **Phase 1a**: Card API routes (most used entity)
2. **Phase 1b**: Collection API routes
3. **Phase 1c**: Workspace API routes
4. **Phase 1d**: ViewSettings, CalendarEvent, Todo routes
5. **Phase 2**: Sync service with queue processor
6. **Phase 3**: Delta sync endpoint
7. **Phase 4**: Initial sync flow
8. **Phase 5**: Conflict resolution
9. **Phase 6**: Cross-tab coordination (BroadcastChannel)
10. **Phase 7**: Offline detection and retry logic

---

## Testing Strategy

### Unit Tests
- Conflict resolution logic
- Queue ordering
- Metadata quality calculation

### Integration Tests
- API route authentication
- Workspace isolation (can't access other user's data)
- Soft delete behavior

### E2E Tests
- Create on device A → appears on device B
- Offline edits → sync when online
- Conflict scenarios (edit same card on two devices)

---

## Success Metrics

- [ ] Cards sync between devices within 5 seconds
- [ ] No ghost cards (different counts across devices)
- [ ] Offline edits don't get lost
- [ ] Extension-created cards sync to web app
- [ ] Deletions propagate correctly (soft delete)

---

## Safety Reminders

Per `pawkit-v2-safety` skill:
- NEVER use `deleteMany()` without explicit filters
- ALWAYS use soft delete (`deleted: true`)
- NEVER run database migrations without user approval
- Store sync queue in Dexie, not memory (survives crashes)
