---
component: "layout"
complexity: "high"
status: "stable"
last_updated: "2025-12-23"
maintainer: "Claude Code"
---

# Layout

> The persistent 3-panel shell, navigation, and global application chrome

---

## Purpose

The Layout system defines the physical structure of the application. It enforces:

- **3-Panel Design**: Left Sidebar (Nav), Center (Content), Right Sidebar (Context/Settings).
- **Responsive Behavior**: Collapsing panels on mobile/tablet.
- **Global Navigation**: Workspace switching, Pawkits tree, and view controls.
- **Omnibar**: Central command palette and toast notification system.

---

## Architecture

### Component Hierarchy

```
DashboardLayout
  ├── DashboardShell (State Provider for UI)
  │    ├── LeftSidebar
  │    │    ├── WorkspaceSwitcher
  │    │    └── PawkitsTree
  │    ├── CenterPanel
  │    │    ├── Omnibar (Floating)
  │    │    └── {Children / Page Content}
  │    └── RightSidebar
  │         ├── ThemeToggle
  │         └── ViewSettings
  └── MobileNav (Bottom bar, visible < 768px)
```

### Key Dependencies

| Dependency | Purpose |
|------------|---------|
| `useUIStore` | Panel collapse state, modal open state |
| `useViewStore` | View-specific settings (right sidebar content) |
| `framer-motion` | Smooth panel slide/collapse animations |
| `dnd-kit` | Droppable zones in sidebar (Pawkits tree) |

### State Management

- **Local state**: Transient hover states, drag-over indicators.
- **Store connections**: 
  - `useUIStore`: `leftSidebarOpen`, `rightSidebarOpen`, `isMobile`.
  - `useWorkspaceStore`: Current workspace context.
- **Props**: Most layout components consume state directly from stores.

---

## File Structure

```
src/components/layout/
├── left-sidebar.tsx     # Navigation tree, workspace switcher
├── right-sidebar.tsx    # Context-aware settings panel
├── omnibar.tsx          # Search bar + Toast notifications container
├── mobile-nav.tsx       # Bottom navigation for mobile
├── page-header.tsx      # Top bar of the center panel
├── toast-stack.tsx      # Physics-based toast notification stack
└── index.ts             # Exports
```

### File Responsibilities

| File | Lines | Purpose |
|------|-------|---------|
| `omnibar.tsx` | ~280 | Complex morphing UI. Transforms from search input to toast notification. |
| `left-sidebar.tsx` | ~200 | Host for the recursive Pawkits tree and DnD drop zones. |
| `right-sidebar.tsx` | ~350 | Dynamic content based on current view (Library vs. Calendar options). |

---

## Current Status

### What's Working

- [x] **3-Panel Shell**: Fully implemented with pixel-perfect V1 dimensions.
- [x] **Collapsible Sidebars**: Smooth framer-motion animations.
- [x] **Omnibar**: Elastic morphing animations and toast integration.
- [x] **Responsive**: Mobile bottom nav activates correctly on small screens.
- [x] **Glass Morphism**: Panels use the standard V2 glass theme.
- [x] **DnD Zones**: Left sidebar acts as a drop target for cards.

### What's Not Implemented

- [ ] **Keyboard Shortcuts**: Global hotkeys for toggling sidebars (Cmd+\, Cmd+/).
- [ ] **Context Menu**: Right-click on sidebar items.

### Recent Changes

| Date | Change | Commit/PR |
|------|--------|-----------|
| 2025-12-20 | Implemented scroll-aware Omnibar collapse. | — |
| 2025-12-20 | Fixed janky right-sidebar animations during anchor toggle. | — |
| 2025-12-20 | Added `dnd-kit` DropTarget support to Left Sidebar. | — |

---

## Known Issues

| Issue | Severity | Workaround |
|-------|----------|------------|
| Omnibar collision | Low | Omnibar overlaps page title on very narrow screens. |
| Mobile height 100vh | Medium | iOS Safari address bar quirks need `dvh` unit tuning. |

---

## Usage Examples

### Dashboard Shell

```tsx
// src/app/(dashboard)/dashboard-shell.tsx
export function DashboardShell({ children }: { children: React.ReactNode }) {
  // Handles all global layout state initialization
  return (
    <div className="flex h-screen w-full overflow-hidden bg-bg-base">
      <LeftSidebar />
      <CenterPanel>{children}</CenterPanel>
      <RightSidebar />
      <MobileNav />
    </div>
  );
}
```

---

## Testing Notes

- **Responsive**: Resize window from 1920px down to 375px. Verify panels collapse/hide.
- **Animation**: Toggle sidebars rapidly. Ensure no layout thrashing or jumps.
- **Drag & Drop**: Drag a card from center to left sidebar. Verify highlight effect.
- **Toasts**: Trigger a sync error to see the Omnibar morph into an error toast.

---

## Related Documentation

- [PLAYBOOK.md - UI Structure](../../docs/PLAYBOOK.md)
- [pawkit-v2-layout](../../.claude/skills/pawkit-v2-layout/SKILL.md)
- [pawkit-v2-ui](../../.claude/skills/pawkit-v2-ui/SKILL.md)
