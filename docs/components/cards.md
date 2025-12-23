---
component: "cards"
complexity: "high"
status: "stable"
last_updated: "2025-12-23"
maintainer: "Claude Code"
---

# Cards

> The core visual entity representing bookmarks, notes, files, and other content

---

## Purpose

The Card component system is the primary visual building block of Pawkit. It handles:

- **Visualization**: Rendering disparate content types (URLs, notes, images, videos)
- **Interaction**: Drag-and-drop, selection, context menus, and click-to-open
- **Sync Status**: Visual indicators for sync states (synced, pending, error)
- **Metadata**: Displaying favicons, open graph images, tags, and timestamps

---

## Architecture

### Data Flow

```
DataStore (local DB)
       ↓
   MasonryGrid / CardGrid
       ↓
    CardItem (Smart Wrapper)
       ↓
  CardRenderer (Type Specific)
       ↓
   Bookmark / Note / File / Video
```

### Key Dependencies

| Dependency | Purpose |
|------------|---------|
| `useDataStore` | Access to card data |
| `dnd-kit` | Drag and drop functionality |
| `framer-motion` | Animations (layout, hover, enter/exit) |
| `react-memo` | Heavy optimization to prevent re-renders |

### State Management

- **Local state**: Hover effects, menu open state
- **Store connections**: `useDataStore` (data), `useUIStore` (selection), `useViewStore` (layout prefs)
- **Props**: `Card` object, `layout` mode (grid/list/masonry)

---

## File Structure

```
src/components/cards/
├── card-item.tsx        # Main wrapper, handles generic UI (hover, actions)
├── card-list-view.tsx   # Notion-style list view with inline editing
├── card-grid.tsx        # CSS Grid layout container
├── masonry-grid.tsx     # Custom masonry layout container
├── empty-state.tsx      # Placeholder when no cards exist
└── index.ts             # Exports
```

### File Responsibilities

| File | Lines | Purpose |
|------|-------|---------|
| `card-item.tsx` | ~300 | The heavy lifter. Handles common chrome, sync status, and type switching. |
| `card-list-view.tsx` | ~800 | Complex table view. Handles sticky headers, resize, multi-select, and inline editing. |
| `masonry-grid.tsx` | ~250 | Custom absolute-positioning engine for masonry layout. Integrates `dnd-kit`. |
| `card-grid.tsx` | ~100 | Simple CSS grid alternative for standard views. |

---

## Current Status

### What's Working

- [x] **Visual Parity**: Glass morphism, shadows, and hover effects match V1 design.
- [x] **Content Types**: URLs (Bookmarks) and Markdown Notes are fully implemented.
- [x] **List View**: Robust table with sorting, grouping, and inline edits.
- [x] **Masonry Layout**: Custom algorithm preserves left-to-right reading order.
- [x] **Drag & Drop**: Fully integrated with `dnd-kit`, including drag-to-sidebar.
- [x] **Performance**: Heavy use of `React.memo` ensures smooth 60fps scrolling.
- [x] **Sync Indicators**: Visual cues for pending sync/errors.

### What's Not Implemented

- [ ] **File Cards**: Local file support is pending (roadmap).
- [ ] **Video Cards**: Inline playback not yet implemented.
- [ ] **Multi-Select**: Shift+Click range selection.

### Recent Changes

| Date | Change | Commit/PR |
|------|--------|-----------|
| 2025-12-20 | Implemented `React.memo` optimization for `CardItem`. | — |
| 2025-12-20 | Added `dnd-kit` integration to `MasonryGrid`. | — |
| 2025-12-20 | Finalized glass morphism styles for V1 parity. | — |

---

## Known Issues

| Issue | Severity | Workaround |
|-------|----------|------------|
| Large notes truncation | Low | CSS line-clamp handles this gracefully. |
| Image loading layout shift | Low | Fixed aspect ratios mostly mitigate this. |

---

## Usage Examples

### Basic Usage

```tsx
import { CardItem } from '@/components/cards/card-item';

<CardItem
  card={cardData}
  layout="masonry"
  style={{ ...positionStyles }} // For masonry absolute positioning
/>
```

### Grid Container

```tsx
import { MasonryGrid } from '@/components/cards/masonry-grid';

<MasonryGrid
  cards={allCards}
  columns={4}
  onOrderChange={handleReorder}
/>
```

---

## Testing Notes

- **Drag & Drop**: Test dragging cards between columns and into the sidebar.
- **Resize**: Verify masonry recalculates correctly on window resize.
- **Performance**: Scroll rapidly with >100 cards to ensure frame rate holds.
- **Sync**: Disconnect network, create card, verify "pending" state visually.

---

## Related Documentation

- [PLAYBOOK.md - Data Model](../../docs/PLAYBOOK.md)
- [pawkit-v2-masonry](../../.claude/skills/pawkit-v2-masonry/SKILL.md)
- [pawkit-v2-data-model](../../.claude/skills/pawkit-v2-data-model/SKILL.md)