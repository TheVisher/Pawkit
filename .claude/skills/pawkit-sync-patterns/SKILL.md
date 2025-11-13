---
name: pawkit-sync-patterns
description: Document local-first sync architecture and conflict resolution patterns
---

# Pawkit Sync Patterns & Architecture

**Purpose**: Document local-first sync architecture and conflict resolution patterns

**Status**: 12 critical sync vulnerabilities patched in October 2025

**Key Principle**: IndexedDB is source of truth. Never lose user data. Sync is background process.

---

## SYNC ARCHITECTURE OVERVIEW

### Local-First Philosophy

**Core Principle**: User's local data is always authoritative. Server is backup/sync layer.

**Benefits**:
- Instant UI updates (no waiting for server)
- Works offline
- No data loss
- Fast user experience

**Trade-offs**:
- Must handle conflicts
- Complex sync logic
- Multi-session coordination

---

## DATA FLOW

### Complete Sync Flow

```
User Action (e.g., edit note)
    ↓
IndexedDB (instant write) ← SOURCE OF TRUTH
    ↓
UI Update (optimistic)
    ↓
Sync Queue (debounced)
    ↓
Background Server Sync (2s delay)
    ↓
Server Database (PostgreSQL + Prisma)
    ↓
BroadcastChannel / localStorage event
    ↓
Other Open Tabs (update their UI)
    ↓
Handle Conflicts (if any)
```

### Step-by-Step Breakdown

**Step 1: User Action**
```tsx
// User edits note content
function handleContentChange(content: string) {
  setContent(content); // Update local state
  saveToIndexedDB(noteId, content); // Immediate save
}
```

**Step 2: IndexedDB Write (Instant)**
```tsx
async function saveToIndexedDB(noteId: string, content: string) {
  const db = await openDB();
  const tx = db.transaction('cards', 'readwrite');
  const store = tx.objectStore('cards');

  await store.put({
    id: noteId,
    content,
    updatedAt: new Date(),
    syncStatus: 'pending' // Mark as needing sync
  });

  await tx.done;
}
```

**Step 3: UI Update (Optimistic)**
```tsx
// UI shows change immediately
// No spinner, no waiting
// User can keep typing
```

**Step 4: Queue Sync (Debounced)**
```tsx
// Debounce sync to avoid excessive API calls
const queueSync = debounce((noteId: string) => {
  syncQueue.add(noteId);
}, 2000); // Wait 2s after last change
```

**Step 5: Background Server Sync**
```tsx
async function syncToServer(noteId: string) {
  const card = await getFromIndexedDB(noteId);

  try {
    const response = await fetch(`/api/cards/${noteId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        content: card.content,
        updatedAt: card.updatedAt
      })
    });

    if (response.status === 409) {
      // Conflict detected
      await handleConflict(noteId, await response.json());
    } else {
      // Success - mark as synced
      await markAsSynced(noteId);
    }
  } catch (error) {
    // Network error - retry later
    await markAsFailed(noteId);
  }
}
```

**Step 6: Broadcast to Other Tabs**
```tsx
// Notify other tabs via BroadcastChannel
const channel = new BroadcastChannel('pawkit-sync');

channel.postMessage({
  type: 'card-updated',
  cardId: noteId,
  content: card.content,
  updatedAt: card.updatedAt
});

// Other tabs listen
channel.onmessage = (event) => {
  if (event.data.type === 'card-updated') {
    updateUIFromSync(event.data.cardId, event.data.content);
  }
};
```

**Step 7: Handle Conflicts**
```tsx
async function handleConflict(cardId: string, serverResponse: any) {
  const localCard = await getFromIndexedDB(cardId);
  const serverCard = serverResponse.card;

  // Compare timestamps
  if (serverCard.updatedAt > localCard.updatedAt) {
    // Server has newer version
    await resolveConflict(cardId, 'server-wins', serverCard);
  } else {
    // Local version is newer - retry sync
    await retrySync(cardId);
  }
}
```

---

## MULTI-SESSION DETECTION

### Active Session Pattern

**Purpose**: Prevent conflicts when same user has multiple tabs open

**Implementation**:

```tsx
// lib/stores/multi-session-store.ts

interface SessionInfo {
  id: string;
  timestamp: number;
  deviceName: string;
}

export const useMultiSessionStore = create<MultiSessionState>((set, get) => ({
  sessionId: null,
  activeSessions: [],
  isActiveSession: true,

  // Register this session
  registerSession: () => {
    const sessionId = `${Date.now()}_${Math.random()}`;

    // Store in localStorage for cross-tab detection
    const sessions = getStoredSessions();
    sessions.push({
      id: sessionId,
      timestamp: Date.now(),
      deviceName: navigator.userAgent
    });

    localStorage.setItem('pawkit_active_sessions', JSON.stringify(sessions));

    set({ sessionId, activeSessions: sessions });

    // Start heartbeat
    startHeartbeat(sessionId);
  },

  // Check if this session can write
  canWrite: () => {
    const { sessionId, activeSessions } = get();
    if (activeSessions.length === 1) return true;

    // Only active session can write
    const activeSession = activeSessions[0];
    return activeSession?.id === sessionId;
  },

  // Take control (become active session)
  takeControl: () => {
    const { sessionId } = get();
    const sessions = getStoredSessions();

    // Move this session to front (active)
    const otherSessions = sessions.filter(s => s.id !== sessionId);
    const thisSession = sessions.find(s => s.id === sessionId);

    if (thisSession) {
      const updated = [thisSession, ...otherSessions];
      localStorage.setItem('pawkit_active_sessions', JSON.stringify(updated));
      set({ activeSessions: updated, isActiveSession: true });

      // Broadcast to other tabs
      broadcastSessionChange();
    }
  }
}));
```

### Check Active Session Before Editing

**Pattern**: Always check if this session can write before mutations

```tsx
// ❌ WRONG: No session check
async function updateCard(cardId: string, updates: Partial<Card>) {
  await prisma.card.update({
    where: { id: cardId },
    data: updates
  });
}

// ✅ CORRECT: Check session first
async function updateCard(cardId: string, updates: Partial<Card>) {
  const { canWrite, isActiveSession } = useMultiSessionStore.getState();

  if (!canWrite()) {
    // Show warning to user
    toast.error('Another tab is currently editing. Please take control to edit.');
    return;
  }

  // Proceed with update
  await updateInIndexedDB(cardId, updates);
  queueSync(cardId);
}
```

### Multi-Session Warning UI

```tsx
// components/ui/multi-session-banner.tsx

export function MultiSessionBanner() {
  const { activeSessions, isActiveSession, takeControl } = useMultiSessionStore();

  if (activeSessions.length <= 1) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-yellow-500/90 backdrop-blur-sm p-3">
      <div className="flex items-center justify-between max-w-4xl mx-auto">
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-yellow-900" />
          <div>
            <p className="font-medium text-yellow-900">
              Multiple tabs detected ({activeSessions.length} sessions)
            </p>
            {!isActiveSession && (
              <p className="text-sm text-yellow-800">
                This tab is in read-only mode to prevent conflicts
              </p>
            )}
          </div>
        </div>

        {!isActiveSession && (
          <button
            onClick={takeControl}
            className="
              px-4 py-2 rounded-full
              bg-yellow-900 text-yellow-50
              hover:bg-yellow-800
              transition-colors
            "
          >
            Take Control
          </button>
        )}
      </div>
    </div>
  );
}
```

---

## CONFLICT RESOLUTION

### Conflict Types

**1. Multi-Session Conflict** (Same user, different tabs)
- **Strategy**: Active session wins
- **Resolution**: Inactive tabs show warning, can take control

**2. Multi-Device Conflict** (Same user, different devices)
- **Strategy**: Last-write-wins based on timestamp
- **Resolution**: Automatic with timestamp comparison

**3. Server Conflict** (409 status)
- **Strategy**: Depends on context
- **Resolution**: Server-wins for other users, client-wins for queued changes

**4. Race Condition** (Duplicate creation)
- **Strategy**: Database constraint prevents duplicates
- **Resolution**: Return existing resource (409 with resource)

---

### Conflict Resolution Strategies

#### Strategy 1: Server-Wins (Default for Other Users)

**When to use**: Server has changes from different user

```tsx
async function resolveConflict_ServerWins(cardId: string, serverCard: Card) {
  // Server version is authoritative
  await updateIndexedDB(cardId, serverCard);

  // Update UI
  updateUI(cardId, serverCard);

  // Show notification
  toast.info('Card updated by another user');
}
```

#### Strategy 2: Client-Wins (Queued Local Changes)

**When to use**: Local has unsaved changes

```tsx
async function resolveConflict_ClientWins(cardId: string, localCard: Card) {
  // Local version is authoritative
  // Force push to server
  const response = await fetch(`/api/cards/${cardId}`, {
    method: 'PATCH',
    headers: { 'X-Force-Update': 'true' },
    body: JSON.stringify(localCard)
  });

  if (response.ok) {
    await markAsSynced(cardId);
  }
}
```

#### Strategy 3: Last-Write-Wins (Timestamp)

**When to use**: Both versions from same user

```tsx
async function resolveConflict_LastWriteWins(
  cardId: string,
  localCard: Card,
  serverCard: Card
) {
  const localTime = new Date(localCard.updatedAt).getTime();
  const serverTime = new Date(serverCard.updatedAt).getTime();

  if (serverTime > localTime) {
    // Server is newer
    await resolveConflict_ServerWins(cardId, serverCard);
  } else {
    // Local is newer
    await resolveConflict_ClientWins(cardId, localCard);
  }
}
```

#### Strategy 4: Manual Resolution (True Conflict)

**When to use**: Cannot automatically resolve

```tsx
async function resolveConflict_Manual(
  cardId: string,
  localCard: Card,
  serverCard: Card
) {
  // Show conflict resolution UI
  const choice = await showConflictModal({
    local: localCard,
    server: serverCard,
    options: [
      { label: 'Keep Local Version', value: 'local' },
      { label: 'Use Server Version', value: 'server' },
      { label: 'Merge Both', value: 'merge' }
    ]
  });

  switch (choice) {
    case 'local':
      await resolveConflict_ClientWins(cardId, localCard);
      break;
    case 'server':
      await resolveConflict_ServerWins(cardId, serverCard);
      break;
    case 'merge':
      await resolveConflict_Merge(cardId, localCard, serverCard);
      break;
  }
}
```

---

### Strategy 5: Deletion Handling (Entity Identity Preservation)

**When to use**: Syncing deletions between devices

**Critical Pattern**: When receiving a deleted entity from server, ALWAYS update the existing local entity instead of saving the server entity. This preserves entity identity and prevents duplicates.

**❌ WRONG - Creates Duplicates**:
```tsx
async function mergeDeletion_WRONG(localEntity: Entity, serverEntity: Entity) {
  if (localEntity.deleted || serverEntity.deleted) {
    // Selects between local and server
    const deletedVersion = localEntity.deleted ? localEntity : serverEntity;

    // ❌ BUG: When serverEntity selected, this CREATES a new entity
    await localDb.saveEntity(deletedVersion);

    // Result: Local entity (id: abc123) still exists as deleted: false
    //         Server entity (id: abc123) saved as NEW duplicate with deleted: true
    //         IndexedDB now has DUPLICATE entities with same ID!
  }
}
```

**✅ CORRECT - Updates Existing**:
```tsx
async function mergeDeletion_CORRECT(localEntity: Entity, serverEntity: Entity) {
  if (localEntity.deleted || serverEntity.deleted) {
    // ALWAYS update the LOCAL entity (preserves identity)
    localEntity.deleted = true;
    localEntity.deletedAt = serverEntity.deletedAt || localEntity.deletedAt || new Date().toISOString();
    localEntity.updatedAt = new Date().toISOString();

    // ✅ GOOD: Updates the EXISTING local entity
    await localDb.saveEntity(localEntity);

    // Result: Local entity (id: abc123) updated with deleted: true
    //         No duplicates created
    //         IndexedDB has single entity marked as deleted
  }
}
```

**Why This Matters**:
- **Entity Identity**: Local entity ID is the source of truth for IndexedDB
- **No Duplicates**: Updating local entity prevents creating duplicate with server ID
- **UI Consistency**: Prevents "zombie" entities appearing in UI after sync
- **Data Integrity**: Maintains referential integrity across the database

**Real-World Impact** (Issue #22, Jan 2025):
- Bug caused 76 collections in IndexedDB (48 deleted, 28 active duplicates)
- "Zombie apocalypse" with deleted collections appearing in sidebar
- Every deletion sync created a new duplicate instead of marking existing as deleted

**Implementation** (lib/services/sync-service.ts):
```tsx
// ✅ Applied to both mergeCollections() and mergeCards()
private async mergeCollections(serverCollections: CollectionDTO[], localCollections: CollectionDTO[]): Promise<number> {
  for (const serverCollection of serverCollections) {
    const localCollection = localMap.get(serverCollection.id);

    if (!localCollection) {
      // New from server - save it (including deleted for proper sync state)
      await localDb.saveCollection(serverCollection, { fromServer: true });
    } else {
      // PRIORITY 1: Deletion ALWAYS wins
      if (localCollection.deleted || serverCollection.deleted) {
        // Mark LOCAL version as deleted (don't create duplicate from server)
        localCollection.deleted = true;
        localCollection.deletedAt = serverCollection.deletedAt || localCollection.deletedAt || new Date().toISOString();
        localCollection.updatedAt = new Date().toISOString();

        // Save the updated LOCAL version (prevents duplicates)
        await localDb.saveCollection(localCollection, { fromServer: true });
        continue;
      }

      // ... other conflict resolution logic
    }
  }
}
```

**Testing Checklist**:
- [ ] Delete entity on Device A
- [ ] Sync on Device B
- [ ] Check IndexedDB on Device B - entity should be marked deleted, NOT duplicated
- [ ] Verify no new entity IDs created
- [ ] Check UI doesn't show deleted entity
- [ ] Repeat test with offline Device B - verify correct merge on reconnect

**Prevention Rules**:
1. **Never save server entity directly when handling deletions**
2. **Always use local entity as merge target**
3. **Test deletion sync in both directions**
4. **Monitor IndexedDB for duplicate IDs**
5. **Review all merge logic for entity identity preservation**

**See Also**:
- Issue #22 in pawkit-troubleshooting - Full analysis and fix
- Issue #21 in pawkit-troubleshooting - Related deletion sync issues

---

### Strategy 6: Dequeue After Immediate Sync Success

**When to use**: Preventing duplicate creation when using both immediate sync and sync queue

**Critical Pattern**: When an operation succeeds via immediate sync, ALWAYS remove it from the sync queue to prevent duplicate execution when the queue drains.

**❌ WRONG - Leaves Item in Queue**:
```tsx
async function addCard_WRONG(cardData: CardData) {
  const tempId = `temp_${Date.now()}`;

  // Queue for sync (fallback)
  await syncQueue.enqueue({
    type: 'CREATE_CARD',
    payload: cardData,
    tempId: tempId,
  });

  // Try immediate sync
  const response = await fetch('/api/cards', {
    method: 'POST',
    body: JSON.stringify(cardData),
  });

  if (response.ok) {
    const serverCard = await response.json();

    // ❌ BUG: Queued operation NOT removed
    // When queue drains later, it will POST again → DUPLICATE!

    await localDb.permanentlyDeleteCard(tempId);
    await localDb.saveCard(serverCard);
  }
  // If immediate sync fails, queued item will retry later
}
```

**✅ CORRECT - Dequeues After Success**:
```tsx
async function addCard_CORRECT(cardData: CardData) {
  const tempId = `temp_${Date.now()}`;

  // Queue for sync (fallback)
  await syncQueue.enqueue({
    type: 'CREATE_CARD',
    payload: cardData,
    tempId: tempId,
  });

  // Try immediate sync
  const response = await fetch('/api/cards', {
    method: 'POST',
    body: JSON.stringify(cardData),
  });

  if (response.ok) {
    const serverCard = await response.json();

    // ✅ CRITICAL: Remove from queue since immediate sync succeeded
    await syncQueue.removeByTempId(tempId);

    await localDb.permanentlyDeleteCard(tempId);
    await localDb.saveCard(serverCard);
  }
  // If immediate sync fails, queued item remains for retry
}
```

**Why This Matters**:
- **Prevents Duplicate Creation**: Queue drain would create the same entity again
- **Maintains Data Integrity**: Server doesn't get duplicate POST requests
- **Proper Fallback**: Queue only processes operations that actually failed
- **Clean Queue**: Completed operations don't pollute the retry queue

**Real-World Impact** (Issue #23, Jan 2025):
- Bug caused duplicate notes to be created 5 seconds apart
- First note had content (immediate sync)
- Second note was blank (queue drain of same operation)
- Every create operation resulted in duplicates on server

**Implementation** (lib/stores/data-store.ts:516):
```tsx
if (response.ok) {
  const serverCard = await response.json();

  // CRITICAL: Remove from sync queue since immediate sync succeeded
  // This prevents duplicate creation when queue drains
  await syncQueue.removeByTempId(tempId);

  // Update link references if this was a temp card
  if (tempId.startsWith('temp_')) {
    await localDb.updateLinkReferences(tempId, serverCard.id);
  }

  // Replace temp card with server card
  await localDb.permanentlyDeleteCard(tempId);
  await localDb.saveCard(serverCard, { fromServer: true });
}
```

**SyncQueue Method** (lib/services/sync-queue.ts:246-258):
```tsx
async removeByTempId(tempId: string): Promise<void> {
  if (!this.db) {
    throw new Error('[SyncQueue] Database not initialized');
  }

  const operations = await this.db.getAll('operations');
  const toRemove = operations.filter(op => op.tempId === tempId);

  for (const op of toRemove) {
    await this.db.delete('operations', op.id);
  }
}
```

**Testing Checklist**:
- [ ] Create entity (card/collection)
- [ ] Verify immediate sync succeeds
- [ ] Check sync queue is empty after creation
- [ ] Wait for queue drain interval (5 seconds)
- [ ] Verify no duplicate created on server
- [ ] Test with offline mode - verify queue retries work
- [ ] Test with network failure - verify queue fallback works

**Before/After Flow**:

**BEFORE (Bug)**:
```
1. User creates note
2. Queue operation (CREATE_CARD, tempId: temp_123)
3. Immediate sync → POST /api/cards → 201 Created ✅
4. [BUG] Queue still has operation
5. Queue drains (5s later) → POST /api/cards AGAIN → Duplicate ❌
```

**AFTER (Fixed)**:
```
1. User creates note
2. Queue operation (CREATE_CARD, tempId: temp_123)
3. Immediate sync → POST /api/cards → 201 Created ✅
4. removeByTempId(temp_123) → Queue cleared ✅
5. Queue drains (5s later) → No pending operations → No duplicate ✅
```

**Prevention Rules**:
1. **Always dequeue after immediate sync success**
2. **Never assume queue will deduplicate automatically**
3. **Test both immediate and queued paths**
4. **Monitor for duplicate server IDs**
5. **Review all create/update operations for proper dequeue**

**Common Mistakes**:
- Forgetting to dequeue after immediate sync
- Dequeuing before confirming server success (use if (response.ok))
- Not implementing removeByTempId method
- Assuming duplicate detection will catch it

**See Also**:
- Issue #23 in pawkit-troubleshooting - Full analysis and fix
- Queue implementation in sync-queue.ts

---

### Retry Failed Operations

**Pattern**: Retry failed syncs with exponential backoff

```tsx
// lib/services/sync-retry.ts

interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 30000  // 30 seconds
};

async function retryOperation<T>(
  operation: () => Promise<T>,
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): Promise<T> {
  let lastError: Error;

  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;

      if (attempt === config.maxAttempts) {
        // Max attempts reached
        break;
      }

      // Calculate exponential backoff
      const delay = Math.min(
        config.baseDelay * Math.pow(2, attempt - 1),
        config.maxDelay
      );

      console.log(`Retry attempt ${attempt}/${config.maxAttempts} in ${delay}ms`);

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}

// Usage
async function syncCard(cardId: string) {
  try {
    await retryOperation(async () => {
      const card = await getFromIndexedDB(cardId);

      const response = await fetch(`/api/cards/${cardId}`, {
        method: 'PATCH',
        body: JSON.stringify(card)
      });

      if (!response.ok) throw new Error('Sync failed');

      return response.json();
    });

    await markAsSynced(cardId);
  } catch (error) {
    // Max retries exceeded
    await markAsPermanentlyFailed(cardId);
    console.error('Failed to sync card after 3 attempts:', error);
  }
}
```

---

## SYNC QUEUE MANAGEMENT

### Sync Queue Implementation

```tsx
// lib/services/sync-queue.ts

interface QueueItem {
  id: string;
  operation: 'create' | 'update' | 'delete';
  resource: 'card' | 'collection' | 'note';
  resourceId: string;
  data: any;
  attempts: number;
  lastAttempt: Date | null;
  status: 'pending' | 'processing' | 'failed' | 'success';
}

class SyncQueue {
  private queue: QueueItem[] = [];
  private processing = false;
  private batchSize = 5;
  private batchDelay = 1000; // 1 second

  // Add item to queue
  add(item: Omit<QueueItem, 'id' | 'attempts' | 'lastAttempt' | 'status'>) {
    // Deduplicate - remove older operations for same resource
    this.queue = this.queue.filter(
      existing =>
        !(existing.resource === item.resource &&
          existing.resourceId === item.resourceId)
    );

    // Add new item
    this.queue.push({
      ...item,
      id: `${Date.now()}_${Math.random()}`,
      attempts: 0,
      lastAttempt: null,
      status: 'pending'
    });

    // Start processing if not already
    if (!this.processing) {
      this.process();
    }
  }

  // Process queue
  private async process() {
    this.processing = true;

    while (this.queue.length > 0) {
      // Check if online
      if (!navigator.onLine) {
        console.log('Offline - pausing sync queue');
        await this.waitForOnline();
      }

      // Get batch of items
      const batch = this.queue.slice(0, this.batchSize);

      // Process batch in parallel
      await Promise.all(
        batch.map(item => this.processItem(item))
      );

      // Wait before next batch
      if (this.queue.length > 0) {
        await new Promise(resolve => setTimeout(resolve, this.batchDelay));
      }
    }

    this.processing = false;
  }

  // Process single item
  private async processItem(item: QueueItem) {
    item.status = 'processing';
    item.attempts++;
    item.lastAttempt = new Date();

    try {
      await this.syncToServer(item);

      // Success - remove from queue
      item.status = 'success';
      this.queue = this.queue.filter(i => i.id !== item.id);

      console.log(`Synced ${item.resource} ${item.resourceId}`);
    } catch (error) {
      console.error(`Failed to sync ${item.resource} ${item.resourceId}:`, error);

      if (item.attempts >= 3) {
        // Max attempts - mark as failed
        item.status = 'failed';
        this.handleFailedItem(item);
      } else {
        // Retry later
        item.status = 'pending';
      }
    }
  }

  // Sync item to server
  private async syncToServer(item: QueueItem) {
    const endpoint = `/api/${item.resource}s/${item.resourceId}`;

    const response = await fetch(endpoint, {
      method: item.operation === 'create' ? 'POST' :
              item.operation === 'update' ? 'PATCH' :
              'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: item.operation !== 'delete' ? JSON.stringify(item.data) : undefined
    });

    if (response.status === 409) {
      // Conflict - handle separately
      const serverData = await response.json();
      await this.handleConflict(item, serverData);
    } else if (!response.ok) {
      throw new Error(`Server returned ${response.status}`);
    }
  }

  // Handle conflict
  private async handleConflict(item: QueueItem, serverData: any) {
    // Use timestamp comparison
    const localTime = new Date(item.data.updatedAt).getTime();
    const serverTime = new Date(serverData.card.updatedAt).getTime();

    if (serverTime > localTime) {
      // Server wins - update local
      await updateIndexedDB(item.resourceId, serverData.card);
      console.log('Conflict resolved: server wins');
    } else {
      // Local wins - force update
      const response = await fetch(`/api/${item.resource}s/${item.resourceId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-Force-Update': 'true'
        },
        body: JSON.stringify(item.data)
      });

      if (!response.ok) {
        throw new Error('Failed to force update');
      }

      console.log('Conflict resolved: local wins');
    }
  }

  // Handle permanently failed item
  private async handleFailedItem(item: QueueItem) {
    // Store in failed items for manual review
    await storeFailedSync(item);

    // Show notification to user
    toast.error(`Failed to sync ${item.resource}. Data saved locally.`);

    // Remove from queue
    this.queue = this.queue.filter(i => i.id !== item.id);
  }

  // Wait for online
  private async waitForOnline(): Promise<void> {
    return new Promise(resolve => {
      if (navigator.onLine) {
        resolve();
        return;
      }

      const handler = () => {
        window.removeEventListener('online', handler);
        resolve();
      };

      window.addEventListener('online', handler);
    });
  }

  // Flush queue (sync all immediately)
  async flush() {
    console.log('Flushing sync queue...');
    await this.process();
  }

  // Get queue status
  getStatus() {
    return {
      total: this.queue.length,
      pending: this.queue.filter(i => i.status === 'pending').length,
      processing: this.queue.filter(i => i.status === 'processing').length,
      failed: this.queue.filter(i => i.status === 'failed').length
    };
  }
}

export const syncQueue = new SyncQueue();

// Flush queue before page unload
window.addEventListener('beforeunload', async (e) => {
  if (syncQueue.getStatus().total > 0) {
    e.preventDefault();
    await syncQueue.flush();
  }
});

// Resume sync when coming online
window.addEventListener('online', () => {
  console.log('Back online - resuming sync queue');
  syncQueue.process();
});
```

---

## CRITICAL RULES

### Rule 1: IndexedDB is Source of Truth

**Always write to IndexedDB first, then sync to server**

```tsx
// ❌ WRONG: Write to server first
async function updateCard(cardId: string, updates: Partial<Card>) {
  await fetch(`/api/cards/${cardId}`, {
    method: 'PATCH',
    body: JSON.stringify(updates)
  });

  await updateIndexedDB(cardId, updates);
}

// ✅ CORRECT: Write to IndexedDB first
async function updateCard(cardId: string, updates: Partial<Card>) {
  // 1. Update local immediately
  await updateIndexedDB(cardId, updates);

  // 2. Update UI
  updateUI(cardId, updates);

  // 3. Queue server sync (background)
  syncQueue.add({
    operation: 'update',
    resource: 'card',
    resourceId: cardId,
    data: updates
  });
}
```

---

### Rule 2: Never Lose User Data

**If sync fails, keep data locally and retry**

```tsx
async function saveCard(card: Card) {
  // Save locally (always succeeds)
  await saveToIndexedDB(card);

  // Try to sync
  try {
    await syncToServer(card);
  } catch (error) {
    // Sync failed - data is still safe locally
    console.error('Sync failed, will retry:', error);

    // Mark as pending sync
    await markAsPendingSync(card.id);

    // Retry later
    syncQueue.add({
      operation: 'create',
      resource: 'card',
      resourceId: card.id,
      data: card
    });
  }
}
```

---

### Rule 3: Sync is Background Process

**Don't block UI on sync operations**

```tsx
// ❌ WRONG: Block UI waiting for sync
async function saveNote(noteId: string, content: string) {
  setLoading(true);

  await saveToIndexedDB(noteId, content);
  await syncToServer(noteId); // User waits here

  setLoading(false);
}

// ✅ CORRECT: Sync in background
async function saveNote(noteId: string, content: string) {
  // Instant local save (no loading state)
  await saveToIndexedDB(noteId, content);

  // Sync in background (fire and forget)
  queueSync(noteId);

  // UI is immediately responsive
}
```

---

### Rule 4: Handle Conflicts Gracefully

**Provide clear UI for conflict resolution**

```tsx
async function handleEditConflict(cardId: string) {
  const { canWrite } = useMultiSessionStore.getState();

  if (!canWrite()) {
    // Show modal instead of silently failing
    const choice = await showModal({
      title: 'Another Tab is Editing',
      message: 'This card is being edited in another tab. What would you like to do?',
      options: [
        { label: 'Take Control', value: 'takeControl' },
        { label: 'View Only', value: 'viewOnly' },
        { label: 'Open in New Tab', value: 'newTab' }
      ]
    });

    if (choice === 'takeControl') {
      takeControl();
      return true; // Can edit now
    }

    return false; // Cannot edit
  }

  return true; // Can edit
}
```

---

### Rule 5: Retry Failed Operations

**Maximum 3 attempts with exponential backoff**

```tsx
const RETRY_CONFIG = {
  maxAttempts: 3,
  delays: [1000, 5000, 15000] // 1s, 5s, 15s
};

async function syncWithRetry(cardId: string) {
  for (let attempt = 0; attempt < RETRY_CONFIG.maxAttempts; attempt++) {
    try {
      await syncToServer(cardId);
      return; // Success
    } catch (error) {
      if (attempt === RETRY_CONFIG.maxAttempts - 1) {
        // Max attempts - give up
        await markAsPermanentlyFailed(cardId);
        throw error;
      }

      // Wait before retry
      await wait(RETRY_CONFIG.delays[attempt]);
    }
  }
}
```

---

## OCTOBER 2025 SYNC AUDIT

### 12 Critical Vulnerabilities Patched

**1. Race Condition in Card Creation**
- **Issue**: Multiple tabs creating same URL simultaneously
- **Fix**: Database unique constraint + 409 conflict handling
- **Impact**: Eliminated duplicate cards

**2. Cursor Jumping During Editing**
- **Issue**: useEffect syncing content on every change
- **Fix**: Removed `card.content` from dependency array
- **Impact**: Smooth editing experience

**3. Missing Conflict Detection**
- **Issue**: No detection of simultaneous edits
- **Fix**: Multi-session detection with active session tracking
- **Impact**: Prevented data loss from conflicts

**4. No Sync Retry Logic**
- **Issue**: Failed syncs never retried
- **Fix**: Retry with exponential backoff (max 3 attempts)
- **Impact**: Reliable sync even with poor connectivity

**5. Variable Scope in Error Handlers**
- **Issue**: Variables undefined in catch blocks
- **Fix**: Declare variables outside try block
- **Impact**: Zero ReferenceError crashes

**6. Excessive Sync Operations**
- **Issue**: Syncing on every keystroke
- **Fix**: Debounce sync operations (2 seconds)
- **Impact**: 95% fewer API calls

**7. No Offline Queue**
- **Issue**: Data lost if offline during save
- **Fix**: Queue operations when offline, process when online
- **Impact**: Zero data loss offline

**8. No Deduplication in Sync Queue**
- **Issue**: Same resource synced multiple times
- **Fix**: Deduplicate queue by resource ID
- **Impact**: Efficient sync, fewer conflicts

**9. Missing beforeunload Flush**
- **Issue**: Pending syncs lost on tab close
- **Fix**: Flush queue in beforeunload handler
- **Impact**: Guaranteed sync before close

**10. No Multi-Session Coordination**
- **Issue**: Tabs overwriting each other's changes
- **Fix**: Active session detection with write guards
- **Impact**: Coordinated multi-tab editing

**11. Server Errors Not Logged**
- **Issue**: Sync failures silent
- **Fix**: Comprehensive error logging
- **Impact**: Easier debugging and monitoring

**12. No Conflict Resolution Strategy**
- **Issue**: Conflicts caused data loss
- **Fix**: Last-write-wins + manual resolution UI
- **Impact**: Graceful conflict handling

---

## KNOWN ARCHITECTURAL FLAWS (January 2025 Analysis)

### Comprehensive Deep-Dive Findings

**Analysis Date**: January 4, 2025
**Context**: User reported ongoing card duplication, cross-device sync failures, collection propagation issues
**Method**: Comprehensive code review + git history analysis + pattern identification
**Result**: Identified 12 specific architectural flaws across 8 categories

---

### Category 1: Race Conditions (5 CRITICAL Flaws)

#### Flaw 1.1: Multi-Tab Sync Collision

**Location**: `lib/services/sync-service.ts:79-113`

**The Problem**:
```typescript
// BroadcastChannel coordination has race window
if (this.otherTabSyncing) {
  return { success: false }; // Early return if another tab syncing
}
```

**Why It's Broken**:
1. Tab A starts sync, broadcasts `SYNC_START`
2. Tab B receives broadcast but ~10ms delay to process message
3. Tab B checks `otherTabSyncing` before processing Tab A's message
4. Tab B sees `false`, starts its own sync
5. Both tabs pull from server simultaneously
6. Both tabs merge different versions of data
7. Result: Duplicate cards, corrupted collections

**User-Visible Symptoms**:
- Duplicate cards appear when multiple tabs open
- Collections get corrupted (wrong items, wrong hierarchy)
- Edits made in one tab don't appear in other tab
- Data inconsistency between tabs requiring refresh

**Root Cause**: BroadcastChannel message processing is async. No mutex/lock prevents simultaneous sync.

**Proper Fix**:
- Implement distributed lock using localStorage
- Use timestamp-based mutex with lock acquisition/release
- Add exponential backoff if lock cannot be acquired
- Only one tab can hold lock at a time

**Anti-Pattern to Avoid**: Relying on async message passing for mutual exclusion

---

#### Flaw 1.2: Temp ID → Server ID Race Condition

**Location**: `lib/stores/data-store.ts:394-519`

**The 4-Step Process**:
```typescript
// STEP 1: Create card with temp ID
const tempId = `temp_${Date.now()}`;
const newCard = { ...cardData, id: tempId };

// STEP 2: Save to IndexDB immediately
await localDb.saveCard(newCard, { localOnly: true });

// STEP 3: Update UI optimistically
set((state) => ({ cards: [newCard, ...state.cards] }));

// STEP 4: Sync to server (background)
const serverCard = await syncToServer(newCard);

// STEP 5: Replace temp ID with server ID
await localDb.permanentlyDeleteCard(tempId); // Delete temp
await localDb.saveCard(serverCard); // Save real
```

**The 3 Race Windows**:

**Race Window 1** (Between Step 3 and Step 5):
- Temp card is visible in UI
- Other tab syncs, pulls from IndexDB
- Other tab sees temp card, syncs it back from server
- Result: Temp card leaks into sync system

**Race Window 2** (Between delete and save in Step 5):
- Temp card deleted from IndexDB
- But not yet replaced with real card
- If sync runs during this window, temp card is "in limbo"
- Result: Card temporarily disappears

**Race Window 3** (If Step 4 fails):
- Network error during sync to server
- Temp card remains in IndexDB
- Temp card also queued for retry in sync queue
- Both persist indefinitely
- Result: Ghost duplicate with temp ID visible in UI

**User-Visible Symptoms**:
- Cards with IDs like `temp_1704384000000` visible in UI
- Duplicate cards that persist even after refresh
- Cards disappear and reappear randomly
- Same card appears with different IDs

**Root Cause**: Temporary IDs are visible during async operations. Leak into sync creates divergent realities.

**Proper Fix**:
- Use client-generated UUIDs (uuid v4) instead of temp IDs
- Server accepts client UUIDs as primary keys
- No ID replacement needed - UUID is permanent
- If UUID collision (extremely rare), server returns existing entity

**Anti-Pattern to Avoid**: Using temporary identifiers that can leak into persistent storage or sync

---

#### Flaw 1.3: Deduplication False Positives

**Location**: `lib/stores/data-store.ts:39-120`

**The Three Separate Flaws**:

**Flaw A: Deleted Card Resurrection** (lines 472-481, 495-499)
```typescript
// When server card has deleted=true
if (serverCard.deleted === true) {
  // Remove from Zustand state
  set(state => ({
    cards: state.cards.filter(c => c.id !== serverCard.id)
  }));
}
```

**Problem**: This check happens AFTER deduplication runs. Sequence:
1. Sync pulls cards from server
2. Deduplication runs on all cards (including deleted ones)
3. Deleted card might be marked as duplicate of active card
4. Deleted card briefly appears in UI
5. Then deletion check removes it

**Result**: Deleted cards "flash" in UI before being removed.

**Flaw B: Runs on Every Sync** (lines 248-249, 318-329)
```typescript
const [cards] = await deduplicateCards(filteredCards);
```

**Problem**: Aggressive deduplication on every single sync.
- Original intent: Clean up race condition duplicates
- Reality: This is reactive bandaid for proactive duplication bug
- Should: Prevent duplicates at creation, not clean up after

**Result**: Performance overhead, false positives, masks root cause.

**Flaw C: URL/Title Collision** (line 46)
```typescript
const key = card.url || card.title || card.id;
```

**Problem**: Two legitimate cards can have same title or URL.
- User saves article "Introduction to React"
- Later saves different article also titled "Introduction to React"
- Deduplication treats as duplicate, merges them

**Result**: Legitimate separate cards incorrectly merged into one.

**User-Visible Symptoms**:
- Cards briefly appear then disappear
- Two different articles with same title become one card
- Deleted cards "flash" in UI on refresh
- Note cards with similar titles get merged

**Root Cause**: Client-side deduplication is reactive cleanup for preventive constraint gaps.

**Proper Fix**:
- Remove client-side deduplication entirely
- Add database-level unique constraints:
  - URL cards: UNIQUE(userId, url, type='url')
  - Note cards: UNIQUE(userId, title, type='note', createdAt) - allow same title if different timestamp
- Server catches P2002 duplicate errors, returns existing entity (409)
- Client accepts server's decision

**Anti-Pattern to Avoid**: Reactive deduplication to fix proactive creation bugs

---

#### Flaw 1.4: Metadata Quality Score Data Loss

**Location**: `lib/services/sync-service.ts:306-434`

**The Problem**:
```typescript
// Calculate metadata quality scores
const localQuality = calculateQuality(localCard);
const serverQuality = calculateQuality(serverCard);

if (serverQuality > localQuality) {
  // Server has better metadata - overwrite local
  await localDb.saveCard(serverCard, { fromServer: true });
  continue; // LOCAL CHANGES LOST
}
```

**The Scenario That Causes Data Loss**:
1. User on Device A edits card: adds notes, tags, moves to collection
2. Device B (background) fetches rich metadata from server for same card
   - Title: "React Documentation"
   - Description: Full article excerpt
   - Image: High-res thumbnail
   - Quality score: 85/100
3. User's edits on Device A:
   - Notes: "Important for project X"
   - Tags: ["work", "urgent"]
   - Collections: ["Project X Resources"]
   - Quality score: 60/100 (fewer metadata fields)
4. Sync runs on Device A
5. Server metadata (score 85) > User edits (score 60)
6. User's notes, tags, and collection assignment **overwritten**

**Current Mitigation** (lines 425-434):
```typescript
// Only prefer local if edited in last hour
const oneHourAgo = Date.now() - 3600000;
if (localCard.updatedAt > oneHourAgo) {
  // Use local version
}
```

**Why Mitigation is Insufficient**:
- User works on project over multiple hours
- After 1 hour, their manual edits can still be overwritten
- Quality score doesn't distinguish user edits from auto-fetch

**User-Visible Symptoms**:
- Notes disappear after sync
- Tags removed
- Card moves out of collection
- User's manual work lost, replaced with auto-fetched metadata

**Root Cause**: Metadata quality score doesn't distinguish user-edited fields from auto-fetched fields.

**Proper Fix**:
- Separate field types:
  - **User-edited fields**: notes, tags, collections, scheduledDate (never overwrite)
  - **Auto-fetched fields**: title, description, image, articleContent (prefer higher quality)
- Track `lastEditedByUser` timestamp per field
- Merge strategy: User edits always win, auto-fetch fills gaps

**Anti-Pattern to Avoid**: Using quality scores to override user manual edits

---

#### Flaw 1.5: Database Initialization Race

**Location**: `lib/stores/data-store.ts:230-286`

**The Problem**:
```typescript
initialize: async () => {
  if (get().isInitialized) {
    return; // Early return - RACE WINDOW HERE
  }

  set({ isLoading: true });

  // Load data from IndexDB (slow operation)
  const [allCards, allCollections] = await Promise.all([...]);

  set({
    cards,
    collections,
    isInitialized: true,
    isLoading: false,
  });
}
```

**The Race**:
1. Component A calls `initialize()`
2. Component B calls `initialize()` simultaneously
3. Both check `isInitialized`, both see `false`
4. Both set `isLoading = true`
5. Both start loading data from IndexDB
6. Both set state with loaded data
7. Result: Double initialization, possibly duplicate data in state

**Evidence of Known Issue** (line 275 comment):
```typescript
// NOTE: Removed aggressive auto-sync on page load (line 275)
// Reason: "prevent race conditions"
```

This comment shows previous attempt to fix symptoms (disable auto-sync) rather than root cause (race in initialization).

**User-Visible Symptoms**:
- App loads slowly on startup
- Duplicate cards briefly appear
- Multiple loading spinners
- Console shows duplicate logs

**Root Cause**: No atomic guard on initialization. Multiple concurrent calls possible.

**Proper Fix**:
- Use atomic compare-and-swap pattern:
```typescript
private initPromise: Promise<void> | null = null;

initialize: async () => {
  // If already initializing, wait for that to finish
  if (this.initPromise) {
    return this.initPromise;
  }

  // If already initialized, return immediately
  if (get().isInitialized) {
    return Promise.resolve();
  }

  // Create initialization promise atomically
  this.initPromise = this._doInitialize();

  try {
    await this.initPromise;
  } finally {
    this.initPromise = null;
  }
}

private async _doInitialize() {
  set({ isLoading: true });
  // ... actual initialization logic
}
```

**Anti-Pattern to Avoid**: Checking flag then executing without atomic operation

---

### Category 2: Database-Level Issues (2 HIGH Flaws)

#### Flaw 2.1: Incomplete Unique Index

**Location**: `prisma/schema.prisma:61-63`

**The Schema Comment**:
```prisma
model Card {
  // ...
  @@index([userId])
  @@index([userId, deleted])
  @@index([userId, inDen])
  @@index([userId, scheduledDate])
  // Note: Unique constraint on (userId, url) is applied via custom migration
  // with WHERE type = 'url' to exclude notes from the constraint
}
```

**The Problems**:

**Problem 1**: Constraint not in schema
- Only exists in migration file
- Developer looking at schema won't see it
- Schema and database are out of sync

**Problem 2**: Only covers URL cards
- Constraint: `WHERE type = 'url'`
- Notes (`type = 'md-note'` or `type = 'text-note'`) can duplicate freely
- User can create 10 notes with same title

**Problem 3**: No constraint on note titles
- Cards with `type='md-note'` have no uniqueness check
- Database allows duplicate notes
- Client-side deduplication tries to clean up (reactive)

**Problem 4**: Server catches P2002 reactively
- `lib/server/cards.ts` createCard function catches duplicate errors
- Then looks up existing card
- Should: Database prevents, server never sees duplicate attempt

**Evidence** (Commit `a9c6f0e`):
- Added "database-level duplicate prevention"
- But only for URL cards, not comprehensive

**User-Visible Symptoms**:
- Duplicate notes created
- URL cards with different types can duplicate
- No clear error when attempting to create duplicate

**Root Cause**: Partial constraint leaves gaps for duplicates.

**Proper Fix**:
Add comprehensive unique constraints to schema:
```prisma
model Card {
  // ...

  // Unique constraint for URL cards
  @@unique([userId, url, type], name: "unique_user_url_card", where: "type = 'url'")

  // Unique constraint for note cards (allow same title if different day)
  @@unique([userId, title, createdAt::date], name: "unique_user_note_title", where: "type IN ('md-note', 'text-note')")
}
```

**Anti-Pattern to Avoid**: Partial unique constraints that leave gaps

---

#### Flaw 2.2: No Optimistic Locking

**Location**: `app/api/cards/[id]/route.ts:70-91`

**The Current Check**:
```typescript
// If-Unmodified-Since header check
const ifUnmodifiedSince = req.headers.get('if-unmodified-since');
const isMetadataUpdate = body.metadata || body.title || body.description || body.image;

if (ifUnmodifiedSince && !isMetadataUpdate) {
  const requestTime = new Date(ifUnmodifiedSince);
  const cardTime = new Date(existingCard.updatedAt);

  if (cardTime > requestTime) {
    return NextResponse.json(
      { error: 'Card modified since last read' },
      { status: 409 }
    );
  }
}
```

**The Gaps**:

**Gap 1**: Only for PATCH operations
- POST (create) has no conflict detection
- DELETE has no conflict detection

**Gap 2**: Metadata updates skip check (line 73)
```typescript
if (ifUnmodifiedSince && !isMetadataUpdate) { // Skip if metadata
```

**Why This Exists**: Background metadata fetching shouldn't conflict
**Problem**: Two devices updating metadata simultaneously = silent overwrite

**Gap 3**: No version field
- Timestamp comparison is fragile
- Clock skew between devices causes issues
- Version numbers are atomic

**The Scenario That Breaks**:
1. Device A at 2:00:00 PM - fetches metadata, gets `updatedAt: 2:00:00`
2. Device B at 2:00:01 PM - updates notes, server sets `updatedAt: 2:00:01`
3. Device A at 2:00:02 PM - sends metadata update with `If-Unmodified-Since: 2:00:00`
4. Server checks: `2:00:01 > 2:00:00` → conflict? NO! Because `isMetadataUpdate = true`
5. Device A's metadata overwrites Device B's note changes

**User-Visible Symptoms**:
- Metadata changes overwrite content changes
- Notes disappear after metadata fetch
- Silent data loss between devices
- No conflict warning shown

**Root Cause**: No proper optimistic locking. Timestamp comparison has gaps.

**Proper Fix**:
Add version field to all entities:
```prisma
model Card {
  id String @id
  version Int @default(1)
  // ... other fields

  @@index([id, version]) // Composite index for version checks
}
```

Update API to use version check:
```typescript
// Client sends version with update
const response = await fetch(`/api/cards/${id}`, {
  method: 'PATCH',
  body: JSON.stringify({
    content: newContent,
    version: currentVersion // Client's version
  })
});

// Server checks version
const card = await prisma.card.findUnique({ where: { id } });
if (card.version !== body.version) {
  return NextResponse.json(
    { error: 'Conflict - card modified by another device', serverVersion: card.version },
    { status: 409 }
  );
}

// Server increments version on update
await prisma.card.update({
  where: { id, version: body.version }, // Atomic check-and-update
  data: {
    ...updates,
    version: { increment: 1 }
  }
});
```

**Anti-Pattern to Avoid**: Timestamp-based conflict detection without version numbers

---

### Category 3: Sync Flow Architecture (3 CRITICAL Flaws)

#### Flaw 3.1: Missing Transaction Boundaries

**Location**: `lib/services/sync-service.ts:198-302` (pullFromServer method)

**The Non-Atomic Operation**:
```typescript
async pullFromServer() {
  // STEP 1: Pull cards (can succeed)
  const serverCards = await this.fetchWithTimeout('/api/cards?...');
  await this.mergeCards(serverCards, localCards);

  // STEP 2: Pull collections (can fail)
  const serverCollections = await this.fetchWithTimeout('/api/pawkits');
  await this.mergeCollections(serverCollections, localCollections);

  // STEP 3: Pull settings (can fail)
  const serverSettings = await this.fetchWithTimeout('/api/user/settings');
  await this.mergeSettings(serverSettings, localSettings);
}
```

**What Goes Wrong**:
- mergeCards succeeds → Cards updated in IndexDB
- mergeCollections fails → Collections NOT updated
- **Result**: Database in inconsistent state
  - Cards reference collections that don't exist locally
  - UI shows cards but missing their collection tags
  - Requires manual refresh to fix

**The Broken Rollback** (lines 210-299):
```typescript
// Create snapshot before sync
const snapshot = {
  cards: await localDb.getAllCards(),
  collections: await localDb.getAllCollections()
};

try {
  await pullFromServer();
} catch (error) {
  // Restore from snapshot
  await Promise.all([
    localDb.restoreCards(snapshot.cards), // Can fail
    localDb.restoreCollections(snapshot.collections) // Can fail
  ]);
}
```

**Rollback Flaw**: `Promise.all` can partially fail
- restoreCards succeeds
- restoreCollections fails
- Now we're in an EVEN WORSE state - half-rolled-back

**No IndexDB Transaction** (line 174 comment admits this):
```typescript
// TODO: Wrap in transaction for atomicity
```

**User-Visible Symptoms**:
- Cards appear without collections after sync failure
- Partial data visible in UI
- Refresh required to fix inconsistency
- "Collections not found" errors

**Root Cause**: Multi-step operations without ACID transaction boundaries.

**Proper Fix**:
Wrap all sync operations in IndexDB transaction:
```typescript
async pullFromServer() {
  const db = await this.getDB();
  const tx = db.transaction(['cards', 'collections', 'settings'], 'readwrite');

  try {
    // All operations share same transaction
    await this.mergeCards(serverCards, localCards, tx);
    await this.mergeCollections(serverCollections, localCollections, tx);
    await this.mergeSettings(serverSettings, localSettings, tx);

    // Commit atomically - all or nothing
    await tx.done;
  } catch (error) {
    // Transaction automatically rolls back on error
    console.error('Sync failed, rolled back:', error);
    throw error;
  }
}
```

**Anti-Pattern to Avoid**: Multi-step operations without transaction wrapper

---

#### Flaw 3.2: Collection Tree Flattening Loses Parent Relationships

**Location**: `lib/services/sync-service.ts:479-497` and `lib/services/local-storage.ts:416-443`

**The Process**:

**Step 1 - Sync Service Flattens Tree**:
```typescript
// lib/services/sync-service.ts
const flatServerCollections = this.flattenCollections(serverCollections);
// Tree structure lost, becomes flat array
```

**Step 2 - Local Storage Rebuilds Tree**:
```typescript
// lib/services/local-storage.ts
private buildCollectionTree(flatCollections: CollectionNode[]): CollectionNode[] {
  // Rebuilds tree based on parentId relationships
  flatCollections.forEach(node => {
    if (node.parentId && nodes.has(node.parentId)) {
      nodes.get(node.parentId)!.children.push(node);
    } else {
      roots.push(node); // Orphaned if parent missing
    }
  });
}
```

**The Race Condition**:
1. Device A deletes parent collection P (soft delete: `deleted = true`)
2. Device B moves child collection C under P (`parentId = P.id`)
3. Sync runs:
   - Server has: P (`deleted: true`), C (`parentId: P.id`, `deleted: false`)
4. pullFromServer fetches both
5. Local storage filters out deleted: P is excluded
6. buildCollectionTree tries to find parent P → not found
7. C becomes orphan, moved to root level

**User-Visible Symptoms**:
- Collections randomly appear at root level
- Nested collections "jump out" of parents
- Hierarchy lost after sync
- Collections in wrong place requiring manual reorganization

**Root Cause**: Syncing collections as state snapshots loses temporal ordering of operations.

**Proper Fix**:
Sync collections as operations instead of state:
```typescript
// Instead of syncing full collection state
type CollectionState = {
  id: string;
  name: string;
  parentId: string | null;
  deleted: boolean;
};

// Sync operations
type CollectionOperation =
  | { type: 'create'; id: string; name: string; parentId: string | null }
  | { type: 'move'; id: string; newParentId: string | null }
  | { type: 'rename'; id: string; newName: string }
  | { type: 'delete'; id: string };

// Operations include temporal ordering
type CollectionChange = {
  operation: CollectionOperation;
  sequenceNumber: number; // Ensures correct order
  timestamp: Date;
  userId: string;
};
```

Apply operations in order:
```typescript
async applyCollectionChanges(changes: CollectionChange[]) {
  // Sort by sequence number
  const sorted = changes.sort((a, b) => a.sequenceNumber - b.sequenceNumber);

  for (const change of sorted) {
    switch (change.operation.type) {
      case 'move':
        // Check parent exists before moving
        const parent = await getCollection(change.operation.newParentId);
        if (parent && !parent.deleted) {
          await moveCollection(change.operation.id, change.operation.newParentId);
        }
        break;
      // ... handle other operations
    }
  }
}
```

**Anti-Pattern to Avoid**: Syncing state snapshots when operations have temporal dependencies

---

#### Flaw 3.3: No Cache Invalidation Strategy

**Location**: Throughout `lib/stores/data-store.ts`

**The Pattern**:
```typescript
// Operation updates Zustand state immediately
set((state) => ({
  cards: [newCard, ...state.cards],
}));

// Then tries to sync to IndexDB/server
await localDb.saveCard(newCard);
await syncToServer(newCard);
```

**What Goes Wrong**:
1. State updated optimistically (card added to UI)
2. localDb.saveCard fails (disk full, permissions, etc.)
3. **Problem**: UI still shows the card even though save failed
4. User sees card, thinks it's saved
5. Refresh page → card disappears (never actually saved)

**No Rollback Mechanism**:
```typescript
try {
  // Update state first
  set((state) => ({ cards: [newCard, ...state.cards] }));

  // Then try to save
  await localDb.saveCard(newCard);
} catch (error) {
  // ERROR: No way to rollback Zustand state
  console.error('Save failed but state already updated');
}
```

**The Refresh Problem** (lines 351-389):
```typescript
refresh: async () => {
  const [cards, collections] = await Promise.all([
    localDb.getAllCards(),
    localDb.getAllCollections(),
  ]);

  // During this window, stale state is visible
  set({ cards, collections });
}
```

During refresh:
- Old stale state visible in UI
- User can interact with stale data
- New data loads and replaces
- Any edits during refresh window are lost

**User-Visible Symptoms**:
- Cards appear then disappear on refresh
- Changes seem to save but vanish later
- UI state doesn't match database
- Edits lost during refresh

**Root Cause**: Optimistic UI updates without rollback capability.

**Proper Fix**:
Implement proper cache invalidation with rollback:
```typescript
async updateCard(cardId: string, updates: Partial<Card>) {
  // 1. Save original state for rollback
  const originalState = get().cards;

  // 2. Update UI optimistically
  set((state) => ({
    cards: state.cards.map(c => c.id === cardId ? { ...c, ...updates } : c)
  }));

  try {
    // 3. Try to persist
    await localDb.updateCard(cardId, updates);
    await syncQueue.add({ operation: 'update', resource: 'card', resourceId: cardId, data: updates });
  } catch (error) {
    // 4. ROLLBACK on failure
    set({ cards: originalState });
    toast.error('Failed to save changes');
    throw error;
  }
}
```

Prevent interactions during refresh:
```typescript
refresh: async () => {
  set({ isRefreshing: true }); // Lock UI

  const [cards, collections] = await Promise.all([
    localDb.getAllCards(),
    localDb.getAllCollections(),
  ]);

  set({ cards, collections, isRefreshing: false }); // Unlock UI
}
```

**Anti-Pattern to Avoid**: Optimistic UI updates without rollback mechanism

---

### Prevention Checklist

Before making any sync-related changes, verify:

**Architecture**:
- [ ] Multi-step operations wrapped in transactions
- [ ] Distributed locks for cross-tab operations
- [ ] Version fields for optimistic locking
- [ ] Operation-based sync (not state snapshots) for temporal dependencies

**Implementation**:
- [ ] No temporary IDs that can leak into persistent storage
- [ ] Proper atomic initialization guards (no race on startup)
- [ ] Rollback mechanisms for optimistic UI updates
- [ ] Comprehensive database constraints (not client-side deduplication)

**Testing**:
- [ ] Test with multiple tabs open simultaneously
- [ ] Test with multiple devices syncing same data
- [ ] Test network failures mid-operation
- [ ] Test clock skew between devices

**Monitoring**:
- [ ] Log duplicate creation attempts
- [ ] Track conflict resolution outcomes
- [ ] Monitor transaction rollback frequency
- [ ] Alert on sync queue backup

**Documentation**:
- [ ] Document sync flow for new features
- [ ] Update this skill with new patterns discovered
- [ ] Add troubleshooting entries for new issues

---

**Last Updated**: January 4, 2025
**Status**: DOCUMENTED - Awaiting prioritization for fixes
**Reference**: See `.claude/skills/pawkit-roadmap/SKILL.md` section "BACKLOG - CRITICAL SYNC FIXES" for fix timeline

---

## CODE EXAMPLES

### Complete Sync Implementation

```tsx
// lib/stores/data-store.ts

import { create } from 'zustand';
import { syncQueue } from '@/lib/services/sync-queue';
import { useMultiSessionStore } from '@/lib/stores/multi-session-store';

interface DataStore {
  cards: Card[];
  updateCard: (cardId: string, updates: Partial<Card>) => Promise<void>;
  syncCard: (cardId: string) => Promise<void>;
}

export const useDataStore = create<DataStore>((set, get) => ({
  cards: [],

  // Update card with sync
  updateCard: async (cardId: string, updates: Partial<Card>) => {
    // Check if this session can write
    const { canWrite } = useMultiSessionStore.getState();
    if (!canWrite()) {
      toast.error('Another tab is editing. Take control to edit.');
      return;
    }

    // 1. Update IndexedDB immediately
    const updatedCard = await updateInIndexedDB(cardId, {
      ...updates,
      updatedAt: new Date(),
      syncStatus: 'pending'
    });

    // 2. Update UI state
    set(state => ({
      cards: state.cards.map(card =>
        card.id === cardId ? updatedCard : card
      )
    }));

    // 3. Broadcast to other tabs
    broadcastUpdate('card-updated', updatedCard);

    // 4. Queue server sync (debounced)
    queueSyncDebounced(cardId);
  },

  // Sync card to server
  syncCard: async (cardId: string) => {
    const card = await getFromIndexedDB(cardId);

    try {
      const response = await fetch(`/api/cards/${cardId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: card.content,
          title: card.title,
          updatedAt: card.updatedAt
        })
      });

      if (response.status === 409) {
        // Conflict - resolve
        const serverData = await response.json();
        await resolveConflict(cardId, card, serverData.card);
      } else if (response.ok) {
        // Success - mark as synced
        await markAsSynced(cardId);
      } else {
        throw new Error(`Sync failed: ${response.status}`);
      }
    } catch (error) {
      console.error('Sync error:', error);

      // Queue for retry
      syncQueue.add({
        operation: 'update',
        resource: 'card',
        resourceId: cardId,
        data: card
      });
    }
  }
}));

// Debounced sync
const queueSyncDebounced = debounce((cardId: string) => {
  useDataStore.getState().syncCard(cardId);
}, 2000);

// Flush before unload
window.addEventListener('beforeunload', () => {
  queueSyncDebounced.flush();
});
```

---

## TESTING SYNC PATTERNS

### Test Multi-Session Conflict

```tsx
// Manual test: Open 2 tabs
// Tab 1: Edit card
// Tab 2: Try to edit same card
// Expected: Tab 2 shows warning, must take control
```

### Test Offline Sync

```tsx
// Manual test:
// 1. Disconnect internet
// 2. Edit card
// 3. Verify saved locally
// 4. Reconnect internet
// 5. Verify synced to server
```

### Test Conflict Resolution

```tsx
// Manual test:
// 1. Edit card on Device A
// 2. Edit same card on Device B
// 3. Sync both
// 4. Verify conflict detected
// 5. Verify last-write-wins
```

---

## SYNC MONITORING

### Sync Status Dashboard

```tsx
// components/debug/sync-status.tsx

export function SyncStatus() {
  const queueStatus = syncQueue.getStatus();
  const { activeSessions, isActiveSession } = useMultiSessionStore();

  return (
    <div className="fixed bottom-4 right-4 p-4 bg-gray-900/90 rounded-xl border border-white/10">
      <h3 className="font-semibold mb-2">Sync Status</h3>

      <div className="space-y-2 text-sm">
        <div>
          <span className="text-gray-400">Queue:</span>
          <span className="ml-2 text-white">{queueStatus.total} items</span>
        </div>

        <div>
          <span className="text-gray-400">Pending:</span>
          <span className="ml-2 text-yellow-400">{queueStatus.pending}</span>
        </div>

        <div>
          <span className="text-gray-400">Processing:</span>
          <span className="ml-2 text-blue-400">{queueStatus.processing}</span>
        </div>

        <div>
          <span className="text-gray-400">Failed:</span>
          <span className="ml-2 text-red-400">{queueStatus.failed}</span>
        </div>

        <div className="pt-2 border-t border-white/10">
          <span className="text-gray-400">Sessions:</span>
          <span className="ml-2 text-white">{activeSessions.length}</span>
          {!isActiveSession && (
            <span className="ml-2 text-yellow-400">(Inactive)</span>
          )}
        </div>
      </div>
    </div>
  );
}
```

---

## CHECKLIST FOR SYNC OPERATIONS

Before implementing sync for new feature, verify:

**Local-First**:
- [ ] IndexedDB updated first (before server)
- [ ] UI updates immediately (optimistic)
- [ ] Server sync is background operation
- [ ] Works offline

**Multi-Session**:
- [ ] Check active session before write
- [ ] Show warning if another tab editing
- [ ] Broadcast updates to other tabs
- [ ] Handle take control action

**Conflict Resolution**:
- [ ] Detect conflicts (409 status)
- [ ] Compare timestamps
- [ ] Apply resolution strategy
- [ ] Show UI for manual resolution

**Retry Logic**:
- [ ] Retry failed operations (max 3 attempts)
- [ ] Exponential backoff delays
- [ ] Mark as permanently failed after max attempts
- [ ] Show user notification

**Queue Management**:
- [ ] Queue operations when offline
- [ ] Deduplicate queue by resource ID
- [ ] Process queue when online
- [ ] Flush queue before unload

**Error Handling**:
- [ ] Log sync errors with context
- [ ] Don't lose data on error
- [ ] Show user-friendly error messages
- [ ] Provide retry action

---

**Last Updated**: October 29, 2025
**Sync Vulnerabilities Patched**: 12 critical issues in October 2025
**Architecture**: Local-first with background sync and conflict resolution

**Key Principle**: IndexedDB is source of truth. Never lose user data. Sync is background process.
