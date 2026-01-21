# Pawkit V2 Data Model

> ## ⚠️ DEPRECATED - DO NOT USE
>
> **This skill is for the OLD Next.js + Prisma + Supabase stack.**
>
> The app now uses **TanStack Start + Convex**. See:
> - `.claude/skills/pawkit-tanstack-convex/SKILL.md` - New stack overview
> - `apps/start/docs/convex-guide.md` - Convex schema and patterns
> - `apps/start/convex/schema.ts` - Actual schema file
>
> **Deprecated**: January 21, 2026

---

**Purpose**: Card types, entity relationships, ID strategy, and Prisma/Dexie schemas

**Created**: December 20, 2025

**Updated**: January 2, 2026 - Tag-based architecture (see `.claude/skills/pawkit-tag-architecture/SKILL.md`)

---

> **IMPORTANT**: The `collections` field has been REMOVED. All organization is now done via `tags`.
> See [Tag Architecture SKILL.md](../pawkit-tag-architecture/SKILL.md) for the complete tag system design.

---

## CORE ENTITIES

### Card (Central Entity)

```prisma
model Card {
  id              String    @id @default(cuid())
  workspaceId     String

  // Type determines content handling
  type            String    @default("url")  // url, md-note, text-note, quick-note, file

  // Content fields
  url             String
  title           String?
  description     String?
  content         String?   // Note content or extracted article
  notes           String?   // User annotations (separate from content)

  // Metadata
  domain          String?
  image           String?
  favicon         String?
  metadata        Json?
  status          String    @default("PENDING")  // PENDING, READY, ERROR

  // Organization - TAGS ONLY (no collections field)
  tags            String[]  // Includes Pawkit slugs, user tags, date tags, supertags
  pinned          Boolean   @default(false)

  // Scheduling - NOW DONE VIA DATE TAGS (e.g., #2026-01-30, #time-14-00)
  // scheduledDate, scheduledStartTime, scheduledEndTime are DEPRECATED
  // Use date tags instead: card.tags.includes('2026-01-30')

  // Soft delete
  deleted         Boolean   @default(false)
  deletedAt       DateTime?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
}
```

### Tag Types (All in `tags` array)

| Tag Type | Example | Purpose |
|----------|---------|---------|
| Pawkit slug | `recipes`, `work` | Organization (replaces collections) |
| User tag | `favorite`, `to-read` | Personal categorization |
| Date tag | `2026-01-30` | Scheduling (replaces scheduledDate) |
| Time tag | `time-14-00` | Time scheduling |
| Supertag | `contact`, `todo` | Behavior/template hints |
| System tag | `read`, `5m` | Auto-generated metadata |

### Card Types

| Type | Description | Key Fields |
|------|-------------|------------|
| `url` | Bookmark | `url`, `title`, `image`, `domain` |
| `md-note` | Markdown note | `content`, `title` |
| `text-note` | Plain text note | `content`, `title` |
| `quick-note` | Ephemeral note | `content` (no title required) |
| `file` | File card | `isFileCard: true`, `fileId` |

### Collection (Pawkit)

```prisma
model Collection {
  id          String    @id @default(cuid())
  workspaceId String

  name        String
  slug        String    // User-friendly URL, unique per workspace
  parentId    String?   // For nesting
  position    Int       @default(0)

  // Display
  coverImage  String?
  icon        String?   // emoji

  // Settings
  isPrivate   Boolean   @default(false)
  isSystem    Boolean   @default(false)  // Cannot delete/rename

  // Soft delete
  deleted     Boolean   @default(false)
  deletedAt   DateTime?

  @@unique([workspaceId, slug])
}
```

### Workspace

```prisma
model Workspace {
  id        String   @id @default(cuid())
  name      String
  icon      String?
  userId    String
  isDefault Boolean  @default(false)

  // All content belongs to a workspace
  cards          Card[]
  collections    Collection[]
  calendarEvents CalendarEvent[]
  todos          Todo[]
}
```

---

## ID STRATEGY

### Primary IDs
- **Format**: `cuid()` for all entities
- **Example**: `clxyz123abc456def789`
- **Why**: Collision-resistant, sortable, works offline

### Pawkit References (via Tags)
- **Cards reference Pawkits via TAGS, not a separate field**
- **Pawkit slug IS the tag**: `card.tags = ["restaurants", "to-visit", "favorite"]`
- **Ancestor inheritance**: Card in nested Pawkit gets all ancestor tags
- **See**: [Tag Architecture SKILL.md](../pawkit-tag-architecture/SKILL.md)

### Workspace Isolation
- **ALL queries filter by `workspaceId`**
- **Cards, Collections, Events, Todos all have `workspaceId`**
- **Switching workspace = clear stores + reload from Dexie**

---

## DEXIE SCHEMA (Local Storage)

```typescript
// lib/db/dexie.ts
class PawkitDB extends Dexie {
  cards!: Table<LocalCard>;
  collections!: Table<LocalCollection>;
  events!: Table<LocalEvent>;
  todos!: Table<LocalTodo>;
  syncQueue!: Table<SyncQueueItem>;
  metadata!: Table<{ key: string; value: any }>;
  noteLinks!: Table<NoteLink>;
  imageCache!: Table<CachedImage>;

  constructor() {
    super('pawkit');

    this.version(1).stores({
      // CRITICAL: *tags is a multi-entry index for tag-based queries
      cards: 'id, workspaceId, [workspaceId+_deleted], [workspaceId+type], [workspaceId+status], *tags, updatedAt',
      collections: 'id, workspaceId, [workspaceId+slug], [workspaceId+_deleted], parentId',
      events: 'id, workspaceId, [workspaceId+date], [workspaceId+_deleted]',
      todos: 'id, workspaceId, [workspaceId+completed], [workspaceId+dueDate]',
      syncQueue: '++id, entityType, entityId, operation, createdAt',
      metadata: 'key',
      noteLinks: 'id, sourceNoteId, targetNoteId',
      imageCache: 'id, cachedAt, lastAccessedAt'
    });
  }
}
```

### Indexes
- `*tags` - **CRITICAL**: Multi-entry index for tag-based queries (Pawkits, dates, supertags)
- `[workspaceId+_deleted]` - Fast filtered queries
- `[workspaceId+type]` - Content type filtering
- `[workspaceId+slug]` - Pawkit lookup

---

## LOCAL CARD EXTENSIONS

```typescript
interface LocalCard extends Card {
  // Sync metadata
  _localOnly?: boolean;      // Not yet synced to server
  _synced?: boolean;         // Sync status
  _lastModified?: Date;      // Local modification time
  _serverVersion?: string;   // Server's updatedAt for conflict detection
  _deleted?: boolean;        // Soft delete flag
  _deletedAt?: Date;

  // NOTE: No `collections` field - use `tags` for Pawkit membership
  // Tags include: Pawkit slugs, user tags, date tags, supertags
}
```

---

## RELATIONSHIPS

```
User (1) ─────────> (*) Workspace
Workspace (1) ─────> (*) Card
Workspace (1) ─────> (*) Pawkit (Collection entity)
Workspace (1) ─────> (*) CalendarEvent
Workspace (1) ─────> (*) Todo

Card ←──── tags ────> Pawkit (via tag matching Pawkit slug)
Pawkit (1) ───> (*) Pawkit (self-reference via parentId for nesting)
```

### Tag-Based Relationship

```
Card has tags: ["contacts", "work", "favorite", "2026-01-30"]
                    ↑         ↑         ↑            ↑
                 Pawkit    Pawkit    User tag    Date tag
                 (root)    (leaf)

Pawkit "work" has parentId → Pawkit "contacts"

Query "work" Pawkit: cards where tags.includes("work") AND no descendant tags
Query Library + #contacts: cards where tags.includes("contacts")
```

---

## DESIGN DECISIONS

| Decision | Rationale |
|----------|-----------|
| No separate Notes view | Notes are cards with `type: 'md-note'`, filtered via Library |
| **Tags as universal primitive** | Single array for Pawkits, scheduling, supertags, user tags |
| **No collections field** | Pawkit membership via tags (see Tag Architecture SKILL.md) |
| **Ancestor tag inheritance** | Cards in nested Pawkits get all ancestor tags as breadcrumbs |
| **Leaf-only display** | Cards show in deepest Pawkit only, not parents |
| **Date tags for scheduling** | `#2026-01-30` instead of `scheduledDate` field |
| Soft delete everywhere | Recovery possible, sync-friendly |
| Status field on Card | Async metadata fetch tracking |
| `notes` separate from `content` | User annotations vs scraped content |

---

## QUERYING PATTERNS

### Get all bookmarks in workspace
```typescript
const bookmarks = await db.cards
  .where('[workspaceId+type]')
  .equals([workspaceId, 'url'])
  .filter(c => !c._deleted)
  .toArray();
```

### Get all cards in a Pawkit (leaf-only display)
```typescript
function getCardsInPawkit(workspaceId: string, pawkitSlug: string): Promise<Card[]> {
  const descendants = getDescendantSlugs(pawkitSlug);

  return db.cards
    .where('tags')
    .equals(pawkitSlug)
    .filter(card =>
      card.workspaceId === workspaceId &&
      !card._deleted &&
      !descendants.some(d => card.tags.includes(d))  // Exclude cards in child Pawkits
    )
    .toArray();
}
```

### Get all cards with a tag (Library cross-cutting search)
```typescript
const allContacts = await db.cards
  .where('tags')
  .equals('contacts')  // Shows ALL contacts, including those in child Pawkits
  .filter(c => c.workspaceId === workspaceId && !c._deleted)
  .toArray();
```

### Get cards for a date (calendar)
```typescript
const cardsOnDate = await db.cards
  .where('tags')
  .equals('2026-01-30')  // Date tag
  .filter(c => c.workspaceId === workspaceId && !c._deleted)
  .toArray();
```

### Get nested Pawkits
```typescript
const children = await db.collections
  .where('parentId')
  .equals(parentPawkitId)
  .filter(c => !c._deleted)
  .toArray();
```

---

> **See Also**: [Tag Architecture SKILL.md](../pawkit-tag-architecture/SKILL.md) for complete tag system documentation.

---

**Last Updated**: January 2, 2026
