---
name: pawkit-conventions
description: Enforce consistent data model usage and coding patterns across all development sessions
---

# Pawkit Coding Conventions & Data Model

**Purpose**: Enforce consistent data model usage and coding patterns across all development sessions.

---

## Data Model - Collection References

### CRITICAL RULE: Cards Use SLUGS, Not IDs

**Cards ALWAYS reference collections by `slug`, NEVER by `id`.**

```typescript
// ✅ CORRECT
card.collections: string[]  // ["personal", "work", "projects"]

// ❌ WRONG
card.collections: string[]  // ["cm123abc", "cm456def"] // Never use IDs!
```

### Why Slugs?

1. **Human-readable**: Slugs are meaningful ("personal" vs "cm123abc")
2. **URL-friendly**: Used in routes like `/pawkits/personal`
3. **Migration-safe**: IDs change during migrations, slugs are stable
4. **Consistent**: Database stores JSON array of slugs

### Collection Object Structure

```typescript
interface CollectionNode {
  id: string;       // "cm123abc" - Database primary key (internal use only)
  slug: string;     // "personal" - For card references (USE THIS)
  name: string;     // "Personal" - Display name
  isPrivate: boolean;
  children: CollectionNode[];
  // ... other fields
}
```

### When Filtering by Collections

**Always use `node.slug` when building Sets/Maps for card filtering:**

```typescript
// ✅ CORRECT
const privateCollectionSlugs = new Set<string>();
for (const node of collections) {
  if (node.isPrivate) {
    privateCollectionSlugs.add(node.slug);  // Use slug!
  }
}

// Filter cards
const isInPrivate = card.collections?.some(slug =>
  privateCollectionSlugs.has(slug)  // Compare slugs to slugs
);

// ❌ WRONG
const privateCollectionIds = new Set<string>();
for (const node of collections) {
  if (node.isPrivate) {
    privateCollectionIds.add(node.id);  // Wrong! Using ID
  }
}

// This will NEVER match because cards store slugs, not IDs
const isInPrivate = card.collections?.some(id =>
  privateCollectionIds.has(id)  // Comparing slug to ID = always false
);
```

### Common Mistakes to Avoid

1. **Using `node.id` in card filters** - Cards don't store IDs
2. **Assuming collections are IDs** - They're always slugs
3. **Mixing IDs and slugs** - Be consistent in each function
4. **Not reading card.collections** - Always check the array format

### Files That Use This Pattern

- `app/(dashboard)/library/page.tsx` - Library private filter
- `app/(dashboard)/notes/page.tsx` - Notes private filter
- `app/(dashboard)/tags/page.tsx` - Tags private filter
- `app/(dashboard)/pawkits/[slug]/page.tsx` - Pawkit detail filter
- `lib/server/cards.ts` - Server-side validation

---

## Architecture - Local-First

### Data Flow Priority

```
IndexedDB (source of truth) → Zustand (UI state) → Server (backup/sync)
```

### Key Principles

1. **IndexedDB is PRIMARY** - Never cleared, always trusted
2. **Server is BACKUP** - Can be wiped, data survives locally
3. **Optimistic updates** - Update local first, sync background
4. **Write guards** - Only active device can write

### Data Store Methods

- `initialize()` - Load from IndexedDB on page load
- `sync()` - Bidirectional sync with server
- `refresh()` - Reload from IndexedDB
- `addCard()`, `updateCard()`, `deleteCard()` - Always save local first

### Deduplication

The data store has automatic deduplication that:
- Detects duplicate cards by URL/title
- Removes orphaned temp cards (temp_123)
- Keeps the older card when both are real
- Runs in `initialize()`, `sync()`, and `refresh()`

---


## View Settings Pattern

### localStorage-Only Architecture

**View settings (layout, card size, etc.) are stored in localStorage ONLY.**

There is **no server sync** for view settings currently. This is intentional:
- Settings are per-device preferences
- Faster (no network requests)
- Works offline
- Privacy-friendly (no tracking of UI preferences)

### localStorage Keys

Each view stores its layout preference independently:

```typescript
// Per-view layout preferences
localStorage.getItem('library-layout')           // 'grid' | 'list' | 'masonry' | 'compact'
localStorage.getItem('notes-layout')             // same options
localStorage.getItem(`pawkit-${slug}-layout`)    // per-collection layout
localStorage.getItem('timeline-layout')          // timeline view layout

// Future: May add more settings
localStorage.getItem('library-cardSize')         // 1-100 (not implemented yet)
localStorage.getItem('library-showMetadata')     // boolean (not implemented yet)
```

### Implementation Pattern

**Each view page reads from localStorage on load:**

```typescript
// app/(dashboard)/library/page.tsx
function LibraryPage() {
  const searchParams = useSearchParams();
  const layoutParam = searchParams.get("layout") as LayoutMode | null;

  // ✅ Read from localStorage first
  const savedLayout = typeof window !== 'undefined' 
    ? localStorage.getItem("library-layout") as LayoutMode | null 
    : null;

  // Priority: URL param > localStorage > default
  const layout: LayoutMode = layoutParam && LAYOUTS.includes(layoutParam)
    ? layoutParam
    : savedLayout && LAYOUTS.includes(savedLayout)
      ? savedLayout
      : DEFAULT_LAYOUT;

  return <LibraryView initialLayout={layout} />;
}
```

**Child components save to localStorage on change:**

```typescript
// components/library/library-view.tsx
function LibraryView({ initialLayout }: { initialLayout: LayoutMode }) {
  const [layout, setLayout] = useState(initialLayout);

  const handleLayoutChange = (newLayout: LayoutMode) => {
    // ✅ Save to localStorage
    localStorage.setItem('library-layout', newLayout);
    
    // Update URL
    const params = new URLSearchParams(window.location.search);
    params.set('layout', newLayout);
    router.push(`?${params.toString()}`);
    
    // Update state
    setLayout(newLayout);
  };

  return (
    <div>
      <LayoutSwitcher layout={layout} onChange={handleLayoutChange} />
      <CardGallery layout={layout} />
    </div>
  );
}
```

### Where This Pattern Is Used

- **Library view** - `app/(dashboard)/library/page.tsx`
- **Notes view** - `app/(dashboard)/notes/page.tsx`
- **Pawkits detail** - `app/(dashboard)/pawkits/[slug]/page.tsx`
- **Timeline view** - `app/(dashboard)/timeline/page.tsx`

### Future: Server Sync

**Server-side view settings sync is on the roadmap but not implemented.**

When implemented, it will:
1. Add `UserViewSettings` Prisma model
2. Create `/api/user/view-settings` endpoint
3. Create `lib/hooks/view-settings-store.ts` with Zustand + sync
4. Migrate existing localStorage settings to server
5. Sync across devices while maintaining localStorage as cache

**Until then**: View settings are localStorage-only, per-device.

### How to Avoid Confusion

- **Don't look for** `view-settings-store.ts` - it doesn't exist yet
- **Don't expect** server sync - it's not implemented
- **Do use** localStorage directly in each view
- **Do follow** the priority pattern: URL > localStorage > default
- If you see "Failed to sync settings to server", see troubleshooting skill

---

## Coding Standards

### Imports

```typescript
// Use consistent import paths
import { useDataStore } from '@/lib/stores/data-store';
import { CardDTO } from '@/lib/server/cards';
import { CollectionNode } from '@/lib/types';
```

### TypeScript

- Always use explicit types for collections: `string[]` not `any[]`
- Use `CollectionNode` type from `@/lib/types`
- Use `CardDTO` from `@/lib/server/cards`

### Variable Naming

```typescript
// ✅ CORRECT - Clear what data type is stored
const privateCollectionSlugs = new Set<string>();
const cardsBySlug = new Map<string, CardDTO>();

// ❌ WRONG - Ambiguous
const privateCollections = new Set<string>();  // IDs or slugs?
const cardMap = new Map<string, CardDTO>();    // What's the key?
```

### Comments

Add comments when dealing with collections to remind future developers:

```typescript
// Build a set of private collection SLUGS for fast lookup (cards store slugs, not IDs)
const privateCollectionSlugs = new Set<string>();
```

---

## Multi-Session Management

### Event-Based Session Tracking

- **No polling** - Single registration on page load
- **localStorage** as source of truth for active device
- **Write guards** on all mutation operations
- **Cross-tab communication** via storage events

### Write Guard Pattern

```typescript
// ALWAYS check before mutations
if (!ensureActiveDevice()) {
  return; // Blocks writes from inactive sessions
}
```

---

## Data Integrity Rules - CRITICAL

### Notes vs Bookmarks Distinction

**NEVER apply URL uniqueness constraints to notes!**

```typescript
// Card Types
type CardType = 'url' | 'md-note' | 'text-note';

// Notes vs Bookmarks
const BOOKMARK_TYPES = ['url'];           // Can have URL constraints
const NOTE_TYPES = ['md-note', 'text-note']; // NEVER constrain by URL
```

### Rules for Database Constraints

#### ✅ CORRECT: Partial Unique Index

```sql
-- Only applies to URL bookmarks, excludes notes
CREATE UNIQUE INDEX "Card_userId_url_key"
ON "Card"("userId", "url")
WHERE "type" = 'url';
```

#### ❌ WRONG: Full Unique Constraint

```sql
-- DO NOT DO THIS - deletes all notes!
ALTER TABLE "Card"
ADD CONSTRAINT "Card_userId_url_unique"
UNIQUE ("userId", "url");

-- DO NOT DO THIS - deletes all notes!
@@unique([userId, url])  -- in schema.prisma
```

### Why Notes Must Be Excluded

1. **Notes have empty URLs**: All notes have `url = ""` by design
2. **Multiple notes are normal**: Users create many notes, all with empty URLs
3. **No duplication issue**: Notes are not bookmarks, empty URLs are intentional
4. **Data loss risk**: Treating notes as duplicates WILL DELETE USER DATA

### Migration Safety Rules

**Any migration that deletes cards MUST:**

```sql
-- ✅ CORRECT: Only delete duplicate URL bookmarks
DELETE FROM "Card" a USING "Card" b
WHERE a."userId" = b."userId"
  AND a."url" = b."url"
  AND a."type" = 'url'      -- REQUIRED: Only bookmarks
  AND b."type" = 'url'      -- REQUIRED: Compare bookmarks only
  AND a."id" < b."id";

-- ❌ WRONG: Deletes ALL duplicates including notes
DELETE FROM "Card" a USING "Card" b
WHERE a."userId" = b."userId"
  AND a."url" = b."url"     -- Missing type filter = DATA LOSS
  AND a."id" < b."id";
```

### Code Safety Rules

**When working with cards, ALWAYS filter by type:**

```typescript
// ✅ CORRECT: Check card type before applying URL logic
async function createCard(data: CardInput) {
  // Only check for duplicates if it's a URL bookmark
  if (data.type === 'url') {
    const existing = await findDuplicateUrl(data.userId, data.url);
    if (existing) return existing;
  }

  // Notes bypass duplicate check
  return await prisma.card.create({ data });
}

// ❌ WRONG: Applies URL logic to all cards
async function createCard(data: CardInput) {
  const existing = await findDuplicateUrl(data.userId, data.url);
  if (existing) return existing;  // Blocks note creation!

  return await prisma.card.create({ data });
}
```

### Testing Requirements

**Before deploying ANY feature that touches cards:**

✅ Test with URL bookmarks:
```typescript
{ type: 'url', url: 'https://example.com', title: 'Example' }
```

✅ Test with markdown notes:
```typescript
{ type: 'md-note', url: '', content: '# My Note', title: 'Note 1' }
{ type: 'md-note', url: '', content: '# Another', title: 'Note 2' }
```

✅ Test with text notes:
```typescript
{ type: 'text-note', url: '', notes: 'Quick thought', title: 'Thought' }
```

✅ Verify notes are NOT affected by:
- Duplicate detection
- URL validation
- Unique constraints
- Deletion logic

### Quick Reference - Card Type Handling

| Operation | URL Bookmarks | Notes |
|-----------|--------------|-------|
| **Unique URL constraint** | ✅ Yes (prevent duplicates) | ❌ No (allow multiple) |
| **Duplicate detection** | ✅ Yes (check before create) | ❌ No (skip check) |
| **URL validation** | ✅ Yes (must be valid URL) | ❌ No (empty is valid) |
| **Metadata fetching** | ✅ Yes (fetch title/image) | ❌ No (user-provided only) |
| **Empty URL allowed** | ❌ No | ✅ Yes |

---

## Testing Checklist

Before committing code that touches collections:

- [ ] Are you using `node.slug` for card filters?
- [ ] Variable names clearly indicate slugs vs IDs?
- [ ] Added explanatory comments?
- [ ] Tested private pawkit filtering?
- [ ] Checked other views (library, notes, tags)?

Before committing code that touches cards:

- [ ] Does it handle URL bookmarks (`type='url'`)?
- [ ] Does it handle markdown notes (`type='md-note'`)?
- [ ] Does it handle text notes (`type='text-note'`)?
- [ ] Are notes excluded from URL uniqueness logic?
- [ ] Are notes excluded from duplicate detection?
- [ ] Can multiple notes be created with empty URLs?
- [ ] Tested with both bookmarks AND notes?

---

## Quick Reference

| What | Type | Use For |
|------|------|---------|
| `collection.id` | string | Database relations, API endpoints |
| `collection.slug` | string | **Card references, filtering, URLs** |
| `collection.name` | string | Display only |
| `card.collections` | string[] | **Array of SLUGS** (not IDs!) |

---

**Last Updated**: 2025-10-29
**Reason**: Added critical data integrity rules for notes vs bookmarks distinction
