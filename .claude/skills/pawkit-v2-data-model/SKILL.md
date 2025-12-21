# Pawkit V2 Data Model

**Purpose**: Card types, entity relationships, ID strategy, and Prisma/Dexie schemas

**Created**: December 20, 2025

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

  // Organization
  tags            String[]
  collections     String[]  // Array of collection SLUGS (not IDs)
  pinned          Boolean   @default(false)

  // Scheduling
  scheduledDate   DateTime?
  scheduledStartTime String?
  scheduledEndTime   String?

  // Soft delete
  deleted         Boolean   @default(false)
  deletedAt       DateTime?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
}
```

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

### Collection References
- **Cards reference collections by SLUG, not ID**
- **Why**: User-friendly URLs, readable in data
- **Example**: `card.collections = ["restaurants", "to-visit"]`

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
      cards: 'id, workspaceId, [workspaceId+deleted], [workspaceId+type], [workspaceId+status], updatedAt',
      collections: 'id, workspaceId, [workspaceId+slug], [workspaceId+deleted], parentId',
      events: 'id, workspaceId, [workspaceId+date], [workspaceId+deleted]',
      todos: 'id, workspaceId, [workspaceId+completed], [workspaceId+dueDate]',
      syncQueue: '++id, entityType, entityId, operation, createdAt',
      metadata: 'key',
      noteLinks: 'id, sourceNoteId, targetNoteId',
      imageCache: 'id, cachedAt, lastAccessedAt'
    });
  }
}
```

### Compound Indexes
- `[workspaceId+deleted]` - Fast filtered queries
- `[workspaceId+type]` - Content type filtering
- `[workspaceId+slug]` - Collection lookup

---

## LOCAL CARD EXTENSIONS

```typescript
interface LocalCard extends Card {
  _localOnly?: boolean;      // Not yet synced to server
  _pendingSync?: boolean;    // Has unsynced changes
  _serverVersion?: string;   // Server's updatedAt for conflict detection
}
```

---

## RELATIONSHIPS

```
User (1) ─────────> (*) Workspace
Workspace (1) ─────> (*) Card
Workspace (1) ─────> (*) Collection
Workspace (1) ─────> (*) CalendarEvent
Workspace (1) ─────> (*) Todo

Card (*) ────────── (*) Collection (via slugs in card.collections array)
Card (1) ─────────> (*) CollectionNote (junction for notes in Pawkits)
Collection (1) ───> (*) Collection (self-reference via parentId for nesting)
```

---

## DESIGN DECISIONS

| Decision | Rationale |
|----------|-----------|
| No separate Notes view | Notes are cards with `type: 'md-note'`, filtered via Library |
| Collections by slug | Readable data, user-friendly URLs |
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
  .filter(c => !c.deleted)
  .toArray();
```

### Get all cards in a collection
```typescript
const cards = await db.cards
  .where('workspaceId')
  .equals(workspaceId)
  .filter(c => !c.deleted && c.collections.includes(collectionSlug))
  .toArray();
```

### Get nested collections
```typescript
const children = await db.collections
  .where('parentId')
  .equals(parentCollectionId)
  .filter(c => !c.deleted)
  .toArray();
```

---

**Last Updated**: December 20, 2025
