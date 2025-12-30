# Pawkit Roadmap

> **Prioritized implementation plan**
> **See also**: [IMPLEMENTED.md](./IMPLEMENTED.md) for current V2 features, [IDEAS.md](./IDEAS.md) for full idea bank

---

## Phase 1: Core V2 Completion

*Focus: Ship the essentials, fix what's broken*

### 1.1 Chrome Extension Fix (URGENT)

**Status**: Rejected by Chrome Web Store
**Issue**: Unused `scripting` permission

- [ ] Remove `scripting` from permissions
- [ ] Audit permissions - keep only: `storage`, `tabs`, `activeTab`, `contextMenus`
- [ ] Bump to v1.1.1
- [ ] Resubmit

### 1.2 Rediscover Mode

**Status**: Nav link exists, no implementation

- [ ] Full-screen immersive card review
- [ ] Animated gradient background
- [ ] Queue of cards to process
- [ ] Actions: Keep (K), Delete (D), Snooze (S), Add to Pawkit (P)
- [ ] Session stats tracking
- [ ] "To Categorize" system pawkit

### 1.3 Wiki-Links & Backlinks

**Status**: Schema/tables defined, no UI

- [ ] `[[Note Name]]` syntax parsing in Tiptap
- [ ] Backlinks panel in card details
- [ ] "Mentioned In" section
- [ ] Note-to-Note links
- [ ] Note-to-Card links

---

## Phase 2: Kit AI & Cloud Storage

*Focus: AI assistant and cloud integration*

### 2.1 Kit AI Basic Chat

**Status**: Schema only, no implementation

**Phase 2.1a - Infrastructure**:
- [ ] `/api/kit/chat` endpoint
- [ ] Claude Haiku integration
- [ ] Rate limiting (100/day)
- [ ] Usage tracking (`kit_usage` table)

**Phase 2.1b - Features**:
- [ ] Basic library search
- [ ] Tag suggestions on save
- [ ] Card summarization

**Phase 2.1c - Actions**:
- [ ] Create calendar events from chat
- [ ] Natural language date parsing
- [ ] Organize cards via commands

### 2.2 Filen Cloud Storage

**Status**: Schema fields only

- [ ] Login with 2FA support
- [ ] Direct browser-to-cloud uploads
- [ ] Folder structure: `Pawkit/_Library/`, `Pawkit/_Attachments/`
- [ ] Sync status indicators

### 2.3 Other Cloud Providers

- [ ] Google Drive OAuth + sync
- [ ] Dropbox OAuth + sync
- [ ] OneDrive (low priority)

---

## Phase 3: Connected Platforms

*Focus: Import from Reddit, YouTube, Twitter*

### 3.1 Reddit Integration

**Priority**: High (most accessible API, high user value)

- [ ] OAuth flow
- [ ] Import saved posts
- [ ] Auto-tag by subreddit
- [ ] Bulk unsave from Reddit
- [ ] Bypass 1000 limit

### 3.2 YouTube Integration

- [ ] OAuth flow
- [ ] Import playlists
- [ ] Create playlists from Pawkit
- [ ] Two-way sync

### 3.3 Twitter/X Integration

- [ ] File-based import (JSON export)
- [ ] OAuth when API access approved
- [ ] Full metadata preservation

---

## Phase 4: Knowledge Capture

*Focus: Topic Notes and capture flow*

### 4.1 Topic Notes

- [ ] Citation blocks with source attribution
- [ ] YouTube timestamp capture
- [ ] Reddit/Twitter citations
- [ ] Sources panel in notes

### 4.2 Rediscover → Capture Flow

- [ ] "Capture to Note" panel in Rediscover
- [ ] Quick capture field
- [ ] Note picker
- [ ] Side-by-side view

---

## Phase 5: MCP Server (BYOAI)

*Focus: Let users bring their own Claude*

### 5.1 Core MCP Server

- [ ] Create `@pawkit/mcp-server` npm package
- [ ] Read operations: `list_cards`, `list_notes`, `search`, `get_card`
- [ ] Write operations: `create_note`, `update_note`, `add_tags`, `move_to_pawkit`
- [ ] Auth via token (generated in settings)

### 5.2 Easy User Setup

- [ ] `npx pawkit-mcp-setup` auto-configuration
- [ ] In-app guided setup with copy-paste config
- [ ] OS-specific instructions
- [ ] Video walkthrough

---

## Phase 6: Import & Export

*Focus: Data portability*

### 6.1 Import System

| Source | Priority |
|--------|----------|
| Browser bookmarks (HTML) | High |
| Raindrop.io | High |
| Pocket | High |
| Notion | Medium |
| Obsidian | Medium |

### 6.2 Export System

- [ ] Full library export (HTML + markdown + files)
- [ ] Selective export by Pawkit/tag
- [ ] Scheduled automatic backups

---

## Phase 7: AI Features

*Focus: Embeddings and intelligence*

### 7.1 Embeddings

- [ ] Generate embeddings on import
- [ ] Store with pgvector
- [ ] Semantic similarity search

### 7.2 Cross-Platform Linking

- [ ] "Related Across Platforms" panel
- [ ] Suggested Topic Notes
- [ ] Smart Rediscover queues
- [ ] Knowledge map visualization

### 7.3 Kit OCR

- [ ] Auto-extract text from uploaded images
- [ ] Searchable offline
- [ ] Summarize documents
- [ ] Extract structured data

---

## Phase 8: Knowledge Graph

*Focus: Visual connections*

### 8.1 Per-Pawkit Graphs

- [ ] Items as nodes
- [ ] Connections via links, tags, similarity

### 8.2 Global Graph

- [ ] Pawkits as super-nodes
- [ ] Zoom in/out navigation
- [ ] Drag-drop arrangement

---

## Phase 9: Polish & Performance

*Focus: Speed and UX*

### 9.1 Performance

- [ ] Image caching in IndexedDB
- [ ] Virtualization for large libraries
- [ ] Bundle cleanup (remove unused deps)

### 9.2 UX Polish

- [x] **Settings Panel Integration** - Right sidebar gear icon expansion.
- [x] **Visual Style System** - Glass, Flat, High Contrast options.
- [x] **High Contrast WCAG AAA** - Full accessibility compliance (7:1+ contrast ratios, 2px borders, focus indicators, link underlines).
- [x] **Danger Zone** - Data deletion options implemented.
- [x] **Sidebar sliding highlight** - Added animated background for nav items.
- [x] **Pawkits Tree expansion** - Smooth slide animations added.
- [ ] **Keyboard shortcuts** - Global hotkeys for toggling sidebars (Cmd+\, Cmd+/).
- [ ] **Context Menu** - Right-click on sidebar items (partial implementation).
- [ ] **Vim-style navigation** - Early planning phase.

### 9.3 Mobile App

- [ ] Fix sidebar issues
- [ ] Document scanning
- [ ] Push notifications
- [ ] External TestFlight release

### 9.4 Tech Debt

*Codebase improvements identified from TODOs and audits*

- [ ] **Unified Delta Endpoint** - Replace N API calls with single `/api/sync/delta` on startup
- [ ] **Async Article Extraction** - Background worker/queue to re-enable auto-extraction without UI freeze
- [ ] **Auto-purge Trash Cron** - Scheduled job to permanently delete items older than 30 days
- [ ] **Connect Error Boundary to Sentry** - `src/components/error-boundary.tsx:26`
- [ ] **Remove unused dependencies** - moment, luxon (if still present)
- [ ] **Dead code removal** - 4 files with unused exports identified
- [ ] **Commented code cleanup** - 35+ lines of backup code to remove

### 9.5 Component Size Refactoring

*Large "God Components" that violate <300 line guideline*

| File | Lines | Issue | Recommended Split |
|------|-------|-------|-------------------|
| `card-list-view.tsx` | 1,515 | Massive "God Component" | ListRow, ColumnHeader, SortControls |
| `omnibar.tsx` | 1,495 | Search + toasts + navigation | ToastContainer, SearchResults |
| `card-item.tsx` | 623 | Too many responsibilities | CardImage, CardActions, CardMeta |
| `sync-service.ts` | 615 | Core sync logic | SyncQueue, ConflictResolver, OfflineHandler |

**Approach**: Extract sub-components one at a time, test after each extraction.

### 9.6 UI State Persistence Bugs

*User-reported state issues*

- [ ] **Sidebar close state** - Not persisting across view changes (per-view instead of global localStorage)
- [ ] **Card spacing/density** - Size settings not sticking between loads
- [ ] **Right sidebar auto-open** - Annoying behavior on navigation, should remember closed state
- [ ] **Theme toggle location** - Was removed from right sidebar during cleanup, needs clear home

**Root Cause**: Per-view state storage instead of global localStorage for persistent preferences.

---

## Phase 10: Monetization (Future)

*Focus: Sustainable business model*

### Potential Premium Features

| Feature | Price Idea |
|---------|------------|
| Google Calendar sync | $2-3/month |
| Apple Calendar (Nylas) | $1-2/month |
| Advanced AI features | Usage-based |
| Team/shared Pawkits | TBD |

---

## Explicitly Deferred

These were discussed but intentionally NOT planned:

| Feature | Reason |
|---------|--------|
| Board/Kanban view | Not in core vision |
| Native desktop apps | Web + PWA sufficient |
| Full collaborative | Requires auth overhaul |
| Separate Notes view | Notes are filtered cards |
| Note Folders | Use Pawkits + Tags |
| Separate Tasks nav | Tasks via Home widget |
| RSS/Podcast integration | Not core |
| Zotero integration | Niche academic |

---

## How Phases Work

1. **Complete Phase 1** before moving to Phase 2
2. **Items within a phase** can be done in any order
3. **Move items** between phases as priorities change
4. **New ideas** go to [IDEAS.md](./IDEAS.md) first, then promoted here

---

*Last Updated: December 30, 2025*
