# Debug Logging Cleanup Plan

## Summary
This document outlines all debug logging that will be removed as part of cleaning up the delete sync bug fixes.

## Files to Clean Up

### 1. **lib/stores/data-store.ts** - HEAVY CLEANUP NEEDED
**Lines with debug logging:** 23, 32, 41, 56, 68, 73, 81, 97, 101, 113-114, 129, 136, 180-182, 188, 194, 202, 211, 219, 221, 230, 234, 274, 278, 299, 309, 311, 321, 345, 350, 357, 367, 379, 391, 398, 406, 408, 413, 428, 448, 458, 460, 465, 525, 530, 548, 561, 571, 587, 639, 648, 651, 659, 678, 703, 729, 738, 740, 756, 765, 802, 821, 825, 874, 898, 938, 952, 1032, 1050, 1067, 1091, 1111

**REMOVE these console.log statements:**
- `[WriteGuard] ✅ Write allowed` (line 32) - Remove
- `[deduplicateCards] Starting deduplication...` - Remove excessive logging
- `[deduplicateCards] Cards to delete:` - Remove
- `[deduplicateCards] Deduplication complete:` - Remove
- `[extractAndSaveLinks] Starting extraction...` - Remove ALL extract link logging (lines 180-234)
- `[DataStore V2] Already initialized` - Remove
- `[DataStore V2] Initializing from local storage...` - Remove
- `[DataStore V2] Loaded from local:` - Remove
- `[DataStore V2] Sync skipped...` - Remove
- `[DataStore V2] Starting sync...` - Remove
- `[DataStore V2] 📦 After sync - loaded from localDb:` - Remove
- `[DataStore V2] 🔍 After filtering deleted items:` - Remove
- `[DataStore V2] ✅ Final state after deduplication:` - Remove
- `[DataStore V2] Sync complete:` - Remove
- `[DataStore V2] Refreshing from local storage...` - Remove
- `[DataStore V2] Card added to local storage:` - Remove
- `[DataStore V2] Syncing card to server with payload:` - Remove
- `[DataStore V2] Server response:` - Remove
- `[DataStore V2] Server card is deleted...` - Remove
- `[DataStore V2] Card synced to server:` - Remove
- `[DataStore V2] Checking extraction condition:` - Remove
- `[DataStore V2] CALLING extractAndSaveLinks` - Remove
- `[DataStore V2] SKIPPED extraction...` - Remove
- `[DataStore V2] Card updated in local storage:` - Remove
- `[DataStore V2] Card update retry succeeded:` - Remove
- `[DataStore V2] Card soft deleted from local storage:` - Remove
- `[DataStore V2] Collection added to local storage:` - Remove
- `[DataStore V2] Collection synced to server:` - Remove
- `[DataStore V2] Collection updated locally:` - Remove
- `[DataStore V2] drainQueue() called...` - Remove
- `[DataStore V2] Data exported successfully` - Remove
- `[DataStore V2] Data imported successfully` - Remove

**KEEP these console.warn/error statements:**
- `[WriteGuard] ❌ Write blocked` (line 23) - **KEEP** (important security warning)
- `[DataStore V2] ⚠️ DUPLICATE DETECTED` (line 56) - **KEEP** (user requested to keep duplicate detection)
- `[DataStore V2] Removing duplicate collection` - **KEEP**
- `[DataStore V2] ❌ BUG: Deleted cards after filtering` (line 309, 406, 458) - **KEEP** (important bug detection)
- `[DataStore V2] Conflict detected` (line 678) - **KEEP** (important for debugging conflicts)
- `[DataStore V2] Card update retry failed` (line 740) - **KEEP** (important warning)
- `[DataStore V2] Failed to delete card from server, queued` (line 825) - **KEEP** (important warning)

---

### 2. **lib/services/sync-service.ts** - MODERATE CLEANUP
**Lines with debug logging:** 43, 46, 84, 90, 132, 148, 153, 173, 185, 205, 248, 283, 372, 387, 402, 408, 417, 425, 427, 443, 467, 478, 485, 493, 497, 509, 565, 580, 586, 595, 598, 606, 615, 641, 730

**REMOVE these console.log statements:**
- `[SyncService] Another tab started/finished syncing` - Remove
- `[SyncService] Sync already in progress...` - Remove
- `[SyncService] Starting sync...` - Remove
- `[SyncService] Processed sync queue:` - Remove
- `[SyncService] Sync complete:` - Remove
- `[SyncService] Created snapshot:` - Remove
- `[SyncService] ⚠️ Restoring from snapshot...` - Remove
- `[SyncService] ✓ Snapshot restored successfully` - Remove
- `[SyncService] Pulled X cards from server` - Remove
- `[SyncService] 🎯 This device is ACTIVE...` - Remove
- `[SyncService] 📥 Synced new card from server:` - Remove
- `[SyncService] ⚠️ Server resurrected card...` - Keep as warn, but simplify
- `[SyncService] Local card deletion is newer...` - Remove
- `[SyncService] 🗑️ Applying remote deletion:` - Remove
- `[SyncService] ✅ Deleted card saved to localDb:` - Remove
- `[SyncService] Server card deletion is older...` - Remove
- `[SyncService] 📥 Server has metadata...` - Remove
- `[SyncService] 📥 Server has higher quality metadata...` - Remove
- `[SyncService] 🎯 Active device with recent timestamp...` - Remove
- `[SyncService] Server version significantly newer...` - Remove
- `[SyncService] Server/Local version newer for card:` - Remove
- `[SyncService] Card exists locally but not on server:` - Remove
- `[SyncService] 📥 Synced new collection...` - Remove
- `[SyncService] Pushing X modified cards/collections...` - Remove

**KEEP these console.error statements:**
- All console.error statements for actual sync failures

---

### 3. **lib/services/sync-queue.ts** - LIGHT CLEANUP
**Lines with debug logging:** 79, 93, 130, 145, 175, 186, 206, 266, 283

**REMOVE these console.log statements:**
- `[SyncQueue] Duplicate operation detected...` - Remove
- `[SyncQueue] Enqueued operation:` - Remove
- `[SyncQueue] Removed operation:` - Remove
- `[SyncQueue] Retrying operation:` - Remove
- `[SyncQueue] Cleared all operations` - Remove
- `[SyncQueue] Processing X operations` - Remove
- `[SyncQueue] Operation completed:` - Remove
- `[SyncQueue] Processing complete:` - Remove

---

### 4. **lib/services/local-storage.ts** - MODERATE CLEANUP
**Lines with debug logging:** 215, 224, 251, 349, 357, 365, 483, 499, 517, 541, 566, 604, 626, 650, 673

**REMOVE these console.log statements:**
- `[LocalStorage] Soft deleted card:` - Remove
- `[LocalStorage] Permanently deleted card:` - Remove
- `[LocalStorage] Emptied trash:` - Remove
- `[LocalStorage] Saved collection:` - Remove
- `[LocalStorage] Deleted collection:` - Remove
- `[LocalStorage] Permanently deleted collection:` - Remove
- `[LocalStorage] Imported data:` - Remove
- `[LocalStorage] Cleared all data` - Remove
- `[LocalStorage] Added note link:` - Remove
- `[LocalStorage] Deleted note link:` - Remove
- `[LocalStorage] Deleted all links for note:` - Remove
- `[LocalStorage] Updated link references:` - Remove
- `[LocalStorage] Added note card link:` - Remove
- `[LocalStorage] Deleted note card link:` - Remove
- `[LocalStorage] Deleted all card links for note:` - Remove

**KEEP:**
- All console.error statements

---

### 5. **app/api/cards/[id]/route.ts** - LIGHT CLEANUP
**Lines with debug logging:** 103, 114, 117, 134, 138

**REMOVE these console.log statements:**
- `[DELETE] Unauthorized - no user` (line 103) - Remove
- `[DELETE] User serverSync setting:` (line 114) - Remove
- `[DELETE] Blocked - serverSync disabled` (line 117) - Remove
- `[DELETE] Starting soft delete for card:` (line 134) - Remove
- `[DELETE] Soft delete completed:` (line 138) - Remove

**KEEP:**
- `console.error('[DELETE] Error during soft delete:', error)` - **KEEP** (line 147)

---

### 6. **app/api/cards/route.ts** - LIGHT CLEANUP
**Lines with debug logging:** 99, 114, 118

**REMOVE these console.log statements:**
- `[GET /api/cards] Query params:` - Remove
- `[GET /api/cards] Payload to listCards:` - Remove
- `[GET /api/cards] Result:` - Remove

---

### 7. **app/(dashboard)/library/page.tsx** - LIGHT CLEANUP
**Lines with debug logging:** 48-49, 56, 184-194, 199

**REMOVE these console.log/warn statements:**
- `console.log('[Library] ✅ No deleted cards in store')` (line 56) - Remove
- `console.log('=== LIBRARY PAGE DEBUG ===')` - Remove ALL the debug block (lines 184-194)
- `console.warn('⚠️ WARNING: Showing X notes...')` (line 199) - Remove

**KEEP:**
- `console.error('[Library] ⚠️ DELETED CARDS IN STORE:', deletedCount)` (lines 48-49) - **KEEP** (important bug detection)

---

### 8. **app/(dashboard)/debug/database-compare/page.tsx** - PROTECTION NEEDED + CLEANUP
**CRITICAL:** Add development-only protection at the top of the file

**Add at the beginning of the component:**
```typescript
'use client';

import { redirect } from 'next/navigation';
import { useEffect } from 'react';

export default function DatabaseComparePage() {
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') {
      redirect('/');
    }
  }, []);

  // ... rest of component
}
```

**Lines with debug logging:** 118, 123, 129, 147, 156-157, 165, 167, 174, 193, 197, 218, 242, 260, 280

Since this is a debug page, we can keep the logging BUT it must be protected from production access.

---

### 9. **lib/auth/get-user.ts** - NO CLEANUP NEEDED
**Lines:** 23, 28, 33, 57

**KEEP ALL:**
- These are legitimate error logging for authentication issues
- `console.error('[getCurrentUser] Supabase auth error:', error)` - **KEEP**
- `console.error('[getCurrentUser] No user from Supabase')` - **KEEP**
- `console.error('[getCurrentUser] User has no email')` - **KEEP**
- `console.error('Error in getCurrentUser:', error)` - **KEEP**

---

### 10. **Components with debug logging** - SELECTIVE CLEANUP

**components/navigation/left-navigation-panel.tsx**
- Lines 290, 294, 309, 315, 326 - **REMOVE** all `[addToCollection]` debug logs

**components/library/card-gallery.tsx**
- Lines 47-49, 130-139 - **REMOVE** all masonry resize debug logs

**components/layout/content-panel.tsx**
- Lines 74-79, 86 - **REMOVE** all content panel debug logs

**components/notes/backlinks-panel.tsx**
- Lines 109, 111, 114, 154, 156, 159, 202, 206, 209 - **REMOVE** all backlink navigation debug logs

**components/pawkits/[slug]/page.tsx**
- Lines 63, 242, 247, 254, 264, 270, 273, 335, 340, 345, 351, 354 - **REMOVE** all pawkit CRUD debug logs

---

## Summary Statistics

**Total files to clean:** ~15 files
**Total console.log removals:** ~200+ lines
**Total console.warn to keep:** ~5 (duplicate detection, important warnings)
**Total console.error to keep:** ~all (legitimate error handling)

## Keep vs Remove Decision Matrix

| **REMOVE** | **KEEP** |
|------------|----------|
| Sync operation progress logs | Duplicate card detection warnings |
| Card/collection CRUD success logs | Write guard blocking errors |
| Deduplication process logs | Deleted cards in store errors |
| Link extraction debug logs | Conflict detection warnings |
| Queue processing logs | Sync failure errors |
| API request/response logs | Authentication errors |
| Component navigation debug | User-facing operation failures |
| Storage operation success logs | Critical bug detection logs |

## Special Actions

1. **app/(dashboard)/debug/database-compare/page.tsx** - Add production protection
2. Keep all duplicate detection warnings (as requested)
3. Keep all sync operation errors
4. Keep all critical bug detection logs

---

## Next Steps

1. Review this plan
2. Approve for execution
3. Make changes file by file
4. Test in development
5. Commit and push
