# Pawkit V2 Component Organization

**Purpose**: File structure, component patterns, size limits, and architectural guidelines

**Created**: December 20, 2025

**Status**: **MOSTLY APPLICABLE** - Component patterns and size limits still apply. File structure section below is outdated (was Next.js App Router, now TanStack Start with routes in `src/routes/`). Ignore Prisma/Dexie references - now using Convex.

---

## FILE SIZE LIMITS (ENFORCED)

| Type | Max Lines | Reason |
|------|-----------|--------|
| Components | 300 | Readability, maintainability |
| Stores | 500 | Complex state logic acceptable |
| Services | 400 | Business logic containment |

### V1 Violations to Avoid
```
card-gallery.tsx      - 1,848 lines  ❌
card-detail-modal.tsx - 2,756 lines  ❌
left-navigation-panel.tsx - 2,112 lines  ❌
```

**If exceeding limits, SPLIT into smaller modules.**

---

## FILE STRUCTURE

> **Note**: This section shows the **current TanStack Start structure**. Old Next.js paths are archived in `archive-next/`.

```
src/
├── routes/                     # TanStack Start file-based routing
│   ├── __root.tsx             # Root layout
│   ├── index.tsx              # Landing/redirect
│   ├── home.tsx               # Home dashboard
│   ├── library.tsx            # Library view
│   ├── calendar.tsx           # Calendar view
│   ├── pawkits.tsx            # Pawkits view
│   ├── tags.tsx               # Tags view
│   ├── trash.tsx              # Trash view
│   ├── login.tsx              # Auth
│   └── signup.tsx             # Auth
│
├── pages/                      # Page components (referenced by routes)
│   ├── home.tsx
│   ├── library.tsx
│   └── ...
│
├── components/
│   ├── ui/                     # shadcn/ui components
│   ├── layout/                 # Layout components
│   ├── cards/                  # Card display components
│   ├── modals/                 # Modal dialogs
│   ├── calendar/               # Calendar components
│   ├── home/                   # Home dashboard widgets
│   ├── editor/                 # Plate editor
│   └── ...
│
├── lib/
│   ├── stores/                 # Zustand stores
│   ├── hooks/                  # Custom React hooks
│   ├── utils/                  # Utility functions
│   └── ...
│
├── styles.css                  # Global styles, CSS variables
└── router.tsx                  # Router config

convex/                         # Convex backend (at project root)
├── schema.ts                   # Database schema
├── cards.ts                    # Card queries/mutations
├── collections.ts              # Collection queries/mutations
└── ...
```

---

## COMPONENT PATTERNS

### Adding a New Sidebar Section

1. Create component in `components/sidebar-sections/`
2. Import into `sidebar-left.tsx` or `sidebar-right.tsx`
3. Add to render with appropriate collapse behavior

```typescript
// components/sidebar-sections/tags-filter.tsx
export function TagsFilter() {
  const tags = useTagsStore(state => state.tags);
  const selectedTags = useFilterStore(state => state.selectedTags);

  return (
    <SidebarSection title="Tags" collapsible>
      {tags.map(tag => (
        <TagItem key={tag} tag={tag} selected={selectedTags.includes(tag)} />
      ))}
    </SidebarSection>
  );
}
```

### Adding a New View

1. Create component in `components/views/`
2. Add to view switcher in `view-options.tsx`
3. Handle in parent container

```typescript
// components/views/timeline-view.tsx
export function TimelineView({ cards }: { cards: Card[] }) {
  const groupedByDate = useMemo(() => groupCardsByDate(cards), [cards]);

  return (
    <div className="timeline-container">
      {Object.entries(groupedByDate).map(([date, dateCards]) => (
        <TimelineDay key={date} date={date} cards={dateCards} />
      ))}
    </div>
  );
}
```

### Adding a New Modal

1. Create component in `components/modals/`
2. Add open/close state to `ui-store.ts`
3. Render in layout (single modal mount point)

```typescript
// lib/stores/ui-store.ts
interface UIStore {
  modals: {
    cardDetail: { open: boolean; cardId: string | null };
    createPawkit: { open: boolean };
    // Add new modal here
    newFeature: { open: boolean; data?: any };
  };
  openModal: (name: keyof UIStore['modals'], data?: any) => void;
  closeModal: (name: keyof UIStore['modals']) => void;
}
```

---

## STORE PATTERNS

### Store File Template

```typescript
// lib/stores/example-store.ts
import { create } from 'zustand';
import { db } from '@/lib/db/dexie';

interface ExampleState {
  items: Item[];
  loading: boolean;
  error: string | null;
}

interface ExampleActions {
  loadItems: (workspaceId: string) => Promise<void>;
  addItem: (item: Omit<Item, 'id'>) => Promise<Item>;
  updateItem: (id: string, updates: Partial<Item>) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
}

export const useExampleStore = create<ExampleState & ExampleActions>((set, get) => ({
  items: [],
  loading: false,
  error: null,

  loadItems: async (workspaceId) => {
    set({ loading: true });
    try {
      const items = await db.items
        .where('workspaceId')
        .equals(workspaceId)
        .toArray();
      set({ items, loading: false });
    } catch (error) {
      set({ error: error.message, loading: false });
    }
  },

  addItem: async (item) => {
    const newItem = { ...item, id: generateId() };
    await db.items.add(newItem);
    set(state => ({ items: [...state.items, newItem] }));
    // Queue sync...
    return newItem;
  },

  // ... other actions
}));
```

---

## HOOK PATTERNS

### Custom Hook Template

```typescript
// lib/hooks/use-cards.ts
export function useCards(workspaceId: string) {
  const cards = useCardsStore(state => state.cards);
  const loadCards = useCardsStore(state => state.loadCards);
  const loading = useCardsStore(state => state.loading);

  useEffect(() => {
    loadCards(workspaceId);
  }, [workspaceId, loadCards]);

  return { cards, loading };
}
```

### Hook for Filtered Data

```typescript
// lib/hooks/use-filtered-cards.ts
export function useFilteredCards() {
  const cards = useCardsStore(state => state.cards);
  const filters = useFilterStore(state => state.filters);

  return useMemo(() => {
    return cards.filter(card => {
      if (filters.type && card.type !== filters.type) return false;
      if (filters.tags.length && !filters.tags.some(t => card.tags.includes(t))) return false;
      return !card.deleted;
    });
  }, [cards, filters]);
}
```

---

## SERVICE PATTERNS

### Service File Template

```typescript
// lib/services/example-service.ts
class ExampleService {
  private cache = new Map<string, CacheEntry>();
  private readonly CACHE_TTL_MS = 5 * 60 * 1000;

  async fetchData(id: string): Promise<Data> {
    // Check cache
    const cached = this.cache.get(id);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL_MS) {
      return cached.data;
    }

    // Fetch fresh
    const response = await fetch(`/api/data/${id}`);
    const data = await response.json();

    // Cache result
    this.cache.set(id, { data, timestamp: Date.now() });

    return data;
  }

  clearCache() {
    this.cache.clear();
  }
}

export const exampleService = new ExampleService();
```

---

## SPLITTING LARGE COMPONENTS

### Before (Too Large)
```typescript
// ❌ card-detail-modal.tsx - 2,756 lines
function CardDetailModal() {
  // Metadata section - 400 lines
  // Actions section - 300 lines
  // Content editor - 500 lines
  // Tags manager - 200 lines
  // Collections manager - 300 lines
  // Reader mode - 400 lines
  // ... more
}
```

### After (Split)
```typescript
// ✅ card-detail-modal.tsx - 150 lines
function CardDetailModal() {
  return (
    <Dialog>
      <CardMetadata card={card} />
      <CardContent card={card} onUpdate={handleUpdate} />
      <CardActions card={card} />
    </Dialog>
  );
}

// ✅ card-metadata.tsx - 200 lines
// ✅ card-content.tsx - 250 lines
// ✅ card-actions.tsx - 150 lines
// ✅ card-tags-manager.tsx - 150 lines
// ✅ card-reader-mode.tsx - 200 lines
```

---

## COMPONENT SIZE CHECKLIST

Before committing a component:

- [ ] Under 300 lines?
- [ ] Single responsibility?
- [ ] Props well-typed?
- [ ] No inline styles (use Tailwind/CSS variables)?
- [ ] Accessible (aria labels, keyboard nav)?
- [ ] Uses design system classes (`text-text-muted`, etc.)?

---

**Last Updated**: December 20, 2025
