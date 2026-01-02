# Component Documentation Index

> Centralized lookup for component documentation in Pawkit V2

**Last Updated**: December 30, 2025

---

## How to Use This Index

1. **Before modifying a component**, check if it has documentation
2. **If "Has Docs" is Yes**, read the doc before making changes
3. **After completing work**, update the doc's "Last Updated" and "Current Status"
4. **For patterns and conventions**, see [.claude/instructions.md](../../.claude/instructions.md)

---

## Component Registry

| Component | Has Docs | Location | Complexity | Last Updated | Notes |
|-----------|----------|----------|------------|--------------|-------|
| **calendar** | Yes | [calendar.md](./calendar.md) | High | 2025-12-22 | Phase 5 - All views implemented |
| **cards** | Yes | [cards.md](./cards.md) | High | 2025-12-23 | Core visual entity, DnD enabled |
| **card-list-view** | Yes | [card-list-view.md](./card-list-view.md) | High | 2025-12-23 | Table view with inline edit |
| **editor** | Yes | [editor.md](./editor.md) | High | 2025-12-23 | Phase 7.1 - Tiptap rich text editor |
| **layout** | Yes | [layout.md](./layout.md) | High | 2025-12-30 | Refactored Omnibar and Filter sections |
| **modals** | Yes | [modals.md](./modals.md) | High | 2025-12-30 | Refactored Card Detail Modal |
| **pawkits** | No | — | Medium | 2025-12-30 | Tree, Headers, and Card logic |
| **providers** | No | — | Low | — | Single theme-provider.tsx |
| **settings** | No | — | Medium | 2025-12-30 | Settings sections (Modularized Appearance) |

---

## Complexity Ratings

| Rating | Criteria | Docs Required? |
|--------|----------|----------------|
| **High** | >10KB total, complex state, multiple files | Yes |
| **Medium** | 5-10KB total, moderate complexity | Recommended |
| **Low** | <5KB, simple/standard patterns | Optional |
| **N/A** | Third-party/generated (shadcn) | No |

---

## Documentation Priorities

### Phase 6 Priority

1. **rediscover** - Upcoming view implementation (Phase 6)

### Maintenance

1. **right-sidebar** - Refactor in progress (Split filters into modular components)
2. **pawkits** - Should be documented next as complexity grows (nested tree logic)

---

## File Statistics

Current component sizes (for monitoring file limits):

```
src/components/
├── calendar/
│   ├── calendar-header.tsx          2.5KB
│   ├── week-view.tsx                5.5KB
│   └── agenda-view.tsx              4.6KB
├── cards/
│   ├── card-grid.tsx                 8.0KB
│   ├── card-item.tsx               <1.0KB   (Memoized wrapper)
│   ├── empty-state.tsx               1.5KB
│   └── masonry-grid.tsx             15.0KB  ⚠️ Watch limit
├── editor/
│   ├── editor.tsx                   17.0KB  ⚠️ Watch limit
│   ├── slash-command-menu.tsx       10.0KB  ⚠️ Watch limit
│   └── index.ts                      0.1KB
├── layout/
│   ├── left-sidebar.tsx              8.1KB
│   ├── mobile-nav.tsx                1.8KB
│   ├── page-header.tsx               1.6KB
│   ├── right-sidebar.tsx            46.0KB  🚨 CRITICAL - SPLIT ASAP
│   │   └── sections/                        (Modularized filters)
│   ├── omnibar/
│   │   ├── index.tsx                 6.6KB
│   │   ├── idle-content.tsx         14.0KB  ⚠️ Watch limit
│   │   └── use-omnibar/
│   │       ├── index.ts              7.0KB
│   │       └── use-search.ts        20.0KB  ⚠️ Watch limit
│   └── toast-stack.tsx               5.5KB
├── modals/
│   ├── add-card-modal.tsx           13.0KB  ⚠️ Watch limit
│   ├── card-detail/
│   │   ├── index.tsx                 3.3KB
│   │   ├── header.tsx                8.9KB
│   │   └── content.tsx               2.5KB
│   ├── cover-image-picker-modal.tsx 18.0KB  ⚠️ Watch limit
│   └── create-pawkit-modal.tsx       6.2KB
├── pawkits/
│   ├── cards-drag-handler.tsx        1.4KB
│   ├── create-pawkit-button.tsx      0.6KB
│   ├── pawkit-card.tsx               6.8KB
│   ├── pawkit-header.tsx             5.7KB
│   ├── pawkit-tree-item.tsx          3.8KB
│   └── pawkits-tree.tsx              2.4KB
├── providers/
│   └── theme-provider.tsx            0.3KB
├── settings/
│   └── sections/
│       ├── appearance-section.tsx    6.4KB
│       ├── accent-color-picker.tsx  10.0KB  ⚠️ Watch limit
│       ├── account-section.tsx       3.0KB
│       └── data-section.tsx          5.5KB
└── ui/                              [shadcn - not tracked]
```

**Component limit**: 300 lines (~9KB). Files marked ⚠️ are approaching or exceeding recommended limits.

---

## Creating New Documentation

Use the template at [.claude/templates/COMPONENT_DOC.md](../../.claude/templates/COMPONENT_DOC.md):

```bash
cp .claude/templates/COMPONENT_DOC.md docs/components/{component-name}.md
```

Then update this INDEX to reflect the new documentation.

---

## Maintenance

- Review this index monthly
- Archive docs for removed components
- Flag stale docs (>90 days without update)