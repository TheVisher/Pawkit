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

Pages must use the EXACT same header structure as the original PageHeader: `pt-5 pb-4 px-6 min-h-[76px]`. This places the page title at the same vertical level as the centered omnibar:

```tsx
export default function AnyViewPage() {
  return (
    <div className="flex-1">
      {/* Header row - matches original PageHeader: pt-5 pb-4 px-6 min-h-[76px] */}
      <div className="pt-5 pb-4 px-6 min-h-[76px]">
        <h1 className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>
          Page Title
        </h1>
        <p style={{ color: 'var(--text-muted)' }}>Subtitle</p>
      </div>

      {/* Page content */}
      <div className="px-6 pb-6">
        {/* ... */}
      </div>
    </div>
  );
}
```

### DO's and DON'Ts

**DO**:
- Use `pt-5 pb-4 px-6 min-h-[76px]` for the header row (exact PageHeader values)
- Use `px-6 pb-6` for page content sections
- Keep `flex-1` on the root container

**DON'T**:
- Import or use `PageHeader` component (deprecated)
- Render `Omnibar` or `ToastStack` in individual pages
- Use `p-6` on root (splits padding incorrectly)
- Use different header padding values (breaks alignment)

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

**Last Updated**: December 20, 2025
