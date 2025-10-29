# Pawkit - Complete Application Overview

> **Created:** October 28, 2025
> **For:** Claude Desktop Context

---

## Table of Contents
1. [What is Pawkit?](#what-is-pawkit)
2. [Core Architecture](#core-architecture)
3. [Tech Stack](#tech-stack)
4. [Data Model](#data-model)
5. [File Structure](#file-structure)
6. [Key Features](#key-features)
7. [Local-First Architecture](#local-first-architecture)
8. [Multi-Session Management](#multi-session-management)
9. [Available Views](#available-views)
10. [API Routes](#api-routes)
11. [Important Patterns](#important-patterns)
12. [Development Commands](#development-commands)

---

## What is Pawkit?

Pawkit is a **visual bookmark manager** and **personal knowledge base** that helps users organize, annotate, and retrieve web content. Think of it as a combination of:
- Bookmark manager (like Pocket or Raindrop.io)
- Note-taking app (with markdown support)
- Visual organizer (with collections/folders called "Pawkits")
- Timeline/calendar view for bookmarks

### Key Differentiators
1. **Local-First**: Data stored primarily in browser IndexedDB, syncs optionally to server
2. **Privacy-Focused**: Can run completely offline, private "Pawkits" isolate content
3. **Visual**: Card-based interface with thumbnails and metadata
4. **Flexible Organization**: Tags, collections (Pawkits), calendar views, and search

---

## Core Architecture

### Architecture Pattern: Local-First
```
┌────────────────────────────────────────┐
│         User's Browser                 │
│                                        │
│  ┌──────────────────────────────────┐ │
│  │  IndexedDB (Source of Truth)     │ │
│  │  - All cards, collections        │ │
│  │  - User data, settings           │ │
│  │  - Never cleared automatically   │ │
│  └───────────┬──────────────────────┘ │
│              ↓                         │
│  ┌──────────────────────────────────┐ │
│  │  Zustand Store (UI State)        │ │
│  │  - Derived from IndexedDB        │ │
│  │  - React component state         │ │
│  └──────────────────────────────────┘ │
└────────────────────────────────────────┘
                ↕ (Optional Sync)
┌────────────────────────────────────────┐
│  Server (PostgreSQL/Supabase)          │
│  - Backup/sync layer                   │
│  - Multi-device sync                   │
│  - Can be disabled by user             │
└────────────────────────────────────────┘
```

### Why Local-First?
**Problem:** Server database was accidentally wiped, all users lost all data.

**Solution:** IndexedDB is now the primary storage. Even if server is wiped:
- User data stays in browser
- Next sync pushes local data back to server
- Server automatically repopulated
- **Zero data loss**

---

## Tech Stack

### Frontend
- **Framework**: Next.js 15.1.6 (App Router)
- **React**: 19.0.0
- **TypeScript**: 5.5.4
- **Styling**: Tailwind CSS 3.4.0
- **UI Components**: Radix UI (dialogs, dropdowns, tooltips, etc.)
- **State Management**: Zustand 4.5.2
- **Local Storage**: IndexedDB (via `idb` 8.0.3)

### Backend
- **Database**: PostgreSQL (via Supabase)
- **ORM**: Prisma 6.18.0
- **Auth**: Supabase Auth + custom extension token auth
- **API**: Next.js API Routes

### Key Libraries
- **Drag & Drop**: @dnd-kit/core 6.0.8
- **Markdown**: @uiw/react-md-editor 4.0.8, react-markdown 10.1.0
- **Calendar**: react-big-calendar 1.19.4
- **Content Extraction**: @mozilla/readability 0.6.0
- **Data Fetching**: SWR 2.3.6

### Development
- **Testing**: Playwright 1.47.1
- **Linting**: ESLint
- **Node Version**: >=20.0.0

---

## Data Model

### Database Schema (Prisma)

#### User Model
```prisma
model User {
  id                    String   @id
  email                 String   @unique
  displayName           String?
  denPasswordHash       String?
  denEncryptionEnabled  Boolean  @default(false)
  denSyncEnabled        Boolean  @default(true)
  serverSync            Boolean  @default(true) // Local-only mode when false
  extensionToken        String?  @unique
  extensionTokenCreatedAt DateTime?

  cards       Card[]
  collections Collection[]
  viewSettings UserViewSettings[]
  deviceSessions DeviceSession[]
}
```

#### Card Model (Bookmarks)
```prisma
model Card {
  id              String    @id @default(cuid())
  type            String    @default("url")
  url             String
  title           String?
  notes           String?    // User's markdown notes
  content         String?
  status          String    @default("PENDING")
  tags            String?    // JSON array
  collections     String?    // JSON array of slugs
  domain          String?
  image           String?    // Thumbnail URL
  description     String?
  metadata        String?    // JSON object
  articleContent  String?    // Extracted article text
  pinned          Boolean   @default(false)
  deleted         Boolean   @default(false)
  deletedAt       DateTime?
  inDen           Boolean   @default(false)
  encryptedContent String?
  scheduledDate   DateTime?  // For calendar view
  userId          String

  @@index([userId, deleted])
  @@index([userId, scheduledDate])
}
```

#### Collection Model (Pawkits)
```prisma
model Collection {
  id                   String    @id @default(cuid())
  name                 String
  slug                 String    @unique
  parentId             String?   // Nested collections
  coverImage           String?
  coverImagePosition   Int?
  hidePreview          Boolean   @default(false)
  useCoverAsBackground Boolean   @default(false)
  pinned               Boolean   @default(false)
  deleted              Boolean   @default(false)
  deletedAt            DateTime?
  isPrivate            Boolean   @default(false) // Private pawkits
  passwordHash         String?   // Optional password protection
  userId               String

  @@index([userId, isPrivate])
}
```

#### UserViewSettings Model
Stores per-view layout preferences (grid/masonry/list, card size, sorting, etc.)

#### DeviceSession Model
Tracks active sessions for multi-device sync conflict detection

---

## File Structure

```
pawkit/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Auth routes (login, signup)
│   ├── (dashboard)/              # Main app routes
│   │   ├── home/                 # Dashboard/home view
│   │   ├── library/              # All bookmarks
│   │   ├── pawkits/              # Collections view
│   │   │   └── [slug]/          # Individual pawkit view
│   │   ├── notes/                # Notes-only view
│   │   ├── calendar/             # Calendar view
│   │   ├── trash/                # Deleted items
│   │   ├── settings/             # User settings
│   │   └── ...
│   ├── api/                      # API routes
│   │   ├── cards/               # Card CRUD
│   │   ├── collections/          # Collection CRUD
│   │   ├── auth/                # Authentication
│   │   ├── sync/                # Sync endpoints
│   │   └── ...
│   └── page.tsx                  # Landing page
│
├── components/                   # React components
│   ├── cards/                    # Card components
│   ├── library/                  # Library view components
│   ├── pawkits/                  # Pawkits components
│   ├── sidebar/                  # Navigation sidebar
│   ├── modals/                   # Dialog/modal components
│   ├── forms/                    # Form components
│   ├── ui/                       # Radix UI wrappers
│   └── ...
│
├── lib/                          # Core logic
│   ├── stores/                   # Zustand stores
│   │   ├── data-store.ts        # Main data store
│   │   ├── conflict-store.ts    # Conflict resolution
│   │   └── demo-data-store.ts   # Demo mode
│   │
│   ├── services/                 # Business logic
│   │   ├── local-storage.ts     # IndexedDB layer
│   │   ├── sync-service.ts      # Sync engine
│   │   └── ...
│   │
│   ├── server/                   # Server-side logic
│   │   ├── prisma.ts            # Prisma client
│   │   ├── cards.ts             # Card operations
│   │   ├── collections.ts       # Collection operations
│   │   ├── supabase.ts          # Supabase client
│   │   └── ...
│   │
│   ├── utils/                    # Utilities
│   │   ├── slug.ts              # Slug generation
│   │   ├── strings.ts           # String helpers
│   │   ├── search-operators.ts  # Search parsing
│   │   └── ...
│   │
│   └── auth/                     # Auth helpers
│       ├── get-user.ts          # User session
│       └── extension-auth.ts    # Browser extension auth
│
├── prisma/                       # Database
│   ├── schema.prisma            # Database schema
│   └── migrations/              # Migration history
│
├── scripts/                      # Utility scripts
│   ├── protect-production-db.js # Safety checks
│   ├── pre-migration-check.js   # Migration safety
│   └── ...
│
├── public/                       # Static assets
│   ├── images/
│   └── ...
│
└── docs/                         # Documentation files
    ├── LOCAL_FIRST_ARCHITECTURE.md
    ├── IMPROVEMENT_ROADMAP.md
    └── ...
```

---

## Key Features

### 1. Card Management
- **Create**: Add bookmarks via URL input, browser extension, or manual creation
- **Edit**: Rich markdown notes, tags, collections
- **Delete**: Soft delete to trash, permanent delete after 30 days
- **Metadata**: Automatic fetching of title, description, thumbnail
- **Reader Mode**: Extract article content using Mozilla Readability
- **Scheduling**: Schedule cards for future dates (calendar integration)

### 2. Collections (Pawkits)
- **Hierarchical**: Nested collections (parent-child relationships)
- **Visual**: Custom cover images, background options
- **Private**: Isolated from main library/search (password optional)
- **Organization**: Drag-and-drop cards into collections
- **Bulk Operations**: Multi-select and batch move/tag/delete

### 3. Search & Filter
- **Full-text search**: Searches title, url, notes, tags
- **Search operators**: `tag:foo`, `pawkit:bar`, `type:url`, `domain:example.com`
- **Advanced filters**: Date ranges, has-notes, pinned, etc.
- **Fuzzy matching**: Tolerates typos

### 4. Views
- **Library**: All bookmarks (grid/masonry/list layouts)
- **Home/Dashboard**: Pinned items, recent, quick access
- **Pawkits**: Collections view with nested navigation
- **Notes**: Notes-only view (cards with content)
- **Calendar**: Timeline view with scheduled items
- **Timeline**: Chronological view
- **Trash**: Soft-deleted items

### 5. Sync & Data Management
- **Local-First**: IndexedDB primary storage
- **Multi-Device Sync**: Optional server sync
- **Conflict Resolution**: Last-write-wins by timestamp
- **Export/Import**: JSON backup files
- **Session Management**: Multi-tab/device coordination

### 6. Authentication
- **Supabase Auth**: Email/password, OAuth providers
- **Extension Auth**: Token-based auth for browser extension
- **Demo Mode**: Try without account (local-only)

### 7. Customization
- **Themes**: Light/dark mode
- **Layout**: Grid, masonry, list, compact
- **Card Size**: 1-5 scale
- **Sorting**: By date, title, pawkit, custom
- **View Settings**: Per-view preferences saved

---

## Local-First Architecture

### Core Principle
**IndexedDB is the source of truth, server is optional sync layer**

### Data Flow

#### Creating a Card:
```
1. User adds bookmark
2. Save to IndexedDB (instant, permanent)
3. Update Zustand store (UI updates)
4. POST to server in background (if sync enabled)
5. Mark as synced when successful
```

#### Loading the App:
```
1. App opens
2. Load from IndexedDB (instant)
3. Render UI immediately
4. Sync with server in background
5. Merge any server changes
```

#### Sync Algorithm:
```
1. Pull from server
2. Compare with local by timestamp
3. Keep newer version (last-write-wins)
4. Push local changes to server
5. Mark as synced
```

### Benefits
- Works 100% offline
- No data loss even if server wiped
- Instant UI updates
- Resilient to network issues
- User owns their data (export anytime)

### Implementation Files
- `lib/services/local-storage.ts` - IndexedDB operations
- `lib/services/sync-service.ts` - Bidirectional sync
- `lib/stores/data-store.ts` - Zustand store with IndexedDB backing

---

## Multi-Session Management

### Problem
Multiple tabs/devices editing simultaneously can cause:
- Duplicate cards
- Conflicting updates
- Race conditions

### Solution: Event-Based Session Management

#### DeviceSession Model
Tracks active sessions per device/browser tab

#### Session Detection
- Each tab has unique `deviceId`
- Broadcasts presence via `BroadcastChannel`
- Tracks `lastActive` timestamp
- Detects inactive sessions (>30s)

#### Active Session Priority
- One "active" session per device
- Active session has write priority
- Other sessions show warning banner
- User can "take over" as active session

#### Conflict Resolution
When conflicts occur:
1. Detect based on `updatedAt` timestamps
2. Last-write-wins (keep newer version)
3. Show conflict notification to user
4. Allow manual resolution if needed

#### Implementation
- `lib/services/sync-service.ts` - Session management
- `lib/stores/data-store.ts` - Session-aware updates
- `components/sync/SessionWarningBanner.tsx` - UI warnings

---

## Available Views

### Main Views

| Route | Description | Key Features |
|-------|-------------|--------------|
| `/home` | Dashboard | Pinned items, recent, quick actions |
| `/library` | All bookmarks | Search, filter, bulk actions |
| `/pawkits` | Collections | Nested view, drag-drop |
| `/pawkits/[slug]` | Single collection | Cards in collection |
| `/notes` | Notes view | Cards with markdown content |
| `/calendar` | Calendar | Scheduled items, timeline |
| `/timeline` | Chronological | Date-based navigation |
| `/trash` | Deleted items | Restore or permanent delete |
| `/favorites` | Pinned items | Quick access to starred |
| `/settings` | User settings | Preferences, export/import |

### View Settings (Per-View)
Each view can have custom:
- Layout (grid/masonry/list/compact)
- Card size (1-5)
- Sorting (date/title/pawkit)
- Sort order (asc/desc)
- Display options (show titles, urls, tags)

Stored in `UserViewSettings` model.

---

## API Routes

### Card Endpoints
```
GET    /api/cards              # List all cards
POST   /api/cards              # Create card
GET    /api/cards/[id]         # Get single card
PATCH  /api/cards/[id]         # Update card
DELETE /api/cards/[id]         # Delete card
POST   /api/cards/bulk-delete  # Bulk delete
PATCH  /api/cards/bulk-update  # Bulk update
```

### Collection Endpoints
```
GET    /api/collections            # List all collections
POST   /api/collections            # Create collection
GET    /api/collections/[slug]     # Get by slug
PATCH  /api/collections/[slug]     # Update collection
DELETE /api/collections/[slug]     # Delete collection
```

### Sync Endpoints
```
POST   /api/sync/pull          # Pull server data
POST   /api/sync/push          # Push local changes
POST   /api/sync               # Full bidirectional sync
GET    /api/sync/status        # Sync status
```

### Auth Endpoints
```
POST   /api/auth/signup        # Create account
POST   /api/auth/login         # Login
POST   /api/auth/logout        # Logout
GET    /api/auth/session       # Get session
POST   /api/auth/extension     # Extension token auth
```

### Metadata Endpoints
```
POST   /api/metadata/fetch     # Fetch URL metadata
POST   /api/metadata/reader    # Extract article content
```

### Import/Export
```
POST   /api/export             # Export all data
POST   /api/import             # Import JSON backup
```

---

## Important Patterns

### 1. Slugs for Collection References
**Always use slugs, not IDs, for collection references**

```typescript
// CORRECT
card.collections = ["work", "reading-list"]

// WRONG
card.collections = ["cuid123", "cuid456"]
```

Why: Slugs are stable, user-friendly, and survive exports/imports.

### 2. Temporary IDs for Optimistic Updates
```typescript
// Creating a card before server confirmation
const tempId = `temp_${Date.now()}_${Math.random()}`;
await localStorage.saveCard({ id: tempId, ...data });

// After server responds
await localStorage.updateCard(tempId, { id: serverResponse.id });
```

### 3. Soft Deletes
```typescript
// Soft delete (to trash)
await updateCard(id, { deleted: true, deletedAt: new Date() });

// Hard delete (permanent)
await deleteCard(id, { permanent: true });
```

### 4. JSON String Storage
Tags and collections stored as JSON strings in database:

```typescript
// Database storage
card.tags = '["work", "important"]'
card.collections = '["work-projects"]'

// Application code
const tags = JSON.parse(card.tags || '[]')
const collections = JSON.parse(card.collections || '[]')
```

### 5. Metadata Fetching
```typescript
// Automatic metadata fetch
const metadata = await fetchMetadata(url);
// Returns: { title, description, image, domain }

// Reader mode (article extraction)
const article = await fetchArticleContent(url);
// Returns: { content, textContent, excerpt }
```

### 6. Error Handling
All API routes use consistent error format:

```typescript
return Response.json(
  { error: 'Error message', code: 'ERROR_CODE' },
  { status: 400 }
);
```

### 7. Zustand Store Pattern
```typescript
const useDataStore = create<DataStore>((set, get) => ({
  cards: [],
  collections: [],

  // Actions
  addCard: async (data) => {
    // 1. Save to IndexedDB
    await localStorage.saveCard(data);

    // 2. Update Zustand
    set(state => ({ cards: [...state.cards, data] }));

    // 3. Sync to server
    if (get().serverSync) {
      await syncToServer(data);
    }
  },
}));
```

---

## Development Commands

### Basic Commands
```bash
# Start dev server
npm run dev                    # Port 3000 (or next available)

# Build for production
npm run build:local            # With migration check

# Start production server
npm start

# Linting
npm run lint
```

### Database Commands
```bash
# Generate Prisma client
npm run prisma:generate

# Run migrations
npm run prisma:migrate         # Dev migrations
npm run prisma:migrate:deploy  # Production migrations

# Open Prisma Studio (DB GUI)
npm run prisma:studio

# Database backup
npm run prisma:backup
```

### Testing
```bash
# Run Playwright e2e tests
npm run test:e2e
```

### Important Safety Features
All destructive database commands are protected:
- `prisma:reset` - Blocked, requires manual confirmation
- `prisma:push:force` - Blocked entirely
- Pre-migration checks run automatically

### Environment Variables
Required in `.env.local`:
```bash
# Database
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."

# Supabase
NEXT_PUBLIC_SUPABASE_URL="https://..."
NEXT_PUBLIC_SUPABASE_ANON_KEY="..."
SUPABASE_SERVICE_ROLE_KEY="..."

# Optional
NEXT_PUBLIC_PREVIEW_SERVICE_URL="http://localhost:8787/preview?url={{url}}"
```

---

## Current Branch: feat/multi-session-detection

### Recent Changes
Latest commits focus on:
1. Multi-session detection and coordination
2. Event-based session management (replacing polling)
3. Card duplication prevention
4. Collection reference unification (using slugs)
5. Metadata update conflict resolution

### Active Features
- Session detection across tabs/devices
- Conflict resolution for simultaneous edits
- Session warning banners
- Active device takeover

---

## Key Files to Know

### Core Application Logic
- `lib/stores/data-store.ts` - Main Zustand store
- `lib/services/local-storage.ts` - IndexedDB layer
- `lib/services/sync-service.ts` - Sync engine

### Server Operations
- `lib/server/cards.ts` - Card CRUD operations
- `lib/server/collections.ts` - Collection CRUD
- `lib/server/prisma.ts` - Prisma client singleton

### UI Components
- `components/cards/Card.tsx` - Card component
- `components/cards/CardGrid.tsx` - Card layout
- `components/sidebar/Sidebar.tsx` - Main navigation
- `components/modals/CardModal.tsx` - Card detail modal

### API Routes
- `app/api/cards/route.ts` - Card endpoints
- `app/api/collections/route.ts` - Collection endpoints
- `app/api/sync/route.ts` - Sync endpoints

---

## Common Tasks

### Adding a New Feature
1. Update Prisma schema if needed
2. Run migration: `npm run prisma:migrate`
3. Update TypeScript types
4. Implement in `lib/stores/data-store.ts`
5. Update IndexedDB schema if needed
6. Add API route if server sync needed
7. Create UI components
8. Test with multiple sessions/devices

### Debugging
- Check browser IndexedDB: DevTools → Application → IndexedDB
- Check Zustand state: Install Zustand DevTools
- Check server logs: `npm run dev` output
- Check database: `npm run prisma:studio`
- Check session conflicts: Look for console warnings

### Testing Multi-Device Sync
1. Open app in two browser tabs
2. Make changes in both
3. Observe conflict resolution
4. Check IndexedDB for correct data
5. Verify server sync (if enabled)

---

## Architecture Decisions

### Why Local-First?
After a server database wipe caused total data loss, the architecture was redesigned to make IndexedDB the source of truth. This ensures users never lose data, even if server is wiped.

### Why Slugs for Collections?
Slugs are stable identifiers that survive exports/imports and are user-friendly in URLs. IDs are database-specific and break during data migrations.

### Why Zustand Over Context/Redux?
- Simpler API
- Better performance (selective subscriptions)
- Less boilerplate
- Good TypeScript support
- Easy integration with IndexedDB

### Why Prisma + PostgreSQL?
- Type-safe database access
- Easy migrations
- Good Supabase integration
- Handles relationships well

### Why Next.js App Router?
- Server components for better performance
- Built-in API routes
- File-based routing
- Excellent developer experience

---

## Future Improvements

See `IMPROVEMENT_ROADMAP.md` for detailed roadmap.

### High Priority
- Browser extension improvements
- Advanced search operators
- Bulk operations UI
- Keyboard shortcuts
- Mobile responsive improvements

### Medium Priority
- Collaborative pawkits (sharing)
- AI-powered tagging/categorization
- Full-text search in article content
- Custom views/filters
- Advanced conflict resolution UI

### Nice to Have
- Mobile apps (iOS/Android)
- Desktop app (Electron)
- API for third-party integrations
- Plugins/extensions system

---

## Resources

### Documentation Files
- `LOCAL_FIRST_ARCHITECTURE.md` - Deep dive into local-first design
- `IMPROVEMENT_ROADMAP.md` - Planned features and improvements
- `TESTING_GUIDE.md` - Testing strategies
- `DEPLOYMENT.md` - Deployment instructions
- `SAFETY.md` - Database safety measures

### External Resources
- [Next.js Docs](https://nextjs.org/docs)
- [Prisma Docs](https://www.prisma.io/docs)
- [Supabase Docs](https://supabase.com/docs)
- [Zustand Docs](https://github.com/pmndrs/zustand)
- [Local-First Software](https://www.inkandswitch.com/local-first/)

---

## Quick Reference

### Card States
- `PENDING` - Metadata not yet fetched
- `READY` - Metadata fetched successfully
- `FAILED` - Metadata fetch failed

### Collection (Pawkit) Types
- **Public**: Visible in library, search, timeline
- **Private**: Isolated from main views, optional password

### Session States
- `active` - Currently writing/editing
- `inactive` - Viewing only, shows warning if others are active

### Sync States
- `synced` - Local and server match
- `pending` - Local changes not yet synced
- `conflict` - Simultaneous edits detected

---

**Last Updated:** October 28, 2025
**Current Version:** Branch `feat/multi-session-detection`
**Dev Server:** http://localhost:3002
