---
name: pawkit-project-context
description: Track development progress, major milestones, and session history across sessions
---

# Pawkit Project Context & Session History

**Purpose**: Track development progress, major milestones, and session history to maintain context across development sessions.

---

## Current Status

**Branch**: `main`
**Status**: User isolation and sign out functionality fully fixed and deployed
**Last Updated**: January 3, 2025
**Next Steps**: Monitor production deployment, consider removing excess debug logging

---

## Session History

### Date: January 4, 2025 - Comprehensive Sync System Deep-Dive Analysis

**Status**: ✅ ANALYSIS COMPLETE - Issues documented, fixes deferred
**Priority**: CRITICAL TECHNICAL DEBT
**Branch**: `main` (no code changes made, documentation only)

**Analysis Context**:

User requested comprehensive investigation of sync system after observing:
- Cards duplicating across devices and sessions
- Pawkits not updating on other devices
- Cross-device sync failures
- Data inconsistencies between multiple sessions

**Objective**: "Act as a backend expert who has shipped hundreds of products that use sync systems. Dive fully into the sync code, look for any potential issues with local storage, syncing to supabase, possible reasons why cards might duplicate, pawkits might not update in other sessions, etc."

**Investigation Approach**:

Conducted comprehensive analysis using specialized Plan agent:
1. Complete architecture review of sync-service.ts, local-storage.ts, sync-queue.ts
2. IndexDB V2 historical investigation via git history
3. Cross-referenced with previous bug fixes and workarounds
4. Identified specific race conditions, transaction boundaries, conflict resolution gaps
5. Mapped full data flows and identified potential race windows

**Key Findings - 8 Critical Categories**:

**1. Race Conditions (5 CRITICAL issues)**:
- Multi-tab sync collision (BroadcastChannel coordination flawed)
- Temp ID → Server ID race condition (3 race windows)
- Deduplication false positives (3 separate flaws)
- Metadata quality score overwrites user changes
- Database initialization race (double initialization possible)

**2. Database-Level Issues (2 HIGH issues)**:
- Incomplete unique index (only covers URL cards)
- No optimistic locking (metadata updates bypass conflict detection)

**3. Sync Flow Architecture (3 CRITICAL issues)**:
- Missing transaction boundaries (operations not atomic)
- Collection tree flattening loses parent relationships
- No cache invalidation strategy (no rollback on failure)

**4. Concurrency Issues (2 MEDIUM issues)**:
- Sync queue not idempotent (failed operations can duplicate)
- useUserStorage hook order race (components mount before init)

**Historical Context - IndexDB V2 Migration**:

**When**: October 2025 (commits: 35ade04, 4c5f810, f3114aa)

**What Changed**:
```
Database Naming:
  Before: pawkit-local-storage (single global database)
  After: pawkit-{userId}-{workspaceId}-local-storage (per-user databases)

Init Pattern:
  Before: Single initialization on app load
  After: Dynamic init with user context, workspace support

Sync Queue:
  Before: Global queue
  After: Per-user-per-workspace queue

Multi-Session:
  Before: No detection
  After: Active session tracking with localStorage
```

**Why It Broke**:

1. **BroadcastChannel Coordination**:
   - Worked: Single DB, simple coordination
   - Broke: Multiple user contexts, race conditions between tabs

2. **Temp ID Pattern**:
   - Worked: Single user, no cross-device sync
   - Broke: Multi-user environment, temp IDs leak into sync, create ghost duplicates

3. **Transaction Boundaries**:
   - Worked: Simple single-DB operations
   - Broke: Complex multi-user flows need ACID guarantees

4. **Deduplication Logic**:
   - Worked: Reactive cleanup for single user
   - Broke: Insufficient for multi-user/multi-device, creates false positives

**Root Cause Summary**:

The IndexDB V2 migration successfully achieved its goal (per-user data isolation) but inadvertently introduced architectural issues:
- **Split Brain Problem**: Temp IDs in transit create divergent realities between devices
- **Lost Atomicity**: Multi-step operations lack transaction boundaries
- **Coordination Failure**: BroadcastChannel insufficient for multi-tab mutual exclusion
- **Reactive vs Preventive**: Client-side deduplication is bandaid for database-level constraint gaps

**Git Evidence of Reactive Fixes**:

Commit history shows multiple bandaid fixes addressing symptoms:
- `61ba60e`: Changed deduplication from soft delete to hard delete (reactive fix)
- `476d04a`: Skip deduplication when both cards have server IDs (bandaid for temp ID races)
- `c60c41b`: Fixed local deletions overwritten by server (collection timing issue)
- `e8be3fa`: Prevent duplicate operations in queue (idempotency issue)

Each fix addressed a specific symptom but didn't solve underlying architectural issues.

**Critical Insights**:

1. **Temp ID Pattern is Primary Duplicate Cause**:
   - 4-step process (create temp → UI update → server sync → ID replacement) has 3 race windows
   - Other tabs can sync temp cards before ID replacement completes
   - If server sync fails, temp card persists in queue AND IndexDB
   - **Solution**: Use client-generated UUIDs, eliminate ID replacement entirely

2. **Multi-Tab Sync is Fundamentally Flawed**:
   - BroadcastChannel has message delay (~10ms) creating race window
   - `otherTabSyncing` flag checked before message processed
   - Both tabs can start sync simultaneously, pull different versions, create duplicates
   - **Solution**: Distributed lock using localStorage with timestamps and mutex

3. **No ACID Guarantees at IndexDB Level**:
   - Operations like pullFromServer do multiple steps without transaction wrapper
   - If mergeCards succeeds but mergeCollections fails, data is inconsistent
   - Rollback mechanism uses Promise.all which can partially fail
   - **Solution**: Wrap all multi-step operations in IndexDB transactions

4. **Deduplication is Reactive Bandaid**:
   - Runs on every sync trying to clean up duplicates after creation
   - Has false positives (same title/URL treated as duplicate)
   - Deleted cards can resurrect before deletion detected
   - **Solution**: Remove client deduplication, enforce at database level with proper constraints

5. **Metadata Quality Score Causes Data Loss**:
   - Background metadata fetching scores higher than user manual edits
   - User adds notes/tags on Device A, Device B fetches metadata, sync overwrites user's work
   - 1-hour window check insufficient mitigation
   - **Solution**: Separate user-edited fields from auto-fetched, never overwrite user edits

**Recommended Fix Priority - Top 3 (80% Impact)**:

1. **Eliminate Temp ID Pattern** (6-8 hours)
   - Impact: Eliminates primary duplicate card issue
   - Files: lib/stores/data-store.ts, lib/services/sync-service.ts
   - Approach: Use client UUIDs, remove ID replacement logic

2. **Add Distributed Lock for Multi-Tab Sync** (4-6 hours)
   - Impact: Eliminates multi-tab sync collision
   - Files: lib/services/sync-service.ts
   - Approach: localStorage mutex with exponential backoff

3. **Wrap Operations in IndexDB Transactions** (8-10 hours)
   - Impact: Ensures data consistency, prevents corruption
   - Files: lib/services/sync-service.ts, lib/services/local-storage.ts
   - Approach: Transaction boundaries on all multi-step operations

**Total Estimated Time**: 18-24 hours
**Expected User Impact**: Resolve 80% of sync issues (duplicates, cross-device failures)

**Prevention Guidelines for Future Sync Work**:

When making sync changes, always:
1. ✅ Wrap multi-step operations in transactions
2. ✅ Never use temporary IDs that can leak into sync
3. ✅ Implement distributed locks for cross-tab operations
4. ✅ Use vector clocks or operation sequence numbers for causality
5. ✅ Add optimistic locking (version fields) to all entities
6. ✅ Test with multiple tabs AND multiple devices simultaneously
7. ✅ Monitor for duplicate creation in production logs
8. ✅ Use preventive constraints (database) not reactive deduplication (client)

**Files Analyzed**:
- `lib/services/sync-service.ts` - Sync orchestration and merge logic
- `lib/services/local-storage.ts` - IndexDB operations and data persistence
- `lib/services/sync-queue.ts` - Operation queue and retry logic
- `lib/stores/data-store.ts` - Zustand state management and optimistic updates
- `lib/hooks/use-user-storage.ts` - User context initialization
- `lib/services/storage-migration.ts` - V1 to V2 migration logic
- `prisma/schema.prisma` - Database schema and constraints
- `app/api/cards/[id]/route.ts` - API conflict detection
- Git history - Commits related to sync fixes and IndexDB V2

**Documentation Updated**:
- `.claude/skills/pawkit-roadmap/SKILL.md` - Added "BACKLOG - CRITICAL SYNC FIXES (Priority 0)" section with all 12 issues
- `.claude/skills/pawkit-project-context/SKILL.md` - This session entry
- `.claude/skills/pawkit-sync-patterns/SKILL.md` - Added "KNOWN ARCHITECTURAL FLAWS" section
- `.claude/skills/pawkit-troubleshooting/SKILL.md` - Added specific troubleshooting entries (if size permits)

**Current Status**:
- Analysis complete and documented
- No code changes made (documentation only)
- Issues prioritized by impact and effort
- Ready for future fix session when prioritized

**User Decision**: Document now, fix later when sync work is prioritized

**Next Steps** (when user decides to address sync):
1. Review documented issues in roadmap skill
2. Start with Top 3 fixes (18-24 hours estimated)
3. Test with multiple tabs and devices
4. Monitor production for duplicate creation reduction
5. Address remaining issues as needed

**Impact**:
- Created comprehensive reference for future sync fix session
- Identified root causes preventing guessing/trial-and-error
- Prioritized fixes by impact to optimize development time
- Established prevention guidelines to avoid regressions

**Lessons Learned**:
1. Architecture changes (single → multi-user DB) require comprehensive review of all coordination mechanisms
2. Race conditions are multiplicative - each new async operation adds exponential complexity
3. Reactive fixes (deduplication, bandaids) mask underlying architectural issues
4. Local-first architecture requires ACID guarantees even at client level
5. Temp IDs are dangerous in distributed systems - UUIDs or server-assigned IDs only

---

### Date: January 3, 2025 - CRITICAL FIX: User Isolation & Sign Out Restoration

**Status**: ✅ COMPLETE - Merged to main (commit 6f9fe5f)
**Priority**: CRITICAL SECURITY FIX
**Branch**: `claude/fix-sync-bugs-011CUmJiyEbu2iTCVjMM8wvD`

**Problem Discovery**:

After previous session's isolation work, two critical bugs emerged:
1. **Sign Out button completely broken** - No UI response, no console logs, button appeared dead
2. **Complete user isolation failure** - ALL data bleeding between accounts (URLs + notes)

**Investigation & Fixes**:

**Bug #1: Sign Out Button Not Working**

**Root Cause**: The complex cleanup code added for isolation (dynamic imports, database clearing, localStorage cleanup) was **failing silently**. When Sign Out was clicked:
- Button onClick handler fired
- But the complex async operations inside failed without visible errors
- Dynamic imports (`await import('@/lib/services/local-storage')`) appeared to break execution
- User saw no feedback - button seemed dead

**Debugging Process**:
1. Started with comprehensive logging to track execution flow
2. Added test buttons (inline vs named handlers) to isolate issue
3. Discovered that named handlers worked BUT signOut() call never executed
4. Found that inline handlers with alerts worked, but complex code stopped execution
5. Reverted to simple signOut from main branch (just `supabase.auth.signOut()` + redirect)

**Files**:
- `components/modals/profile-modal.tsx` - Simplified to named handler function
- `lib/contexts/auth-context.tsx` - Reverted to simple signOut (lines 59-93)

**Bug #2: Complete User Isolation Failure**

**Root Cause**: When we simplified signOut to fix the button, we **removed critical localStorage cleanup**. Specifically:
- `localStorage.removeItem('pawkit_last_user_id')` was missing
- This marker is used by `useUserStorage` hook to detect user switches
- Without clearing it, system couldn't tell when a different user logged in

**The Flow**:
1. User A logs in → `pawkit_last_user_id = "user-a-id"` stored
2. User A creates data → Saved to `pawkit-user-a-id-default-local-storage`
3. User A signs out → OLD CODE: Only cleared Supabase session
4. User B logs in → `useUserStorage` checks `pawkit_last_user_id`
   - Found: `"user-a-id"` (not cleared!)
   - Current: `"user-b-id"`
   - **SHOULD** trigger `cleanupPreviousUser()` but marker wasn't cleared
   - System thinks it's same user, doesn't clean up
5. User B sees User A's data! 🐛

**The Fix**:
```typescript
const signOut = async () => {
  // CRITICAL: Clear session markers so next login detects user switch
  localStorage.removeItem('pawkit_last_user_id');  // ← THE KEY FIX
  localStorage.removeItem('pawkit_active_device');

  // Sign out from Supabase
  await supabase.auth.signOut();

  // Close database connections for clean slate
  try {
    const { localDb } = await import('@/lib/services/local-storage');
    const { syncQueue } = await import('@/lib/services/sync-queue');
    await localDb.close();
    await syncQueue.close();
  } catch (dbError) {
    // Non-critical - continue anyway
  }

  router.push('/login');
}
```

**Technical Implementation**:

**User Switch Detection** (from `lib/hooks/use-user-storage.ts`):
```typescript
// Check if this is a different user than last time
const previousUserId = localStorage.getItem('pawkit_last_user_id');

if (previousUserId && previousUserId !== currentUserId) {
  console.warn('[useUserStorage] USER SWITCH DETECTED!');
  // CRITICAL: Clean up previous user's data
  await cleanupPreviousUser(previousUserId);
}

// Initialize storage for current user
await localDb.init(currentUserId, workspaceId);
await syncQueue.init(currentUserId, workspaceId);

// Store current user ID for next login
localStorage.setItem('pawkit_last_user_id', currentUserId);
```

**Per-User Database Architecture**:
- Each user gets isolated IndexedDB: `pawkit-{userId}-default-local-storage`
- User switch triggers automatic cleanup of previous user's database
- Fresh database initialized for new user
- Zero data bleeding between accounts

**Debugging Process**:

1. **Initial test showed complete failure** - Both URLs and notes bleeding between accounts
2. **Checked `useUserStorage` hook** - Confirmed it has proper isolation logic
3. **Checked database naming** - Confirmed per-user databases exist
4. **Realized**: If local storage is isolated, issue must be sign out not clearing markers
5. **Added marker cleanup to signOut** - Instant fix!

**Testing & Verification**:

User tested with 2 accounts:
- ✅ User A's data (notes + URLs) invisible to User B
- ✅ User B's data (notes + URLs) invisible to User A
- ✅ Sign Out works reliably
- ✅ Data persists correctly for each user
- ✅ Console logs show proper cleanup and user switch detection

**Files Modified**:
- `lib/contexts/auth-context.tsx` - Added session marker cleanup to signOut
- `components/modals/profile-modal.tsx` - Simplified Sign Out button handler
- `lib/hooks/use-user-storage.ts` - (Already had isolation logic, no changes needed)
- `lib/services/local-storage.ts` - (Already had per-user databases, no changes needed)

**Commits** (11 total on branch):
- 35ade04 - Initial user workspace architecture
- 4c5f810 - Complete user-specific database implementation
- f3114aa - Fix React Hook exhaustive-deps warnings
- 917d039 - Fix TypeScript errors in hooks
- 5d06487 - Clean up: remove redundant syncQueue.init() call
- fa17320 - debug: add comprehensive logging to signOut functionality
- 2f46823 - debug: add component-level logging and test button
- 7b9c557 - debug: add aggressive logging and alerts to both buttons
- faa9463 - fix: add comprehensive logging and await to signOut call
- ... (more debug commits)
- d4a379f - **fix: clear session markers on signOut to enable user isolation** ← THE FIX
- 444db1c - cleanup: remove test button, keep only Sign Out

**Merge to Main**: 6f9fe5f
- 18 files changed, 1,033 additions, 111 deletions
- Successfully merged and deployed to production

**New Files Created**:
- `lib/hooks/use-user-storage.ts` - User storage initialization hook
- `lib/services/storage-migration.ts` - Migration from old global database

**Architecture Improvements**:
1. **User-Specific Storage Hook** - Dashboard layout now calls `useUserStorage()` before initializing data
2. **Automatic User Switch Detection** - System detects when different user logs in
3. **Automatic Cleanup** - Previous user's data automatically cleaned up
4. **Database Isolation** - Per-user IndexedDB databases with workspace support
5. **Migration Support** - Automatically migrates existing users from old global database

**Impact**:
- Critical security vulnerability completely resolved
- User data fully isolated between accounts
- Sign Out functionality restored and reliable
- Clean user switching with automatic cleanup
- Production-ready and deployed

**Lessons Learned**:
1. Dynamic imports can fail silently in client-side React components
2. Session markers are CRITICAL for user switch detection
3. Always test the happy path after fixing bugs (we broke sign out while fixing isolation)
4. localStorage cleanup is just as important as database cleanup
5. Simple solutions are often better than complex ones

---

### Date: January 2, 2025 (Evening) - CRITICAL: User Data Isolation Bug Investigation

**Status**: UNDER INVESTIGATION - Branch: `user-isolation-debug`
**Priority**: CRITICAL SECURITY ISSUE - Multiple users on same browser share data
**Impact**: Cards created in Account A appear in Account B after login/logout

**Problem Discovery**:

User reported critical security bug: IndexedDB and localStorage were not user-specific. When multiple users logged into same browser:
- User A's cards appeared in User B's library
- Recently viewed items leaked between accounts
- URLs duplicated without metadata (cards spin forever)
- Notes appeared isolated but URL cards leaked

**Investigation Summary**:

Discovered and addressed **5 separate isolation problems**:

1. **IndexedDB Globally Shared** - ✅ FIXED
   - **Symptom**: All users shared single database `'pawkit-local-storage'`
   - **Fix**: Changed to per-user databases `'pawkit-{userId}'`
   - **Files**: `lib/services/local-storage.ts`, `lib/contexts/auth-context.tsx`
   - **Commit**: Initial user isolation fixes

2. **Recently Viewed Items Shared** - ✅ FIXED
   - **Symptom**: Sidebar recently viewed showed cards from all users
   - **Fix**: Changed localStorage key to `'pawkit-recent-history-{userId}'`
   - **Files**: `lib/hooks/use-recent-history.ts`
   - **Commit**: Same commit as above

3. **Database Initialization Race Condition** - ✅ FIXED
   - **Symptom**: "Cannot initialize database without userId" errors
   - **Root Cause**: DataStore.initialize() called before auth set userId
   - **Fix**: Dashboard layout waits for `authLoading=false` AND `user!=null`
   - **Files**: `app/(dashboard)/layout.tsx`
   - **Commit**: Same commit as above

4. **Auth Cache Contamination** - ✅ FIXED
   - **Symptom**: Next.js router cached previous user's session data
   - **Fix**: Added `router.refresh()` before navigation in signOut
   - **Files**: `lib/contexts/auth-context.tsx`
   - **Commit**: Same commit as above

5. **SERVER-SIDE DATA LEAK** - 🔍 UNDER INVESTIGATION
   - **Symptom**: Cards (URLs specifically) still duplicate between accounts
   - **Status**: Added comprehensive server-side logging to debug
   - **Logging Points**:
     - `getCurrentUser()` - Track which user Supabase returns
     - API `/cards` GET/POST - Track authenticated user ID
     - `listCards()` - Detect if database returns foreign user cards
   - **Next Step**: Deploy and check logs for "🚨 DATA LEAK DETECTED" alerts

**Technical Implementation**:

**Per-User IndexedDB Pattern**:
```typescript
class LocalStorage {
  private userId: string | null = null;

  private getDbName(): string {
    if (!this.userId) {
      throw new Error('Cannot access database without userId');
    }
    return `pawkit-${this.userId}`; // USER-SPECIFIC DATABASE
  }

  async setUserId(userId: string | null): Promise<void> {
    if (this.db) {
      this.db.close(); // Close previous user's database
      this.db = null;
    }
    this.userId = userId;
    if (userId) await this.init(); // Open new user's database
  }
}
```

**Auth-Coordinated Database Switching**:
```typescript
// lib/contexts/auth-context.tsx
supabase.auth.onAuthStateChange(async (_event, session) => {
  const newUser = session?.user ?? null;
  setUser(newUser);

  if (newUser) {
    await localDb.setUserId(newUser.id); // Switch to user's database
  } else {
    await localDb.close(); // Close on logout
  }

  router.refresh(); // Clear Next.js cache
});
```

**Per-User localStorage Keys**:
```typescript
// lib/hooks/use-recent-history.ts
function getStorageKey(userId: string | null): string {
  if (!userId) return "pawkit-recent-history";
  return `pawkit-recent-history-${userId}`; // USER-SPECIFIC KEY
}
```

**Auth-Aware Initialization**:
```typescript
// app/(dashboard)/layout.tsx
useEffect(() => {
  if (authLoading) return; // Wait for auth
  if (!user) return; // Require user
  if (!isInitialized) {
    initialize(); // Now safe to initialize
  }
}, [authLoading, user, isInitialized, initialize]);
```

**Data Store Reset on User Switch**:
```typescript
// lib/stores/data-store.ts
reset: () => {
  console.log('[DataStore V2] Resetting state for user switch');
  set({
    cards: [],
    collections: [],
    isInitialized: false,
    isLoading: false,
    isSyncing: false,
  });
}
```

**Server-Side Debugging (user-isolation-debug branch)**:
```typescript
// lib/auth/get-user.ts
console.log('[getCurrentUser] 🔑 Supabase user:', {
  id: user.id,
  email: user.email,
  timestamp: new Date().toISOString()
});

// app/api/cards/route.ts
console.log('[API /cards GET] ✅ Authenticated user:', {
  id: user.id,
  email: user.email
});

// lib/server/cards.ts
const foreignCards = items.filter(c => c.userId !== userId);
if (foreignCards.length > 0) {
  console.error('[listCards] 🚨🚨🚨 DATA LEAK DETECTED!', {
    requestedUserId: userId,
    foreignCards: foreignCards.map(c => ({
      id: c.id,
      title: c.title,
      userId: c.userId
    }))
  });
}
```

**Branch Structure**:
- **main**: Clean and stable (reset to commit 110a1c7)
- **user-isolation-debug**: Contains all fixes + comprehensive logging (4 commits)

**Files Modified**:
- `lib/services/local-storage.ts` - Per-user database naming, setUserId/close methods
- `lib/contexts/auth-context.tsx` - Database switching on auth changes, router refresh
- `lib/hooks/use-recent-history.ts` - Per-user localStorage keys
- `lib/stores/data-store.ts` - Auth-aware initialization, reset() method
- `app/(dashboard)/layout.tsx` - Wait for auth before initialization
- `lib/auth/get-user.ts` - Debugging logs (debug branch only)
- `app/api/cards/route.ts` - Debugging logs (debug branch only)
- `lib/server/cards.ts` - Debugging logs (debug branch only)

**Commits** (on user-isolation-debug):
1. Initial user isolation fixes (IndexedDB + recently viewed + race condition + auth cache)
2. Server-side debugging logs added to getCurrentUser
3. Server-side debugging logs added to /api/cards
4. Server-side debugging logs added to listCards with foreign card detection

**Current Status**:
- 4 out of 5 isolation problems fixed
- Server-side data leak still under investigation
- Comprehensive logging in place to identify leak source
- Main branch kept clean, all work on user-isolation-debug branch

**Next Steps for Continuation**:
1. Deploy `user-isolation-debug` branch to Vercel for testing
2. Test card creation:
   - Create URL card in Account A
   - Switch to Account B
   - Verify card does NOT appear in Account B
3. Check Vercel server logs for debugging output:
   - Look for userId mismatch between getCurrentUser → API → listCards
   - Look for "🚨 DATA LEAK DETECTED" alert
   - Track userId through entire request chain
4. Identify exact layer where user isolation breaks:
   - Is Supabase returning wrong user?
   - Is API middleware failing to authenticate correctly?
   - Is database WHERE clause not filtering?
5. Fix root cause once identified
6. Remove debugging logs
7. Merge user-isolation-debug to main
8. Verify in production with multiple test accounts

**User Feedback**:
- "Okay, it seems to be working. But there is one issue. The recently viewed items..." (Led to fix #2)
- "Nope, not isolated still. If I create cards on one or the other, it creates it on the other still. Notes don't seem to, but URLs seem to be duplicating..." (Led to debug logging)
- "We need to make this a different branch, not sure why this is getting put on main" (Led to branch cleanup)

**Impact**: Critical security vulnerability partially addressed. Local storage isolation complete. Server-side isolation debugging in progress. Cannot deploy to production until fully resolved.

---

### Date: January 2, 2025 - Calendar View Improvements & Sidebar Control System

**Accomplished**:

1. **Implemented Calendar Sidebar Control Panel**
   - Created `components/control-panel/calendar-controls.tsx` with comprehensive calendar controls
   - Features: Month grid selector (3x4 for Jan-Dec), content type filters, quick actions, upcoming events
   - Month grid replaces center panel navigation arrows for more intuitive month jumping
   - Content filters: Movies/Shows, Concerts/Events, Deadlines, Product Launches, Other Events, Daily Notes
   - Quick actions: Jump to Today, dynamic View This Week/Month toggle
   - Upcoming events section shows next 5 chronologically ordered events with "View all" link

2. **Created Day Details Panel**
   - Created `components/control-panel/day-details-panel.tsx` - slides in when day is clicked
   - Shows daily note (if exists) and all scheduled cards for selected day
   - "Add Event" button opens modal using createPortal to escape sidebar stacking context
   - Close button returns to calendar controls (calls openCalendarControls())
   - ESC key handling integrated with dashboard layout

3. **Implemented Week View**
   - Created `components/calendar/week-view.tsx` with horizontal columns layout
   - Shows 7 days side-by-side in compact vertical columns (grid-cols-7)
   - Each day shows: day name, date, daily note, scheduled cards (scrollable)
   - Dynamic toggle button in calendar controls switches between "View This Week" and "View This Month"

4. **Created Add Event Modal**
   - Created `components/modals/add-event-modal.tsx` for adding scheduled events
   - Glass morphism styling with z-[200] for proper stacking
   - Uses createPortal to render at document.body (escapes sidebar hierarchy)
   - Allows adding title and URL for events on specific dates

5. **Built Calendar State Management**
   - Created `lib/hooks/use-calendar-store.ts` - Zustand store for calendar-specific state
   - Manages: currentMonth, viewMode ("month" | "week"), selectedDay, contentFilters
   - Actions: setCurrentMonth, setViewMode, setSelectedDay, toggleContentFilter, clearContentFilters

6. **Updated Panel Store for Calendar**
   - Added "calendar-controls" and "day-details" content types to panel store
   - Fixed sidebar persistence: close() and toggle() now preserve previousContentType
   - Sidebar correctly restores to calendar controls when toggling on/off in calendar view
   - ESC key handling for day-details panel in layout

7. **Fixed Multiple UX Issues**
   - **Issue 1: Sidebar persistence** - Fixed close() to store previousContentType, toggle() to restore it
   - **Issue 2: Close Daily View showing blank screen** - Changed to openCalendarControls() instead of restorePreviousContent()
   - **Issue 3: Add Event modal clipped by sidebar** - Used createPortal with z-[200] to render at document.body
   - **Issue 4: TypeScript error** - Fixed variable name mismatch (setSelectedDate vs setSelectedDay)
   - **Issue 5: View This Week just jumped to today** - Added CalendarViewMode type and proper week view switching
   - **Issue 6: Week view layout was vertical** - Changed to grid-cols-7 with compact columns

**Key Technical Details**:

**Calendar Store State**:
```typescript
type CalendarState = {
  currentMonth: Date;
  viewMode: CalendarViewMode; // "month" | "week"
  selectedDay: Date | null;
  contentFilters: CalendarContentFilter[];
  setCurrentMonth: (date: Date) => void;
  setViewMode: (mode: CalendarViewMode) => void;
  setSelectedDay: (date: Date | null) => void;
  toggleContentFilter: (filter: CalendarContentFilter) => void;
  clearContentFilters: () => void;
};
```

**Content Filters for Future AI Detection**:
```typescript
export type CalendarContentFilter =
  | "movies-shows"
  | "concerts-events"
  | "deadlines"
  | "product-launches"
  | "other-events"
  | "daily-notes";
```

**Panel Store Updates**:
- Added "calendar-controls" and "day-details" to PanelContentType
- close() now preserves previousContentType unless closing temporary panels
- toggle() restores previous content type or defaults to library-controls

**Portal Pattern for Modal**:
```typescript
{isMounted && showAddEventModal && createPortal(
  <AddEventModal
    open={showAddEventModal}
    onClose={() => setShowAddEventModal(false)}
    scheduledDate={selectedDay}
  />,
  document.body
)}
```

**Files Created**:
- `components/control-panel/calendar-controls.tsx`
- `components/control-panel/day-details-panel.tsx`
- `components/calendar/week-view.tsx`
- `components/modals/add-event-modal.tsx`
- `lib/hooks/use-calendar-store.ts`

**Files Modified**:
- `lib/hooks/use-panel-store.ts` - Added calendar content types, fixed close/toggle
- `app/(dashboard)/calendar/page.tsx` - Uses calendar store, renders correct view
- `app/(dashboard)/layout.tsx` - Integrated CalendarControls and DayDetailsPanel, ESC handling
- `components/calendar/custom-calendar.tsx` - Accepts currentMonth prop from store

**Branch**: `calendar-view-improvements`

**Impact**: Calendar view now has dedicated sidebar control panel that only appears in calendar view, with full month navigation, content filtering, week view toggle, and day detail exploration. Sidebar transitions smoothly like other view-specific sidebars.

---

### Date: October 31, 2025 - Context Menu System & UI Fixes

**Accomplished**:

1. **Implemented Reusable Context Menu System**
   - Created `hooks/use-context-menu.ts` - Custom hook for context menu state management
   - Created `components/ui/generic-context-menu.tsx` - Reusable wrapper with array-based API
   - Supports icons, separators, submenus, shortcuts, destructive actions
   - Simple array-based configuration for easy implementation
   - TypeScript types for full type safety

2. **Created Comprehensive Context Menu Audit**
   - Documented all existing context menu patterns in codebase
   - Created `CONTEXT_MENU_AUDIT.md` with comprehensive analysis
   - Identified 3 existing patterns, 5 components with menus, 6+ missing menus
   - Provided recommendations for standardization

3. **Fixed Left Sidebar Context Menu**
   - Added context menus to Pawkit collections in left navigation panel
   - Previously showed browser default menu, now shows custom menu
   - Menu items: Open, New sub-collection, Rename, Move, Delete
   - Used GenericContextMenu wrapper for consistency

4. **Fixed Z-Index Issues**
   - Context menus were rendering behind sidebar (z-index 102)
   - Updated GenericContextMenu to use z-[9999] on both ContextMenuContent and ContextMenuSubContent
   - Documented z-index hierarchy: z-0 (base) → z-10 (floating) → z-50 (overlays) → z-[102] (sidebars) → z-[150] (modals) → z-[9999] (context menus)

5. **Fixed PAWKITS Header Context Menu**
   - First attempt: Wrapping PanelSection didn't work (asChild issue)
   - Technical learning: GenericContextMenu with asChild only works with simple elements, not complex components
   - Solution: Inlined header structure and wrapped button directly
   - Menu items: View All Pawkits, Create New Pawkit

6. **Replaced window.prompt() with Glassmorphism Modal**
   - Created custom modal for renaming Pawkits
   - Features: Auto-focus, Enter/Escape handling, loading state, toast notification
   - Modal styling: bg-white/5, backdrop-blur-lg, border-white/10, shadow-glow-accent
   - Maintains visual consistency with app design language

7. **Fixed Move Menu UX**
   - Replaced text prompt asking for slug with visual submenu
   - Shows all available Pawkits in hierarchical structure
   - Created `buildMoveMenuItems()` helper function for recursive menu building
   - Filters out current collection (can't move into itself)

8. **Fixed ESC Key Handling in Modal**
   - Problem: ESC was closing sidebar instead of modal (event bubbling)
   - Solution: Added useEffect with document-level keydown listener
   - Used capture phase (third param = true) to intercept before bubbling
   - Calls stopPropagation() and preventDefault()
   - Behavior: First ESC closes modal, second ESC closes sidebar

9. **Updated Skills Documentation**
   - Updated roadmap skill with all completed work from October 31, 2025
   - Updated troubleshooting skill with 4 new context menu issues (Issues #11-14)
   - Updated UI/UX skill with comprehensive Context Menu section including z-index hierarchy

**Key Technical Details**:

**Z-Index Hierarchy**:
```
z-0       // Base layer (most content)
z-10      // Floating elements (cards, pills)
z-50      // Overlays (drawers, modals)
z-[102]   // Sidebars (left/right panels)
z-[150]   // Modal overlays (backgrounds)
z-[9999]  // Context menus (ALWAYS ON TOP)
```

**Event Capture Pattern for Modals**:
```typescript
useEffect(() => {
  if (!modalOpen) return;

  const handleEsc = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      e.stopPropagation();
      e.preventDefault();
      handleClose();
    }
  };

  // Capture phase to intercept before parent handlers
  document.addEventListener("keydown", handleEsc, true);
  return () => document.removeEventListener("keydown", handleEsc, true);
}, [modalOpen]);
```

**asChild Prop Limitation**:
- Only works with simple HTML elements (button, div, a)
- Does NOT work with complex components
- Solution: Inline component structure and wrap specific element

**Files Modified**:
- `hooks/use-context-menu.ts` (Created)
- `components/ui/generic-context-menu.tsx` (Created)
- `CONTEXT_MENU_AUDIT.md` (Created)
- `components/navigation/left-navigation-panel.tsx` (Multiple updates)
- `components/pawkits/sidebar.tsx` (Updated to use GenericContextMenu)
- `.claude/skills/pawkit-roadmap/SKILL.md` (Updated)
- `.claude/skills/pawkit-troubleshooting/SKILL.md` (Updated)
- `.claude/skills/pawkit-ui-ux/SKILL.md` (Updated)

**Commits**: Multiple commits on branch `claude/fix-main-bugs-011CUfH4XKwHPJ29z3vN8LRb`

**Impact**: Standardized context menu system across application, improved UX consistency, fixed multiple visual and interaction bugs

---

### Date: October 30, 2025 (Night) - Delete Synchronization Bug Fixes

**Accomplished**:

1. **Fixed Critical Bug: Deleted Cards Injecting Into State**
   - **Problem**: Library showing deleted cards even though sync works correctly
   - **Root Cause**: When cards are updated with conflicts or successful syncs, code fetches from server and maps into state using `.map(c => c.id === id ? serverCard : c)`
   - If `serverCard.deleted === true`, deleted card injected into state, bypassing all filtering
   - **Found 5 Locations** where this happened in data-store.ts:
     - Lines 659, 676: Conflict resolution
     - Line 712: Successful update
     - Line 552: Metadata fetch
     - Line 535: Card creation sync
   - **Fix**: Added checks before all `.map()` operations to filter out deleted cards
   - Commit: 85ed692

2. **Fixed Critical Bug: Deduplication Corrupting Data**
   - **Problem**: Navigating to Library page corrupts IndexedDB - 25 cards incorrectly marked as deleted
   - **Root Cause**: `deduplicateCards()` called `localDb.deleteCard()` to remove duplicates
   - `deleteCard()` performs SOFT DELETE (sets `deleted=true`) not hard delete
   - Duplicate cards were being marked as deleted in IndexedDB
   - **Fix**: Changed line 100 in data-store.ts from `localDb.deleteCard()` to `localDb.permanentlyDeleteCard()`
   - Commit: 61ba60e

3. **Fixed Two More Soft Delete Bugs**
   - After comprehensive search, found TWO MORE places using soft delete for temp cards:
     - data-store.ts:531 - `addCard()` replacing temp card with server card
     - sync-service.ts:661 - Sync service replacing temp card with real ID
   - Both were using `deleteCard()` instead of `permanentlyDeleteCard()`
   - **Fix**: Changed both locations to use hard delete
   - Commit: 699e796

4. **Created Debug Page for Database Comparison**
   - Built `/debug/database-compare` page to compare Supabase vs IndexedDB
   - Shows total/active/deleted counts for both server and local
   - Identifies cards that exist only on server or only locally
   - Identifies deletion mismatches (server=active but local=deleted)
   - Added "Resolve Mismatches" button to fix conflicts (server as source of truth)
   - Added "Force Full Sync" button to clear local and re-download from server
   - Commit: 76fe9f4

5. **Added Comprehensive Logging for Missing Cards Investigation**
   - **Problem**: Force Full Sync shows "Perfect Sync" but 26 cards are missing
   - **Added Logging to Force Full Sync**:
     - Track save success/failure for each card
     - Immediate verification of IndexedDB contents
     - Compare server vs IndexedDB counts
     - List missing cards with IDs and titles
   - **Added Logging to Deduplication**:
     - Show input/output counts
     - Display which cards marked as duplicates
     - Show card details (ID, title, URL)
     - Final stats breakdown
   - Commit: b56dff1

6. **Fixed Fifth Bug: Deduplication Removing Legitimate Server Cards**
   - **Problem**: Comprehensive logging revealed 26 cards being removed as "duplicates"
   - **Root Cause**: Priority 3 logic treated "both real OR both temp" together
   - When both cards had real server IDs, deduplication removed one based on createdAt
   - These were legitimate separate cards that happened to have same title
   - Test cards with titles like "SYNC TEST" were being removed
   - **Fix**: Added explicit Priority 3 check - skip deduplication when BOTH are real server cards
   - Real server cards are ALWAYS legitimate, even if they share title/URL
   - Deduplication now ONLY removes temp cards
   - Commit: 476d04a

**Key Technical Details**:

**Critical Distinction - Soft Delete vs Hard Delete**:
```typescript
// SOFT DELETE (for user deletions to trash):
async deleteCard(id: string): Promise<void> {
  const card = await this.db.get('cards', id);
  if (card) {
    card.deleted = true;
    card.deletedAt = new Date().toISOString();
    await this.db.put('cards', card);
  }
}

// HARD DELETE (for internal cleanup):
async permanentlyDeleteCard(id: string): Promise<void> {
  await this.db.delete('cards', id);
}
```

**Bug Pattern**: Using soft delete when hard delete is needed causes cards to be marked as deleted and synced across devices.

**Files Modified**:
- `lib/stores/data-store.ts` - Fixed 3 locations (lines 100, 531, and 5 state injection points)
- `lib/services/sync-service.ts` - Fixed 1 location (line 661)
- `app/(dashboard)/debug/database-compare/page.tsx` - Created debug page with comparison and sync tools
- `lib/services/local-storage.ts` - Added `includeDeleted` parameter to getAllCards/getAllCollections
- `lib/validators/card.ts` - Added includeDeleted to cardListQuerySchema
- `lib/server/cards.ts` - Updated listCards to support includeDeleted
- `app/api/cards/route.ts` - Pass includeDeleted parameter
- `app/(dashboard)/library/page.tsx` - Added debug logging

**Commits**:
- 3a711b1 - Add debug logging to library page for deleted cards
- 259e4f0 - Update deletion filters to explicit checks
- 76fe9f4 - Add Resolve Mismatches feature to debug page
- 85ed692 - Fix deleted cards injecting into state via .map() operations
- 61ba60e - Fix deduplication using soft delete instead of hard delete
- 699e796 - Fix two more locations using soft delete for temp cards
- b56dff1 - Add comprehensive logging for missing cards investigation
- 476d04a - Fix deduplication removing legitimate server cards
- dcee287 - Update skills with delete sync bug fixes
- d2b881c - Merge fix/delete-sync to main

**Impact**: All 5 delete synchronization bugs fixed - deleted cards no longer appear in library, data no longer corrupts on navigation, all 26 missing cards preserved

**Result**: Perfect sync achieved! Force Full Sync now shows "Perfect Sync" with all cards present. Merged to main and deployed.

---

### Date: October 30, 2025 (Evening) - Production Deployment & Environment Sync

**Accomplished**:

1. **Database Connection Issues Resolved**
   - Database password was rotated in Supabase
   - Updated local `.env.local` and `.env` files with new password
   - Added critical `&schema=public` parameter to `DATABASE_URL`
   - URL-encoded special characters in password (`@` → `%40`)
   - Fixed: `postgresql://...?pgbouncer=true&schema=public`

2. **Successfully Merged feat/multi-session-detection to Main**
   - Resolved merge conflicts in:
     - `app/(dashboard)/layout.tsx` - Combined multi-session features with help center UI
     - `components/command-palette/command-palette.tsx` - Added both `footer` and `initialValue` props
   - All multi-session detection features now in production
   - Commits: 6f99d4e (merge), b907b42 (config updates)

3. **Fixed Content Security Policy (CSP) Blocking Next.js**
   - **Problem**: Production CSP was too restrictive, blocked Next.js runtime
   - **Root Cause**: Missing `'unsafe-eval'` and `'unsafe-inline'` in production CSP
   - **Fix**: Updated `next.config.js` to allow required Next.js directives
   - Changed `script-src 'self' blob:` to `script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:`
   - Changed `script-src-elem 'self' blob:` to `script-src-elem 'self' 'unsafe-inline' blob:`
   - Commit: 8b87241

4. **Environment Configuration Synchronized**
   - Local environment now matches production requirements
   - All environments use same database credentials
   - Schema parameter ensures Prisma migrations work correctly
   - Dev server running successfully on localhost:3000

**Key Technical Details**:

**DATABASE_URL Format**:
```bash
# Before (broken)
postgresql://...@host:6543/postgres?pgbouncer=true

# After (working)
postgresql://...@host:6543/postgres?pgbouncer=true&schema=public
```

**CSP Requirements for Next.js**:
- `'unsafe-eval'` - Required for Next.js runtime and webpack chunks
- `'unsafe-inline'` - Required for inline scripts Next.js generates
- Both needed even in production for framework to function

**Files Modified**:
- `.env.local` - Updated database credentials and schema parameter
- `.env` - Updated database credentials and schema parameter
- `next.config.js` - Fixed CSP configuration for production
- `app/(dashboard)/layout.tsx` - Resolved merge conflicts
- `components/command-palette/command-palette.tsx` - Resolved merge conflicts
- `.claude/skills/pawkit-project-context/SKILL.md` - This session

**Production Readiness**:
- ✅ Multi-session detection merged to main
- ✅ Database migrations applied
- ✅ CSP configured correctly
- ✅ Environment variables synchronized
- ✅ Local dev server working
- ⚠️ Vercel DATABASE_URL needs updating with new password

**Commits**:
- b907b42 - chore: merge remote changes and update local config
- 6f99d4e - Merge feat/multi-session-detection into main
- 8b87241 - fix: update CSP to allow Next.js scripts in production

**Next Steps**:
- Update Vercel environment variable `DATABASE_URL` with new password
- Monitor production deployment after Vercel redeploys
- Consider removing debug console.log statements (24 total)
- Verify card creation working in production

---

### Date: October 30, 2025 (Morning) - Note Creation Bug Fixes & Database Constraint Repair

**Accomplished**:

1. **Fixed Missing useMemo Import**
   - Added `useMemo` to React imports in `app/(dashboard)/layout.tsx`
   - Caused ReferenceError when navigating to /notes page
   - dailyNoteExists calculation required useMemo hook
   - Commit: 49ae3ee

2. **Fixed Note Creation Tags Parameter Bug**
   - `handleCreateNote` functions weren't accepting or passing `tags` parameter
   - Modal correctly sent `tags: ["daily"]` for daily notes and `tags: undefined` for regular notes
   - But handlers in layout.tsx and omni-bar.tsx ignored the tags
   - Result: Daily note tag never applied even when user selected "Daily Note"
   - Fixed by adding `tags?: string[]` to function signature and passing to `addCard`
   - Locations fixed:
     - `app/(dashboard)/layout.tsx` handleCreateNote
     - `components/omni-bar.tsx` handleCreateNote
   - Commit: 9562bec

3. **Fixed Note Creation State Persistence Bug**
   - Users reported all notes defaulting to daily notes
   - Root cause: Modal state persisted between opens
   - If user clicked "Daily Note" then closed modal, `noteType` stayed "daily-note"
   - Next open showed "Markdown" selected but created daily note
   - Fixed by adding useEffect to reset all modal state when opening:
     - Reset noteType to "md-note"
     - Reset title, error, showTemplates
     - Load last used template from localStorage
   - Also added `dailyNoteExists` prop to all CreateNoteModal instances
   - Commit: d5d0c29

4. **Fixed Critical Database Constraint Bug**
   - **Problem**: Creating notes triggered P2002 duplicate errors, returned deleted daily notes
   - **Root Cause**: Full unique constraint on `(userId, url)` applied to ALL card types
   - **Should Be**: Partial unique index with `WHERE type = 'url'` (only applies to URL cards)
   - **Impact**: Every note with `url: ""` triggered duplicate error
   - **Debugging Process**:
     - Added extensive logging to track card creation flow
     - Discovered server returning deleted card: `"deleted": true, "deletedAt": "2025-10-30T01:41:34.517Z"`
     - P2002 error showed: `Target: [ 'userId', 'url' ]`
     - Error handler only looked for `type: "url"` cards, missed md-note duplicates
     - Found old deleted daily note being returned instead of creating new note

5. **Database Migration to Fix Constraint**
   - Created migration: `prisma/migrations/20251029192328_fix_card_unique_constraint/migration.sql`
   - Migration actions:
     1. Drop any full unique constraints on (userId, url)
     2. Drop non-partial unique indexes
     3. Create PARTIAL unique index with `WHERE type = 'url'`
   - Result: Notes can have duplicate/empty URLs freely
   - URL cards still prevented from duplicates
   - Commit: a09bc7b

6. **Improved Error Handling for Duplicates**
   - Updated `lib/server/cards.ts` createCard function
   - Changed duplicate lookup to match card type (not just "url")
   - Added `deleted: false` filter to exclude deleted cards
   - Added detailed logging for P2002 errors
   - Commit: a09bc7b (same as migration)

**Debug Logging Added**:
```typescript
// components/modals/create-note-modal.tsx
console.log('[CreateNoteModal] Creating note with:', { noteType, actualType, tags, title });

// lib/stores/data-store.ts
console.log('[DataStore V2] Syncing card to server with payload:', JSON.stringify(cardData, null, 2));
console.log('[DataStore V2] Server response:', JSON.stringify(serverCard, null, 2));

// lib/server/cards.ts
console.log('[createCard] Attempting to create card:', { userId, type, url, title });
console.log('[createCard] P2002 ERROR - Duplicate detected for type:', cardType, 'URL:', url, 'Target:', error.meta?.target);
```

**Files Modified**:
- `app/(dashboard)/layout.tsx` - Added useMemo import, fixed handleCreateNote tags
- `components/omni-bar.tsx` - Fixed handleCreateNote tags parameter
- `components/modals/create-note-modal.tsx` - Added state reset useEffect, debug logging
- `lib/stores/data-store.ts` - Added debug logging for sync payload and response
- `lib/server/cards.ts` - Improved error handling, added logging
- `prisma/migrations/20251029192328_fix_card_unique_constraint/migration.sql` - New migration
- `.claude/skills/pawkit-troubleshooting/SKILL.md` - Added Issues #10 and #11
- `.claude/skills/pawkit-project-context/SKILL.md` - This session

**Technical Details**:

**The Full Error Chain**:
1. User creates note with title "Testing notes again"
2. Client sends: `{ type: "md-note", title: "Testing notes again", url: "", tags: undefined }`
3. Server attempts to create card
4. Database rejects with P2002: `UNIQUE constraint failed: Card.userId_url`
5. Server catches P2002, looks for existing card
6. Finds deleted daily note from 2025-10-29: `"deleted": true, "tags": ["daily"]`
7. Server returns deleted card (WRONG!)
8. Client shows card briefly, then card disappears on refresh (because deleted=true)
9. User sees 409 Conflict error, no card created

**The Fix**:
1. Database migration removes full constraint
2. Adds partial index: `WHERE type = 'url'` (notes excluded)
3. Server error handler now:
   - Looks for cards of same type (md-note, text-note, url)
   - Excludes deleted cards: `deleted: false`
   - Returns existing non-deleted card or re-throws error

**Impact**: All note creation bugs resolved - users can now create regular notes, markdown notes, and daily notes correctly

**Commits**:
- 49ae3ee - fix: add missing useMemo import in dashboard layout
- 9562bec - fix: pass tags parameter when creating notes
- d5d0c29 - fix: reset note modal state on open + add dailyNoteExists prop
- d893323 - debug: add logging to track note creation tags
- 3cbf441 - fix: exclude deleted cards from duplicate detection
- a09bc7b - fix: remove full unique constraint on Card(userId,url)

**Next Steps**:
- Monitor note creation in production
- Watch for any remaining P2002 errors in logs
- Consider removing debug logging once verified stable

---

### Date: October 29, 2025 - User Feedback & Discoverability Focus (REVISED)

**Accomplished**:

1. **Received and Prioritized User Feedback**
   - Conducted user testing session
   - Identified key pain points with collection management
   - Added 7 new UX improvement tasks to roadmap
   - Organized into HIGH and MEDIUM priority sections

2. **User Feedback Summary**
   - **Finding**: "Renaming collections not intuitive"
     - **Solution**: Added inline Pawkit rename (30 min) - click to edit like Finder/Explorer

   - **Finding**: "Adding to collections unclear (right-click works but not discoverable)"
     - **Solution**: Make 'Add to Pawkit' more prominent in context menu (20 min)
     - **Solution**: Add visual drag-and-drop feedback (45 min)
     - **Solution**: Add onboarding tooltips for new users (1 hour)

   - **Finding**: "Visual aspect of app is strong (bookmarking images/design)"
     - **Validation**: Glass morphism with purple glow resonating with users
     - **Action**: Enhance drag interactions to match visual quality

   - **Finding**: "PKM-lite positioning working well"
     - **Validation**: Users understand the product as a lighter alternative to heavy PKM tools
     - **Action**: Continue balancing simplicity with power features

3. **Roadmap Updated with Pawkit UX Tasks**

   **HIGH PRIORITY - Quick Wins** (added to Pre-Merge Critical):
   - Inline Pawkit rename (30 min)
   - 'Add to Pawkit' in context menu (20 min)
   - Visual drag-and-drop feedback (45 min)
   - Onboarding tooltips for Pawkits (1 hour)

   **MEDIUM PRIORITY - Enhanced Features** (Next Sprint):
   - Keyboard shortcut for Add to Pawkit (45 min)
   - Multi-select bulk add to Pawkit (2 hours)
   - Quick-add from card detail view (30 min)

4. **Strategic Insights**
   - Pawkits are core feature but discoverability is low
   - Right-click and drag work but users don't discover them organically
   - Need progressive disclosure: tooltips → visual feedback → power shortcuts
   - Quick wins can be implemented rapidly (all under 1 hour each)
   - Note: Internally called "collections" in code, but "Pawkits" in all UI text

**Files Modified**:
- `.claude/skills/pawkit-roadmap/SKILL.md` - Added Collection UX sections
- `.claude/skills/pawkit-project-context/SKILL.md` - This session

**REVISION - Discoverability Focus**:

After initial roadmap update, user clarified the real insight:
- **Key Finding**: Features already exist and work perfectly (right-click, CMD+select, hover+button)
- **Real Problem**: Users don't discover these features
- **Solution Shift**: Guide users to existing features instead of building new ones

**New Approach - 4 Discoverability Tasks** (5.75 hours):
1. **Interactive onboarding checklist** (3 hours) - PRIMARY SOLUTION
   - Step-by-step guided workflow: Create Pawkit → Add cards → Organize
   - Demonstrates right-click, drag-drop, hover+button in context
   - Tracks progress, reopenable from settings

2. **Inline Pawkit rename** (30 min)
   - Click-to-edit with edit icon affordance
   - Makes renaming discoverable through direct interaction

3. **Enhanced visual affordances** (45 min)
   - Stronger selection states (purple glow)
   - Drop zone highlighting during drag
   - Pulse animation on first hover+button interaction

4. **Empty state guidance** (30 min)
   - "Create your first Pawkit" when cards exist but no Pawkits
   - "Right-click cards or drag them here" in empty Pawkits

**Superseded**: 7 previous tasks that tried to rebuild/enhance existing features
- 'Add to Pawkit' in context menu - Already perfect in card-context-menu.tsx:137
- Onboarding tooltips - Replaced by comprehensive checklist
- Visual drag-and-drop feedback - Now part of enhanced affordances
- 3 power-user features - Moved to Phase 3 (keyboard shortcuts, bulk ops)

**Current Status**:
- Multi-session work complete and documented
- Discoverability improvements prioritized (4 new tasks)
- Interactive onboarding checklist is PRIMARY FOCUS (3 hours)
- 7 redundant tasks superseded/moved

**Next Steps**:
- Implement interactive onboarding checklist (3 hours)
- Then inline rename, visual affordances, empty states (~1.75 hours)
- Manual multi-session test still pending
- Then merge to main

---

### Date: October 29, 2025 - UI Polish & Debugging Session

**Accomplished**:

1. **Fixed Library Tags UI Consistency**
   - Updated Library view tags from checkboxes to glass pill buttons
   - Now matches Pawkits view pattern (purple glow on hover/selected)
   - Documented as canonical pattern in UI/UX skill
   - Commit: 58132cd

2. **Debugged "Failed to sync settings to server" Error**
   - Investigated supposed view-settings sync failure
   - **Root Cause**: Confusion about feature state - no server sync exists
   - **Reality**: View settings are localStorage-only (intentional design)
   - Clarified architecture:
     - Each view stores layout in localStorage (library-layout, notes-layout, etc.)
     - No server sync currently implemented
     - Per-device preferences by design
   - Documented in troubleshooting skill to prevent future confusion

3. **Verified Skills System Working Well**
   - Successfully navigated 9 comprehensive skills during debugging
   - Skills provided accurate context about codebase state
   - Added troubleshooting entry for clarity on localStorage architecture

**Key Findings**:

- View settings pattern: `localStorage.getItem('library-layout')` etc.
- No `view-settings-store.ts` file exists (was referenced in old summary)
- No `/api/user/view-settings` endpoint exists
- Server sync for view settings is on roadmap but not implemented
- Current implementation works as intended (localStorage-only)

**Files Modified**:
- `.claude/skills/pawkit-troubleshooting/SKILL.md` - Added sync error clarification
- `.claude/skills/pawkit-project-context/SKILL.md` - This session
- `.claude/skills/pawkit-conventions/SKILL.md` - Added view settings pattern

**Current Status**: 4 UI polish tasks remain on roadmap

**Next Steps**:
- Add server-side view settings sync to roadmap
- Continue with remaining UI polish tasks
- Manual multi-session test still pending from previous session

---

### Date: October 28, 2025 - Pre-merge Testing Complete

**Accomplished**:

1. **Created Comprehensive Test Suite** (91% pass rate)
   - Built `/test/pre-merge-suite` with 7 test sections
   - 42 total tests covering all core functionality
   - Visual test runner with color-coded results
   - Sections: CRUD Operations, Den Migration, Data Validation, Private Pawkits, Multi-Session Sync, Critical User Flows, API Endpoints

2. **Fixed API Validation Bugs**
   - Resolved variable scope issue in `/app/api/cards/route.ts`
   - Fixed `ReferenceError: user is not defined` in error handlers
   - API now returns proper 400/422 validation errors instead of 500 crashes
   - Added array validation for all test data loading

3. **Den Migration Ready and Tested**
   - Verified `inDen` field deprecated (no cards have `inDen=true`)
   - Confirmed `the-den` collection exists and is marked private
   - Tested Den filtering in Library view
   - Verified `is:den` search operator functionality
   - Den UI routes accessible

4. **All Core Functionality Verified**
   - Card CRUD operations (create, read, update, delete)
   - Collection/Pawkit management
   - Private collection isolation
   - Multi-session conflict detection
   - Search and filter workflows
   - Tag management
   - Data validation and error handling

**Test Results**:
- 38 passed ✓
- 4 warnings ⚠ (expected - features pending manual testing)
- 0 failed ✗

**Current Status**: Ready to merge `feat/multi-session-detection` to main

**Next Steps**:
1. Manual multi-session test (open 2 browser tabs, verify conflict detection)
2. Merge to main
3. Deploy to production

---

### Date: October 27, 2025 - Multi-Session Detection Implementation

**Accomplished**:

1. **Implemented Event-Based Multi-Session Management**
   - Created `/lib/stores/multi-session-store.ts` with localStorage-based tracking
   - Added write guards to prevent data conflicts
   - Implemented cross-tab communication via storage events
   - No polling - single registration on page load

2. **Fixed Collection Reference Bugs**
   - Corrected ID/slug mismatches across all views
   - Updated Library, Notes, Tags, and Pawkit detail pages
   - Ensured cards always reference collections by slug, never ID
   - Created `pawkit-conventions.md` skill to prevent future mistakes

3. **Added Multi-Session UI Components**
   - Created banner in `/components/ui/multi-session-banner.tsx`
   - Shows warning when multiple sessions detected
   - Provides "Take Control" button to become active device
   - Auto-hides when only one session active

**Technical Details**:
- localStorage key: `pawkit_active_device`
- Session ID format: `${timestamp}_${random()}`
- Heartbeat interval: 5 seconds
- Write guard checks before all mutations

---

## Architecture Overview

### Data Flow
```
IndexedDB (source of truth) → Zustand (UI state) → Server (backup/sync)
```

### Key Stores
- **data-store.ts** - Cards and collections (Zustand + IndexedDB)
- **multi-session-store.ts** - Session tracking and write guards
- **settings-store.ts** - User preferences
- **view-settings-store.ts** - View-specific UI state

### Critical Files
- `/lib/stores/data-store.ts` - Main data store with deduplication
- `/lib/stores/multi-session-store.ts` - Session management
- `/lib/types.ts` - Shared TypeScript types
- `/lib/server/cards.ts` - Server-side card operations
- `/app/api/cards/route.ts` - Cards API endpoints
- `/app/api/pawkits/[id]/route.ts` - Collections API endpoints

---

## Known Issues

### Resolved
- ✓ ID/slug mismatches in collection filtering
- ✓ API variable scope causing 500 errors
- ✓ Test data loading assumes arrays without validation
- ✓ Multi-session write conflicts

### Pending
- Manual multi-session testing needed
- Den migration final verification in production

---

## Feature Flags & Environment

### Environment Variables
- `DATABASE_URL` - PostgreSQL connection
- `NEXTAUTH_SECRET` - Authentication secret
- `NEXTAUTH_URL` - App URL

### Feature Status
- ✓ Multi-session detection - Complete
- ✓ Den migration - Ready
- ✓ Private pawkits - Complete
- ✓ Search operators - Complete
- ⚠ Collaborative editing - Not started

---

## Testing Strategy

### Pre-Merge Test Suite
Location: `/app/(dashboard)/test/pre-merge-suite/page.tsx`

**Test Sections**:
1. CRUD Operations (9 tests) - Card creation, updates, deletion, restore
2. Den Migration (6 tests) - inDen field, the-den collection, filtering, search
3. Data Validation (4 tests) - Duplicates, invalid data, orphaned refs, field constraints
4. Private Pawkits (4 tests) - Creation, isolation, access control, persistence
5. Multi-Session Sync (7 tests) - Conflict detection, device tracking, write guards
6. Critical User Flows (4 tests) - Collection mgmt, search, tags, bulk operations
7. API Endpoints (8 tests) - GET, POST, PATCH, DELETE for cards and pawkits

### Manual Testing Checklist
- [ ] Open 2 browser tabs
- [ ] Verify multi-session banner appears
- [ ] Test "Take Control" button
- [ ] Verify write guards block inactive session
- [ ] Test card creation in both sessions
- [ ] Verify deduplication works
- [ ] Test Den filtering in Library
- [ ] Test private pawkit isolation

---

## Development Principles

### 1. Local-First Architecture
- IndexedDB is primary source of truth
- Server is backup/sync layer
- Optimistic updates with background sync

### 2. Data Model Consistency
- Cards ALWAYS reference collections by `slug`, never `id`
- Use `CollectionNode` type consistently
- Clear variable naming (e.g., `privateCollectionSlugs`)

### 3. Multi-Session Safety
- Write guards on all mutations
- Event-based session tracking (no polling)
- Clear conflict resolution UI

### 4. Testing First
- Pre-merge test suite required
- Visual test runner for quick feedback
- Manual testing for UX-critical features

---

**Last Updated**: 2025-10-30
**Updated By**: Claude Code
**Reason**: Production deployment complete, multi-session detection merged to main, database and CSP issues resolved
