---
component: "layout"
complexity: "high"
status: "stable"
last_updated: "2025-12-30"
maintainer: "Claude Code"
---

# Layout

> The persistent 3-panel shell, navigation, and global application chrome.

---

## Purpose

The Layout system defines the physical structure of the application. It enforces:

- **3-Panel Design**: Left Sidebar (Nav), Center (Content), Right Sidebar (Context/Settings).
- **Responsive Behavior**: Collapsing panels on mobile/tablet.
- **Global Navigation**: Workspace switching, Pawkits tree, and view controls.
- **Omnibar**: Central command palette and toast notification system.
- **Visual Consistency**: Unified glass-morphism effects, sliding highlights, and "purple glow" hover states.

---

## Architecture

### Component Hierarchy

```
DashboardLayout
  ├── DashboardShell (State Provider for UI)
  │    ├── LeftSidebar
  │    │    ├── Navigation Links (Home, Library, Calendar)
  │    │    ├── PawkitsTree (Collapsible, Draggable)
  │    │    ├── Tags Link
  │    │    └── User/Workspace Menu
  │    ├── CenterPanel
  │    │    ├── Omnibar (Floating)
  │    │    └── {Children / Page Content}
  │    └── RightSidebar
  │         ├── Header (Toggle, Theme, Settings Icon)
  │         ├── SettingsPanel (when settings mode active)
  │         │    └── AppearanceSection / AccountSection / DataSection
  │         ├── CardDetailsPanel (when card active)
  │         └── FiltersPanel (Default)
  │              ├── SidebarSection (Accordion Wrapper)
  │              │    ├── TagsFilter
  │              │    ├── SortOptions
  │              │    ├── GroupingSection
  │              │    ├── ContentTypeFilter
  │              │    ├── CardDisplaySettings
  │              │    └── AdvancedFilterSection
  └── MobileNav (Bottom bar, visible < 768px)
```

### Key Dependencies

| Dependency | Purpose |
|------------|---------|
| `useUIStore` | Panel collapse state, modal open state. |
| `useViewStore` | View-specific settings (right sidebar content). |
| `framer-motion` | Smooth panel slide, tree expansion, and "sliding highlight" animations. |
| `dnd-kit` | Droppable zones in sidebar (Pawkits tree). |
| `lucide-react` | Consistent iconography (h-5 w-5 standard). |

---

## File Structure

```
src/components/layout/
├── left-sidebar.tsx               # Primary navigation and Pawkits tree
├── right-sidebar/                 # Right sidebar module
│   ├── index.tsx                  # Main orchestration
│   ├── SidebarSection.tsx         # Reusable accordion component
│   ├── FilterSections.tsx         # Individual filter logic/UI
│   ├── CardDetailsPanel.tsx       # "Inspector" view for active card
│   ├── CardDisplaySettings.tsx    # Grid/View customization controls
│   ├── SettingsPanel.tsx          # Settings panel with tabbed navigation
│   └── calendar/                  # Calendar-specific sidebar content
├── omnibar.tsx                    # Search bar + Toast notifications container
├── mobile-nav.tsx                 # Bottom navigation for mobile
├── page-header.tsx                # Top bar of the center panel
├── toast-stack.tsx                # Physics-based toast notification stack
└── index.ts                       # Exports

src/components/settings/
└── sections/
    ├── appearance-section.tsx     # Visual style, theme, accent color, background
    ├── account-section.tsx        # User info, workspace settings
    └── data-section.tsx           # Danger zone, data deletion
```

### Key Components & Patterns

#### Left Sidebar (`left-sidebar.tsx`)
- **Sliding Highlight**: Uses `framer-motion`'s `layoutId="active-sidebar-item"` to animate the active background state between nav items.
- **Pawkits Tree**: A nested, collapsible tree structure wrapped in `AnimatePresence` for smooth height/opacity transitions.
- **Hover Effects**: Features a subtle "Purple Glow" line gradient at the bottom of items on hover.

#### Right Sidebar (`right-sidebar/`)
- **Modular Sections**: Split into `FilterSections.tsx` to handle specific filter logic (Tags, Sort, Group, etc.).
- **SidebarSection**: A reusable accordion component (`SidebarSection.tsx`) that enforces:
    -   Standard LTR layout (Title Left, Chevron Right).
    -   "Thread line" style: A left-border indicator for expanded content.
    -   Smooth expand/collapse animations.
- **Filter Styles**:
    -   **Single-Select** (Sort, Group): Clean text, purple background wrapper when active.
    -   **Multi-Select** (Content Type, Tags): Button-like appearance with background/border.
    -   **Icons**: Uses `lucide-react` icons for grid controls (Grid3x3, Grid2x2, Square) instead of text.

---

## Current Status

### What's Working

- [x] **3-Panel Shell**: Fully implemented with pixel-perfect V2 dimensions.
- [x] **Collapsible Sidebars**: Smooth framer-motion animations for panels and internal sections.
- [x] **Visual Polish**:
    -   Unified "purple glow" hover effects.
    -   Sliding glass-morphism active states.
    -   Softer accent tints for clearer visual hierarchy.
- [x] **Right Sidebar Refactor**: Broken down into manageable sub-components with consistent accordion behavior.
- [x] **Settings Panel**: Integrated into right sidebar with animated gear/X icon toggle.
- [x] **Visual Styles**: Glass, Flat, and High Contrast themes with CSS variable system.
- [x] **Omnibar**: Unified search/command/capture interface.
- [x] **Responsive**: Mobile bottom nav activates correctly on small screens.

### What's Not Implemented

- [ ] **Keyboard Shortcuts**: Global hotkeys for toggling sidebars (Cmd+\, Cmd+/).
- [ ] **Context Menu**: Right-click on sidebar items (partial implementation).

### Recent Changes

| Date | Change | Implementation Details |
|------|--------|------------------------|
| 2025-12-30 | **Settings Panel** | Added `SettingsPanel` to right sidebar with gear/X icon transition; tabs for Appearance, Account, Data. |
| 2025-12-30 | **Visual Styles System** | Implemented Glass, Flat, and High Contrast visual styles with CSS variable overrides. |
| 2025-12-30 | **Danger Zone** | Added data deletion options (delete notes/bookmarks/all) to Data section. |
| 2025-12-29 | **Right Sidebar Refactor** | Modularized into `right-sidebar/` directory; added `SidebarSection` component. |
| 2025-12-29 | **Sidebar Animations** | Added sliding active background and smooth tree expansion logic. |
| 2025-12-29 | **Visual Styling** | Adopted "purple glow" hovers and distinct single/multi-select filter styles. |
| 2025-12-29 | **Filter Organization** | Moved Link Status/Duplicates to "Advanced" accordion; optimized layout for Tags/Content Type. |

---

## Usage Examples

### Sidebar Section (Accordion)

```tsx
// src/components/layout/right-sidebar/SidebarSection.tsx
<SidebarSection 
  title="Sort By" 
  icon={ArrowUpDown} 
  defaultOpen={true}
>
  {/* Content here gets the "thread line" styling automatically */}
  <SortOptions ... />
</SidebarSection>
```

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
- **Animation**: 
    -   Toggle sidebars rapidly.
    -   Expand/collapse "Pawkits" tree and "Filter" sections.
    -   Navigate between tabs to see the sliding highlight.
- **Drag & Drop**: Drag a card from center to left sidebar Pawkits.
- **Interactions**: Hover over nav items to verify the "purple glow" effect.

---

## Related Documentation

- [PLAYBOOK.md - UI Structure](../../docs/PLAYBOOK.md)
- [pawkit-v2-layout](../../.claude/skills/pawkit-v2-layout/SKILL.md)
- [pawkit-v2-ui](../../.claude/skills/pawkit-v2-ui/SKILL.md)