# Local Storage Audit - Missing IndexedDB Updates

## 🔴 **Critical Issues Found**

These operations call the server API but **DO NOT** update IndexedDB, breaking the local-first architecture:

---

## **Issue #1: `updateCollection()` - Not Updating Local Storage**

**Location:** `lib/stores/data-store.ts:474-498`

**Problem:**
```typescript
updateCollection: async (id, updates) => {
  // ❌ NO local storage update!
  const response = await fetch(`/api/pawkits/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });

  if (response.ok) {
    await get().refresh(); // Only refreshes from server
  }
}
```

**Should be:**
```typescript
updateCollection: async (id, updates) => {
  // ✅ STEP 1: Update local storage first
  const collection = await localStorage.getAllCollections().find(c => c.id === id);
  const updatedCollection = { ...collection, ...updates, updatedAt: new Date() };
  await localStorage.saveCollection(updatedCollection, { localOnly: true });

  // ✅ STEP 2: Update Zustand
  set(state => ({
    collections: state.collections.map(c => c.id === id ? updatedCollection : c)
  }));

  // ✅ STEP 3: Sync to server
  await fetch(...);
}
```

**Impact:**
- Renaming a Pawkit doesn't update IndexedDB
- Pinning/unpinning a Pawkit doesn't persist locally
- Moving a Pawkit doesn't update local tree structure

---

## **Issue #2: Move to Den - Not Updating Local Storage**

**Location:** `components/modals/card-detail-modal.tsx:297`

**Problem:**
```typescript
const handleMoveToDen = async () => {
  // ❌ Direct API call, no local storage update!
  const endpoint = card.inDen
    ? `/api/cards/${card.id}/remove-from-den`
    : `/api/cards/${card.id}/move-to-den`;
  await fetch(endpoint, { method: "PATCH" });

  // ❌ Only updates props, not IndexedDB
  onUpdate({ ...card, inDen: !card.inDen });
}
```

**Should be:**
```typescript
const handleMoveToDen = async () => {
  // ✅ Use data store method
  await updateCardInStore(card.id, { inDen: !card.inDen });
}
```

**Impact:**
- Cards moved to Den don't persist in IndexedDB
- After refresh, Den cards appear back in Library
- **This is the Den isolation bug you reported!**

---

## **Issue #3: Save Notes - Not Updating Local Storage**

**Location:** `components/modals/card-detail-modal.tsx:144`

**Problem:**
```typescript
const handleSaveNotes = async () => {
  // ❌ Direct API call, bypasses local storage!
  await fetch(`/api/cards/${card.id}`, {
    method: "PATCH",
    body: JSON.stringify({ notes })
  });

  // ❌ Only updates modal state, not IndexedDB
  onUpdate({ ...card, notes });
}
```

**Should be:**
```typescript
const handleSaveNotes = async () => {
  // ✅ Use data store method
  await updateCardInStore(card.id, { notes });
}
```

**Impact:**
- Note edits don't save to IndexedDB
- Notes lost after page refresh
- Notes don't sync properly

---

## **Issue #4: Refresh Metadata - Partial Local Storage Update**

**Location:** `components/modals/card-detail-modal.tsx:245-258`

**Problem:**
```typescript
const handleRefreshMetadata = async () => {
  await fetch(`/api/cards/${card.id}/fetch-metadata`, { method: "POST" });

  // ✅ DOES fetch updated card
  const updatedCardRes = await fetch(`/api/cards/${card.id}`);
  const updatedCard = await updatedCardRes.json();

  // ✅ DOES update store
  await updateCardInStore(card.id, { ...updates });

  // ❌ But doesn't explicitly save to local storage first
}
```

**Status:** ⚠️ Partially works (uses updateCardInStore), but relies on store implementation

---

## **Issue #5: Extract Article - Not Updating Local Storage**

**Location:** `components/modals/card-detail-modal.tsx:221`

**Problem:**
```typescript
const handleExtractArticle = async () => {
  // ❌ Direct API call
  const response = await fetch(`/api/cards/${card.id}/extract-article`, {
    method: "POST"
  });

  const data = await response.json();
  // ❌ Only sets local state, doesn't save to IndexedDB
  setArticleContent(data.articleContent);
}
```

**Should be:**
```typescript
const handleExtractArticle = async () => {
  const response = await fetch(`/api/cards/${card.id}/extract-article`, {
    method: "POST"
  });
  const data = await response.json();

  // ✅ Update IndexedDB via store
  await updateCardInStore(card.id, { articleContent: data.articleContent });
}
```

**Impact:**
- Extracted articles not saved to IndexedDB
- Lost after refresh

---

## **Issue #6: Card Delete in Modal - Direct API Call**

**Location:** `components/modals/card-detail-modal.tsx:283`

**Problem:**
```typescript
const handleDelete = async () => {
  // ❌ Direct DELETE, bypasses data store soft-delete logic!
  await fetch(`/api/cards/${card.id}`, { method: "DELETE" });
  onDelete();
}
```

**Should be:**
```typescript
const handleDelete = async () => {
  // ✅ Use data store for soft delete
  await deleteCardFromStore(card.id);
  onDelete();
}
```

**Impact:**
- Card might not be soft-deleted properly in IndexedDB
- Might not appear in trash
- Inconsistent delete behavior

---

## **Issue #7: Library Card Gallery - Move to Den**

**Location:** `components/library/card-gallery.tsx:336`

**Problem:**
```typescript
onAddToDen={async () => {
  // ❌ Direct API call
  await fetch(`/api/cards/${card.id}/move-to-den`, { method: "PATCH" });

  // ❌ Only updates local UI state
  setCards(prev => prev.filter(c => c.id !== card.id));
}}
```

**Should be:**
```typescript
onAddToDen={async () => {
  // ✅ Use data store
  await updateCardInStore(card.id, { inDen: true });
}}
```

**Impact:**
- Same as Issue #2 - Den isolation breaks

---

## 📊 **Summary**

| Issue | Location | Severity | Fixed? |
|-------|----------|----------|--------|
| updateCollection | data-store.ts:474 | 🔴 Critical | ❌ No |
| Move to Den (modal) | card-detail-modal.tsx:297 | 🔴 Critical | ❌ No |
| Move to Den (gallery) | card-gallery.tsx:336 | 🔴 Critical | ❌ No |
| Save Notes | card-detail-modal.tsx:144 | 🔴 Critical | ❌ No |
| Extract Article | card-detail-modal.tsx:221 | 🟡 Medium | ❌ No |
| Delete Card (modal) | card-detail-modal.tsx:283 | 🟡 Medium | ❌ No |
| Refresh Metadata | card-detail-modal.tsx:245 | 🟢 Low | ⚠️ Partial |

---

## 🎯 **Recommended Fixes**

### **Priority 1: Critical (Do First)**
1. ✅ Fix `updateCollection()` to update local storage
2. ✅ Fix all "Move to Den" / "Remove from Den" operations
3. ✅ Fix "Save Notes" operation

### **Priority 2: Important**
4. ✅ Fix "Extract Article" operation
5. ✅ Ensure "Delete Card" uses data store method

### **Priority 3: Nice to Have**
6. ✅ Audit other components for similar patterns
7. ✅ Add TypeScript guards to prevent direct API calls

---

## 🛠️ **General Pattern to Follow**

**WRONG (Bypasses Local Storage):**
```typescript
// ❌ DON'T DO THIS
const response = await fetch('/api/cards/123', {
  method: 'PATCH',
  body: JSON.stringify({ notes: 'New notes' })
});
```

**CORRECT (Updates Local Storage First):**
```typescript
// ✅ DO THIS
await updateCardInStore(card.id, { notes: 'New notes' });
```

---

## 📝 **Notes**

- All these issues break the local-first architecture
- Data doesn't persist across refreshes
- Can cause data loss if server is down
- Violates the "IndexedDB = source of truth" principle

**Next Steps:**
1. Fix Priority 1 issues immediately
2. Test each fix thoroughly
3. Update affected components
4. Deploy and verify in production
