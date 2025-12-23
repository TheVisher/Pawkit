# Pawkit V2 Playbook

> **The definitive guide for building Pawkit V2**
>
> This document contains everything needed to build V2 from scratch while maintaining full feature parity with V1 and setting the foundation for all planned future features.
>
> **Created:** December 19, 2025
> **Updated:** December 19, 2025 — **V1 Analysis + Design Decisions Finalized**
> **For:** Claude Code and development reference

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Philosophy & Principles](#2-philosophy--principles)
3. [Tech Stack](#3-tech-stack)
4. [Data Model](#4-data-model)
5. [Architecture](#5-architecture)
6. [UI Structure](#6-ui-structure)
7. [Component Organization](#7-component-organization)
8. [Sync System](#8-sync-system)
9. [Kit AI & MCP](#9-kit-ai--mcp)
10. [Theming System](#10-theming-system)
11. [Migration Strategy](#11-migration-strategy)
12. [Deferred Features](#12-deferred-features)
13. [Build Order](#13-build-order)
14. **🆕 [Browser Extension Compatibility](#14-browser-extension-compatibility)**
15. **🆕 [Masonry Implementation Guide](#15-masonry-implementation-guide)**
16. **🆕 [V1 Feature Parity Checklist](#16-v1-feature-parity-checklist)**

---

## 1. Project Overview

### What is Pawkit?

Pawkit is a local-first, privacy-focused bookmark manager and personal knowledge base. Core identity: **"Your internet in your Pawkit"** - a portable browsing layer that transcends browsers and platforms.

### What is V2?

A ground-up rebuild that:
- Maintains **100% feature parity** with V1
- Fixes architectural issues (sync, DnD, massive components)
- Establishes foundation for all planned future features
- Uses modern, consistent component library (shadcn/ui)
- Implements proper event-driven sync (not polling)

### V2 Goals

| Goal | Description |
|------|-------------|
| **Feature Parity** | Everything V1 does, V2 does |
| **No Refactoring Later** | Foundation supports all roadmap items |
| **Blazing Fast** | Local-first, instant UI, background sync |
| **Consistent UI** | One design system, enforced everywhere |
| **Extensible** | Easy to add sidebar sections, views, features |

### Key Design Decisions

These decisions were made during V2 planning and differ from V1 patterns:

| Decision | Rationale |
|----------|-----------|
| **No separate Notes view** | Notes are cards filtered via Library → Content Type. Same grid/list/masonry layouts apply. |
| **Tasks = Home widget + modal** | No dedicated Tasks nav item. Click Tasks widget on Home → opens full Tasks modal. |
| **No Den feature** | Replaced by `isPrivate` flag on any Pawkit. Simpler, more flexible. |
| **Per-content-type view memory** | When filtering Library by Notes vs Bookmarks, each saves its own layout/sort preferences. |
| **View settings: split sync/local** | Layout and sort preferences sync. Card size and sidebar state stay device-local. |
| **No Note Folders** | Notes are organized via Pawkits + Tags, same as bookmarks. No separate folder system. |

---

## 2. Philosophy & Principles

### Local-First

- **IndexedDB (Dexie) is the source of truth**
- Load from local storage immediately on app open
- Render UI before any network calls
- Sync to server in background
- App works fully offline
- **🆕 User can disable server sync entirely (`serverSync` toggle)**

### Privacy-First

- User data stays on their device by default
- Server sync is optional backup
- Bring Your Own Storage (Filen, Google Drive, Dropbox)
- Bring Your Own AI (future - MCP/BYOAI model)
- No tracking, no analytics, no ads
- Private Pawkits via `isPrivate` flag on any collection

### User Control

- Workspaces for data isolation (personal vs work)
- Full customization (colors, backgrounds, layouts)
- Export/import data anytime
- No lock-in tactics

### Performance

- Everything loads instantly from local storage
- No blocking network calls during initialization
- Debounced background sync
- Optimistic UI updates
- **🆕 Image caching with LRU eviction for thumbnails**

---

## 3. Tech Stack

### Core Framework

| Layer | Technology | Reason |
|-------|------------|--------|
| **Framework** | Next.js 16.1.0 (App Router) | Current stable, RSC support |
| **Language** | TypeScript (strict) | Type safety, better DX |
| **Runtime** | React 19 | Latest features |
| **ORM** | Prisma 5.22.0 | **Strict Version:** Works reliably with Next.js without requiring Accelerate/driver adapters by default. |

### UI & Styling

| Layer | Technology | Reason |
|-------|------------|--------|
| **Components** | shadcn/ui | Consistent, accessible, customizable |
| **Styling** | Tailwind CSS | Utility-first, design tokens |
| **Theming** | CSS Variables | Runtime theme switching |
| **Icons** | Lucide React | Consistent icon set |

### State & Data

| Layer | Technology | Reason |
|-------|------------|--------|
| **UI State** | Zustand | Simple, minimal boilerplate |
| **Local DB** | Dexie.js | Reactive IndexedDB, better DX than idb |
| **Server DB** | Supabase (PostgreSQL) | RLS, Auth, Realtime, pgvector |
| **ORM** | Prisma | Type-safe queries, migrations |
| **Forms** | React Hook Form + Zod | Type-safe validation |

### Interactions

| Layer | Technology | Reason |
|-------|------------|--------|
| **Drag & Drop** | dnd-kit | Single unified system |
| **Masonry** | Custom implementation | Left-to-right ordering, full control |
| **Markdown** | @uiw/react-md-editor or similar | Wiki-links, preview |

**🆕 Note on Masonry:** V1 uses Muuri which orders top-to-bottom per column. V2 custom implementation MUST order left-to-right (reading order). See [Section 15](#15-masonry-implementation-guide) for implementation details.

### AI & Integrations

| Layer | Technology | Reason |
|-------|------------|--------|
| **AI SDK** | Vercel AI SDK | Streaming, tool calls |
| **MCP Server** | Custom (TypeScript) | External access to Pawkit |
| **Cloud Storage** | Direct APIs | Filen, Google Drive, Dropbox |

### Infrastructure

| Layer | Technology | Reason |
|-------|------------|--------|
| **Hosting** | Vercel | Next.js native, edge functions |
| **Auth** | Supabase Auth | OAuth, email, tokens |
| **Database** | Supabase PostgreSQL | Managed, RLS, extensions |
| **Extensions** | pgvector | Future AI embeddings |

---

## 4. Data Model

### Core Entities

#### User
```prisma
model User {
  id                    String   @id
  email                 String   @unique
  displayName           String?
  extensionToken        String?  @unique
  extensionTokenCreatedAt DateTime?
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  // 🆕 V1 PARITY: Local-only mode toggle
  serverSync            Boolean  @default(true)

  workspaces     Workspace[]
  settings       UserSettings?
  deviceSessions DeviceSession[]

  // 🆕 V1 PARITY: Connected platform accounts
  connectedAccounts ConnectedAccount[]
}
```

#### **🆕 DeviceSession (V1 PARITY)**
```prisma
// V1 has this for multi-device sync conflict resolution
model DeviceSession {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  deviceId    String
  deviceName  String
  browser     String?
  os          String?
  lastActive  DateTime @default(now())
  createdAt   DateTime @default(now())

  @@unique([userId, deviceId])
  @@index([userId])
  @@index([userId, lastActive])
}
```

#### **🆕 UserViewSettings (SYNCED PREFERENCES)**
```prisma
// Per-view AND per-content-type layout preferences (synced across devices)
model UserViewSettings {
  id          String   @id @default(cuid())
  workspaceId String
  workspace   Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)

  // View identifier: "library", "library:notes", "library:bookmarks", "pawkit:{slug}", etc.
  // Content type filters get their own saved state: "library:notes" vs "library:bookmarks"
  viewKey     String

  layout      String   @default("grid")  // grid, masonry, list, timeline, board
  sortBy      String   @default("createdAt")
  sortOrder   String   @default("desc")
  showTitles  Boolean  @default(true)
  showUrls    Boolean  @default(true)
  showTags    Boolean  @default(true)
  cardPadding Int      @default(2)       // 0-4 scale

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@unique([workspaceId, viewKey])
  @@index([workspaceId])
}

// NOTE: Device-specific settings stored in localStorage, NOT synced:
// - cardSize (slider value) - depends on screen size
// - sidebarCollapsed (left/right) - depends on screen width
// - sidebarAnchored (left/right) - depends on user's screen setup
//
// localStorage key: "pawkit_device_preferences"
// {
//   cardSize: 3,
//   leftSidebarCollapsed: false,
//   rightSidebarCollapsed: false,
//   leftSidebarAnchored: true,
//   rightSidebarAnchored: false
// }
```

#### Workspace (NEW)
```prisma
model Workspace {
  id        String   @id @default(cuid())
  name      String
  icon      String?  // emoji or icon identifier
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  isDefault Boolean  @default(false)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // All content belongs to a workspace
  cards          Card[]
  collections    Collection[]
  calendarEvents CalendarEvent[]
  todos          Todo[]
  viewSettings   UserViewSettings[]  // Per-view layout preferences (synced)

  @@index([userId])
}
```

#### Card
```prisma
model Card {
  id              String    @id @default(cuid())
  workspaceId     String
  workspace       Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)

  // Content
  type            String    @default("url")  // url, md-note, text-note, quick-note, file
  url             String
  title           String?
  description     String?
  content         String?   // Note content or extracted article

  // 🆕 V1 PARITY: Separate notes field (V1 has both content AND notes)
  notes           String?   // User notes/annotations separate from content

  // Metadata
  domain          String?
  image           String?   // Thumbnail URL
  favicon         String?
  metadata        Json?     // Flexible metadata from scraping

  // 🆕 V1 PARITY: Async metadata fetch status
  status          String    @default("PENDING")  // PENDING, READY, ERROR

  // 🆕 V1 PARITY: YouTube transcripts for Kit AI context
  transcriptSegments String?  // JSON array of transcript segments

  // AI & Future Features
  embedding       Unsupported("vector(1536)")?  // pgvector for similarity
  structuredData  Json?     // Kit-extracted rich data (dates, ingredients, etc.)
  source          Json?     // { type: 'manual' | 'extension' | 'kit' | 'reddit' | 'youtube', ... }

  // Organization
  tags            String[]  // Array of tag names
  collections     String[]  // Array of collection slugs
  pinned          Boolean   @default(false)

  // Scheduling
  scheduledDate   DateTime?
  scheduledStartTime String?
  scheduledEndTime   String?

  // Article/Reader
  articleContent  String?
  summary         String?
  summaryType     String?   // concise, detailed

  // Sync & State
  deleted         Boolean   @default(false)
  deletedAt       DateTime?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  // File support
  isFileCard      Boolean   @default(false)
  fileId          String?   // Reference to local IndexedDB file

  // Cloud sync
  cloudId         String?
  cloudProvider   String?
  cloudSyncedAt   DateTime?

  // Junction for notes in Pawkits (notes organized via Pawkits + Tags, NOT folders)
  collectionNotes CollectionNote[]

  // 🆕 ROADMAP: Citations for Topic Notes
  citations       Citation[]

  @@index([workspaceId])
  @@index([workspaceId, deleted])
  @@index([workspaceId, type])
  @@index([workspaceId, scheduledDate])
  @@index([workspaceId, status])  // 🆕 For filtering by metadata status
}
```

#### Collection (Pawkit)
```prisma
model Collection {
  id                   String    @id @default(cuid())
  workspaceId          String
  workspace            Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)

  name                 String
  slug                 String    // Unique per workspace
  parentId             String?   // For nesting
  position             Int       @default(0)  // For ordering

  // Display
  coverImage           String?
  coverImagePosition   Int?
  icon                 String?   // emoji

  // Settings
  isPrivate            Boolean   @default(false)
  isSystem             Boolean   @default(false)  // Cannot delete/rename
  hidePreview          Boolean   @default(false)
  useCoverAsBackground Boolean   @default(false)

  // Board/Kanban config
  metadata             Json?     // { boardColumns: [...], defaultView: 'board', ... }

  // State
  pinned               Boolean   @default(false)
  deleted              Boolean   @default(false)
  deletedAt            DateTime?
  createdAt            DateTime  @default(now())
  updatedAt            DateTime  @updatedAt

  collectionNotes      CollectionNote[]

  @@unique([workspaceId, slug])
  @@index([workspaceId])
  @@index([workspaceId, deleted])
  @@index([workspaceId, parentId])
}
```

#### CalendarEvent
```prisma
model CalendarEvent {
  id                  String    @id @default(cuid())
  workspaceId         String
  workspace           Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)

  title               String
  date                String    // YYYY-MM-DD
  endDate             String?   // For multi-day
  startTime           String?   // HH:mm
  endTime             String?   // HH:mm
  isAllDay            Boolean   @default(true)

  description         String?
  location            String?
  url                 String?
  color               String?

  // Recurrence
  recurrence          Json?
  recurrenceParentId  String?
  excludedDates       String[]  @default([])
  isException         Boolean   @default(false)

  // Source tracking
  source              Json?     // { type: 'manual' | 'card' | 'kit', cardId?, ... }

  deleted             Boolean   @default(false)
  deletedAt           DateTime?
  createdAt           DateTime  @default(now())
  updatedAt           DateTime  @updatedAt

  @@index([workspaceId])
  @@index([workspaceId, date])
}
```

#### Todo
```prisma
model Todo {
  id           String    @id @default(cuid())
  workspaceId  String
  workspace    Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)

  text         String
  completed    Boolean   @default(false)
  completedAt  DateTime?
  dueDate      DateTime?
  priority     String?   // high, medium, low

  // Future: Link to cards
  linkedCardId String?

  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt

  @@index([workspaceId])
  @@index([workspaceId, completed])
  @@index([workspaceId, dueDate])
}
```

#### Connection (NEW)
```prisma
model Connection {
  id          String   @id @default(cuid())
  userId      String

  provider    String   // filen, google-drive, dropbox, onedrive, mcp, reddit, youtube
  status      String   // connected, disconnected, error

  // Provider-specific config (tokens, folder IDs, etc.)
  config      Json?

  // For MCP
  apiToken    String?  @unique
  apiTokenHash String?

  lastSyncAt  DateTime?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@unique([userId, provider])
  @@index([userId])
}
```

#### **🆕 ConnectedAccount (ROADMAP FOUNDATION)**
```prisma
// For Reddit, YouTube, Twitter, Hacker News integrations
model ConnectedAccount {
  id              String   @id @default(cuid())
  userId          String
  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  platform        String   // reddit, youtube, twitter, hackernews
  platformUserId  String?  // Platform-specific user ID
  platformUsername String? // Display name on platform

  // OAuth tokens (encrypted in production)
  accessToken     String?
  refreshToken    String?
  tokenExpiry     DateTime?

  // Sync state
  lastSync        DateTime?
  syncCursor      String?  // Platform-specific pagination cursor
  syncStatus      String   @default("idle")  // idle, syncing, error
  lastError       String?

  // Platform-specific config
  config          Json?    // { subreddits: [...], playlists: [...], etc. }

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@unique([userId, platform])
  @@index([userId])
}
```

#### **🆕 ImportJob (ROADMAP FOUNDATION)**
```prisma
// For bulk import operations from connected platforms
model ImportJob {
  id              String   @id @default(cuid())
  userId          String
  workspaceId     String

  platform        String   // reddit, youtube, twitter
  jobType         String   // full-import, incremental, playlist-sync
  status          String   // pending, running, completed, failed, cancelled

  totalItems      Int?
  processedItems  Int      @default(0)
  skippedItems    Int      @default(0)
  errorCount      Int      @default(0)

  errors          Json?    // Array of error details

  startedAt       DateTime?
  completedAt     DateTime?
  createdAt       DateTime @default(now())

  @@index([userId])
  @@index([userId, status])
}
```

#### **🆕 Citation (ROADMAP FOUNDATION - Topic Notes)**
```prisma
// For Topic Notes with source citations
model Citation {
  id            String   @id @default(cuid())
  noteId        String   // The Topic Note containing this citation
  note          Card     @relation(fields: [noteId], references: [id], onDelete: Cascade)

  sourceType    String   // youtube, reddit, twitter, article, note, card
  sourceId      String?  // Platform-specific ID or card ID
  sourceUrl     String?

  // Citation content
  quote         String?  // Quoted text
  timestamp     String?  // Video timestamp like "2:34"
  author        String?
  platformMeta  Json?    // Platform-specific metadata (subreddit, channel, etc.)

  position      Int      @default(0)  // Order within the note

  createdAt     DateTime @default(now())

  @@index([noteId])
  @@index([sourceType, sourceId])
}
```

#### **🆕 QuickNoteArchive (ROADMAP FOUNDATION)**
```prisma
// For weekly auto-consolidation of quick notes
model QuickNoteArchive {
  id              String   @id @default(cuid())
  userId          String
  workspaceId     String

  weekStart       DateTime // Monday of the archive week
  consolidatedNoteId String // The note containing consolidated content
  sourceNoteIds   String[] // Original quick note IDs that were consolidated

  createdAt       DateTime @default(now())

  @@unique([userId, workspaceId, weekStart])
  @@index([userId, workspaceId])
}
```

#### CollectionNote (Junction)
```prisma
model CollectionNote {
  id           String   @id @default(cuid())
  collectionId String
  cardId       String
  position     Int      @default(0)
  createdAt    DateTime @default(now())

  collection   Collection @relation(fields: [collectionId], references: [id], onDelete: Cascade)
  card         Card       @relation(fields: [cardId], references: [id], onDelete: Cascade)

  @@unique([collectionId, cardId])
  @@index([collectionId])
  @@index([cardId])
}
```

### ID Strategy

- **Primary IDs:** `cuid()` for all entities
- **Pawkit slugs:** User-friendly URLs, unique per workspace
- **Card references to collections:** Use slugs, not IDs

### Future-Proofing Fields

| Field | Entity | Purpose |
|-------|--------|---------|
| `embedding` | Card | AI similarity search (pgvector) |
| `structuredData` | Card | Kit-extracted rich data |
| `source` | Card, CalendarEvent | Track origin (manual, Kit, Reddit, etc.) |
| `metadata` | Collection | Board config, custom settings |
| `linkedCardId` | Todo | Link tasks to cards |
| **🆕 `status`** | Card | Async metadata fetch tracking |
| **🆕 `transcriptSegments`** | Card | YouTube transcripts for Kit AI |
| **🆕 `notes`** | Card | User annotations separate from content |
| **🆕 `Citation`** | Model | Topic Notes source tracking |
| **🆕 `ConnectedAccount`** | Model | Platform OAuth and sync state |

---

## 5. Architecture

### Data Flow

```
User Action (click, type, drag)
       ↓
   Zustand Store (immediate UI update)
       ↓
   Dexie.js (persist to IndexedDB)
       ↓
   UI renders (instant, from local data)
       ↓
   Sync Queue (debounced, 2s)
       ↓
   Background API Call
       ↓
   Supabase (server backup)
       ↓
   Other devices (via next sync)
```

### App Initialization

```
1. Check authentication (Supabase session)
2. Sync User: Upsert user record into public.User (JIT Sync)
3. Workspace Recovery:
   - Check local Dexie for workspaces.
   - If empty, fetch from server (/api/workspaces).
   - If server has data, hydrate Dexie and set current workspace.
   - Only if both are empty, create ONE default workspace.
4. Load ALL data from Dexie for current workspace
5. Render UI immediately (no loading state)
6. Start background sync
7. Coordinate with other tabs via BroadcastChannel
```

### User Management

**Strategy:** Just-in-Time (JIT) Sync.

To bridge the gap between Supabase Auth and our Prisma schema, we use a JIT sync pattern:
- The `DashboardShell` ensures a `public.User` record exists during the first workspace check.
- This satisfies foreign key constraints for all subsequent content creation.
- A `workspaceEnsured` ref guard prevents double-initialization in React Strict Mode.

### Workspace Isolation

### UI Structure

#### Icon System (V2 Convention)

To maintain a high-density, professional look, V2 uses specific Lucide icon patterns:
- **Main Navigation Icons:** 24px (`h-6 w-6`)
- **Header Action Icons:** 20px (`h-5 w-5`)
- **List Item Icons:** 16px (`h-4 w-4`)
- **Stroke Weight:** Default (2px) unless otherwise specified.

**Action Mapping:**
- **Anchor Panel:** `Maximize2`
- **Float Panel:** `Minimize2`
- **Close Sidebar (Left):** `ArrowLeftToLine`
- **Open Sidebar (Left):** `ArrowRightFromLine`
- **Close Sidebar (Right):** `ArrowRightToLine`
- **Open Sidebar (Right):** `ArrowLeftFromLine`

### Layout Modes

**Standard Metrics (V1 Parity):**
- **Panel Gaps:** 16px (when floating)
- **Panel Rounding:** `rounded-2xl` (16px)
- **Header Spacing:** `pt-5 pb-4 px-6 min-h-[76px]`
- **Content Padding:** `px-6 pb-6`
- **Omnibar Position:** Centered horizontally in the content area (`absolute left-1/2 -translate-x-1/2`), 20px from top (`top-5`).

**🆕 Anchor Behavior:**
- **Floating:** All panels have 16px gaps and full border-radius.
- **Left Anchored:** Left panel merges with center (no gap, shared edge, `rounded-none` on shared side).
- **Right Anchored:** Right panel merges with center.
- **Both Anchored:** Single unified panel with outer-edge rounding only.
- **Full Screen Mode:** Activated when the Left Sidebar is anchored. Removes outer layout padding.

### Left Sidebar

```
┌─────────────────────────────┐
│ [👤]              [↗] [✕]  │  ← User avatar (flyout), anchor, close
└─────────────────────────────┘

Home
Library
Calendar
Rediscover (10)

PAWKITS ─────────────────── [▼]
├── Apps →
├── Arc Raiders
├── Computer Stuff
│   └── [nested children]
└── + New Pawkit

CONNECTIONS ────────────────[▼]
├── ☁️ Filen
├── 🔌 MCP
└── + Connect service
```

**User Avatar Flyout:**
```
┌─────────────────────────────┐
│ Erik                        │
│ erik@email.com              │
├─────────────────────────────┤
│ WORKSPACES                  │
│ ● Personal            ✓    │
│ ○ Work                      │
│ + Create workspace          │
├─────────────────────────────┤
│ ⚙️ Account settings         │
│ 🚪 Sign out                 │
└─────────────────────────────┘
```

**Collapsed State:**
- Sidebar fully hidden
- Center panel expands
- Hover on edge OR keyboard shortcut to reopen

### Right Sidebar

**Header (constant):**
```
[✕] [↗] [🌙/☀️] [🗑️] [⚙️]
close, anchor, theme toggle, trash, settings
```

**Library View:**
```
CONTENT TYPE ──────────────[▼]
├── 🔗 Bookmarks
├── 📝 Notes
├── 📺 Video
├── 🖼️ Images
├── 📄 Docs
├── 🎵 Audio
└── 📦 Other

NOTE FOLDERS ──────────────[▼]  ← Only visible when Content Type = Notes
├── 📁 Work Notes
├── 📁 Personal
│   └── 📁 Journal
└── 📁 Projects

TAGS ──────────────────────[▼]
├── #products (19)
├── #restaurants (9)
└── +20 more

SORT ──────────────────────[▼]
├── Recently Modified
├── Date Added ✓
├── Title A-Z
└── Domain

VIEW ──────────────────────[▼]
[Grid/List/Masonry dropdown]

DISPLAY ───────────────────[▼]
[Card size slider, toggles]
```

**Per-Content-Type View Memory:** When user filters by Content Type (e.g., Notes), their view preferences (layout, sort) are saved separately. Switching to Bookmarks uses that content type's saved preferences.

**Calendar View:**
```
VIEW ──────────────────────[▼]
├── Month
├── Week

SHOW ──────────────────────[▼]
├── ☑️ Events
├── ☑️ Scheduled Cards
├── ☑️ Tasks
├── ☑️ Daily Notes
├── 🆕 ☑️ Holidays (with country picker)
```

**🆕 Calendar Preferences:**
```
PREFERENCES ───────────────[▼]
├── Week starts: [Sunday ▼]
├── Show holidays: [US ▼]
```

**Pawkit View:**
```
PAWKIT ────────────────────[▼]
├── Cover image
├── Privacy settings
├── Board config (if Kanban)

[Same filters as Library]
```

### Omnibar (Top Center)

```
┌──────────────────────────────────────────────────────┐
│ [+] [ Search Pawkit...                    ] [⌘K] [?] │
└──────────────────────────────────────────────────────┘
```

**🆕 Omnibar-Toast System (Signature Feature)**

The Omnibar doubles as the global toast/notification container.
1. **Morphing:** When a notification triggers, the Omnibar morphs from a Search input into a Toast display.
2. **Elastic Entry:** New toasts "push through" the bar with an elastic, high-energy animation.
3. **Spring Stack:** Multiple toasts "pop out" below the bar using spring physics.
4. **Directional Growth:** The stack grows downward from the top-center.
5. **Auto-Fade:** Oldest toasts fade out based on a 5s duration or manual dismissal.
6. **Implementation:** Powered by `framer-motion` for spring/elastic physics.

**+ Menu:**
```
┌─────────────────────────┐
│ 🔗 Add Bookmark    ⌘B   │
│ 📝 New Note        ⌘N   │
│ 📋 Quick Note           │
│ 📁 Upload File          │
│ 📅 New Event            │
│ ✓ New Task        ⌘T   │
└─────────────────────────┘
```

**New Task (inline in + menu):**
```
│ ✓ New Task        ⌘T   │
│ ┌─────────────────────┐ │
│ │ Buy groceries...    │ │  ← Input appears
│ └─────────────────────┘ │
│ [Enter to add]          │
```

### Views

| View | Purpose | Layouts Available |
|------|---------|-------------------|
| **Home** | Dashboard with widgets | Fixed layout |
| **Library** | All content (filterable by type) | Grid, List, Masonry, Timeline |
| **Calendar** | Time-based view | Month, Week |
| **Pawkit** | Collection contents | Grid, List, Masonry, Board |
| **Rediscover** | Tinder-style review | Card stack |

**Note:** There is no dedicated Notes view. Notes are cards with `type: 'md-note'` and appear in Library when filtered by Content Type → Notes.

**Home Dashboard Widgets:**
- **Tasks Widget** - Shows overdue (red), today's tasks, upcoming count. Click to open Tasks Modal.
- Today's Note
- Recent Items
- Quick Access (pinned)
- This Week calendar strip

**Tasks Modal (opened from Tasks Widget):**
```
┌─────────────────────────────────────────────────┐
│ Tasks                                      [✕]  │
├─────────────────────────────────────────────────┤
│ [Active] [Completed]              ← Tab toggle  │
├─────────────────────────────────────────────────┤
│ OVERDUE                                         │
│ ☐ Fix sync bug                      Dec 15     │
│                                                 │
│ TODAY                                           │
│ ☐ Review PR                         Dec 19     │
│                                                 │
│ UPCOMING                                        │
│ ☐ Christmas shopping                Dec 22     │
│                                                 │
│ NO DUE DATE                                     │
│ ☐ Research frameworks                          │
├─────────────────────────────────────────────────┤
│ [+ Add task...]                                 │
└─────────────────────────────────────────────────┘
```

**Note:** Tasks do NOT have a dedicated view in left sidebar navigation. They're accessed via Home widget → Tasks Modal.

### Modals

**Standard Modal:**
```
┌─────────────────────────────────────────────────┐
│ Title                                      [✕]  │
├─────────────────────────────────────────────────┤
│                                                 │
│  Content area                                   │
│                                                 │
├─────────────────────────────────────────────────┤
│                        [Cancel] [Primary Action]│
└─────────────────────────────────────────────────┘
```

Use shadcn/ui Dialog component for all modals.

### Mobile Layout

- Single panel view (no sidebars visible by default)
- Bottom tab navigation for main sections
- Swipe gestures for sidebars
- Full-width content area
- Responsive breakpoints:
  - `< 768px`: Mobile (single panel)
  - `768px - 1024px`: Tablet (optional sidebars)
  - `> 1024px`: Desktop (full 3-panel)

---

## 7. Component Organization

### File Structure

```
src/
├── app/                        # Next.js App Router
│   ├── (auth)/                 # Auth routes (login, signup)
│   ├── (dashboard)/            # Main app routes
│   │   ├── w/[workspace]/      # Workspace-scoped routes
│   │   │   ├── home/
│   │   │   ├── library/
│   │   │   ├── calendar/
│   │   │   ├── rediscover/
│   │   │   ├── pawkits/[slug]/
│   │   │   └── settings/
│   │   └── layout.tsx          # Dashboard layout
│   └── api/                    # API routes
│       ├── cards/
│       ├── collections/
│       ├── events/
│       ├── todos/
│       ├── sync/
│       ├── kit/
│       ├── mcp/
│       └── extension/          # 🆕 Extension auth endpoints
│
├── components/
│   ├── ui/                     # shadcn/ui components
│   │   ├── button.tsx
│   │   ├── dialog.tsx
│   │   ├── dropdown-menu.tsx
│   │   ├── input.tsx
│   │   └── ...
│   │
│   ├── layout/                 # Layout components
│   │   ├── dashboard-layout.tsx
│   │   ├── sidebar-left.tsx
│   │   ├── sidebar-right.tsx
│   │   ├── center-panel.tsx
│   │   ├── omnibar.tsx
│   │   └── mobile-nav.tsx
│   │
│   ├── sidebar-sections/       # Modular sidebar sections
│   │   ├── nav-items.tsx
│   │   ├── pawkits-tree.tsx
│   │   ├── connections-list.tsx
│   │   ├── content-type-filter.tsx
│   │   ├── tags-filter.tsx
│   │   ├── sort-options.tsx
│   │   ├── view-options.tsx
│   │   └── display-options.tsx
│   │
│   ├── views/                  # View components
│   │   ├── grid-view.tsx
│   │   ├── list-view.tsx
│   │   ├── masonry-view.tsx
│   │   ├── timeline-view.tsx
│   │   └── board-view.tsx
│   │
│   ├── cards/                  # Card display components
│   │   ├── card-base.tsx
│   │   ├── card-bookmark.tsx
│   │   ├── card-note.tsx
│   │   ├── card-file.tsx
│   │   └── card-actions.tsx
│   │
│   ├── modals/                 # Modal dialogs
│   │   ├── card-detail-modal.tsx
│   │   ├── create-pawkit-modal.tsx
│   │   ├── create-event-modal.tsx
│   │   ├── tasks-modal.tsx
│   │   ├── settings-modal.tsx
│   │   └── workspace-switcher.tsx
│   │
│   ├── calendar/               # Calendar components
│   │   ├── month-view.tsx
│   │   ├── week-view.tsx
│   │   ├── day-cell.tsx
│   │   └── event-item.tsx
│   │
│   ├── kit/                    # Kit AI components
│   │   ├── kit-chat-panel.tsx
│   │   ├── kit-overlay.tsx
│   │   ├── kit-message.tsx
│   │   └── kit-input.tsx
│   │
│   ├── home/                   # Home dashboard widgets
│   │   ├── tasks-widget.tsx
│   │   ├── recent-items-widget.tsx
│   │   ├── quick-access-widget.tsx
│   │   └── week-strip-widget.tsx
│   │
│   ├── rediscover/             # 🆕 Rediscover components
│   │   ├── card-stack.tsx
│   │   ├── orbiting-cards.tsx
│   │   ├── swipe-actions.tsx
│   │   └── batch-progress.tsx
│   │
│   └── shared/                 # Shared components
│       ├── loading.tsx
│       ├── error-boundary.tsx
│       ├── empty-state.tsx
│       └── confirm-dialog.tsx
│
├── lib/
│   ├── db/                     # Database layer
│   │   ├── dexie.ts            # Dexie instance & schema
│   │   ├── queries.ts          # Dexie query helpers
│   │   └── migrations.ts       # Local DB migrations
│   │
│   ├── stores/                 # Zustand stores
│   │   ├── workspace-store.ts
│   │   ├── cards-store.ts
│   │   ├── collections-store.ts
│   │   ├── calendar-store.ts
│   │   ├── todos-store.ts
│   │   ├── ui-store.ts         # Sidebar state, modals, etc.
│   │   ├── sync-store.ts
│   │   ├── conflict-store.ts   # 🆕 Sync conflict notifications
│   │   ├── drag-store.ts       # 🆕 DnD cross-component state
│   │   └── file-store.ts       # 🆕 File/attachment management
│   │
│   ├── services/               # Business logic
│   │   ├── sync-service.ts
│   │   ├── sync-queue.ts       # 🆕 Retry queue
│   │   ├── metadata-service.ts # URL scraping
│   │   ├── search-service.ts
│   │   ├── kit-service.ts
│   │   └── image-cache.ts      # 🆕 LRU thumbnail cache
│   │
│   ├── hooks/                  # Custom React hooks
│   │   ├── use-cards.ts
│   │   ├── use-collections.ts
│   │   ├── use-workspace.ts
│   │   ├── use-keyboard-shortcuts.ts
│   │   ├── use-dnd.ts
│   │   ├── use-sync-triggers.ts    # 🆕
│   │   └── use-network-sync.ts     # 🆕
│   │
│   ├── utils/                  # Utility functions
│   │   ├── cn.ts               # className helper
│   │   ├── date.ts
│   │   ├── slug.ts
│   │   └── validation.ts
│   │
│   ├── auth/                   # 🆕 Auth utilities
│   │   └── extension-auth.ts   # Extension token validation
│   │
│   └── types/                  # TypeScript types
│       ├── card.ts
│       ├── collection.ts
│       ├── workspace.ts
│       └── api.ts
│
├── styles/
│   ├── globals.css             # Global styles, CSS variables
│   └── themes.css              # Theme definitions
│
└── prisma/
    ├── schema.prisma
    └── migrations/
```

### Component Patterns

**Adding a new sidebar section:**
1. Create component in `components/sidebar-sections/`
2. Import into `sidebar-left.tsx` or `sidebar-right.tsx`
3. Add to render with appropriate collapse behavior

**Adding a new view:**
1. Create component in `components/views/`
2. Add to view switcher in `view-options.tsx`
3. Handle in parent container

**Adding a new modal:**
1. Create component in `components/modals/`
2. Add open/close state to `ui-store.ts`
3. Render in layout (single modal mount point)

**🆕 File Size Guidelines (ENFORCED):**
- Components: < 300 lines
- Stores: < 500 lines
- Services: < 400 lines
- If larger, split into smaller modules
- **V1 had 77KB card-gallery.tsx and 112KB card-detail-modal.tsx - DO NOT REPEAT**

---

### Sync System

**Status:** Local-first engine implemented (Dexie + Queue). Server-side sync pending.

**Implementation Plan (5 Phases):**

| Phase | What | Objective |
|-------|------|-----------|
| **1** | **API Routes** | Create Next.js API routes for `cards`, `collections`, `workspaces`, `events`, `todos`. Must use Supabase Auth for RLS. |
| **2** | **Sync Service** | Implement the background worker (`lib/services/sync-service.ts`) to consume the Dexie `syncQueue` and call the API. |
| **3** | **Delta Sync** | Build `/api/sync/delta` to fetch only changed items since `lastSyncTime`. |
| **4** | **Initial Sync** | Implement the merge logic to hydrate Dexie from the server on fresh app load. |
| **5** | **Conflict Resolution** | Implement "Active Device Priority" and metadata scoring logic. |

**Priority:** Cards First. Get Card sync working end-to-end before moving to other entities.

### API Strategy & Security (Standard Pattern)

All API routes (`cards`, `collections`, `events`) must adhere to this strict pattern:

1.  **Auth First:**
    *   Call `supabase.auth.getUser()` immediately.
    *   If no session, return `401 Unauthorized`.
    *   **Always** derive `userId` from the session, never the request body.

2.  **Workspace Isolation:**
    *   Every query MUST filter by `workspaceId`.
    *   Verify the session `userId` actually belongs to the target `workspaceId`.

3.  **Privacy (404 over 403):**
    *   If a resource exists but belongs to another user, return `404 Not Found`. Do not leak existence via `403`.

4.  **Standard Endpoints:**
    *   `GET /api/[resource]`: List with filters (`workspaceId`, `since` timestamp for delta).
    *   `POST /api/[resource]`: Create new.
    *   `GET /api/[resource]/[id]`: Fetch single.
    *   `PATCH /api/[resource]/[id]`: Update partial.
    *   `DELETE /api/[resource]/[id]`: **Soft delete** only (`deleted: true`).

### Dexie Schema

```typescript
// lib/db/dexie.ts
import Dexie, { Table } from 'dexie';

interface LocalCard {
  id: string;
  workspaceId: string;
  // ... all Card fields
  _localOnly?: boolean;      // Not yet synced to server
  _pendingSync?: boolean;    // Has unsynced changes
  _serverVersion?: string;   // Server's updatedAt for conflict detection
}

class PawkitDB extends Dexie {
  cards!: Table<LocalCard>;
  collections!: Table<LocalCollection>;
  events!: Table<LocalEvent>;
  todos!: Table<LocalTodo>;
  syncQueue!: Table<SyncQueueItem>;
  metadata!: Table<{ key: string; value: any }>;

  // 🆕 V1 PARITY: Wiki-link tracking
  noteLinks!: Table<NoteLink>;
  noteCardLinks!: Table<NoteCardLink>;

  // 🆕 V1 PARITY: Image/thumbnail cache
  imageCache!: Table<CachedImage>;

  constructor() {
    super('pawkit');

    this.version(1).stores({
      cards: 'id, workspaceId, [workspaceId+deleted], [workspaceId+type], [workspaceId+status], updatedAt',
      collections: 'id, workspaceId, [workspaceId+slug], [workspaceId+deleted], parentId',
      events: 'id, workspaceId, [workspaceId+date], [workspaceId+deleted], recurrenceParentId',
      todos: 'id, workspaceId, [workspaceId+completed], [workspaceId+dueDate]',
      syncQueue: '++id, entityType, entityId, operation, createdAt',
      metadata: 'key',
      // 🆕 Wiki-link indexes
      noteLinks: 'id, sourceNoteId, targetNoteId',
      noteCardLinks: 'id, sourceNoteId, targetCardId',
      // 🆕 Image cache with LRU support
      imageCache: 'id, cachedAt, lastAccessedAt'
    });
  }
}

export const db = new PawkitDB();
```

### **🆕 Image Cache Schema**

```typescript
interface CachedImage {
  id: string;           // Normalized URL or image ID
  blob: Blob;
  mimeType: string;
  size: number;
  cachedAt: Date;
  lastAccessedAt: Date;
}

// LRU eviction - remove oldest accessed when cache exceeds limit
const MAX_CACHE_SIZE_MB = 100;
```

### Sync Queue

```typescript
interface SyncQueueItem {
  id?: number;
  entityType: 'card' | 'collection' | 'event' | 'todo' | 'noteFolder';
  entityId: string;
  operation: 'create' | 'update' | 'delete';
  payload: any;
  createdAt: Date;
  attempts: number;
  lastError?: string;
}

// 🆕 Retry configuration
const SYNC_RETRY_CONFIG = {
  maxAttempts: 3,
  backoffMs: [1000, 5000, 15000],  // Exponential backoff
  giveUpAfterMs: 24 * 60 * 60 * 1000  // Give up after 24 hours
};
```

### Sync Flow

**On data change:**
```typescript
async function updateCard(id: string, updates: Partial<Card>) {
  // 1. Update Dexie immediately
  await db.cards.update(id, {
    ...updates,
    updatedAt: new Date().toISOString(),
    _pendingSync: true
  });

  // 2. Update Zustand (triggers re-render)
  cardsStore.getState().updateCard(id, updates);

  // 3. Queue sync (debounced)
  syncService.queueSync({
    entityType: 'card',
    entityId: id,
    operation: 'update',
    payload: updates
  });
}
```

**Sync service:**
```typescript
class SyncService {
  private syncTimeout: NodeJS.Timeout | null = null;
  private readonly DEBOUNCE_MS = 2000;

  // 🆕 Cross-tab coordination
  private syncChannel = new BroadcastChannel('pawkit-sync');

  queueSync(item: Omit<SyncQueueItem, 'id' | 'createdAt' | 'attempts'>) {
    // Add to queue
    db.syncQueue.add({
      ...item,
      createdAt: new Date(),
      attempts: 0
    });

    // Debounce actual sync
    this.scheduleSync();
  }

  private scheduleSync() {
    if (this.syncTimeout) clearTimeout(this.syncTimeout);
    this.syncTimeout = setTimeout(() => this.processQueue(), this.DEBOUNCE_MS);
  }

  private async processQueue() {
    const items = await db.syncQueue.orderBy('createdAt').toArray();

    for (const item of items) {
      try {
        await this.syncItem(item);
        await db.syncQueue.delete(item.id);

        // 🆕 Notify other tabs
        this.syncChannel.postMessage({ type: 'ITEM_SYNCED', entityId: item.entityId });
      } catch (error) {
        // 🆕 Retry logic with backoff
        const newAttempts = item.attempts + 1;
        if (newAttempts >= SYNC_RETRY_CONFIG.maxAttempts) {
          // Mark as failed, notify user
          conflictStore.getState().addConflict({
            type: 'sync',
            message: `Failed to sync ${item.entityType} after ${newAttempts} attempts`,
            entityId: item.entityId
          });
        }
        await db.syncQueue.update(item.id, {
          attempts: newAttempts,
          lastError: error.message
        });
      }
    }
  }

  private async syncItem(item: SyncQueueItem) {
    const endpoint = `/api/${item.entityType}s`;

    switch (item.operation) {
      case 'create':
        await fetch(endpoint, { method: 'POST', body: JSON.stringify(item.payload) });
        break;
      case 'update':
        await fetch(`${endpoint}/${item.entityId}`, { method: 'PATCH', body: JSON.stringify(item.payload) });
        break;
      case 'delete':
        await fetch(`${endpoint}/${item.entityId}`, { method: 'DELETE' });
        break;
    }
  }
}
```

### Conflict Resolution

~~**Strategy: Last-write-wins with field merging**~~

**🆕 Strategy: Last-write-wins with active device priority and metadata quality**

```typescript
function resolveConflict(local: Card, server: Card): Card {
  // 🆕 PRIORITY 1: Deletion always wins
  if (local.deleted || server.deleted) {
    return {
      ...(local.deleted ? local : server),
      deleted: true,
      _pendingSync: false
    };
  }

  // 🆕 PRIORITY 2: Active device wins over stale server
  const deviceMeta = getDeviceMetadata();
  const serverIsStale = isTimestampStale(server.updatedAt, 24 * 60 * 60 * 1000); // 24 hours

  if (deviceMeta.isActive && serverIsStale) {
    return { ...local, _pendingSync: true };
  }

  // 🆕 PRIORITY 3: Better metadata wins
  const serverQuality = calculateMetadataQuality(server);
  const localQuality = calculateMetadataQuality(local);

  if (serverQuality > localQuality) {
    return { ...server, _pendingSync: false, _serverVersion: server.updatedAt };
  }

  // PRIORITY 4: Last-write-wins by timestamp
  if (new Date(server.updatedAt) > new Date(local.updatedAt)) {
    return {
      ...server,
      _pendingSync: false,
      _serverVersion: server.updatedAt
    };
  }

  // Local is newer, keep local, mark for sync
  return {
    ...local,
    _pendingSync: true
  };
}

// 🆕 Metadata quality scoring
function calculateMetadataQuality(card: Card): number {
  let score = 0;
  if (card.title) score += 10;
  if (card.description) score += 10;
  if (card.image) score += 15;
  if (card.articleContent) score += 20;
  if (card.metadata) score += 5;
  return score;
}
```

### **🆕 Conflict Notification Store**

```typescript
// lib/stores/conflict-store.ts
interface ConflictNotification {
  id: string;
  message: string;
  cardId?: string;
  timestamp: Date;
  type: 'sync' | 'edit' | 'delete' | 'metadata';
}

interface ConflictStore {
  conflicts: ConflictNotification[];
  addConflict: (conflict: Omit<ConflictNotification, 'id' | 'timestamp'>) => void;
  dismissConflict: (id: string) => void;
  clearAll: () => void;
}

// Auto-dismiss after 10 seconds
```

### **🆕 Cross-Tab Sync Coordination**

```typescript
// lib/services/sync-service.ts

// Listen for sync events from other tabs
const syncChannel = new BroadcastChannel('pawkit-sync');

syncChannel.onmessage = (event) => {
  switch (event.data.type) {
    case 'SYNC_STARTED':
      // Prevent duplicate syncs
      break;
    case 'ITEM_SYNCED':
      // Refresh local state if needed
      break;
    case 'CONFLICT_DETECTED':
      // Show notification
      break;
  }
};
```

### Delta Sync on App Load

```typescript
async function initialSync(workspaceId: string) {
  // Get last sync time
  const lastSync = await db.metadata.get('lastSyncTime');

  // Fetch only changed items from server
  const response = await fetch(`/api/sync/delta?since=${lastSync?.value || 0}&workspaceId=${workspaceId}`);
  const { cards, collections, events, todos, deletedIds } = await response.json();

  // Merge server changes into local
  await db.transaction('rw', [db.cards, db.collections, db.events, db.todos], async () => {
    for (const card of cards) {
      const local = await db.cards.get(card.id);
      if (!local || !local._pendingSync) {
        await db.cards.put(card);
      }
      // If local has pending changes, don't overwrite
    }
    // ... same for other entities

    // Handle deletions
    for (const { type, id } of deletedIds) {
      await db[type + 's'].update(id, { deleted: true, deletedAt: new Date() });
    }
  });

  // Update last sync time
  await db.metadata.put({ key: 'lastSyncTime', value: Date.now() });

  // Push local pending changes
  await syncService.processQueue();
}
```

---

## 9. Kit AI & MCP

### Kit Action System

Kit can perform actions through tools:

```typescript
// lib/services/kit-service.ts
const kitTools = {
  createCard: {
    description: 'Create a new bookmark or note',
    parameters: {
      type: { type: 'string', enum: ['url', 'md-note'] },
      title: { type: 'string' },
      url: { type: 'string', optional: true },
      content: { type: 'string', optional: true },
      collections: { type: 'array', items: { type: 'string' }, optional: true }
    },
    execute: async (params, { workspaceId }) => {
      const card = await createCard({ ...params, workspaceId });
      return { success: true, card };
    }
  },

  createEvent: {
    description: 'Create a calendar event',
    parameters: {
      title: { type: 'string' },
      date: { type: 'string' },
      startTime: { type: 'string', optional: true },
      endTime: { type: 'string', optional: true }
    },
    execute: async (params, { workspaceId }) => {
      const event = await createEvent({ ...params, workspaceId });
      return { success: true, event };
    }
  },

  createTodo: {
    description: 'Create a task',
    parameters: {
      text: { type: 'string' },
      dueDate: { type: 'string', optional: true }
    },
    execute: async (params, { workspaceId }) => {
      const todo = await createTodo({ ...params, workspaceId });
      return { success: true, todo };
    }
  },

  addToCollection: {
    description: 'Add a card to a Pawkit',
    parameters: {
      cardId: { type: 'string' },
      collectionSlug: { type: 'string' }
    },
    execute: async (params, { workspaceId }) => {
      // ...
    }
  },

  search: {
    description: 'Search across cards and notes',
    parameters: {
      query: { type: 'string' },
      type: { type: 'string', enum: ['all', 'bookmarks', 'notes'], optional: true }
    },
    execute: async (params, { workspaceId }) => {
      const results = await searchCards({ ...params, workspaceId });
      return { results };
    }
  }
};
```

### **🆕 Kit Context Awareness (V1 PARITY)**

```typescript
// Kit receives context based on current view
interface KitContext {
  viewContext: 'library' | 'notes' | 'calendar' | 'pawkit' | 'home';
  pawkitSlug?: string;

  // Card context when viewing a specific card
  activeCardContext?: {
    id: string;
    title: string;
    url?: string;
    content?: string;
    notes?: string;
  };

  // Video context for YouTube cards
  videoContext?: {
    cardId: string;
    cardTitle: string;
    summary?: string;
    transcript?: string;  // Truncated for token limits
  };
}
```

### Kit Confirmation Flow

When Kit wants to perform an action:

1. Kit returns tool call with `requiresConfirmation: true`
2. UI shows confirmation dialog:
   ```
   ┌─────────────────────────────────────────┐
   │ Kit wants to create an event           │
   ├─────────────────────────────────────────┤
   │ 📅 Team Meeting                         │
   │ December 20, 2025 at 2:00 PM           │
   ├─────────────────────────────────────────┤
   │ ☐ Don't ask again for this action      │
   │                                         │
   │              [Cancel] [Create]          │
   └─────────────────────────────────────────┘
   ```
3. User confirms → action executes
4. If "Don't ask again" checked → store preference

### MCP Server

```typescript
// Separate package: packages/mcp-server/

import { Server } from '@modelcontextprotocol/sdk/server';

const server = new Server({
  name: 'pawkit',
  version: '1.0.0'
});

// Tools
server.setRequestHandler('tools/list', async () => ({
  tools: [
    {
      name: 'pawkit_list_cards',
      description: 'List cards with optional filters',
      inputSchema: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: ['all', 'url', 'md-note'] },
          collection: { type: 'string' },
          limit: { type: 'number' }
        }
      }
    },
    {
      name: 'pawkit_create_card',
      description: 'Create a new card',
      inputSchema: { /* ... */ }
    },
    {
      name: 'pawkit_update_card',
      description: 'Update an existing card',
      inputSchema: { /* ... */ }
    },
    {
      name: 'pawkit_delete_card',
      description: 'Delete a card',
      inputSchema: { /* ... */ }
    },
    {
      name: 'pawkit_list_collections',
      description: 'List Pawkits',
      inputSchema: { /* ... */ }
    },
    {
      name: 'pawkit_search',
      description: 'Search across all content',
      inputSchema: { /* ... */ }
    },
    {
      name: 'pawkit_create_todo',
      description: 'Create a task',
      inputSchema: { /* ... */ }
    },
    {
      name: 'pawkit_create_event',
      description: 'Create a calendar event',
      inputSchema: { /* ... */ }
    }
  ]
}));

server.setRequestHandler('tools/call', async (request) => {
  const { name, arguments: args } = request.params;

  // Authenticate via token
  const token = request.headers?.['x-pawkit-token'];
  const connection = await verifyMcpToken(token);

  // Execute tool
  switch (name) {
    case 'pawkit_list_cards':
      return await listCards(connection.userId, args);
    case 'pawkit_create_card':
      return await createCard(connection.userId, args);
    // ... etc
  }
});
```

### MCP Token Management

- Generated in Settings → Connections → MCP
- Stored hashed in Connection table
- User can regenerate/revoke
- Token format: `pk_live_xxxxxxxxxxxx`

---

## 10. Theming System

### CSS Variables

**🆕 Update:** See `globals.css` for exact V1 HSL values.

~~```css~~
~~/* styles/globals.css */~~

~~:root {~~
~~  /* Base colors - HSL for easy manipulation */~~
~~  --hue-accent: 270;  /* Purple default */~~
~~  --sat-accent: 60%;~~
~~ ... (omitted for brevity)~~
~~}~~
~~```~~

**🆕 Addition: Style Switching Logic**
- **Modern Mode (Default):** Uses solid `bg-surface-1` and standard borders.
- **Glass Mode:** Uses `hsl(0 0% 100% / 0.03)` with `blur(20px)` and `saturate(1.2)` to match V1 high-fidelity translucency.
- **Persistence:** The `styleMode` ('glass' | 'modern') is managed in `ui-store.ts` and applied as a `data-style` attribute on `documentElement`. Stored in localStorage key: `pawkit_device_preferences`.

### Glass Morphism Standard (V2 Signature)

To maintain visibility against dark backgrounds while preserving the "glass" feel, use these specific opacity values:

| Element | Class Utility | Notes |
|---------|---------------|-------|
| **Modal/Panel Base** | `bg-[hsl(0_0%_12%/0.70)]` | 70% opacity + `backdrop-blur-[12px]` |
| **Input/Container** | `bg-white/10` | 10% opacity for contrast |
| **Border** | `border-white/15` | 15% opacity for definition |
| **Focus State** | `focus:border-white/25` | 25% opacity on focus |
| **Hover State** | `hover:bg-white/15` | Slight brightening |

**Do NOT use solid colors (`bg-zinc-900`) for internal containers.** Always use `white/XX` alpha values to allow the background blur to shine through.

### Accent Color Override

```typescript
// When user picks custom color
function setAccentColor(hue: number, saturation: number = 60) {
  document.documentElement.style.setProperty('--hue-accent', String(hue));
  document.documentElement.style.setProperty('--sat-accent', `${saturation}%`);
}
```

### Background Customization

```typescript
// Color background
function setBackgroundColor(color: string) {
  document.documentElement.style.setProperty('--color-bg-base', color);
}

// Image background
function setBackgroundImage(url: string) {
  document.body.style.backgroundImage = `url(${url})`;
  document.body.style.backgroundSize = 'cover';
  document.body.style.backgroundPosition = 'center';
  document.body.style.backgroundAttachment = 'fixed';
}
```

### Tailwind Integration

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        bg: {
          base: 'var(--color-bg-base)',
          surface: {
            1: 'var(--color-bg-surface-1)',
            2: 'var(--color-bg-surface-2)',
            3: 'var(--color-bg-surface-3)',
            4: 'var(--color-bg-surface-4)',
          }
        },
        accent: {
          DEFAULT: 'var(--color-accent)',
          hover: 'var(--color-accent-hover)',
          muted: 'var(--color-accent-muted)',
        },
        text: {
          primary: 'var(--color-text-primary)',
          secondary: 'var(--color-text-secondary)',
          muted: 'var(--color-text-muted)',
        },
        border: {
          subtle: 'var(--color-border-subtle)',
          DEFAULT: 'var(--color-border-default)',
          strong: 'var(--color-border-strong)',
        }
      },
      boxShadow: {
        1: 'var(--shadow-1)',
        2: 'var(--shadow-2)',
        3: 'var(--shadow-3)',
        4: 'var(--shadow-4)',  // 🆕
        'glow-hover': 'var(--glow-hover)',  // 🆕
        'glow-focus': 'var(--glow-focus)',  // 🆕
        'glow-active': 'var(--glow-active)',  // 🆕
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
      },
      // 🆕 Fast transitions
      transitionDuration: {
        'fast': '50ms',
        'base': '75ms',
        'slow': '150ms',
      }
    }
  }
}
```

---

## 11. Migration Strategy

### V1 → V2 User Migration

**When existing user logs into V2:**

1. **Check for workspace:**
   ```sql
   SELECT id FROM "Workspace" WHERE "userId" = :userId AND "isDefault" = true
   ```

2. **If no workspace exists:**
   ```sql
   INSERT INTO "Workspace" (id, name, userId, isDefault, createdAt, updatedAt)
   VALUES (cuid(), 'Personal', :userId, true, now(), now())
   RETURNING id
   ```

3. **Migrate existing content:**
   ```sql
   UPDATE "Card" SET "workspaceId" = :defaultWorkspaceId
   WHERE "userId" = :userId AND "workspaceId" IS NULL;

   UPDATE "Collection" SET "workspaceId" = :defaultWorkspaceId
   WHERE "userId" = :userId AND "workspaceId" IS NULL;

   UPDATE "CalendarEvent" SET "workspaceId" = :defaultWorkspaceId
   WHERE "userId" = :userId AND "workspaceId" IS NULL;

   UPDATE "Todo" SET "workspaceId" = :defaultWorkspaceId
   WHERE "userId" = :userId AND "workspaceId" IS NULL;
   ```

4. **Client loads normally** - all content in "Personal" workspace

### Schema Migration

Add new columns as nullable first:
```sql
ALTER TABLE "Card" ADD COLUMN "workspaceId" TEXT;
ALTER TABLE "Card" ADD COLUMN "embedding" vector(1536);
ALTER TABLE "Card" ADD COLUMN "structuredData" JSONB;
ALTER TABLE "Card" ADD COLUMN "source" JSONB;
-- 🆕 New V1 parity columns
ALTER TABLE "Card" ADD COLUMN "status" TEXT DEFAULT 'PENDING';
ALTER TABLE "Card" ADD COLUMN "notes" TEXT;
ALTER TABLE "Card" ADD COLUMN "transcriptSegments" TEXT;
-- etc.
```

After migration script runs for all users, make workspaceId required:
```sql
ALTER TABLE "Card" ALTER COLUMN "workspaceId" SET NOT NULL;
```

### Data Preservation

- **No data deletion** during migration
- All existing content gets assigned to default workspace
- Old fields preserved, new fields added
- Rollback possible (workspaceId can be ignored)

---

## 12. Deferred Features

**Explicitly NOT in V2 scope. Build foundation only where noted.**

### Post-V2 (Near-term)

| Feature | Foundation in V2 | Build Later |
|---------|------------------|-------------|
| Knowledge Graph (per-Pawkit) | Embeddings field, wiki-links | Graph visualization UI |
| Global Knowledge Graph | Same | Hierarchical zoom UI |
| AI Similarity | pgvector extension | Embedding generation, similarity queries |
| Connected Platforms (Reddit, YouTube) | `source` field, Connection model, **🆕 ConnectedAccount model** | OAuth flows, import UIs |
| Topic Notes with citations | ~~`structuredData` field~~ **🆕 Citation model** | Citation block UI |
| Quick Notes consolidation | `type: 'quick-note'`, **🆕 QuickNoteArchive model** | Quick note UI, consolidation flow |

### Post-V2 (Long-term)

| Feature | Notes |
|---------|-------|
| OneDrive integration | Add after other cloud providers stable |
| Weekly email digest | Needs email service setup |
| BYOAI / Multiple AI providers | MCP foundation helps |
| OCR for images | `structuredData` can store extracted text |
| Location-aware features | `structuredData` can store coordinates |
| Collaborative Pawkits | Major architecture change |
| Subscription tracking | New entity type |

### Explicitly Excluded from V2

- ❌ No V2.1, V2.2 planning - V2 is complete
- ❌ No partial features - everything works or isn't included
- ❌ No "coming soon" placeholders in UI
- ❌ No separate Notes view - notes filtered via Library
- ❌ No Tasks in left sidebar - accessed via Home widget + modal
- ❌ No Den feature - replaced by `isPrivate` on any Pawkit

---

## 13. Build Order



### Phase 1: Foundation

1. **Project setup**

   - Next.js 16.1.0 with App Router

   - TypeScript strict mode

   - Tailwind + shadcn/ui

   - Prisma schema with all models

   - Dexie schema



2. **Auth & workspace**

   - Supabase auth integration

   - Workspace model

   - Default workspace creation

   - Workspace switcher UI

   - **🆕 Extension token auth preservation**



3. **Core data layer**

   - Dexie setup with all tables

   - Zustand stores

   - Basic CRUD operations

   - Sync service (debounced)

   - **🆕 Conflict notification store**

   - **🆕 Image cache with LRU**



4. **🆕 V1 Visual Skinning**

   - HSL tokens & Variables

   - Glass/Modern modes

   - Panel styling (shadows, rounding)



### Phase 2: Layout & Navigation

4. **Layout shell**
   - Dashboard layout
   - Left sidebar (static)
   - Right sidebar (static)
   - Center panel
   - Anchor/collapse behavior

5. **Navigation**
   - Nav items (Home, Library, Calendar, Rediscover)
   - Pawkits tree (collapsible, nested)
   - Connections list
   - Routing setup

6. **Omnibar**
   - Search input
   - + menu with all creation options
   - Command palette (⌘K)
   - **🆕 Omnibar-Toast System:** Elastic morphing and spring-physics notification stack (`framer-motion`)

### Phase 3: Views

7. **Library view**
   - Grid view
   - List view
   - Masonry view (custom, left-to-right)
   - Content type filter
   - Tag filter
   - Sort options
   - **Per-content-type view memory** (each filter saves its own layout/sort preferences)
   - Tags filter (visible in right sidebar)

8. **Card components**
   - Card base
   - Bookmark card
   - Note card
   - File card
   - Card actions

9. **Card detail modal**
   - View/edit card
   - Tags management
   - Collections assignment
   - File attachments
   - Reader mode
   - **🆕 YouTube transcript panel**

### Phase 4: Calendar & Tasks

10. **Calendar view**
    - Month view
    - Week view
    - Event display
    - Scheduled cards
    - Daily notes
    - **🆕 Holiday support with country filter**
    - **🆕 Week start preference**

11. **Tasks system**
    - Tasks widget (Home)
    - Tasks modal (full list)
    - Task creation (+ menu)
    - Calendar integration
    - Completion tracking
    - **🆕 Overdue/Today/Upcoming/Backlog categorization**

12. **Home dashboard**
    - Tasks widget
    - Recent items
    - Quick access
    - Week strip
    - Today's note

### Phase 5: Pawkits & Organization

13. **Pawkits**
    - Create/edit Pawkit
    - Nested hierarchy
    - Drag to reorder
    - Privacy settings
    - Cover images

14. **Board/Kanban view**
    - Column management
    - Drag cards between columns
    - Board settings

15. **Drag & drop (dnd-kit)**
    - Cards to Pawkits
    - Pawkits reordering
    - Board columns
    - Unified system
    - **🆕 See Section 15 for masonry implementation**

### Phase 6: Features

16. **Rediscover**
    - Card stack UI
    - Swipe actions
    - Filters
    - **🆕 Batch processing (25 cards)**
    - **🆕 Orbital animation**
    - **🆕 Keyboard shortcuts (K/F/D/Escape)**

17. **Search**
    - Full-text search
    - Search operators
    - Results display
    - **🆕 Smart scoring algorithm**
    - **🆕 Tag search with # prefix**

18. **Notes system** (integrated into Library)
    - Markdown editor
    - Wiki-links
    - Backlinks panel (in card detail modal)
    - **🆕 Daily note templates**
    - **🆕 Knowledge graph visualization** (accessible from card detail or Library toolbar)

### Phase 7: Integrations

19. **Kit AI**
    - Chat panel
    - Overlay mode
    - Tool execution
    - Confirmation flow
    - **🆕 Context awareness by view**
    - **🆕 Video/transcript context**

20. **MCP Server**
    - Token generation
    - All tools implemented
    - Auth flow

21. **Cloud storage**
    - Filen integration
    - Google Drive
    - Dropbox
    - Connection management UI

### Phase 8: Polish

22. **Theming**
    - Theme toggle
    - Glass/modern toggle
    - Accent color picker
    - Background customization
    - **🆕 Surface tint option**

23. **Mobile responsive**
    - Single panel layout
    - Bottom navigation
    - Touch interactions

24. **Onboarding**
    - Feature selection flow
    - Selective demo data
    - Tour highlights

25. **Migration**
    - V1 user detection
    - Workspace assignment
    - Data verification
    - **🆕 Extension token migration**

---

## **🆕 14. Browser Extension Compatibility**

### Extension Auth Flow (MUST PRESERVE)

The browser extension authenticates using a token system that V2 must maintain:

#### Token Generation
1. User clicks "Sign in with Pawkit" in extension options
2. Opens popup to `/extension/auth?source=extension`
3. Page generates token via `POST /api/extension/token`
4. **Token format:** 64-character hex string (`randomBytes(32).toString('hex')`)
5. Token is bcrypt hashed (10 rounds) before database storage
6. Token stored in `User.extensionToken` (unique field)

#### Token Expiry
- **30 days** from `extensionTokenCreatedAt`
- Constant: `TOKEN_EXPIRY_MS = 30 * 24 * 60 * 60 * 1000`

#### Token Validation
```typescript
// lib/auth/extension-auth.ts
async function getUserByExtensionToken(token: string): Promise<User | null> {
  // 1. Check in-memory cache (5-minute TTL)
  const cached = tokenCache.get(token);
  if (cached) return cached.user;

  // 2. Fetch users with extension tokens
  const users = await prisma.user.findMany({
    where: { extensionToken: { not: null } }
  });

  // 3. Check expiry and bcrypt compare
  for (const user of users) {
    if (!user.extensionTokenCreatedAt) continue;

    const tokenAge = Date.now() - user.extensionTokenCreatedAt.getTime();
    if (tokenAge > TOKEN_EXPIRY_MS) continue;

    if (await bcrypt.compare(token, user.extensionToken!)) {
      tokenCache.set(token, { user, expiresAt: Date.now() + 5 * 60 * 1000 });
      return user;
    }
  }

  return null;
}
```

#### API Endpoints Extension Uses

```
POST /api/extension/token  - Generate token (requires session auth)
POST /api/cards           - Create card (Bearer token auth)
GET  /api/pawkits         - List collections (Bearer token auth)
```

#### CORS Configuration

```typescript
// lib/config/extension-config.ts
const ALLOWED_EXTENSION_ORIGINS = [
  'chrome-extension://bbmhcminlncbpkmblbaelhkamhmknjcj',  // Chrome
  // Firefox uses dynamic IDs, allow any moz-extension://
];

function isExtensionOrigin(origin: string): boolean {
  if (process.env.NODE_ENV === 'development') {
    return origin.startsWith('chrome-extension://') ||
           origin.startsWith('moz-extension://');
  }
  return ALLOWED_EXTENSION_ORIGINS.includes(origin) ||
         origin.startsWith('moz-extension://');
}
```

#### Extension Request Headers

```
Authorization: Bearer <64-char-token>
Content-Type: application/json
```

### V2 Requirements

1. ✅ Preserve 64-char hex token format
2. ✅ Preserve bcrypt hashing (10 rounds)
3. ✅ Preserve 30-day expiry
4. ✅ Preserve 5-minute token cache
5. ✅ Preserve Bearer token header format
6. ✅ Maintain `/api/extension/token` endpoint
7. ✅ Maintain `/api/cards` POST with extension auth
8. ✅ Maintain `/api/pawkits` GET with extension auth
9. ✅ Preserve CORS whitelist pattern

---

## **🆕 15. Masonry Implementation Guide**

### The Problem with V1 (Muuri)

V1 uses Muuri.js for masonry layout. Muuri orders items **top-to-bottom per column**, not left-to-right reading order:

```
V1 (Muuri) - WRONG:        V2 (Custom) - CORRECT:
┌───┬───┬───┐              ┌───┬───┬───┐
│ 1 │ 4 │ 7 │              │ 1 │ 2 │ 3 │
│   │ 5 │ 8 │              │ 4 │   │ 5 │
│ 2 │   │   │              │   │ 6 │   │
│ 3 │ 6 │ 9 │              │ 7 │ 8 │ 9 │
└───┴───┴───┘              └───┴───┴───┘
```

### V2 Custom Masonry Algorithm

```typescript
// lib/utils/masonry.ts

interface MasonryItem {
  id: string;
  height: number;  // Measured or estimated
}

interface MasonryLayout {
  positions: Map<string, { x: number; y: number; column: number }>;
  containerHeight: number;
}

function calculateMasonryLayout(
  items: MasonryItem[],
  containerWidth: number,
  columnCount: number,
  gap: number
): MasonryLayout {
  const columnWidth = (containerWidth - (columnCount - 1) * gap) / columnCount;
  const columnHeights = new Array(columnCount).fill(0);
  const positions = new Map<string, { x: number; y: number; column: number }>();

  // Place items LEFT-TO-RIGHT, filling shortest column
  for (const item of items) {
    // Find shortest column (prefer leftmost on tie)
    let shortestColumn = 0;
    let shortestHeight = columnHeights[0];

    for (let i = 1; i < columnCount; i++) {
      if (columnHeights[i] < shortestHeight) {
        shortestColumn = i;
        shortestHeight = columnHeights[i];
      }
    }

    // Position item
    const x = shortestColumn * (columnWidth + gap);
    const y = columnHeights[shortestColumn];

    positions.set(item.id, { x, y, column: shortestColumn });

    // Update column height
    columnHeights[shortestColumn] += item.height + gap;
  }

  return {
    positions,
    containerHeight: Math.max(...columnHeights)
  };
}
```

### Integration with dnd-kit

```typescript
// components/views/masonry-view.tsx

import { DndContext, DragOverlay, useSensor, useSensors, PointerSensor } from '@dnd-kit/core';
import { SortableContext, useSortable } from '@dnd-kit/sortable';

function MasonryView({ cards }: { cards: Card[] }) {
  const [layout, setLayout] = useState<MasonryLayout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Recalculate on resize
  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new ResizeObserver(() => {
      const width = containerRef.current!.clientWidth;
      const columns = Math.max(1, Math.floor(width / 300));  // 300px min column width

      const items = cards.map(card => ({
        id: card.id,
        height: estimateCardHeight(card)  // Based on content
      }));

      setLayout(calculateMasonryLayout(items, width, columns, 16));
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [cards]);

  return (
    <DndContext sensors={useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))}>
      <div
        ref={containerRef}
        style={{ position: 'relative', height: layout?.containerHeight }}
      >
        {cards.map(card => {
          const pos = layout?.positions.get(card.id);
          return (
            <MasonryCard
              key={card.id}
              card={card}
              style={{
                position: 'absolute',
                left: pos?.x ?? 0,
                top: pos?.y ?? 0,
                transition: 'transform 150ms ease'
              }}
            />
          );
        })}
      </div>
    </DndContext>
  );
}
```

### Key Differences from V1

| Aspect | V1 (Muuri) | V2 (Custom + dnd-kit) |
|--------|------------|----------------------|
| Ordering | Top-to-bottom | Left-to-right |
| DnD Library | Muuri built-in | dnd-kit |
| Layout Engine | CSS transforms | Absolute positioning |
| Responsive | Muuri resize | ResizeObserver |
| Animation | Muuri transitions | CSS transitions |

---

## **🆕 16. V1 Feature Parity Checklist**

Use this checklist to verify V2 has all V1 features:

### Core Features
- [ ] Cards (bookmarks, notes, files)
- [ ] Collections (Pawkits) with nesting
- [ ] Calendar with recurring events
- [ ] Todos with due dates and categorization
- [ ] Note folders with hierarchy
- [ ] Wiki-links and backlinks
- [ ] Daily notes with templates
- [ ] Knowledge graph visualization
- [ ] Search with smart scoring

### Views
- [ ] Library (Grid, List, Masonry) with Content Type filter
- [x] Calendar (Month, Week)
- [ ] Pawkit (Grid, List, Masonry, Board)
- [ ] Rediscover (Card stack with batch processing)
- [ ] Home dashboard with Tasks widget

### Interactions
- [ ] Drag cards to Pawkits
- [ ] Drag cards between Kanban columns
- [ ] Reorder Pawkits in sidebar
- [ ] Keyboard shortcuts (K/F/D in Rediscover)
- [ ] Command palette (⌘K)

### AI & Integrations
- [ ] Kit AI chat with context awareness
- [ ] Kit AI actions (create event, card, todo)
- [ ] MCP server with all tools
- [ ] Cloud storage (Filen, Google Drive, Dropbox)
- [ ] Browser extension compatibility

### Customization
- [ ] Dark/Light theme
- [ ] Glass/Modern style
- [ ] Surface tint option
- [ ] Accent color picker
- [ ] Background customization
- [ ] Per-view layout preferences

### Sync & Offline
- [ ] Local-first with IndexedDB
- [ ] Background sync with debounce
- [ ] Conflict resolution with notifications
- [ ] Offline operation
- [ ] Cross-tab coordination
- [ ] Local-only mode toggle

### User Management
- [ ] Workspaces
- [ ] Extension token auth
- [ ] View settings persistence
- [ ] Export/import data

---

## Appendix: Quick Reference

### Commands

```bash
# Development
pnpm dev              # Start dev server
pnpm build            # Production build
pnpm lint             # Run linter
pnpm type-check       # TypeScript check

# Database
pnpm db:push          # Push schema to Supabase
pnpm db:generate      # Generate Prisma client
pnpm db:studio        # Open Prisma Studio
pnpm db:migrate       # Run migrations

# Testing
pnpm test             # Run tests
pnpm test:e2e         # Playwright tests
```

### Key Patterns

**Creating a card:**
```typescript
const card = await cardsStore.getState().createCard({
  type: 'url',
  url: 'https://example.com',
  title: 'Example',
  workspaceId: currentWorkspaceId,
  status: 'PENDING'  // 🆕 For async metadata
});
```

**Filtering by content type:**
```typescript
const notes = await db.cards
  .where('[workspaceId+type]')
  .equals([workspaceId, 'md-note'])
  .toArray();
```

**Adding to sync queue:**
```typescript
syncService.queueSync({
  entityType: 'card',
  entityId: card.id,
  operation: 'create',
  payload: card
});
```

### File Size Guidelines

- Components: < 300 lines
- Stores: < 500 lines
- Services: < 400 lines
- If larger, split into smaller modules
- **🆕 V1 violations to avoid: card-gallery.tsx (1,848 lines), card-detail-modal.tsx (2,756 lines), left-navigation-panel.tsx (2,112 lines)**

---

**End of Playbook**

*This document should be updated as decisions are made during development.*

**🆕 Last updated:** December 19, 2025 — V1 analysis complete, design decisions finalized, Den removed, Notes/Tasks patterns clarified.
