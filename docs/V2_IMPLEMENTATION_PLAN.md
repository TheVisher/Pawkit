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

**Last Updated:** December 27, 2025
