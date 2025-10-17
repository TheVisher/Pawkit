# Production Test Checklist - Layer 2 (Local-First Architecture)

## ✅ What Changed
- **Data storage**: Now uses IndexedDB as primary source (was server)
- **Server role**: Changed from source-of-truth to sync/backup layer
- **Performance**: Should be noticeably faster (instant operations)
- **Safety**: Data survives server wipes, network issues, crashes

---

## 🧪 Critical Tests (Must Pass)

### 1. Basic CRUD Operations
- [ ] **Add a new card**
  - Click "Add Card" or use extension
  - Verify card appears instantly in UI
  - Check browser console for `[DataStore V2] Card added to local storage: temp_...`
  - Wait 2-3 seconds and check console for `[DataStore V2] Card synced to server:`

- [ ] **Edit an existing card**
  - Click on a card and edit its title or notes
  - Verify changes appear instantly in UI
  - Check console for `[DataStore V2] Card updated in local storage:`
  - Check console for `[DataStore V2] Card synced to server:`

- [ ] **Delete a card**
  - Delete a card
  - Verify it disappears instantly from UI
  - Check console for `[DataStore V2] Card deleted from local storage:`
  - Check console for `[DataStore V2] Card deleted from server:`

- [ ] **Add a collection (Pawkit)**
  - Create a new collection
  - Verify it appears in sidebar
  - Check console for `[DataStore V2] Collection added to local storage:`

- [ ] **Move card between collections**
  - Drag a card to a different collection
  - Verify it appears in the new collection
  - Check console for update messages

### 2. Data Persistence
- [ ] **Refresh page**
  - Add a card
  - Press F5 or CMD+R
  - Verify card is still there after refresh
  - Check console for `[DataStore V2] Loaded from local: { cards: X, collections: Y }`

- [ ] **Close and reopen browser**
  - Add a card
  - Close browser completely
  - Reopen and navigate to app
  - Verify card is still there

- [ ] **Check IndexedDB storage**
  - Open DevTools → Application → Storage → IndexedDB
  - Find `pawkit-local-storage` database
  - Open `cards` store
  - Verify your cards are stored there
  - Check for `_locallyModified`, `_locallyCreated`, `_serverVersion` fields

### 3. Performance Check
- [ ] **App load time**
  - Note: Should feel faster than before
  - Cards should appear almost instantly (from IndexedDB)
  - No waiting for server response

- [ ] **Card operations**
  - Adding/editing/deleting should be instant
  - No spinner or loading delay
  - Background sync happens silently

### 4. Server Sync Verification
- [ ] **Check server has the data**
  - Add a card locally
  - Wait 3-5 seconds
  - Go to Supabase dashboard or use API
  - Verify card exists in database with correct data

- [ ] **Check sync status in console**
  - Look for these messages:
    - `[DataStore V2] Initializing from local storage...`
    - `[DataStore V2] Loaded from local: { cards: X, collections: Y }`
    - `[DataStore V2] Syncing with server in background...`
    - `[DataStore V2] Sync complete:`

---

## 🔥 Advanced Tests (Important)

### 5. Multi-Device Sync
- [ ] **Add card on Device A**
  - Add a card on your computer
  - Wait 10 seconds for sync

- [ ] **Check card appears on Device B**
  - Open app on phone or different browser
  - Refresh page
  - Verify card from Device A appears

- [ ] **Bidirectional sync**
  - Edit card on Device B
  - Wait 10 seconds
  - Refresh Device A
  - Verify changes appear on Device A

### 6. Offline Mode
- [ ] **Disable network**
  - Open DevTools → Network tab
  - Check "Offline" checkbox

- [ ] **Add cards while offline**
  - Add 2-3 cards
  - Verify they appear in UI
  - Check IndexedDB - cards should be there

- [ ] **Re-enable network**
  - Uncheck "Offline"
  - Wait 10-20 seconds
  - Check console for sync messages
  - Verify cards sync to server

### 7. Conflict Resolution
- [ ] **Edit same card on two devices**
  - Open same card on Device A and Device B
  - Edit title on Device A, save
  - Edit notes on Device B, save
  - Wait for sync
  - Verify last-write-wins (most recent edit stays)

### 8. Export/Import
- [ ] **Export your data**
  - Go to Settings (or wherever export is)
  - Click "Export Data"
  - Verify JSON file downloads
  - Open file and check it has your cards/collections

- [ ] **Import data**
  - Click "Import Data"
  - Select the exported JSON file
  - Verify data appears in app
  - Check IndexedDB to confirm import

---

## 🚨 Edge Cases (Good to Test)

### 9. Large Dataset
- [ ] **Test with many cards**
  - If you have 100+ cards, verify:
    - App still loads quickly
    - Scrolling is smooth
    - Search works
    - No console errors

### 10. Error Scenarios
- [ ] **Server is down**
  - Simulate by blocking API calls in DevTools (Network → Block request URL)
  - Try adding a card
  - Verify card still saves locally
  - Check console for error message but app still works

- [ ] **Invalid data**
  - Try importing a corrupted JSON file
  - Verify app shows error message
  - Verify app doesn't crash

---

## 📊 Console Log Checklist

### Expected Console Messages:

**On page load:**
```
[DataStore V2] Initializing from local storage...
[DataStore V2] Loaded from local: { cards: X, collections: Y }
[DataStore V2] Syncing with server in background...
[LocalStorage] Saved card: abc123 { fromServer: true }
[DataStore V2] Sync complete: { success: true, pulled: {...}, pushed: {...} }
```

**On add card:**
```
[LocalStorage] Saved card: temp_1234567890_abc { localOnly: true }
[DataStore V2] Card added to local storage: temp_1234567890_abc
[DataStore V2] Card synced to server: real-uuid-from-server
```

**On update card:**
```
[LocalStorage] Saved card: uuid { localOnly: true }
[DataStore V2] Card updated in local storage: uuid
[DataStore V2] Card synced to server: uuid
```

**On delete card:**
```
[LocalStorage] Deleted card: uuid
[DataStore V2] Card deleted from local storage: uuid
[DataStore V2] Card deleted from server: uuid
```

### ⚠️ Watch Out For:
- `Failed to sync card to server` - Means network/server issue but data is safe locally
- `Conflict detected` - Means card was edited on another device
- `Sync failed` - Check network connection
- Any errors mentioning IndexedDB - Report immediately

---

## 🎯 Success Criteria

### Must Have (Critical):
- ✅ All CRUD operations work (add, edit, delete)
- ✅ Data persists across refresh
- ✅ Data persists across browser close/reopen
- ✅ Data syncs to server within 10 seconds
- ✅ App feels faster than before
- ✅ No critical errors in console

### Nice to Have:
- ✅ Multi-device sync works
- ✅ Offline mode works
- ✅ Export/import works
- ✅ No performance degradation with large datasets

---

## 🐛 How to Report Issues

If you find a problem, please report:
1. **What you were doing** - Exact steps to reproduce
2. **What happened** - What you saw vs what you expected
3. **Console logs** - Copy/paste relevant console messages
4. **Browser/device** - Chrome/Safari, desktop/mobile
5. **Screenshot** - If applicable

Example:
```
Issue: Card doesn't sync to server
Steps: Added card → waited 30 seconds → checked database → not there
Console: "[DataStore V2] Failed to sync card to server: Network error"
Browser: Chrome 118 on macOS
```

---

## 🔄 Rollback Plan (If Needed)

If critical issues occur:
1. Check git - we have backup: `lib/stores/data-store-v1-backup.ts`
2. Can revert by copying backup back to `data-store.ts`
3. User data is safe in IndexedDB - won't be lost during rollback

---

## 📝 Notes

- **Performance**: Should be noticeably faster - operations are instant
- **Network**: App works offline now, syncs when back online
- **Data Safety**: Even if server is wiped, local data survives
- **Console Logs**: More verbose now - this is intentional for debugging
- **IndexedDB**: You can inspect it in DevTools → Application → IndexedDB

---

## ✅ Quick Test (5 minutes)

Minimum viable test before deploying:
1. Add a card → verify instant UI + console logs
2. Refresh page → verify card persists
3. Check IndexedDB → verify data is there
4. Wait 10s → check database → verify synced to server
5. Edit card → verify instant UI + sync
6. Delete card → verify instant UI + sync

If all 6 pass → Good to go! ✅

---

**Last Updated**: 2025-10-17
**Migration**: V1 (server-first) → V2 (local-first)
**Backup**: `lib/stores/data-store-v1-backup.ts`
