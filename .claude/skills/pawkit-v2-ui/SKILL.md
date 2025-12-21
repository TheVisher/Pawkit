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

## PANEL GLASS EFFECT

All panels use the same glass morphism base:

```tsx
className={cn(
  'bg-[hsl(0_0%_12%/0.70)]',
  'backdrop-blur-[12px] backdrop-saturate-[1.2]',
  'border border-white/10',
  'shadow-[0_8px_16px_hsl(0_0%_0%/0.5),0_16px_32px_hsl(0_0%_0%/0.3),0_0_0_1px_hsl(0_0%_100%/0.08)]',
  'rounded-2xl'
)}
```

---

## PAGE HEADER PATTERN

**CRITICAL: All views MUST use PageHeader to ensure the omnibar is available.**

Every page uses the `PageHeader` component with consistent structure:

```tsx
<PageHeader>
  <div className="space-y-0.5">
    {/* Date row - smaller and muted */}
    <div className="flex items-center gap-1.5 text-text-muted">
      <TimeIcon className="h-3.5 w-3.5" />
      <span className="text-xs">{formattedDate}</span>
    </div>
    {/* Title row */}
    <h1 className="text-2xl font-semibold text-text-primary">
      {greeting}, <span className="text-[var(--color-accent)]">{username}</span>
    </h1>
  </div>
</PageHeader>
```

The omnibar is centered absolutely within PageHeader.

### Why PageHeader is Required

The omnibar (with + button for adding content, search, and toast notifications) lives inside PageHeader. If a view doesn't use PageHeader, users cannot:
- Add new bookmarks/notes via the + button
- Use ⌘⇧B / ⌘⇧N shortcuts
- See toast notifications

### Required Page Structure

```tsx
export default function AnyViewPage() {
  return (
    <div className="flex-1 flex flex-col">
      <PageHeader>
        {/* Page title and subtitle */}
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>
            Page Title
          </h1>
          <p style={{ color: 'var(--text-muted)' }}>Subtitle</p>
        </div>
      </PageHeader>

      {/* Page content */}
      <div className="flex-1 p-6">
        {/* ... */}
      </div>
    </div>
  );
}
```

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
