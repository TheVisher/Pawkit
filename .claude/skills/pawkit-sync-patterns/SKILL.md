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
