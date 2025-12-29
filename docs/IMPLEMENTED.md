# Pawkit V2 - Implemented Features

> **Verified against actual V2 codebase** - December 28, 2025
> **See also**: [ROADMAP.md](./ROADMAP.md) for future features, [IDEAS.md](./IDEAS.md) for idea bank

---

## Core Features

### Bookmarking & Notes

| Feature | Status | Key Files |
|---------|--------|-----------|
| URL Bookmarking | ✅ | Omnibar, extension |
| Notes (Markdown) | ✅ | Tiptap editor with preview, auto-save |
| Card Types | ✅ | `url`, `md-note`, `text-note` |
| Quick Notes | ✅ | Lightweight sticky-note cards |
| Smart Todo Detection | ✅ | Auto-detects tasks in notes |

### Collections (Pawkits)

| Feature | Status | Key Files |
|---------|--------|-----------|
| Hierarchical Collections | ✅ | Nested structure, drag-drop |
| Cover Images | ✅ | Gradient fades, position/height sliders |
| Private Pawkits | ✅ | `isPrivate` flag, server-side filtering |
| Slug-based References | ✅ | Cards use `slug`, not `id` |

### Organization

| Feature | Status | Key Files |
|---------|--------|-----------|
| Tag System | ✅ | Multi-tag, hierarchy, colors |
| Virtual Tag Hierarchy | ✅ | Parent nodes that group children |
| Search | ✅ | Full-text, operators (`is:note`, `tag:`, `in:`) |
| Multiple Layouts | ✅ | Grid, List, Masonry (L-to-R), Compact |
| Duplicate Detection | ✅ | `src/lib/utils/url-normalizer.ts` |

**Virtual Tag Hierarchy**: Tags like `#dev` can exist solely to group children (`#dev/react`, `#dev/css`) without being assigned to cards themselves.

---

## Calendar System

**Status**: Fully Implemented

| Component | File |
|-----------|------|
| Month View | `src/components/calendar/month-view.tsx` |
| Week View | `src/components/calendar/week-view.tsx` |
| Day View | `src/components/calendar/day-view.tsx` |
| Agenda View | `src/components/calendar/agenda-view.tsx` |
| Events API | `src/app/api/events/route.ts` |

**Features**:
- Recurring events with rrules (freq, interval, byDay, until, count)
- Scheduled cards appear on calendar via `scheduledFor`
- US Holidays pre-populated
- Local browser notifications

---

## Smart Todo Detection

**Status**: Fully Implemented

| Component | File |
|-----------|------|
| Detection Logic | `src/lib/utils/todo-detection.ts` |
| Quick Note Integration | `src/components/cards/quick-note-card.tsx` |

**Features**:
- Regex patterns detect task-like phrases ("buy milk", "email erik", "call mom")
- Shows "Add to Todos" badge on matching quick notes
- One-click promotion from note to todo item
- **Dismissal Memory**: `dismissedTodoSuggestion` flag respects user intent ("Stop asking me")

---

## Reader Mode

**Status**: Fully Implemented
**File**: `src/components/reader/index.tsx` (350+ lines)

| Feature | Status |
|---------|--------|
| Distraction-free reading | ✅ |
| Font size (6 sizes) | ✅ |
| Themes (Dark/Sepia/Light) | ✅ |
| Fullscreen support | ✅ |
| Progress tracking | ✅ |
| Article extraction (on-demand) | ✅ |

**Article Extraction**:
- API endpoint: `src/app/api/article/route.ts`
- Extractor: `src/lib/services/article-extractor.ts`
- Uses @mozilla/readability for clean content
- **Note**: Auto-extraction on save is disabled for performance. Users trigger manually via Reader Mode.

---

## Reading Progress Tracking

**Status**: Fully Implemented

**Database Fields** (in `src/lib/db/types.ts`):
- `wordCount` - Word count from article
- `readingTime` - Estimated minutes (225 WPM)
- `readProgress` - 0-100 percentage
- `isRead` - Completion flag
- `lastScrollPosition` - Resume point

**UI Components**:
- Continue Reading Widget: `src/components/home/continue-reading-widget.tsx`
- Stats Banner: `src/components/home/stats-banner.tsx`

---

## Broken Link Detection

**Status**: Fully Implemented

| Component | File |
|-----------|------|
| Link Checker Service | `src/lib/services/link-checker.ts` |
| API Endpoint | `src/app/api/link-check/route.ts` |

**Features**:
- Batch checking (10 URLs/request)
- Status types: `ok`, `broken`, `redirect`, `unchecked`
- HEAD request with GET fallback
- SSRF protection (private IP blocking)
- Rate limiting: 10 requests/minute

---

## Home Dashboard

**Status**: Fully Implemented

| Widget | File |
|--------|------|
| Stats Banner | `src/components/home/stats-banner.tsx` |
| Daily Log | `src/components/home/daily-log-widget.tsx` |
| Scheduled Today | `src/components/home/scheduled-today-widget.tsx` |
| Continue Reading | `src/components/home/continue-reading-widget.tsx` |
| Recent Cards | `src/components/home/recent-cards-widget.tsx` |

**Stats Banner Metrics**:
- Streak counter
- Unread count
- In-progress count
- Weekly additions

**Daily Log Widget** (centerpiece):
- Timestamp-based entry logging (auto-appends to daily note)
- Quick entry field for instant capture
- Previous/next day navigation
- Opens full note on click
- Distinct from "Today's Note" - this is a structured log view

---

## Todos System

**Status**: Fully Implemented

| Component | File |
|-----------|------|
| Todos API | `src/app/api/todos/route.ts` |
| Todo CRUD | `src/app/api/todos/[id]/route.ts` |
| Validation | `src/lib/validations/todo.ts` |

**Features**:
- Full CRUD operations
- Home widget integration
- Overdue/Today/Upcoming categorization
- Sync with server

---

## Trash & Soft Delete

**Status**: Fully Implemented
**File**: `src/app/(dashboard)/trash/page.tsx`

**Features**:
- Soft delete with `deleted: true` flag and `deletedAt` timestamp
- 30-day retention policy (schema supports it)
- Restore functionality (single and bulk)
- "Empty Trash" for manual permanent deletion
- Cards, collections, events support

**Note**: Auto-purge cron job for 30-day cleanup not yet implemented. Users can manually empty trash.

---

## Workspaces

**Status**: Fully Implemented

| Component | File |
|-----------|------|
| Workspaces API | `src/app/api/workspaces/route.ts` |
| Workspace CRUD | `src/app/api/workspaces/[id]/route.ts` |
| Cleanup API | `src/app/api/user/cleanup-workspaces/route.ts` |
| Store | `src/lib/stores/workspace-store.ts` |

**Features**:
- Multi-workspace support
- Workspace switching
- Content scoped to workspace

---

## Today's Note

**Status**: Fully Implemented
**File**: `src/components/cards/todays-note-widget.tsx`

**Features**:
- Daily note creation/access
- Calendar integration
- Previous/next navigation
- Auto-creates for current day

---

## Sync Architecture

**Status**: Fully Implemented

```
User Action → Zustand Store (instant) → Dexie.js (IndexedDB)
     ↓
Sync Queue (2s debounce) → Background API → Supabase → Other devices
```

**Features**:
- Local-first (IndexedDB source of truth)
- Cross-tab coordination (BroadcastChannel)
- Conflict resolution (last-write-wins + metadata scoring)
- Multi-session detection ("Take Control" button)
- **Optimistic UI updates** - Instant feedback before database confirms
- **Sync-on-Close Strategy** - Modals trigger `triggerSync()` when dismissed for data consistency

**Key Files**:
- `src/lib/services/sync-service.ts`
- `src/lib/services/local-storage.ts`
- `src/lib/stores/data-store.ts`

**Duplicate Detection**:
- `view-store.ts` implements custom `findDuplicateCardIds` with internal URL normalizer
- Flags duplicates in UI even before backend processes them

---

## Security Features

| Feature | Status | Notes |
|---------|--------|-------|
| Rate Limiting | ✅ | `src/lib/rate-limit.ts` |
| RLS Policies | ✅ | All Supabase tables |
| SSRF Protection | ✅ | Link checker, metadata fetcher |
| User Isolation | ✅ | Per-user IndexedDB databases |
| Open Redirect Fix | ✅ | Allowlist validation |
| CSP Headers | ✅ | `next.config.ts` |
| Strong Passwords | ✅ | 12+ chars, mixed case, numbers |
| Article Extraction | ✅ | `src/app/api/article/route.ts` |

**SSRF Protection Details** (`src/lib/services/link-checker.ts`):
- Blocks private IP ranges (10.x, 172.16-31.x, 192.168.x, 127.x)
- Protocol validation (https/http only)
- Prevents server-side requests to internal infrastructure

**RLS (Row Level Security) Details**:
- All 11 public tables protected as of December 2025
- Optimized policy pattern: `(select auth.uid())` evaluated once vs per-row
- Per-user uniqueness constraints: collection slugs, card URLs

Protected Tables:
| Table | Policy |
|-------|--------|
| `cards` | User can only CRUD their own cards |
| `collections` | User can only CRUD their own collections |
| `events` | User can only CRUD their own events |
| `todos` | User can only CRUD their own todos |
| `tags` | User can only CRUD their own tags |
| `workspaces` | User can only access their workspaces |
| `card_tags` | Inherits from cards + tags policies |
| `card_collections` | Inherits from cards + collections policies |

Performance Indexes:
- `idx_cards_user_deleted` - (userId, deleted) for common queries
- `idx_cards_user_type` - (userId, type) for filtering
- `idx_collections_user_slug` - Unique per-user collection slugs

Migration Status: 14 migrations applied (December 2025)

---

## UI/UX System

| Feature | Status |
|---------|--------|
| HSL-based color tokens | ✅ |
| Surface hierarchy (bg-base → bg-surface-4) | ✅ |
| Glass/Modern mode toggle | ✅ |
| Light/Dark theme | ✅ |
| Context menu system | ✅ |
| Custom masonry layout | ✅ |
| Omnibar with toast morphing | ✅ |
| Cover images | ✅ |
| Drag-and-drop (dnd-kit) | ✅ |
| Smart collision detection | ✅ |
| Reading-order masonry | ✅ |

**Smart Collision Detection**:
- `use-omnibar-collision` hook implements 400px "safe zone"
- Prevents UI headers from overlapping with floating Omnibar
- Dynamic repositioning based on content

**Reading-Order Masonry**:
- Custom algorithm in `src/lib/utils/masonry.ts`
- Maintains Left-to-Right reading order during drag-and-drop
- Fixes common UX flaw where masonry grids break reading flow

---

## Browser Extensions

| Platform | Version | Status |
|----------|---------|--------|
| Chrome | 1.1.0 | ⚠️ Rejected (unused permission) |
| Firefox | 1.1.0 | ✅ Published |

**Implemented Features**:
- OAuth sign-in flow
- Image picker ("Select Thumbnail from Page")
- Collection selector dropdown
- Context menu actions

---

## Mobile App

| Platform | Status |
|----------|--------|
| iOS | 🧪 TestFlight Beta |
| Android | 🔄 In Development |

**Implemented**:
- Share Extension (expo-share-intent)
- Basic navigation

**Known Issues**:
- Sidebar not fully functional
- Pawkits showing empty

---

## Editor System (Tiptap)

**Status**: Fully Implemented
**File**: `src/components/editor/` + Tiptap extensions

| Feature | Status |
|---------|--------|
| Rich text formatting | ✅ Bold, italic, code, links |
| Markdown shortcuts | ✅ `#` headings, `-` lists, `[ ]` checkboxes |
| Floating toolbar | ✅ Appears on text selection |
| Task lists | ✅ Interactive checkboxes |
| Typography | ✅ Smart quotes, dashes |
| Auto-save | ✅ Debounced 500ms |
| Edit/Preview toggle | ✅ Switch modes |
| Keyboard navigation | ✅ ↑↓ Enter Esc in menus |

**Phase 7.2 Planned**: Wiki-links, inline tags, Kit AI integration

---

## Deployment & Infrastructure

**Status**: Production on Vercel

| Feature | Status | Notes |
|---------|--------|-------|
| Auto-deploy | ✅ | Push to main → instant deploy |
| Preview deployments | ✅ | Per-PR testing environments |
| Edge Functions | ✅ | Serverless compute |
| Environment variables | ✅ | Secure config via Vercel |
| Custom domain | ✅ | pawkit.app with SSL |
| Build monitoring | ✅ | Logs via Vercel dashboard |

**Recent Stats**: 20+ successful deployments

---

## Chunked File Upload

**Status**: Implemented
**Purpose**: Work around Vercel 4.5MB body limit

**How It Works**:
```
Browser → Split into 4MB chunks → Sequential API calls → Reassemble → Upload to Filen
```

**Features**:
- 4MB chunk size (safe for Vercel limits)
- Progress tracking (percentage shown)
- Retry logic (failed chunks can retry)
- Sequential processing (reliable ordering)

**Trade-off**: Double bandwidth usage, but enables large file uploads on serverless.

---

## Wired but Stubbed (Coming Soon)

These features have UI and state management wired up, but the implementation shows "Coming Soon":

| Feature | Location | Status |
|---------|----------|--------|
| Bulk Add Tags | `selection-store.ts` → `bulkAddTags()` | Stub with alert |
| Bulk Add to Collection | `selection-store.ts` → `bulkAddToCollection()` | Stub with alert |

**Context**: The multi-select infrastructure exists. These just need the actual bulk operations implemented.

---

## NOT Implemented (Common Misconceptions)

These are often assumed to be in V2 but are **not yet implemented**:

| Feature | Actual Status |
|---------|---------------|
| Filen integration | Schema fields only, no UI |
| Google Drive/Dropbox/OneDrive | Schema fields only, no UI |
| Kit AI Assistant | Schema + rate limit table, no API routes |
| Wiki-links & Backlinks | Schema tables defined, no UI parsing |
| Rediscover mode | Nav link exists, no page implementation |
| Cloudflare Turnstile CAPTCHA | Not found |
| MCP Server | Not started |

---

## Schema Only (Future-Ready)

These Prisma models exist in `prisma/schema.prisma` but have no UI or API implementation:

| Model | Purpose |
|-------|---------|
| `Citation` | Source references for Topic Notes (YouTube timestamps, Reddit quotes) |
| `QuickNoteArchive` | Weekly auto-consolidation of sticky notes |
| `ImportJob` | Bulk import tracking from connected platforms |
| `embedding` field | pgvector column on Cards for AI similarity search |
| `ConnectedAccount` | OAuth tokens for Reddit, YouTube, Twitter integrations |
| Cloud storage fields | `filenFileId`, `googleDriveId`, `dropboxPath` on Cards |

**Note**: These are "future-ready" - the database can store this data, but no code uses it yet.

---

## Key File Locations

```
src/components/calendar/     - Calendar views
src/components/reader/       - Reader mode
src/components/home/         - Dashboard widgets
src/lib/services/            - Sync, link-checker
src/lib/stores/              - Zustand stores
src/app/api/                 - API routes
src/app/(dashboard)/         - Dashboard pages
```

---

*Last Updated: December 29, 2025*
*Verification Method: Grep + file inspection against V2 codebase*
