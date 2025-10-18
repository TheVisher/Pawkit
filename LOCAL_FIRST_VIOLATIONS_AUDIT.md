# Local-First Architecture Violations Audit

## Date: 2025-10-17

This document catalogs all locations where components bypass the data store and make direct API calls, violating the local-first architecture pattern.

---

## ✅ CORRECT Pattern (Cards & Collections)

### Cards
- ✅ **Omni-bar** ([components/omni-bar.tsx:97](components/omni-bar.tsx#L97))
  - Uses `addCardToStore()` from data store

- ✅ **Add Card Modal** ([components/modals/add-card-modal.tsx:70](components/modals/add-card-modal.tsx#L70))
  - Uses `addCardToStore()` from data store

- ✅ **Card Detail Modal** ([components/modals/card-detail-modal.tsx](components/modals/card-detail-modal.tsx))
  - Uses `updateCardInStore()`, `deleteCardFromStore()` from data store
  - Fixed in previous session

- ✅ **Card Gallery** ([components/library/card-gallery.tsx](components/library/card-gallery.tsx))
  - Uses `updateCardInStore()` from data store
  - Fixed in previous session

### Collections (Regular Pawkits)
- ✅ **Pawkits Header** ([components/pawkits/pawkits-header.tsx](components/pawkits/pawkits-header.tsx))
  - Uses `addCollection()`, `updateCollection()`, `deleteCollection()` from data store

- ✅ **Pawkits Sidebar** ([components/pawkits/sidebar.tsx](components/pawkits/sidebar.tsx))
  - Uses data store methods
  - Fixed in current session

---

## ❌ VIOLATIONS FOUND

### 1. Den Pawkit Operations

#### Issue: Den Pawkits Bypass Data Store Entirely

**Location: app/(dashboard)/den/page.tsx:63-67**
```typescript
const response = await fetch("/api/den/pawkits", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ name: newPawkitName.trim() })
});
```
**Problem:** Creates Den Pawkit directly on server without updating IndexedDB

---

**Location: components/den/den-pawkit-actions.tsx:28-32**
```typescript
const response = await fetch(`/api/den/pawkits/${pawkitId}`, {
  method: "DELETE",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ deleteCards })
});
```
**Problem:** Deletes Den Pawkit directly on server without updating IndexedDB

---

**Location: components/den/den-pawkit-actions.tsx:50-54**
```typescript
const response = await fetch(`/api/den/pawkits/${pawkitId}`, {
  method: "PATCH",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ name: renameValue.trim() })
});
```
**Problem:** Renames Den Pawkit directly on server without updating IndexedDB

---

### 2. Timeline Operations

**Location: components/timeline/timeline-view.tsx:293-294**
```typescript
return fetch(`/api/cards/${id}`, {
  method: "PATCH",
```
**Problem:** Updates cards directly on server without updating IndexedDB

---

**Location: components/timeline/timeline-view.tsx:321**
```typescript
await Promise.all(selectedIds.map((id) => fetch(`/api/cards/${id}`, { method: "DELETE" })));
```
**Problem:** Bulk deletes cards directly on server without updating IndexedDB

---

### 3. Dig Up (Distill) Operations

**Location: components/dig-up/dig-up-view.tsx:125**
```typescript
await fetch(`/api/cards/${currentCard.id}`, { method: "DELETE" });
```
**Problem:** Deletes cards directly on server without updating IndexedDB

---

**Location: components/dig-up/dig-up-view.tsx:149-150**
```typescript
await fetch(`/api/cards/${currentCard.id}`, {
  method: "PATCH",
```
**Problem:** Updates cards directly on server without updating IndexedDB

---

## Impact Analysis

### Critical Issues
1. **Den Pawkits** - All CRUD operations bypass IndexedDB
   - Create, Read, Update, Delete all go directly to server
   - Den Pawkits won't work offline
   - Changes won't appear in IndexedDB

2. **Timeline Bulk Operations** - Mass updates/deletes bypass IndexedDB
   - Bulk delete doesn't update local storage
   - Bulk update doesn't update local storage
   - Could cause data inconsistency

3. **Dig Up Operations** - Card updates/deletes bypass IndexedDB
   - Swiping to delete won't update IndexedDB
   - Adding to collection won't update IndexedDB
   - Data inconsistency between views

### Consequences
- ❌ Data inconsistency between IndexedDB and server
- ❌ Features don't work offline
- ❌ UI doesn't update optimistically
- ❌ Sync conflicts likely
- ❌ Data loss if server fails after local update skipped

---

## Required Fixes

### Priority 1: Den Pawkits (High Impact)
**Files to Fix:**
1. `app/(dashboard)/den/page.tsx` - Use `addCollection()` with `inDen: true`
2. `components/den/den-pawkit-actions.tsx` - Use `updateCollection()` and `deleteCollection()`

**Solution:**
- Den Pawkits are just regular collections with `inDen: true` flag
- Should use the same data store methods as regular Pawkits
- Just need to pass `inDen: true` when creating

### Priority 2: Timeline Operations (Medium Impact)
**Files to Fix:**
1. `components/timeline/timeline-view.tsx` - Use `updateCardInStore()` and `deleteCardFromStore()`

**Solution:**
- Replace direct fetch calls with data store methods
- Bulk operations can loop through data store methods
- Data store will handle IndexedDB updates + server sync

### Priority 3: Dig Up Operations (Medium Impact)
**Files to Fix:**
1. `components/dig-up/dig-up-view.tsx` - Use `updateCardInStore()` and `deleteCardFromStore()`

**Solution:**
- Replace direct fetch calls with data store methods
- Swipe actions should use data store
- Collection updates should use data store

---

## Implementation Plan

### Phase 1: Den Pawkits
1. Update Den page to use `addCollection({ name, inDen: true })`
2. Update Den actions to use `updateCollection()` and `deleteCollection()`
3. Test Den Pawkit creation, renaming, deletion

### Phase 2: Timeline
1. Update bulk delete to use `deleteCardFromStore()` in loop
2. Update bulk update to use `updateCardInStore()` in loop
3. Test timeline bulk operations

### Phase 3: Dig Up
1. Update swipe delete to use `deleteCardFromStore()`
2. Update collection add to use `updateCardInStore()`
3. Test Dig Up swipe actions

---

## Testing Checklist

After fixes:
- [ ] Create Den Pawkit → check IndexedDB has entry with `inDen: true`
- [ ] Rename Den Pawkit → check IndexedDB updates
- [ ] Delete Den Pawkit → check IndexedDB marks as deleted
- [ ] Timeline bulk delete → check IndexedDB updates
- [ ] Timeline bulk update → check IndexedDB updates
- [ ] Dig Up swipe delete → check IndexedDB updates
- [ ] Dig Up add to collection → check IndexedDB updates
- [ ] All operations work offline
- [ ] All operations sync when back online

---

## Notes

Den Pawkits were initially created before local-first architecture was implemented. They have a separate API (`/api/den/pawkits`) but should use the same data store as regular collections, just with the `inDen` flag set to `true`.

The current implementation creates data silos where:
- Regular Pawkits → IndexedDB + Server
- Den Pawkits → Server only
- This violates the core principle of local-first architecture
