---
name: pawkit-roadmap
description: Living, interactive roadmap serving as single source of truth for project progress
---

# Pawkit Project Roadmap

**Purpose**: Living, interactive roadmap serving as single source of truth for project progress and priorities.

---

## Instructions for Claude

### How to Use This Roadmap

1. **Suggest Next Critical Item**
   - Review CURRENT SPRINT and BACKLOG - CRITICAL sections
   - Identify the most important incomplete item
   - Consider dependencies and user priorities
   - Suggest item with rationale

2. **Mark Items as Implemented**
   - When code is written and committed: `[implemented: ✓]`
   - Update the skill file using the Edit tool
   - Keep item in current section until tested

3. **Remind User to Test**
   - After marking implemented, explicitly ask user to test
   - Provide testing instructions if needed
   - Wait for user confirmation before marking complete

4. **Mark Items as Complete**
   - Only when user confirms testing: `[tested: ✓]` and `[complete: ✓]`
   - Move completed items to COMPLETED WORK section
   - Update skill file with Edit tool

5. **Update This File**
   - This skill file should be edited during sessions
   - Commit changes with descriptive messages
   - Keep estimates and descriptions current

### Status Indicators
- `[ ]` = Not started
- `[implemented: ✓]` = Code written and committed
- `[tested: ✓]` = User has tested functionality
- `[complete: ✓]` = Implemented, tested, and verified
- `✅` = Fully complete (moved to COMPLETED WORK)

---

## CURRENT SPRINT

**Focus**: Pre-merge UI polish and multi-session detection fixes

### Active Work

- [✓] Fix cursor jumping in note editor (30 min) - [implemented: ✓] [tested: ✓] [complete: ✓]
  Remove `card.content` from useEffect dependency in card-detail-modal.tsx:391-394
  Why: Users report cursor jumping when typing in notes, breaks writing flow
  Completed: October 29, 2025 - Removed card.content from dependency array to prevent cursor reset on auto-save

- [✓] Remove heartbeat system (1 hour) - [implemented: ✓] [tested: ✓] [complete: ✓]
  Delete /app/api/sessions/heartbeat/route.ts and client-side heartbeat calls
  Regenerate Prisma client without DeviceSession model
  Why: Causing 500 errors, doesn't prevent race conditions, adds overhead
  Completed: October 29, 2025 - Multi-session detection now uses localStorage only

- [✓] Add database duplicate prevention (2 hours) - [implemented: ✓] [tested: ✓] [complete: ✓]
  Add `@@unique([userId, url])` constraint to Card model in schema.prisma
  Update createCard to handle duplicate constraint errors gracefully (return existing card)
  Run migration and test duplicate URL saves
  Why: Prevents race condition duplicates at database level (proper solution)
  Completed: October 29, 2025 - Database constraint added, server catches P2002 errors and returns existing card

- [ ] Test duplicate prevention across devices (15 min) - [implemented: ] [tested: ] [complete: ]
  Save same URL from two different browsers simultaneously
  Verify only one card created and both clients show same card
  Why: Validate the core issue from multi-session work is resolved
  Note: Constraint enhanced Oct 30 - now partial index with WHERE type = 'url' (only applies to URL cards, not notes)

### Discoverability Improvements (User Feedback Priority)

**Context**: User testing revealed features are built well but not discoverable. Right-click menus, CMD+select, hover+button all work perfectly - users just don't know they exist. Focus on guiding new users through core workflow: Create Pawkit → Add cards → Organize.

- [ ] Interactive onboarding checklist (3 hours) - **PRIORITY** - [impl: ] [test: ] [done: ]
  Why: Primary solution for discoverability - guides new users through core features
  Impact: Users discover existing features naturally through guided workflow
  User feedback: "Adding to collections unclear" + "Renaming not intuitive" - guide instead of rebuild
  Implementation:
    - Shows on first login, dismissible with progress tracking
    - Step 1: 'Create your first Pawkit' (highlights sidebar + button, shows creation flow)
    - Step 2: 'Add cards to your Pawkit' (demonstrates right-click, drag-drop, and hover+button options)
    - Step 3: 'Organize with nested Pawkits' (shows drag Pawkit onto Pawkit for hierarchy)
    - Tracks completion in localStorage (pawkit-onboarding-checklist-progress)
    - Can be reopened from settings/help menu ('Show onboarding checklist')
    - Contextual - each step appears in relevant view (Step 1 in Library, Step 2 when hovering card, etc.)
    - Use glass modal with purple glow for checkmarks
  Command: `claude-code "Create interactive onboarding checklist: 1) Create onboarding-checklist component with 3 steps, 2) Step 1: Create first Pawkit (highlight sidebar + button), 3) Step 2: Add cards (show right-click, drag, hover+button demos), 4) Step 3: Nest Pawkits (demo drag onto pawkit), 5) Track progress in localStorage 'pawkit-onboarding-checklist-progress', 6) Add 'Show onboarding' option in settings, 7) Make contextual - steps appear in relevant views, 8) Use glass modal design with purple glow checkmarks"`

- [ ] Inline Pawkit rename (30 min) - [impl: ] [test: ] [done: ]
  Why: Click-to-edit is more intuitive than menu-based rename
  Impact: Makes renaming obvious through direct interaction
  User feedback: "Renaming collections not intuitive" - make affordance clearer
  Implementation:
    - Click Pawkit name in sidebar to edit directly (like Finder/Explorer)
    - ESC to cancel, Enter to save
    - Show subtle edit icon on hover to signal editability
    - Location: Pawkits sidebar (left sidebar)
  Command: `claude-code "Add inline rename to Pawkits sidebar: 1) Make Pawkit name editable on click, 2) Show input field with current name, 3) ESC to cancel, Enter to save, 4) Auto-focus input on click, 5) Show subtle edit icon (pencil) on hover, 6) Validate name not empty before saving"`

- [ ] Enhanced visual affordances (45 min) - [impl: ] [test: ] [done: ]
  Why: Subtle visual cues help users discover interactive elements
  Impact: Users notice drag zones, selection states, and interactive areas
  User feedback: "Visual aspect of app is strong" - use visuals to guide interaction
  Implementation:
    - Selected cards: stronger visual state with purple border glow (currently too subtle)
    - Drag state: show drop zones on Pawkits with purple highlight when card is dragged
    - Hover + button: subtle pulse animation on first hover (localStorage flag to show once)
    - Drop zones: "Drop here to add to [Pawkit Name]" tooltip
  Command: `claude-code "Enhance visual affordances: 1) Strengthen selected card state (purple border glow), 2) Show drop zones when dragging (purple highlight on Pawkits), 3) Add pulse animation to hover+button on first hover (localStorage 'seen-hover-button'), 4) Show drop zone tooltips, 5) Ensure all animations match glass design system"`

- [ ] Empty state guidance (30 min) - [impl: ] [test: ] [done: ]
  Why: Empty states are teaching moments - guide users on next action
  Impact: New users know what to do when starting out
  Implementation:
    - When user has cards but no Pawkits: 'Create your first Pawkit to organize your bookmarks' (with arrow to + button)
    - When user has Pawkits but no cards in them: 'Right-click cards or drag them here' (shown in empty Pawkit view)
    - When user has no cards and no Pawkits: Show both messages contextually
    - Use glass cards with purple glow for empty state messages
  Command: `claude-code "Add empty state guidance: 1) No Pawkits but has cards: show 'Create your first Pawkit' message with arrow to + button, 2) Empty Pawkit: show 'Right-click cards or drag them here' message, 3) No cards or Pawkits: show contextual messages, 4) Use glass card design with purple glow, 5) Make dismissible per session"`

---

## COMPLETED WORK

**Reference for what's done - do not modify this section**

### December 14, 2025 - Calendar Enhancements

- ✅ **Agenda View** (2 hours)
  Added 4th calendar view mode - vertical scrollable list grouped by date
  **Features**:
  - Filters to show only future events (today onwards)
  - Groups events by date with clear date headers
  - Shows event time, title, and duration
  - Supports all-day events
  - Keyboard accessible
  **Files**: components/calendar/agenda-view.tsx (NEW), lib/hooks/use-calendar-store.ts, components/calendar/calendar-date-picker.tsx, app/(dashboard)/calendar/page.tsx
  **Impact**: Users can now view their calendar as a simple chronological list

- ✅ **Local Browser Notifications** (4 hours)
  Implemented native system notifications for calendar events and todos
  **Features**:
  - Notification permission request flow
  - Configurable reminder times (5, 10, 15, 30, 60 min, etc. before event)
  - Separate todo due date reminders with configurable time of day
  - Auto-reschedules when events change
  - Settings UI in calendar hamburger menu
  **Files**: lib/services/notifications.ts (NEW), lib/hooks/use-notification-scheduler.ts (NEW), components/notification-scheduler.tsx (NEW), lib/hooks/use-calendar-store.ts, components/calendar/calendar-date-picker.tsx, app/layout.tsx
  **Impact**: Users receive native OS notifications for upcoming events

- ✅ **Notification Settings Store** (30 min)
  Added notification configuration to calendar store
  **Settings Added**:
  - `notificationsEnabled` - Master toggle
  - `eventReminderMinutes` - Minutes before event to notify (0, 5, 10, 15, 30, 60, 120, 1440)
  - `todoNotificationsEnabled` - Toggle for todo reminders
  - `todoReminderTime` - Time of day for todo reminders (default 9 AM)
  **Files**: lib/hooks/use-calendar-store.ts
  **Impact**: User preferences persist across sessions

- ✅ **Multi-day Drag-to-Create Events** (Previous session)
  Users can drag across multiple days in all-day row to create multi-day events
  **Files**: components/calendar/week-view/all-day-row.tsx
  **Impact**: Faster creation of vacations, conferences, multi-day events

- ✅ **Single-day Drag-to-Create Events** (Previous session)
  Users can drag vertically in time grid to create timed events with duration
  **Files**: components/calendar/week-view/day-column.tsx
  **Impact**: Visual time block creation like Google Calendar

---

### November 25, 2025 - Rediscover Mode Enhancements

- ✅ **Ultrawide Monitor Bug Fix** (30 min)
  Fixed Chrome rendering bug on 3440x1440 monitors where cards appeared empty when right sidebar anchored
  **Root Cause**: `backdrop-filter: blur()` on content panel caused GPU memory issues
  **Solution**: Disabled backdrop blur on content panel when `isRightEmbedded` is true
  **Files**: components/panels/content-panel.tsx
  **Impact**: Cards now render properly on all ultrawide monitors

- ✅ **Rediscover Discoverability** (1 hour)
  Moved Rediscover feature to left sidebar for better discoverability
  **Changes**:
  - Added Rediscover nav item after Calendar in HOME section with Sparkles icon
  - Added uncategorized count badge (muted style)
  - Count excludes: deleted cards, notes, The Den, private collections, and previously reviewed cards
  - Removed Rediscover button from Library header
  **Files**: components/navigation/left-navigation-panel.tsx, components/library/library-view.tsx
  **Impact**: Users can now find Rediscover easily with a clear count of cards to review

- ✅ **Rediscover "Add to Pawkit" Feature** (2 hours)
  Added third action button to Rediscover for quick organization
  **New Features**:
  - "Add to Pawkit" button with FolderPlus icon (center position)
  - Keyboard shortcut "A" for quick access
  - Quick Pawkit picker modal (instant, uses local data store)
  - New animation: slide up + scale (suggests "filing away")
  - Button order: Delete (D) | Add to Pawkit (A) | Keep (K)
  **Files**: components/rediscover/rediscover-mode.tsx, app/(dashboard)/library/page.tsx
  **Impact**: Users can organize cards directly during Rediscover flow

- ✅ **Rediscover Bug Fixes** (2 hours)
  Fixed multiple bugs affecting Rediscover usability:
  1. **Queue Reset Bug**: Queue reset to beginning when cards updated (Add to Pawkit)
     - Fix: Removed `items` from useEffect dependency, separate filter change handling
  2. **Slow Pawkit Modal (3-4 sec)**: Modal fetched from API
     - Fix: Changed to use local data store for instant display
  3. **Card Flickering on Keep**: First card briefly showed before next
     - Fix: Don't reset cardTransition state in handleAction
  4. **4-5 Second Delay**: Waited for updateCard to complete
     - Fix: Made optimistic - advance UI immediately, update in background
  5. **Queue Not Persisting**: Kept cards reappeared on re-entry
     - Fix: Added `metadata.rediscoverReviewedAt` timestamp, filter excludes reviewed cards
  **Files**: app/(dashboard)/library/page.tsx, components/modals/move-to-pawkit-modal.tsx, components/rediscover/rediscover-mode.tsx
  **Impact**: Smooth, fast Rediscover experience with persistent progress

- ✅ **Long Title Overflow Fix** (15 min)
  Fixed extremely long titles (TikTok videos) pushing buttons off screen
  **Solution**: Added `line-clamp-2` to title h2 element
  **Files**: components/rediscover/rediscover-mode.tsx
  **Impact**: Consistent UI regardless of title length

- ✅ **Pinned Notes Unpin Context Menu** (15 min)
  Added right-click "Unpin from sidebar" option for pinned notes
  **Problem**: Users had to navigate to Library to unpin notes from sidebar
  **Solution**: Added context menu with PinOff icon using GenericContextMenu wrapper
  **Files**: components/navigation/left-navigation-panel.tsx
  **Impact**: Quick unpin directly from sidebar via right-click

### November 26, 2025 - Phase 1 File Attachments

- ✅ **File Attachments Infrastructure** (3 hours)
  Local-first file storage in IndexedDB for card attachments
  **Architecture**:
  - Files stored in IndexedDB with blob data
  - Thumbnail generation for images
  - Category detection (image, pdf, document, audio, video)
  - Storage quota tracking with soft limit
  **Files**: lib/stores/file-store.ts, lib/types.ts, lib/utils/file-utils.ts
  **Impact**: Foundation for attachments feature

- ✅ **AttachmentsSection Component** (1 hour)
  Simple attachment list for control panel sidebar
  **Features**:
  - Shows thumbnails or file type icons
  - File name and size display
  - Delete attachment button (X on hover)
  - Add attachment button
  - Click to open in preview tab
  **Location**: components/control-panel/card-details-panel.tsx (Links tab)
  **Files**: components/modals/attachments-section.tsx
  **Impact**: Users can attach files to cards from sidebar

- ✅ **AttachmentsTabContent Component** (2 hours)
  Full-featured attachment preview in card modal
  **Features**:
  - Image preview with zoom (0.5x-3x) and rotate (90° increments)
  - PDF preview via iframe
  - Video player with controls
  - Audio player with controls
  - Download button for all file types
  - Thumbnail strip for multiple attachments
  - Navigation arrows (prev/next)
  - Keyboard shortcut hints
  **Files**: components/modals/attachments-tab-content.tsx
  **Impact**: Rich preview experience for all attachment types

- ✅ **Attachments Tab in Card Modal** (1 hour)
  Added Attachments tab to bottom bar (not disabled sidebar!)
  **Key Learning**: Modal has TWO tab systems - only use `bottomTabMode` state
  **Changes**:
  - Added 'attachments' to bottomTabMode type union
  - Added conditional Attachments button (only shows when card has attachments)
  - Added AttachmentsTabContent rendering
  **Files**: components/modals/card-detail-modal.tsx
  **Impact**: Users can preview attachments in card detail modal

- ✅ **Attachment Indicator on URL Pills** (30 min)
  Subtle paperclip icon on cards with attachments
  **Key Learning**: Use absolute positioning to not affect text centering
  **Solution**:
  - Text: `block text-center truncate`
  - Icon: `absolute right-2.5 top-1/2 -translate-y-1/2`
  **Files**: components/library/card-gallery.tsx (Grid, List, Masonry, Compact views)
  **Impact**: Users can see at a glance which cards have attachments

### January 14, 2025 - Performance Optimization: Excessive Re-renders

- ✅ **ProfileModal Excessive Re-renders Fix** (2 hours) - CRITICAL PERFORMANCE
  Fixed ProfileModal re-rendering dozens of times when closed, causing significant performance degradation
  **Root Cause**: Modal subscribed to 15+ settings store values, ALL active regardless of open/closed state
  **Solution**: Wrapper component pattern with early return BEFORE subscriptions
  ```typescript
  export function ProfileModal(props: ProfileModalProps) {
    if (!props.open || typeof document === 'undefined') return null;
    return <ProfileModalContent {...props} />;
  }
  ```
  **Impact**: 100% reduction in ProfileModal re-renders when closed (previously dozens per session)
  **Files**: components/modals/profile-modal.tsx
  **Branch**: fix/performance-critical-issues

- ✅ **Dead Code Removal - Unused AppSidebar** (1 hour)
  Removed 417 lines of dead code after discovering AppSidebar was disabled
  **Discovery**: Initial performance fix applied to wrong component
  **Investigation**: Component completely disabled in layout.tsx:403 with `{false && <AppSidebar.../>}`
  **Decision**: Remove dead code entirely instead of optimizing
  **Impact**: Cleaner codebase, eliminated confusion about which sidebar is actually used
  **Files Deleted**: components/sidebar/app-sidebar.tsx (417 lines)
  **Files Modified**: app/(dashboard)/layout.tsx

- ✅ **LeftNavigationPanel Selective Subscriptions** (1.5 hours)
  Optimized the ACTUAL sidebar with selective Zustand subscriptions
  **Root Cause**: LeftNavigationPanel subscribed to ALL cards from data store
  **Solution**: Selective subscription with shallow comparison
  ```typescript
  import { shallow } from "zustand/shallow";

  const cards = useDataStore((state) => {
    return state.cards.filter((card) => {
      if (card.tags?.includes('daily')) return true;
      if (pinnedNoteIds.includes(card.id)) return true;
      if (card.id === activeCardId) return true;
      return false;
    });
  }, shallow);
  ```
  **Impact**: Expected 40-60% reduction in sidebar re-renders during normal usage
  **Files**: components/navigation/left-navigation-panel.tsx
  **Branch**: fix/performance-critical-issues

- ✅ **Documentation Updates** (30 min)
  Updated troubleshooting and project context skills with performance fixes
  **Skills Updated**:
  - pawkit-troubleshooting: Issues #26 (Dead Code - AppSidebar) and #27 (Performance - Re-renders)
  - pawkit-project-context: Comprehensive session summary
  **Technical Patterns Documented**:
  1. Wrapper Pattern for Conditional Modals
  2. Selective Zustand Subscription Pattern with shallow
  3. Dead Code Detection (search for `{false &&` patterns)

**Total Time**: ~5 hours
**Files Modified**: 3 (profile-modal.tsx, left-navigation-panel.tsx, layout.tsx)
**Files Deleted**: 1 (app-sidebar.tsx - 417 lines)
**Commits**: 3 on fix/performance-critical-issues branch
**User Testing**: Confirmed working with zero ProfileModal re-renders when closed
**Skills Updated**: pawkit-troubleshooting (Issues #26, #27), pawkit-project-context
**Status**: Ready to merge to main

**Impact**:
- **Performance**: Major improvement - eliminated dozens of unnecessary re-renders
- **Code Quality**: 417 lines of dead code removed
- **User Experience**: Noticeable performance improvement during user testing
- **Maintainability**: Clearer codebase with only active components

---

### January 13, 2025 - Bug Fixes: Daily Notes & Tags Display

- ✅ **Duplicate Daily Note Creation Fix** (30 min)
  Fixed "Daily Note" button creating multiple daily notes when clicked rapidly
  **Root Cause**: Check for existing note at render time (stale), not click time (current)
  **Solution**: Query dataStore.cards inside click handler using findDailyNoteForDate()
  **Files**: components/notes/notes-view.tsx
  **Commit**: c3e6683
  **Impact**: No more duplicate daily notes from rapid clicks

- ✅ **Tags Column Display Fix** (45 min)
  Fixed Tags column showing "-" for notes with tags, wrong data for bookmarks
  **Root Cause**: Column rendered card.collections (pawkits) instead of card.tags
  **Solution**: Merge both card.tags AND card.collections for display
  **Files**: components/library/card-gallery.tsx
  **Commits**: 04b407f (first attempt), 0abb2f9 (correct fix)
  **Impact**: Tags column now shows both tags and collections correctly

**Total Time**: ~1.25 hours
**Files Modified**: 2 (notes-view.tsx, card-gallery.tsx)
**Commits**: 3 bug fixes
**Skills Updated**: pawkit-troubleshooting (Issues #24, #25), pawkit-project-context

---

### January 13, 2025 - List View Standardization & Hierarchical Tags

- ✅ **Next.js 15.5 Security Update** (30 min)
  Upgraded Next.js 15.1.6 → 15.5.4 for critical CVE fix
  React 19.0.0 → 19.2.0
  **Impact:** Security vulnerability patched, latest stability improvements

- ✅ **Folder Icon Standardization** (1 hour)
  Replaced all emoji folder icons (📁) with Lucide Folder component
  **Pattern:** `<Folder size={16} className="text-purple-400" />`
  **Files:** grid.tsx, card-gallery.tsx, card-detail-modal.tsx, dig-up-view.tsx, quick-access-pawkit-card.tsx
  **Impact:** Professional icon usage, visual consistency across all folder representations

- ✅ **Sidebar Configuration Standardization** (45 min)
  Unified sorting terminology across ALL views
  **Changes:**
  - Standardized to: "Name", "Date Created", "Date Modified"
  - Removed non-functional toggles from Notes (Masonry, Show Thumbnails, Show Metadata)
  - Updated Direction label to purple (text-accent)
  - Matched Pawkits slider styling to Notes (darker track)
  **Impact:** Eliminated UI inconsistencies between Pawkits and Notes views

- ✅ **List View Pixel-Perfect Standardization** (3 hours) - MAJOR UPDATE
  Achieved identical list view dimensions across Pawkits, Notes, and Library
  **Critical Dimensions:**
  - Row padding: `py-3 px-4` (changed from `py-2`)
  - Data cell text: `text-sm` (changed from `text-xs`)
  - Icon container: `h-8 w-8 rounded-lg backdrop-blur-sm` (NEW)
  - Pin icon: size `14` (changed from `12`)
  - Title text: Added `font-medium`

  **Column Structure:**
  - Pawkits: Name | Items | Sub-Pawkits | Date Created | Date Modified | [menu]
  - Library/Notes: Name | Type | Tags | Date Created | Date Modified | [menu]

  **Files:** card-gallery.tsx (Library/Notes), grid.tsx (Pawkits)
  **Impact:** Pixel-perfect consistency, professional data table appearance

- ✅ **URL Truncation Fix** (1 hour) - CRITICAL
  Fixed extremely long URLs pushing columns off-screen
  **Problem:** Long URLs broke table layout without proper constraints
  **Solution:** Multi-layer truncation pattern:
  ```tsx
  <td className="max-w-xs">
    <div className="flex items-center gap-3 min-w-0">
      <span className="flex-shrink-0"><Icon /></span>
      <span className="truncate min-w-0 flex-1">{title}</span>
    </div>
  </td>
  ```
  **Impact:** Table layout remains stable with any URL length

- ✅ **3-Dot Actions Menu Component** (1.5 hours)
  Created CardActionsMenu inline component with portal rendering
  **Features:**
  - Portal to document.body for proper z-index
  - Position calculation using getBoundingClientRect()
  - z-[9999] to appear above all UI
  - Actions: Open, Pin/Unpin, Delete
  **Impact:** Consistent actions menu across all list views

- ✅ **Hierarchical Tag Inheritance System** (4 hours) - NEW FEATURE
  Implemented automatic parent tag inheritance for nested collections
  **Problem:** Cards in "Restaurants > Everett" only got ["everett"], not ["restaurants"]
  **Solution:** Created lib/utils/collection-hierarchy.ts with utility functions:
  - `getCollectionHierarchy()`: Walks up parent chain
  - `addCollectionWithHierarchy()`: Adds collection + all parents
  - `removeCollectionWithHierarchy()`: Removes with optional children
  - `isCardInCollectionHierarchy()`: For future filtering

  **Usage Pattern:**
  ```tsx
  const newCollections = addCollectionWithHierarchy(
    card.collections || [],
    slug,
    allCollections  // Hierarchical tree from store
  );
  ```

  **Files Modified:** card-gallery.tsx, home/page.tsx
  **TypeScript Fixes:** createServerClient → createClient, added type annotations
  **Impact:** Filtering now works correctly at all hierarchy levels

- ✅ **Collection Hierarchy Data Migration** (2 hours)
  Created `/api/admin/migrate-collection-hierarchy` endpoint
  **Features:**
  - Fetches all collections and cards for authenticated user
  - Builds hierarchy map
  - Identifies cards missing parent tags
  - Batch updates cards with complete hierarchy
  - Idempotent (safe to run multiple times)
  **Response:** Returns success status + stats (totalCards, updatedCards, totalCollections)
  **Impact:** Backfills parent tags for all existing cards

- ✅ **Documentation Updates** (2 hours)
  Updated skills with all new patterns and implementations
  **pawkit-ui-ux:**
  - Section 13: LIST VIEW STANDARDIZATION (canonical pattern)
  - Section 14: FOLDER ICON STANDARDIZATION
  - Section 15: HIERARCHICAL TAG INHERITANCE
  - Updated design system to v1.2
  **pawkit-project-context:**
  - Comprehensive session summary with all 5 major updates
  **pawkit-roadmap:**
  - This completion entry

**Total Time:** ~14.75 hours
**Files Created:** 2 (collection-hierarchy.ts, migrate-collection-hierarchy route)
**Files Modified:** 12 (UI components, control panels, skills)
**Commits:** 8 major commits
**Impact:** Pixel-perfect UI consistency, hierarchical filtering feature, professional polish

---

### January 3, 2025

- ✅ **CRITICAL FIX: User Isolation & Sign Out Restoration** (Full day debug session)
  Fixed two critical bugs that emerged after isolation implementation
  **Branch:** `claude/fix-sync-bugs-011CUmJiyEbu2iTCVjMM8wvD`
  **Merged to main:** Commit 6f9fe5f (18 files changed, 1,033 additions, 111 deletions)

  **Bug #1 - Sign Out Button Not Working:**
  - **Symptom:** Button completely dead - no UI response, no console logs, appeared broken
  - **Root Cause:** Complex cleanup code with dynamic imports failing silently
  - **Fix:** Reverted to simple signOut (Supabase signOut + redirect) with essential cleanup
  - **Key Learning:** Dynamic imports can fail silently in React client components

  **Bug #2 - Complete User Isolation Failure:**
  - **Symptom:** ALL data bleeding between accounts (URLs + notes visible across users)
  - **Root Cause:** Missing `localStorage.removeItem('pawkit_last_user_id')` in signOut
  - **Impact:** useUserStorage couldn't detect user switches, no cleanup triggered
  - **Fix:** Added session marker cleanup to signOut function
  - **The Critical Line:** `localStorage.removeItem('pawkit_last_user_id');`

  **How User Switch Detection Works:**
  ```typescript
  // On login, check for user switch
  const previousUserId = localStorage.getItem('pawkit_last_user_id');
  if (previousUserId && previousUserId !== currentUserId) {
    // Different user detected - cleanup previous user's data
    await cleanupPreviousUser(previousUserId);
  }
  ```

  **Architecture Improvements:**
  - User-specific IndexedDB databases: `pawkit-{userId}-default-local-storage`
  - Automatic user switch detection via localStorage marker
  - Automatic cleanup of previous user's data on switch
  - Clean signOut that closes connections and clears markers
  - Migration support for existing users from old global database

  **Testing & Verification:**
  - ✅ User A's data invisible to User B
  - ✅ User B's data invisible to User A
  - ✅ Sign Out works reliably
  - ✅ Data persists correctly per user

  **New Files Created:**
  - `lib/hooks/use-user-storage.ts` - User storage initialization hook
  - `lib/services/storage-migration.ts` - Migration from old global database

  **Files Modified:**
  - `lib/contexts/auth-context.tsx` - Fixed signOut with marker cleanup
  - `components/modals/profile-modal.tsx` - Simplified Sign Out button
  - `lib/services/local-storage.ts` - Per-user database architecture
  - `lib/services/sync-queue.ts` - User-aware sync queue
  - `app/(dashboard)/layout.tsx` - Integrated useUserStorage hook
  - `lib/hooks/settings-store.ts` - User-specific settings
  - `lib/hooks/view-settings-store.ts` - User-specific view preferences
  - Plus 10 more files with isolation improvements

  **Debugging Process:**
  - Comprehensive logging at every execution step
  - Test buttons (inline vs named handlers) to isolate issues
  - Verified database naming and isolation logic
  - Identified localStorage marker as missing piece
  - Tested with 2 real user accounts across sign in/out cycles

  **Impact:**
  - Critical security vulnerability completely resolved
  - User data fully isolated between accounts
  - Sign Out functionality restored and reliable
  - Clean user switching with automatic cleanup
  - Production-ready and deployed

  **Lessons Learned:**
  1. Dynamic imports can fail silently - keep critical code simple
  2. Session markers are CRITICAL for user switch detection
  3. Always test happy path after fixing bugs (we broke sign out while fixing isolation)
  4. localStorage cleanup is as important as database cleanup
  5. Simple solutions often better than complex ones

  **Commits:** 11 total including debug iterations and final fix
  **Time:** Full day debugging session with extensive testing

### January 2, 2025

- ✅ **Calendar View Improvements - Complete Sidebar Control System** (6+ hours total)
  Implemented comprehensive calendar sidebar control panel with month navigation, filters, and week view
  **Major Components Created:**
  - `components/control-panel/calendar-controls.tsx` - Main sidebar controls with month grid, filters, quick actions
  - `components/control-panel/day-details-panel.tsx` - Day-specific detail view that slides in
  - `components/calendar/week-view.tsx` - Week view with horizontal columns (7 days side-by-side)
  - `components/modals/add-event-modal.tsx` - Modal for adding scheduled events to specific dates
  - `lib/hooks/use-calendar-store.ts` - Calendar-specific Zustand store for state management
  **Calendar Controls Features:**
  - Month grid selector (3x4 grid Jan-Dec) replaces center panel navigation
  - Content type filters for future AI detection (Movies/Shows, Concerts, Deadlines, Product Launches, Other Events, Daily Notes)
  - Quick actions: Jump to Today, View This Week/Month toggle
  - Upcoming events preview (next 5 chronologically ordered events)
  - "View all" link when more than 5 events exist
  - Collapsible sections with persistent state
  **Day Details Panel:**
  - Shows daily note and scheduled cards for selected day
  - "Add Event" button opens modal (uses createPortal to escape sidebar stacking)
  - Close button returns to calendar controls
  - ESC key handling integrated with layout
  **Week View:**
  - Horizontal columns layout (grid-cols-7)
  - Each day is compact vertical column with scrollable events
  - Shows day name, date, daily note, and scheduled cards
  - Dynamic toggle button changes between "View This Week" and "View This Month"
  **State Management:**
  - Added CalendarViewMode type ("month" | "week")
  - Calendar store manages currentMonth, viewMode, selectedDay, contentFilters
  - Panel store updated with "calendar-controls" and "day-details" content types
  - Custom calendar sidebar only appears in calendar view
  **Bug Fixes:**
  - Fixed sidebar persistence when toggling on/off (preserves previousContentType)
  - Fixed modal rendering using createPortal to document.body with z-[200]
  - Fixed view mode switching to properly show week view (not just jump to today)
  - Changed week view from vertical full-width days to horizontal columns
  **Files Created:**
  - `components/control-panel/calendar-controls.tsx`
  - `components/control-panel/day-details-panel.tsx`
  - `components/calendar/week-view.tsx`
  - `components/modals/add-event-modal.tsx`
  - `lib/hooks/use-calendar-store.ts`
  **Files Modified:**
  - `lib/hooks/use-panel-store.ts` - Added calendar content types, updated close/toggle
  - `app/(dashboard)/calendar/page.tsx` - Uses calendar store, renders correct view
  - `app/(dashboard)/layout.tsx` - Integrated CalendarControls and DayDetailsPanel
  - `components/calendar/custom-calendar.tsx` - Accepts currentMonth prop
  **Branch:** `calendar-view-improvements`
  **Impact:** Calendar now has dedicated sidebar with full navigation, filtering, and view controls

- 🔍 **User Data Isolation Bug Investigation** (IN PROGRESS - Branch: `user-isolation-debug`)
  **CRITICAL SECURITY ISSUE**: Cards created in Account A appear in Account B after login/logout
  **Status**: Under investigation with comprehensive server-side logging

  **Problems Discovered:**
  1. **IndexedDB was globally shared** - All users on same browser shared 'pawkit-local-storage'
     - ✅ FIXED: Changed to user-specific databases 'pawkit-{userId}'
     - Each user gets separate IndexedDB database
     - Database switches when users log in/out

  2. **Recently viewed items shared** - localStorage key was global 'pawkit-recent-history'
     - ✅ FIXED: Changed to user-specific 'pawkit-recent-history-{userId}'
     - Each user sees only their own recently viewed items

  3. **Database initialization race condition** - DataStore.initialize() called before auth ready
     - ✅ FIXED: Added authLoading check before initialization
     - Dashboard waits for auth before calling initialize()
     - Data store resets when user changes

  4. **Auth cache contamination** - Next.js router cached previous user's session
     - ✅ FIXED: Added router.refresh() before router.push() on logout
     - Clears all cached route data including user session

  5. **SERVER-SIDE DATA LEAK** - Cards still appearing across accounts (UNDER INVESTIGATION)
     - URLs duplicate between accounts (cards spin without metadata)
     - Notes seem isolated, but URLs leak
     - Added comprehensive logging to trace userId through request chain

  **Debugging Added** (Branch: `user-isolation-debug`):
  - `getCurrentUser()` - Logs Supabase user ID and email
  - API `/cards` GET/POST - Logs authenticated user for each request
  - `listCards()` - CRITICAL: Detects if database returns foreign user cards
  - 🚨 Alert if `foreignCards.length > 0` - Proves data leak at database level

  **Next Steps**:
  - Deploy user-isolation-debug branch to Vercel preview
  - Test creating cards in Account A, switching to Account B
  - Check server logs for userId tracking through request chain
  - Look for "🚨 DATA LEAK DETECTED" in logs
  - Identify exact point where user isolation breaks

  **Files Modified**:
  - `lib/services/local-storage.ts` - User-specific database naming
  - `lib/contexts/auth-context.tsx` - Database switching on login/logout
  - `lib/hooks/use-recent-history.ts` - User-specific localStorage keys
  - `lib/stores/data-store.ts` - Reset function, auth wait logic
  - `app/(dashboard)/layout.tsx` - Auth-aware initialization
  - `lib/auth/get-user.ts` - Debugging logs for auth flow
  - `app/api/cards/route.ts` - Debugging logs for API requests
  - `lib/server/cards.ts` - Foreign card detection in listCards

  **Branch**: `user-isolation-debug` (4 commits)
  **Main Branch**: Clean and stable (reverted debug commits via force push)
  **Impact**: Security vulnerability affecting multi-user environments
  **Priority**: CRITICAL - Must be fixed before production use

### October 31, 2025

- ✅ **Context Menu System Implementation** (Complete reusable system)
  Created standardized context menu system for consistent UX across the app
  **Components Created:**
  - `hooks/use-context-menu.ts` - Custom hook for context menu state management
  - `components/ui/generic-context-menu.tsx` - Reusable wrapper with simple array-based API
  - Supports icons, separators, submenus, keyboard shortcuts, destructive actions
  **Initial Implementation:**
  - Added to Pawkit sidebar (CollectionsSidebar component)
  - Replaced inline management buttons with right-click menu
  **Commits:** 267f2dd, 595651a

- ✅ **Context Menu Audit** (Comprehensive documentation)
  Documented all existing context menu implementations across the app
  Created CONTEXT_MENU_AUDIT.md with:
  - Complete inventory of existing patterns (CardContextMenuWrapper, GenericContextMenu, useContextMenu hook)
  - Analysis of which views have/missing context menus
  - Identified inconsistencies and gaps
  - Recommendations for high/medium/low priority additions
  - Code examples for each pattern
  - Design guidelines for when/where to add context menus
  **Key Findings:**
  - 5 components have context menus, 6+ views missing them
  - High priority gaps: Pinned notes in sidebar, trash view items
  - Medium priority: Recently viewed items
  **Commit:** 595651a

- ✅ **Left Sidebar Context Menu Implementation** (Fixed missing menus)
  Added context menus to all Pawkit collections in left navigation panel
  **Issue:** Left sidebar had separate collection tree implementation without context menus
  **Solution:** Added GenericContextMenu to renderCollectionTree function
  **Menu Items:**
  - Open (navigate to Pawkit)
  - New sub-collection (create nested Pawkit)
  - Rename (with modal)
  - Move to (with submenu showing all available locations)
  - Delete (with confirmation)
  **Commits:** aaf15b7, 90371fc, a11ec8e

- ✅ **Context Menu Z-Index Fix** (Critical visibility issue)
  Context menus were rendering behind left sidebar (z-[102])
  **Solution:** Updated GenericContextMenu to use z-[9999] on:
  - ContextMenuContent (main menu)
  - ContextMenuSubContent (nested submenus)
  **Result:** Context menus now always appear as topmost layer above all UI elements
  **Commit:** 90371fc

- ✅ **Move Menu UX Improvement** (Replaced text prompt with visual submenu)
  Replaced terrible window.prompt() UX with visual Pawkit submenu
  **Before:** Prompt asked users to type collection slug (error-prone, no visual feedback)
  **After:** Hover over "Move to" → visual menu with all available Pawkits
  **Implementation:**
  - Created buildMoveMenuItems() helper function
  - Recursively builds submenu from collection tree
  - Filters out current collection (can't move into itself)
  - Handles nested collections with proper submenu structure
  - Includes "Root (Top Level)" option
  **Commit:** a11ec8e

- ✅ **PAWKITS Header Context Menu** (Fixed after multiple attempts)
  Added working context menu to "PAWKITS" section header in left sidebar
  **Previous Attempts Failed:** Wrapping PanelSection blocked events
  **Solution:** Inlined header structure, wrapped title button directly with GenericContextMenu
  **Menu Items:**
  - View All Pawkits (navigate to /pawkits)
  - Create New Pawkit (open create dialog)
  **Technical Learning:** GenericContextMenu with asChild works when wrapping button elements, not complex components
  **Commit:** 1db0de1

- ✅ **Rename Modal with Glassmorphism** (Replaced browser prompts)
  Replaced ugly window.prompt() with beautiful modal matching app design
  **New Modal Features:**
  - Glassmorphism styling (bg-white/5 backdrop-blur-lg)
  - Border with glow (border-white/10 shadow-glow-accent)
  - Auto-focus input field
  - Enter to confirm, Escape to cancel
  - Loading state during API call
  - Toast notification on success
  **State Management:** Added showRenameModal, renameCollectionId, renameCollectionName, renameValue, renamingCollection
  **Handler:** handleRenameCollection() validates input, calls updateCollection API, shows toast
  **Commit:** 1db0de1

- ✅ **ESC Key Handling in Rename Modal** (Fixed event bubbling)
  ESC key now closes modal instead of sidebar
  **Problem:** ESC event bubbled up to sidebar's close handler
  **Solution:** Added useEffect with document-level keydown listener
  - Uses capture phase (addEventListener 3rd param = true)
  - Intercepts ESC before it bubbles to parent components
  - Calls stopPropagation() and preventDefault()
  - Properly cleans up listener when modal closes
  **Behavior:** First ESC closes modal, second ESC closes sidebar
  **Commit:** 63df231

- ✅ **Debug Logging Cleanup** (Removed ~200+ console.log statements)
  Cleaned up excessive debug logging from delete sync fixes
  **What Was Removed:**
  - Debug noise from data-store.ts, sync-service.ts, local-storage.ts
  - CRUD operation logs
  - Masonry resize debug logs
  - Modal open/close logs
  - Navigation debug logs
  **What Was Kept:**
  - Duplicate detection warnings
  - Write guard errors
  - Bug detection logs (deleted cards appearing)
  - Sync failures
  - Auth errors
  **Also Deleted:** Entire app/debug folder (debug routes and database compare page)
  **Files Modified:** 15 files with ~200+ log statements removed

- ✅ **Inbox Button Removal** (Cleaned up home view)
  Removed useless inbox button from home view quick access area
  **What Was Removed:**
  - Inbox button component (lines 289-300 in app/(dashboard)/home/page.tsx)
  - Inbox icon import from lucide-react
  **Reason:** Dead feature, served no purpose, cluttered UI

- ✅ **Sidebar Panel Swap** (Improved information hierarchy)
  Swapped info panels between left and right sidebars for better UX
  **Changes:**
  - Keyboard shortcuts: Moved FROM right sidebar TO left sidebar (always visible)
  - Sync status: Moved FROM left sidebar TO right sidebar (occasionally open)
  **Rationale:** Keyboard shortcuts more frequently needed than sync status
  **Files Modified:**
  - components/control-panel/control-panel.tsx (replaced keyboard shortcuts with SyncStatus)
  - components/navigation/left-navigation-panel.tsx (replaced SyncStatus with keyboard shortcuts)

- ✅ **Keyboard Shortcuts Cross-Platform Format** (Better clarity for Windows users)
  Updated sidebar keyboard shortcuts to show both Mac and Windows
  **Before:** Mac-only symbols (⌘V, ⌘P)
  **After:** Cross-platform text (Cmd/Ctrl + V, Cmd/Ctrl + P)
  **Location:** Left navigation panel keyboard shortcuts footer
  **Rationale:** Matches keyboard shortcuts modal style, clearer for Windows users

### October 30, 2025

- ✅ **Delete Synchronization - Complete Fix** (5 critical bugs)
  Fixed deleted cards appearing in Library and data corruption issues
  Bug 1: Deleted cards injecting into state via .map() operations (5 locations in data-store.ts)
  Bug 2: Deduplication using soft delete instead of hard delete (line 100)
  Bug 3: addCard() using soft delete for temp cards (line 531)
  Bug 4: Sync service using soft delete for temp cards (line 661 in sync-service.ts)
  Bug 5: Deduplication removing legitimate server cards with same titles
  Root cause: Confusion between soft delete (user deletions to trash) vs hard delete (internal cleanup)
  Solution: Changed all internal cleanup to use permanentlyDeleteCard(), added checks before .map() operations, skip deduplication when both cards have real server IDs
  Impact: Deleted cards no longer appear in Library, data no longer corrupts on navigation, all 26 "missing" cards preserved
  Debug tools: Created /debug/database-compare page with Force Full Sync and Resolve Mismatches buttons
  Commits: 85ed692, 61ba60e, 699e796, b56dff1, 476d04a
  Merged to main: d2b881c

- ✅ **View Settings Sync - Complete Fix** (3 layers of bugs)
  Fixed persistent 400 errors on PATCH /api/user/view-settings
  Layer 1: Removed extra fields not in validator schema
  Layer 2: Mapped client field names to server (showLabels → showUrls, showMetadata → showTitles)
  Layer 3: Implemented bidirectional value scaling (1-100 ↔ 1-5/0-4)
  Commits: e34fd55, 4cd2ea2, 2db570a

- ✅ **Collection Create Schema Fix**
  Fixed 400 errors when creating root-level Pawkits (null parentId rejected)
  Changed schema from `z.string().optional()` to `z.string().nullable().optional()`
  Commit: 8631dba

- ✅ **Note Creation Bug - Complete Fix** (4 separate issues)
  Fixed notes defaulting to daily notes and disappearing on refresh
  Issue 1: Modal state persistence - added useEffect to reset state on open
  Issue 2: Missing useMemo import - added to React imports
  Issue 3: Missing tags parameter - updated handleCreateNote to accept/pass tags
  Issue 4: Critical database constraint bug (see below)
  Commits: d5d0c29, 49ae3ee, 9562bec, a09bc7b

- ✅ **Database Constraint Fix - Partial Unique Index** (Critical)
  Fixed notes triggering duplicate constraint errors and returning deleted cards
  Root cause: Full unique index on (userId, url) applied to ALL card types
  Solution: Replaced with partial unique index `WHERE type = 'url'`
  Server error handler now checks card type and excludes deleted cards
  Notes can now have duplicate/empty URLs, URL cards still prevent duplicates
  Migration: 20251029192328_fix_card_unique_constraint
  Commit: a09bc7b

### October 28-29, 2025

- ✅ **Multi-Select UI Integration** (Bulk Operations)
  Integrated bulk operations into right sidebar panel
  Replaced overlay drawer with smooth transitions
  Applied glass morphism styling with purple glow
  Matches 3-sidebar architecture (left nav | content | right panel)
  Commit: 6f78f08

- ✅ **API Standardization** (30 routes)
  Unified error handling, validation, and response formats
  Added structured error responses with `createErrorResponse()`
  Implemented consistent CORS headers

- ✅ **Sync Service Fixes** (12 issues)
  Fixed conflict resolution bugs
  Improved active device detection
  Enhanced data loss prevention
  Added comprehensive test suite

- ✅ **Pre-merge Test Suite** (91% pass rate)
  42 tests across 7 sections
  Visual test runner at /test/pre-merge-suite
  Covers CRUD, Den migration, private pawkits, multi-session sync

- ✅ **Den Migration**
  Migrated `inDen` field to `isPrivate` on Collection model
  Created migration script and tested on production data
  Verified Den filtering works with new model

- ✅ **Collection Reference Fixes**
  Fixed ID/slug mismatches across all views
  Ensured cards always use slugs for collection references
  Created pawkit-conventions skill to prevent future bugs

- ✅ **Multi-Session Detection Implementation**
  Event-based localStorage tracking (no polling)
  Write guards to prevent conflicts
  Cross-tab communication via storage events
  Multi-session warning banner UI

- ✅ **Heartbeat System Removal**
  Deleted /app/api/sessions/heartbeat/route.ts endpoint
  Removed DeviceSession model from Prisma schema
  Cleaned up client-side heartbeat calls
  Multi-session detection simplified to localStorage-only approach
  Eliminated 500 errors and unnecessary database overhead

- ✅ **Cursor Jumping Fix**
  Removed card.content from useEffect dependency in card-detail-modal.tsx
  Prevents cursor reset when auto-save updates card content
  Smooth note editing experience without interruptions

- ✅ **Database Duplicate Prevention**
  Added @@unique([userId, url]) constraint to Card model
  Created migration for unique index on (userId, url)
  Server catches P2002 errors and returns existing card
  Prevents race condition duplicates at database level
  Transparent handling - client code unchanged

- ✅ **Skills Structure Setup**
  Created proper .claude/skills/ directory structure
  Added pawkit-project-context, pawkit-conventions, and pawkit-roadmap skills
  Skills now tracked in git for cross-session consistency

---

## KNOWN ISSUES (Shipping with workarounds)

**Issues that remain unresolved but have documented workarounds or are acceptable to ship with**

### Chromium Flickering Bug in Library View

**Status**: Shipping with bug (Firefox/Zen users unaffected)

**Problem Description**:
Cards flicker and disappear in Library view when:
- Left sidebar is floating (not taking layout space)
- Right sidebar is anchored (attached to content panel)
- BOTH "Show Thumbnails" and "Show Labels" are enabled
- Only affects Chromium browsers (Chrome, Dia, Edge)
- Works perfectly in Firefox and Zen Browser

**Root Cause**:
Fundamental Chromium rendering bug with CSS columns (masonry layout) during parent container transitions:
- ContentPanel resizes from 1342px → 1359px when right panel anchors
- Triggers 8+ resize events during 300ms transition
- Each resize recalculates CSS columns layout
- Backdrop-blur pills on cards trigger expensive repaint on each recalculation
- Chromium's CSS columns implementation can't handle parent transitions smoothly

**Trigger Conditions**:
1. Left panel: Floating mode
2. Right panel: Anchored mode (embedded inside content panel)
3. View settings: Show Thumbnails = ON
4. View settings: Show Labels = ON
5. Browser: Any Chromium-based (Chrome, Dia, Edge, Brave)

**All Attempted Fixes** (None successful):

1. ❌ **CSS Padding Hacks** (Commits: 6f78f08 → reverted)
   - Tried `pr-[341px]` and `pr-[325px]` to prevent card overlap
   - Result: Made visual unity worse, cards still disappeared
   - Reverted to original ContentPanel positioning

2. ❌ **ResizeObserver Optimization** (Commit: 379bcd9)
   - Fixed infinite loop (removed forced reflow)
   - Added debug logging to track resize events
   - Result: Reduced resize count but flickering remained

3. ❌ **ResizeObserver Debouncing** (Commit: 35a7f02)
   - Added 350ms debounce (matching transition duration)
   - Only processes final resize after ContentPanel settles
   - Result: Helped slightly but core issue persists

4. ❌ **ContentPanel Hardware Acceleration** (Commit: e46a48d)
   - Added `willChange: "left, right"` and `transform: translateZ(0)`
   - Forces GPU acceleration for panel transitions
   - Result: No improvement in card rendering

5. ❌ **Backdrop-blur Pills Optimization** (Commit: dd6e0d9)
   - Added hardware acceleration to URL pills and title pills
   - `willChange: 'width'` and `transform: translateZ(0)`
   - Result: Pills render better but cards still flicker

6. ❌ **Card Container GPU Acceleration** (Commit: 202b040)
   - Added hardware acceleration to individual card containers
   - Attempted to isolate card rendering from parent transitions
   - Result: No visible improvement

7. ❌ **Masonry Container Optimization** (Commit: 3541ab3)
   - Added `willChange: 'columns'` and `transform: translateZ(0)` to masonry grid
   - Attempted to hint GPU to optimize columns recalculation
   - Result: Flickering persists

8. ❌ **Disable ContentPanel Transitions** (Commit: 15449f5)
   - Disabled smooth transitions entirely in embedded mode: `transition: "none"`
   - Removed animation to eliminate intermediate resize states
   - Result: No improvement (issue is CSS columns, not transitions)

**Workarounds**:
- Use Firefox or Zen Browser (works perfectly)
- Disable "Show Thumbnails" OR "Show Labels" in settings
- Keep right panel in floating mode instead of anchored
- Keep left panel in anchored mode

**Potential Future Solutions**:
1. Switch from CSS columns to JavaScript masonry library (Masonry.js, react-masonry-css)
2. Wait for Chromium to fix CSS columns rendering bug
3. Detect Chromium and use different layout algorithm
4. Investigate reverting multi-select integration (known working state: commit 8eb379e)
5. Implement virtual scrolling to reduce cards rendered during transition

**Related Commits**:
- fae06ff - Reverted to original ContentPanel (removed padding hacks)
- 379bcd9 - Fixed ResizeObserver infinite loop
- 35a7f02 - Debounced ResizeObserver (350ms)
- e46a48d - Hardware acceleration on ContentPanel
- dd6e0d9 - Hardware acceleration on backdrop-blur pills
- 202b040 - GPU acceleration on card containers
- 3541ab3 - Hardware acceleration on masonry container
- 15449f5 - Disabled ContentPanel transitions in embedded mode

**User Impact**: Low (minority of users, Firefox/Zen unaffected, workarounds available)

**Priority**: P3 (post-launch optimization)

**See Also**: `.claude/skills/pawkit-troubleshooting/SKILL.md` Issue #9 for debugging process

---

## BACKLOG - CRITICAL SYNC FIXES (Priority 0)

**Status**: DOCUMENTED - January 4, 2025 comprehensive analysis complete
**Context**: Deep-dive analysis revealed 8 critical categories of sync issues causing card duplication, cross-device failures, and data corruption
**Root Cause**: IndexDB V2 migration introduced race conditions, missing transaction boundaries, and flawed multi-tab coordination
**Impact**: Users experiencing duplicate cards, collections not syncing, cross-device data inconsistencies
**Decision**: Document now, fix later when prioritized

### Critical Issues Identified

#### Race Conditions (CRITICAL - 5 issues)

**Issue 1.1: Multi-Tab Sync Collision** (8-12 hours) - [impl: ] [test: ] [done: ]
- **Location**: `lib/services/sync-service.ts:79-113`
- **Problem**: BroadcastChannel coordination allows simultaneous sync from multiple tabs
- **Impact**: Both tabs pull from server, merge different versions, create duplicate cards
- **Root Cause**: `otherTabSyncing` flag has race window - Tab B starts sync before Tab A's broadcast processed
- **Why**: Write guard system in data-store.ts:18-33 bypassed by sync operations (line 16 comment admits this)
- **User Impact**: Card duplication, corrupted collections when multiple tabs open
- **Fix**: Implement distributed lock using localStorage with timestamps and exponential backoff

**Issue 1.2: Temp ID → Server ID Race Condition** (6-8 hours) - [impl: ] [test: ] [done: ]
- **Location**: `lib/stores/data-store.ts:394-519`
- **Problem**: 4-step process has 3 race windows where temp cards can leak into sync
- **Critical Sequence**:
  1. Save with temp ID to IndexDB
  2. Update UI immediately (temp card visible)
  3. Sync to server (network delay)
  4. Replace temp with real ID (delete + save)
- **Race Windows**:
  - Window 1: Between step 2-4, other tab syncs and sees temp card
  - Window 2: Between delete and save in step 4, temp card in limbo
  - Window 3: If step 3 fails, temp card persists AND is in sync queue
- **User Impact**: "Ghost" duplicate cards that persist, temp IDs visible in UI
- **Fix**: Use client-generated UUIDs instead of temp_ prefix, eliminate ID replacement pattern

**Issue 1.3: Deduplication False Positives** (4-6 hours) - [impl: ] [test: ] [done: ]
- **Location**: `lib/stores/data-store.ts:39-120`
- **Problem**: Three separate deduplication flaws
  - **Flaw 1**: Deleted card resurrection (lines 472-481) - cards duplicated before deletion detected
  - **Flaw 2**: Runs on every sync (lines 248-249) - reactive bandaid for proactive issue
  - **Flaw 3**: URL/Title collision (line 46) - legitimate cards treated as duplicates
- **User Impact**: Two cards with same title incorrectly merged, deleted cards reappear briefly
- **Fix**: Remove client-side deduplication entirely, enforce uniqueness at database level with proper constraints

**Issue 1.4: Metadata Quality Score Data Loss** (3-4 hours) - [impl: ] [test: ] [done: ]
- **Location**: `lib/services/sync-service.ts:306-434`
- **Problem**: Background metadata fetches score higher than user edits, overwrite local changes
- **Scenario**:
  1. User edits card on Device A (adds notes, tags, moves to collection)
  2. Device B fetches rich metadata from server (high quality score)
  3. Sync runs on Device A
  4. User's local changes overwritten because server metadata scored higher
- **Current Mitigation**: 1-hour window check (lines 425-434) insufficient
- **User Impact**: User loses their manual edits when automatic metadata fetching runs
- **Fix**: Separate user-edited fields from auto-fetched metadata, never overwrite user edits

**Issue 1.5: Database Initialization Race** (2-3 hours) - [impl: ] [test: ] [done: ]
- **Location**: `lib/stores/data-store.ts:230-286`
- **Problem**: Two components can call initialize() simultaneously
- **Race**: Both check `isInitialized`, both see `false`, both start loading
- **Evidence**: Line 275 comment "removed aggressive auto-sync to prevent race conditions" - treating symptoms
- **User Impact**: Double initialization, possible data duplication on app load
- **Fix**: Use proper initialization guard (atomic compare-and-swap pattern)

#### Database-Level Issues (HIGH - 2 issues)

**Issue 2.1: Incomplete Unique Index** (2-3 hours) - [impl: ] [test: ] [done: ]
- **Location**: `prisma/schema.prisma:61-63`
- **Problem**: Partial unique constraint not in schema, only in migration
- **Issues**:
  - Constraint not declared in schema (only migration comment)
  - Only covers `type = 'url'`, allows duplicate URLs if type differs
  - No constraint on `(userId, title)` for notes
  - createCard catches P2002 reactively instead of preventing
- **Evidence**: Commit `a9c6f0e` added "database-level duplicate prevention" but only for URL cards
- **User Impact**: Duplicate notes possible, URL cards with different types can duplicate
- **Fix**: Add comprehensive unique constraints to schema for all card types

**Issue 2.2: No Optimistic Locking** (4-6 hours) - [impl: ] [test: ] [done: ]
- **Location**: `app/api/cards/[id]/route.ts:70-91`
- **Problem**: If-Unmodified-Since header check has gaps
- **Issues**:
  - Only for PATCH operations
  - **Skipped for metadata updates** (line 73) - metadata updates bypass conflict detection
  - Two devices can update same card's metadata simultaneously
- **User Impact**: Metadata updates from different devices silently overwrite each other
- **Fix**: Add `version` field to all entities, increment on every change, reject updates if version doesn't match

#### Sync Flow Architecture (CRITICAL - 3 issues)

**Issue 3.1: Missing Transaction Boundaries** (8-10 hours) - [impl: ] [test: ] [done: ]
- **Location**: `lib/services/sync-service.ts:198-302` (pullFromServer)
- **Problem**: Pull operation is not atomic
- **Critical Flaw**:
  ```typescript
  // Pull cards
  const serverCards = await fetchWithTimeout('/api/cards');
  await mergeCards(serverCards, localCards); // Can fail mid-merge

  // Pull collections
  const serverCollections = await fetchWithTimeout('/api/pawkits');
  await mergeCollections(serverCollections, localCollections); // Can fail mid-merge
  ```
- **Issue**: If mergeCards succeeds but mergeCollections fails, data inconsistent
- **Rollback Flaw**: Lines 210-299 create snapshot but restoring uses Promise.all (line 188) - can partially fail
- **No IndexDB Transaction**: Line 174 comment admits this
- **User Impact**: Partial syncs leave database in corrupted state
- **Fix**: Wrap all sync operations in IndexDB transactions with proper rollback

**Issue 3.2: Collection Tree Flattening Loses Parents** (6-8 hours) - [impl: ] [test: ] [done: ]
- **Location**: `lib/services/sync-service.ts:479-497` and `lib/services/local-storage.ts:416-443`
- **Problem**: Tree flattening and rebuilding loses parent relationships
- **Process**:
  ```typescript
  // Sync service flattens tree
  const flatServerCollections = this.flattenCollections(serverCollections);

  // Local storage rebuilds tree from parentId
  private buildCollectionTree(flatCollections) {
    // Rebuilds based on parentId relationships
  }
  ```
- **Race Condition**:
  1. Device A deletes parent collection P
  2. Device B moves child collection C under P
  3. Sync runs, Server has: P (deleted), C (parentId = P)
  4. Local rebuilds tree, C becomes orphaned at root
- **User Impact**: Collections randomly appear at wrong hierarchy level
- **Fix**: Sync collections as operations (move/delete/rename) not as state snapshots

**Issue 3.3: No Cache Invalidation Strategy** (4-6 hours) - [impl: ] [test: ] [done: ]
- **Location**: Throughout `lib/stores/data-store.ts`
- **Problem**: Zustand state updated manually after every operation with no rollback
- **Example** (lines 437-439):
  ```typescript
  set((state) => ({
    cards: [newCard, ...state.cards],
  }));
  ```
- **Issues**:
  - If operation fails after state update, UI shows inconsistent data
  - No rollback mechanism for Zustand state
  - Refresh (lines 351-389) re-reads from IndexDB but stale state visible during window
- **User Impact**: UI temporarily shows incorrect state when operations fail
- **Fix**: Implement proper cache invalidation with optimistic UI rollback

#### Concurrency Issues (MEDIUM - 2 issues)

**Issue 4.1: Sync Queue Not Idempotent** (3-4 hours) - [impl: ] [test: ] [done: ]
- **Location**: `lib/services/sync-queue.ts:146-190` (enqueue method)
- **Problem**: Duplicate detection only checks `pending` or `processing` status
- **Flaw**:
  ```typescript
  const duplicate = existing.find(op => {
    if (op.type !== operation.type) return false;
    if (op.targetId === operation.targetId &&
        (op.status === 'pending' || op.status === 'processing')) {
      return true; // Only checks these statuses
    }
    return false;
  });
  ```
- **Issue**: If operation fails and becomes `failed`, enqueueing same operation creates duplicate in queue
- **Evidence**: Lines 696-701 in data-store.ts enqueue DELETE, lines 702-718 immediately execute it - if network fails, queued twice
- **User Impact**: Same operation synced multiple times, potential duplicate data
- **Fix**: Check all statuses including `failed`, deduplicate by resource ID regardless of status

**Issue 4.2: useUserStorage Hook Order Race** (2-3 hours) - [impl: ] [test: ] [done: ]
- **Location**: `lib/hooks/use-user-storage.ts:26-143` and `app/(dashboard)/layout.tsx`
- **Problem**: Components can mount before useUserStorage completes
- **Flow**:
  ```typescript
  useEffect(() => {
    async function initializeUserStorage() {
      await localDb.init(userId, workspaceId);
      await syncQueue.init(userId, workspaceId);

      // Then import stores (lines 93-111)
      const { useSettingsStore } = await import('@/lib/hooks/settings-store');
    }
  }, [workspaceId]);
  ```
- **Race**: Components using useDataStore can mount before IndexDB initialized for correct user
- **User Impact**: Operations attempt to read/write before database ready for user context
- **Fix**: Add initialization guard at top of all hooks that access IndexDB

### Root Cause Analysis

**Primary Cause: IndexDB V2 Migration**
- Introduced multi-user database architecture
- Changed from single global database to per-user databases
- Added workspace concept (default vs custom workspaces)
- Migration happened October 2025 (commits: 35ade04, 4c5f810, f3114aa)

**What Changed**:
- Database naming: `pawkit-local-storage` → `pawkit-{userId}-{workspaceId}-local-storage`
- Init pattern: Single init → Dynamic init with user context
- Sync queue: Global → Per-user-per-workspace
- Multi-session detection: Added active session tracking

**What Broke**:
1. **BroadcastChannel coordination** - worked for single DB, fails with multiple user contexts
2. **Temp ID pattern** - worked when only one user, races with multi-user sync
3. **Transaction boundaries** - worked with simple operations, fails with complex multi-user flows
4. **Deduplication logic** - worked reactively for single user, insufficient for multi-user/multi-device

**Git Evidence**:
- Commit `61ba60e`: Fixed deduplication soft-deleting cards (reactive fix)
- Commit `476d04a`: Skip deduplication for server cards (bandaid for temp ID issue)
- Commit `c60c41b`: Fixed local deletions overwritten (collection timing issue)
- Commit `e8be3fa`: Prevent duplicate operations (sync queue idempotency)

### Recommended Fix Priority

**Top 3 Fixes (80% of Issues)**:

1. **Eliminate Temp ID Pattern** (6-8 hours) - CRITICAL
   - Use client-generated UUIDs
   - Remove ID replacement logic entirely
   - Add conflict resolution on server for UUID collisions
   - **Impact**: Eliminates primary duplicate card issue

2. **Add Distributed Lock for Multi-Tab Sync** (4-6 hours) - CRITICAL
   - Use localStorage with timestamps for tab-level mutex
   - Add exponential backoff for lock acquisition
   - Prevent concurrent sync operations
   - **Impact**: Eliminates multi-tab sync collision

3. **Wrap Operations in IndexDB Transactions** (8-10 hours) - CRITICAL
   - Add transaction boundaries to all multi-step operations
   - Implement rollback-safe snapshots
   - Use atomic operations where possible
   - **Impact**: Ensures data consistency, prevents corruption

**Total Time for Top 3**: 18-24 hours
**Expected Impact**: Resolve 80% of user-visible sync issues

### Prevention Guidelines

**When Making Future Sync Changes**:
1. ✅ Always wrap multi-step operations in transactions
2. ✅ Never use temporary IDs that can leak into sync
3. ✅ Implement distributed locks for cross-tab operations
4. ✅ Use vector clocks or operation sequence numbers for causality
5. ✅ Add optimistic locking (version fields) to all entities
6. ✅ Test with multiple tabs and multiple devices
7. ✅ Monitor for duplicate creation in production
8. ✅ Use preventive constraints (database) not reactive deduplication (client)

**Reference**: See `.claude/skills/pawkit-sync-patterns/SKILL.md` section "KNOWN ARCHITECTURAL FLAWS" for detailed analysis

---

## BACKLOG - CRITICAL (Pre-Merge)

**Must complete before merging to main**

### UI Polish Tasks (Phase 0)

- [ ] Remove Inbox from Home View (20 min) - [impl: ] [test: ] [done: ]
  Why: Dead feature, clutters UI, serves no purpose
  Impact: Cleaner home page, removes '0 unread items' section
  Command: `claude-code "Remove the 'Inbox' section from the Home view (app/(dashboard)/home/page.tsx). The Inbox section with '0 unread items' serves no purpose and should be removed. Clean up any related state, queries, or components that were specific to Inbox functionality."`

- [ ] Re-enable Settings Menu (45 min) - [impl: ] [test: ] [done: ]
  Why: Users need access to app settings
  Impact: Restore settings functionality disabled during UI overhaul
  Command: `claude-code "Re-enable the settings menu that was disabled during UI overhaul. Find the disabled settings component and restore its functionality. Ensure it opens properly and all settings are accessible."`

- [✓] Unify Tags Styling (25 min) - [implemented: ✓] [tested: ✓] [complete: ✓]
  Why: Consistency improves UX, reduces confusion
  Impact: Consistent tag display across Library and Pawkits views
  Fixed: Library tags now use glass pill buttons matching Pawkits view
  Commit: 58132cd - Updated Library tags to glass pill buttons with purple glow

- [ ] Fix Right Sidebar (45 min) - [impl: ] [test: ] [done: ]
  Why: Navigation consistency across all views
  Impact: Sidebar consistently appears in all main views
  Command: `claude-code "Fix the right sidebar not appearing/working in some views. Identify which views have broken sidebar functionality and restore it. The sidebar should consistently appear across all main views (Library, Pawkits, Notes, etc.)."`

### ~~Pawkit UX - Quick Wins~~ (SUPERSEDED - See Discoverability Improvements above)

**Status**: These tasks have been superseded by the Discoverability Improvements approach. User testing revealed features already exist and work well - the issue is discovery, not implementation. The interactive onboarding checklist addresses all of these needs more effectively.

**Superseded by**: Interactive onboarding checklist + Enhanced visual affordances + Empty state guidance

- [SUPERSEDED] ~~'Add to Pawkit' in context menu~~ - Feature already exists and works perfectly (card-context-menu.tsx line 137), users just don't discover it. Onboarding checklist Step 2 demonstrates this feature instead.

- [SUPERSEDED] ~~Onboarding tooltips for Pawkits~~ - Replaced by comprehensive interactive onboarding checklist which provides better guided experience across all features.

- [SUPERSEDED] ~~Visual drag-and-drop feedback~~ - Covered by "Enhanced visual affordances" task which includes drop zone highlighting and tooltips.

- [KEPT] Inline Pawkit rename (30 min) - Moved to Discoverability Improvements section with edit icon affordance added.

### ~~Pawkit UX - Enhanced Features~~ (MOVED - See Phase 3 Bulk Operations)

**Status**: These power-user features remain important but are not urgent for initial discoverability. Moved to Phase 3 where they integrate with broader bulk operations UI.

- [MOVED] Keyboard shortcut for Add to Pawkit - See Phase 3: Priority 1: Keyboard Shortcuts
- [MOVED] Multi-select bulk add to Pawkit - See Phase 3: Priority 2: Bulk Operations
- [MOVED] Quick-add from card detail view - See Phase 3: Priority 2: Bulk Operations

### Optional Pre-Launch

- [ ] Manual multi-session test (15 min) - [impl: N/A] [test: ] [done: ]
  Open 2 browser tabs, verify conflict detection works
  Why: Validate core multi-session detection functionality

- [ ] Final UI consistency pass (30 min) - [impl: N/A] [test: ] [done: ]
  Check all views for styling inconsistencies
  Why: Polish before launch

---

## BACKLOG - CRITICAL (Post-Merge)

**Do immediately after merging to main**

### Week 1: Deployment & Monitoring

- [ ] Deploy to production (30 min) - [impl: N/A] [test: ] [done: ]
  Why: Launch the updated app
  Impact: Users get new features and fixes
  Steps:
    1. Deploy to production
    2. Run migration: `npm run prisma:migrate:deploy`
    3. Verify app loads correctly
    4. Check all critical routes work
    5. Monitor error logs for first 24 hours
  Success Criteria:
    - ✅ Zero 500 errors
    - ✅ Users can log in
    - ✅ Cards sync properly
    - ✅ No data loss reports

- [ ] Monitor error rates (passive, Days 2-3) - [impl: N/A] [test: ] [done: ]
  Why: Catch issues early in production
  Impact: Prevent user frustration
  Metrics to Track:
    - Error rate by endpoint (target: <1% 500 errors)
    - Sync performance (target: <5 seconds)
    - IndexedDB performance
    - User session conflicts
    - Browser compatibility issues
    - Watch for duplicate detection issues
    - Review user feedback/complaints
    - Check Den migration worked

- [ ] Fix immediate bugs (Days 4-7, effort varies) - [impl: ] [test: ] [done: ]
  Why: Address critical user-reported issues
  Impact: User satisfaction and stability
  Actions:
    - Fix any critical bugs discovered
    - Address user-reported issues
    - Optimize any performance bottlenecks
    - Clean up excessive logging if needed

### Week 2: Cleanup & Verification

- [ ] Verify Den migration (24-48 hours post-deploy) - [impl: N/A] [test: ] [done: ]
  Why: Ensure migration didn't break existing functionality
  Impact: Validate users can access old Den items
  See: `⚠️_POST_DEPLOY_REMINDER.md` for detailed steps
  Actions:
    - Verify users can see old Den items in "The Den" pawkit
    - No complaints about missing data
    - No migration errors in logs
    - Confirm `is:den` search operator works
    - Private pawkits remain isolated
    - Run Den cleanup command (remove old code)

- [ ] Remove test pages (15 min) - [impl: ] [test: ] [done: ]
  Why: Clean up dev-only pages from production
  Impact: Cleaner codebase
  Command:
    ```bash
    # Remove test pages
    rm -rf app/(dashboard)/test/pre-merge-suite
    rm -rf app/(dashboard)/test/sync-tests
    rm -rf app/(dashboard)/test-local-storage

    # Or move to /dev folder
    mkdir -p app/(dashboard)/dev
    mv app/(dashboard)/test app/(dashboard)/dev/
    ```

- [ ] Clean up excessive logging (30 min) - [impl: ] [test: ] [done: ]
  Why: Reduce console spam in production
  Impact: Better debugging experience
  Actions:
    - Remove excessive console.log statements
    - Clean up duplicate detection logs
    - Keep error logs and warnings

- [ ] Update documentation (1 hour) - [impl: ] [test: ] [done: ]
  Why: Keep documentation in sync with codebase
  Impact: Easier onboarding and maintenance
  Actions:
    - Update README with current architecture decisions
    - Document the removal of heartbeat system and rationale
    - Add guidance on database-level duplicate prevention

- [ ] Run production migration for unique constraint (30 min) - [impl: ] [test: ] [done: ]
  Why: Must be done carefully on production data
  Impact: Prevent duplicate cards at database level
  Actions:
    - Backup production database
    - Apply userId_url unique constraint migration
    - Monitor for migration errors or constraint violations

### Success Metrics for Week 1-2

**Data Integrity:**
- Zero data loss reports
- Den migration: 100% success rate
- Sync conflicts: <1% of operations

**Performance:**
- Average sync time: <5 seconds
- Error rate: <1% 500 errors
- Uptime: >99.5%

**User Satisfaction:**
- No critical bugs reported
- Positive feedback on multi-session handling
- No major usability complaints

---

## BACKLOG - HIGH PRIORITY (Month 1-2)

**Phase 2: Performance Optimization (Weeks 3-6)**

**Context**: Comprehensive performance analysis completed Nov 1, 2025. App will degrade at 500+ cards, become unusable at 1,000+ cards without these optimizations. Total potential impact: -2.25MB bundle, -90% DOM nodes, -60% re-renders.

### Quick Wins - IMMEDIATE (Week 1: ~6 hours total, massive impact)

**Recommended: Start here for maximum ROI**

- [ ] Remove unused date libraries (15 min) - **CRITICAL** - [impl: ] [test: ] [done: ]
  Why: 10MB of unused dependencies (moment 5.2MB, luxon 4.5MB) - only using date-fns
  Impact: -500KB bundle reduction, cleaner dependencies
  Risk: Low (already using date-fns exclusively)
  Command: `npm uninstall moment moment-timezone luxon && npm prune && npm run build`

- [ ] Add by-deleted IndexedDB index (30 min) - **CRITICAL** - [impl: ] [test: ] [done: ]
  Why: Currently loading ALL cards including trash items on app init
  Impact: -30% memory usage, faster app startup
  Risk: Medium (requires IndexedDB migration to version 5)
  Files: `lib/services/local-storage.ts` (add index, bump DB_VERSION to 5)
  Command: `claude-code "Add by-deleted index to IndexedDB: 1) Update LocalStorageDB interface to add 'by-deleted': boolean index, 2) Add migration in upgrade() for version 5: cardStore.createIndex('by-deleted', 'deleted'), 3) Bump DB_VERSION to 5, 4) Create getAllActiveCards() method using index instead of filtering all cards, 5) Test migration with existing data"`

- [ ] Lazy load MD Editor (1 hour) - **HIGH** - [impl: ] [test: ] [done: ]
  Why: @uiw/react-md-editor is 4.2MB, loaded even when not editing
  Impact: -400KB bundle, faster initial load
  Risk: Low (straightforward dynamic import)
  Files: `components/notes/md-editor.tsx`
  Command: `claude-code "Lazy load MD Editor: 1) Replace direct import with dynamic import using Next.js dynamic(), 2) Add loading skeleton (glass card with pulse animation), 3) Set ssr: false, 4) Test that editor loads correctly when needed, 5) Verify bundle size reduction in build output"`

- [ ] Virtualize List View (4 hours) - **HIGH** - [impl: ] [test: ] [done: ]
  Why: Rendering ALL cards in DOM (500 cards = 50,000 DOM nodes)
  Impact: -90% DOM nodes (500 cards → 50 rendered), smooth 60fps scrolling
  Risk: Medium (requires react-window or @tanstack/react-virtual)
  Files: `components/library/card-gallery.tsx` (list view table section)
  Command: `claude-code "Install @tanstack/react-virtual and virtualize List View: 1) npm install @tanstack/react-virtual, 2) In card-gallery.tsx, wrap list view table with useVirtualizer, 3) Render only visible rows (estimateSize: 60px), 4) Add 5 row overscan for smooth scrolling, 5) Test with 500+ cards, 6) Verify scroll position maintained on updates"`

**Total Quick Wins Impact:**
- Bundle: -1.3MB (-33%)
- Memory: -30%
- DOM nodes: -90% (for list view)
- Time investment: 6 hours
- Performance at scale: 500 cards → 2,000+ cards supported

### Medium Priority - Grid/Masonry Virtualization (Week 2-3: ~16 hours)

- [ ] Virtualize Grid View (8 hours) - **MEDIUM** - [impl: ] [test: ] [done: ]
  Why: Grid layout also renders all cards, same performance issues as list
  Impact: -90% DOM nodes for grid view
  Risk: Medium (responsive columns make this complex)
  Files: `components/library/card-gallery.tsx` (grid view section)
  Command: `claude-code "Virtualize Grid View: 1) Calculate responsive columns based on viewport width and cardSize setting, 2) Use @tanstack/react-virtual to virtualize rows, 3) Each virtual row contains multiple cards (columns), 4) estimateSize: 300px per row, 5) Handle window resize to recalculate columns, 6) Test with various card sizes and viewport widths, 7) Verify smooth scrolling at 500+ cards"`

- [ ] Add remaining IndexedDB indexes (1 hour) - **MEDIUM** - [impl: ] [test: ] [done: ]
  Why: by-type, by-tag, by-url indexes speed up common queries
  Impact: 95% faster filtered queries (500ms → 25ms on 1,000 cards)
  Risk: Low (non-breaking index additions)
  Files: `lib/services/local-storage.ts`
  Command: `claude-code "Add remaining IndexedDB indexes in version 5 migration: 1) by-type index for notes filtering, 2) by-tag index (multiEntry) for tag filtering, 3) by-url index for duplicate detection, 4) Create helper methods: getAllNotes(), getCardsByTag(), getCardByUrl(), 5) Update data-store.ts to use indexed queries where applicable, 6) Test query performance improvement"`

- [ ] Fix inline functions in CardGallery (3 hours) - **MEDIUM** - [impl: ] [test: ] [done: ]
  Why: 40+ inline functions created on EVERY render bypass React.memo optimization
  Impact: -60% re-renders at scale, smoother interactions
  Risk: Medium (requires careful useCallback refactoring)
  Files: `components/library/card-gallery.tsx` (lines 318-447)
  Command: `claude-code "Fix inline functions in CardGallery: 1) Extract all inline handlers to useCallback at component top, 2) Pass stable callbacks to CardCell instead of inline functions, 3) Consider callback factory pattern: handleCardAction(cardId, action, data), 4) Verify CardCell memo is working (add React DevTools Profiler check), 5) Test that all card interactions still work correctly"`

- [ ] Lazy load Calendar component (2 hours) - **MEDIUM** - [impl: ] [test: ] [done: ]
  Why: react-big-calendar pulls in moment/dayjs (heavy), only used in Calendar view
  Impact: -600KB bundle
  Risk: Low
  Files: `components/calendar/custom-calendar.tsx`, `app/(dashboard)/calendar/page.tsx`
  Command: `claude-code "Lazy load Calendar: 1) Wrap CustomCalendar with Next.js dynamic(), 2) Add loading skeleton matching calendar layout, 3) Set ssr: false, 4) Consider replacing react-big-calendar with lighter alternative in future, 5) Verify calendar loads correctly when navigating to /calendar"`

- [ ] Optimize Zustand selectors (2 hours) - **MEDIUM** - [impl: ] [test: ] [done: ]
  Why: 10+ individual store subscriptions in library-view.tsx cause frequent re-renders
  Impact: -40% re-renders from store updates
  Risk: Low
  Files: `components/library/library-view.tsx`, `components/notes/notes-view.tsx`
  Command: `claude-code "Optimize Zustand selectors: 1) Import shallow from 'zustand/shallow', 2) Group related selectors into single subscription with shallow comparison, 3) Review all useDataStore, useSelection, usePanelStore calls, 4) Example: combine 5 individual subscriptions into one object selector, 5) Use React DevTools Profiler to verify re-render reduction"`

**Total Medium Priority Impact:**
- DOM nodes: -90% for grid view (completes virtualization)
- Re-renders: -50% overall
- Bundle: -600KB additional
- Query speed: -95% for indexed queries
- Time investment: 16 hours

### Priority 1: IndexedDB Performance (COVERED ABOVE - DO NOT DUPLICATE)

**NOTE**: IndexedDB optimization tasks moved to Quick Wins and Medium Priority sections above for better organization.

- [MOVED TO QUICK WINS] Add by-deleted index (30 min)
- [MOVED TO MEDIUM PRIORITY] Add by-type, by-tag, by-url indexes (1 hour)
- [MOVED TO MEDIUM PRIORITY] Optimize queries to use indexes

### Priority 2: Rendering Performance (COVERED ABOVE - DO NOT DUPLICATE)

**NOTE**: Virtualization and re-render optimization tasks moved to Quick Wins and Medium Priority sections above.

- [MOVED TO QUICK WINS] Virtualize List View (4 hours)
- [MOVED TO MEDIUM PRIORITY] Virtualize Grid View (8 hours)
- [MOVED TO MEDIUM PRIORITY] Fix inline functions (3 hours)
- [MOVED TO MEDIUM PRIORITY] Optimize Zustand selectors (2 hours)

### Priority 2: Rendering Performance

- [ ] Implement virtual scrolling (4-6 hours) - [impl: ] [test: ] [done: ]
  Why: Smooth scrolling with 1000+ cards
  Impact: Gallery stays smooth with any number of cards
  Risk: Medium (UI changes)
  Command: `claude-code "Implement virtual scrolling for card grid using react-window or react-virtualized: 1) Update CardGrid component, 2) Only render visible cards + buffer, 3) Maintain scroll position on updates, 4) Test with 500+ cards"`

- [ ] Add image lazy loading (2-3 hours) - [impl: ] [test: ] [done: ]
  Why: 60% faster initial page load
  Impact: Dramatically faster first load
  Risk: Low
  Command: `claude-code "Implement lazy loading for card thumbnails: 1) Use Intersection Observer API, 2) Load images only when near viewport, 3) Add loading placeholder/skeleton, 4) Implement image caching strategy, 5) Add blur-up effect for better UX"`

- [ ] Optimize Card component rendering (2-3 hours) - [impl: ] [test: ] [done: ]
  Why: 30% fewer re-renders
  Impact: Smoother interactions and updates
  Risk: Low
  Command: `claude-code "Optimize Card component rendering: 1) Memoize expensive computations, 2) Use React.memo for Card component, 3) Optimize re-render logic in CardGrid, 4) Profile component render times, 5) Reduce prop drilling"`

### Priority 3: Search Performance

- [ ] Implement search indexing (4-5 hours) - [impl: ] [test: ] [done: ]
  Why: <100ms search on 1000+ cards
  Impact: Near-instant search results
  Risk: Medium
  Command: `claude-code "Implement client-side search index using FlexSearch or Lunr.js: 1) Build search index in background, 2) Update index on card changes, 3) Use indexed search for queries, 4) Add search result caching, 5) Benchmark performance improvement"`

- [ ] Add search debouncing (1-2 hours) - [impl: ] [test: ] [done: ]
  Why: Fewer unnecessary searches
  Impact: Better performance while typing
  Risk: Low
  Command: `claude-code "Add debouncing to search input: 1) Debounce search queries by 300ms, 2) Show loading state during search, 3) Cancel previous searches, 4) Add search result count, 5) Optimize search operators"`

### Priority 4: Link Extraction Optimization

- [ ] Debounce link extraction (30-60 min) - [impl: ] [test: ] [done: ]
  Why: Less console spam, better performance during editing
  Impact: Cleaner logs and better editor performance
  Risk: Low
  Command: `claude-code "Add debouncing to extractAndSaveLinks function in lib/stores/data-store.ts: 1) Use 500ms debounce on content changes, 2) Reduce logging verbosity, 3) Only extract when content actually changes, 4) Cancel pending extractions on unmount"`

### Priority 5: UI Consistency (Post-Launch)

**Note**: These are gradual improvements, NOT blocking launch. Implement as time allows after deployment is stable.

- [ ] Update Dig Up modal (1 hour) - [impl: ] [test: ] [done: ]
  Why: User hates dog emoji, clunky layout
  Impact: Better visual consistency
  Command: `claude-code "Update Dig Up modal to match Selective Glow design system: 1) Remove 🐕 emoji, replace with Sparkles icon from lucide-react, 2) Convert to GlassModal pattern with glass top bar and bottom bar, 3) Use glass pill buttons instead of plain buttons, 4) Use rounded-3xl for content area. See .claude/skills/pawkit-ui-ux/SKILL.md for complete GlassModal pattern."`

- [ ] Convert glass pill buttons to match skill (2 hours) - [impl: ] [test: ] [done: ]
  Why: Add purple glow on hover, glass popovers
  Impact: Signature interaction throughout app
  Command: `claude-code "Update all glass pill buttons to match design system: 1) Ensure all use backdrop-blur-md and bg-white/5 base, 2) Add purple glow on hover (border-purple-500/50 and shadow-[0_0_20px_rgba(168,85,247,0.4)]), 3) Selected state has constant glow (bg-purple-500/20), 4) Replace any flat purple tooltips with glass popovers. See .claude/skills/pawkit-ui-ux/SKILL.md for GlassPillButton and GlassPopover patterns."`

- [ ] Update sidebar filter buttons (1 hour) - [impl: ] [test: ] [done: ]
  Why: Selected state needs constant glow
  Impact: Clearer visual hierarchy
  Command: `claude-code "Update right sidebar filter buttons ('All', 'Bookmarks Only', etc) to match design system: 1) Ensure selected state has constant purple glow (bg-purple-500/20 border-purple-500/50 shadow-[0_0_15px_rgba(168,85,247,0.3)]), 2) Hover state shows purple glow temporarily, 3) Inactive state is glass only. See .claude/skills/pawkit-ui-ux/SKILL.md section on GlassPillButton."`

- [ ] Update navigation indicators (30 min) - [impl: ] [test: ] [done: ]
  Why: Thicker glow bar, not thin line
  Impact: Better active state visibility
  Command: `claude-code "Update navigation active indicators (Library/Calendar/Timeline tabs): 1) Change from h-0.5 to h-1 for thickness, 2) Add purple glow shadow-[0_0_10px_rgba(168,85,247,0.6)], 3) Use rounded-full for smooth appearance, 4) Ensure width matches text width dynamically. See .claude/skills/pawkit-ui-ux/SKILL.md section on NavItem pattern."`

- [ ] Update sliders to glass theme (1 hour) - [impl: ] [test: ] [done: ]
  Why: Match glass aesthetic
  Impact: Visual consistency
  Command: `claude-code "Update control panel sliders to glass theme: 1) Replace browser default styling with custom glass slider, 2) Use glass track (bg-white/5 border-white/10 backdrop-blur-md), 3) Purple fill with glow, 4) Custom thumb with glass effect and purple border. See .claude/skills/pawkit-ui-ux/SKILL.md section on GlassSlider for complete implementation."`

### Performance Targets for Phase 2

**Targets:**
- Initial load: <2 seconds (currently ~3-4s)
- Search: <100ms for 1000+ cards
- Scroll: 60fps with 500+ cards
- Sync: <3 seconds (from <5s)

**Technical Metrics:**
- Lighthouse score: >90
- First Contentful Paint: <1.5s
- Time to Interactive: <3s
- Core Web Vitals: All green

---

## BACKLOG - HIGH PRIORITY (Month 2)

**Phase 3: UX Polish & Mobile (Weeks 7-10)**

### Priority 1: Keyboard Shortcuts

- [ ] Implement keyboard shortcuts system (6-8 hours) - [impl: ] [test: ] [done: ]
  Why: Power users 2-3x faster
  Impact: Major productivity boost for frequent users
  Risk: Low
  Command: `claude-code "Implement keyboard shortcuts system: 1) Create useKeyboardShortcuts hook, 2) Add shortcuts for: Quick add card (⌘+K), Search (⌘+F), Navigate collections (⌘+1-9), Edit card (E), Delete card (⌫), Pin card (P), Close modal (Esc), 3) Add shortcuts help modal (⌘+?), 4) Make shortcuts customizable in settings"`

  Key Shortcuts:
    - `⌘+K` / `Ctrl+K`: Quick add card
    - `⌘+F` / `Ctrl+F`: Focus search
    - `⌘+1-9`: Switch between views
    - `E`: Edit selected card
    - `Del`: Delete selected card
    - `P`: Pin/unpin card
    - `Esc`: Close modal
    - `⌘+?`: Show shortcuts help

### Priority 2: Bulk Operations

- [ ] Add bulk operations UI (8-10 hours) - [impl: ] [test: ] [done: ]
  Why: Better for organizing large collections
  Impact: Manage multiple cards at once
  Risk: Medium (complex UI state)
  Command: `claude-code "Add bulk operations UI: 1) Add multi-select mode to card grid, 2) Shift+click for range selection, 3) Bulk actions: Delete, Move to collection, Add tags, Change privacy, 4) Show selection count, 5) Add 'Select All' option, 6) Confirm before destructive actions"`

  Bulk Actions:
    - Delete multiple cards
    - Move to collection
    - Add/remove tags
    - Change privacy status
    - Export selection
    - Pin/unpin

### Priority 3: Mobile Responsiveness

- [ ] Optimize mobile layout (6-8 hours) - [impl: ] [test: ] [done: ]
  Why: Better mobile experience
  Impact: App usable on phones and tablets
  Risk: Medium
  Command: `claude-code "Optimize mobile layout: 1) Responsive card grid (1 column on mobile), 2) Mobile-friendly navigation (bottom nav or hamburger), 3) Touch-friendly hit targets (min 44px), 4) Optimize modal UX for small screens, 5) Test on iOS and Android"`

- [ ] Add touch gestures (4-6 hours) - [impl: ] [test: ] [done: ]
  Why: Native mobile experience
  Impact: Intuitive mobile interactions
  Risk: Low
  Command: `claude-code "Add touch gestures for mobile: 1) Swipe to delete card, 2) Pull to refresh, 3) Long press for context menu, 4) Pinch to zoom on images, 5) Swipe between views"`

- [ ] Optimize mobile performance (4-5 hours) - [impl: ] [test: ] [done: ]
  Why: Fast on mobile networks
  Impact: Works well on slow connections
  Risk: Medium
  Command: `claude-code "Optimize for mobile performance: 1) Reduce bundle size, 2) Optimize images for mobile, 3) Add service worker for offline, 4) Lazy load below-fold content, 5) Test on slow 3G"`

### Priority 4: Loading States & Optimistic UI

- [ ] Add loading skeletons (3-4 hours) - [impl: ] [test: ] [done: ]
  Why: Better perceived performance
  Impact: Reduced layout shift, professional feel
  Risk: Low
  Command: `claude-code "Add loading skeletons: 1) Card grid skeleton, 2) Sidebar skeleton, 3) Modal skeleton, 4) Use consistent animation timing, 5) Match actual content layout"`

- [ ] Implement optimistic updates (5-7 hours) - [impl: ] [test: ] [done: ]
  Why: Instant feedback on user actions
  Impact: App feels faster
  Risk: Medium (complex state management)
  Command: `claude-code "Implement optimistic UI updates: 1) Show changes immediately before sync, 2) Rollback on failure, 3) Show subtle sync indicator, 4) Queue operations during offline, 5) Smooth transition when sync completes"`

- [ ] Add progress indicators (2-3 hours) - [impl: ] [test: ] [done: ]
  Why: Clear feedback on long operations
  Impact: Better user understanding of app state
  Risk: Low
  Command: `claude-code "Add progress indicators: 1) Sync progress bar, 2) Upload progress for images, 3) Batch operation progress, 4) Background task notifications, 5) Estimated time remaining"`

### Priority 5: Accessibility

- [ ] Improve accessibility (6-8 hours) - [impl: ] [test: ] [done: ]
  Why: Inclusive design, meet WCAG 2.1 AA standards
  Impact: App usable by everyone
  Risk: Low
  Command: `claude-code "Improve accessibility: 1) Add ARIA labels to all interactive elements, 2) Ensure keyboard navigation works everywhere, 3) Add focus indicators, 4) Test with screen reader, 5) Meet WCAG 2.1 AA standards, 6) Add high contrast mode"`

### Priority 6: Search & UX Improvements

- [ ] Improve search result highlighting (3 hours) - [impl: ] [test: ] [done: ]
  Why: Help users understand why results matched
  Impact: Better search UX
  Risk: Low
  Command: `claude-code "Improve search result highlighting: 1) Highlight matched terms in card titles and descriptions, 2) Show snippet of matched content in notes, 3) Add 'jump to match' for note results"`

- [ ] Add keyboard shortcuts reference (2 hours) - [impl: ] [test: ] [done: ]
  Why: Power users want to know available shortcuts
  Impact: Discoverability of shortcuts
  Risk: Low
  Command: `claude-code "Add keyboard shortcuts reference: 1) Create modal with all keyboard shortcuts, 2) Show hint on first visit, 3) Add '?' key to toggle modal"`

### Success Metrics for Phase 3

**UX Metrics:**
- Task completion time: 30% reduction
- Mobile bounce rate: <40%
- Keyboard shortcut usage: >20% of sessions
- Accessibility score: >90

**User Feedback:**
- Mobile experience rating: >4/5
- Feature request for shortcuts: Resolved
- Bulk operations: Users report time savings

---

## BACKLOG - FUTURE (Month 3+)

**Phase 4: Feature Expansion (After Month 3)**

### Priority 1: Browser Extension V2

- [ ] Enhance extension features (10-15 hours) - [impl: ] [test: ] [done: ]
  Why: Make extension more powerful and convenient
  Impact: Faster bookmarking workflow
  Risk: Medium
  Command: `claude-code "Enhance browser extension: 1) Right-click context menu to save, 2) Save selection as note, 3) Capture page screenshot, 4) Auto-tag based on domain, 5) Quick collection picker, 6) Keyboard shortcuts, 7) Offline queue"`

  New Features:
    - Context menu: "Save to Pawkit"
    - Highlight text → save as quote
    - Auto-categorization
    - Quick notes
    - Keyboard shortcuts
    - Offline support

- [ ] Optimize extension performance (4-5 hours) - [impl: ] [test: ] [done: ]
  Why: Faster, more reliable extension
  Impact: Better user experience
  Risk: Low
  Command: `claude-code "Optimize extension: 1) Reduce bundle size, 2) Lazy load UI components, 3) Cache API responses, 4) Background sync, 5) Better error handling"`

### Priority 2: Advanced Search

- [ ] Add advanced search operators (6-8 hours) - [impl: ] [test: ] [done: ]
  Why: Power users need complex queries
  Impact: Find anything quickly
  Risk: Medium
  Command: `claude-code "Add advanced search operators: 1) Boolean operators (AND, OR, NOT), 2) Field-specific search (title:, tag:, url:), 3) Date range filters (after:, before:), 4) Regex support, 5) Saved searches, 6) Search history"`

  Operators:
    - `title:"exact phrase"`
    - `tag:work tag:urgent` (AND)
    - `tag:work OR tag:personal`
    - `-tag:archived` (NOT)
    - `after:2025-01-01`
    - `before:2025-12-31`
    - `type:bookmark`
    - `is:private`
    - `is:pinned`

- [ ] Add search suggestions (4-5 hours) - [impl: ] [test: ] [done: ]
  Why: Faster search, better discoverability
  Impact: Improved search UX
  Risk: Low
  Command: `claude-code "Add search suggestions: 1) Autocomplete for tags, 2) Recent searches, 3) Popular searches, 4) Suggested filters, 5) Search as you type"`

- [ ] Add saved searches (3 days) - [impl: ] [test: ] [done: ]
  Why: Users repeat the same searches often
  Impact: Quick access to common queries
  Risk: Low
  Command: `claude-code "Add saved searches: 1) Save complex search queries, 2) Add to sidebar for quick access, 3) Update counts in real-time"`

- [ ] Implement full-text PDF search (1 week) - [impl: ] [test: ] [done: ]
  Why: PDFs are common saved content, need searchability
  Impact: Find content within PDFs
  Risk: Medium
  Command: `claude-code "Implement full-text search for PDFs: 1) Extract text from uploaded PDFs, 2) Index in search database, 3) Highlight matches in PDF viewer"`

### Priority 3: Import/Export Enhancements

- [ ] Add import from multiple sources (8-10 hours) - [impl: ] [test: ] [done: ]
  Why: Users want to migrate from other tools
  Impact: Easier onboarding
  Risk: Medium
  Command: `claude-code "Add import from multiple sources: 1) Chrome bookmarks (HTML), 2) Firefox bookmarks (JSON), 3) Safari bookmarks, 4) Pocket export, 5) Raindrop.io, 6) Notion export, 7) Plain text URLs, 8) CSV format"`

- [ ] Enhanced export options (6-8 hours) - [impl: ] [test: ] [done: ]
  Why: Users want data portability
  Impact: Export in various formats
  Risk: Low
  Command: `claude-code "Enhanced export options: 1) JSON with full metadata, 2) Markdown with backlinks, 3) HTML bookmarks format, 4) CSV for spreadsheets, 5) PDF for printing, 6) RSS feed for sharing, 7) Archive.org integration"`

- [ ] Add automated backups (10-12 hours) - [impl: ] [test: ] [done: ]
  Why: Data safety and peace of mind
  Impact: Automatic cloud backups
  Risk: High (security implications)
  Command: `claude-code "Add automated backups: 1) Daily automatic backups, 2) Export to cloud storage (Google Drive, Dropbox), 3) Backup scheduling, 4) Point-in-time restore, 5) Backup encryption"`

### Priority 4: Note-Taking Features

- [ ] Add bidirectional links panel (1 week) - [impl: ] [test: ] [done: ]
  Why: Enable Zettelkasten-style note networks
  Impact: Better note connections
  Risk: Low
  Command: `claude-code "Add bidirectional links panel: 1) Show all notes that link to current note, 2) Display link context (surrounding text), 3) Click to navigate to source"`

- [ ] Implement daily notes (3 days) - [impl: ] [test: ] [done: ]
  Why: Popular feature in Obsidian/Roam, users expect it
  Impact: Daily journaling workflow
  Risk: Low
  Command: `claude-code "Implement daily notes: 1) Auto-create note for today with YYYY-MM-DD format, 2) Keyboard shortcut to open today's note (Cmd+Shift+D), 3) Calendar view integration"`

- [ ] Add block references (2 weeks) - [impl: ] [test: ] [done: ]
  Why: More granular linking for knowledge management
  Impact: Reference specific paragraphs
  Risk: Medium
  Command: `claude-code "Add block references: 1) Reference specific paragraphs with [[note#block-id]], 2) Auto-generate block IDs, 3) Show referenced blocks in context"`

### Priority 5: Collaboration Features (Future)

- [ ] Add sharing capabilities (15-20 hours) - [impl: ] [test: ] [done: ]
  Why: Users want to share content
  Impact: Social features
  Risk: High (new architecture)
  Command: `claude-code "Add sharing capabilities: 1) Share individual cards (public link), 2) Share collections, 3) Collaborative collections, 4) Permission management (view/edit), 5) Share via email/link"`

- [ ] Add shared pawkits (3 weeks) - [impl: ] [test: ] [done: ]
  Why: Teams want to share collections
  Impact: Collaboration features
  Risk: High
  Command: `claude-code "Add shared pawkits: 1) Invite users to collaborate on pawkit, 2) Set permissions (view, edit, admin), 3) Real-time sync for shared pawkits"`

- [ ] Implement comments on cards (1 week) - [impl: ] [test: ] [done: ]
  Why: Enable discussion around saved content
  Impact: Collaboration on cards
  Risk: Medium
  Command: `claude-code "Implement comments on cards: 1) Add comment thread to card detail, 2) Notify on new comments, 3) Support markdown in comments"`

- [ ] Add team functionality (40+ hours) - [impl: ] [test: ] [done: ]
  Why: Enterprise feature for organizations
  Impact: Multi-user workspaces
  Risk: Very High (major feature)
  Command: `claude-code "Add team functionality: 1) Team workspaces, 2) Member management, 3) Team collections, 4) Activity log, 5) Team billing"`

### Priority 6: API Documentation

- [ ] Create API documentation (12-15 hours) - [impl: ] [test: ] [done: ]
  Why: Developers want to build integrations
  Impact: Ecosystem growth
  Risk: Low
  Command: `claude-code "Create API documentation: 1) Use OpenAPI/Swagger spec, 2) Document all endpoints, 3) Add example requests/responses, 4) Create API playground, 5) Add rate limiting info, 6) Create client SDKs (JS, Python)"`

  Deliverables:
    - OpenAPI 3.0 spec
    - Interactive API docs (Swagger UI)
    - Authentication guide
    - Code examples
    - Client libraries
    - Webhook documentation

### Priority 7: Analytics & Insights

- [ ] Add analytics dashboard (10-12 hours) - [impl: ] [test: ] [done: ]
  Why: Users want to understand their bookmark habits
  Impact: Valuable insights
  Risk: Medium
  Command: `claude-code "Add analytics dashboard: 1) Bookmarks over time, 2) Most used tags, 3) Collection growth, 4) Most visited links, 5) Reading time estimates, 6) Productivity insights, 7) Export reports"`

  Insights:
    - Saving patterns
    - Popular sources
    - Tag usage trends
    - Reading habits
    - Collection metrics
    - Time spent reading

---

## BACKLOG - CONNECTED PLATFORMS (Month 3-4)

**Vision**: Pawkit connects scattered saves across Reddit, YouTube, Twitter, and the web. Import years of saved content, organize it properly, and never lose it again.

**Tagline**: "Your internet in your Pawkit"

### Reddit Integration

- [ ] **OAuth flow** (4-6 hours) - [impl: ] [test: ] [done: ]
  Why: Reddit has official OAuth, easy approval, rich API
  Impact: Access user's saved posts programmatically
  Command: `claude-code "Implement Reddit OAuth: 1) Create /api/auth/reddit/callback route, 2) Store refresh token in user settings, 3) Add 'Connect Reddit' button in Settings > Connectors"`

- [ ] **Import saved posts** (6-8 hours) - [impl: ] [test: ] [done: ]
  Why: Reddit API returns rich metadata (thumbnails, previews, scores, subreddit)
  Impact: Import years of saved content with full context
  Features:
    - Text posts → note-type cards
    - Image posts → cards with full images
    - Link posts → bookmark cards
    - Preserve: score, comment count, subreddit, author
  Command: `claude-code "Create Reddit import: 1) /api/reddit/import endpoint, 2) Paginate through saved posts, 3) Map to card types based on post type, 4) Store reddit_id for deduplication"`

- [ ] **Auto-tag by subreddit** (2 hours) - [impl: ] [test: ] [done: ]
  Why: Instant organization without manual work
  Impact: r/programming → #programming, r/recipes → #recipes
  Command: `claude-code "Add subreddit auto-tagging: 1) Extract subreddit from imported posts, 2) Create/find matching tag, 3) Apply to card on import"`

- [ ] **Bulk unsave from Reddit** (3-4 hours) - [impl: ] [test: ] [done: ]
  Why: Clean up Reddit saves after importing to Pawkit
  Impact: Remove items from Reddit in bulk after safe import
  Command: `claude-code "Add Reddit unsave: 1) Track reddit_id on cards, 2) Add 'Unsave from Reddit' bulk action, 3) Call Reddit unsave API for each"`

- [ ] **Bypass 1000 limit** (2 hours) - [impl: ] [test: ] [done: ]
  Why: Reddit only shows last 1000 saves via UI
  Impact: Archive EVERYTHING, not just recent saves
  Note: API can access beyond 1000 with proper pagination

- [ ] **Rediscover for Reddit** (4 hours) - [impl: ] [test: ] [done: ]
  Why: Triage years of saved posts efficiently
  Impact: Filter Rediscover by source (Reddit only)
  Features:
    - Source picker: "Reddit saves older than 6 months"
    - Show subreddit context
    - One-click unsave + keep/delete

### YouTube Integration

- [ ] **OAuth flow** (4-6 hours) - [impl: ] [test: ] [done: ]
  Why: Google OAuth for YouTube API access
  Impact: Access user's playlists
  Note: Watch Later is blocked by Google - use workaround
  Command: `claude-code "Implement YouTube OAuth: 1) Create /api/auth/youtube/callback, 2) Request playlist scope, 3) Store tokens securely"`

- [ ] **Import playlists** (6-8 hours) - [impl: ] [test: ] [done: ]
  Why: Pull user-created playlists into Pawkit
  Impact: All saved videos in one place
  Features:
    - List all user playlists
    - Import selected playlists as Pawkits
    - Preserve: title, description, thumbnail, duration, channel

- [ ] **Create playlists from Pawkit** (4 hours) - [impl: ] [test: ] [done: ]
  Why: Pawkit collection → YouTube playlist
  Impact: Two-way organization
  Command: `claude-code "Add YouTube playlist creation: 1) 'Export to YouTube' action on Pawkits containing videos, 2) Create playlist via API, 3) Add videos to playlist"`

- [ ] **Two-way playlist sync** (8-10 hours) - [impl: ] [test: ] [done: ]
  Why: Changes in Pawkit reflect in YouTube and vice versa
  Impact: Single source of truth for video organization
  Features:
    - Add video in Pawkit → add to YouTube playlist
    - Remove from Pawkit → remove from YouTube
    - Sync on demand or periodic background sync

- [ ] **"My Watch Later" workaround** (2 hours) - [impl: ] [test: ] [done: ]
  Why: Google blocks Watch Later API access
  Impact: Create "My Watch Later" playlist that works like Watch Later
  Note: Extension can add to this playlist with one click

### Twitter/X Integration

- [ ] **Bookmark import (file-based)** (4-6 hours) - [impl: ] [test: ] [done: ]
  Why: Twitter API requires developer approval - start simple
  Impact: Users can export bookmarks and import to Pawkit
  Flow:
    1. User runs browser script to export bookmarks as JSON
    2. Upload JSON to Pawkit
    3. Parse and create cards
  Command: `claude-code "Create Twitter import: 1) /api/import/twitter endpoint, 2) Accept JSON file upload, 3) Parse tweet data, 4) Create cards with tweet text, author, media URLs"`

- [ ] **Full metadata preservation** (2 hours) - [impl: ] [test: ] [done: ]
  Why: Context matters for saved tweets
  Impact: Preserve author, timestamp, media, reply context
  Store: tweet_id, author_handle, author_name, created_at, media_urls

- [ ] **Auto-tag by author** (2 hours) - [impl: ] [test: ] [done: ]
  Why: Group tweets by who posted them
  Impact: Quick filtering by favorite accounts

- [ ] **OAuth flow (future)** (6-8 hours) - [impl: ] [test: ] [done: ]
  Why: Direct API access when approved
  Impact: Automatic import, no manual export needed
  Note: Requires Twitter developer account approval

### Connected Platforms UI

- [ ] **Connected Sources section** (4-6 hours) - [impl: ] [test: ] [done: ]
  Why: Dedicated area for imported content
  Impact: Clear separation from manual saves
  Location: Left sidebar, below Pawkits
  Features:
    - Reddit Saves (count)
    - YouTube Playlists (count)
    - Twitter Bookmarks (count)
    - Click to filter Library by source

- [ ] **Source badges on cards** (2 hours) - [impl: ] [test: ] [done: ]
  Why: Visual indicator of content origin
  Impact: Users know where content came from
  Display: Small Reddit/YouTube/Twitter icon on card

- [ ] **Import progress UI** (3-4 hours) - [impl: ] [test: ] [done: ]
  Why: Large imports take time
  Impact: User sees progress, can cancel
  Features:
    - Progress bar
    - "Importing 234 of 1,847 items..."
    - Cancel button
    - Background operation

---

## BACKLOG - TOPIC NOTES & KNOWLEDGE CAPTURE (Month 4)

**Vision**: A Topic Note is a living document that grows as you consume related content. Never lose insights from videos, articles, and posts again.

### Core Features

- [ ] **Citation blocks in notes** (6-8 hours) - [impl: ] [test: ] [done: ]
  Why: Quote with automatic source attribution
  Impact: Build knowledge base with proper citations
  Syntax:
  ```markdown
  > "Every pixel should earn its place."
  > — Design Course · YouTube · [14:32](youtube.com/...?t=872)
  ```
  Features:
    - Blockquote with source line
    - Clickable timestamp links
    - Source type icon (YouTube, Reddit, Article)

- [ ] **YouTube timestamp capture** (4-6 hours) - [impl: ] [test: ] [done: ]
  Why: Reference exact moments in videos
  Impact: Click timestamp → opens video at that second
  Flow:
    1. User watching video in Rediscover
    2. Clicks "Capture" at interesting moment
    3. Current timestamp auto-included in citation
    4. Link format: `youtube.com/watch?v=xxx&t=872`

- [ ] **Reddit citation format** (3-4 hours) - [impl: ] [test: ] [done: ]
  Why: Quote comments with context
  Impact: Preserve discussion insights
  Format:
  ```markdown
  > "The 60-30-10 color rule from interior design applies perfectly to UI."
  > — u/designerguy · r/web_design · [View post](reddit.com/...)
  ```

- [ ] **Article citation format** (3-4 hours) - [impl: ] [test: ] [done: ]
  Why: Quote articles with link back
  Impact: Reference written content properly
  Format:
  ```markdown
  > "Users don't read, they scan."
  > — Nielsen Norman Group · [Article](nngroup.com/...)
  ```

### Capture Flow

- [ ] **"Capture to Note" panel** (6-8 hours) - [impl: ] [test: ] [done: ]
  Why: Capture insights while consuming content
  Impact: Knowledge capture integrated into Rediscover
  Features:
    - Always visible side panel while in Rediscover
    - Quick capture field
    - Auto-attaches current source + timestamp
    - Note picker (existing or new)

- [ ] **Note picker with search** (3-4 hours) - [impl: ] [test: ] [done: ]
  Why: Add to existing Topic Note or create new
  Impact: Build on existing knowledge
  Features:
    - Search existing notes
    - "Create new Topic Note" option
    - Recent notes quick-select

- [ ] **Side-by-side view** (4-6 hours) - [impl: ] [test: ] [done: ]
  Why: See content and notes simultaneously
  Impact: Efficient capture workflow
  Layout: Content (left 60%) | Topic Note (right 40%)

---

## BACKLOG - REDISCOVER AS CONTENT QUEUE (Month 3)

**Vision**: Rediscover evolves from triage tool to consumption interface. "Here's your content queue. Watch, read, or dismiss. Let's go."

### Source Picker

- [ ] **Source selection modal** (4-6 hours) - [impl: ] [test: ] [done: ]
  Why: Filter what you're in the mood to consume
  Impact: Focused content sessions
  Options:
    - Inbox (uncategorized)
    - YouTube (videos only)
    - Reddit (by subreddit filter)
    - Twitter
    - Articles (reading mode)
    - Custom filters (tag, date range, Pawkit)
  Examples:
    - "Reddit saves from r/recipes older than 6 months"
    - "YouTube videos shorter than 10 minutes"
    - "Articles I saved this week"

### Inline Content Consumption

- [ ] **YouTube embeds in Rediscover** (4-6 hours) - [impl: ] [test: ] [done: ]
  Why: Watch videos without leaving Pawkit
  Impact: Seamless consumption experience
  Features:
    - Embedded player
    - Timestamp capture button
    - Progress tracking (optional)

- [ ] **Reddit rendering** (4-6 hours) - [impl: ] [test: ] [done: ]
  Why: Read Reddit content inline
  Impact: No context switching
  Features:
    - Text posts: render markdown
    - Image posts: show full image
    - Link posts: reader mode
    - Show score, comments, subreddit

- [ ] **Twitter embeds** (3-4 hours) - [impl: ] [test: ] [done: ]
  Why: Read tweets inline
  Impact: Quick consumption
  Features:
    - Render tweet with media
    - Show author, timestamp
    - Thread expansion (if applicable)

### Enhanced Actions

- [ ] **Skip action** (1 hour) - [impl: ] [test: ] [done: ]
  Why: Not in the mood now, but don't delete
  Impact: Move to end of queue, revisit later

- [ ] **Remove + unsave from source** (3-4 hours) - [impl: ] [test: ] [done: ]
  Why: Clean up both Pawkit AND original platform
  Impact: True inbox zero across platforms
  Flow: Delete from Pawkit + unsave from Reddit/YouTube/Twitter

---

## BACKLOG - NOTE FOLDERS (Month 2)

**Context**: User requested folders in Notes section. Reuses Pawkit tree pattern.

### Implementation

- [ ] **note_folders table** (3-4 hours) - [impl: ] [test: ] [done: ]
  Why: Organize notes hierarchically
  Impact: Same UX as Pawkits but for notes
  Schema:
  ```sql
  create table note_folders (
    id uuid primary key,
    user_id uuid references users(id),
    name text not null,
    parent_id uuid references note_folders(id),
    position integer default 0,
    created_at timestamp default now()
  );

  alter table cards add column folder_id uuid references note_folders(id);
  ```

- [ ] **Nested hierarchy UI** (4-6 hours) - [impl: ] [test: ] [done: ]
  Why: Consistent with Pawkits
  Impact: Familiar interaction pattern
  Features:
    - Reuse Pawkit tree rendering
    - Drag-drop to reorganize
    - Expand/collapse
    - Context menu (rename, delete, move)

- [ ] **Folder sidebar in Notes view** (3-4 hours) - [impl: ] [test: ] [done: ]
  Why: Navigate folder structure
  Impact: Left panel shows folders, right shows notes
  Features:
    - "All Notes" option
    - "Unfiled" for notes without folder
    - Folder tree with counts

### Notes in Pawkits (Many-to-Many)

- [ ] **pawkit_notes junction table** (4-6 hours) - [impl: ] [test: ] [done: ]
  Why: Notes can appear in multiple Pawkits (like aliases)
  Impact: Note about "UI Design" lives alongside design bookmarks
  Schema:
  ```sql
  create table pawkit_notes (
    pawkit_id uuid references collections(id) on delete cascade,
    note_id uuid references cards(id) on delete cascade,
    position integer default 0,
    primary key (pawkit_id, note_id)
  );
  ```

- [ ] **"Add to Pawkit" from note** (2-3 hours) - [impl: ] [test: ] [done: ]
  Why: Link notes to relevant collections
  Impact: Notes appear alongside related bookmarks

- [ ] **"Add Note" from Pawkit** (2-3 hours) - [impl: ] [test: ] [done: ]
  Why: Search existing notes or create new
  Impact: Build knowledge alongside saved content

---

## BACKLOG - TAG SYSTEM OVERHAUL (Month 2)

**Context**: Current tags only auto-generate from Pawkit names. Need full tag management.

### Manual Tag Creation

- [ ] **Tag creation UI** (3-4 hours) - [impl: ] [test: ] [done: ]
  Why: Users need to create their own tags
  Impact: Organization beyond auto-generated tags
  Location: Settings > Tags, or inline in tag picker
  Features:
    - Create tag with name
    - Optional color selection
    - Optional icon/emoji

- [ ] **Tag picker in card modals** (4-6 hours) - [impl: ] [test: ] [done: ]
  Why: Easy tag assignment when editing cards
  Impact: Quick tagging workflow
  Features:
    - Dropdown with existing tags
    - Search/filter tags
    - Create new inline
    - Multi-select

- [ ] **Tag autocomplete** (3-4 hours) - [impl: ] [test: ] [done: ]
  Why: Fast tag entry while typing
  Impact: Reduces typos, surfaces existing tags
  Features:
    - Autocomplete as user types
    - Show tag usage count
    - Keyboard navigation

### Tag Management

- [ ] **Rename tags** (2-3 hours) - [impl: ] [test: ] [done: ]
  Why: Fix typos, improve naming
  Impact: Updates all cards with that tag
  Location: Tags view, context menu

- [ ] **Merge tags** (3-4 hours) - [impl: ] [test: ] [done: ]
  Why: Consolidate duplicate/similar tags
  Impact: Cleaner tag taxonomy
  Flow: Select two tags → Merge → All cards get surviving tag

- [ ] **Delete tags** (2-3 hours) - [impl: ] [test: ] [done: ]
  Why: Remove unused tags
  Impact: Cleaner tag list
  Options:
    - Delete tag only (remove from cards)
    - Delete tag + associated cards (with confirmation)

- [ ] **Tag colors** (2-3 hours) - [impl: ] [test: ] [done: ]
  Why: Visual differentiation
  Impact: Easier scanning of tagged content
  Features:
    - Color picker
    - Preset palette
    - Show color in tag pills

---

## BACKLOG - MOBILE ENHANCEMENTS (Month 3)

### Document Scanning

- [ ] **Camera capture for documents** (6-8 hours) - [impl: ] [test: ] [done: ]
  Why: Scan receipts, documents, notes with phone
  Impact: Physical → digital workflow
  Features:
    - Camera capture in mobile app
    - Auto-crop/perspective correction
    - Save as image attachment or card thumbnail
  Libraries: expo-camera, expo-image-manipulator

- [ ] **Receipt scanning** (4-6 hours) - [impl: ] [test: ] [done: ]
  Why: Track expenses, warranties
  Impact: Digital receipt archive
  Features:
    - Scan receipt
    - OCR to extract merchant, amount, date
    - Auto-tag as #receipt

- [ ] **Handwritten notes scanning** (4-6 hours) - [impl: ] [test: ] [done: ]
  Why: Digitize paper notes
  Impact: Searchable handwritten content
  Features:
    - Capture handwritten notes
    - OCR extraction
    - Create note card with image + extracted text

---

## BACKLOG - UI ENHANCEMENTS (Month 2-3)

### Customizable List Columns

- [ ] **Column show/hide** (4-6 hours) - [impl: ] [test: ] [done: ]
  Why: Users want to customize what columns appear
  Impact: Personalized list view
  Inspired by: Apple Notes column customization
  Features:
    - Right-click header → show/hide columns
    - Settings dropdown for column visibility
    - Available columns: Name, Type, Tags, URL, Date Created, Date Modified, Pawkits

- [ ] **Column order customization** (3-4 hours) - [impl: ] [test: ] [done: ]
  Why: Drag to reorder columns
  Impact: Most important info first
  Features:
    - Drag column headers to reorder
    - Persist order in localStorage per view

- [ ] **Per-view column settings** (2-3 hours) - [impl: ] [test: ] [done: ]
  Why: Different columns for Library vs Notes vs Pawkits
  Impact: Optimized views for different content types
  Storage: `localStorage['pawkit-columns-library']`, `pawkit-columns-notes`, etc.

### Calendar Enhancements

- [ ] **US Holidays** (4-6 hours) - [impl: ✓] [test: ] [done: ]
  Why: See holidays on calendar without manual entry
  Impact: Better planning, context
  Features:
    - Toggle: Show Holidays (on/off) in right sidebar
    - Sub-options: Major Only / All Federal / All
    - Display as subtle badge or different color
    - Static data (holidays are predictable)
  Note: Implemented December 2025

- [ ] **Event colors/categories** (3-4 hours) - [impl: ] [test: ] [done: ]
  Why: Visual organization of events
  Impact: Quickly distinguish event types
  Categories: Work, Personal, Bills, Birthdays, Custom
  Features:
    - Color picker in event modal
    - Preset categories with colors
    - Filter calendar by category

- [ ] **Other countries' holidays** (2-3 hours) - [impl: ] [test: ] [done: ]
  Why: International users
  Impact: Relevant holidays for non-US users
  Options: UK, Canada, Australia, etc.
  Note: v2 feature, lower priority

---

## BACKLOG - IMPORT/EXPORT (Month 2)

### Bulk Markdown Import

- [ ] **Markdown file import** (4-6 hours) - [impl: ] [test: ] [done: ]
  Why: Users with existing markdown notes (Obsidian, etc.)
  Impact: Easy migration to Pawkit
  Source: YouTube feedback
  Features:
    - Drag-drop .md files
    - Batch upload folder of .md files
    - Preserve frontmatter as metadata
    - Convert wiki-links to Pawkit format

- [ ] **Obsidian vault import** (6-8 hours) - [impl: ] [test: ] [done: ]
  Why: Popular note-taking app migration
  Impact: Capture Obsidian users
  Features:
    - Upload entire vault folder
    - Preserve folder structure as Note Folders
    - Convert [[wiki-links]]
    - Import attachments

---

## BACKLOG - COMMUNICATION (Month 2)

### Weekly Email Digest

- [ ] **Digest email template** (3-4 hours) - [impl: ] [test: ] [done: ]
  Why: Re-engage users, surface forgotten content
  Impact: Weekly touchpoint with value
  Contents:
    - Activity summary (cards added, notes created)
    - Rediscover nudge ("You have 47 items to review")
    - Random "blast from the past" card
    - Quick stats

- [ ] **Digest scheduling** (3-4 hours) - [impl: ] [test: ] [done: ]
  Why: Automated weekly sends
  Impact: Consistent engagement
  Implementation: Supabase Edge Function + Resend
  Schedule: Sunday evening or Monday morning

- [ ] **Digest preferences** (2-3 hours) - [impl: ] [test: ] [done: ]
  Why: User control over emails
  Impact: Respect preferences
  Options:
    - Enable/disable digest
    - Frequency (weekly, bi-weekly, monthly)
    - Day of week preference

### In-App Feedback System

- [ ] **Feedback modal** (4-6 hours) - [impl: ] [test: ] [done: ]
  Why: Collect user feedback easily
  Impact: Direct line to users
  Location: Sidebar footer or Help menu
  Features:
    - Category: Bug, Feature Request, General
    - Description field
    - Optional screenshot attachment
    - Optional email for follow-up

- [ ] **Feedback storage** (2-3 hours) - [impl: ] [test: ] [done: ]
  Why: Collect and organize feedback
  Impact: Structured feedback data
  Storage: Supabase `feedback` table
  Fields: user_id, category, description, screenshot_url, status, created_at

- [ ] **Feedback notification** (2-3 hours) - [impl: ] [test: ] [done: ]
  Why: Get notified of new feedback
  Impact: Quick response to users
  Implementation: Resend email on new feedback submission

---

## Implementation Priority (Suggested)

### Phase 1: Quick Wins (Month 2)
- Note Folders (reuse Pawkit pattern)
- Tag System Overhaul
- Customizable List Columns
- In-App Feedback System

### Phase 2: Platform Integrations (Month 3)
- Reddit Integration (most accessible API)
- Rediscover as Content Queue
- Weekly Email Digest

### Phase 3: Knowledge Capture (Month 4)
- Topic Notes & Citations
- YouTube Integration
- Document Scanning (Mobile)

### Phase 4: Full Platform Support (Month 5)
- Twitter/X Integration
- Two-way sync refinements
- AI-powered cross-platform linking

---

## BACKLOG - ONGOING

**Phase 5: Technical Debt & Continuous Improvement**

### Code Quality

- [ ] Expand test coverage (ongoing) - [impl: ] [test: ] [done: ]
  Why: Prevent regressions, maintain quality
  Impact: More reliable codebase
  Risk: Low
  Target: 80% overall code coverage
  Current: Pre-merge test suite (91% of key flows)
  Command: `claude-code "Expand test coverage: 1) Add unit tests for utils, 2) Add integration tests for API routes, 3) Add E2E tests for critical flows, 4) Set up CI/CD pipeline, 5) Add test coverage reporting, 6) Target 80% coverage"`

- [ ] Improve TypeScript usage (6-8 hours) - [impl: ] [test: ] [done: ]
  Why: Better type safety, fewer runtime errors
  Impact: Catch bugs at compile time
  Risk: Low
  Command: `claude-code "Improve TypeScript usage: 1) Remove 'any' types, 2) Add strict mode, 3) Better type inference, 4) Add Zod schemas for runtime validation, 5) Type all API responses"`

### Performance Monitoring

- [ ] Add performance monitoring (4-6 hours) - [impl: ] [test: ] [done: ]
  Why: Track performance in production
  Impact: Catch regressions early
  Risk: Low
  Command: `claude-code "Add performance monitoring: 1) Set up Sentry for error tracking, 2) Add custom performance metrics, 3) Set up alerts for errors, 4) Add user session recording, 5) Track Core Web Vitals"`

  Tools to Consider:
    - Sentry (error tracking)
    - Vercel Analytics (web vitals)
    - PostHog (product analytics)
    - LogRocket (session replay)

### Database Optimization

- [ ] Final inDen cleanup (2-3 hours) - [impl: ] [test: ] [done: ]
  Why: Remove deprecated field after migration proven stable
  Impact: Cleaner schema
  Risk: Medium (requires migration)
  Timeline: After 1-2 weeks post-launch
  Command: `claude-code "Final inDen cleanup: 1) Remove inDen field from Card model in prisma/schema.prisma, 2) Create migration to drop the column, 3) Remove any remaining inDen references in server code (lib/server/cards.ts, lib/server/collections.ts), 4) Clean up inDen from type definitions"`

- [ ] Optimize database queries (ongoing) - [impl: ] [test: ] [done: ]
  Why: Maintain performance as data grows
  Impact: Faster queries
  Risk: Medium
  Command: `claude-code "Optimize database queries: 1) Add indexes for slow queries, 2) Use select to limit fields, 3) Implement query caching, 4) Use transactions for related updates, 5) Profile query performance"`

### Refactoring

- [ ] Refactor components (ongoing) - [impl: ] [test: ] [done: ]
  Why: Maintainable codebase
  Impact: Easier to work with
  Risk: Low
  Command: `claude-code "Refactor components: 1) Extract reusable components, 2) Reduce component size (<300 lines), 3) Improve prop types, 4) Reduce prop drilling, 5) Use composition patterns"`

- [ ] Optimize state management (8-10 hours) - [impl: ] [test: ] [done: ]
  Why: Better performance, clearer code
  Impact: Fewer re-renders, faster app
  Risk: Medium
  Command: `claude-code "Optimize state management: 1) Review Zustand stores for efficiency, 2) Reduce unnecessary re-renders, 3) Implement better memoization, 4) Split large stores, 5) Add state persistence strategies"`

### Success Metrics - Overall

**Technical Metrics:**
- Page load: <2s
- Time to Interactive: <3s
- Lighthouse score: >90
- Core Web Vitals: All green
- Uptime: >99.5%
- Error rate: <1%
- Data loss: 0 incidents
- Sync success: >99%

**Scale:**
- Support 10,000+ cards per user
- <100ms search on large datasets
- 60fps scrolling
- Handles offline gracefully

**User Metrics:**
- Daily active users (track)
- Cards saved per user (track)
- Session duration (track)
- Return rate (track)
- NPS score: >50
- User feedback rating: >4/5

---

## How to Update This Roadmap

When working on a task:
1. Move it to CURRENT SPRINT if not already there
2. Mark `[implemented: ✓]` when code is done
3. Test it yourself or ask user to test
4. Mark `[tested: ✓]` after successful testing
5. Mark `[complete: ✓]` when fully verified
6. Move to COMPLETED WORK when done
7. Commit this file with message: `docs: update roadmap - [task name] complete`

When adding new tasks:
1. Choose appropriate section (CRITICAL, HIGH PRIORITY, FUTURE)
2. Include effort estimate in parentheses
3. Add description and "Why it matters"
4. Commit with message: `docs: update roadmap - add [task name]`

---

**Last Updated**: December 13, 2025
**Branch**: feature/calendar-week-view-redesign
**Next Critical Item**: Interactive onboarding checklist (3 hours) - PRIMARY FOCUS
**Total Tasks**: 175+ active tasks across all phases (Pre-merge → Month 5 → Ongoing)
**Recent Additions**: Connected Platforms (Reddit/YouTube/Twitter), Topic Notes, Rediscover Content Queue, Note Folders, Tag System Overhaul, Mobile Enhancements, UI Enhancements, Import/Export, Communication features
**User Feedback Insight**: Features work well, discoverability is the issue (4 new discoverability tasks, 7 tasks superseded)
