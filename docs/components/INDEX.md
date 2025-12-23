# Component Documentation Index

> Centralized lookup for component documentation in Pawkit V2

**Last Updated**: December 22, 2025

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
| **cards** | No | — | High | — | card-item.tsx 16KB, masonry-grid.tsx 13KB |
| **layout** | No | — | High | — | right-sidebar.tsx 17KB, omnibar.tsx 13KB |
| **modals** | No | — | High | — | card-detail-modal.tsx 15KB |
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

### Needs Docs (High Complexity)

1. **cards** - Core rendering system, masonry algorithm, DnD integration
2. **layout** - 3-panel shell, sidebar behavior, responsive logic
3. **modals** - Card detail editing, auto-save, reader mode

### Phase 5 Priority

1. **calendar** - Active development, will expand significantly

---

## File Statistics

Current component sizes (for monitoring file limits):

```
src/components/
├── calendar/
│   └── calendar-header.tsx          3.8KB
├── cards/
│   ├── card-grid.tsx                 1.6KB
│   ├── card-item.tsx                16.4KB  ⚠️ Watch limit
│   ├── empty-state.tsx               1.5KB
│   └── masonry-grid.tsx             13.8KB  ⚠️ Watch limit
├── layout/
│   ├── left-sidebar.tsx              6.5KB
│   ├── mobile-nav.tsx                1.9KB
│   ├── omnibar.tsx                  13.4KB  ⚠️ Watch limit
│   ├── page-header.tsx               1.7KB
│   ├── right-sidebar.tsx            17.9KB  ⚠️ Approaching limit
│   └── toast-stack.tsx               5.6KB
├── modals/
│   ├── add-card-modal.tsx           13.8KB  ⚠️ Watch limit
│   ├── card-detail-modal.tsx        15.2KB  ⚠️ Watch limit
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
