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

- [ ] Remove heartbeat system (1 hour) - [implemented: ] [tested: ] [complete: ]
  Delete /app/api/sessions/heartbeat/route.ts and client-side heartbeat calls
  Regenerate Prisma client without DeviceSession model
  Why: Causing 500 errors, doesn't prevent race conditions, adds overhead

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

- ✅ **Skills Structure Setup**
  Created proper .claude/skills/ directory structure
  Added pawkit-project-context, pawkit-conventions, and pawkit-roadmap skills
  Skills now tracked in git for cross-session consistency

---

## BACKLOG - CRITICAL

**Do these next after current sprint**

### Post-Merge Cleanup

- [ ] Update multi-session-detection branch docs (1 hour) - [implemented: ] [tested: ] [complete: ]
  Update README with current architecture decisions
  Document the removal of heartbeat system and rationale
  Add guidance on database-level duplicate prevention
  Why: Keep documentation in sync with codebase

- [ ] Run production migration for unique constraint (30 min) - [implemented: ] [tested: ] [complete: ]
  Backup production database
  Apply userId_url unique constraint migration
  Monitor for migration errors or constraint violations
  Why: Must be done carefully on production data

### Post-Deploy Verification (24-48 hours)

- [ ] Monitor for Den-related issues (passive) - [implemented: N/A] [tested: ] [complete: ]
  Check error logs for Den/isPrivate errors
  Verify private pawkits remain isolated
  Confirm `is:den` search operator works
  Why: Ensure migration didn't break existing functionality

- [ ] Verify duplicate prevention in production (15 min) - [implemented: N/A] [tested: ] [complete: ]
  Test saving duplicate URLs from browser extension
  Check database for constraint violations in logs
  Confirm graceful handling of duplicates
  Why: Validate fix works in production environment

---

## BACKLOG - HIGH PRIORITY

**Month 1 - Performance & Polish**

### Performance Optimizations

- [ ] Optimize IndexedDB queries (3 hours) - [implemented: ] [tested: ] [complete: ]
  Profile slow queries in /lib/services/local-storage.ts
  Add indexes for common query patterns
  Implement query result caching
  Why: App slows down with 1000+ cards, improve perceived performance

- [ ] Implement virtual scrolling for card galleries (4 hours) - [implemented: ] [tested: ] [complete: ]
  Use react-window or react-virtualized in card-gallery.tsx
  Only render visible cards in viewport
  Maintain scroll position during navigation
  Why: Gallery becomes sluggish with 100+ cards

- [ ] Add incremental sync (6 hours) - [implemented: ] [tested: ] [complete: ]
  Track lastSyncTimestamp per resource type
  Only fetch cards/pawkits updated since last sync
  Reduce full sync to once per day
  Why: Current full sync gets slower as data grows

### UX Improvements

- [ ] Add loading skeletons (2 hours) - [implemented: ] [tested: ] [complete: ]
  Replace spinners with content-shaped skeletons
  Use in library, pawkit detail, and card modals
  Why: Better perceived performance and reduced layout shift

- [ ] Improve search result highlighting (3 hours) - [implemented: ] [tested: ] [complete: ]
  Highlight matched terms in card titles and descriptions
  Show snippet of matched content in notes
  Add "jump to match" for note results
  Why: Help users understand why results matched

- [ ] Add keyboard shortcuts reference (2 hours) - [implemented: ] [tested: ] [complete: ]
  Create modal with all keyboard shortcuts (Cmd+K, Cmd+/, etc.)
  Show hint on first visit
  Add "?" key to toggle modal
  Why: Power users want to know available shortcuts

---

## BACKLOG - FUTURE

**Month 2+ - Feature Expansions**

### Browser Extension Enhancements

- [ ] Add quick-save popup (1 week) - [implemented: ] [tested: ] [complete: ]
  Save current page without opening extension panel
  Show visual confirmation toast
  Add to specific pawkit with dropdown
  Why: Reduce friction for quick bookmarking

- [ ] Implement page snapshots (2 weeks) - [implemented: ] [tested: ] [complete: ]
  Capture screenshot on save
  Store full page HTML for offline reading
  Add "view snapshot" option in card detail
  Why: Pages change/disappear, snapshots preserve context

### Note-Taking Features

- [ ] Add bidirectional links panel (1 week) - [implemented: ] [tested: ] [complete: ]
  Show all notes that link to current note
  Display link context (surrounding text)
  Click to navigate to source
  Why: Enable Zettelkasten-style note networks

- [ ] Implement daily notes (3 days) - [implemented: ] [tested: ] [complete: ]
  Auto-create note for today with YYYY-MM-DD format
  Keyboard shortcut to open today's note (Cmd+Shift+D)
  Calendar view integration
  Why: Popular feature in Obsidian/Roam, users expect it

- [ ] Add block references (2 weeks) - [implemented: ] [tested: ] [complete: ]
  Reference specific paragraphs with `[[note#block-id]]`
  Auto-generate block IDs
  Show referenced blocks in context
  Why: More granular linking for knowledge management

### Collaboration Features

- [ ] Add shared pawkits (3 weeks) - [implemented: ] [tested: ] [complete: ]
  Invite users to collaborate on pawkit
  Set permissions (view, edit, admin)
  Real-time sync for shared pawkits
  Why: Teams want to share collections

- [ ] Implement comments on cards (1 week) - [implemented: ] [tested: ] [complete: ]
  Add comment thread to card detail
  Notify on new comments
  Support markdown in comments
  Why: Enable discussion around saved content

### Advanced Search

- [ ] Add saved searches (3 days) - [implemented: ] [tested: ] [complete: ]
  Save complex search queries
  Add to sidebar for quick access
  Update counts in real-time
  Why: Users repeat the same searches often

- [ ] Implement full-text search for PDFs (1 week) - [implemented: ] [tested: ] [complete: ]
  Extract text from uploaded PDFs
  Index in search database
  Highlight matches in PDF viewer
  Why: PDFs are common saved content, need searchability

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
**Next Critical Items**: Fix cursor jumping, remove heartbeat, add DB duplicate prevention
