# Testing Layer 2: Local-First Architecture

## 🎯 What We're Testing

**Goal:** Verify that user data is stored locally in IndexedDB and survives even if the server is wiped.

---

## 📋 Prerequisites

1. You have the new files in place:
   - `lib/services/local-storage.ts`
   - `lib/services/sync-service.ts`
   - `lib/stores/data-store-v2.ts`

2. You have a test environment (not production!)

3. Browser: Chrome, Edge, or Firefox (all support IndexedDB)

---

## 🧪 Test Plan

### Test 1: Basic Local Storage (Browser Console)
**Time: 5 minutes**

1. **Open your app** in the browser
2. **Open Developer Tools** (F12 or Cmd+Option+I)
3. **Go to Console tab**
4. **Test the local storage directly:**

```javascript
// Import the local storage service
const { localStorage } = await import('/lib/services/local-storage.ts');

// Check if it initializes
await localStorage.init();
console.log('✅ Local storage initialized');

// Check current stats
const stats = await localStorage.getStats();
console.log('📊 Stats:', stats);
// Should show: { totalCards: 0, totalCollections: 0, modifiedCards: 0, lastSync: null }

// Try saving a test card
const testCard = {
  id: 'test-123',
  url: 'https://example.com',
  title: 'Test Card',
  notes: 'Testing local storage',
  type: 'url',
  status: 'PENDING',
  collections: [],
  tags: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  userId: 'test-user',
  deleted: false,
  deletedAt: null,
  pinned: false,
  domain: 'example.com',
  image: null,
  description: null,
  articleContent: null,
  metadata: undefined,
  inDen: false,
  encryptedContent: null,
  scheduledDate: null,
};

await localStorage.saveCard(testCard, { localOnly: true });
console.log('✅ Card saved to local storage');

// Verify it was saved
const cards = await localStorage.getAllCards();
console.log('📦 Cards in local storage:', cards);
// Should show the test card

// Check stats again
const newStats = await localStorage.getStats();
console.log('📊 New stats:', newStats);
// Should show: { totalCards: 1, modifiedCards: 1, ... }
```

**Expected Result:** ✅ Card is saved to IndexedDB

---

### Test 2: Verify IndexedDB in Browser
**Time: 2 minutes**

1. **In Developer Tools, go to Application tab** (Chrome) or **Storage tab** (Firefox)
2. **Expand IndexedDB** in the left sidebar
3. **Look for database:** `pawkit-local-storage`
4. **Expand it** → You should see:
   - `cards` store
   - `collections` store
   - `metadata` store
5. **Click on `cards`** → You should see your test card!

**Expected Result:** ✅ Data is physically in IndexedDB

---

### Test 3: Data Persists Across Refresh
**Time: 1 minute**

1. **Refresh the page** (F5 or Cmd+R)
2. **Open Console again**
3. **Check if data is still there:**

```javascript
const { localStorage } = await import('/lib/services/local-storage.ts');
const cards = await localStorage.getAllCards();
console.log('📦 Cards after refresh:', cards);
```

**Expected Result:** ✅ Your test card is still there!

---

### Test 4: Export Functionality
**Time: 2 minutes**

1. **In Console:**

```javascript
const { localStorage } = await import('/lib/services/local-storage.ts');

// Export all data
const exportData = await localStorage.exportAllData();
console.log('📤 Exported data:', exportData);

// Should show:
// {
//   cards: [...],
//   collections: [...],
//   exportedAt: "2025-10-17T...",
//   version: 2
// }
```

**Expected Result:** ✅ Data exports as JSON

---

### Test 5: Import Functionality
**Time: 3 minutes**

1. **Delete the test card:**

```javascript
const { localStorage } = await import('/lib/services/local-storage.ts');
await localStorage.deleteCard('test-123');
console.log('🗑️ Card deleted');

const cards = await localStorage.getAllCards();
console.log('📦 Cards after delete:', cards);
// Should be empty
```

2. **Import it back:**

```javascript
// Use the exportData from Test 4
const importData = {
  cards: [{
    id: 'test-123',
    url: 'https://example.com',
    title: 'Test Card',
    notes: 'Testing local storage',
    type: 'url',
    status: 'PENDING',
    collections: [],
    tags: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    userId: 'test-user',
    deleted: false,
    deletedAt: null,
    pinned: false,
    domain: 'example.com',
    image: null,
    description: null,
    articleContent: null,
    metadata: undefined,
    inDen: false,
    encryptedContent: null,
    scheduledDate: null,
  }],
  collections: []
};

await localStorage.importData(importData);
console.log('📥 Data imported');

const restoredCards = await localStorage.getAllCards();
console.log('📦 Restored cards:', restoredCards);
// Should have the card back!
```

**Expected Result:** ✅ Data can be exported and re-imported

---

## 🔗 Test 6: Integration with Data Store V2
**Time: 10 minutes**

Now let's test the new data store that uses local storage.

### Step 1: Create a Test Page

Create a new file: `app/(dashboard)/test-v2/page.tsx`

```typescript
'use client';

import { useEffect, useState } from 'react';
import { useDataStore as useDataStoreV2 } from '@/lib/stores/data-store-v2';
import { localStorage } from '@/lib/services/local-storage';

export default function TestV2Page() {
  const { cards, initialize, addCard, isInitialized, isSyncing } = useDataStoreV2();
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    const loadStats = async () => {
      const s = await localStorage.getStats();
      setStats(s);
    };
    loadStats();
    const interval = setInterval(loadStats, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleAddCard = async () => {
    await addCard({
      url: 'https://example.com/test-' + Date.now(),
      title: 'Test Card from V2 Store',
      notes: 'This should save to IndexedDB first!',
      type: 'url',
    });
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Layer 2 Test Page</h1>

      <div className="mb-6 p-4 border rounded">
        <h2 className="font-bold mb-2">Status</h2>
        <p>Initialized: {isInitialized ? '✅' : '⏳'}</p>
        <p>Syncing: {isSyncing ? '🔄' : '✅'}</p>
      </div>

      <div className="mb-6 p-4 border rounded">
        <h2 className="font-bold mb-2">Local Storage Stats</h2>
        {stats ? (
          <>
            <p>Total Cards: {stats.totalCards}</p>
            <p>Modified Cards: {stats.modifiedCards}</p>
            <p>Last Sync: {stats.lastSync ? new Date(stats.lastSync).toLocaleString() : 'Never'}</p>
          </>
        ) : (
          <p>Loading...</p>
        )}
      </div>

      <div className="mb-6 p-4 border rounded">
        <h2 className="font-bold mb-2">Cards in Store</h2>
        <p>Count: {cards.length}</p>
        <ul className="mt-2">
          {cards.slice(0, 5).map(card => (
            <li key={card.id} className="text-sm">
              {card.title || card.url}
            </li>
          ))}
        </ul>
      </div>

      <button
        onClick={handleAddCard}
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
      >
        Add Test Card
      </button>
    </div>
  );
}
```

### Step 2: Test the Integration

1. **Navigate to:** `http://localhost:3000/test-v2`
2. **You should see:**
   - Status showing initialized
   - Stats from local storage
   - List of cards (if any)

3. **Click "Add Test Card"**
4. **Watch what happens:**
   - Card should appear instantly in the list
   - Stats should update (total cards +1, modified cards +1)

5. **Open IndexedDB in DevTools:**
   - You should see the new card in the `cards` store
   - It should have `_locallyModified: true` flag

6. **Refresh the page (F5)**
7. **Verify:**
   - Card is still there ✅
   - Count is correct ✅
   - Data survived the refresh ✅

**Expected Result:** ✅ Cards save to local storage and persist

---

## 🌐 Test 7: Simulate Server Wipe (The Big Test!)
**Time: 5 minutes**

This is THE test - what you experienced!

### Setup:

1. **Make sure you have some test cards** (add 3-5 using the test page)
2. **Verify they're in IndexedDB** (check Application tab)
3. **Note down how many cards you have**

### The Disaster Simulation:

**Option A: Disable Server Sync (Safest)**

```javascript
// In browser console
import { useSettingsStore } from '@/lib/hooks/settings-store';
const settings = useSettingsStore.getState();
settings.setServerSync(false);
console.log('🔌 Server sync disabled - simulating server unavailable');
```

Now:
1. Add more cards
2. Refresh the page
3. Cards should still be there (loaded from IndexedDB)
4. Re-enable server sync:

```javascript
settings.setServerSync(true);
console.log('🔌 Server sync re-enabled - will push local data');
```

**Option B: Clear Server Database (More Realistic)**

⚠️ **DO THIS IN A TEST ENVIRONMENT ONLY!**

1. **Backup your current database first:**
   ```bash
   npm run prisma:backup
   ```

2. **Note your cards in local storage:**
   ```javascript
   const { localStorage } = await import('/lib/services/local-storage.ts');
   const cards = await localStorage.getAllCards();
   console.log('📦 Cards in IndexedDB:', cards.length);
   ```

3. **Clear the server database** (test environment only):
   ```bash
   # For local SQLite
   rm prisma/dev.db
   npx prisma migrate dev
   ```

4. **Refresh the app**

5. **Check what happens:**
   ```javascript
   // Cards should STILL be in IndexedDB
   const cards = await localStorage.getAllCards();
   console.log('📦 Cards after server wipe:', cards.length);
   // Should be the SAME number!
   ```

6. **Open the app:**
   - Data should load from IndexedDB ✅
   - You should see all your cards ✅
   - Status should show "syncing" as it pushes to server ✅

7. **Verify server repopulation:**
   ```bash
   # Check database
   npx prisma studio
   # You should see all cards back in the database!
   ```

**Expected Result:** ✅ Local data survives server wipe and repopulates the server!

---

## 📊 Test 8: Sync Between Devices (Advanced)
**Time: 10 minutes**

This tests the full bidirectional sync.

1. **Open app in Browser 1 (Chrome)**
   - Add a card: "Card from Chrome"
   - Wait for sync (check isSyncing status)

2. **Open app in Browser 2 (Firefox or Incognito)**
   - Log in as same user
   - Initialize
   - Should pull "Card from Chrome" from server

3. **Add card in Browser 2:**
   - Add a card: "Card from Firefox"
   - Wait for sync

4. **Go back to Browser 1:**
   - Trigger manual sync or wait for auto-sync
   - Should see "Card from Firefox" appear

5. **Check IndexedDB in both browsers:**
   - Both should have both cards ✅

**Expected Result:** ✅ Changes sync between devices

---

## 🔍 Debugging Tips

### Check if local storage is working:

```javascript
// Quick diagnostic
const { localStorage } = await import('/lib/services/local-storage.ts');

console.log('=== DIAGNOSTIC ===');
const stats = await localStorage.getStats();
console.log('Stats:', stats);

const cards = await localStorage.getAllCards();
console.log('Cards:', cards);

const modified = await localStorage.getModifiedCards();
console.log('Modified (need sync):', modified);
```

### Check IndexedDB directly:

1. DevTools → Application → IndexedDB
2. Look for `pawkit-local-storage`
3. Inspect `cards`, `collections`, `metadata` stores

### Common Issues:

**Issue:** "Module not found"
- Make sure files are in correct locations
- Check import paths

**Issue:** "Database not initialized"
- Call `await localStorage.init()` first

**Issue:** Data not persisting
- Check if browser is in private/incognito mode
- Check if IndexedDB is enabled in browser settings
- Check browser storage quota

---

## ✅ Success Criteria

You'll know Layer 2 is working when:

- ✅ Cards save to IndexedDB
- ✅ Data persists after page refresh
- ✅ Data survives server being wiped
- ✅ Server repopulates from local data
- ✅ Changes sync between devices
- ✅ Export/import works correctly
- ✅ Stats show correct counts

---

## 🚀 Next Steps After Testing

Once all tests pass:

1. **Add UI components:**
   - Export button in settings
   - Import button in settings
   - Sync status indicator
   - Manual sync button

2. **Add to layout:**
   - Replace `useDataStore` with `useDataStore` from v2
   - Or add feature flag to toggle between them

3. **Test with real data:**
   - Use your actual cards
   - Test with multiple users

4. **Monitor performance:**
   - Check IndexedDB size
   - Monitor sync times
   - Check for memory leaks

---

## 📞 If Tests Fail

1. **Check browser console** for errors
2. **Check IndexedDB** is enabled
3. **Check files are in correct locations**
4. **Check imports are correct**
5. **Check TypeScript compilation** (`npm run build`)

---

## 🎉 When All Tests Pass

**Congratulations!** Your users' data is now:
- ✅ Stored locally (primary source of truth)
- ✅ Backed up on server (sync layer)
- ✅ Safe from server wipes
- ✅ Exportable by users
- ✅ Fully recoverable

**You've built a truly local-first application!** 🚀

---

Want me to help with any specific test? Just let me know!
