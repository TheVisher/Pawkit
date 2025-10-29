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

## Testing Checklist

Before committing code that touches collections:

- [ ] Are you using `node.slug` for card filters?
- [ ] Variable names clearly indicate slugs vs IDs?
- [ ] Added explanatory comments?
- [ ] Tested private pawkit filtering?
- [ ] Checked other views (library, notes, tags)?

---

## Quick Reference

| What | Type | Use For |
|------|------|---------|
| `collection.id` | string | Database relations, API endpoints |
| `collection.slug` | string | **Card references, filtering, URLs** |
| `collection.name` | string | Display only |
| `card.collections` | string[] | **Array of SLUGS** (not IDs!) |

---

**Last Updated**: 2025-10-28
**Reason**: Fixed ID/slug mismatches across library, notes, and tags views
