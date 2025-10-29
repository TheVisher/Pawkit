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

- [ ] Fix cursor jumping in note editor (30 min) - [implemented: ] [tested: ] [complete: ]
  Remove `card.content` from useEffect dependency in card-detail-modal.tsx:391-394
  Why: Users report cursor jumping when typing in notes, breaks writing flow

- [✓] Remove heartbeat system (1 hour) - [implemented: ✓] [tested: ✓] [complete: ✓]
  Delete /app/api/sessions/heartbeat/route.ts and client-side heartbeat calls
  Regenerate Prisma client without DeviceSession model
  Why: Causing 500 errors, doesn't prevent race conditions, adds overhead
  Completed: October 29, 2025 - Multi-session detection now uses localStorage only

- [ ] Add database duplicate prevention (2 hours) - [implemented: ] [tested: ] [complete: ]
  Add `@@unique([userId, url])` constraint to Card model in schema.prisma
  Update createCard to handle duplicate constraint errors gracefully (return existing card)
  Run migration and test duplicate URL saves
  Why: Prevents race condition duplicates at database level (proper solution)

- [ ] Test duplicate prevention across devices (15 min) - [implemented: ] [tested: ] [complete: ]
  Save same URL from two different browsers simultaneously
  Verify only one card created and both clients show same card
  Why: Validate the core issue from multi-session work is resolved

---

## COMPLETED WORK

**Reference for what's done - do not modify this section**

### October 28-29, 2025

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

- ✅ **Skills Structure Setup**
  Created proper .claude/skills/ directory structure
  Added pawkit-project-context, pawkit-conventions, and pawkit-roadmap skills
  Skills now tracked in git for cross-session consistency

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

### Priority 1: IndexedDB Performance

- [ ] Add IndexedDB indexes (2-3 hours) - [impl: ] [test: ] [done: ]
  Why: 50-70% faster queries on large datasets
  Impact: App stays responsive with 1000+ cards
  Risk: Medium (requires migration)
  Command: `claude-code "Optimize IndexedDB schema in lib/services/local-storage.ts: 1) Add composite index on (userId, updatedAt) for faster sync queries, 2) Add index on (userId, type) for filtering, 3) Add full-text search index on title and content fields, 4) Test query performance with 1000+ cards"`

- [ ] Optimize IndexedDB queries (3-4 hours) - [impl: ] [test: ] [done: ]
  Why: Faster app load, smoother scrolling
  Impact: Better performance with large datasets
  Risk: Low
  Command: `claude-code "Review all IndexedDB queries in lib/services/local-storage.ts and lib/stores/data-store.ts: 1) Use indexes for all queries, 2) Limit result sets with pagination, 3) Add query result caching for frequently accessed data, 4) Profile slow queries and optimize"`

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

**Last Updated**: October 29, 2025
**Branch**: feat/multi-session-detection
**Next Critical Items**: Fix cursor jumping, add DB duplicate prevention
**Total Tasks**: 100+ across all phases (Pre-merge → Month 3+ → Ongoing)
**Merged From**: POST_LAUNCH_ROADMAP.md (Phase 0-5 now integrated)
