# Pawkit V2 Tag Architecture

**Purpose**: Tags as the universal organizing primitive for Pawkit V2. This is a FOUNDATIONAL architectural decision that all future development must follow.

**Created**: January 2, 2026

**Status**: CANONICAL - This document defines the tag system architecture for V2.

---

## CORE PHILOSOPHY

> "Everything is a note. Tags determine behavior. The UI interprets tags intelligently."

Tags are the **single primitive** for organization, scheduling, behavior, and relationships in Pawkit V2. This replaces the previous dual-system approach (`collections[]` + `tags[]`).

### Why Tags?

| Old Approach | New Approach |
|--------------|--------------|
| `collections: string[]` for Pawkits | `tags: string[]` (unified) |
| `tags: string[]` for user tags | ↑ merged into above |
| `scheduledDate` field | Date tag: `#2026-01-30` |
| `contentType` field | Supertag: `#contact`, `#todo` |
| Two query systems | One query system |
| Two mental models | One mental model |

---

## PAWKIT = TAG WITH METADATA

A Pawkit is NOT a container. A Pawkit is a **filtered view** into cards with a specific tag.

### Pawkit Entity (for UI/hierarchy)

```typescript
interface Pawkit {
  id: string;
  slug: string;           // THIS IS THE TAG (e.g., "recipes")
  name: string;           // Display name (e.g., "Recipes")
  parentId?: string;      // Tree structure for nesting
  position: number;       // Sidebar ordering
  coverImage?: string;
  icon?: string;
  isPrivate: boolean;
  isSystem: boolean;
  // NO cards relationship - derived from tags
}
```

### Card-Pawkit Relationship

```typescript
// Card membership is purely tag-based
interface Card {
  id: string;
  title: string;
  content?: string;
  url?: string;
  tags: string[];         // Includes Pawkit slugs + all other tags
  // NO collections field - REMOVED
  // NO pawkitSlug field - REMOVED
}

// Query: "cards in Recipes pawkit"
const recipesCards = await db.cards.where('tags').equals('recipes').toArray();
```

---

## ANCESTOR TAG INHERITANCE

When a card is placed in a nested Pawkit, it receives **all ancestor tags** as breadcrumbs.

### The Rule

```
Card placed in: Contacts > Work > Engineering
Card receives tags: #contacts, #work, #engineering
                    ↑          ↑       ↑
                    ancestors  ...     leaf (home)
```

### Implementation

```typescript
function addCardToPawkit(card: Card, pawkitSlug: string): Card {
  // Get full ancestry path from root to leaf
  const ancestry = getPawkitAncestry(pawkitSlug);
  // e.g., ['contacts', 'work', 'engineering']

  // Remove any existing Pawkit tags (moving, not copying)
  const nonPawkitTags = card.tags.filter(t => !isPawkitSlug(t));

  // Add full ancestry as tags
  return {
    ...card,
    tags: [...nonPawkitTags, ...ancestry]
  };
}

function getPawkitAncestry(slug: string): string[] {
  const pawkit = getPawkitBySlug(slug);
  if (!pawkit) return [slug];

  if (pawkit.parentId) {
    const parent = getPawkitById(pawkit.parentId);
    return [...getPawkitAncestry(parent.slug), slug];
  }

  return [slug];
}
```

### Benefits

1. **Library cross-cutting search**: Filter `#contacts` shows ALL contacts regardless of subfolder
2. **Breadcrumb navigation**: Card detail shows `Contacts > Work > Engineering`
3. **Move is clean**: Just swap Pawkit tags, keep other tags

---

## LEAF-ONLY DISPLAY

Cards show in the **deepest (leaf) Pawkit** only, not in parent Pawkits.

### The Query Pattern

```typescript
function getCardsInPawkit(pawkitSlug: string): Card[] {
  // Get all descendant Pawkit slugs
  const descendants = getDescendantSlugs(pawkitSlug);

  return db.cards
    .where('tags')
    .equals(pawkitSlug)
    .filter(card => {
      // Exclude cards that have a descendant tag (they live deeper)
      return !descendants.some(d => card.tags.includes(d));
    })
    .toArray();
}

function getDescendantSlugs(pawkitSlug: string): string[] {
  const pawkit = getPawkitBySlug(pawkitSlug);
  const children = getPawkitsByParentId(pawkit.id);

  return children.flatMap(child => [
    child.slug,
    ...getDescendantSlugs(child.slug)
  ]);
}
```

### Example

```
 Contacts
├──  Work
│   └── John Smith    [tags: #contacts, #work]
└──  Family
    └── Mom           [tags: #contacts, #family]

Query "Contacts" Pawkit:
├── John has #contacts 
├── John also has #work (a descendant) 
├── John excluded from Contacts view
└── Same for Mom (#family is descendant)

Query "Work" Pawkit:
├── John has #work 
├── Descendants of "work": []
├── John has no descendant tags 
└── John shows in Work view 

Result:
├── View Contacts → empty (or only direct children)
├── View Work → John
└── View Family → Mom
```

### Cards at Root Level

Cards directly in a parent Pawkit (with no child tags) display correctly:

```
Card: "Generic Contact"
Tags: #contacts

Query Contacts:
├── Has #contacts 
├── Has no descendant tags 
└── Shows in Contacts view 
```

---

## DATE TAGS

Scheduling via tags instead of dedicated fields.

### Format: ISO 8601

```
User types: "jan 30" or "1/30" or "tomorrow"
Stored as tag: #2026-01-30

User types: "5pm" or "17:00"
Stored as tag: #time-17-00
```

### Date Tag Utilities

```typescript
// src/lib/utils/date-tags.ts

const DATE_TAG_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_TAG_PATTERN = /^time-(\d{2})-(\d{2})$/;

export function isDateTag(tag: string): boolean {
  return DATE_TAG_PATTERN.test(tag);
}

export function parseDateTag(tag: string): Date | null {
  const match = tag.match(DATE_TAG_PATTERN);
  if (!match) return null;
  return new Date(
    parseInt(match[1]),
    parseInt(match[2]) - 1,
    parseInt(match[3])
  );
}

export function createDateTag(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function parseNaturalDate(input: string): string | null {
  const today = new Date();
  const lower = input.toLowerCase().trim();

  switch (lower) {
    case 'today':
      return createDateTag(today);
    case 'tomorrow':
      return createDateTag(addDays(today, 1));
    case 'next week':
      return createDateTag(addDays(today, 7));
    default:
      // Parse "jan 30", "1/30", "1/30/26", etc.
      const parsed = parseFlexibleDate(input);
      return parsed ? createDateTag(parsed) : null;
  }
}
```

### Calendar Integration

```typescript
// Get cards for a specific date
function getCardsForDate(targetDate: Date): Card[] {
  const dateTag = createDateTag(targetDate);
  return db.cards.where('tags').equals(dateTag).toArray();
}

// Calendar view uses tag queries, not scheduledDate field
```

---

## SUPERTAGS

Tags that imply **behavior, structure, or UI treatment**.

### Registry Pattern

```typescript
// src/lib/tags/supertags.ts

interface SupertagDefinition {
  tag: string;
  displayName: string;
  suggestedFields?: string[];
  template?: string;
  uiHints?: {
    showCheckboxes?: boolean;
    showInWidget?: string;
    calendarFields?: string[];
    icon?: string;
  };
  actions?: string[];
}

export const SUPERTAG_REGISTRY: Record<string, SupertagDefinition> = {
  'todo': {
    tag: 'todo',
    displayName: 'To-Do',
    uiHints: {
      showCheckboxes: true,
      showInWidget: 'todo-widget',
      icon: ''
    }
  },

  'contact': {
    tag: 'contact',
    displayName: 'Contact',
    suggestedFields: ['phone', 'email', 'birthday', 'address'],
    template: CONTACT_TEMPLATE,
    uiHints: {
      calendarFields: ['birthday', 'anniversary'],
      icon: ''
    },
    actions: ['call', 'email', 'message']
  },

  'subscription': {
    tag: 'subscription',
    displayName: 'Subscription',
    suggestedFields: ['amount', 'renewalDay', 'service'],
    template: SUBSCRIPTION_TEMPLATE,
    uiHints: {
      showInWidget: 'bills-widget',
      calendarFields: ['renewalDay'],
      icon: ''
    }
  },

  'recipe': {
    tag: 'recipe',
    displayName: 'Recipe',
    suggestedFields: ['ingredients', 'steps', 'prepTime', 'servings'],
    template: RECIPE_TEMPLATE,
    uiHints: {
      icon: ''
    }
  },

  'reading': {
    tag: 'reading',
    displayName: 'Reading',
    suggestedFields: ['author', 'pages', 'currentPage'],
    uiHints: {
      showInWidget: 'reading-widget',
      icon: ''
    }
  }
};

export function getSupertagDefinition(tag: string): SupertagDefinition | null {
  return SUPERTAG_REGISTRY[tag] || null;
}

export function isSupertagTag(tag: string): boolean {
  return tag in SUPERTAG_REGISTRY;
}
```

### Supertag UX Flow

```
1. User adds #contact tag to a note

2. System detects supertag, offers template:
   ┌─────────────────────────────────┐
   │ Use Contact template?           │
   │ [Use Template]  [Keep as-is]    │
   └─────────────────────────────────┘

3. If accepted, note content becomes structured:
   # John Smith

   ## Contact Info
   -  Phone:
   -  Email:
   -  Birthday:

   ## Notes
   ...
```

---

## TAG INDEXING (CRITICAL)

Tags MUST be indexed for performance.

### Dexie Schema

```typescript
// BEFORE (no tag index)
cards: 'id, workspaceId, [workspaceId+_deleted]'

// AFTER (with tag index)
cards: 'id, workspaceId, [workspaceId+_deleted], *tags'
//                                               ↑ multi-entry index
```

### Indexed Queries

```typescript
// BEFORE: O(n) - fetch all, filter in memory
const allCards = await db.cards.where('workspaceId').equals(wsId).toArray();
const filtered = allCards.filter(c => c.tags.includes('recipes'));

// AFTER: O(log n) - indexed lookup
const filtered = await db.cards
  .where('tags')
  .equals('recipes')
  .filter(c => c.workspaceId === wsId && !c._deleted)
  .toArray();
```

---

## MIGRATION: collections → tags

### One-Time Migration

```typescript
async function migrateCollectionsToTags() {
  const cards = await db.cards.toArray();

  await db.transaction('rw', db.cards, async () => {
    for (const card of cards) {
      if (card.collections && card.collections.length > 0) {
        // Merge collections into tags
        const mergedTags = [...new Set([
          ...card.tags,
          ...card.collections
        ])];

        // For nested pawkits, add ancestor tags
        const allAncestorTags = card.collections.flatMap(slug =>
          getPawkitAncestry(slug)
        );

        const finalTags = [...new Set([
          ...mergedTags,
          ...allAncestorTags
        ])];

        await db.cards.update(card.id, {
          tags: finalTags,
          collections: undefined  // Remove field
        });
      }
    }
  });
}
```

### Schema Changes

```typescript
// Remove from Card interface
interface Card {
  // collections: string[];  ← REMOVE THIS
  tags: string[];            // ← This handles everything
}

// Remove from Prisma schema
model Card {
  // collections String[]    ← REMOVE THIS
  tags        String[]
}
```

---

## TAG NORMALIZATION

### Rules

1. **Lowercase**: All tags stored lowercase
2. **Trim**: No leading/trailing whitespace
3. **Max length**: 50 characters
4. **Valid characters**: alphanumeric, hyphens, slashes (for hierarchy)
5. **No duplicates**: Dedupe on save

### Autocomplete

```typescript
function normalizeTag(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\-\/\s]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 50);
}

// Fuzzy search for autocomplete
function findMatchingTags(input: string, existingTags: string[]): string[] {
  const normalized = normalizeTag(input);

  return existingTags
    .filter(tag =>
      tag.includes(normalized) ||
      fuzzyMatch(tag, normalized) > 0.7
    )
    .sort((a, b) => {
      // Exact prefix match first
      if (a.startsWith(normalized) && !b.startsWith(normalized)) return -1;
      if (b.startsWith(normalized) && !a.startsWith(normalized)) return 1;
      return a.localeCompare(b);
    });
}
```

---

## SPECIAL TAG PATTERNS

### System Tags (Auto-Generated)

| Tag | Meaning | Generated When |
|-----|---------|----------------|
| `read` | Article marked as read | User marks read |
| `3m`, `5m`, `8m` | Reading time estimate | Article processed |
| `conflict` | Sync conflict | Conflict detected |

### Age Tags (Computed at Render)

```typescript
function getAgeTags(card: Card): string[] {
  const age = daysSince(card.createdAt);
  const tags: string[] = [];

  if (age >= 7)   tags.push('1-week-old');
  if (age >= 30)  tags.push('1-month-old');
  if (age >= 90)  tags.push('3-months-old');
  if (age >= 180) tags.push('6-months-old');
  if (age >= 365) tags.push('1-year-old');

  return tags;
}
```

### Source Tags (Auto on Save)

| Tag | Source |
|-----|--------|
| `from-extension` | Browser extension |
| `from-mobile` | Mobile app |
| `from-portal` | Desktop Portal |
| `from-import` | Reddit/other import |

---

## PAWKIT CREATION FROM EXISTING TAG

When a Pawkit is created with a slug that matches existing tags, cards auto-appear:

```typescript
async function createPawkit(name: string, slug: string): Promise<Pawkit> {
  // Check how many cards already have this tag
  const existingCards = await db.cards
    .where('tags')
    .equals(slug)
    .count();

  if (existingCards > 0) {
    // Inform user: "24 cards already have #recipes tag.
    // They'll appear in this Pawkit automatically."
  }

  // Create Pawkit entity
  const pawkit = await db.pawkits.add({
    id: generateId(),
    slug,
    name,
    // ... other fields
  });

  return pawkit;
}
```

---

## PAWKIT DELETION

When a Pawkit is deleted, tags remain on cards (preserving searchability):

```typescript
async function deletePawkit(pawkitId: string, removeTags: boolean = false) {
  const pawkit = await db.pawkits.get(pawkitId);

  if (removeTags) {
    // User chose to remove tags
    const cards = await db.cards.where('tags').equals(pawkit.slug).toArray();
    for (const card of cards) {
      await db.cards.update(card.id, {
        tags: card.tags.filter(t => t !== pawkit.slug)
      });
    }
  }
  // else: tags remain, cards still searchable in Library

  await db.pawkits.delete(pawkitId);
}
```

---

## QUERYING CHEAT SHEET

| Query | Code |
|-------|------|
| Cards in Pawkit | `db.cards.where('tags').equals(slug).filter(noDescendants)` |
| Cards in Pawkit + children | `db.cards.where('tags').anyOf([slug, ...descendants])` |
| Cards on date | `db.cards.where('tags').equals('2026-01-30')` |
| Cards with supertag | `db.cards.where('tags').equals('contact')` |
| All contacts (Library) | `db.cards.where('tags').equals('contacts')` |
| Untagged cards | `db.cards.filter(c => c.tags.length === 0)` |
| Cards with any of tags | `db.cards.where('tags').anyOf(['a', 'b', 'c'])` |

---

## KIT AI INTEGRATION

Kit can leverage tags for intelligent suggestions:

```typescript
interface KitInsight {
  type: 'suggest-pawkit' | 'merge-tags' | 'apply-supertag' | 'cleanup';
  confidence: number;
  data: Record<string, any>;
}

async function analyzeTagPatterns(cards: Card[]): Promise<KitInsight[]> {
  const insights: KitInsight[] = [];
  const tagCounts = countTags(cards);

  // Suggest Pawkit for popular tags without one
  for (const [tag, count] of tagCounts) {
    if (count >= 20 && !pawkitExists(tag)) {
      insights.push({
        type: 'suggest-pawkit',
        confidence: Math.min(count / 50, 1),
        data: { tag, cardCount: count }
      });
    }
  }

  // Find similar tags to merge
  const similar = findSimilarTags(Array.from(tagCounts.keys()));
  for (const [tag1, tag2] of similar) {
    insights.push({
      type: 'merge-tags',
      confidence: 0.8,
      data: { tag1, tag2 }
    });
  }

  return insights.filter(i => i.confidence > 0.7);
}
```

---

## FILES TO MODIFY

When implementing this architecture:

| File | Change |
|------|--------|
| `src/lib/db/types.ts` | Remove `collections` from Card interface |
| `src/lib/db/schema.ts` | Add `*tags` index |
| `prisma/schema.prisma` | Remove `collections` field from Card |
| `src/lib/stores/data-store.ts` | Update `addCardToCollection` → `addCardToPawkit` |
| `src/lib/hooks/use-live-data.ts` | Update `useCardsInCollection` to use tag queries |
| `src/lib/utils/date-tags.ts` | Create (new file) |
| `src/lib/tags/supertags.ts` | Create (new file) |

---

## SUMMARY

| Concept | Implementation |
|---------|----------------|
| Pawkit membership | Tag with Pawkit slug |
| Nested Pawkits | Ancestor tags as breadcrumbs |
| Pawkit display | Leaf-only query pattern |
| Scheduling | Date tags (`#2026-01-30`) |
| Card behavior | Supertags (`#contact`, `#todo`) |
| Search/filter | Tag queries in Library |
| Kit AI | Tag pattern analysis |

**The single primitive is `tags: string[]`. Everything else derives from it.**

---

**Last Updated**: January 2, 2026
