# Pawkit Duplication & Ghost Pawkits - Root Cause & Fix

## Problem Summary

User reported two critical issues with Pawkits:

1. **Duplication Bug**: Creating sub-pawkits caused existing pawkits to duplicate (e.g., "Restaurants" appeared twice)
2. **Ghost Pawkits**: Old deleted "test" pawkits briefly appeared during pawkit creation modal, then vanished

## Root Cause Analysis

### Issue #1: Double Creation (Duplication)

**The Problem:**
- Both the **data store** (`addCollection()`) AND the **sidebar component** were creating pawkits
- This caused TWO server requests for a single pawkit creation

**Code Flow:**
1. User clicks "Create Pawkit" → calls `addCollection()` from data store
2. Data store creates temp local pawkit with `temp_` ID
3. Data store POSTs to `/api/pawkits` → server creates pawkit with real ID
4. Meanwhile, old sidebar code ALSO posted to `/api/pawkits` (bypassing data store)
5. Result: **Two pawkits created on server**

**Location:**
- [components/pawkits/sidebar.tsx:62-77](components/pawkits/sidebar.tsx#L62-L77) - Direct API calls
- All CRUD operations (create, rename, move, delete) were bypassing the data store

### Issue #2: Temp Collection Not Replaced

**The Problem:**
- When `addCollection()` created a temp collection, it stayed in IndexedDB even after server sync
- The server returned a new collection with a real ID
- But the temp collection was never deleted
- Result: **Both temp and real collection existed in IndexedDB** → duplicates on refresh

**Code Flow:**
1. `addCollection()` creates temp collection: `{ id: "temp_123", name: "Test" }`
2. Saves to IndexedDB
3. POSTs to server → server returns: `{ id: "abc-def", name: "Test" }`
4. Old code called `refresh()` which loaded from IndexedDB
5. IndexedDB now has BOTH `temp_123` AND `abc-def` → **duplicates!**

**Location:**
- [lib/stores/data-store.ts:424-472](lib/stores/data-store.ts#L424-L472) - `addCollection()` method

### Issue #3: Ghost Deleted Pawkits

**The Problem:**
- Deleted pawkits remained in IndexedDB with `deleted: true`
- Some UI components showed ALL collections without filtering
- After refresh, they disappeared (because refresh filters `deleted: false`)

**Location:**
- Collections tree not filtering deleted items properly

---

## Fixes Applied

### Fix #1: Sidebar Now Uses Data Store

**File:** [components/pawkits/sidebar.tsx](components/pawkits/sidebar.tsx)

**Changes:**
```typescript
// ✅ BEFORE: Direct API calls
const createCollection = async (parentId?: string) => {
  const response = await fetch("/api/pawkits", {
    method: "POST",
    body: JSON.stringify({ name, parentId })
  });
  await refresh(); // Fetches from server
};

// ✅ AFTER: Uses data store
import { useDemoAwareStore } from "@/lib/hooks/use-demo-aware-store";

const { addCollection, updateCollection, deleteCollection } = useDemoAwareStore();

const createCollection = async (parentId?: string) => {
  await addCollection({ name, parentId }); // Local-first!
};
```

**Affected Methods:**
- `createCollection()` - Now uses `addCollection()`
- `renameCollection()` - Now uses `updateCollection()`
- `moveCollection()` - Now uses `updateCollection()`
- `deleteCollection()` - Now uses `deleteCollectionFromStore()`

**Impact:**
- ✅ No more double creation
- ✅ All pawkit operations follow local-first pattern
- ✅ Consistent with card operations

---

### Fix #2: Replace Temp Collection with Server Collection

**File:** [lib/stores/data-store.ts](lib/stores/data-store.ts)

**Changes:**
```typescript
// ✅ BEFORE: Temp collection stayed in IndexedDB
addCollection: async (collectionData) => {
  const tempId = `temp_${Date.now()}`;
  const newCollection = { id: tempId, name: collectionData.name, ... };

  await localStorage.saveCollection(newCollection);

  const response = await fetch('/api/pawkits', { method: 'POST', ... });

  if (response.ok) {
    await get().refresh(); // ❌ Both temp and real now in IndexedDB!
  }
}

// ✅ AFTER: Delete temp, save server collection
addCollection: async (collectionData) => {
  const tempId = `temp_${Date.now()}`;
  const newCollection = { id: tempId, name: collectionData.name, ... };

  await localStorage.saveCollection(newCollection, { localOnly: true });

  const response = await fetch('/api/pawkits', { method: 'POST', ... });

  if (response.ok) {
    const serverCollection = await response.json();

    // ✅ Replace temp with server collection
    await localStorage.deleteCollection(tempId);
    await localStorage.saveCollection(serverCollection, { fromServer: true });

    // ✅ Refresh with filter
    const allCollections = await localStorage.getAllCollections();
    const activeCollections = allCollections.filter(c => !c.deleted);
    set({ collections: activeCollections });
  }
}
```

**Pattern:**
This now matches the pattern used for cards in `addCard()`:
1. Create temp with `temp_` ID
2. Save to IndexedDB (local-first)
3. Sync to server
4. **Delete temp** from IndexedDB
5. **Save server version** to IndexedDB
6. Refresh Zustand with filtered list

**Impact:**
- ✅ No more temp collections lingering in IndexedDB
- ✅ No more duplicates after refresh
- ✅ Clean IndexedDB state

---

### Fix #3: Filter Deleted Collections Everywhere

**File:** [lib/stores/data-store.ts](lib/stores/data-store.ts)

**Changes:**
```typescript
// ✅ Ensure all collection loads filter deleted items
const allCollections = await localStorage.getAllCollections();
const activeCollections = allCollections.filter(c => !c.deleted);
set({ collections: activeCollections });
```

**Applied In:**
- `addCollection()` - Lines 445-447, 469-471
- `updateCollection()` - Already had filtering (line 496-497)
- `deleteCollection()` - Already had filtering via soft delete
- `refresh()` - Already had filtering (line 181)
- `initialize()` - Already had filtering (line 153)

**Impact:**
- ✅ Ghost pawkits never appear in UI
- ✅ Consistent filtering across all operations
- ✅ Deleted pawkits only visible in Trash

---

## Testing Checklist

Before deploying, test these scenarios:

### Pawkit Creation
- [ ] Create a root-level pawkit → verify NO duplicates appear
- [ ] Create a sub-pawkit → verify parent doesn't duplicate
- [ ] Create multiple pawkits rapidly → verify no race conditions
- [ ] Check IndexedDB → verify only real IDs (no `temp_` IDs)

### Pawkit Operations
- [ ] Rename a pawkit → verify updates locally and on server
- [ ] Move a pawkit → verify tree structure updates
- [ ] Delete a pawkit → verify soft delete (appears in Trash)
- [ ] Refresh page → verify all changes persist

### Ghost Pawkits
- [ ] Delete a pawkit → verify it goes to Trash
- [ ] Create new pawkit → verify deleted ones don't appear
- [ ] Empty trash → verify deleted pawkits removed from IndexedDB
- [ ] Create new pawkit → verify IndexedDB only has active pawkits

### IndexedDB Verification
Open DevTools → Application → IndexedDB → pawkit-local-storage → collections

- [ ] No entries with `id` starting with `temp_`
- [ ] No entries with `deleted: true` (unless you haven't emptied trash)
- [ ] All entries have proper server IDs (UUIDs)

---

## Files Modified

1. **[components/pawkits/sidebar.tsx](components/pawkits/sidebar.tsx)**
   - Imported `useDemoAwareStore`
   - Replaced direct API calls with data store methods
   - Removed `refresh()` function (no longer needed)

2. **[lib/stores/data-store.ts](lib/stores/data-store.ts)**
   - Fixed `addCollection()` to replace temp with server collection
   - Added filtering for deleted collections in all paths

---

## Why This Happened

The local-first architecture was partially implemented:
- ✅ Cards followed the pattern correctly
- ❌ Collections still had old server-first code in sidebar
- ❌ `addCollection()` didn't clean up temp collections

This created a "hybrid" state where:
- Data store created temp collections locally
- Old sidebar code also created collections on server
- Temp collections never got replaced
- Result: **duplicates everywhere!**

---

## Prevention

To prevent this in the future:

1. **Code Review Pattern**: All CRUD operations MUST go through data store
2. **Never use fetch('/api/...')** directly in components
3. **Always replace temp entities** after server sync
4. **Always filter deleted items** when loading from IndexedDB

**Good Pattern:**
```typescript
// ✅ Component
const { addCollection } = useDataStore();
await addCollection({ name: "Test" });

// ✅ Data Store
1. Create temp
2. Save to IndexedDB
3. Sync to server
4. Delete temp
5. Save server version
6. Refresh Zustand
```

**Bad Pattern:**
```typescript
// ❌ Component
await fetch('/api/pawkits', { method: 'POST', ... }); // NEVER!
```

---

## Related Issues

This fix also resolves:
- Pawkit rename not updating IndexedDB (from [LOCAL_STORAGE_AUDIT.md](LOCAL_STORAGE_AUDIT.md) Issue #1)
- Pawkit delete not updating IndexedDB (from audit)
- Inconsistent state between UI and IndexedDB

All pawkit operations now follow the **local-first pattern** consistently.
