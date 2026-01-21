---
component: "modals"
complexity: "high"
status: "stable"
last_updated: "2025-12-30"
maintainer: "Claude Code"
---

# Modals

> Global dialog system for creating content, editing details, and blocking interactions

---

## Purpose

The Modals system provides a centralized way to handle transient UI interruptions. Unlike standard dialogs, Pawkit modals often act as "mini-apps" (e.g., the Card Detail modal, which is a full-featured editor and reader).

- **Global State**: Managed via `useModalStore` (Zustand) to avoid prop drilling.
- **Consistency**: Enforces glass morphism, backdrop blur, and animation standards.
- **Deep Linking**: (Planned) Support for URL-based modal opening.

---

## Architecture

### Data Flow

```
UI Component (Button)
       ↓
   useModalStore.open('card-detail', { id: '123' })
       ↓
   DashboardLayout (Modal Root)
       ↓
   Modal Registry (Switch Statement)
       ↓
   CardDetailModal (Orchestrator)
```

### Key Dependencies

| Dependency | Purpose |
|------------|---------|
| `useModalStore` | Single source of truth for active modal and props. |
| `@radix-ui/react-dialog` | Accessible, robust modal primitives. |
| `useDataStore` | Modals often fetch/write data directly (e.g. edit card). |
| `DOMPurify` | Sanitizes article content for the reader view. |

### State Management

- **Local state**: Form state (dirty checking), reading progress, reader theme.
- **Store connections**: `useModalStore` controls visibility.
- **Props**: Injected via the store's `props` object.

---

## File Structure

```
src/components/modals/
├── card-detail/            # Modularized detail view
│   ├── index.tsx           # Radix Dialog wrapper
│   ├── header.tsx          # Card thumbnail and metadata
│   ├── content.tsx         # Main orchestrator (Form/Reader/Stats)
│   ├── content/            # Sub-sections
│   │   ├── EditorSection.tsx
│   │   ├── ReaderSection.tsx
│   │   └── StatsSection.tsx
│   └── types.ts            # Local type definitions
├── add-card-modal.tsx      # Create new bookmark/note
├── create-pawkit-modal.tsx # Create/Edit collection
└── index.ts                # Exports and Registry
```

### File Responsibilities

| File | Lines | Purpose |
|------|-------|---------|
| `card-detail/content.tsx` | ~450 | Orchestrates editing, stats, and the CNN-style reader mode. |
| `add-card-modal.tsx` | ~150 | Multi-step wizard for adding URLs or Notes. |
| `create-pawkit-modal.tsx` | ~100 | Simple form for collection management. |

---

## Current Status

### What's Working

- [x] **Global Registry**: Modals are mounted at the root level in `DashboardLayout`.
- [x] **Redesigned Card Detail**: Modularized architecture for better maintainability.
- [x] **CNN-Style Reader**: Immersive, high-typography article reading experience within the modal.
- [x] **Inline Reader Themes**: Support for Dark, Sepia, and Light themes in the reader view.
- [x] **Auto-Save**: The detail modal saves changes on blur or close.
- [x] **Cover Image Picker**: IntegratedPositioning and height sliders for card/collection covers.

### What's Not Implemented

- [ ] **Keyboard Nav**: `Cmd+Enter` to save/close in all modals.
- [ ] **Deep Linking**: Opening a modal via `/w/[id]/c/[cardId]` URL.

### Recent Changes

| Date | Change | Implementation Details |
|------|--------|------------------------|
| 2025-12-30 | **Card Detail Refactor** | Split `card-detail-modal.tsx` into modular `Header`, `Content`, and `Reader` components. |
| 2025-12-30 | **CNN-Style Reader** | Added immersive article reader with progress tracking and theme switching. |
| 2025-12-26 | **Cover Image Picker** | Implemented position and height adjustments for cover images. |

---

## Known Issues

| Issue | Severity | Workaround |
|-------|----------|------------|
| Mobile scroll locking | Low | Radix UI handles this, but address bar can interfere. |

---

## Related Documentation

- [PLAYBOOK.md - Component Organization](../../docs/PLAYBOOK.md)
- [pawkit-v2-ui](../../.claude/skills/pawkit-v2-ui/SKILL.md)
