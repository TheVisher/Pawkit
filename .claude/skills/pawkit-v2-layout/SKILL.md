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

**Last Updated**: December 28, 2025
