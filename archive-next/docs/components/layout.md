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
│   ├── sections/                  # Modular filter and display components
│   │   ├── TagsFilter.tsx
│   │   ├── ContentTypeFilter.tsx
│   │   ├── SortOptions.tsx
│   │   └── ...
│   ├── CardDetailsPanel.tsx       # "Inspector" view for active card
│   ├── CardDisplaySettings.tsx    # Grid/View customization controls
│   ├── SettingsPanel.tsx          # Settings panel with tabbed navigation
│   └── calendar/                  # Calendar-specific sidebar content
├── omnibar/                       # Unified command palette module
│   ├── index.tsx                  # UI bridge/container
│   ├── idle-content.tsx           # Search/Capture UI
│   ├── search-results-panel.tsx   # Results list
│   └── use-omnibar/               # Specialized logic hooks
│       ├── index.ts               # Mode orchestrator
│       ├── use-search.ts          # Search/Capture logic
│       ├── use-add-mode.ts        # Dropdown logic
│       └── use-kit-mode.ts        # AI chat logic
├── mobile-nav.tsx                 # Bottom navigation for mobile
├── page-header.tsx                # Top bar of the center panel
├── toast-stack.tsx                # Physics-based toast notification stack
└── index.ts                       # Exports

src/components/settings/
└── sections/
    ├── appearance-section.tsx     # Visual style, theme, background
    ├── accent-color-picker.tsx    # Modular color selection
    ├── account-section.tsx        # User info, workspace settings
    └── data-section.tsx           # Danger zone, data deletion
```

### Key Components & Patterns

#### Modular Omnibar (`omnibar/`)
- **Mode Coordination**: Orchestrates between **Search/Quick Note**, **Add**, and **Kit AI** modes. Ensures only one mode is active to prevent UI overlap.
- **Specialized Hooks**: Decouples search logic from UI, making it easier to maintain and test. `useSearch` manages the complexity of debounced queries and result execution.
- **Context Awareness**: Omnibar detects the current page (e.g., `/tags`) to provide context-specific filtering behaviors.

#### Right Sidebar (`right-sidebar/`)
- **Flexible Expansion System**: The sidebar supports multiple width modes defined in `ui-store.ts`.
    - `default`: 325px (Filters/Card Details)
    - `settings`: 480px (Settings Panel)
    - `split-view`: 600px (Future: Markdown Preview)
    - `calendar-schedule`: 600px (Future: Drag-drop scheduling)
- **Settings Toggle**: The header features a Settings gear that:
    - Rotates and transforms into an 'X' via CSS transitions.
    - Expands the sidebar to 480px smoothly.
    - Displays browser-style tabs for Settings navigation.
- **Modular Sections**: Split into `sections/` directory to handle specific filter logic (Tags, Sort, Group, etc.), reducing the "God Component" complexity of `FilterSections.tsx`.
- **SidebarSection**: A reusable accordion component (`SidebarSection.tsx`) that enforces:
    -   Standard LTR layout (Title Left, Chevron Right).
    -   "Thread line" style: A left-border indicator for expanded content.
    -   Smooth expand/collapse animations.

---

## Current Status

### What's Working

- [x] **3-Panel Shell**: Fully implemented with pixel-perfect V2 dimensions.
- [x] **Collapsible Sidebars**: Smooth framer-motion animations for panels and internal sections.
- [x] **Visual Polish**:
    -   Unified "purple glow" hover effects.
    -   Sliding glass-morphism active states.
    -   Softer accent tints for clearer visual hierarchy.
- [x] **Right Sidebar Refactor**: Broken down into modular sections and a reusable accordion system.
- [x] **Settings Panel**: Integrated into right sidebar with animated gear/X icon toggle.
- [x] **Visual Styles**: Glass, Flat, and High Contrast themes with CSS variable system.
- [x] **Omnibar Refactor**: Decoupled mode-based architecture with specialized hooks.
- [x] **Responsive**: Mobile bottom nav activates correctly on small screens.

### What's Not Implemented

- [ ] **Keyboard Shortcuts**: Global hotkeys for toggling sidebars (Cmd+\, Cmd+/).
- [ ] **Context Menu**: Right-click on sidebar items (partial implementation).

### Recent Changes

| Date | Change | Implementation Details |
|------|--------|------------------------|
| 2025-12-30 | **Omnibar Refactor** | Split `use-omnibar.ts` into focused hooks for Search, Add, and Kit modes with a central orchestrator. |
| 2025-12-30 | **Modular Filters** | Split `FilterSections.tsx` into individual files in `right-sidebar/sections/`. |
| 2025-12-30 | **High Contrast WCAG AAA** | Full accessibility compliance for High Contrast mode: 7:1+ text ratios, 2px borders, focus indicators, link underlines, input/button styling. |
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