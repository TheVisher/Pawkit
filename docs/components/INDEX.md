# Component Documentation Index

> Centralized lookup for component documentation in Pawkit V2

**Last Updated**: December 23, 2025

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
| **layout** | Yes | [layout.md](./layout.md) | High | 2025-12-23 | 3-panel shell, Omnibar, Nav |
| **modals** | Yes | [modals.md](./modals.md) | High | 2025-12-23 | Global registry, Card Detail editor |
| **pawkits** | No | — | Medium | — | Tree + drag handlers |
| **providers** | No | — | Low | — | Single theme-provider.tsx |
| **ui** | N/A | — | Low | — | shadcn/ui standard - no docs needed |

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

1. **pawkits** - Should be documented next as complexity grows (nested tree logic)

---

## File Statistics

Current component sizes (for monitoring file limits):

```
src/components/
├── calendar/
│   ├── calendar-header.tsx          3.8KB
│   ├── week-view.tsx                6.5KB
│   └── agenda-view.tsx              6.2KB
├── cards/
│   ├── card-grid.tsx                 1.6KB
│   ├── card-item.tsx                16.4KB  ⚠️ Watch limit
│   ├── empty-state.tsx               1.5KB
│   └── masonry-grid.tsx             13.8KB  ⚠️ Watch limit
├── editor/
│   ├── editor.tsx                   10.0KB  ⚠️ Watch limit
│   ├── slash-command-menu.tsx        6.0KB
│   └── index.ts                      0.1KB
├── layout/
│   ├── left-sidebar.tsx              6.5KB
│   ├── mobile-nav.tsx                1.9KB
│   ├── omnibar.tsx                  13.4KB  ⚠️ Watch limit
│   ├── page-header.tsx               1.7KB
│   ├── right-sidebar.tsx            17.9KB  ⚠️ Approaching limit
│   └── toast-stack.tsx               5.6KB
├── modals/
│   ├── add-card-modal.tsx           13.8KB  ⚠️ Watch limit
│   ├── card-detail-modal.tsx        17.5KB  ⚠️ Approaching limit
│   └── create-pawkit-modal.tsx       6.4KB
├── pawkits/
│   ├── cards-drag-handler.tsx        1.5KB
│   ├── create-pawkit-button.tsx      0.6KB
│   ├── pawkit-header.tsx             2.5KB
│   ├── pawkit-tree-item.tsx          4.6KB
│   └── pawkits-tree.tsx              2.7KB
├── providers/
│   └── theme-provider.tsx            0.3KB
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