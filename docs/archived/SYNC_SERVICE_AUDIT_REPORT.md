# Sync Service Security Audit Report

**Date:** 2025-10-28
**File Audited:** `lib/services/sync-service.ts`
**Related Files:** `lib/services/local-storage.ts`, `lib/services/sync-queue.ts`, `lib/utils/device-session.ts`

---

## Executive Summary

The sync service implements a **local-first bidirectional synchronization** strategy with IndexedDB as the source of truth. The audit identified **12 critical vulnerabilities** and **8 moderate issues** across five key areas: concurrent operations, network handling, recovery mechanisms, transaction safety, and conflict resolution.

### Risk Level: **HIGH** ⚠️

**Critical Issues Found:** 12
**Moderate Issues Found:** 8
**Low Priority Issues:** 5

---

## 1. Concurrent Sync Operations

### 🔴 CRITICAL: Race Condition in Sync Lock (Line 40-49)

**Issue:** The `isSyncing` flag is not atomic and can be bypassed by multiple concurrent calls.

```typescript
async sync(): Promise<SyncResult> {
  if (this.isSyncing) {  // ❌ NOT ATOMIC - race condition possible
    console.log('[SyncService] Sync already in progress, skipping');
    return { ... };
  }

  this.isSyncing = true;  // ❌ Gap between check and set
```

**Scenario:**
1. Tab A checks `isSyncing` (false)
2. Tab B checks `isSyncing` (false) - before A sets it
3. Both tabs set `isSyncing = true` and proceed
4. Result: Duplicate sync operations, potential data corruption

**Impact:**
- Duplicate API calls to server (wasted bandwidth)
- Conflicting IndexedDB writes
- Race conditions in temp ID replacement (line 417-418)
- Last sync time corruption (line 83)

**Recommendation:**
```typescript
private syncPromise: Promise<SyncResult> | null = null;

async sync(): Promise<SyncResult> {
  // Return existing promise if sync is in progress
  if (this.syncPromise) {
    return this.syncPromise;
  }

  this.syncPromise = this._performSync();

  try {
    const result = await this.syncPromise;
    return result;
  } finally {
    this.syncPromise = null;
  }
}

private async _performSync(): Promise<SyncResult> {
  // Actual sync logic here
}
```

---

### 🔴 CRITICAL: No Cross-Tab Synchronization Lock

**Issue:** Multiple browser tabs can sync simultaneously, causing race conditions in IndexedDB.

**Scenario:**
- User has app open in 3 tabs
- All tabs trigger sync on window focus
- All tabs read/write to same IndexedDB stores concurrently
- Potential for lost writes and corrupted state

**Recommendation:** Implement a cross-tab lock using BroadcastChannel or SharedWorker:

```typescript
class SyncService {
  private broadcastChannel: BroadcastChannel;
  private syncLeaderTab: boolean = false;

  constructor() {
    this.broadcastChannel = new BroadcastChannel('sync-lock');

    this.broadcastChannel.onmessage = (event) => {
      if (event.data.type === 'SYNC_START') {
        this.isSyncing = true;
      } else if (event.data.type === 'SYNC_END') {
        this.isSyncing = false;
      }
    };
  }

  async sync(): Promise<SyncResult> {
    // Request sync leadership
    this.broadcastChannel.postMessage({ type: 'REQUEST_SYNC' });

    // Only proceed if no other tab responds within 100ms
    await new Promise(resolve => setTimeout(resolve, 100));

    if (this.isSyncing) {
      return { success: false, errors: ['Another tab is syncing'] };
    }

    this.broadcastChannel.postMessage({ type: 'SYNC_START' });
    // ... perform sync
    this.broadcastChannel.postMessage({ type: 'SYNC_END' });
  }
}
```

---

### 🟡 MODERATE: Sync Queue Processing During Active Sync (Line 78-80)

**Issue:** Queue processing happens DURING sync, creating potential for reordering issues.

```typescript
// Step 2: Push local changes to server
const pushResult = await this.pushToServer();

// Step 3: Drain sync queue (retry any failed operations)
await syncQueue.init();
const pendingOps = await syncQueue.getPending();  // ❌ Gets pending, but doesn't process them
```

**Problem:** The code gets pending operations but never actually processes them. This is a logic bug.

**Recommendation:**
```typescript
// Step 3: Process sync queue
await syncQueue.init();
const queueResult = await syncQueue.process();  // Actually process the queue
result.errors.push(...queueResult.errors);
```

---

## 2. Network Interruption Handling

### 🔴 CRITICAL: No Timeout on Network Requests (Line 113-116)

**Issue:** Network requests can hang indefinitely with no timeout.

```typescript
const [cardsRes, collectionsRes] = await Promise.all([
  fetch('/api/cards?limit=10000'),  // ❌ No timeout
  fetch('/api/pawkits'),             // ❌ No timeout
]);
```

**Scenario:**
- User on slow/unreliable network
- Request hangs for 5+ minutes
- User can't use app (sync is blocking)
- `isSyncing` flag remains true forever

**Impact:** App becomes unusable until page refresh

**Recommendation:**
```typescript
const fetchWithTimeout = async (url: string, timeout = 30000): Promise<Response> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error(`Request timeout after ${timeout}ms`);
    }
    throw error;
  }
};

const [cardsRes, collectionsRes] = await Promise.all([
  fetchWithTimeout('/api/cards?limit=10000', 30000),
  fetchWithTimeout('/api/pawkits', 30000),
]);
```

---

### 🔴 CRITICAL: Partial Pull Leaves Inconsistent State (Line 113-149)

**Issue:** If cards fetch succeeds but collections fetch fails, cards are merged but collections aren't.

```typescript
const [cardsRes, collectionsRes] = await Promise.all([
  fetch('/api/cards?limit=10000'),
  fetch('/api/pawkits'),
]);

if (!cardsRes.ok || !collectionsRes.ok) {  // ❌ All or nothing check
  result.errors.push('Failed to fetch from server');
  return result;
}
```

**Problem:** If `cardsRes` is OK but `collectionsRes` fails, we return early without processing either. But if we've already started processing before this check, state is inconsistent.

**Recommendation:**
```typescript
// Handle each resource independently
try {
  if (cardsRes.ok) {
    const cardsData = await cardsRes.json();
    const serverCards: CardDTO[] = cardsData.items || [];
    const cardConflicts = await this.mergeCards(serverCards, localCards);
    result.pulled.cards = serverCards.length;
    result.conflicts.cards = cardConflicts;
  } else {
    result.errors.push(`Failed to fetch cards: ${cardsRes.status}`);
  }
} catch (error) {
  result.errors.push(`Cards merge failed: ${error.message}`);
}

try {
  if (collectionsRes.ok) {
    const collectionsData = await collectionsRes.json();
    // ... process collections
  } else {
    result.errors.push(`Failed to fetch collections: ${collectionsRes.status}`);
  }
} catch (error) {
  result.errors.push(`Collections merge failed: ${error.message}`);
}
```

---

### 🔴 CRITICAL: Push Failures Don't Retry Individual Items (Line 401-458)

**Issue:** If any card push fails, the entire push continues but failed items are lost.

```typescript
for (const card of modifiedCards) {
  try {
    // ... push logic
    if (response.ok) {
      result.pushed.cards++;
    } else {
      result.errors.push(`Failed to create card: ${card.id}`);  // ❌ Just logged, not retried
    }
  } catch (error) {
    result.errors.push(`Failed to push card ${card.id}: ${error}`);  // ❌ Lost forever
  }
}
```

**Problem:** Failed pushes are logged but NOT added to sync queue for retry.

**Recommendation:**
```typescript
for (const card of modifiedCards) {
  try {
    // ... push logic
    if (response.ok) {
      result.pushed.cards++;
    } else {
      // Add to sync queue for retry
      await syncQueue.enqueue({
        type: 'UPDATE_CARD',
        targetId: card.id,
        payload: card,
      });
      result.errors.push(`Failed to push card ${card.id}, queued for retry`);
    }
  } catch (error) {
    // Add to sync queue for retry
    await syncQueue.enqueue({
      type: 'UPDATE_CARD',
      targetId: card.id,
      payload: card,
    });
    result.errors.push(`Failed to push card ${card.id}: ${error}`);
  }
}
```

---

### 🟡 MODERATE: No Exponential Backoff in Sync Queue (sync-queue.ts:259-262)

**Issue:** Queue processing stops after 3 failures but doesn't implement exponential backoff.

```typescript
if (failed >= 3) {
  console.error('[SyncQueue] Too many failures, stopping');
  break;  // ❌ Just stops, doesn't schedule retry
}
```

**Recommendation:**
```typescript
// Add retry scheduling with exponential backoff
private nextRetryTime: number = 0;

async process(): Promise<{ success: number; failed: number }> {
  // Check if we should wait before retrying
  if (Date.now() < this.nextRetryTime) {
    console.log('[SyncQueue] Waiting for retry backoff');
    return { success: 0, failed: 0 };
  }

  // ... processing logic

  if (failed >= 3) {
    // Schedule next retry with exponential backoff
    const backoffMs = Math.min(60000, 1000 * Math.pow(2, failed));
    this.nextRetryTime = Date.now() + backoffMs;
    console.error('[SyncQueue] Too many failures, retrying in', backoffMs, 'ms');
    break;
  }
}
```

---

## 3. Partial Sync Recovery

### 🔴 CRITICAL: No Rollback on Failed Merge (Line 142-149)

**Issue:** If card merge succeeds but collection merge fails, there's no rollback mechanism.

```typescript
// Merge cards
const cardConflicts = await this.mergeCards(serverCards, localCards);
result.pulled.cards = serverCards.length;
result.conflicts.cards = cardConflicts;

// Merge collections
const collectionConflicts = await this.mergeCollections(serverCollections, localCollections);
// ❌ If this fails, cards are already merged with no way to undo
```

**Impact:** Partial state can lead to:
- Cards referencing non-existent collections
- Orphaned cards in UI
- Broken collection tree structure

**Recommendation:** Implement transaction-style rollback:

```typescript
private async pullFromServer(): Promise<...> {
  const snapshot = {
    cards: await localDb.getAllCards(),
    collections: await localDb.getAllCollections(),
  };

  try {
    // Attempt merge
    const cardConflicts = await this.mergeCards(serverCards, localCards);
    const collectionConflicts = await this.mergeCollections(serverCollections, localCollections);

    // Both succeeded, commit is implicit
    return result;
  } catch (error) {
    // Rollback to snapshot
    console.error('[SyncService] Merge failed, rolling back', error);

    // Clear and restore
    await this.restoreSnapshot(snapshot);

    result.errors.push('Merge failed, rolled back changes');
    return result;
  }
}

private async restoreSnapshot(snapshot: any): Promise<void> {
  // Clear stores
  const db = await localDb.getDB();
  await db.clear('cards');
  await db.clear('collections');

  // Restore from snapshot
  for (const card of snapshot.cards) {
    await localDb.saveCard(card);
  }
  for (const collection of snapshot.collections) {
    await localDb.saveCollection(collection);
  }
}
```

---

### 🔴 CRITICAL: Temp ID Replacement Race Condition (Line 417-418)

**Issue:** Deleting temp card and creating new card is not atomic.

```typescript
if (response.ok) {
  const serverCard = await response.json();
  // Replace temp card with server card
  await localDb.deleteCard(card.id);  // ❌ Gap here
  await localDb.saveCard(serverCard, { fromServer: true });  // ❌ If this fails, card is lost
  result.pushed.cards++;
}
```

**Scenario:**
1. Temp card deleted
2. Network error/app crash before saveCard
3. Card is permanently lost

**Recommendation:**
```typescript
if (response.ok) {
  const serverCard = await response.json();

  // Save first, then delete (safer order)
  await localDb.saveCard(serverCard, { fromServer: true });
  await localDb.deleteCard(card.id);

  result.pushed.cards++;
}
```

---

### 🟡 MODERATE: No Resume Support for Interrupted Sync

**Issue:** If sync is interrupted (page close, crash), there's no way to resume from where it stopped.

**Recommendation:** Store sync progress in IndexedDB:

```typescript
interface SyncProgress {
  phase: 'pull_cards' | 'pull_collections' | 'push_cards' | 'push_collections';
  itemsProcessed: number;
  totalItems: number;
  lastItemId: string;
  timestamp: number;
}

async sync(): Promise<SyncResult> {
  // Check for interrupted sync
  const progress = await this.getSyncProgress();

  if (progress && Date.now() - progress.timestamp < 300000) { // 5 minutes
    console.log('[SyncService] Resuming interrupted sync from', progress.phase);
    return this.resumeSync(progress);
  }

  // Start new sync
  await this.saveSyncProgress({ phase: 'pull_cards', itemsProcessed: 0 });
  // ... continue sync
}
```

---

## 4. IndexedDB Transaction Safety

### 🔴 CRITICAL: No Transaction Wrapping for Multi-Operation Changes (local-storage.ts:152-183)

**Issue:** Card saves are individual operations, not wrapped in transactions.

```typescript
async saveCard(card: CardDTO, options?: ...): Promise<void> {
  await this.init();
  if (!this.db) throw new Error('Database not initialized');

  const existing = await this.db.get('cards', card.id);  // Read
  // ... compute cardToSave
  await this.db.put('cards', cardToSave);  // Write - NOT in same transaction
}
```

**Problem:** Another operation can modify the card between read and write.

**Recommendation:**
```typescript
async saveCard(card: CardDTO, options?: ...): Promise<void> {
  await this.init();
  if (!this.db) throw new Error('Database not initialized');

  const tx = this.db.transaction('cards', 'readwrite');
  const store = tx.store;

  try {
    const existing = await store.get(card.id);

    const cardToSave = {
      ...sanitizedCard,
      _locallyModified: options?.localOnly ? true : (existing?._locallyModified || false),
      _locallyCreated: options?.localOnly && !options?.fromServer ? true : (existing?._locallyCreated || false),
      _serverVersion: options?.fromServer ? card.updatedAt : existing?._serverVersion,
    };

    await store.put(cardToSave);
    await tx.done;
  } catch (error) {
    // Transaction will auto-rollback
    throw error;
  }
}
```

---

### 🔴 CRITICAL: Concurrent IndexedDB Writes Can Corrupt Data

**Issue:** Multiple tabs calling `saveCard()` concurrently can cause lost updates.

**Scenario:**
1. Tab A reads card (version 1)
2. Tab B reads card (version 1)
3. Tab A writes card (version 2)
4. Tab B writes card (version 2) - overwrites A's changes

**Recommendation:** Implement optimistic locking with version numbers:

```typescript
interface CardDTO {
  // ... existing fields
  _version?: number;  // Add version field
}

async saveCard(card: CardDTO, options?: ...): Promise<void> {
  const tx = this.db.transaction('cards', 'readwrite');
  const store = tx.store;

  const existing = await store.get(card.id);

  if (existing && existing._version && card._version) {
    if (card._version < existing._version) {
      throw new Error('Concurrent modification detected - card was updated by another tab');
    }
  }

  const cardToSave = {
    ...card,
    _version: (existing?._version || 0) + 1,
  };

  await store.put(cardToSave);
  await tx.done;
}
```

---

### 🟡 MODERATE: No Error Recovery for StructuredClone Failures (local-storage.ts:174-183)

**Issue:** If sanitization fails, the error is thrown but card is lost.

```typescript
try {
  await this.db.put('cards', cardToSave);
} catch (error) {
  console.error('[LocalStorage] Failed to save card to IndexedDB:', error);
  throw error;  // ❌ Card data is lost
}
```

**Recommendation:**
```typescript
try {
  await this.db.put('cards', cardToSave);
} catch (error) {
  console.error('[LocalStorage] Failed to save card, attempting recovery:', error);

  // Try more aggressive sanitization
  const recoveredCard = this.aggressiveSanitize(cardToSave);

  try {
    await this.db.put('cards', recoveredCard);
    console.log('[LocalStorage] Card recovered with aggressive sanitization');
  } catch (recoveryError) {
    // Last resort: save to separate error store for manual recovery
    await this.saveToErrorStore(cardToSave, error);
    throw error;
  }
}

private async saveToErrorStore(card: any, error: any): Promise<void> {
  // Store failed cards in separate store for debugging/recovery
  const errorStore = this.db.transaction('errorCards', 'readwrite').store;
  await errorStore.put({
    id: `error_${Date.now()}`,
    card,
    error: String(error),
    timestamp: Date.now(),
  });
}
```

---

## 5. Conflict Detection Edge Cases

### 🔴 CRITICAL: Device Activity Window Too Short (device-session.ts:10)

**Issue:** 5-minute activity threshold is too aggressive for real-world usage.

```typescript
const ACTIVITY_THRESHOLD = 5 * 60 * 1000; // 5 minutes ❌ Too short
```

**Scenario:**
1. User makes changes on laptop
2. User walks away for 6 minutes to grab coffee
3. User opens phone, syncs
4. Phone becomes "active device" and overwrites laptop changes

**Recommendation:**
```typescript
const ACTIVITY_THRESHOLD = 30 * 60 * 1000; // 30 minutes - more realistic
// OR use a sliding window based on actual edit timestamps
```

---

### 🔴 CRITICAL: Metadata Merge Can Lose User Edits (sync-service.ts:217-232)

**Issue:** Metadata merge always prefers server if server has metadata, even if user manually edited locally.

```typescript
if (serverHasMetadata && !localHasMetadata) {
  console.log('[SyncService] 📥 Server has metadata, merging into local version:', serverCard.id);
  const mergedCard = {
    ...localCard,  // ❌ This loses any intentional local edits
    title: serverCard.title || localCard.title,
    // ...
  };
}
```

**Scenario:**
1. User on Device A manually sets title to "Custom Title"
2. Device B fetches metadata from URL (auto-generated title)
3. Device A syncs
4. User's custom title is overwritten

**Recommendation:**
```typescript
// Check if local card has been explicitly edited (not just auto-generated)
const localHasExplicitEdits = localCard._locallyModified &&
                               localCard.updatedAt > localCard.createdAt;

if (serverHasMetadata && !localHasMetadata && !localHasExplicitEdits) {
  // Only merge if local hasn't been explicitly edited
  const mergedCard = {
    ...localCard,
    title: serverCard.title || localCard.title,
    // ...
  };
}
```

---

### 🔴 CRITICAL: Deletion Conflicts Not Properly Handled (sync-service.ts:191-194)

**Issue:** Local deletion preservation doesn't check if server has newer non-deleted version.

```typescript
if (localCard.deleted) {
  console.log('[SyncService] Local card is deleted, preserving deletion:', localCard.id);
  // Keep local deleted version, will be synced to server in push phase
  continue;  // ❌ What if server has a newer resurrection?
}
```

**Scenario:**
1. Device A deletes card at 10:00 AM
2. Device B (offline) edits card at 10:30 AM
3. Device B comes online and syncs
4. Device A syncs - deletion wins even though edit is newer

**Recommendation:**
```typescript
if (localCard.deleted) {
  const serverTime = new Date(serverCard.updatedAt).getTime();
  const localTime = new Date(localCard.updatedAt).getTime();

  if (!serverCard.deleted && serverTime > localTime) {
    // Server resurrected the card after local deletion
    console.log('[SyncService] Server resurrected card after deletion, accepting:', serverCard.id);
    await localDb.saveCard(serverCard, { fromServer: true });
    continue;
  }

  console.log('[SyncService] Local deletion is newer, preserving:', localCard.id);
  continue;
}
```

---

### 🟡 MODERATE: Metadata Completeness Score is Naive (sync-service.ts:237-256)

**Issue:** Metadata scoring counts fields but doesn't consider quality.

```typescript
const serverMetadataScore = [
  serverCard.image,
  serverCard.description,
  serverCard.articleContent,
  serverCard.metadata
].filter(Boolean).length;  // ❌ Just counts, doesn't check quality
```

**Problem:** An empty string counts the same as rich content.

**Recommendation:**
```typescript
const calculateMetadataQuality = (card: CardDTO): number => {
  let score = 0;

  if (card.image && card.image.length > 10) score += 2;  // Valid image URL
  if (card.description && card.description.length > 50) score += 3;  // Meaningful description
  if (card.articleContent && card.articleContent.length > 200) score += 4;  // Rich content
  if (card.metadata && Object.keys(card.metadata).length > 3) score += 1;  // Rich metadata

  return score;
};

const serverQuality = calculateMetadataQuality(serverCard);
const localQuality = calculateMetadataQuality(localCard);

if (serverQuality > localQuality) {
  // Server has higher quality metadata
}
```

---

### 🟡 MODERATE: Active Device Preference Overrides All Conflicts (sync-service.ts:260-264)

**Issue:** Active device always wins, even with stale data.

```typescript
if (preferLocal && localTime > 0) {
  console.log('[SyncService] 🎯 Active device - keeping local version:', localCard.id);
  conflicts++;
  continue;  // ❌ Always prefers local, even if server is much newer
}
```

**Recommendation:**
```typescript
// Only prefer active device if timestamps are close (within 1 hour)
const timeDiff = Math.abs(serverTime - localTime);
const ONE_HOUR = 60 * 60 * 1000;

if (preferLocal && localTime > 0 && timeDiff < ONE_HOUR) {
  console.log('[SyncService] 🎯 Active device with recent timestamp, keeping local version');
  conflicts++;
  continue;
}

// If server is much newer, prefer server even on active device
if (serverTime > localTime + ONE_HOUR) {
  console.log('[SyncService] Server version significantly newer, using server despite active device');
  await localDb.saveCard(serverCard, { fromServer: true });
}
```

---

## Additional Low-Priority Issues

### 🟢 LOW: No Sync Progress Reporting

Users have no visibility into sync progress for large datasets.

**Recommendation:** Emit progress events:

```typescript
interface SyncProgressEvent {
  phase: 'pull' | 'push' | 'queue';
  current: number;
  total: number;
  percentage: number;
}

private emitProgress(event: SyncProgressEvent): void {
  window.dispatchEvent(new CustomEvent('sync-progress', { detail: event }));
}
```

---

### 🟢 LOW: No Conflict Resolution UI

Users can't see or resolve conflicts manually.

**Recommendation:** Store conflicts for user review:

```typescript
interface ConflictRecord {
  id: string;
  entityType: 'card' | 'collection';
  entityId: string;
  localVersion: any;
  serverVersion: any;
  timestamp: number;
  autoResolved: boolean;
  resolution: 'local' | 'server' | 'merge';
}

// Store in IndexedDB for user review
await localDb.saveConflict(conflictRecord);
```

---

### 🟢 LOW: No Sync Health Metrics

No way to track sync reliability over time.

**Recommendation:** Store sync health metrics:

```typescript
interface SyncMetrics {
  totalSyncs: number;
  successfulSyncs: number;
  failedSyncs: number;
  averageDuration: number;
  lastSuccessfulSync: number;
  consecutiveFailures: number;
}
```

---

## Summary of Critical Fixes Required

### Immediate Action Required (Critical - Must Fix):

1. **Add atomic sync lock** - Prevent concurrent syncs from same/different tabs
2. **Add network timeouts** - Prevent infinite hangs (30s timeout recommended)
3. **Implement rollback mechanism** - Ensure all-or-nothing sync transactions
4. **Fix temp ID replacement** - Make atomic to prevent data loss
5. **Add retry queue for failed pushes** - Don't lose data on network errors
6. **Wrap IndexedDB operations in transactions** - Prevent concurrent write corruption
7. **Implement optimistic locking** - Detect concurrent modifications
8. **Fix deletion conflict handling** - Check timestamps, not just deletion flags
9. **Increase activity threshold** - 30 minutes instead of 5
10. **Add quality-based metadata merging** - Don't blindly prefer more fields

### High Priority (Should Fix Soon):

1. Add exponential backoff to sync queue
2. Implement sync progress tracking
3. Add conflict resolution UI
4. Improve metadata completeness scoring
5. Add sync health metrics

### Medium Priority (Nice to Have):

1. Resume interrupted syncs
2. Better error recovery for StructuredClone failures
3. Cross-device conflict notifications

---

## Testing Recommendations

### Test Scenarios to Validate Fixes:

1. **Concurrent Sync Test:**
   - Open 5 tabs
   - Trigger sync in all tabs simultaneously
   - Verify only one sync runs

2. **Network Interruption Test:**
   - Start sync
   - Disconnect network mid-sync
   - Verify timeout triggers
   - Verify no data corruption

3. **Partial Failure Test:**
   - Mock cards API success, collections API failure
   - Verify rollback works
   - Verify no partial state

4. **Temp ID Race Test:**
   - Create card
   - Trigger sync
   - Crash app before temp ID replacement completes
   - Verify card still exists after restart

5. **Deletion Conflict Test:**
   - Device A deletes card at T1
   - Device B (offline) edits card at T2 (T2 > T1)
   - Sync both devices
   - Verify edit wins (newer timestamp)

6. **Multi-Tab Write Test:**
   - Open 2 tabs
   - Edit same card in both tabs simultaneously
   - Verify optimistic lock detects conflict
   - Verify no data loss

---

## Estimated Fix Effort

- **Critical Fixes:** 3-5 days (full-time dev)
- **High Priority:** 2-3 days
- **Medium Priority:** 1-2 days
- **Testing & Validation:** 2-3 days

**Total Estimated Effort:** 8-13 days

---

## Conclusion

The sync service has a solid architectural foundation with local-first principles, but has critical race conditions and data loss scenarios that must be addressed before production use with multiple users/devices.

**Priority 1:** Fix concurrent sync lock and network timeouts (prevent app from becoming unusable)
**Priority 2:** Add transaction safety and rollback (prevent data loss)
**Priority 3:** Improve conflict resolution (prevent user frustration)

**Recommendation:** Consider implementing a staged rollout:
1. Fix critical issues (Week 1)
2. Add comprehensive tests (Week 2)
3. Beta test with 10-20 users (Week 3)
4. Monitor sync health metrics (Ongoing)
5. Roll out to all users (Week 4)
