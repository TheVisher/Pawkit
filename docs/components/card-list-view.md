---
component: "card-list-view"
complexity: "high"
status: "stable"
last_updated: "2025-12-23"
maintainer: "Claude Code"
---

# Card List View

> A Notion-style tabular list view with inline editing, grouping, and multi-select

---

## Purpose

The Card List View provides a dense, data-rich way to manage content. Unlike the visual Masonry grid, this view focuses on:

- **Metadata Management**: Quick editing of tags, descriptions, and notes.
- **Bulk Operations**: Selecting multiple items to delete or tag.
- **Structured Grouping**: Organizing items by date, tag, or domain.
- **Column Customization**: Allowing users to choose exactly what data they see.

---

## Architecture

### Data Flow

```
ViewStore (Column Settings)
       ↓
   CardListView (Main Container)
       ↓
   Sticky Header (ColumnPicker)
       ↓
   SortableContext (DnD Rows)
       ↓
   SortableListRow → EditableCell
```

### Key Dependencies

| Dependency | Purpose |
|------------|---------|
| `useViewStore` | Persists column widths, order, and visibility. |
| `dnd-kit` | Handles both column reordering and row reordering. |
| `react-resizable` | (Logic implemented manually) Column resizing. |

### State Management

- **Persisted State** (via `LocalViewSettings`):
  - `listColumnOrder`: Array of visible column IDs.
  - `listColumnWidths`: Map of column widths (pixels).
  - `listColumnVisibility`: Boolean toggles for optional columns.
- **Local State**:
  - `selection`: Set of selected card IDs.
  - `editing`: Currently active cell `{ cardId, column }`.

---

## File Structure

```
src/components/cards/card-list-view.tsx  # Monolithic component (split planned)
```

*Note: Currently contains `ColumnPicker`, `ResizableHeader`, `EditableCell`, and `BulkActionBar` as sub-components.*

---

## Features

### 1. Columns
Supported columns: `name`, `type`, `tags`, `createdAt`, `updatedAt`, `url`, `domain`, `description`, `collections`, `status`, `pinned`, `scheduledDate`, `thumbnail`, `notes`.

- **Name** is mandatory and always first.
- **Tags** and **Collections** render as pill lists.
- **URL** renders as a clickable external link.

### 2. Interactions
- **Sticky Header**: Stays visible while scrolling.
- **Resize**: Drag separator between headers to resize.
- **Reorder**: Drag headers to rearrange columns.
- **Sort**: Click header to toggle ASC/DESC.

### 3. Inline Editing
Double-click any editable cell to enter edit mode:
- **Text**: Input field (Name, Description).
- **Tags**: Comma-separated input parser.
- **Notes**: Multiline textarea.
- **Save**: `Enter` or `Blur` saves to Dexie. `Escape` cancels.

### 4. Grouping & Headers
When `groupBy` is active (Date, Tag, etc.), the list renders `GroupSeparator` rows:
- Stick functionality is maintained.
- Drag-and-drop reordering is disabled when grouped (logic constraint).

### 5. Multi-Select
- Checkbox column on the far left.
- `Shift+Click` range selection (planned).
- **Bulk Action Bar** appears at the bottom:
  - Delete
  - Add Tags (stub)
  - Add to Collection (stub)

---

## Usage Example

```tsx
import { CardListView } from '@/components/cards/card-list-view';

// Standalone usage
<CardListView cards={data} />

// With grouping
<CardListView 
  cards={data} 
  groups={[
    { key: 'today', label: 'Today', cards: [...] },
    { key: 'yesterday', label: 'Yesterday', cards: [...] }
  ]} 
/>
```

---

## Known Issues

| Issue | Severity | Workaround |
|-------|----------|------------|
| Mobile Scrolling | Medium | Horizontal scroll works, but sticky header can be finicky on iOS. |
| Column Flicker | Low | Rapid resizing can cause layout thrashing. |

---

## Related Documentation

- [cards.md](./cards.md) - Parent component
- [pawkit-v2-view-settings](../../.claude/skills/pawkit-v2-view-settings/SKILL.md)
