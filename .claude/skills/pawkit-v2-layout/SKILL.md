# Pawkit V2 Layout System

**Purpose**: 3-panel system, icon conventions, responsive breakpoints, anchor behavior

**Created**: December 20, 2025

---

## 3-PANEL LAYOUT

```
FLOATING (unanchored):
┌─────┐   ┌───────────────────┐   ┌─────┐
│  L  │   │      CENTER       │   │  R  │
└─────┘   └───────────────────┘   └─────┘
     16px gaps between panels

ANCHORED (merged):
┌─────────────────────────────────────────┐
│   L   │        CENTER         │    R    │
└─────────────────────────────────────────┘
          One unified panel
```

### Anchor Behavior

| State | Visual Effect |
|-------|---------------|
| **Floating** | All panels have gaps and full border-radius |
| **Left Anchored** | Left panel merges with center (no gap, shared edge) |
| **Right Anchored** | Right panel merges with center |
| **Both Anchored** | Single unified panel with outer-edge rounding only |

### Panel Specifications

- **Gap size**: 16px (when floating)
- **Border radius**: `rounded-2xl` (16px)
- **Left sidebar width**: 280px (desktop), collapsed on mobile
- **Right sidebar width**: 320px (desktop), collapsed on mobile

---

## ICON SYSTEM

### Size Conventions

| Location | Size | Tailwind Class |
|----------|------|----------------|
| Main Navigation | 24px | `h-6 w-6` |
| Header Actions | 20px | `h-5 w-5` |
| List Item Icons | 16px | `h-4 w-4` |
| Inline/Small | 14px | `h-3.5 w-3.5` |

### Icon Mapping

| Action | Icon | From |
|--------|------|------|
| Anchor Panel | `Maximize2` | lucide-react |
| Float Panel | `Minimize2` | lucide-react |
| Close Sidebar (Left) | `ArrowLeftToLine` | lucide-react |
| Open Sidebar (Left) | `ArrowRightFromLine` | lucide-react |
| Close Sidebar (Right) | `ArrowRightToLine` | lucide-react |
| Open Sidebar (Right) | `ArrowLeftFromLine` | lucide-react |

### Stroke Weight
- **Default**: 2px (lucide-react default)
- **Consistent across all icons**

---

## LEFT SIDEBAR STRUCTURE

```
┌─────────────────────────────┐
│ [Avatar]          [↗] [✕]  │  ← User avatar flyout, anchor, close
└─────────────────────────────┘

Home
Library
Calendar
Rediscover (10)

PAWKITS ─────────────────── [▼]
├── Apps →
├── Arc Raiders
├── Computer Stuff
│   └── [nested children]
└── + New Pawkit

CONNECTIONS ────────────────[▼]
├── Filen
├── MCP
└── + Connect service
```

### User Avatar Flyout

```
┌─────────────────────────────┐
│ Erik                        │
│ erik@email.com              │
├─────────────────────────────┤
│ WORKSPACES                  │
│ ● Personal            ✓    │
│ ○ Work                      │
│ + Create workspace          │
├─────────────────────────────┤
│ Account settings            │
│ Sign out                    │
└─────────────────────────────┘
```

---

## RIGHT SIDEBAR STRUCTURE

### Header (Constant)
```
[✕] [↗] [Theme] [Trash] [Settings]
close, anchor, theme toggle, trash, settings
```

### Library View Controls
```
CONTENT TYPE ──────────────[▼]
├── Bookmarks
├── Notes
├── Video
├── Images
├── Docs
└── Other

TAGS ──────────────────────[▼]
├── #products (19)
├── #restaurants (9)
└── +20 more

SORT ──────────────────────[▼]
├── Recently Modified
├── Date Added ✓
├── Title A-Z
└── Domain

VIEW ──────────────────────[▼]
[Grid/List/Masonry dropdown]

DISPLAY ───────────────────[▼]
[Card size slider, toggles]
```

---

## RESPONSIVE BREAKPOINTS

| Breakpoint | Width | Layout |
|------------|-------|--------|
| Mobile | < 768px | Single panel, bottom nav |
| Tablet | 768px - 1024px | Optional sidebars |
| Desktop | > 1024px | Full 3-panel |

### Mobile Layout
- Single panel view (no sidebars visible by default)
- Bottom tab navigation for main sections
- Swipe gestures for sidebars
- Full-width content area

---

## OMNIBAR (Top Center)

```
┌──────────────────────────────────────────────────────┐
│ [+] [ Search Pawkit...                    ] [⌘K] [?] │
└──────────────────────────────────────────────────────┘
```

### + Menu Options
```
┌─────────────────────────┐
│ Add Bookmark       ⌘B   │
│ New Note           ⌘N   │
│ Quick Note              │
│ Upload File             │
│ New Event               │
│ New Task           ⌘T   │
└─────────────────────────┘
```

### Omnibar Collision Detection

The omnibar is 400px wide and centered in the content area. On narrower viewports, it can overlap with page headers (titles like "Good morning, Username"). Use the `useOmnibarCollision` hook to automatically detect when collision would occur and add padding to push the header below the omnibar.

**Hook Location**: `src/lib/hooks/use-omnibar-collision.ts`

**Usage Pattern** (without header actions):
```tsx
import { useRef } from 'react';
import { useOmnibarCollision } from '@/lib/hooks/use-omnibar-collision';
import { cn } from '@/lib/utils';

function MyPage() {
  const headerRef = useRef<HTMLDivElement>(null);
  const needsOffset = useOmnibarCollision(headerRef, [/* optional deps */]);

  return (
    <div className={cn(
      'transition-[padding] duration-200',
      needsOffset && 'md:pt-20'  // 80px padding when collision detected
    )}>
      {/* IMPORTANT: w-fit makes the container only as wide as content */}
      <div ref={headerRef} className="w-fit">
        <PageHeader title="My Page" subtitle="..." />
      </div>
    </div>
  );
}
```

**Usage Pattern** (with header actions that should stay right-aligned):
```tsx
// When you have actions (buttons, dropdowns) that need to stay on the right,
// DON'T wrap PageHeader - build a custom header layout instead:

function MyPageWithActions() {
  const headerRef = useRef<HTMLDivElement>(null);
  const needsOffset = useOmnibarCollision(headerRef);

  return (
    <div className={cn('transition-[padding] duration-200', needsOffset && 'md:pt-20')}>
      {/* Custom header: title measured for collision, actions stay right */}
      <div className="pt-5 pb-4 px-4 md:px-6 min-h-[76px]">
        <div className="flex items-start justify-between gap-4">
          {/* Title area - ONLY this gets measured for collision */}
          <div ref={headerRef} className="w-fit space-y-0.5">
            <div className="text-xs text-text-muted">{subtitle}</div>
            <h1 className="text-2xl font-semibold text-text-primary">Page Title</h1>
          </div>
          {/* Actions - always on the right */}
          <div className="flex items-center gap-2 shrink-0">
            {actions}
          </div>
        </div>
      </div>
    </div>
  );
}
```

**Key Requirements**:
1. The `ref` element MUST have `w-fit` class so it only spans the actual content width
2. Without `w-fit`, the container is full-width and collision is always detected
3. The hook checks if header's right edge extends into the omnibar zone (center ± 220px)
4. Only applies on desktop (md breakpoint, 768px+)
5. **For pages with header actions**: Don't wrap PageHeader in `w-fit`. Instead, build custom header layout so actions stay right-aligned

**Pages Using This Pattern**:
- Home (`src/app/(dashboard)/home/page.tsx`)
- Library (`src/app/(dashboard)/library/page.tsx`)
- Pawkits (`src/app/(dashboard)/pawkits/page.tsx`)
- Tags (`src/app/(dashboard)/tags/page.tsx`)
- Calendar (`src/components/calendar/calendar-header.tsx`)
- Pawkit Detail (`src/components/pawkits/pawkit-header.tsx`)

---

## PAGE CONTENT AREA PADDING

All dashboard pages must use consistent padding for the main content area below the header:

```tsx
<div className="px-4 md:px-6 pt-4 pb-6">
  {/* Page content here */}
</div>
```

| Property | Value | Purpose |
|----------|-------|---------|
| `px-4 md:px-6` | 16px mobile, 24px desktop | Horizontal padding |
| `pt-4` | 16px | Top padding (space below header/omnibar) |
| `pb-6` | 24px | Bottom padding |

**Why `pt-4` is required**: Creates consistent spacing between the omnibar/header area and the page content across all views. Without it, content sits too close to the omnibar.

---

## CSS VARIABLES FOR LAYOUT

```css
:root {
  --sidebar-left-width: 280px;
  --sidebar-right-width: 320px;
  --panel-gap: 16px;
  --panel-radius: 16px;

  /* When anchored */
  --panel-gap-anchored: 0px;
}

[data-left-anchored="true"] {
  --left-gap: 0;
  --left-border-radius-right: 0;
}

[data-right-anchored="true"] {
  --right-gap: 0;
  --right-border-radius-left: 0;
}
```

---

## COLLAPSED STATE BEHAVIOR

### Left Sidebar Collapsed
- Sidebar fully hidden
- Center panel expands to fill space
- Hover on left edge OR keyboard shortcut to reopen
- Edge indicator visible (subtle line)

### Right Sidebar Collapsed
- Sidebar fully hidden
- Center panel expands to fill space
- Hover on right edge OR keyboard shortcut to reopen
- Edge indicator visible (subtle line)

---

## LAYOUT STATE MANAGEMENT

```typescript
// lib/stores/ui-store.ts
interface LayoutState {
  leftSidebarCollapsed: boolean;
  rightSidebarCollapsed: boolean;
  leftSidebarAnchored: boolean;
  rightSidebarAnchored: boolean;
}

// Device-local (not synced) - stored in localStorage
// Key: "pawkit_device_preferences"
```

---

## PANEL GLASS EFFECT

All panels use the same glass morphism base (see pawkit-v2-ui skill):

```tsx
className={cn(
  'bg-[hsl(0_0%_12%/0.70)]',
  'backdrop-blur-[12px] backdrop-saturate-[1.2]',
  'border border-white/10',
  'shadow-[0_8px_16px_hsl(0_0%_0%/0.5),...]',
  'rounded-2xl'
)}
```

---

## VIEW LAYOUTS

| View | Purpose | Layouts Available |
|------|---------|-------------------|
| **Home** | Dashboard with widgets | Fixed layout |
| **Library** | All content (filterable) | Grid, List, Masonry, Timeline |
| **Calendar** | Time-based view | Month, Week |
| **Pawkit** | Collection contents | Grid, List, Masonry, Board |
| **Rediscover** | Tinder-style review | Card stack |

---

---

## SIDEBAR STYLING PATTERNS

### Navigation Item Styling (Left Sidebar & Pawkit Tree)

**Active State:**
```tsx
// Uses Framer Motion for animated sliding highlight
<motion.div
  layoutId="active-sidebar-item"
  className="absolute inset-0 rounded-xl bg-black/5 dark:bg-white/5 backdrop-blur-md border border-black/5 dark:border-white/10 shadow-[0_6px_16px_-4px_rgba(0,0,0,0.6)]"
  initial={false}
  transition={{ type: "spring", stiffness: 500, damping: 30 }}
/>
// Text: text-text-primary font-medium
// Icon: text-[var(--color-accent)]
```

**Inactive State:**
```tsx
// No background (transparent)
className="text-text-secondary hover:text-text-primary"
// Icon: group-hover:text-[var(--color-accent)]/80
```

**Hover Glow Line (applied when inactive):**
```tsx
<div className="absolute -bottom-1 -left-2 -right-2 h-[2px] bg-gradient-to-r from-transparent via-[var(--color-accent)] via-50% to-transparent opacity-0 transition-all duration-300 group-hover:opacity-100 blur-[0.5px]" />
```

---

### Filter Button Styling (Right Sidebar)

**Single-Select Sections** (Sort, Group By, Reading Status, Quick Filter, Link Status):
- Minimal inactive state - no background, reduces visual noise
```tsx
// Active:
"bg-[var(--color-accent)]/10 text-[var(--color-accent)] border border-[var(--color-accent)]/20 shadow-sm font-medium"

// Inactive:
"text-text-secondary hover:bg-bg-surface-2 hover:text-text-primary"
```

**Multi-Select Sections** (Content Type, Tags):
- Pill-style buttons - has background to indicate they're toggleable
```tsx
// Active: (same as single-select)
"bg-[var(--color-accent)]/10 text-[var(--color-accent)] border border-[var(--color-accent)]/20 shadow-sm font-medium"

// Inactive:
"bg-bg-surface-2 border border-transparent text-text-secondary hover:bg-bg-surface-3 hover:text-text-primary"
```

---

### Collapsible Section Pattern (SidebarSection)

**File:** `src/components/layout/right-sidebar/SidebarSection.tsx`

```tsx
// Header styling
className="flex items-center justify-between px-3 py-2 cursor-pointer transition-colors group relative rounded-xl select-none"

// Chevron rotation
className={cn("h-4 w-4 text-text-muted transition-transform duration-200", isOpen && "rotate-90")}

// Expanded content border
className="pb-2 pt-1 px-3 border-l-2 border-[var(--color-accent)]/30 ml-4 pl-3"

// Animation (Framer Motion)
initial={{ height: 0, opacity: 0 }}
animate={{ height: "auto", opacity: 1 }}
exit={{ height: 0, opacity: 0 }}
transition={{ duration: 0.2, ease: "easeInOut" }}
```

---

### Toggle Switch Styling

**File:** `src/components/layout/right-sidebar/CardDisplaySettings.tsx`

```tsx
// Track
className={cn(
  "relative w-9 h-5 rounded-full transition-all duration-200 flex items-center",
  checked
    ? "bg-[var(--color-accent)]/20 border border-[var(--color-accent)]/30"
    : "bg-bg-surface-3 border border-transparent"
)}

// Thumb
className={cn(
  "absolute left-0.5 w-4 h-4 rounded-full transition-all duration-200 shadow-sm",
  checked ? "translate-x-4 bg-white" : "bg-text-muted"
)}
```

---

### Card Size Icons

Use icons instead of text for card size buttons:

| Size | Icon | Import |
|------|------|--------|
| Small | `Grid3x3` | lucide-react |
| Medium | `Grid2x2` | lucide-react |
| Large | `Square` | lucide-react |
| XL | `Maximize` | lucide-react |

---

### "All" Option Icons

Use `LayoutGrid` (lucide-react) for "All" options in filter sections instead of `Circle` to avoid confusion with "Unread" status.

---

### Transition Timing

| Element | Duration | Easing |
|---------|----------|--------|
| Button states | 200ms | ease (transition-all) |
| Hover glow line | 300ms | linear (opacity only) |
| Collapsible sections | 200ms | ease-in-out |
| Nav highlight slide | spring | stiffness: 500, damping: 30 |

---

---

## SETTINGS PANEL IN RIGHT SIDEBAR

### Overview

Settings is accessed via a gear icon in the right sidebar header. When clicked, the sidebar content switches to a settings panel with tabbed sections.

### Settings Mode Toggle

**Location**: Right sidebar header, after theme toggle button

**Icon Transition** (gear ↔ X):
```tsx
<Button onClick={toggleSettings}>
  {/* Gear - visible when NOT in settings */}
  <Settings className={cn(
    "absolute transition-all duration-200",
    isSettingsMode
      ? "opacity-0 rotate-90 scale-75"
      : "opacity-100 rotate-0 scale-100"
  )} />
  {/* X - visible when IN settings */}
  <X className={cn(
    "absolute transition-all duration-200",
    isSettingsMode
      ? "opacity-100 rotate-0 scale-100"
      : "opacity-0 -rotate-90 scale-75"
  )} />
</Button>
```

### Settings State Management

**File**: `src/lib/stores/ui-store.ts`

```typescript
// Right sidebar settings state
interface RightSidebarSettingsState {
  isSettingsMode: boolean;
  settingsTab: 'appearance' | 'account' | 'data' | null;
  toggleSettings: () => void;
  setTab: (tab: 'appearance' | 'account' | 'data') => void;
}

// Hook
export const useRightSidebarSettings = () => useUIStore(
  useShallow((s) => ({
    isSettingsMode: s.rightSidebarSettingsMode,
    settingsTab: s.rightSidebarSettingsTab,
    toggleSettings: s.toggleRightSidebarSettings,
    setTab: s.setRightSidebarSettingsTab,
  }))
);
```

### Settings Panel Structure

**File**: `src/components/layout/right-sidebar/SettingsPanel.tsx`

```tsx
<div className="flex flex-col h-full -mx-4">
  {/* Floating pill tabs */}
  <div className="flex gap-1.5 px-3 pt-3">
    {/* Appearance | Account | Data tabs */}
  </div>

  {/* Content area */}
  <div className="flex-1 overflow-y-auto px-4 py-4">
    {activeTab === "appearance" && <AppearanceSection />}
    {activeTab === "account" && <AccountSection />}
    {activeTab === "data" && <DataSection />}
  </div>
</div>
```

### Settings Tab Styling

**Active Tab**:
```tsx
className="text-text-primary bg-black/5 dark:bg-white/5 backdrop-blur-md border border-black/5 dark:border-white/10 shadow-[0_6px_16px_-4px_rgba(0,0,0,0.6)] rounded-xl"
// Icon: text-[var(--color-accent)]
```

**Inactive Tab**:
```tsx
className="text-text-muted hover:text-text-secondary hover:bg-black/5 dark:hover:bg-white/5 rounded-xl"
```

### Settings Sections

| Tab | Component | Location | Features |
|-----|-----------|----------|----------|
| **Appearance** | `AppearanceSection` | `src/components/settings/sections/appearance-section.tsx` | Visual style, theme, accent color, background |
| **Account** | `AccountSection` | `src/components/settings/sections/account-section.tsx` | User info, workspace settings |
| **Data** | `DataSection` | `src/components/settings/sections/data-section.tsx` | Danger zone, data deletion |

### Appearance Settings (Detail)

The Appearance section provides:

1. **Visual Style** - Glass / Flat / High Contrast
2. **Theme** - Light / Dark / System
3. **Accent Color** - Preset hues + custom HSL picker
4. **Background** - Gradient presets (Purple Glow, Minimal, Blue Glow, etc.)

See `pawkit-v2-ui` skill for Visual Styles System documentation.

### Render Priority

In `RightSidebar`, settings mode takes priority over all other content:

```tsx
{/* Settings Panel - takes priority when active */}
{isSettingsMode && <SettingsPanel />}

{/* Card Details Panel */}
{!isSettingsMode && displayMode === "card-details" && <CardDetailsPanel />}

{/* Filters Panel */}
{!isSettingsMode && displayMode === "filters" && <FilterContent />}
```

---

**Last Updated**: December 30, 2025
