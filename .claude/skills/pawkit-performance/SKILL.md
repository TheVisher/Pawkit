---
name: pawkit-performance
description: Document performance patterns and best practices for local-first architecture
---

# Pawkit Performance Optimization Guide

**Purpose**: Document performance patterns and best practices for local-first architecture

**Key Principle**: IndexedDB is source of truth. Optimize for instant UI updates with background sync.

---

## PERFORMANCE TARGETS

### Target Metrics

**Load Performance**:
- Initial load: **<2 seconds**
- Time to Interactive: **<3 seconds**
- First Contentful Paint: **<1.5 seconds**

**Search Performance**:
- Search 1000 cards: **<100ms**
- Filter operations: **<50ms**
- Tag lookup: **<30ms**

**Sync Performance**:
- Background sync: **<5 seconds**
- Conflict detection: **<1 second**
- Batch upload: **<3 seconds**

**Rendering Performance**:
- Scroll performance: **60fps** (16ms per frame)
- Card render: **<5ms per card**
- List with 500+ cards: **<200ms initial render**

**Memory Usage**:
- Maximum heap size: **<100MB** for 1000 cards
- IndexedDB size: **<50MB** for 1000 cards
- Image cache: **<200MB**

---

## LOCAL-FIRST ARCHITECTURE

### Core Pattern

```
User Action
    ↓
IndexedDB (immediate write) ← Source of Truth
    ↓
UI Update (optimistic)
    ↓
Background Sync Queue
    ↓
Server (eventual consistency)
```

### Key Principles

1. **Immediate Local Write** - IndexedDB updated instantly
2. **Optimistic UI** - Show changes immediately
3. **Background Sync** - Queue server updates
4. **Eventual Consistency** - Server catches up asynchronously
5. **Offline First** - App works without network

---

## INDEXEDDB OPTIMIZATION

### 1. Use Indexes for Fast Queries

**Problem**: Full table scans are slow with 1000+ cards

**Solution**: Create indexes on commonly queried fields

```tsx
// lib/services/local-storage.ts

async function initIndexedDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('pawkit', 2);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Create cards object store
      if (!db.objectStoreNames.contains('cards')) {
        const cardStore = db.createObjectStore('cards', { keyPath: 'id' });

        // ✅ Add indexes for fast queries
        cardStore.createIndex('userId', 'userId', { unique: false });
        cardStore.createIndex('collectionSlug', 'collectionSlug', { unique: false });
        cardStore.createIndex('updatedAt', 'updatedAt', { unique: false });

        // Composite index for sync queries (userId + updatedAt)
        cardStore.createIndex('userId_updatedAt', ['userId', 'updatedAt'], { unique: false });

        // Full-text search index (requires custom implementation)
        cardStore.createIndex('title', 'title', { unique: false });
        cardStore.createIndex('tags', 'tags', { unique: false, multiEntry: true });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
```

**Usage**:
```tsx
// ❌ Slow: Full table scan
async function getCardsByUser(userId: string) {
  const db = await getDB();
  const cards = await db.getAll('cards');
  return cards.filter(card => card.userId === userId);
}

// ✅ Fast: Use index
async function getCardsByUser(userId: string) {
  const db = await getDB();
  const tx = db.transaction('cards', 'readonly');
  const index = tx.objectStore('cards').index('userId');
  return await index.getAll(userId);
}
```

**Performance Improvement**: 50-70% faster on large datasets

---

### 2. Limit Result Sets

**Problem**: Loading all 1000+ cards at once is slow

**Solution**: Use pagination and limits

```tsx
// ❌ Slow: Load everything
async function getAllCards() {
  const db = await getDB();
  return await db.getAll('cards'); // Returns all 1000+ cards
}

// ✅ Fast: Load page at a time
async function getCardsPage(page: number, pageSize: number = 50) {
  const db = await getDB();
  const tx = db.transaction('cards', 'readonly');
  const store = tx.objectStore('cards');

  const cards: Card[] = [];
  let cursor = await store.openCursor();
  let skipped = 0;
  let loaded = 0;
  const skipCount = page * pageSize;

  while (cursor) {
    if (skipped < skipCount) {
      skipped++;
      cursor = await cursor.continue();
      continue;
    }

    if (loaded >= pageSize) break;

    cards.push(cursor.value);
    loaded++;
    cursor = await cursor.continue();
  }

  return cards;
}
```

**Performance Improvement**: 90% faster initial load

---

### 3. Cache Query Results

**Problem**: Repeated queries for same data

**Solution**: In-memory cache with TTL

```tsx
// lib/services/cache.ts

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class QueryCache {
  private cache = new Map<string, CacheEntry<any>>();

  set<T>(key: string, data: T, ttl: number = 60000) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const age = Date.now() - entry.timestamp;
    if (age > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  invalidate(pattern: string) {
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }

  clear() {
    this.cache.clear();
  }
}

export const queryCache = new QueryCache();

// Usage
async function getCardsByCollection(slug: string): Promise<Card[]> {
  const cacheKey = `cards:collection:${slug}`;

  // Check cache first
  const cached = queryCache.get<Card[]>(cacheKey);
  if (cached) return cached;

  // Query database
  const db = await getDB();
  const tx = db.transaction('cards', 'readonly');
  const index = tx.objectStore('cards').index('collectionSlug');
  const cards = await index.getAll(slug);

  // Cache for 60 seconds
  queryCache.set(cacheKey, cards, 60000);

  return cards;
}

// Invalidate cache on mutation
async function updateCard(id: string, updates: Partial<Card>) {
  const card = await getCard(id);
  await updateCardInDB(id, updates);

  // Invalidate related caches
  queryCache.invalidate(`cards:collection:${card.collectionSlug}`);
  queryCache.invalidate(`cards:user:${card.userId}`);
}
```

**Performance Improvement**: 95% faster on cache hits

---

### 4. Batch Operations

**Problem**: Individual writes cause multiple IndexedDB transactions

**Solution**: Batch multiple operations into single transaction

```tsx
// ❌ Slow: Individual writes
async function updateMultipleCards(updates: Array<{ id: string; data: Partial<Card> }>) {
  for (const update of updates) {
    await updateCard(update.id, update.data); // Each opens new transaction
  }
}

// ✅ Fast: Batch transaction
async function updateMultipleCards(updates: Array<{ id: string; data: Partial<Card> }>) {
  const db = await getDB();
  const tx = db.transaction('cards', 'readwrite');
  const store = tx.objectStore('cards');

  const promises = updates.map(async ({ id, data }) => {
    const card = await store.get(id);
    if (!card) return;

    const updated = { ...card, ...data, updatedAt: new Date() };
    return store.put(updated);
  });

  await Promise.all(promises);
  await tx.done;
}
```

**Performance Improvement**: 10x faster for bulk operations

---

## RENDERING OPTIMIZATION

### 1. Memoize Components

**Problem**: Cards re-render unnecessarily on parent updates

**Solution**: Use React.memo

```tsx
// ❌ Slow: Re-renders on every parent update
function CardComponent({ card }: { card: Card }) {
  return (
    <div className="card">
      <h3>{card.title}</h3>
      <p>{card.description}</p>
    </div>
  );
}

// ✅ Fast: Only re-renders when props change
const CardComponent = React.memo(({ card }: { card: Card }) => {
  return (
    <div className="card">
      <h3>{card.title}</h3>
      <p>{card.description}</p>
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison: only re-render if these fields change
  return (
    prevProps.card.id === nextProps.card.id &&
    prevProps.card.title === nextProps.card.title &&
    prevProps.card.updatedAt === nextProps.card.updatedAt
  );
});
```

**Performance Improvement**: 30-40% fewer re-renders

---

### 2. Memoize Expensive Computations

**Problem**: Expensive calculations run on every render

**Solution**: Use useMemo

```tsx
// ❌ Slow: Recalculates on every render
function CardGrid({ cards }: { cards: Card[] }) {
  const sortedCards = cards
    .filter(c => !c.deletedAt)
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, 50);

  return <div>{sortedCards.map(card => <Card key={card.id} card={card} />)}</div>;
}

// ✅ Fast: Only recalculates when cards change
function CardGrid({ cards }: { cards: Card[] }) {
  const sortedCards = useMemo(() => {
    return cards
      .filter(c => !c.deletedAt)
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, 50);
  }, [cards]);

  return <div>{sortedCards.map(card => <Card key={card.id} card={card} />)}</div>;
}
```

**Performance Improvement**: 50% faster on large arrays

---

### 3. Virtual Scrolling for Large Lists

**Problem**: Rendering 500+ cards causes lag

**Solution**: Use react-window to render only visible cards

```tsx
// ❌ Slow: Renders all 500+ cards
function CardGrid({ cards }: { cards: Card[] }) {
  return (
    <div className="grid grid-cols-4 gap-4">
      {cards.map(card => (
        <Card key={card.id} card={card} />
      ))}
    </div>
  );
}

// ✅ Fast: Only renders visible cards
import { FixedSizeGrid } from 'react-window';

function CardGrid({ cards }: { cards: Card[] }) {
  const CARD_WIDTH = 280;
  const CARD_HEIGHT = 320;
  const GAP = 16;

  const columnCount = Math.floor(window.innerWidth / (CARD_WIDTH + GAP));
  const rowCount = Math.ceil(cards.length / columnCount);

  const Cell = ({ columnIndex, rowIndex, style }: any) => {
    const index = rowIndex * columnCount + columnIndex;
    const card = cards[index];

    if (!card) return null;

    return (
      <div style={style}>
        <Card card={card} />
      </div>
    );
  };

  return (
    <FixedSizeGrid
      columnCount={columnCount}
      columnWidth={CARD_WIDTH + GAP}
      height={window.innerHeight - 200}
      rowCount={rowCount}
      rowHeight={CARD_HEIGHT + GAP}
      width={window.innerWidth - 400}
    >
      {Cell}
    </FixedSizeGrid>
  );
}
```

**Performance Improvement**: 95% faster with 500+ cards, maintains 60fps

---

### 4. Lazy Load Images

**Problem**: Loading all images at once is slow

**Solution**: Use Intersection Observer for lazy loading

```tsx
// components/ui/lazy-image.tsx

import { useEffect, useRef, useState } from 'react';

interface LazyImageProps {
  src: string;
  alt: string;
  className?: string;
}

export function LazyImage({ src, alt, className }: LazyImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (!imgRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.disconnect();
          }
        });
      },
      {
        rootMargin: '50px' // Start loading 50px before entering viewport
      }
    );

    observer.observe(imgRef.current);

    return () => observer.disconnect();
  }, []);

  return (
    <div ref={imgRef} className={className}>
      {isInView ? (
        <img
          src={src}
          alt={alt}
          onLoad={() => setIsLoaded(true)}
          className={`transition-opacity duration-300 ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          }`}
        />
      ) : (
        <div className="bg-gray-800 animate-pulse" style={{ aspectRatio: '16/9' }} />
      )}
    </div>
  );
}

// Usage
<LazyImage
  src={card.imageUrl}
  alt={card.title}
  className="rounded-xl w-full"
/>
```

**Performance Improvement**: 60% faster initial page load

---

### 5. Debounce State Updates

**Problem**: Rapid state updates cause excessive re-renders

**Solution**: Debounce updates with custom hook

```tsx
// lib/hooks/use-debounce.ts

import { useEffect, useState } from 'react';

export function useDebounce<T>(value: T, delay: number = 500): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// Usage in search
function SearchBar() {
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 300);

  useEffect(() => {
    if (debouncedSearch) {
      performSearch(debouncedSearch);
    }
  }, [debouncedSearch]);

  return (
    <input
      type="text"
      value={searchTerm}
      onChange={(e) => setSearchTerm(e.target.value)}
      placeholder="Search..."
    />
  );
}
```

**Performance Improvement**: 80% fewer search queries

---

## SYNC OPERATION PATTERNS

### 1. Debounce Sync Operations

**Problem**: Syncing on every keystroke is wasteful

**Solution**: Debounce sync calls

```tsx
// lib/stores/data-store.ts

import { debounce } from 'lodash';

// ❌ Slow: Syncs on every change
const updateCardContent = async (cardId: string, content: string) => {
  await updateCardInIndexedDB(cardId, { content });
  await syncToServer(cardId); // Fires on every keystroke
};

// ✅ Fast: Debounced sync
const syncToServerDebounced = debounce(async (cardId: string) => {
  const card = await getCardFromIndexedDB(cardId);
  await syncToServer(card);
}, 2000); // Wait 2 seconds after last change

const updateCardContent = async (cardId: string, content: string) => {
  // Update local immediately
  await updateCardInIndexedDB(cardId, { content });

  // Debounce server sync
  syncToServerDebounced(cardId);
};

// Ensure sync before page unload
window.addEventListener('beforeunload', async (e) => {
  // Flush pending syncs
  syncToServerDebounced.flush();
});
```

**Performance Improvement**: 95% fewer API calls during editing

---

### 2. Queue Sync Operations

**Problem**: Multiple simultaneous syncs cause conflicts

**Solution**: Queue operations, process sequentially

```tsx
// lib/services/sync-queue.ts

class SyncQueue {
  private queue: Array<() => Promise<void>> = [];
  private processing = false;

  async add(operation: () => Promise<void>) {
    this.queue.push(operation);
    if (!this.processing) {
      this.process();
    }
  }

  private async process() {
    this.processing = true;

    while (this.queue.length > 0) {
      const operation = this.queue.shift();
      if (!operation) continue;

      try {
        await operation();
      } catch (error) {
        console.error('Sync operation failed:', error);
        // Optionally re-queue failed operations
      }
    }

    this.processing = false;
  }

  async flush() {
    while (this.queue.length > 0) {
      await this.process();
    }
  }
}

export const syncQueue = new SyncQueue();

// Usage
async function saveCard(card: Card) {
  // Update local immediately
  await updateCardInIndexedDB(card.id, card);

  // Queue server sync
  syncQueue.add(async () => {
    await fetch('/api/cards', {
      method: 'POST',
      body: JSON.stringify(card)
    });
  });
}
```

**Performance Improvement**: Eliminates race conditions, prevents 409 conflicts

---

### 3. Batch API Requests

**Problem**: Individual API calls for each card

**Solution**: Batch multiple cards into single request

```tsx
// ❌ Slow: Individual requests
async function syncMultipleCards(cardIds: string[]) {
  for (const id of cardIds) {
    const card = await getCard(id);
    await fetch('/api/cards', {
      method: 'POST',
      body: JSON.stringify(card)
    });
  }
}

// ✅ Fast: Batch request
async function syncMultipleCards(cardIds: string[]) {
  const cards = await Promise.all(
    cardIds.map(id => getCard(id))
  );

  await fetch('/api/cards/batch', {
    method: 'POST',
    body: JSON.stringify({ cards })
  });
}

// Batch sync with time window
const batchSyncQueue = new Set<string>();
const flushBatch = debounce(async () => {
  const cardIds = Array.from(batchSyncQueue);
  batchSyncQueue.clear();

  if (cardIds.length === 0) return;

  await syncMultipleCards(cardIds);
}, 1000);

function queueCardSync(cardId: string) {
  batchSyncQueue.add(cardId);
  flushBatch();
}
```

**Performance Improvement**: 90% fewer HTTP requests

---

### 4. Background Sync with Service Worker

**Problem**: Sync blocked if user navigates away

**Solution**: Use Background Sync API

```tsx
// lib/services/background-sync.ts

export async function registerBackgroundSync(tag: string, data: any) {
  if ('serviceWorker' in navigator && 'sync' in (self as any).registration) {
    try {
      // Store data in IndexedDB for service worker
      await storeForBackgroundSync(tag, data);

      // Register sync
      const registration = await navigator.serviceWorker.ready;
      await (registration as any).sync.register(tag);

      console.log('Background sync registered:', tag);
    } catch (error) {
      console.error('Background sync failed:', error);
      // Fallback: sync immediately
      await syncImmediately(data);
    }
  } else {
    // Fallback for browsers without Background Sync
    await syncImmediately(data);
  }
}

// service-worker.ts
self.addEventListener('sync', (event: any) => {
  if (event.tag.startsWith('sync-cards')) {
    event.waitUntil(syncPendingCards());
  }
});

async function syncPendingCards() {
  const pendingCards = await getPendingCardsFromIndexedDB();

  for (const card of pendingCards) {
    try {
      await fetch('/api/cards', {
        method: 'POST',
        body: JSON.stringify(card)
      });

      await markCardAsSynced(card.id);
    } catch (error) {
      console.error('Failed to sync card:', card.id, error);
    }
  }
}
```

**Performance Improvement**: Reliable sync even if user closes tab

---

## KNOWN PERFORMANCE ISSUES

### Issue 1: extractAndSaveLinks - Excessive Calls

**Current Problem**:
```tsx
// lib/stores/data-store.ts

// Called on every content change (every keystroke!)
const extractAndSaveLinks = async (content: string, noteId: string) => {
  console.log('Extracting links from:', noteId); // Spams console

  const links = extractMarkdownLinks(content);

  for (const link of links) {
    await createCard({ url: link, linkedNoteId: noteId });
  }
};

// Called from note editor
useEffect(() => {
  extractAndSaveLinks(content, noteId);
}, [content]); // Runs on every keystroke
```

**Impact**:
- Excessive console spam
- Unnecessary card creation attempts
- Poor editor performance
- Background sync overload

**Fix**: Debounce link extraction

```tsx
// ✅ Fixed: Debounced link extraction
const extractAndSaveLinksDebounced = debounce(
  async (content: string, noteId: string) => {
    const links = extractMarkdownLinks(content);

    // Only log if links found
    if (links.length > 0) {
      console.log(`Found ${links.length} links in note ${noteId}`);
    }

    // Batch create cards
    const newCards = links.map(url => ({
      url,
      linkedNoteId: noteId,
      type: 'bookmark' as const
    }));

    if (newCards.length > 0) {
      await batchCreateCards(newCards);
    }
  },
  500 // Wait 500ms after last change
);

// Usage in note editor
useEffect(() => {
  extractAndSaveLinksDebounced(content, noteId);

  // Cleanup: cancel pending extraction on unmount
  return () => extractAndSaveLinksDebounced.cancel();
}, [content]);

// Force extraction before navigation
useEffect(() => {
  return () => {
    // Flush pending extraction on unmount
    extractAndSaveLinksDebounced.flush();
  };
}, []);
```

**Performance Improvement**: 95% fewer extraction calls, cleaner logs

---

### Issue 2: Duplicate Detection Logs - Too Verbose

**Current Problem**:
```tsx
// lib/stores/data-store.ts

async function createCard(data: CardInput) {
  console.log('Creating card:', data.url);

  const existing = await findExistingCard(data.url);

  if (existing) {
    console.log('DUPLICATE FOUND:', data.url);
    console.log('Existing card:', existing);
    console.log('New data:', data);
    console.log('Returning existing card instead');
    return existing;
  }

  console.log('No duplicate, creating new card');
  const card = await saveCard(data);
  console.log('Card created:', card.id);
  return card;
}
```

**Impact**:
- Console spam makes debugging harder
- Excessive logging impacts performance
- No way to disable in production

**Fix**: Reduce logging verbosity

```tsx
// ✅ Fixed: Minimal, contextual logging
async function createCard(data: CardInput) {
  const existing = await findExistingCard(data.url);

  if (existing) {
    // Only log in development, single line
    if (process.env.NODE_ENV === 'development') {
      console.debug(`[Duplicate] ${data.url} → ${existing.id}`);
    }
    return { ...existing, isDuplicate: true };
  }

  const card = await saveCard(data);

  // Log creation in development
  if (process.env.NODE_ENV === 'development') {
    console.debug(`[Created] ${card.url} → ${card.id}`);
  }

  return card;
}
```

**Performance Improvement**: Cleaner logs, easier debugging

---

### Issue 3: Link Extraction on Every Content Change

**Current Problem**:
```tsx
// components/modals/card-detail-modal.tsx

useEffect(() => {
  // Extracts links on EVERY content change
  extractAndSaveLinks(content, card.id);
}, [content, card.id]); // Runs on every keystroke
```

**Impact**:
- Excessive CPU usage during typing
- Poor editor responsiveness
- Unnecessary card creation checks

**Fix**: Extract only on blur or save

```tsx
// ✅ Fixed: Extract on blur or explicit save
function CardDetailModal({ card }: { card: Card }) {
  const [content, setContent] = useState(card.content);
  const contentRef = useRef(content);

  // Update ref on content change
  useEffect(() => {
    contentRef.current = content;
  }, [content]);

  // Extract links on blur (user stopped editing)
  const handleBlur = useCallback(() => {
    extractAndSaveLinks(contentRef.current, card.id);
  }, [card.id]);

  // Extract links before closing modal
  useEffect(() => {
    return () => {
      // Extract on unmount
      extractAndSaveLinks(contentRef.current, card.id);
    };
  }, [card.id]);

  return (
    <textarea
      value={content}
      onChange={(e) => setContent(e.target.value)}
      onBlur={handleBlur} // Extract on blur
    />
  );
}
```

**Performance Improvement**: 99% fewer extraction calls, better editor performance

---

### Issue 4: No Request Deduplication

**Current Problem**:
```tsx
// Multiple components fetch same card simultaneously
function ComponentA() {
  const card = useCard(cardId); // Fetches card
}

function ComponentB() {
  const card = useCard(cardId); // Fetches same card again
}
```

**Impact**:
- Duplicate API requests
- Wasted bandwidth
- Slower load times

**Fix**: Deduplicate requests with cache

```tsx
// lib/hooks/use-card.ts

const requestCache = new Map<string, Promise<Card>>();

export function useCard(cardId: string) {
  const [card, setCard] = useState<Card | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchCard() {
      // Check cache for in-flight request
      let promise = requestCache.get(cardId);

      if (!promise) {
        // Create new request
        promise = fetch(`/api/cards/${cardId}`).then(r => r.json());
        requestCache.set(cardId, promise);

        // Clear from cache after completion
        promise.finally(() => {
          requestCache.delete(cardId);
        });
      }

      const data = await promise;
      if (!cancelled) setCard(data);
    }

    fetchCard();

    return () => {
      cancelled = true;
    };
  }, [cardId]);

  return card;
}
```

**Performance Improvement**: Eliminates duplicate requests

---

## PERFORMANCE MONITORING

### 1. Core Web Vitals

**Measure these metrics**:

```tsx
// lib/analytics/performance.ts

export function measurePerformance() {
  // Largest Contentful Paint (LCP)
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      console.log('LCP:', entry.renderTime || entry.loadTime);
    }
  }).observe({ entryTypes: ['largest-contentful-paint'] });

  // First Input Delay (FID)
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      console.log('FID:', entry.processingStart - entry.startTime);
    }
  }).observe({ entryTypes: ['first-input'] });

  // Cumulative Layout Shift (CLS)
  let clsScore = 0;
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (!(entry as any).hadRecentInput) {
        clsScore += (entry as any).value;
      }
    }
    console.log('CLS:', clsScore);
  }).observe({ entryTypes: ['layout-shift'] });
}
```

---

### 2. Custom Performance Marks

```tsx
// Measure operation timing
export function measureOperation<T>(
  name: string,
  operation: () => Promise<T>
): Promise<T> {
  const startMark = `${name}-start`;
  const endMark = `${name}-end`;
  const measureName = name;

  performance.mark(startMark);

  return operation().then(
    (result) => {
      performance.mark(endMark);
      performance.measure(measureName, startMark, endMark);

      const measure = performance.getEntriesByName(measureName)[0];
      console.log(`[${name}] ${measure.duration.toFixed(2)}ms`);

      return result;
    },
    (error) => {
      performance.mark(endMark);
      throw error;
    }
  );
}

// Usage
const cards = await measureOperation('load-cards', async () => {
  return await getAllCards();
});
```

---

## QUICK REFERENCE

### Debouncing Pattern

```tsx
import { debounce } from 'lodash';

const debouncedFunction = debounce(
  (arg: string) => {
    console.log('Called with:', arg);
  },
  500 // 500ms delay
);

// Flush pending calls
debouncedFunction.flush();

// Cancel pending calls
debouncedFunction.cancel();
```

---

### Memoization Pattern

```tsx
import { useMemo, useCallback } from 'react';

// Memoize computed value
const sortedCards = useMemo(() => {
  return cards.sort((a, b) => b.updatedAt - a.updatedAt);
}, [cards]);

// Memoize callback
const handleClick = useCallback(() => {
  console.log('Clicked');
}, []);
```

---

### Batching Pattern

```tsx
const batch = new Set<string>();
const processBatch = debounce(async () => {
  const items = Array.from(batch);
  batch.clear();
  await processItems(items);
}, 1000);

function addToBatch(item: string) {
  batch.add(item);
  processBatch();
}
```

---

## CHECKLIST FOR NEW FEATURES

Before merging new code, verify:

**IndexedDB**:
- [ ] Queries use indexes
- [ ] Results are limited/paginated
- [ ] Query results are cached (when appropriate)
- [ ] Batch operations use single transaction

**Rendering**:
- [ ] Components use React.memo (when appropriate)
- [ ] Expensive computations use useMemo
- [ ] Lists >100 items use virtualization
- [ ] Images use lazy loading
- [ ] State updates are debounced (when appropriate)

**Sync**:
- [ ] Sync operations are debounced (500ms-2s)
- [ ] Operations are queued sequentially
- [ ] Batch requests when possible
- [ ] Flush on beforeunload

**Logging**:
- [ ] Minimal console output in production
- [ ] Use console.debug for development
- [ ] No excessive logging in loops
- [ ] Logs provide useful context

---

**Last Updated**: October 29, 2025
**Architecture**: Local-first with background sync
**Performance Target**: <2s load, <100ms search, <5s sync, 60fps scroll

**Key Principle**: IndexedDB is source of truth. Optimize for instant UI updates with background sync.
