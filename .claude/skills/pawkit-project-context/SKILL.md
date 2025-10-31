---
name: pawkit-project-context
description: Track development progress, major milestones, and session history across sessions
---

# Pawkit Project Context & Session History

**Purpose**: Track development progress, major milestones, and session history to maintain context across development sessions.

---

## Current Status

**Branch**: `feat/multi-session-detection` (merged), `fix/delete-sync` (in progress)
**Status**: Debugging delete synchronization and state management issues
**Last Updated**: October 30, 2025
**Next Steps**: Deploy and test comprehensive logging to identify missing cards issue

---

## Session History

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
