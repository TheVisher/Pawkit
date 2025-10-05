# Pawkit Sync & Queue Improvements Plan

## Overview

This document outlines the phased approach to improving Pawkit's optimistic update system with persistent queuing, idempotency, and retry logic to prevent data loss and ensure reliable sync.

---

## Background: Why These Improvements?

**Current Implementation (Before Improvements):**
- ✅ Optimistic updates (instant UI)
- ✅ Background sync to server
- ✅ Rollback on error
- ❌ Data loss on page refresh during sync
- ❌ Duplicate operations on network issues
- ❌ No retry logic for transient failures

**Goal:**
Create a production-ready sync system that:
1. Never loses data (even on crash/refresh)
2. Never creates duplicates
3. Handles transient network failures gracefully
4. Still feels instant to the user

---

## Phase 1: IndexedDB Queue ✅ **COMPLETED**

**Status**: Implemented and deployed (Commits: `f3669ce`, `1b9429b`, `6861cf5`)

### What We Built

1. **Persistent Queue Service** (`lib/services/sync-queue.ts`)
   - IndexedDB-backed operation queue
   - Operations persist across page refreshes
   - Methods: `enqueue()`, `getPending()`, `remove()`, `markFailed()`

2. **Queue Integration** (`lib/stores/data-store.ts`)
   - All card operations queue to IndexedDB before executing
   - Operations execute with operation ID for proper cleanup
   - `drainQueue()` method resumes pending operations on app startup

3. **Dashboard Integration** (`app/(dashboard)/layout.tsx`)
   - Automatically drains queue after store initialization
   - Ensures pending operations resume on app reload

4. **Manual Metadata Refresh** (`components/modals/card-detail-modal.tsx`)
   - Added "Refresh Metadata" button in Actions tab
   - User-controlled solution for stuck/outdated metadata
   - Updates card across entire app

### How It Works

```
User Action Flow:
1. User adds/updates/deletes card
2. Operation saved to IndexedDB queue (with unique ID)
3. Optimistic update applied to UI (instant feedback)
4. API call executes in background (with operation ID)
5. On success: Remove operation from queue
6. On failure: Mark as failed, retry on next drain

If page refreshes during step 4:
→ Operation persists in IndexedDB
→ On next load: drainQueue() resumes operation
→ No data loss! ✅
```

### Files Changed

- `package.json` - Added `idb` package
- `lib/services/sync-queue.ts` - **NEW** Queue manager
- `lib/stores/data-store.ts` - Queue integration
- `app/(dashboard)/layout.tsx` - Queue drain on startup
- `components/modals/card-detail-modal.tsx` - Metadata refresh button

### Bugs Fixed

- **Zombie Cards Bug** (Commit `6861cf5`): Fixed cards reappearing after deletion due to missing operation ID in immediate execution

### Testing Completed

✅ Card creation survives hard refresh
✅ Card updates persist through browser close
✅ Card deletions stay deleted after refresh
✅ Multiple rapid operations handled correctly
✅ Metadata refresh button works manually

---

## Phase 2: Idempotency Tokens 🔜 **PLANNED**

**Status**: Not yet implemented
**Priority**: High (prevents duplicates)
**Estimated Time**: 3-4 hours

### The Problem

Without idempotency:
- User clicks "Add Card" twice on slow network → Creates 2 cards
- Page refresh mid-sync retries operation → Duplicate card
- Network timeout + retry → Duplicate operation

### The Solution

Add idempotency tokens (UUIDs) to prevent duplicate operations.

### What Will Change

#### 1. Generate Idempotency Keys

**File**: `lib/services/sync-queue.ts`

```typescript
import { v4 as uuidv4 } from 'uuid';

// Add to QueueOperation interface
export interface QueueOperation {
  id: string;
  idempotencyKey: string; // NEW - prevents duplicates
  type: OperationType;
  // ... rest of fields
}

// Update enqueue() method
async enqueue(operation: Omit<QueueOperation, 'id' | 'timestamp' | 'retries' | 'status' | 'idempotencyKey'>): Promise<string> {
  const id = `op_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const idempotencyKey = uuidv4(); // NEW

  const queueOperation: QueueOperation = {
    ...operation,
    id,
    idempotencyKey, // NEW
    timestamp: Date.now(),
    retries: 0,
    status: 'pending',
  };

  await this.db.add('operations', queueOperation);
  return id;
}
```

#### 2. Send Idempotency Key to Server

**File**: `lib/stores/data-store.ts`

```typescript
// Update helper functions to include idempotency header
async function executeCreateCard(op: QueueOperation, set: any, get: any) {
  const { payload, tempId, idempotencyKey } = op;

  const response = await fetch('/api/cards', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Idempotency-Key': idempotencyKey // NEW
    },
    body: JSON.stringify(payload)
  });

  // ... rest of logic
}

// Similar updates for executeUpdateCard() and executeDeleteCard()
```

#### 3. Handle Idempotency on Server (OPTIONAL)

**Files**:
- `app/api/cards/route.ts` (POST)
- `app/api/cards/[id]/route.ts` (PATCH, DELETE)

**Option A: In-Memory Cache (Simple)**
```typescript
// Store recent operation IDs in memory (cleared on server restart)
const recentOperations = new Map<string, any>();

export async function POST(request: NextRequest) {
  const idempotencyKey = request.headers.get('Idempotency-Key');

  // Check if we've seen this operation before
  if (idempotencyKey && recentOperations.has(idempotencyKey)) {
    console.log('Duplicate operation detected, returning cached result');
    return NextResponse.json(recentOperations.get(idempotencyKey));
  }

  // ... execute operation normally

  // Cache result for 24 hours
  if (idempotencyKey) {
    recentOperations.set(idempotencyKey, result);
    setTimeout(() => recentOperations.delete(idempotencyKey), 86400000);
  }

  return NextResponse.json(result);
}
```

**Option B: Database (Production-Ready)**
```prisma
// Add to schema.prisma
model Operation {
  id             String   @id @default(cuid())
  idempotencyKey String   @unique
  result         Json?
  createdAt      DateTime @default(now())
  expiresAt      DateTime

  @@index([idempotencyKey])
  @@index([expiresAt])
}
```

```typescript
export async function POST(request: NextRequest) {
  const idempotencyKey = request.headers.get('Idempotency-Key');

  if (idempotencyKey) {
    // Check database for existing operation
    const existing = await prisma.operation.findUnique({
      where: { idempotencyKey }
    });

    if (existing && existing.expiresAt > new Date()) {
      return NextResponse.json(existing.result);
    }
  }

  // ... execute operation

  // Store result in database
  if (idempotencyKey) {
    await prisma.operation.create({
      data: {
        idempotencyKey,
        result: card,
        expiresAt: new Date(Date.now() + 86400000) // 24 hours
      }
    });
  }

  return NextResponse.json(card);
}
```

#### 4. Add Cleanup Job (Optional)

If using database approach, add cleanup for expired operations:

```typescript
// lib/jobs/cleanup-operations.ts
export async function cleanupExpiredOperations() {
  await prisma.operation.deleteMany({
    where: {
      expiresAt: {
        lt: new Date()
      }
    }
  });
}

// Call periodically or via cron
```

### Dependencies

```bash
pnpm add uuid
pnpm add -D @types/uuid
```

### Testing Checklist

- [ ] Slow network + double-click → Only 1 card created
- [ ] Page refresh during sync → Same card created (not duplicate)
- [ ] Retry after failure → Uses cached result if available
- [ ] Idempotency keys are unique per operation
- [ ] Server deduplicates correctly

### Files to Change

- `lib/services/sync-queue.ts` - Add idempotencyKey generation
- `lib/stores/data-store.ts` - Send idempotency header
- `app/api/cards/route.ts` - Handle idempotency (optional)
- `app/api/cards/[id]/route.ts` - Handle idempotency (optional)
- `prisma/schema.prisma` - Add Operation model (if using DB approach)
- `package.json` - Add uuid dependency

---

## Phase 3: Retry Logic with Exponential Backoff 🔜 **PLANNED**

**Status**: Not yet implemented
**Priority**: Medium (improves reliability)
**Estimated Time**: 2-3 hours

### The Problem

Without retry logic:
- Transient network error → Operation fails permanently
- User loses WiFi briefly → All pending operations fail
- Server temporarily down → No automatic recovery

### The Solution

Add automatic retry with exponential backoff for transient failures.

### What Will Change

#### 1. Add Retry Configuration

**File**: `lib/services/sync-queue.ts`

```typescript
const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 8000,  // 8 seconds
  backoffMultiplier: 2
};

// Calculate delay with exponential backoff + jitter
function getRetryDelay(retryCount: number): number {
  const exponentialDelay = RETRY_CONFIG.baseDelay * Math.pow(RETRY_CONFIG.backoffMultiplier, retryCount);
  const cappedDelay = Math.min(exponentialDelay, RETRY_CONFIG.maxDelay);
  const jitter = Math.random() * 0.3 * cappedDelay; // ±30% jitter
  return cappedDelay + jitter;
}
```

#### 2. Update Queue Operations

**File**: `lib/services/sync-queue.ts`

```typescript
export interface QueueOperation {
  id: string;
  idempotencyKey: string;
  type: OperationType;
  payload: any;
  tempId?: string;
  targetId?: string;
  timestamp: number;
  retries: number;
  maxRetries: number; // NEW
  lastError?: string; // NEW
  nextRetryAt?: number; // NEW
  status: 'pending' | 'processing' | 'failed' | 'retrying'; // UPDATED
}

// Update markFailed to increment retries and schedule next attempt
async markFailed(id: string, error: string): Promise<void> {
  await this.init();
  if (!this.db) return;

  const tx = this.db.transaction('operations', 'readwrite');
  const operation = await tx.store.get(id);

  if (operation) {
    operation.retries += 1;
    operation.lastError = error;

    if (operation.retries < RETRY_CONFIG.maxRetries) {
      operation.status = 'retrying';
      operation.nextRetryAt = Date.now() + getRetryDelay(operation.retries);
      console.log(`[SyncQueue] Scheduling retry ${operation.retries}/${RETRY_CONFIG.maxRetries} for ${id}`);
    } else {
      operation.status = 'failed';
      console.error(`[SyncQueue] Operation permanently failed after ${operation.retries} retries:`, id);
    }

    await tx.store.put(operation);
  }
  await tx.done;
}
```

#### 3. Update Drain Queue Logic

**File**: `lib/stores/data-store.ts`

```typescript
drainQueue: async () => {
  console.log('[DataStore] drainQueue() called');

  const pendingOps = await syncQueue.getPending();
  console.log('[DataStore] Found', pendingOps.length, 'pending operations');

  for (const op of pendingOps) {
    // Skip operations not ready for retry yet
    if (op.status === 'retrying' && op.nextRetryAt && op.nextRetryAt > Date.now()) {
      console.log('[DataStore] Skipping operation - retry scheduled for:', new Date(op.nextRetryAt));
      continue;
    }

    console.log('[DataStore] Processing queued operation:', op.id, op.type, `(retry ${op.retries})`);

    try {
      await syncQueue.markProcessing(op.id);

      // Execute the operation based on type
      if (op.type === 'CREATE_CARD') {
        await executeCreateCard(op, set, get);
      } else if (op.type === 'UPDATE_CARD') {
        await executeUpdateCard(op, set, get);
      } else if (op.type === 'DELETE_CARD') {
        await executeDeleteCard(op, set, get);
      }

      // Remove from queue on success
      await syncQueue.remove(op.id);
      console.log('[DataStore] Operation succeeded:', op.id);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[DataStore] Failed to process queued operation:', op.id, errorMessage);
      await syncQueue.markFailed(op.id, errorMessage);
    }
  }

  console.log('[DataStore] drainQueue() complete');

  // Schedule next drain if there are retrying operations
  const retryingOps = await syncQueue.getRetrying();
  if (retryingOps.length > 0) {
    const nextRetry = Math.min(...retryingOps.map(op => op.nextRetryAt || Infinity));
    const delayMs = Math.max(0, nextRetry - Date.now());
    console.log('[DataStore] Scheduling next drain in', delayMs, 'ms');
    setTimeout(() => get().drainQueue(), delayMs);
  }
},
```

#### 4. Add Helper Methods

**File**: `lib/services/sync-queue.ts`

```typescript
// Get operations ready to retry
async getRetrying(): Promise<QueueOperation[]> {
  await this.init();
  if (!this.db) return [];

  const tx = this.db.transaction('operations', 'readonly');
  const index = tx.store.index('by-status');
  const operations = await index.getAll('retrying');

  return operations;
}

// Get permanently failed operations
async getFailed(): Promise<QueueOperation[]> {
  await this.init();
  if (!this.db) return [];

  const tx = this.db.transaction('operations', 'readonly');
  const index = tx.store.index('by-status');
  return await index.getAll('failed');
}

// Manual retry for failed operations
async retryOperation(id: string): Promise<void> {
  await this.init();
  if (!this.db) return;

  const tx = this.db.transaction('operations', 'readwrite');
  const operation = await tx.store.get(id);

  if (operation && operation.status === 'failed') {
    operation.status = 'pending';
    operation.retries = 0;
    operation.lastError = undefined;
    operation.nextRetryAt = undefined;
    await tx.store.put(operation);
    console.log('[SyncQueue] Manually retrying operation:', id);
  }
  await tx.done;
}
```

#### 5. Add UI for Failed Operations (Optional)

**File**: `components/sync-status-indicator.tsx` (NEW)

```typescript
'use client';

import { useEffect, useState } from 'react';
import { syncQueue } from '@/lib/services/sync-queue';
import { Button } from '@/components/ui/button';

export function SyncStatusIndicator() {
  const [failedCount, setFailedCount] = useState(0);
  const [retryingCount, setRetryingCount] = useState(0);

  useEffect(() => {
    const checkStatus = async () => {
      const failed = await syncQueue.getFailed();
      const retrying = await syncQueue.getRetrying();
      setFailedCount(failed.length);
      setRetryingCount(retrying.length);
    };

    checkStatus();
    const interval = setInterval(checkStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  if (failedCount === 0 && retryingCount === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 bg-gray-900 border border-gray-800 rounded-lg p-4 shadow-lg">
      {retryingCount > 0 && (
        <div className="text-sm text-yellow-400 mb-2">
          🔄 Retrying {retryingCount} operation{retryingCount !== 1 ? 's' : ''}...
        </div>
      )}
      {failedCount > 0 && (
        <div className="text-sm text-red-400">
          ❌ {failedCount} operation{failedCount !== 1 ? 's' : ''} failed
          <Button
            size="sm"
            variant="outline"
            className="ml-2"
            onClick={async () => {
              const failed = await syncQueue.getFailed();
              await Promise.all(failed.map(op => syncQueue.retryOperation(op.id)));
              window.location.reload();
            }}
          >
            Retry All
          </Button>
        </div>
      )}
    </div>
  );
}
```

### Testing Checklist

- [ ] Disconnect WiFi → Operations auto-retry when reconnected
- [ ] Slow network (throttle in DevTools) → Operations retry with backoff
- [ ] Server error (500) → Retries 3 times then marks as failed
- [ ] Permanent error (400) → Fails immediately without retries
- [ ] Manual retry button works for failed operations
- [ ] Exponential backoff delays increase correctly

### Files to Change

- `lib/services/sync-queue.ts` - Add retry logic and helpers
- `lib/stores/data-store.ts` - Update drainQueue to respect retry delays
- `components/sync-status-indicator.tsx` - **NEW** UI for failed operations
- `app/(dashboard)/layout.tsx` - Add SyncStatusIndicator component

---

## Phase 4: Versioning & Conflict Resolution 🔜 **OPTIONAL**

**Status**: Not yet implemented
**Priority**: Low (only needed for collaborative features)
**Estimated Time**: 4-5 hours

### The Problem

Without versioning:
- User A edits card on desktop
- User B edits same card on mobile
- Last write wins → One user's changes silently overwritten

### The Solution

Add version/timestamp to updates and detect conflicts.

### What Will Change

#### 1. Add Version Field

**File**: `lib/types.ts`

```typescript
export type CardModel = {
  id: string;
  version: number; // NEW - increments on each update
  // ... rest of fields
}
```

**Migration**: Add version column to database

```prisma
model Card {
  id      String @id @default(cuid())
  version Int    @default(1) // NEW
  // ... rest of fields
}
```

#### 2. Send Version with Updates

**File**: `lib/stores/data-store.ts`

```typescript
updateCard: async (id: string, updates: Partial<CardDTO>) => {
  const oldCard = get().cards.find(c => c.id === id);
  if (!oldCard) return;

  const operationId = await syncQueue.enqueue({
    type: 'UPDATE_CARD',
    payload: {
      ...updates,
      version: oldCard.version // Include current version
    },
    targetId: id
  });

  // ... rest of logic
}
```

#### 3. Validate Version on Server

**File**: `app/api/cards/[id]/route.ts`

```typescript
export async function PATCH(request: NextRequest, segmentData: RouteParams) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const params = await segmentData.params;
  const body = await request.json();

  // Get current card from database
  const currentCard = await getCard(user.id, params.id);
  if (!currentCard) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Check version conflict
  if (body.version && body.version < currentCard.version) {
    return NextResponse.json(
      {
        error: "Conflict",
        message: "Card was modified by another client",
        currentVersion: currentCard.version,
        currentCard: currentCard
      },
      { status: 409 }
    );
  }

  // Increment version
  const updatedCard = await updateCard(user.id, params.id, {
    ...body,
    version: currentCard.version + 1
  });

  return NextResponse.json(updatedCard);
}
```

#### 4. Handle Conflicts in Client

**File**: `lib/stores/data-store.ts`

```typescript
async function executeUpdateCard(op: QueueOperation, set: any, get: any) {
  const { payload, targetId } = op;
  const oldCard = get().cards.find((c: CardDTO) => c.id === targetId);

  try {
    const response = await fetch(`/api/cards/${targetId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (response.status === 409) {
      // Conflict detected
      const { currentCard } = await response.json();

      // Show conflict modal to user (implement UI)
      console.warn('Conflict detected:', {
        local: payload,
        remote: currentCard
      });

      // For now, accept server version
      set((state: any) => ({
        cards: state.cards.map((c: CardDTO) =>
          c.id === targetId ? currentCard : c
        )
      }));

      // Remove from queue
      if (op.id) await syncQueue.remove(op.id);
      return;
    }

    if (!response.ok) {
      // Rollback on other errors
      if (oldCard) {
        set((state: any) => ({
          cards: state.cards.map((c: CardDTO) => c.id === targetId ? oldCard : c)
        }));
      }
      throw new Error('Failed to update card on server');
    }

    // Update with server response (includes new version)
    const updatedCard = await response.json();
    set((state: any) => ({
      cards: state.cards.map((c: CardDTO) =>
        c.id === targetId ? updatedCard : c
      )
    }));

    // Remove from queue
    if (op.id) await syncQueue.remove(op.id);
  } catch (error) {
    console.error('Failed to execute update card:', error);
    throw error;
  }
}
```

#### 5. Conflict Resolution UI (Optional)

**File**: `components/modals/conflict-resolution-modal.tsx` (NEW)

```typescript
type ConflictResolutionModalProps = {
  localCard: CardDTO;
  remoteCard: CardDTO;
  onResolve: (resolution: 'local' | 'remote' | 'merge') => void;
};

export function ConflictResolutionModal({
  localCard,
  remoteCard,
  onResolve
}: ConflictResolutionModalProps) {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm">
      <div className="bg-gray-950 rounded-lg p-6 max-w-2xl mx-auto mt-20">
        <h2 className="text-xl font-bold mb-4">Conflict Detected</h2>
        <p className="text-sm text-gray-400 mb-4">
          This card was modified in another window/device. Choose which version to keep:
        </p>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="border border-gray-800 rounded p-4">
            <h3 className="font-bold mb-2">Your Changes</h3>
            <pre className="text-xs overflow-auto">
              {JSON.stringify(localCard, null, 2)}
            </pre>
          </div>

          <div className="border border-gray-800 rounded p-4">
            <h3 className="font-bold mb-2">Server Version</h3>
            <pre className="text-xs overflow-auto">
              {JSON.stringify(remoteCard, null, 2)}
            </pre>
          </div>
        </div>

        <div className="flex gap-3">
          <Button onClick={() => onResolve('local')}>
            Keep My Changes
          </Button>
          <Button onClick={() => onResolve('remote')} variant="outline">
            Use Server Version
          </Button>
          <Button onClick={() => onResolve('merge')} variant="secondary">
            Merge Both (Manual)
          </Button>
        </div>
      </div>
    </div>
  );
}
```

### Testing Checklist

- [ ] Edit card on two devices → Conflict detected
- [ ] User chooses which version to keep
- [ ] Version increments correctly after each update
- [ ] No silent overwrites of changes

### Files to Change

- `lib/types.ts` - Add version field
- `prisma/schema.prisma` - Add version column
- `lib/stores/data-store.ts` - Send version with updates
- `app/api/cards/[id]/route.ts` - Validate version, return 409 on conflict
- `components/modals/conflict-resolution-modal.tsx` - **NEW** UI for conflicts

---

## Summary Table

| Phase | Priority | Status | Time | Main Benefit |
|-------|----------|--------|------|--------------|
| Phase 1: Queue | Critical | ✅ Done | 3h | No data loss on refresh |
| Phase 2: Idempotency | High | 🔜 Planned | 3-4h | No duplicate operations |
| Phase 3: Retry | Medium | 🔜 Planned | 2-3h | Auto-recovery from failures |
| Phase 4: Versioning | Low | 🔜 Optional | 4-5h | Conflict detection |

---

## Current Implementation Status

### ✅ What's Working

- Optimistic UI updates (instant feedback)
- IndexedDB queue persistence
- Operations survive page refresh
- Proper queue cleanup after sync
- Manual metadata refresh button
- Zombie card bug fixed

### 🔜 What's Next

Choose based on your needs:

1. **Start using Pawkit now** - Current implementation is production-ready for single-user
2. **Add Phase 2** - If you want bulletproof duplicate prevention
3. **Add Phase 3** - If you want automatic retry for network issues
4. **Skip Phase 4** - Unless you're building collaborative features

---

## Deployment Log

| Date | Commit | Description |
|------|--------|-------------|
| 2025-10-04 | `f3669ce` | Phase 1: IndexedDB queue implementation |
| 2025-10-04 | `1b9429b` | Add manual metadata refresh button |
| 2025-10-04 | `6861cf5` | Fix zombie cards bug (operation ID issue) |

---

## References

- **ChatGPT Analysis**: [Original conversation about optimistic UI patterns]
- **Queue Implementation**: Based on production patterns from Notion, Linear, etc.
- **Retry Strategy**: Exponential backoff with jitter (industry standard)
- **Idempotency**: RFC 7231 HTTP idempotency best practices

---

*Last Updated: 2025-10-04*
*Document Version: 1.0*
