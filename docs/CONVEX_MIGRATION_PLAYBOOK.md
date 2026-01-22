# Convex Native Migration Playbook

Status: Historical. The Convex migration is complete; this playbook is retained for reference.

> **Goal:** Migrate Pawkit from Dexie/IndexedDB to native Convex backend. No compatibility layers, no mapping - pure Convex.

## Native Convex Non-Negotiables

- Convex is the source of truth for all data.
- No Dexie/IndexedDB data model or LocalCard mapping.
- No unified/compat data contexts.
- No Supabase auth or API routes in the request path.
- All reads via `useQuery`, all writes via `useMutation` (Convex only).
- Real-time reactivity is the default behavior everywhere.

## Current State (As of January 2025)

### What Exists Now

The codebase has a **hybrid architecture** with compatibility layers:

```
┌─────────────────────────────────────────────────────────────┐
│                      Components                              │
│  (use LocalCard, LocalCollection types)                     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              Unified Data Context                            │
│  - Maps Convex Doc<"cards"> → LocalCard                     │
│  - Maps Convex Doc<"collections"> → LocalCollection         │
│  - Provides useCards(), useCollections() hooks              │
└─────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              ▼                               ▼
┌─────────────────────────┐     ┌─────────────────────────┐
│    Convex Backend       │     │    Dexie (IndexedDB)    │
│  (when CONVEX_URL set)  │     │    (fallback mode)      │
└─────────────────────────┘     └─────────────────────────┘
```

### Problems with Current Approach

1. **Type Mapping Overhead**: Every Convex document gets mapped to `LocalCard` type
2. **Legacy Field Workarounds**: e.g., computing `scheduledDate` from `scheduledDates[0]`
3. **Two Mental Models**: Developers must understand both Dexie and Convex patterns
4. **Underutilized Convex Features**: Real-time subscriptions, optimistic updates not fully leveraged
5. **Sync Complexity**: Old sync code (`sync-queue.ts`, `use-realtime-sync.ts`) still exists

---

## Target State (Native Convex)

```
┌─────────────────────────────────────────────────────────────┐
│                      Components                              │
│  (use Convex Doc<"cards">, Doc<"collections"> directly)     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              Convex React Hooks                              │
│  - useQuery(api.cards.list, { workspaceId })                │
│  - useMutation(api.cards.create)                            │
│  - Native real-time subscriptions                           │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Convex Backend                            │
│  - All data stored in Convex                                │
│  - Real-time sync built-in                                  │
│  - Server functions for mutations                           │
└─────────────────────────────────────────────────────────────┘
```

### Benefits of Native Convex

- **Real-time by default**: All queries auto-update when data changes
- **Type safety**: Generated types from schema, no manual mapping
- **Optimistic updates**: Built-in support via `useMutation`
- **Simpler code**: No sync queue, no conflict resolution, no mapping
- **Server authority**: All mutations validated server-side

---

## Migration Phases

### Phase 0: Remove Compatibility Layers (Do Early)

- Delete `src/lib/contexts/unified-data-context.tsx`
- Delete `src/lib/contexts/data-context.tsx`
- Delete `src/lib/hooks/use-unified-mutations.ts`
- Delete `src/lib/hooks/use-live-data.ts`
- Stop all `LocalCard`/Dexie types in components

### Phase 1: Create Native Convex Hooks  (Partially Done)

**Status**: Convex schema and mutations exist in `/convex/`

Files that exist:
- `convex/schema.ts` - Database schema
- `convex/cards.ts` - Card queries/mutations
- `convex/collections.ts` - Collection queries/mutations
- `convex/events.ts` - Calendar event queries/mutations
- `convex/workspaces.ts` - Workspace queries/mutations
- `convex/users.ts` - User/auth (DEV_MODE enabled)

### Phase 2: Create Native React Hooks (TODO)

Create new hooks that use Convex directly without mapping:

```typescript
// src/lib/hooks/convex/use-convex-cards.ts
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Doc, Id } from '@/convex/_generated/dataModel';

export function useConvexCards(workspaceId: Id<"workspaces"> | undefined) {
  return useQuery(
    api.cards.list,
    workspaceId ? { workspaceId } : "skip"
  ) ?? [];
}

export function useConvexCard(cardId: Id<"cards"> | undefined) {
  return useQuery(
    api.cards.get,
    cardId ? { id: cardId } : "skip"
  );
}

export function useCreateCard() {
  return useMutation(api.cards.create);
}

export function useUpdateCard() {
  return useMutation(api.cards.update);
}

export function useDeleteCard() {
  return useMutation(api.cards.remove);
}
```

**Files to create:**
- `src/lib/hooks/convex/use-convex-cards.ts`
- `src/lib/hooks/convex/use-convex-collections.ts`
- `src/lib/hooks/convex/use-convex-events.ts`
- `src/lib/hooks/convex/use-convex-workspace.ts`
- `src/lib/hooks/convex/index.ts` (barrel export)

### Phase 3: Update Components to Use Native Types

Components need to use `Doc<"cards">` instead of `LocalCard`.

**Key Type Differences:**

| LocalCard (Dexie) | Doc<"cards"> (Convex) |
|-------------------|----------------------|
| `id: string` | `_id: Id<"cards">` |
| `_deleted: boolean` | `deleted: boolean` |
| `_deletedAt?: Date` | `deletedAt?: number` |
| `scheduledDate?: Date` | *(removed - use scheduledDates)* |
| `scheduledDates?: string[]` | `scheduledDates: string[]` |
| `createdAt: Date` | `createdAt: number` (timestamp) |
| `updatedAt: Date` | `updatedAt: number` (timestamp) |
| `_synced, _lastModified, etc.` | *(removed - Convex handles sync)* |

**Pattern for component migration:**

```typescript
// BEFORE (compatibility layer)
import { useCards } from '@/lib/hooks/use-live-data';
import { useUnifiedMutations } from '@/lib/hooks/use-unified-mutations';
import type { LocalCard } from '@/lib/db/types';

function MyComponent() {
  const cards = useCards(workspaceId);
  const { updateCard } = useUnifiedMutations();

  // Filter for daily notes
  const dailyNote = cards.find(c =>
    c.isDailyNote &&
    c.scheduledDate &&
    isSameDay(new Date(c.scheduledDate), today)
  );
}

// AFTER (native Convex)
import { useConvexCards, useUpdateCard } from '@/lib/hooks/convex';
import type { Doc, Id } from '@/convex/_generated/dataModel';

function MyComponent() {
  const cards = useConvexCards(workspaceId);
  const updateCard = useUpdateCard();

  // Filter for daily notes (use scheduledDates array)
  const todayStr = format(today, 'yyyy-MM-dd');
  const dailyNote = cards.find(c =>
    c.isDailyNote &&
    c.scheduledDates.includes(todayStr)
  );
}
```

### Phase 4: Migrate Components (Priority Order)

#### High Priority (Core Functionality)
1. **Home widgets** - Daily log, todo, bills, scheduled today
2. **Library views** - Grid, list, masonry layouts
3. **Card detail modal** - View/edit cards
4. **Omnibar** - Search and quick add

#### Medium Priority
5. **Calendar views** - Day, week, month views
6. **Pawkits (collections)** - Collection pages, tree navigation
7. **Settings** - User preferences, view settings

#### Low Priority
8. **Context menus** - Right-click actions
9. **Drag and drop** - Reordering, moving cards
10. **Bulk operations** - Multi-select actions

---

## Client-Only Data Rule

Convex `useQuery` and `useMutation` are client-side hooks. Any page or layout that reads data must be a client component or render through a client child. Avoid server-side auth/data checks for now.

---

## Auth and Routing (Convex Only)

- Replace Supabase login/signup flows with Convex Auth UI.
- Gate UI using `Authenticated` / `Unauthenticated`.
- Remove Supabase session checks in layouts and middleware.

---

## Storage (Convex Only)

- Replace Supabase Storage usage with Convex Storage.
- Remove `src/lib/metadata/image-persistence.ts` or port it to Convex actions + storage.
- Update any upload flows to use Convex `storageId`.

---

## Files to Delete After Migration

Remove these as soon as Convex hooks are live (no fallback):

### Dexie/IndexedDB
- `src/lib/db/index.ts` - Dexie database setup
- `src/lib/db/schema.ts` - Dexie schema
- `src/lib/db/types.ts` - LocalCard, LocalCollection types (keep for reference during migration)
- `src/lib/db/local-only.ts` - Local-only database

### Sync Infrastructure
- `src/lib/services/sync-queue.ts` - Sync queue for Supabase
- `src/lib/hooks/use-sync.ts` - Sync hook
- `src/lib/hooks/use-realtime-sync.ts` - Realtime sync

### Compatibility Layers
- `src/lib/contexts/unified-data-context.tsx` - Unified provider with mapping
- `src/lib/contexts/convex-data-context.tsx` - Convex data context (if exists)
- `src/lib/contexts/data-context.tsx` - Dexie data context
- `src/lib/hooks/use-unified-mutations.ts` - Unified mutations
- `src/lib/hooks/use-live-data.ts` - Live data hooks (uses mapping)

### Supabase (after full migration)
- `src/lib/supabase/*` - All Supabase client/server code
- `src/app/api/auth/*` - Auth API routes
 - `src/app/(auth)/*` - Supabase login/signup flows

### Stores (Dexie-dependent)
- `src/lib/stores/data-store.ts` - Uses Dexie for mutations

---

## Component Migration Checklist

For each component, follow this checklist:

### Pre-Migration
- [ ] Identify all data hooks used (useCards, useCollections, etc.)
- [ ] Identify all mutation functions used (createCard, updateCard, etc.)
- [ ] Note any `LocalCard` or `LocalCollection` type usage
- [ ] Check for `_deleted`, `scheduledDate`, or other legacy fields

### Migration Steps
- [ ] Replace `useCards()` with `useConvexCards()`
- [ ] Replace `useUnifiedMutations()` with individual mutation hooks
- [ ] Update type annotations from `LocalCard` to `Doc<"cards">`
- [ ] Replace `card.id` with `card._id`
- [ ] Replace `card._deleted` with `card.deleted`
- [ ] Replace `scheduledDate` usage with `scheduledDates` array
- [ ] Convert Date objects to timestamps where needed
- [ ] Remove any `triggerSync()` calls (Convex syncs automatically)

### Post-Migration
- [ ] Test all CRUD operations
- [ ] Verify real-time updates work
- [ ] Check for TypeScript errors
- [ ] Remove unused imports

---

## Convex Schema Reference

Current schema in `convex/schema.ts`:

### Cards Table
```typescript
cards: defineTable({
  workspaceId: v.id("workspaces"),
  type: v.string(),                    // "url" | "md-note" | "text-note" | "file"
  url: v.optional(v.string()),
  title: v.optional(v.string()),
  description: v.optional(v.string()),
  content: v.optional(v.any()),        // Plate JSON or string
  contentText: v.optional(v.string()), // Plain text for search
  notes: v.optional(v.string()),
  domain: v.optional(v.string()),
  image: v.optional(v.string()),
  images: v.optional(v.array(v.string())),
  favicon: v.optional(v.string()),
  tags: v.array(v.string()),
  pinned: v.boolean(),
  scheduledDates: v.array(v.string()), // ["2025-01-19", "2025-01-20"]
  scheduledStartTime: v.optional(v.string()),
  scheduledEndTime: v.optional(v.string()),
  isDailyNote: v.boolean(),
  status: v.string(),                  // "PENDING" | "READY" | "ERROR"
  deleted: v.boolean(),
  deletedAt: v.optional(v.number()),
  // ... more fields
  createdAt: v.number(),               // Timestamp
  updatedAt: v.number(),               // Timestamp
})
```

### Collections Table
```typescript
collections: defineTable({
  workspaceId: v.id("workspaces"),
  name: v.string(),
  slug: v.string(),
  parentId: v.optional(v.id("collections")),
  position: v.number(),
  icon: v.optional(v.string()),
  coverImage: v.optional(v.string()),
  isPrivate: v.boolean(),
  isSystem: v.boolean(),
  pinned: v.boolean(),
  deleted: v.boolean(),
  // ... more fields
})
```

---

## Common Patterns

### Filtering Cards

```typescript
// Get non-deleted cards
const activeCards = cards.filter(c => !c.deleted);

// Get daily note for today
const todayStr = format(new Date(), 'yyyy-MM-dd');
const dailyNote = cards.find(c =>
  c.isDailyNote &&
  !c.deleted &&
  c.scheduledDates.includes(todayStr)
);

// Get cards with specific tag
const todoCards = cards.filter(c =>
  !c.deleted &&
  c.tags.includes('todo')
);

// Get trashed cards
const trashedCards = cards.filter(c => c.deleted);
```

### Mutations

```typescript
// Create card
const createCard = useMutation(api.cards.create);
const cardId = await createCard({
  workspaceId,
  type: 'md-note',
  title: 'My Note',
  content: '{"type":"doc","content":[]}',
  tags: [],
  pinned: false,
  scheduledDates: [],
  isDailyNote: false,
});

// Update card
const updateCard = useMutation(api.cards.update);
await updateCard({
  id: cardId,
  title: 'Updated Title',
  content: newContent,
});

// Delete card (soft delete)
const deleteCard = useMutation(api.cards.remove);
await deleteCard({ id: cardId });

// Restore card
const restoreCard = useMutation(api.cards.restore);
await restoreCard({ id: cardId });

// Permanent delete
const permanentDelete = useMutation(api.cards.permanentDelete);
await permanentDelete({ id: cardId });
```

### Working with IDs

```typescript
import { Id } from '@/convex/_generated/dataModel';

// Card IDs are typed
const cardId: Id<"cards"> = card._id;

// When passing to mutations, use the typed ID
await updateCard({ id: card._id, title: 'New Title' });

// When receiving from URL params, cast carefully
const cardIdFromUrl = params.id as Id<"cards">;
```

---

## Testing Checklist

After migrating a component, verify:

### Basic CRUD
- [ ] Can create new items
- [ ] Can read/display items
- [ ] Can update items
- [ ] Can delete items (soft delete)
- [ ] Can restore deleted items
- [ ] Can permanently delete items

### Real-time
- [ ] Changes appear immediately without refresh
- [ ] Multiple browser tabs stay in sync
- [ ] Optimistic updates feel instant

### Edge Cases
- [ ] Empty states display correctly
- [ ] Loading states display correctly
- [ ] Error states handled gracefully
- [ ] Large datasets perform well

---

## Environment Setup

Required environment variables:

```env
# Convex
NEXT_PUBLIC_CONVEX_URL=https://your-project.convex.cloud
CONVEX_DEPLOY_KEY=your-deploy-key

# Remove these after migration
# NEXT_PUBLIC_SUPABASE_URL=...
# NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

---

## Current Issues to Fix

### Immediate (Blocking)
1. Widgets using `useDataStore` instead of Convex mutations - **FIXED**
2. Direct `db.cards` queries instead of Convex queries - **FIXED**
3. `scheduledDate` not mapped from Convex - **FIXED** (workaround)

### Short-term
4. Components still use `LocalCard` types
5. Mapping layer adds overhead
6. Legacy sync code still exists

### Long-term
7. Full removal of Dexie/Supabase code
8. Implement proper Convex Auth (replace DEV_MODE)
9. Add offline support via Convex (if needed)

---

## Questions for Future Work

1. **Offline support**: Does the app need to work offline? Convex has different patterns for this.
2. **Auth**: When to implement real Convex Auth (Clerk, Auth0)?
3. **File storage**: Cards with files - use Convex storage?
4. **Search**: Use Convex search indexes or external search?

---

## Resources

- [Convex Documentation](https://docs.convex.dev)
- [Convex React Hooks](https://docs.convex.dev/client/react)
- [Convex Schema](https://docs.convex.dev/database/schemas)
- [Convex Auth](https://docs.convex.dev/auth)
