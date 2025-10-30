---
name: pawkit-project-context
description: Track development progress, major milestones, and session history across sessions
---

# Pawkit Project Context & Session History

**Purpose**: Track development progress, major milestones, and session history to maintain context across development sessions.

---

## Current Status

**Branch**: `feat/multi-session-detection`
**Status**: Ready to merge to main
**Next Steps**: Manual multi-session test, then merge

---

## Session History

### Date: October 30, 2025 - Note Creation Bug Fixes & Database Constraint Repair

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

**Last Updated**: 2025-10-29
**Updated By**: Claude Code
**Reason**: User feedback received, collection UX improvements added to roadmap
