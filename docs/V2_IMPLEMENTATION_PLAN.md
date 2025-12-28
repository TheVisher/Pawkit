# Pawkit V2 Implementation Plan

> **Purpose:** Track all features and enhancements needed before V2 launch
>
> **Created:** December 27, 2025
> **Status:** Active Development

---

## Table of Contents

1. [Major Features](#1-major-features)
2. [Small Enhancements](#2-small-enhancements)
3. [Technical Debt](#3-technical-debt)
4. [Implementation Order](#4-implementation-order)
5. [Settings Page](#5-settings-page)
6. [Reader Mode Enhancements](#6-reader-mode-enhancements)
7. [Multi-Media Content Extraction](#7-multi-media-content-extraction)
8. [Future Ideas (Post-V2)](#8-future-ideas-post-v2)

---

## 1. Major Features

### 1.1 Daily Notes
**Priority:** HIGH | **Effort:** Medium | **V1 Adoption:** 47.8%

Daily notes are date-linked markdown notes for journaling and daily capture.

#### Requirements
- [ ] Daily note data model (card with `isDailyNote` flag or dedicated type)
- [ ] "Today's Note" widget on Home dashboard
- [ ] Create/open daily note from Calendar day view
- [ ] Prev/Next day navigation in daily note editor
- [ ] Daily note templates (optional)
- [ ] Quick access from Omnibar ("today", "yesterday", "tomorrow")

#### Data Model
```typescript
// Option A: Use existing Card with metadata flag
{
  type: 'md-note',
  scheduledDate: Date,  // The date this note represents
  metadata: { isDailyNote: true }
}

// Option B: New card type
{
  type: 'daily-note',
  scheduledDate: Date
}
```

#### UI Locations
- Home dashboard: "Today's Note" card/widget
- Calendar day view: "View/Create Note" button
- Omnibar: Quick command to open today's note
- Library: Filter for daily notes

---

### 1.2 Card Scheduling UI
**Priority:** HIGH | **Effort:** Low | **V1 Adoption:** 40.2%

Allow users to assign bookmarks to specific dates (movie releases, concerts, game launches).

#### Requirements
- [ ] Date picker in card detail modal
- [ ] "Schedule" option in card context menu
- [ ] Time picker for specific times (optional)
- [ ] Remove schedule option
- [ ] Visual indicator on scheduled cards (calendar icon badge)
- [ ] "Add to Calendar" prompt for cards with detected dates

#### Already Have
- `scheduledDate` field in LocalCard ✅
- `scheduledStartTime` field in LocalCard ✅
- `scheduledEndTime` field in LocalCard ✅
- Calendar month view shows scheduled cards ✅

#### What's Missing
- Date picker UI in card detail modal
- "Schedule" context menu option
- Visual badge on cards with scheduled dates
- Release date auto-detection from metadata

---

### 1.3 Reader Mode
**Priority:** MEDIUM-HIGH | **Effort:** Medium

Clean article reading view for saved bookmarks.

#### Requirements
- [x] Reader component (clean typography, no distractions)
- [x] Extract and store article content on save
- [x] Toggle between card view and reader view in modal
- [x] Offline reading support (content stored locally)
- [x] Reading progress tracking (scroll position)
- [x] Font size controls
- [x] Dark/light mode for reader

#### Data Model Additions
```typescript
interface LocalCard {
  // Existing
  articleContent?: string;   // ✅ Already exists

  // New fields needed
  wordCount?: number;        // Calculated on scrape
  readingTime?: number;      // Minutes (wordCount / 225 WPM)
  readProgress?: number;     // 0-100 scroll percentage
  isRead?: boolean;          // Manual toggle or auto at 100%
  lastScrollPosition?: number; // Pixel position for resume
}
```

#### Implementation
1. Article extraction: Use `@mozilla/readability` or similar
2. Store in `articleContent` field
3. Reader component with typography styles
4. Track scroll position on unmount

---

### 1.4 Reading Time & Progress
**Priority:** MEDIUM | **Effort:** Low-Medium

Transform bookmarking from "save and forget" to "save and read."

#### Requirements
- [x] Calculate word count on URL scrape
- [x] Calculate reading time (words / 225 WPM)
- [x] Display reading time badge on cards (e.g., "5 min")
- [x] Read/Unread toggle on cards
- [x] Reading progress bar on card thumbnails
- [x] "In Progress" status when partially read
- [x] Library filters: Unread, In Progress, Read

#### Visual Design
```
┌─────────────────────┐
│  [thumbnail]    5m  │ ← Reading time badge
│  ▓▓▓▓▓▓░░░░░░░░░░  │ ← Progress bar (40%)
│  Article Title      │
│  example.com        │
└─────────────────────┘
```

---

### 1.5 Broken Link Detection
**Priority:** LOW-MEDIUM | **Effort:** Low

Identify dead bookmarks before users click them.

#### Requirements
- [x] Background job to check bookmark URLs
- [x] `linkStatus` field: 'ok' | 'broken' | 'redirect' | 'unchecked'
- [x] `lastLinkCheck` timestamp
- [x] Warning badge on broken link cards
- [x] "Broken Links" filter in Library (Link Status filter section)
- [x] Batch re-check option ("Re-check" button in filter section)
- [ ] Wayback Machine integration (optional - show archived version)

#### Implementation
- Run checks periodically (daily or weekly)
- HEAD request first (faster), fallback to GET
- Handle redirects (store final URL?)
- Rate limit to avoid overwhelming servers

---

### 1.6 Duplicate Detection
**Priority:** LOW-MEDIUM | **Effort:** Low

Prevent saving the same URL twice.

#### Requirements
- [x] Check for existing URL on save
- [x] "Already saved" notification with link to existing card
- [x] Option to: View existing, Update existing, or Save anyway
- [x] "Find Duplicates" toggle in Library (Duplicates filter section)
- [x] Duplicate count in Library filters

#### Implementation
- Normalize URLs before comparison (remove tracking params, www, trailing slash)
- Show existing card preview in modal
- Allow bulk duplicate cleanup

---

## 2. Small Enhancements

### 2.1 Home Dashboard
**Current State:** Minimal - just stat cards and getting started guide

- [ ] Recent items carousel (5 most recent cards)
- [ ] Today's Note widget (quick access)
- [ ] Mini calendar with dots for scheduled items
- [ ] Quick action buttons (Add Bookmark, New Note)
- [ ] Activity summary (This week: 12 saves, 3 notes)

---

### 2.2 Card Detail Modal
**Current State:** Feature-rich but missing some conveniences

- [x] Copy URL button (clipboard) - in right sidebar panel
- [x] Open Link button (external) - in right sidebar panel
- [ ] Schedule date picker
- [ ] Reading time display
- [ ] Read/Unread toggle
- [ ] Open in Reader Mode button
- [ ] Related cards (same tags) section
- [ ] Quick pin button in header

---

### 2.3 Library Page
**Current State:** Sophisticated filtering, some gaps

- [x] Empty state with helpful actions
- [x] "No results" state when filters return nothing
- [x] Reading status filter (Unread, In Progress, Read)
- [x] Broken links filter (Link Status filter section)
- [x] Duplicates filter (Show duplicates only toggle)
- [ ] Quick tag search in filter panel
- [ ] Scheduled cards filter (upcoming)

---

### 2.4 Card Grid/List
**Current State:** Good, some visual polish needed

- [ ] Reading time badge on cards
- [ ] Read progress bar on thumbnails
- [ ] Schedule date badge (calendar icon)
- [ ] Broken link warning icon
- [ ] Unread dot indicator

---

### 2.5 Add Card Form
**Current State:** Works but metadata is mocked

- [ ] Real metadata extraction (not mock)
- [ ] Loading skeleton during fetch
- [ ] Schedule date field
- [ ] Preview before save
- [ ] Bulk URL paste (multiple URLs)
- [ ] Recent/suggested tags
- [ ] Recent/suggested collections

---

### 2.6 Calendar
**Current State:** Views exist but not fully wired up

- [ ] Event creation modal
- [ ] Click date to create event
- [ ] Drag cards to dates (stretch goal)
- [ ] Daily note indicator on dates
- [ ] Color coding by card type
- [ ] Card preview on hover

---

### 2.7 Omnibar
**Current State:** Search works, could be enhanced

- [ ] "today" / "yesterday" / "tomorrow" commands for daily notes
- [ ] "schedule [card] for [date]" command
- [ ] Recent searches
- [ ] Keyboard shortcuts hint
- [ ] Filter syntax: "in:Collection", "tag:important"

---

### 2.8 Tags Page
**Current State:** Basic tree view

- [ ] Tag color customization
- [ ] Bulk rename/merge
- [ ] Usage statistics
- [ ] Orphan tag cleanup

---

### 2.9 Context Menus
**Current State:** Basic options

- [ ] "Schedule" option
- [ ] "Mark as Read/Unread" option
- [ ] "Open in Reader" option
- [ ] "Check Link" option

---

## 3. Technical Debt

### 3.1 Metadata Extraction
**Current State:** Mock in form, service exists but backend incomplete

- [ ] Real API endpoint for URL scraping
- [ ] Extract: title, description, image, favicon, author, publish date
- [ ] Extract: word count, reading time
- [ ] Auto-detect release dates (movies, games, concerts)
- [ ] Handle YouTube (extract video metadata)
- [ ] Rate limiting and caching

---

### 3.2 Database Fields
**Fields to add to LocalCard:**

```typescript
// Reading tracking
wordCount?: number;
readingTime?: number;       // Minutes
readProgress?: number;      // 0-100
isRead?: boolean;
lastScrollPosition?: number;

// Link health
linkStatus?: 'ok' | 'broken' | 'redirect' | 'unchecked';
lastLinkCheck?: Date;
redirectUrl?: string;       // If redirected
```

---

### 3.3 Missing API Endpoints
- [ ] `/api/metadata` - Real URL scraping
- [ ] `/api/link-check` - Check URL status
- [ ] Daily note CRUD helpers

---

### 3.4 Orphaned Data Cleanup
**Priority:** LOW | **Effort:** Low

Cards/collections can become orphaned when their workspace is deleted but the data remains in IndexedDB. This creates database bloat and confusing discrepancies.

#### Requirements
- [ ] `cleanupOrphanedData(currentWorkspaceId)` function in data store
- [ ] Run on app load, **after** initial data load (non-blocking)
- [ ] Use `requestIdleCallback` or `setTimeout` to defer execution
- [ ] Delete cards where `workspaceId` not in valid workspaces table
- [ ] Delete collections where `workspaceId` not in valid workspaces
- [ ] Log cleanup count for debugging (no user notification)
- [ ] Safety check: only run if `workspaces.length > 0`

#### Implementation
```typescript
// In dashboard-shell.tsx, after loadAll completes
useEffect(() => {
  if (!currentWorkspace) return;

  loadAll(currentWorkspace.id);
  purgeOldTrash(currentWorkspace.id, 30);

  // Deferred cleanup - runs after app is interactive
  const cleanup = () => cleanupOrphanedData(currentWorkspace.id);
  requestIdleCallback?.(cleanup) ?? setTimeout(cleanup, 1000);

}, [currentWorkspace, loadAll, purgeOldTrash]);

// In data-store.ts
cleanupOrphanedData: async (currentWorkspaceId) => {
  // Get all valid workspace IDs
  const workspaces = await db.workspaces.toArray();
  if (workspaces.length === 0) return 0; // Safety check

  const validIds = new Set(workspaces.map(w => w.id));

  // Find orphaned cards
  const allCards = await db.cards.toArray();
  const orphaned = allCards.filter(c => !validIds.has(c.workspaceId));

  // Delete them
  await Promise.all(orphaned.map(c => db.cards.delete(c.id)));

  if (orphaned.length > 0) {
    log.info(`Cleaned up ${orphaned.length} orphaned cards`);
  }

  return orphaned.length;
}
```

#### Notes
- This handles edge cases from V1 migrations, deleted workspaces, sync conflicts
- Silent operation - users don't need to know about database hygiene
- Low priority since it doesn't affect functionality, just storage efficiency

---

## 4. Implementation Order

### Phase 1: Foundation (Week 1)
**Goal:** Get scheduling and daily notes working

| Task | Effort | Dependencies |
|------|--------|--------------|
| Add reading fields to schema | Low | None |
| Date picker in card detail modal | Low | None |
| Schedule context menu option | Low | Date picker |
| Daily note data model | Low | None |
| Today's Note on Home | Medium | Daily note model |
| Daily note in Calendar day view | Medium | Daily note model |

---

### Phase 2: Reader Mode (Week 2)
**Goal:** Full read-later experience

| Task | Effort | Dependencies |
|------|--------|--------------|
| Article extraction service | Medium | None |
| Reader view component | Medium | None |
| Toggle in card modal | Low | Reader component |
| Reading progress tracking | Medium | Reader component |
| Reading time calculation | Low | Extraction service |

---

### Phase 3: Visual Polish (Week 3)
**Goal:** Cards show reading status and schedule

| Task | Effort | Dependencies |
|------|--------|--------------|
| Reading time badge on cards | Low | Reading time field |
| Progress bar on thumbnails | Low | Read progress field |
| Read/Unread toggle | Low | isRead field |
| Schedule date badge | Low | None |
| Library filters for read status | Low | isRead field |

---

### Phase 4: Link Health (Week 3-4)
**Goal:** Broken link detection

| Task | Effort | Dependencies |
|------|--------|--------------|
| Link check API endpoint | Medium | None |
| Background check job | Medium | API endpoint |
| Broken link badge on cards | Low | linkStatus field |
| Library filter for broken | Low | linkStatus field |

---

### Phase 5: Final Polish (Week 4)
**Goal:** Duplicate detection and UX improvements

| Task | Effort | Dependencies |
|------|--------|--------------|
| Duplicate detection on save | Medium | None |
| Find Duplicates utility | Low | None |
| Real metadata extraction | Medium | API work |
| Empty states polish | Low | None |
| Onboarding improvements | Low | None |

---

## Progress Tracking

### Major Features
| Feature | Status | Notes |
|---------|--------|-------|
| Daily Notes | ✅ Complete | Today's Note widget, Calendar day view integration |
| Card Scheduling UI | ✅ Complete | Date picker in modal, Schedule context menu |
| Reader Mode | ✅ Complete | Full reader with font controls, progress tracking |
| Reading Time/Progress | ✅ Complete | Time badges on cards, progress bar, read/unread filters |
| Broken Link Detection | ✅ Complete | API endpoint, badge on cards, link check service |
| Duplicate Detection | ✅ Complete | URL normalization, warning on save, view existing |

### Phase 1 Completed (Dec 27, 2025)
- ✅ Added reading/link health fields to database schema
- ✅ Added date picker to card detail modal
- ✅ Added Schedule submenu to card context menu
- ✅ Created daily note helpers in schema
- ✅ Added Today's Note widget to Home dashboard
- ✅ Added daily note integration to Calendar day view
- ✅ Added shadcn Calendar and Popover components

### Phase 2 Completed (Dec 27, 2025)
- ✅ Created Reader component with clean typography and DOMPurify sanitization
- ✅ Added font size controls (14-24px range)
- ✅ Added reading progress bar and percentage display
- ✅ Added reader mode toggle in card detail modal
- ✅ Added reading progress tracking (auto-saves on scroll)
- ✅ Auto-mark as read when progress reaches 95%
- ✅ Added reading time badge on grid cards
- ✅ Added read status badge on grid cards
- ✅ Added Mark Read/Unread toggle in card detail modal
- ✅ Added Reading Status filter in Library (All, Unread, In Progress, Read)
- ✅ Created article extraction service using @mozilla/readability
- ✅ Created /api/article endpoint for article extraction
- ✅ Integrated article extraction into metadata service queue
- ✅ Auto-extract articles when URL bookmarks are saved

### Phase 3 Completed (Dec 27, 2025)
- ✅ Added reading progress bar on card thumbnails (accent color fill)

### Phase 4 Completed (Dec 27, 2025)
- ✅ Created link-checker.ts service for URL validation
- ✅ Created /api/link-check endpoint (single and batch)
- ✅ Created link-check-service.ts for client-side queue
- ✅ Added broken link badge (red warning icon) on cards
- ✅ Support for HEAD and GET fallback requests
- ✅ Redirect detection and URL tracking

### Phase 5 Completed (Dec 27, 2025)
- ✅ Created url-normalizer.ts for URL comparison
- ✅ Removes tracking params (UTM, fbclid, etc.)
- ✅ Normalizes www prefix, trailing slashes, param order
- ✅ Real-time duplicate detection in add card form
- ✅ Warning banner with link to view existing bookmark

### Additional Enhancements (Dec 27, 2025)
- ✅ Link Status filter in Library (All, Valid, Broken, Redirect)
- ✅ "Re-check" button to batch re-check all links
- ✅ "Find Duplicates" toggle in Library (shows only cards with duplicate URLs)
- ✅ Duplicate count display in filter section
- ✅ Copy URL button in card details panel
- ✅ Open Link button in card details panel
- ✅ Empty state improvements (distinguishes "no items" vs "no results")
- ✅ "No matching items" state when filters return nothing

### Completed (Dec 28, 2025)
- ✅ Trash system with 30-day auto-purge
- ✅ Moved Trash from sidebar nav to workspace dropdown menu
- ✅ Added `_deletedAt` timestamp to SyncMetadata for tracking deletion time
- ✅ Added `restoreCard`, `permanentDeleteCard` functions to data store
- ✅ Added `loadTrashedCards`, `emptyTrash`, `purgeOldTrash` functions
- ✅ Created Trash page with restore/delete/empty functionality
- ✅ Auto-purge runs on app load (removes items older than 30 days)

### Backlog / TODO
| Task | Priority | Effort | Notes |
|------|----------|--------|-------|
| Orphaned data cleanup | Low | Low | Delete cards/collections from non-existent workspaces on app load (deferred, non-blocking) |
| Settings page | High | Medium | Theme, reader defaults, sync preferences |
| Real metadata extraction API | Medium | Medium | Replace mock with actual scraping |

### Status Legend
- ⬜ Not Started
- 🟡 In Progress
- ✅ Complete
- ⏸️ Blocked

---

## Pending Migrations

Run these before deploying to production:

```bash
# Migration 1: Reading tracking, link health, and daily notes
npx prisma migrate dev --name add_reading_and_daily_note_fields
```

**Fields added in this migration:**
- `wordCount`, `readingTime`, `readProgress`, `isRead`, `lastScrollPosition` (reading tracking)
- `linkStatus`, `lastLinkCheck`, `redirectUrl` (link health)
- `isDailyNote` (daily notes flag)
- Indexes on `isRead`, `isDailyNote`, `linkStatus`

---

---

## 5. Settings Page
**Priority:** HIGH | **Effort:** Medium

Currently no settings page exists. Users need a centralized place to configure preferences.

### 5.1 General Settings
- [ ] Theme preference (system, dark, light)
- [ ] Default view mode (grid, list, compact)
- [ ] Cards per page / infinite scroll toggle
- [ ] Date format preference
- [ ] Timezone setting

### 5.2 Reader Mode Settings
- [ ] **Default view:** Modal, Full Viewport, or Browser Fullscreen
- [ ] **Default theme:** Dark, Sepia, or Light
- [ ] **Default font size:** 14-24px (persist across sessions)
- [ ] **Font family:** Sans-serif (default), Serif, or System
- [ ] **Line spacing:** Compact, Normal, Relaxed
- [ ] **Content width:** Narrow (600px), Medium (800px), Wide (1000px)
- [ ] **Auto-mark as read:** At 95% scroll (current), 100%, or Manual only

### 5.3 Sync & Data Settings
- [ ] Sync frequency (real-time, every 5 min, manual)
- [ ] Offline mode toggle
- [ ] Clear local cache button
- [ ] Export data (JSON, CSV)
- [ ] Import bookmarks (Pocket, Instapaper, browser)

### 5.4 Notifications (Future)
- [ ] Daily reading reminder
- [ ] Scheduled item reminders
- [ ] Broken link alerts

---

## 6. Reader Mode Enhancements

Features we have vs. what's standard in reader apps:

### Currently Implemented
- [x] Clean article extraction (@mozilla/readability)
- [x] Font size controls (14-24px)
- [x] Theme toggle (dark/sepia/light)
- [x] Reading progress tracking (scroll %)
- [x] Auto-mark as read at 95%
- [x] Three-tier view (modal → viewport → fullscreen)
- [x] Word count and reading time display
- [x] On-demand extraction (user clicks "Reader Mode" to extract)

### Extraction Mode Note
Currently using **on-demand extraction** - articles are only extracted when user clicks "Reader Mode" button. This was changed from auto-extract-on-save because:
- Auto-extraction caused 2+ minute hangs on some URLs
- Not all saved URLs need reader mode
- Reduces server load and API calls

**Future option:** Add user preference in Settings:
- [ ] **Extraction mode:** "On-demand" (current) vs "Auto on save"
- [ ] If auto: queue extraction in background, don't block save
- [ ] Show "Extracting..." indicator on card while processing

### Missing Basic Features
- [ ] **Font family toggle** - Serif vs Sans-serif (readers expect this)
- [ ] **Line spacing control** - Compact/Normal/Relaxed
- [ ] **Persist preferences** - Font size, theme, view mode saved to localStorage/settings
- [ ] **Keyboard shortcuts** - Arrow keys for font size, T for theme, Esc to close
- [ ] **Estimated time remaining** - "3 min left" based on scroll position

### Nice-to-Have Features
- [ ] **Text-to-speech** - "Listen" mode (Web Speech API)
- [ ] **Article outline/TOC** - Jump to headings (extract h2/h3 from content)
- [ ] **Distraction-free mode** - Hide header/controls until hover

### 6.1 Highlighting & Annotations System

Progressive implementation from simple to advanced:

#### Phase 1: Basic Highlights (Persist Across Sessions)
- [ ] Select text in reader → floating toolbar appears → click highlight icon
- [ ] Highlight applies with default color (yellow)
- [ ] **Highlights persist** - saved to card metadata, survive close/refresh/sync
- [ ] Highlights render when article reopens (restore from saved positions)
- [ ] Visual indicator in card grid showing article has highlights

#### Phase 2: Highlight Interactions
- [ ] **Click highlight** → popover shows annotation (if exists) or "Add note" prompt
- [ ] **Right-click highlight** → context menu:
  - Change color (yellow, green, blue, pink)
  - Add/edit annotation
  - Copy text
  - Export to article notes
  - Delete highlight
- [ ] Annotation popover has text field for quick thoughts
- [ ] Annotations saved inline with highlight

#### User Flow Example
```
1. User reads article, selects important paragraph
2. Floating toolbar appears → clicks highlight icon → text highlighted yellow
3. Later, user right-clicks highlight → "Add note"
4. Popover appears with text field: "This relates to our mobile nav problem"
5. User saves, continues reading
6. Next week, user reopens article
7. Highlights are visible, clicks one → sees their note from last time
8. "Oh right, I was thinking about mobile nav!"
```

#### Phase 3: Unified Card Notes (Builds on V1)

V1 Pawkit already has a notes section per card. Expand this to be the unified home for both manual notes AND auto-saved highlights.

**Concept:** Each card has one "notes" field (markdown). When user highlights text in reader, it auto-appends to the card's notes in a structured format. User can also add their own notes manually.

- [ ] Card notes section shows in card detail modal (already exists in V1)
- [ ] "Notes" tab/button in reader mode opens notes panel
- [ ] **Auto-save highlights:** When user creates highlight, auto-append to card notes
- [ ] Format: blockquote + annotation + separator
- [ ] User can edit/reorder notes freely (it's just markdown)
- [ ] Click highlight reference in notes → scrolls to position in article

**Auto-append format:**
```markdown
> "The best interface is no interface at all."

This aligns with our mobile-first philosophy.

---
```

**Full example of a card's notes after reading:**
```markdown
# My Notes

Initial thoughts before reading: Heard this was a good article on design principles.

---

> "The best interface is no interface at all."

This aligns with our mobile-first philosophy. Less chrome = more content.

---

> "Users don't read, they scan."

Need to review our dashboard density. Maybe we're showing too much.

---

## Summary

Key takeaways:
- Simplify the nav
- Reduce information density
- Test with real users
```

#### Phase 4: Notes Panel in Reader
- [ ] Split or slide-out panel showing card notes while reading
- [ ] Real-time: see highlights appear as you create them
- [ ] Edit notes inline without leaving reader
- [ ] Toggle panel visibility (keyboard shortcut: `N`)

#### Data Model
```typescript
interface Highlight {
  id: string;
  cardId: string;           // Which article
  text: string;             // The highlighted text
  color: 'yellow' | 'green' | 'blue' | 'pink';
  startOffset: number;      // Character position in articleContent
  endOffset: number;
  annotation?: string;      // User's annotation (also saved to notes)
  createdAt: Date;
}

// LocalCard already has 'notes' field from V1
interface LocalCard {
  // ... existing fields
  notes?: string;           // Markdown notes (V1 - already exists)
  highlights?: Highlight[]; // For rendering highlights in reader
}
```

**Why both `highlights[]` and `notes`?**
- `highlights[]` stores position data for re-rendering highlights in the article
- `notes` is the human-readable markdown that users can edit freely
- When highlight is created: save to `highlights[]` AND append to `notes`
- This way notes remain editable markdown, not locked to highlight structure

#### Technical Notes
- Use character offsets (not DOM positions) for stability across re-renders
- Re-apply highlights by wrapping text ranges with `<mark>` elements
- Handle edge cases: article content changes, overlapping highlights
- Sync both `highlights` and `notes` via existing card sync mechanism
- If user deletes text from notes, highlight still shows (they're independent)

### 6.2 Research Mode (Future - Post V2)

Full split-view research workflow for power users.

#### Concept
User is reading an article about UI design. They want to actively build their "UI Design Research" note while reading. Instead of switching back and forth, they work in a split view.

#### UI Flow
```
┌─────────────────────────────────────────────────────────────┐
│  Reader Mode                    │  Research Note            │
│  ─────────────────────────────  │  ───────────────────────  │
│                                 │  # UI Design Research     │
│  Article content here...        │                           │
│                                 │  ## Key Principles        │
│  [User highlights this text]    │  - Less is more           │
│  ════════════════════════════   │  - [cursor here]          │
│         ↓ drag to note          │                           │
│                                 │  > "The best interface    │
│                                 │  > is no interface"       │
│                                 │  > — Article Title        │
│                                 │                           │
└─────────────────────────────────────────────────────────────┘
```

#### Features
- [ ] "Open Research Mode" button in reader toolbar
- [ ] Split view: Reader (left) + Note editor (right)
- [ ] Highlight in reader → drag to note position
- [ ] Auto-format as blockquote with source
- [ ] Note auto-saves as you edit
- [ ] Resizable split panes
- [ ] Mobile: swipe between reader and note (no split)

#### Entry Points
- Reader toolbar: "Research Mode" or "Take Notes" button
- Keyboard shortcut: `Cmd/Ctrl + Shift + N`
- Right-click highlight: "Open in Research Mode"

#### Technical Considerations
- Split view layout component (resizable)
- Drag-and-drop from reader to editor
- Keep both views scrollable independently
- Handle unsaved changes on close
- Mobile fallback (tab switching vs split)

---

## 7. Multi-Media Content Extraction

Extend reader mode beyond articles to support multiple content types with the same highlight/notes workflow.

### 7.1 YouTube Transcripts
**Priority:** HIGH | **Effort:** Medium

Extract YouTube video transcripts so users can read, highlight, and take notes on video content.

#### Why This Matters
- Users save YouTube videos to watch later
- Transcripts let them skim/search content quickly
- Same highlight → notes workflow as articles
- Research across articles AND videos in one place

#### Features
- [ ] Detect YouTube URLs (youtube.com, youtu.be)
- [ ] Extract transcript via API or library
- [ ] Store in `articleContent` field (same as articles)
- [ ] Display in reader mode with timestamps
- [ ] Click timestamp → link to that point in video
- [ ] Highlight transcript text → same notes system
- [ ] Show video thumbnail and metadata (duration, channel)

#### Technical Options
```typescript
// Option 1: youtube-transcript npm package (no API key)
import { YoutubeTranscript } from 'youtube-transcript';
const transcript = await YoutubeTranscript.fetchTranscript(videoId);

// Option 2: YouTube Data API v3 (requires API key)
// More reliable but needs API setup

// Option 3: yt-dlp / ytdl-core for metadata + captions
```

#### Transcript Format in Reader
```
[0:00] Introduction to the concept
[0:45] First key point about design systems
[1:23] "The best designs are invisible" ← user can highlight this
[2:10] Example walkthrough
...
```

#### Data Model Addition
```typescript
interface LocalCard {
  // ... existing fields
  contentType?: 'article' | 'youtube' | 'podcast' | 'pdf' | 'github';
  transcript?: string;        // For video/audio content
  duration?: number;          // Video/audio length in seconds
  timestamps?: boolean;       // Whether transcript has timestamps
}
```

---

### 7.2 Future Content Types

Same pattern can extend to:

| Content Type | Extraction Method | Effort |
|--------------|-------------------|--------|
| **Podcasts** | Whisper API / podcast RSS transcripts | High |
| **PDFs** | pdf.js or pdf-parse | Medium |
| **Twitter threads** | Twitter API / scraping | Medium |
| **Reddit posts** | Reddit API | Low |
| **GitHub repos** | README.md via raw URL | Low |

#### Vision
User saves any URL → Pawkit extracts readable content → User highlights and takes notes → All notes aggregate into research documents.

"I'm researching UI design" → Save 10 articles, 5 YouTube videos, 3 podcast episodes → Highlight key points from all of them → Export combined notes → Research complete.

---

## 8. Future Ideas (Post-V2)

### 8.1 Continuous Reading Queue
**Priority:** Future | **Effort:** Medium-High

Allow users to stay in reader mode and continuously scroll through multiple articles without returning to the library.

#### Concept
Instead of reading one article → closing → opening next, users can scroll past the end of an article to seamlessly load the next one. Queue can be based on:
- **Tag-based:** All articles tagged "UI Design"
- **Pawkit-based:** All articles in a collection
- **Manual queue:** User-curated reading list
- **Smart queue:** Unread articles sorted by reading time

#### Prior Art
| App | Implementation |
|-----|----------------|
| Matter | Explicit queue system, continuous flow |
| Apple News | Infinite scroll through curated articles |
| Flipboard | Swipe-based continuous reading by topic |
| Kindle | Continuous scroll through book series |
| Feedly | Keyboard shortcuts for mark-read-and-advance |

#### Technical Considerations
- Preload next article at ~80% scroll progress
- Intersection observer for transition detection
- Visual divider between articles ("Next: [Title]" preview)
- Memory management (don't load all articles at once)
- Graceful handling of failed extractions mid-queue
- Back navigation (re-read previous article)
- Clear "end of queue" state
- Session metrics (articles read, time spent)

#### UI Flow
```
┌─────────────────────────────────────┐
│  Article 1 Title                    │
│  ...content...                      │
│  ...content...                      │
│  ─────────────────────────────────  │
│  END OF ARTICLE                     │
│  ↓ Keep scrolling for next          │
│  ┌─────────────────────────────────┐│
│  │ NEXT: Article 2 Title           ││
│  │ 8 min read • example.com        ││
│  └─────────────────────────────────┘│
│  ...Article 2 content...            │
└─────────────────────────────────────┘
```

#### Entry Points
- "Read All" button on tag page
- "Start Reading Session" on Pawkit/collection
- "Continue Queue" in reader toolbar
- Keyboard shortcut from reader (e.g., `Q` to queue remaining)

---

**Last Updated:** December 27, 2025
