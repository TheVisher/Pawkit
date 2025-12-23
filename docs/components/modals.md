---
component: "modals"
complexity: "high"
status: "stable"
last_updated: "2025-12-23"
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
   CardDetailModal
```

### Key Dependencies

| Dependency | Purpose |
|------------|---------|
| `useModalStore` | Single source of truth for active modal and props. |
| `@radix-ui/react-dialog` | Accessible, robust modal primitives. |
| `useDataStore` | Modals often fetch/write data directly (e.g. edit card). |

### State Management

- **Local state**: Form state (dirty checking), tabs (Read/Edit).
- **Store connections**: `useModalStore` controls visibility.
- **Props**: Injected via the store's `props` object.

---

## File Structure

```
src/components/modals/
├── card-detail-modal.tsx   # Complex: Editor, Reader, Auto-save
├── add-card-modal.tsx      # Create new bookmark/note
├── create-pawkit-modal.tsx # Create/Edit collection
└── index.ts                # Exports and Registry
```

### File Responsibilities

| File | Lines | Purpose |
|------|-------|---------|
| `card-detail-modal.tsx` | ~400 | The most complex component. Handles Markdown editing, metadata display, and reader mode. |
| `add-card-modal.tsx` | ~150 | Multi-step wizard for adding URLs or Notes. |
| `create-pawkit-modal.tsx` | ~100 | Simple form for collection management. |

---

## Current Status

### What's Working

- [x] **Global Registry**: Modals are mounted at the root level in `DashboardLayout`.
- [x] **Card Detail**: Full editing capabilities, auto-save, and tag management.
- [x] **Reader Mode**: Integrated `dompurify` for safe HTML rendering of article content.
- [x] **Glass Theme**: All modals use the V2 standard backdrop and border styles.
- [x] **Auto-Save**: The detail modal saves changes on blur or close.

### What's Not Implemented

- [ ] **Keyboard Nav**: `Cmd+Enter` to save/close in all modals.
- [ ] **Deep Linking**: Opening a modal via `/w/[id]/c/[cardId]` URL.

### Recent Changes

| Date | Change | Commit/PR |
|------|--------|-----------|
| 2025-12-20 | Implemented `CardDetailModal` with auto-save. | — |
| 2025-12-20 | Added `CreatePawkitModal` for Phase 4. | — |

---

## Known Issues

| Issue | Severity | Workaround |
|-------|----------|------------|
| Mobile scroll locking | Low | Radix UI handles this, but address bar can interfere. |

---

## Usage Examples

### Opening a Modal

```tsx
import { useModalStore } from '@/lib/stores/modal-store';

function EditButton({ cardId }) {
  const { openModal } = useModalStore();

  return (
    <button onClick={() => openModal('card-detail', { cardId })}>
      Edit
    </button>
  );
}
```

### Defining the Registry (Layout)

```tsx
// src/app/(dashboard)/layout.tsx
import { useModalStore } from '@/lib/stores/modal-store';
import { CardDetailModal } from '@/components/modals/card-detail-modal';

export default function Layout() {
  const { type, isOpen, close, props } = useModalStore();

  return (
    <>
      {/* ... app content ... */}
      
      {/* Modal Mount Point */}
      {isOpen && type === 'card-detail' && (
        <CardDetailModal 
          isOpen={isOpen} 
          onClose={close} 
          cardId={props.cardId} 
        />
      )}
    </>
  );
}
```

---

## Testing Notes

- **State Persistence**: Edit a card title, close modal without clicking save. Re-open to verify auto-save (or persistence).
- **Overflow**: Open a card with a very long note. Verify inner scrolling works while body scroll is locked.
- **Mobile**: Open modal on mobile. Verify close button is accessible.

---

## Related Documentation

- [PLAYBOOK.md - Component Organization](../../docs/PLAYBOOK.md)
- [pawkit-v2-ui](../../.claude/skills/pawkit-v2-ui/SKILL.md)
