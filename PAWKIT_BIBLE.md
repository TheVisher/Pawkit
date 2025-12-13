# The Pawkit Bible

> **One document to rule them all.**
> This is your single source of truth for everything Pawkit.
> Last Updated: December 13, 2025

---

## Table of Contents

1. [What is Pawkit?](#what-is-pawkit)
2. [Architecture](#architecture)
3. [Current Status](#current-status)
4. [Feature Inventory](#feature-inventory)
5. [Technical Decisions](#technical-decisions)
6. [UI/UX Design System](#uiux-design-system)
7. [Data Patterns](#data-patterns)
8. [Sync Architecture](#sync-architecture)
9. [Security Model](#security-model)
10. [Known Issues & Gotchas](#known-issues--gotchas)
11. [Future Plans](#future-plans)
12. [Development Guidelines](#development-guidelines)
13. [Related Documents](#related-documents)

---

## What is Pawkit?

**Pawkit** is a local-first bookmarking and note-taking app with cloud backup.

### Vision Statement
A personal knowledge management system where your data is yours, available offline, and synced seamlessly across devices.

### Core Philosophy
- **Local-first**: IndexedDB is the source of truth, server is backup
- **Privacy-focused**: Private Pawkits (collections) are truly private
- **Cross-platform**: Web app, browser extensions (Chrome/Firefox), mobile (iOS/Android)
- **AI-enhanced**: Kit assistant for intelligent organization

### Key Differentiators
1. Works offline - full functionality without internet
2. Private collections that never appear in public views
3. Multi-provider cloud backup (Filen, Google Drive, Dropbox, OneDrive)
4. Browser extensions for quick capture
5. Beautiful glass morphism design option

---

## Architecture

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14, React, TypeScript |
| Styling | Tailwind CSS, CSS Variables (theme-aware) |
| State | Zustand (client), React Query (server) |
| Local DB | IndexedDB (via idb library) |
| Server DB | PostgreSQL (via Supabase + Prisma) |
| Auth | Supabase Auth (OAuth, Email) |
| Hosting | Vercel (web), Chrome/Firefox stores (extensions) |
| Mobile | React Native + Expo |

### Data Flow (Local-First)

```
User Action (e.g., save bookmark)
    ↓
IndexedDB (instant write) ← SOURCE OF TRUTH
    ↓
UI Update (optimistic, instant)
    ↓
Sync Queue (debounced, 2s)
    ↓
Background Server Sync
    ↓
Supabase PostgreSQL (backup)
    ↓
Cloud Providers (Filen, GDrive, etc.)
    ↓
Other Open Tabs (BroadcastChannel)
```

### Key Principle
**IndexedDB is ALWAYS the source of truth.** Server can be wiped; local data survives.

---

## Current Status

### Deployment Status

| Platform | Status | Version |
|----------|--------|---------|
| Web App | Production | - |
| Chrome Extension | Published | v1.1.0 |
| Firefox Extension | Published | v1.1.0 |
| iOS App | TestFlight | Beta |
| Android App | In Development | - |

### Database Status (December 2025)

| Table | Rows | RLS |
|-------|------|-----|
| Card | ~765 | ✅ |
| Collection | ~85 | ✅ |
| User | ~61 | ✅ |
| UserSettings | ~57 | ✅ |
| CalendarEvent | ~46 | ✅ |
| All others | Various | ✅ |

**All 11 public tables have RLS enabled with proper policies.**

---

## Feature Inventory

### Complete & Working

| Feature | Status | Notes |
|---------|--------|-------|
| URL Bookmarking | ✅ Done | Quick-add via omnibar, extension |
| Notes (Markdown) | ✅ Done | Full editor with preview |
| Collections (Pawkits) | ✅ Done | Hierarchical, drag-drop |
| Private Pawkits | ✅ Done | Server-filtered, truly private |
| Tags | ✅ Done | Multi-tag per card |
| Search | ✅ Done | Full-text, operators (is:note, tag:) |
| Multiple Layouts | ✅ Done | Grid, List, Masonry, Compact |
| Multi-Session Detection | ✅ Done | Banner + write guards |
| Theme System | ✅ Done | Modern, Glass, Light, Dark, Purple |
| Cloud Sync - Filen | ✅ Done | Direct upload, encryption |
| Cloud Sync - Google Drive | ✅ Done | OAuth flow |
| Cloud Sync - Dropbox | ✅ Done | OAuth flow |
| Cloud Sync - OneDrive | ✅ Done | OAuth flow |
| File Attachments | ✅ Done | Images, PDFs, documents |
| PDF Viewer | ✅ Done | Reader mode with zoom |
| Calendar View | ✅ Done | Events, timeline |
| Browser Extensions | ✅ Done | Chrome, Firefox |
| User Isolation | ✅ Done | Per-user IndexedDB databases |

### In Progress

| Feature | Status | Blocker |
|---------|--------|---------|
| Kit AI Assistant | 🟡 Active | Chat panel integration |
| Mobile Apps | 🟡 Active | iOS in TestFlight |

### Not Started / Future

| Feature | Priority | Notes |
|---------|----------|-------|
| Kit OCR | Medium | Extract text from images |
| Snippet Tool | Medium | Code snippet management |
| Subscription Tracking | Low | Track recurring services |
| Collaborative Collections | Low | Share with others |

---

## Technical Decisions

### Why Local-First?
1. **Instant UI** - No waiting for server
2. **Offline support** - Full functionality without network
3. **Data ownership** - User's data on their device
4. **Resilience** - Server outage doesn't break the app

### Why Supabase?
1. **PostgreSQL** - Robust, familiar
2. **Row Level Security** - Per-user data isolation at DB level
3. **Auth built-in** - OAuth, email, magic links
4. **Real-time** - Subscriptions if needed later
5. **Free tier** - Good for indie project

### Why Not Prisma for RLS?
Prisma doesn't support partial unique indexes. We use:
- Prisma for schema management and client generation
- Raw SQL migrations via Supabase for RLS and partial indexes

### Cards vs Notes Distinction

**CRITICAL**: Notes and Bookmarks have different rules.

| Type | URL Constraint | Can Duplicate? |
|------|----------------|----------------|
| `url` (bookmark) | Yes - unique per user | No |
| `md-note` | No constraint | Yes |
| `text-note` | No constraint | Yes |

**Never apply URL uniqueness to notes!** Notes have empty URLs by design.

---

## UI/UX Design System

### The Golden Rule
**All components must use CSS variables.** This makes themes work automatically.

```tsx
// ✅ CORRECT - Works in all themes
style={{ background: 'var(--bg-surface-2)' }}

// ❌ WRONG - Only works in Glass mode
className="bg-white/5 backdrop-blur-md"
```

### Default Style: Modern

**Modern is the default.** Glass is opt-in via settings.

Modern uses:
- Solid surfaces with depth
- Shadows with purple glow (dark mode)
- `translateY(-1px)` hover lift
- No backdrop-blur in component code

### Surface Hierarchy

```
Level 0: --bg-base       (page background)
Level 1: --bg-surface-1  (sidebars, inset areas)
Level 2: --bg-surface-2  (cards, containers)
Level 3: --bg-surface-3  (raised elements)
Level 4: --bg-surface-4  (hover states)
```

### Shadow System

```css
--shadow-1: subtle (buttons)
--shadow-2: medium (cards)
--shadow-3: strong (modals)
--shadow-4: maximum (tooltips)
--raised-shadow: neumorphic raised
--inset-shadow: neumorphic recessed
```

### Component Patterns

**Raised Container** (cards, panels):
```tsx
style={{
  background: 'var(--bg-surface-2)',
  boxShadow: 'var(--shadow-2)',
  border: '1px solid var(--border-subtle)',
  borderTopColor: 'var(--border-highlight-top)',
}}
```

**Inset Container** (input areas, filters):
```tsx
style={{
  background: 'var(--bg-surface-1)',
  boxShadow: 'var(--inset-shadow)',
  border: 'var(--inset-border)',
}}
```

**Button with Hover Lift**:
```tsx
className="hover:-translate-y-0.5 hover:shadow-elevation-2 transition-all"
```

### Theme Combinations

Components must work with ALL of these:
- Modern mode (default)
- Glass mode (transparent + blur)
- Light mode
- Dark mode
- Purple tint
- ALL combinations

**This is automatic if you use CSS variables.**

---

## Data Patterns

### Collections Use SLUGS, Not IDs

**CRITICAL**: Cards reference collections by `slug`, never by `id`.

```typescript
// ✅ CORRECT
card.collections: string[]  // ["personal", "work"]

// ❌ WRONG
card.collections: string[]  // ["cm123abc", "cm456def"]
```

### Hierarchical Collection Management

**Always use hierarchy utilities** when adding/removing cards from collections:

```typescript
import { addCollectionWithHierarchy } from "@/lib/utils/collection-hierarchy";

// When adding to sub-collection "Restaurants > Seattle":
const newCollections = addCollectionWithHierarchy(
  card.collections,
  "seattle",  // child slug
  allCollections  // full tree
);
// Result: ["seattle", "restaurants"] - includes parent!
```

### View Settings

View settings (layout, card size) are **localStorage only**. No server sync.

Priority: URL param > localStorage > default

### Card Types

```typescript
type CardType = 'url' | 'md-note' | 'text-note';

// URL bookmarks: Can have unique URL constraint
// Notes: NEVER constrain by URL
```

---

## Sync Architecture

### Sync Flow

1. **User Action** → Immediate write to IndexedDB
2. **UI Update** → Optimistic, instant
3. **Queue Sync** → Debounced (2 seconds)
4. **Server Sync** → Background PATCH/POST
5. **Broadcast** → Other tabs via BroadcastChannel
6. **Conflict Resolution** → If 409

### Conflict Resolution Strategies

| Type | Strategy |
|------|----------|
| Multi-session (same user, different tabs) | Active session wins |
| Multi-device (same user, different devices) | Last-write-wins (timestamp) |
| Server conflict (409) | Server-wins for others, client-wins for queued |
| Duplicate creation | Return existing (409 with resource) |
| Deletion sync | Update local entity, don't create duplicate |

### Critical Sync Rules

1. **Dequeue after immediate sync success** - Prevents duplicates
2. **Update local entity for deletions** - Don't save server entity directly
3. **Never lose user data** - Local is source of truth

### Multi-Session Detection

- localStorage marker: `pawkit_active_sessions`
- Only active session can write
- "Take Control" button for inactive tabs
- Banner warning when multiple tabs open

---

## Security Model

### Core Principles

1. **Never trust the client** - All security checks server-side
2. **Defense in depth** - Multiple layers
3. **Privacy first** - Private content truly private
4. **Fail secure** - Default to restrictive

### Authentication

Every API route:
1. Verify user with `getServerUser(request)`
2. Return 401 if not authenticated
3. Use server-verified user ID (never from client)

### Authorization

1. Verify user owns resource before mutations
2. Return 404 (not 403) if unauthorized - don't leak existence
3. Check `isPrivate` flag on all queries
4. Filter private cards SERVER-SIDE, never client

### User Isolation (Per-User Databases)

Each user gets their own IndexedDB database:
- Database name includes userId: `pawkit-${userId}-${workspaceId}-local-storage`
- Marker for user switch detection: `pawkit_last_user_id`
- **CRITICAL**: Clear markers on sign out!

```typescript
// Sign out MUST include:
localStorage.removeItem('pawkit_last_user_id');
localStorage.removeItem('pawkit_active_device');
await supabase.auth.signOut();
```

### RLS Policies

All Supabase tables have Row Level Security:
- Uses optimized `(select auth.uid())` pattern
- Per-user data isolation at database level

---

## Known Issues & Gotchas

### Issue: Cards in Private Pawkits Appear in Library

**Cause**: Client-side filtering (can be bypassed)

**Fix**: Server-side filtering with `isPrivate: false`

### Issue: Duplicate Notes Created

**Cause**: Sync queue not dequeued after immediate sync success

**Fix**: Call `syncQueue.removeByTempId(tempId)` after successful POST

### Issue: Zombie Collections After Sync

**Cause**: Saving server entity directly instead of updating local

**Fix**: Always update LOCAL entity with deletion flag, not save server entity

### Issue: Kit Component Causes Errors

**Cause**: Multiple Kit components mounted (chat-overlay, sidebar-embed, etc.)

**Fix**: Only mount ONE Kit component at a time

### Issue: User Data Bleeding Between Accounts

**Cause**: `pawkit_last_user_id` not cleared on sign out

**Fix**: Always clear session markers in sign out function

### Issue: 409 Conflict on Collection Creation

**Cause**: Global slug uniqueness (should be per-user)

**Fix**: Use per-user unique constraint: `(userId, slug)`

### Issue: Private Filter Not Working

**Cause**: Using `collection.id` instead of `collection.slug` for filtering

**Fix**: Always use `slug` when comparing with card.collections array

---

## Future Plans

### Near-Term (Current Roadmap)

1. **Kit AI Assistant** - Chat panel overlay complete, sidebar embed in progress
2. **Mobile Apps** - iOS TestFlight, Android development
3. **Performance Polish** - Debounce link extraction, reduce console spam

### Medium-Term

1. **Kit OCR** - Extract text from images in attachments
2. **Snippet Tool** - Code snippet management with syntax highlighting
3. **Advanced Search** - Saved searches, search history

### Long-Term / Ideas

1. **Collaborative Collections** - Share Pawkits with others
2. **Subscription Tracking** - Track recurring services
3. **Browser History Integration** - Import/sync browser history
4. **Reading Mode** - Distraction-free article reading

---

## Development Guidelines

### Before Writing Code

1. **Read this document first**
2. **Check SKILL_INDEX.md** for task-specific skills
3. **For UI work**: Read COMPONENT_REGISTRY.md first
4. **For sync work**: Read pawkit-sync-patterns
5. **For database work**: Read pawkit-database

### Code Conventions

**Collections**: Always use `slug` for card references, not `id`

**Hierarchy**: Use `addCollectionWithHierarchy()` for adding to collections

**UI Components**: CSS variables for all colors/backgrounds

**API Routes**: Declare variables outside try block for error handler access

**Error Messages**: Generic to client, detailed to server logs

### Testing Checklist

Before merging:
- [ ] Test with URL bookmarks AND notes
- [ ] Test private pawkit filtering
- [ ] Test offline functionality
- [ ] Test multi-session behavior
- [ ] Run pre-merge test suite (90%+ pass rate)

### Migration Safety

1. **Backup first** - Always
2. **Test on staging** - With production data copy
3. **Keep old fields** - Drop after 1-2 weeks
4. **Make idempotent** - Safe to run multiple times
5. **Filter by type** - Never delete notes in URL cleanup!

---

## Quick Reference

### Key Files

| File | Purpose |
|------|---------|
| `lib/stores/data-store.ts` | Main data store (cards, collections) |
| `lib/services/local-storage.ts` | IndexedDB operations |
| `lib/services/sync-queue.ts` | Background sync queue |
| `lib/hooks/use-panel-store.ts` | Sidebar panel state |
| `app/globals.css` | CSS variables, themes |
| `.claude/skills/SKILL_INDEX.md` | Route to correct skill files |

### Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# OAuth Providers
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
DROPBOX_CLIENT_ID=
DROPBOX_CLIENT_SECRET=
MICROSOFT_CLIENT_ID=
MICROSOFT_CLIENT_SECRET=
```

### Database Info

- **Project ID**: `jaasnsfhfrmbqnnghogt`
- **Region**: `us-west-1`
- **Schema**: See `.claude/skills/pawkit-database/SKILL.md`

---

## Related Documents

> **All important documentation is consolidated in `docs/`**
> This section tells you what each document contains and when to reference it.

### Core Documentation (docs/)

| Document | Purpose | When to Read |
|----------|---------|--------------|
| **LOCAL_FIRST_ARCHITECTURE.md** | Deep dive into local-first design, IndexedDB as source of truth, sync algorithms, data flow diagrams | When debugging sync issues or understanding why data persists |
| **PAWKIT_UI_DESIGN_SYSTEM.md** | Complete design system v2.0 - HSL color tokens, elevation system, component specs, Tailwind integration | Before any UI work or when adding new components |
| **SECURITY_AUDIT_2025-12-03.md** | Comprehensive security review - env vars, auth, RLS, rate limiting, input validation, file uploads | Before security-related changes or during audits |
| **filen-direct-upload-implementation.md** | How Filen direct uploads work - API endpoints, encryption format, chunk uploads, metadata format | When debugging Filen integration issues |

### Operations (docs/)

| Document | Purpose | When to Read |
|----------|---------|--------------|
| **DEPLOYMENT.md** | Step-by-step deployment guide - Supabase setup, Vercel config, migrations, troubleshooting | When deploying or setting up new environments |
| **CHANGELOG.md** | Version history with all features, fixes, and changes by date | To see what changed and when |

### Database Safety (.claude/instructions.md)

**All database safety rules are in `.claude/instructions.md`** which auto-loads every chat. Includes:
- Forbidden commands, safe commands, production detection
- Recovery procedures (local + Supabase)
- Security notes about credentials

### Legal & Privacy (Root)

| Document | Purpose | When to Read |
|----------|---------|--------------|
| **PRIVACY.md** | Privacy policy for browser extension - data collection, permissions, user rights | When updating extension or handling user data questions |
| **README.md** | Public-facing project overview | When onboarding or sharing the project |

### AI Assistant Instructions (.claude/)

| Document | Purpose | When to Read |
|----------|---------|--------------|
| **instructions.md** | Claude Code rules - project context, database safety, skill system, pnpm usage, recovery procedures | Auto-loads every chat |

### Implementation Plans (.claude/plans/)

| Document | Purpose | When to Read |
|----------|---------|--------------|
| **KIT_AI_IMPLEMENTATION.md** | Kit AI assistant implementation plan | When working on Kit features |
| **KIT_OVERLAY_UI.md** | Kit overlay UI specifications | When working on Kit chat interface |
| **DYNAMIC_TOP_BAR.md** | Dynamic top bar implementation | Historical reference |

### Skill System (.claude/skills/)

| Skill | Purpose |
|-------|---------|
| **SKILL_INDEX.md** | Routes you to the right skill for any task |
| **pawkit-conventions** | Data model patterns, slug vs ID, hierarchy utilities |
| **pawkit-ui-ux** | UI patterns, CSS variables, component registry |
| **pawkit-sync-patterns** | Sync architecture, conflict resolution, multi-session |
| **pawkit-api-patterns** | API conventions, error handling, authentication |
| **pawkit-database** | Schema, RLS policies, constraints |
| **pawkit-cloud-providers** | Filen, GDrive, Dropbox, OneDrive integration |
| **pawkit-security** | Auth, authorization, privacy patterns |
| **pawkit-testing** | Testing approach and standards |
| **pawkit-troubleshooting** | Known issues and their fixes |
| **pawkit-performance** | Performance patterns and best practices |
| **pawkit-migrations** | Safe deployment and data migration |
| **pawkit-roadmap** | Feature roadmap and TODO tracking |
| **pawkit-project-context** | Development history and session tracking |

### Platform-Specific (packages/, mobile/)

| Document | Purpose |
|----------|---------|
| **packages/extension/README.md** | Browser extension development guide |
| **mobile/README.md** | React Native mobile app overview |
| **mobile/SETUP_GUIDE.md** | Mobile development environment setup |

---

## Updating This Document

When you:
- Make a major architecture decision → Update Architecture section
- Complete a feature → Update Feature Inventory
- Discover a gotcha → Add to Known Issues
- Change a pattern → Update relevant section
- Have a new idea → Add to Future Plans

**This is your living document. Keep it current.**

---

*"The best documentation is the one you actually read."*
