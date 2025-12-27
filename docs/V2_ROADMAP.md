# Pawkit V2 Launch Roadmap

> **Goal:** Ship a minimal, polished bookmark manager with notes and calendar integration.
>
> **Philosophy:** Nail bookmarking, notes, and scheduling. Defer everything else.
>
> **Created:** December 27, 2025

---

## V2 Core Vision

**Elevator pitch:** A local-first bookmarking and note-taking app with calendar integration. Save URLs, write markdown notes with daily journals, organize in nested collections, and schedule content—all working offline-first.

---

## Current Status (What's Built)

### ✅ Complete & Working

| Feature | Status | Notes |
|---------|--------|-------|
| **Library** | ✅ Done | Grid, List, Masonry layouts with sorting/filtering |
| **Cards** | ✅ Done | Bookmarks + Notes with full CRUD |
| **Tags** | ✅ Done | Tag system with hierarchy, colors, validation |
| **Pawkits** | ✅ Done | Nested collections with covers, privacy |
| **Calendar** | ✅ Done | Month/Week/Day/Agenda views |
| **Scheduled Cards** | ✅ Done | Cards show on calendar via `scheduledDate` |
| **Events** | ✅ Done | Calendar events with recurrence |
| **Home Dashboard** | ✅ Done | Quick access, recent items |
| **Omnibar** | ✅ Done | Search + quick add menu |
| **Card Detail Modal** | ✅ Done | View/edit cards |
| **Note Editor** | ✅ Done | Markdown editor |
| **Right Sidebar** | ✅ Done | Filters, display settings (refactored) |
| **Sync System** | ✅ Done | Local-first with Dexie + server sync |

---

## Must-Have Before Launch

### 1. Daily Notes (Priority: HIGH)
**Why:** 47.8% adoption in V1 - this is a killer feature

**What to build:**
- [ ] Daily note card type (`type: 'daily-note'` or use date as identifier)
- [ ] "Today's Note" quick access from Home dashboard
- [ ] Calendar day view shows/creates daily note for that date
- [ ] Daily note templates (optional)
- [ ] Navigation between daily notes (prev/next day)

**Data model:** Use existing Card with:
```typescript
{
  type: 'md-note',
  scheduledDate: Date, // The date this note is for
  metadata: { isDailyNote: true }
}
```

---

### 2. Card Scheduling UI (Priority: HIGH)
**Why:** 40.2% calendar adoption - users want to schedule bookmarks

**What to build:**
- [ ] Date picker in card detail modal to set `scheduledDate`
- [ ] "Schedule" option in card context menu
- [ ] Auto-detect release dates from metadata (movies, games, concerts)
- [ ] "Add to Calendar" prompt when saving cards with detected dates
- [ ] Time picker for `scheduledStartTime` / `scheduledEndTime`

**Already have:** `scheduledDate`, `scheduledStartTime`, `scheduledEndTime` fields exist!

---

### 3. Reader Mode (Priority: MEDIUM-HIGH)
**Why:** Core read-it-later functionality that Pocket is famous for

**What to build:**
- [ ] Reader view component (clean article display)
- [ ] Parse and store `articleContent` on bookmark save
- [ ] Toggle between card view and reader view in modal
- [ ] Offline reading (content already stored locally)
- [ ] Reading progress tracking (scroll position)

**Data model additions:**
```typescript
interface LocalCard {
  // ... existing fields
  wordCount?: number;        // Calculated on scrape
  readingTime?: number;      // Minutes (wordCount / 225)
  readProgress?: number;     // 0-100 scroll percentage
  isRead?: boolean;          // Manual or auto at 100%
  lastScrollPosition?: number;
}
```

---

### 4. Reading Time & Progress (Priority: MEDIUM)
**Why:** Transforms "save and forget" into "save and read"

**What to build:**
- [ ] Calculate `readingTime` when scraping URLs
- [ ] Display reading time badge on cards (e.g., "5 min")
- [ ] Track scroll position in reader mode
- [ ] "Unread / In Progress / Read" filter in Library
- [ ] Progress bar on card thumbnails for in-progress items

---

### 5. Broken Link Detection (Priority: LOW-MEDIUM)
**Why:** Links die constantly (avg 100 days lifespan)

**What to build:**
- [ ] Background job to check bookmark URLs periodically
- [ ] `linkStatus` field: 'ok' | 'broken' | 'redirect' | 'unchecked'
- [ ] Warning badge on broken link cards
- [ ] "Broken Links" filter in Library

---

### 6. Duplicate Detection (Priority: LOW-MEDIUM)
**Why:** Prevents clutter, improves UX

**What to build:**
- [ ] Check for existing URL on save
- [ ] Show "Already saved" notification with link to existing card
- [ ] Option to update existing card or create duplicate
- [ ] "Find Duplicates" utility in settings/Library

---

## Nice-to-Have (Post-Launch)

| Feature | Priority | Notes |
|---------|----------|-------|
| **Highlights** | Low | Highlight text in articles |
| **Full-text search** | Medium | Search article content, not just titles |
| **Smart folders** | Low | Saved searches as virtual collections |
| **Quick Notes** | Medium | Rapid capture without full modal |
| **Note templates** | Low | Templates for daily notes, meeting notes, etc. |
| **Keyboard shortcuts** | Medium | Power user navigation |
| **Export** | Medium | Markdown, JSON export |

---

## Explicitly Deferred (Not in V2)

| Feature | Reason |
|---------|--------|
| **Cloud Storage** | 1.1% adoption in V1 - nobody uses it |
| **File Uploads** | 0% adoption in V1 |
| **Kit AI** | Cool but not core - save for V2.1 |
| **Wiki-links/Backlinks** | Power user feature - defer |
| **Knowledge Graph** | Ambitious - defer |
| **Board/Kanban** | Not in core vision |
| **Rediscover** | Niche feature - defer |
| **MCP Server** | Developer feature - defer |
| **Todos** | Keep calendar scheduling, skip task management |

---

## Build Order

### Phase 1: Daily Notes (Week 1)
1. Add daily note creation/retrieval logic
2. "Today's Note" on Home dashboard
3. Daily note in Calendar day view
4. Prev/Next day navigation

### Phase 2: Card Scheduling (Week 1-2)
1. Date picker in card detail modal
2. "Schedule" in context menu
3. Time picker for specific times
4. Release date detection (stretch goal)

### Phase 3: Reader Mode (Week 2-3)
1. Article content parsing on save
2. Reader view component
3. Toggle in card modal
4. Basic reading progress

### Phase 4: Reading Time & Status (Week 3)
1. Calculate/display reading time
2. Read/Unread/In Progress status
3. Library filters
4. Progress bar on cards

### Phase 5: Polish (Week 4)
1. Broken link detection
2. Duplicate detection
3. Better onboarding
4. Empty states
5. Bug fixes

---

## Success Metrics

- [ ] Daily notes work end-to-end
- [ ] Users can schedule bookmarks to calendar dates
- [ ] Reader mode shows clean article content
- [ ] Cards show reading time
- [ ] No critical bugs in core flows

---

## Technical Notes

### Existing Fields to Leverage
- `scheduledDate`, `scheduledStartTime`, `scheduledEndTime` - Already in schema!
- `articleContent` - Already in schema for reader mode!
- `summary`, `summaryType` - Already in schema!

### Fields to Add
```typescript
// Card additions for reading tracking
wordCount?: number;
readingTime?: number;
readProgress?: number;
isRead?: boolean;
lastScrollPosition?: number;
linkStatus?: 'ok' | 'broken' | 'redirect' | 'unchecked';
lastLinkCheck?: Date;
```

---

**Last updated:** December 27, 2025
