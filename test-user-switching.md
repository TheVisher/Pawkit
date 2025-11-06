# User Isolation Test - Manual Testing Guide

## ✅ Critical Security Fix Applied

**Issue:** Multiple users on the same browser could see each other's bookmarks
**Root Cause:** Sign out was clearing `pawkit_last_user_id`, preventing cleanup of previous user's data
**Fix:** Modified sign out to preserve `pawkit_last_user_id` so user switching cleanup runs correctly

## 🧪 Manual Test Steps

### Test 1: User Switching Cleanup

1. **Login as User A**
   - Open the app in browser
   - Login with user A credentials
   - Open DevTools Console
   - Look for: `[useUserStorage] Initialization complete`
   - Check `localStorage.pawkit_last_user_id` (should be User A's ID)

2. **Create Bookmarks as User A**
   - Add 2-3 bookmarks
   - Note the bookmark titles

3. **Check IndexedDB for User A**
   - Open DevTools → Application → IndexedDB
   - Look for database: `pawkit-{userA-id}-default-local-storage`
   - Verify it contains User A's bookmarks

4. **Sign Out**
   - Click Sign Out
   - Watch Console for: `[Auth] Clearing active device marker`
   - **IMPORTANT:** `pawkit_last_user_id` should still be set to User A's ID
   - Verify in DevTools: Application → Local Storage → Check `pawkit_last_user_id`

5. **Login as User B**
   - Login with user B credentials (different account)
   - **Watch Console for:**
     ```
     [useUserStorage] USER SWITCH DETECTED!
     [useUserStorage] Previous user: {userA-id}
     [useUserStorage] Current user: {userB-id}
     [useUserStorage] Cleaning up previous user data
     [LocalStorage] Deleted database: pawkit-{userA-id}-default-local-storage
     [useUserStorage] Previous user cleanup complete
     [useUserStorage] Initialization complete
     ```

6. **Verify User Isolation**
   - Check IndexedDB again
   - User A's database should be **GONE**
   - Should only see: `pawkit-{userB-id}-default-local-storage`
   - User B should see **no bookmarks** (fresh start)
   - Check `localStorage.pawkit_last_user_id` (should be User B's ID now)

7. **Add Bookmarks as User B**
   - Add 2-3 different bookmarks
   - These should only appear in User B's database

### Test 2: Multiple Tabs (Same User)

1. **Open Tab 1 & Tab 2 as User A**
2. **In Tab 1:** Add a bookmark
3. **In Tab 2:** Refresh and verify bookmark appears
4. **Expected:** Both tabs share the same database (same user)

### Test 3: Verify Old Global Database is Gone

1. **Open DevTools → Application → IndexedDB**
2. **Check for:** `pawkit-local-storage` (old global database)
3. **Expected:** Should NOT exist (migrated and deleted)

## 🔍 What to Look For

### ✅ Success Indicators

- Console logs show "USER SWITCH DETECTED" when switching users
- Previous user's database is deleted: "Deleted database: pawkit-{old-user-id}-..."
- Each user only sees their own bookmarks
- `pawkit_last_user_id` updates correctly on each login

### ❌ Failure Indicators

- User B sees User A's bookmarks
- Console shows "No user data found in old database"
- Multiple databases exist with different user IDs
- No "USER SWITCH DETECTED" log when switching users

## 🐛 Debugging

If the test fails, check:

1. **Is `pawkit_last_user_id` being cleared on sign out?**
   - Should NOT be cleared
   - If cleared, the fix wasn't applied

2. **Is cleanup running?**
   - Look for "USER SWITCH DETECTED" in console
   - If missing, cleanup didn't run

3. **Are databases being created correctly?**
   - Check IndexedDB for database names
   - Should be: `pawkit-{userId}-default-local-storage`

4. **Is the migration running?**
   - Look for "[Migration]" logs
   - Old database should be deleted after first login

## 📝 Expected Console Output

```
[Auth] Sign out initiated
[Auth] Clearing active device marker
[Auth] Supabase sign out successful
[Auth] Database connections closed

[useUserStorage] Initializing user storage...
[useUserStorage] Current user: user-b-id
[useUserStorage] USER SWITCH DETECTED!
[useUserStorage] Previous user: user-a-id
[useUserStorage] Current user: user-b-id
[useUserStorage] Cleaning up previous user data: user-a-id
[LocalStorage] Clearing all data for user: user-a-id
[LocalStorage] Found 1 workspace databases to delete for user user-a-id
[LocalStorage] Deleted database: pawkit-user-a-id-default-local-storage
[useUserStorage] Removed localStorage key: pawkit-user-a-id-active-workspace
[useUserStorage] Previous user cleanup complete
[LocalStorage] Initialized for user: user-b-id, workspace: default
[useUserStorage] Initialization complete
```

## 🎯 Success Criteria

**The fix is working if:**

1. ✅ User B cannot see User A's bookmarks after login
2. ✅ User A's database is deleted when User B logs in
3. ✅ Console shows "USER SWITCH DETECTED" on user switch
4. ✅ Each user has their own isolated database
5. ✅ No old global database (`pawkit-local-storage`) exists

---

**Files Modified:**
- `/lib/contexts/auth-context.tsx` - Don't clear `pawkit_last_user_id` on sign out
- `/lib/hooks/use-user-storage.ts` - Clear `pawkit_last_user_id` after cleanup

**Security Impact:** CRITICAL - Prevents data leakage between users
