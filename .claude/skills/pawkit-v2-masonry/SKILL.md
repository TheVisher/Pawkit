# Pawkit V2 Masonry Layout

**Purpose**: Custom left-to-right masonry algorithm, dnd-kit integration

**Created**: December 20, 2025

---

## THE PROBLEM WITH V1 (MUURI)

V1 uses Muuri.js which orders items **top-to-bottom per column**, not left-to-right reading order:

```
V1 (Muuri) - WRONG:        V2 (Custom) - CORRECT:
┌───┬───┬───┐              ┌───┬───┬───┐
│ 1 │ 4 │ 7 │              │ 1 │ 2 │ 3 │
│   │ 5 │ 8 │              │ 4 │   │ 5 │
│ 2 │   │   │              │   │ 6 │   │
│ 3 │ 6 │ 9 │              │ 7 │ 8 │ 9 │
└───┴───┴───┘              └───┴───┴───┘
```

**V2 custom implementation MUST order left-to-right (reading order).**

---

## MASONRY ALGORITHM

```typescript
// lib/utils/masonry.ts

interface MasonryItem {
  id: string;
  height: number;  // Measured or estimated
}

interface MasonryPosition {
  x: number;
  y: number;
  column: number;
}

interface MasonryLayout {
  positions: Map<string, MasonryPosition>;
  containerHeight: number;
}

function calculateMasonryLayout(
  items: MasonryItem[],
  containerWidth: number,
  columnCount: number,
  gap: number
): MasonryLayout {
  const columnWidth = (containerWidth - (columnCount - 1) * gap) / columnCount;
  const columnHeights = new Array(columnCount).fill(0);
  const positions = new Map<string, MasonryPosition>();

  // Place items LEFT-TO-RIGHT, filling shortest column
  for (const item of items) {
    // Find shortest column (prefer leftmost on tie)
    let shortestColumn = 0;
    let shortestHeight = columnHeights[0];

    for (let i = 1; i < columnCount; i++) {
      if (columnHeights[i] < shortestHeight) {
        shortestColumn = i;
        shortestHeight = columnHeights[i];
      }
    }

    // Position item
    const x = shortestColumn * (columnWidth + gap);
    const y = columnHeights[shortestColumn];

    positions.set(item.id, { x, y, column: shortestColumn });

    // Update column height
    columnHeights[shortestColumn] += item.height + gap;
  }

  return {
    positions,
    containerHeight: Math.max(...columnHeights)
  };
}
```

### Key Principle

**"Fill shortest column, prefer leftmost on tie"**

This ensures:
1. Items appear in reading order (left-to-right)
2. Columns stay roughly balanced
3. No large gaps in layout

---

## CARD HEIGHT ESTIMATION

```typescript
function estimateCardHeight(card: Card): number {
  let height = 0;

  // Base height
  height += 60; // Title + domain row

  // Image adds height
  if (card.image) {
    height += 180; // Standard thumbnail height
  }

  // Description adds height
  if (card.description) {
    const lines = Math.ceil(card.description.length / 50);
    height += Math.min(lines * 20, 60); // Max 3 lines
  }

  // Tags add height
  if (card.tags.length > 0) {
    height += 30;
  }

  // Padding
  height += 24;

  return height;
}
```

For actual rendered heights, use ResizeObserver after initial render.

---

## COMPONENT IMPLEMENTATION

```typescript
// components/views/masonry-view.tsx

import { DndContext, useSensor, useSensors, PointerSensor } from '@dnd-kit/core';
import { useRef, useState, useEffect, useMemo } from 'react';

interface MasonryViewProps {
  cards: Card[];
  columnMinWidth?: number;
  gap?: number;
}

export function MasonryView({
  cards,
  columnMinWidth = 300,
  gap = 16
}: MasonryViewProps) {
  const [layout, setLayout] = useState<MasonryLayout | null>(null);
  const [itemHeights, setItemHeights] = useState<Map<string, number>>(new Map());
  const containerRef = useRef<HTMLDivElement>(null);

  // Calculate column count based on container width
  const columnCount = useMemo(() => {
    if (!containerRef.current) return 3;
    const width = containerRef.current.clientWidth;
    return Math.max(1, Math.floor(width / columnMinWidth));
  }, [columnMinWidth]);

  // Recalculate layout on resize or items change
  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new ResizeObserver(() => {
      const width = containerRef.current!.clientWidth;
      const columns = Math.max(1, Math.floor(width / columnMinWidth));

      const items = cards.map(card => ({
        id: card.id,
        height: itemHeights.get(card.id) || estimateCardHeight(card)
      }));

      setLayout(calculateMasonryLayout(items, width, columns, gap));
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [cards, itemHeights, columnMinWidth, gap]);

  // Track actual heights of rendered items
  const handleItemResize = (id: string, height: number) => {
    setItemHeights(prev => {
      const next = new Map(prev);
      next.set(id, height);
      return next;
    });
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 }
    })
  );

  return (
    <DndContext sensors={sensors}>
      <div
        ref={containerRef}
        className="relative w-full"
        style={{ height: layout?.containerHeight }}
      >
        {cards.map(card => {
          const pos = layout?.positions.get(card.id);
          return (
            <MasonryCard
              key={card.id}
              card={card}
              onResize={(h) => handleItemResize(card.id, h)}
              style={{
                position: 'absolute',
                left: pos?.x ?? 0,
                top: pos?.y ?? 0,
                width: `calc((100% - ${(columnCount - 1) * gap}px) / ${columnCount})`,
                transition: 'transform 150ms ease, top 150ms ease, left 150ms ease'
              }}
            />
          );
        })}
      </div>
    </DndContext>
  );
}
```

---

## MASONRY CARD WITH HEIGHT TRACKING

```typescript
// components/cards/masonry-card.tsx

interface MasonryCardProps {
  card: Card;
  style: React.CSSProperties;
  onResize: (height: number) => void;
}

export function MasonryCard({ card, style, onResize }: MasonryCardProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;

    const observer = new ResizeObserver((entries) => {
      const height = entries[0].contentRect.height;
      onResize(height);
    });

    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [onResize]);

  return (
    <div ref={ref} style={style} className="masonry-card">
      <CardBase card={card} />
    </div>
  );
}
```

---

## DND-KIT INTEGRATION

### Drag Preview
```typescript
import { DragOverlay } from '@dnd-kit/core';

function MasonryView() {
  const [activeId, setActiveId] = useState<string | null>(null);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      // Handle reorder
    }
    setActiveId(null);
  };

  return (
    <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      {/* ... cards ... */}

      <DragOverlay>
        {activeId && (
          <CardBase
            card={cards.find(c => c.id === activeId)!}
            className="opacity-80 shadow-2xl"
          />
        )}
      </DragOverlay>
    </DndContext>
  );
}
```

### Drop Indicators
```typescript
// Show where card will be dropped
const dropPosition = useMemo(() => {
  if (!overId || !layout) return null;
  const pos = layout.positions.get(overId);
  return pos;
}, [overId, layout]);
```

---

## KEY DIFFERENCES FROM V1

| Aspect | V1 (Muuri) | V2 (Custom + dnd-kit) |
|--------|------------|----------------------|
| Ordering | Top-to-bottom | Left-to-right |
| DnD Library | Muuri built-in | dnd-kit |
| Layout Engine | CSS transforms | Absolute positioning |
| Responsive | Muuri resize | ResizeObserver |
| Animation | Muuri transitions | CSS transitions |
| Height Tracking | Muuri measures | Custom ResizeObserver |

---

## RESPONSIVE COLUMNS

```typescript
// Calculate columns based on container width
const getColumnCount = (containerWidth: number, minColumnWidth: number): number => {
  return Math.max(1, Math.floor(containerWidth / minColumnWidth));
};

// Breakpoint suggestions
// Mobile (< 768px): 1-2 columns
// Tablet (768-1024px): 2-3 columns
// Desktop (> 1024px): 3-5 columns
```

---

## PERFORMANCE TIPS

1. **Debounce resize calculations** - Don't recalculate on every pixel change
2. **Virtualize for large lists** - Only render visible cards
3. **Cache heights** - Don't re-measure cards that haven't changed
4. **Use CSS transitions** - Let browser optimize animations
5. **Batch updates** - Group multiple position changes together

---

## VIRTUALIZATION (Large Lists)

```typescript
// For 100+ cards, consider virtualization
import { useVirtualizer } from '@tanstack/react-virtual';

// Only render cards in viewport + buffer
const virtualItems = virtualizer.getVirtualItems();
```

---

**Last Updated**: December 20, 2025
