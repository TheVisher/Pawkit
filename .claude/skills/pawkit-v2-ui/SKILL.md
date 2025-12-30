# Pawkit V2 UI Design System

**Purpose**: Design language and patterns for Pawkit V2

**Created**: December 20, 2025

---

## DESIGN PHILOSOPHY

### Core Principles

1. **Glass Morphism** - Translucent panels with backdrop blur
2. **Purple Accent** - Interactive elements glow purple on hover/active
3. **CSS Variables** - All colors, shadows, and effects use variables for theming
4. **Line Icons Only** - Lucide React icons, no emojis

---

## TEXT HIERARCHY

**Purpose**: Consistent text color system for visual hierarchy across all views

### The Three Tiers

| Tier | Tailwind Class | CSS Variable | Color (Dark) | Use Case |
|------|----------------|--------------|--------------|----------|
| **Primary** | `text-text-primary` | `var(--color-text-primary)` | `hsl(0 0% 95%)` | Main content, headings, important text |
| **Secondary** | `text-text-secondary` | `var(--color-text-secondary)` | `hsl(0 0% 70%)` | Supporting content, descriptions |
| **Muted** | `text-text-muted` | `var(--color-text-muted)` | `hsl(240 4% 46%)` | Hints, tips, shortcuts, de-emphasized elements |

### When to Use Each Tier

**Primary** (`text-text-primary`):
- Page titles and headings
- Card titles
- Navigation labels (active)
- Modal headers
- Primary button text

**Secondary** (`text-text-secondary`):
- Card descriptions
- Metadata (dates, counts)
- Inactive navigation labels
- Supporting information

**Muted** (`text-text-muted`):
- Keyboard shortcuts (e.g., `⌘K`)
- Omnibar placeholder text
- Icon buttons (collapse, anchor, settings)
- Timestamps and dates in headers
- Helper text and hints
- De-emphasized icons
- Empty state messages
- Section headers in sidebar

### Examples

**Date in Header** (Home page):
```tsx
<div className="flex items-center gap-1.5 text-text-muted">
  <TimeIcon className="h-3.5 w-3.5" />
  <span className="text-xs">{formattedDate}</span>
</div>
```

**Omnibar Search Placeholder**:
```tsx
<span className="text-sm text-text-muted">Search Pawkit...</span>
```

**Keyboard Shortcut**:
```tsx
<kbd className="text-xs text-text-muted">⌘K</kbd>
```

**Sidebar Icon Button**:
```tsx
<Button className="text-text-muted hover:text-text-primary">
  <ArrowLeftToLine className="h-5 w-5" />
</Button>
```

**Section Header**:
```tsx
<h3 className="text-xs font-medium uppercase text-text-muted mb-2">Pawkits</h3>
```

### DO's and DON'Ts

**DO**:
- Use `text-text-muted` for ALL hints, tips, and shortcuts
- Use `text-text-muted` for icon-only buttons that aren't primary actions
- Always include hover state: `text-text-muted hover:text-text-primary`

**DON'T**:
- Use `text-gray-500` or `text-zinc-500` directly - use the variable class
- Use muted text for primary actions or important labels

---

## SURFACE HIERARCHY

### Background Layers

| Layer | Tailwind Class | CSS Variable | Use Case |
|-------|----------------|--------------|----------|
| **Base** | `bg-bg-base` | `var(--color-bg-base)` | Page background |
| **Surface 1** | `bg-bg-surface-1` | `var(--color-bg-surface-1)` | Panels, sidebars |
| **Surface 2** | `bg-bg-surface-2` | `var(--color-bg-surface-2)` | Cards, elevated elements |
| **Surface 3** | `bg-bg-surface-3` | `var(--color-bg-surface-3)` | Hover states, buttons |

### Border Colors

| Type | Tailwind Class | CSS Variable |
|------|----------------|--------------|
| **Subtle** | `border-border-subtle` | `var(--color-border-subtle)` |
| **Default** | `border-border-default` | `var(--color-border-default)` |

---

## GLASS MORPHISM CSS VARIABLES

**CRITICAL: Always use CSS variables for glass styling - NEVER hardcode values.**

All glass styling uses CSS variables defined in `src/app/globals.css`. This allows changing the look and feel of the entire app by modifying a few values.

### Glass Variables (defined in globals.css)

```css
/* Glass backgrounds - layered opacity for depth */
--glass-bg: hsl(0 0% 100% / 0.10);           /* Internal elements (inputs, buttons) */
--glass-bg-hover: hsl(0 0% 100% / 0.15);     /* Hover state */
--glass-bg-active: hsl(0 0% 100% / 0.20);    /* Active/pressed state */

/* Glass panel/modal background (darker base) */
--glass-panel-bg: hsl(0 0% 12% / 0.70);      /* Panels, modals, dropdowns */

/* Glass borders */
--glass-border: hsl(0 0% 100% / 0.15);       /* Default border */
--glass-border-hover: hsl(0 0% 100% / 0.25); /* Hover state border */

/* Glass blur effect */
--glass-blur: 12px;
--glass-saturate: 1.2;

/* Glass shadow (for panels/modals) */
--glass-shadow: 0 8px 16px hsl(0 0% 0% / 0.5), 0 16px 32px hsl(0 0% 0% / 0.3);
```

### Usage in Components

**Panel/Modal Container:**
```tsx
className={cn(
  'bg-[var(--glass-panel-bg)]',
  'backdrop-blur-[var(--glass-blur)] backdrop-saturate-[var(--glass-saturate)]',
  'border border-[var(--glass-border)]',
  'shadow-[var(--glass-shadow)]',
  'rounded-2xl'
)}
```

**Internal Elements (inputs, buttons, tags):**
```tsx
className={cn(
  'bg-[var(--glass-bg)]',
  'border border-[var(--glass-border)]',
  'hover:bg-[var(--glass-bg-hover)]',
  'focus:border-[var(--glass-border-hover)]'
)}
```

**Dropdown Menu Items:**
```tsx
className="hover:bg-[var(--glass-bg)] focus:bg-[var(--glass-bg)]"
```

### DO's and DON'Ts

**DO**:
- Use `var(--glass-panel-bg)` for panels, modals, dropdowns
- Use `var(--glass-bg)` for internal elements
- Use `var(--glass-border)` for all glass borders
- Use `var(--glass-blur)` for backdrop blur values

**DON'T**:
- ❌ `bg-white/10` - Use `bg-[var(--glass-bg)]`
- ❌ `bg-white/15` - Use `bg-[var(--glass-bg-hover)]`
- ❌ `border-white/10` - Use `border-[var(--glass-border)]`
- ❌ `bg-[hsl(0_0%_12%/0.70)]` - Use `bg-[var(--glass-panel-bg)]`
- ❌ `backdrop-blur-[12px]` - Use `backdrop-blur-[var(--glass-blur)]`

### Benefits

1. **One change updates everywhere** - Modify opacity in globals.css, all components update
2. **Theme switching ready** - Can add `[data-style="solid"]` variant later
3. **Consistency enforced** - Variables ensure identical values across components
4. **Easy debugging** - View all glass values in one place

---

## GLOBAL OMNIBAR

**CRITICAL: The omnibar is globally positioned in `dashboard-shell.tsx` and NEVER rendered in individual pages.**

The omnibar (with + button for adding content, search, and toast notifications) is absolutely positioned at the top center of the CENTER PANEL (not the viewport). This ensures:
- Pixel-perfect positioning relative to content area
- Proper centering when sidebars open/close
- Consistent user experience when navigating

### Omnibar Location

The omnibar lives in `src/app/(dashboard)/dashboard-shell.tsx`, inside the main content's scroll container:

```tsx
<div className="flex-1 overflow-auto relative">
  {/* OMNIBAR - Absolute positioned at top center of content area */}
  <div className="absolute top-5 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
    <div className="pointer-events-auto">
      <Omnibar isCompact={false} />
      <ToastStack isCompact={false} />
    </div>
  </div>
  {children}
</div>
```

### Required Page Structure

All views in the center panel MUST use the `PageHeader` component for consistent header styling. This ensures:
- Consistent typography across all views (Home, Library, Calendar, Pawkits)
- Proper alignment with the centered omnibar
- Unified layout pattern

### PageHeader Component

Located at `src/components/layout/page-header.tsx`:

```tsx
import { PageHeader } from '@/components/layout/page-header';

// Basic usage
<PageHeader title="Library" subtitle="12 items" />

// With actions (buttons, toggles)
<PageHeader
  title="Calendar"
  subtitle="December 2024"
  actions={<ViewModeToggles />}
/>

// With React nodes for rich content
<PageHeader
  title={<>Hello, <span className="text-accent">User</span></>}
  subtitle={<Breadcrumbs />}
/>
```

### Props

| Prop | Type | Description |
|------|------|-------------|
| `title` | `React.ReactNode` | Main heading text (text-2xl font-semibold text-text-primary) |
| `subtitle` | `React.ReactNode` | Optional line above title (text-xs text-text-muted) |
| `actions` | `React.ReactNode` | Optional right-aligned action buttons |
| `className` | `string` | Additional container classes |

### Styling Spec

- Container: `pt-5 pb-4 px-6 min-h-[76px]`
- Subtitle: `text-xs text-text-muted`
- Title: `text-2xl font-semibold text-text-primary`

### View Examples

**Home** - Greeting with time-based icon:
```tsx
<PageHeader
  title={<>{message}, <span className="text-accent">{name}</span></>}
  subtitle={<><TimeIcon /> {date}</>}
/>
```

**Library** - Simple title with count:
```tsx
<PageHeader title="Library" subtitle="24 items" />
```

**Calendar** - Title with navigation and view mode actions:
```tsx
<PageHeader
  title="Calendar"
  subtitle="December 2024"
  actions={<><NavButtons /><ViewToggles /></>}
/>
```

**Pawkit** - Collection name with "Pawkits" label (not Library):
```tsx
// Root pawkit - just "Pawkits" as subtitle
<PageHeader
  title={collection.name}
  subtitle="Pawkits"
  actions={<OptionsDropdown />}
/>

// Nested pawkit - "Pawkits > Parent" breadcrumb
<PageHeader
  title={collection.name}
  subtitle={<>Pawkits <ChevronRight /> Parent Name</>}
  actions={<OptionsDropdown />}
/>
```

### DO's and DON'Ts

**DO**:
- ALWAYS use `PageHeader` for center panel view headers
- Use `px-6 pb-6` for page content sections below the header
- Keep `flex-1` on the root container

**DON'T**:
- Build custom headers with inline padding (use PageHeader instead)
- Render `Omnibar` or `ToastStack` in individual pages
- Use different header padding values (breaks alignment)
- Add background colors to the header (inherits glass panel)

---

## GREETING SYSTEM

Home page uses time-based greetings with 30-minute rotation:

**Time Icons**:
- Morning (5am-12pm): Coffee
- Afternoon (12pm-5pm): Sun
- Evening (5pm-9pm): Sunset
- Night (9pm-5am): Moon

**Messages**: Initial greeting is time-based ("Good morning"), then rotates through random app-related messages every 30 minutes.

---

## ACCENT COLOR

The accent color uses CSS variables for theming:

```css
--hue-accent: 270;
--sat-accent: 60%;
--color-accent: hsl(var(--hue-accent) var(--sat-accent) 55%);
--color-accent-hover: hsl(var(--hue-accent) var(--sat-accent) 65%);
```

Usage: `text-[var(--color-accent)]` or `bg-[var(--color-accent)]`

---

## CARD STYLING

Cards use glass morphism with accent-colored hover effects. All styling is driven by CSS variables for theming.

### Card CSS Variables

```css
/* Card glow effect - uses accent hue */
--card-glow: 0 0 24px hsl(var(--hue-accent) var(--sat-accent) 50% / 0.35),
             0 0 48px hsl(var(--hue-accent) var(--sat-accent) 50% / 0.2);
--card-glow-border: hsl(var(--hue-accent) var(--sat-accent) 60% / 0.6);

/* Layered shadows for depth */
--card-shadow: 0 2px 4px rgba(0, 0, 0, 0.15),
               0 4px 12px rgba(0, 0, 0, 0.2),
               0 8px 24px rgba(0, 0, 0, 0.15);
```

### Card Structure

1. **Container**: `rounded-2xl overflow-hidden` with layered shadow
2. **Content area**: Glass blur effect with `--glass-panel-bg` background
3. **Domain/URL**: Pill-shaped (`rounded-full`) with glass background
4. **Tags**: Pill-shaped with glass background
5. **Hover**: Purple glow + accent border using CSS variables

### Hover Effects

```tsx
{/* Hover glow overlay */}
<div
  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
  style={{ boxShadow: 'var(--card-glow)' }}
/>

{/* Hover border */}
<div
  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
  style={{ border: '1px solid var(--card-glow-border)' }}
/>
```

### DO's and DON'Ts

**DO**:
- Use `var(--card-glow)` for hover glow effects
- Use `var(--card-glow-border)` for hover borders
- Use `rounded-full` for pill-shaped elements (domain, tags)
- Use `var(--glass-bg)` for internal glass elements

**DON'T**:
- Hardcode accent colors - use CSS variables
- Use sharp corners for tags/domains - always pill-shaped
- Skip the hover glow effect

---

## PAGE LAYOUT CONSISTENCY

**CRITICAL: All views must maintain consistent padding for visual alignment.**

### Standard Page Structure

Every view in the center panel follows this pattern:

```tsx
// Page wrapper (in dashboard/[view]/page.tsx)
<div className="h-full flex flex-col overflow-hidden">
  <PageHeader title="View Name" />

  {/* Content wrapper - ALWAYS has p-6 */}
  <div className="flex-1 overflow-auto p-6">
    {/* View content */}
  </div>
</div>
```

### Padding Rules

| Element | Padding | Purpose |
|---------|---------|---------|
| **PageHeader** | `px-6 pt-5 pb-4` | Built into component |
| **Content wrapper** | `p-6` | **Required on all views** |
| **Grid/card containers** | None | Let content use full padded area |

### Calendar-Specific Layout

The calendar month view uses **floating cards with spacing** for visual depth:

```tsx
{/* Month view container - NO background */}
<div className="grid grid-cols-7 auto-rows-fr gap-2" style={{ height: 'calc(100% - 2.5rem)' }}>
  {/* Day cells float independently */}
  <DayCell className="bg-bg-surface-1 rounded-lg border shadow-sm" />
</div>
```

**Key points:**
- `gap-2` creates 8px spacing between cells
- `auto-rows-fr` makes all rows equal height and fills vertical space
- **NO background color** - cells float independently
- Each cell has:
  - `bg-bg-surface-1` background
  - `rounded-lg` for card appearance
  - `border border-border-subtle/50` for subtle edge definition
  - `shadow-sm` for depth, `hover:shadow-md` for interactivity
- Selected day shows purple ring on **day number only** (not whole cell)

### Week/Day Time Grid Layout

Time-based views use similar gap approach:

```tsx
<div className="grid grid-cols-[60px_repeat(7,1fr)] gap-px bg-border-subtle/30">
  {/* Hour label column */}
  <div className="bg-bg-surface-1" />

  {/* Day columns */}
  <div className="bg-bg-surface-1 hover:bg-bg-surface-2" />
</div>
```

### DO's and DON'Ts

**DO**:
- Always add `p-6` to the content wrapper (not individual components)
- Use `gap-2` for visible spacing between calendar cells
- Use `flex-1` on grids to fill available height
- Use `grid-rows-6` for month view to prevent empty space
- Add `rounded-lg` to individual cells for card appearance

**DON'T**:
- Add padding to child components (let wrapper handle it)
- Add background colors to grid containers (cells should float)
- Hardcode heights (use flex-1 and grid-rows)
- Remove `p-6` from content wrapper

### Examples

**Library View** (correct):
```tsx
<div className="flex-1 overflow-auto p-6">  {/* ✅ p-6 here */}
  <MasonryGrid />  {/* ✅ No padding here */}
</div>
```

**Calendar View** (correct):
```tsx
<div className="flex-1 overflow-auto p-6">  {/* ✅ p-6 here */}
  <MonthView />  {/* ✅ No padding here */}
</div>
```

**Agenda View** (correct):
```tsx
<div className="flex-1 overflow-auto p-6">  {/* ✅ p-6 here */}
  <div className="max-w-3xl mx-auto">  {/* ✅ No padding here */}
    {/* Content */}
  </div>
</div>
```

---

## TAILWIND CONFIGURATION

These classes are registered in `app/globals.css` via `@theme inline`:

```css
@theme inline {
  /* Pawkit text hierarchy */
  --color-text-primary: var(--color-text-primary);
  --color-text-secondary: var(--color-text-secondary);
  --color-text-muted: var(--color-text-muted);
  /* Pawkit surface backgrounds */
  --color-bg-base: var(--color-bg-base);
  --color-bg-surface-1: var(--color-bg-surface-1);
  --color-bg-surface-2: var(--color-bg-surface-2);
  --color-bg-surface-3: var(--color-bg-surface-3);
  /* Pawkit borders */
  --color-border-subtle: var(--color-border-subtle);
  --color-border-default: var(--color-border-default);
}
```

---

---

## VISUAL STYLES SYSTEM

**Purpose**: Support multiple visual aesthetics beyond glass morphism for accessibility and user preference.

### Available Visual Styles

| Style | Class Applied | Description |
|-------|---------------|-------------|
| **Glass** | (default) | Glass morphism with blur, translucent panels, soft glow shadows |
| **Flat** | `visual-style-flat` | Solid colors, no blur, clean minimal aesthetic |
| **High Contrast** | `visual-style-high-contrast` | WCAG AAA compliant, pure black/white, bold borders |

### How Visual Styles Work

Visual styles override CSS variables at the `html` element level. The base theme (dark/light) provides defaults, and visual style classes override specific properties.

**Selector specificity pattern** (Tailwind v4):
```css
/* Must include 'html' for proper specificity */
html.visual-style-flat.dark {
    --glass-blur: 0px;
    /* ... other overrides */
}
```

**Why `html.` prefix is required**: In Tailwind v4, class selectors like `.visual-style-flat.dark` may not win specificity against `:root` and `.dark` base definitions. Adding `html` increases specificity without resorting to `!important`.

### Settings Store Integration

**File**: `src/lib/stores/settings-store.ts`

```typescript
export type VisualStyle = 'glass' | 'flat' | 'highContrast';

// State
visualStyle: VisualStyle;  // default: 'glass'

// Action
setVisualStyle: (style: VisualStyle) => void;
```

### Applying Visual Styles at Runtime

The `useApplySettings()` hook (called in app root) handles:

1. **Class application** - Adds/removes `visual-style-*` classes on `document.documentElement`
2. **Gradient bypass** - High contrast mode sets `--bg-gradient-image: none` via JavaScript to override any preset gradients

```typescript
useEffect(() => {
  document.documentElement.classList.remove('visual-style-flat', 'visual-style-high-contrast');
  if (visualStyle === 'flat') {
    document.documentElement.classList.add('visual-style-flat');
  } else if (visualStyle === 'highContrast') {
    document.documentElement.classList.add('visual-style-high-contrast');
  }
}, [visualStyle]);

useEffect(() => {
  // Skip gradient for high contrast - set pure background
  if (visualStyle === 'highContrast') {
    const isDark = document.documentElement.classList.contains('dark');
    document.documentElement.style.setProperty('--bg-gradient-base', isDark ? '#000000' : '#ffffff');
    document.documentElement.style.setProperty('--bg-gradient-image', 'none');
    return;
  }
  // ... normal gradient application
}, [backgroundPreset, visualStyle]);
```

### High Contrast Specifics

High contrast uses `!important` on all CSS variable overrides because:
1. JavaScript in `useApplySettings` sets some variables dynamically
2. Ensures accessibility overrides always win regardless of load order

**Key high contrast characteristics:**
- Pure black (`#000`) or pure white (`#fff`) backgrounds
- Visible white/black borders (not subtle transparency)
- No blur effects (`--glass-blur: 0px`)
- No soft shadows (replaced with solid 2px outlines)
- Increased accent saturation for visibility

### Adding New Visual Styles

1. Add to `VisualStyle` type in `settings-store.ts`
2. Add CSS overrides in `globals.css` using `html.visual-style-{name}.dark` and `.light` selectors
3. Add UI button in `appearance-section.tsx`
4. Update `useApplySettings()` to handle the new class

### CSS Variables Affected by Visual Styles

| Variable | Glass | Flat | High Contrast |
|----------|-------|------|---------------|
| `--glass-blur` | 12px | 0px | 0px |
| `--glass-bg` | hsl(0 0% 100% / 0.1) | hsl(0 0% 18%) | hsl(0 0% 12%) |
| `--glass-border` | hsl(0 0% 100% / 0.15) | hsl(0 0% 22%) | hsl(0 0% 100%) |
| `--glass-shadow` | Multi-layer soft | Single simpler | Solid 2px outline |
| `--bg-gradient-image` | Radial gradients | Radial gradients | none |

---

**Last Updated**: December 30, 2025
