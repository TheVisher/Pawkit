# Pawkit Component Registry

> **⚠️ CRITICAL**: This is the authoritative reference for UI components.
> Read this BEFORE creating any new UI elements.
> **Last Updated**: December 10, 2025

---

## The Golden Rule: CSS Variables = Theme-Aware

**ALL components must use CSS variables** (not hardcoded colors). This is how themes work:

```tsx
// ✅ CORRECT - Adapts to Modern/Glass/Light/Dark automatically
style={{ background: 'var(--bg-surface-2)' }}

// ❌ WRONG - Only works in one theme
className="bg-white/5 backdrop-blur-md"
```

When Glass mode is enabled, CSS variables automatically become semi-transparent:
- `--bg-surface-2: hsl(0 0% 14%)` → becomes `hsl(0 0% 18% / 0.75)`
- No component code changes needed!

---

## Theme Combinations

Components must work with ALL of these:

| Mode | Attribute | Effect |
|------|-----------|--------|
| **Modern** | (default) | Solid surfaces, dark shadows |
| **Glass** | `data-ui-style="glass"` | Transparent surfaces + backdrop blur |
| **Light** | `data-theme="light"` | Light backgrounds, dark text |
| **Purple Tint** | `data-surface-tint="purple"` | Purple-tinted surfaces |
| **Combined** | Glass + Purple + Light | All combinations work |

---

## Core CSS Variables

### Surfaces (Background)
```css
var(--bg-base)       /* Deepest - page background */
var(--bg-surface-1)  /* Inset/recessed areas */
var(--bg-surface-2)  /* Cards, containers, panels */
var(--bg-surface-3)  /* Raised elements, hover states */
var(--bg-surface-4)  /* Most raised, active states */
```

### Shadows (Elevation)
```css
var(--shadow-1)      /* Subtle - buttons, small elements */
var(--shadow-2)      /* Medium - cards, panels */
var(--shadow-3)      /* Strong - modals, dropdowns */
var(--shadow-4)      /* Maximum - tooltips, popovers */

var(--raised-shadow)    /* Neumorphic raised effect */
var(--raised-shadow-sm) /* Smaller raised effect */
var(--inset-shadow)     /* Neumorphic inset/recessed effect */
var(--slider-inset)     /* Specifically for slider tracks */
```

### Borders (Edge Highlights)
```css
var(--border-subtle)        /* Default borders */
var(--border-default)       /* Slightly stronger */
var(--border-strong)        /* Emphasis borders */
var(--border-highlight-top) /* Light edge on top (depth illusion) */
var(--border-highlight-left)/* Light edge on left (depth illusion) */
var(--raised-border-top)    /* Highlight for raised elements */
var(--inset-border)         /* Border for inset elements */
var(--inset-border-bottom)  /* Subtle highlight on inset bottom */
```

### Text
```css
var(--text-primary)   /* Main text */
var(--text-secondary) /* Secondary text */
var(--text-muted)     /* Disabled/hint text */
```

### Accent
```css
var(--ds-accent)        /* Primary accent color */
var(--ds-accent-hover)  /* Accent on hover */
var(--ds-accent-subtle) /* Subtle accent background */
```

### Glow Effects
```css
var(--glow-hover)  /* Purple glow on hover */
var(--glow-focus)  /* Focus ring */
var(--glow-active) /* Active/pressed glow */
```

---

## Pattern 1: Raised Container (Elevated Section)

Use for: Sidebar sections, control panels, cards

```tsx
<div
  className="rounded-xl p-4"
  style={{
    background: 'var(--bg-surface-2)',
    boxShadow: 'var(--shadow-2)',
    border: '1px solid var(--border-subtle)',
    borderTopColor: 'var(--border-highlight-top)',
    borderLeftColor: 'var(--border-highlight-left)',
  }}
>
  {/* Content */}
</div>
```

**Visual effect**: Appears raised from the page with subtle light edges on top/left.

---

## Pattern 2: Inset Container (Recessed Area)

Use for: Input containers, slider tracks, filter areas

```tsx
<div
  className="rounded-xl p-4"
  style={{
    background: 'var(--bg-surface-1)',
    boxShadow: 'var(--inset-shadow)',
    border: 'var(--inset-border)',
    borderBottomColor: 'var(--inset-border-bottom)',
    borderRightColor: 'var(--inset-border-right)',
  }}
>
  {/* Content */}
</div>
```

**Visual effect**: Appears pressed into the surface, like a well.

---

## Pattern 3: Raised Button (Toggle/Filter Button)

Use for: Filter toggles, view options, segmented controls

```tsx
<button
  className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-xs font-medium transition-all"
  style={isSelected ? {
    background: 'linear-gradient(to bottom, var(--bg-surface-3) 0%, var(--bg-surface-2) 100%)',
    boxShadow: 'var(--raised-shadow)',
    border: '1px solid transparent',
    borderTopColor: 'var(--raised-border-top)',
    color: 'var(--text-primary)',
  } : {
    background: 'transparent',
    color: 'var(--text-muted)',
  }}
>
  <Icon size={14} />
  <span>Label</span>
</button>
```

**Visual effect**: Selected state appears physically raised with gradient + shadow.

---

## Pattern 4: Tag/Chip (Selectable Pill)

Use for: Tag filters, category chips

```tsx
<button
  className="rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all duration-200"
  style={isSelected ? {
    background: 'linear-gradient(to bottom, var(--bg-surface-3) 0%, var(--bg-surface-2) 100%)',
    boxShadow: 'var(--raised-shadow-sm), 0 0 12px var(--ds-accent-subtle)',
    border: '1px solid var(--ds-accent)',
    borderTopColor: 'var(--raised-border-top)',
    color: 'var(--ds-accent)',
  } : {
    background: 'var(--bg-surface-1)',
    boxShadow: 'var(--inset-shadow-sm)',
    border: 'var(--inset-border)',
    borderBottomColor: 'var(--inset-border-bottom)',
    color: 'var(--text-secondary)',
  }}
  onMouseEnter={(e) => {
    if (!isSelected) {
      e.currentTarget.style.borderColor = 'var(--ds-accent)';
      e.currentTarget.style.boxShadow = 'var(--inset-shadow-sm), 0 0 8px var(--ds-accent-subtle)';
    }
  }}
  onMouseLeave={(e) => {
    if (!isSelected) {
      e.currentTarget.style.borderColor = '';
      e.currentTarget.style.boxShadow = 'var(--inset-shadow-sm)';
    }
  }}
>
  #{tagName}
  <span style={{ color: 'var(--text-muted)', marginLeft: '4px' }}>
    {count}
  </span>
</button>
```

**Visual effect**: Unselected appears inset, selected appears raised with accent glow.

---

## Pattern 5: Dropdown/Menu

Use for: View selectors, sort options, action menus

```tsx
{/* Trigger Button */}
<button
  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all"
  style={{
    background: 'var(--bg-surface-3)',
    color: 'var(--text-primary)',
    border: '1px solid var(--border-subtle)',
  }}
>
  <Icon size={14} />
  <span>{currentLabel}</span>
  <ChevronDown size={14} style={{ color: 'var(--text-muted)' }} />
</button>

{/* Dropdown Menu */}
<div
  className="absolute right-0 mt-1 rounded-lg overflow-hidden z-50"
  style={{
    background: 'var(--bg-surface-3)',
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4), 0 4px 8px rgba(0, 0, 0, 0.3)',
    border: '1px solid var(--border-subtle)',
    minWidth: '140px',
  }}
>
  {options.map((option) => (
    <button
      key={option.value}
      className="w-full flex items-center gap-3 px-3 py-2.5 text-sm transition-all"
      style={{
        background: isSelected ? 'var(--bg-surface-2)' : 'transparent',
        color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)',
      }}
      onMouseEnter={(e) => {
        if (!isSelected) e.currentTarget.style.background = 'var(--bg-surface-2)';
      }}
      onMouseLeave={(e) => {
        if (!isSelected) e.currentTarget.style.background = 'transparent';
      }}
    >
      <Icon size={14} />
      <span>{option.label}</span>
      {isSelected && <Check size={14} className="text-accent" />}
    </button>
  ))}
</div>
```

---

## Pattern 6: Inset Slider (Custom Range Input)

Use for: Card size, spacing, opacity controls

```tsx
function InsetSlider({ value, onChange, min, max }) {
  const percentage = ((value - min) / (max - min)) * 100;
  
  return (
    <div
      className="relative h-5 rounded-full cursor-pointer"
      style={{
        background: 'var(--bg-surface-1)',
        boxShadow: 'var(--slider-inset)',
        border: 'var(--inset-border)',
        borderBottomColor: 'var(--slider-inset-border-bottom)',
        padding: '4px',
      }}
    >
      {/* Progress fill */}
      <div
        className="h-full rounded-full transition-all duration-75"
        style={{
          width: `${percentage}%`,
          minWidth: percentage > 0 ? '8px' : '0',
          background: 'linear-gradient(to bottom, var(--bg-surface-3) 0%, var(--bg-surface-2) 100%)',
          boxShadow: 'var(--raised-shadow-sm)',
          border: '1px solid transparent',
          borderTopColor: 'var(--raised-border-top)',
        }}
      />
    </div>
  );
}
```

---

## Pattern 7: Card with Hover Effect

Use for: Bookmark cards, collection cards, note cards

Use the `card-hover` utility class (defined in globals.css):

```tsx
<div className="card-hover group relative rounded-2xl p-4 cursor-pointer">
  {/* Card content */}
</div>
```

The `card-hover` class provides:
- Base elevation with `--shadow-2`
- Border highlights (`--border-highlight-top/left`)
- Hover: `translateY(-4px)` + `--glow-hover` + `--shadow-3`
- Active: `translateY(-1px)` + `--shadow-1`
- Gradient overlay on hover (accent color fade from bottom)

---

## Existing Components

### ✅ USE THESE (Design System Compliant)

| Component | Location | Usage |
|-----------|----------|-------|
| `Button` | `components/ui/button.tsx` | Uses `ds-btn-primary/secondary/ghost` classes |
| `PanelSection` | `components/control-panel/control-panel.tsx` | Sidebar sections with collapsible state |
| `PanelButton` | `components/control-panel/control-panel.tsx` | Raised toggle buttons |
| `PanelToggle` | `components/control-panel/control-panel.tsx` | Switch toggles |
| `card-hover` class | `globals.css` | Apply to any card for hover effects |

### ⚠️ DEPRECATED (Hardcoded Glass Styles)

| Component | Issue | Use Instead |
|-----------|-------|-------------|
| `GlowButton` | Hardcoded `backdrop-blur-md bg-white/5` | `Button` component or inline CSS variables |
| `CardSurface` | Hardcoded `backdrop-blur-lg bg-white/5` | `card-hover` class or inline CSS variables |

---

## Creating New Components: Checklist

Before submitting any UI work:

- [ ] **Uses CSS variables** (not hardcoded colors like `bg-white/5`)
- [ ] **No `backdrop-blur`** in component code (Glass handles this via CSS)
- [ ] **Raised elements** use: gradient + `--raised-shadow` + `--raised-border-top`
- [ ] **Inset elements** use: `--bg-surface-1` + `--inset-shadow` + `--inset-border`
- [ ] **Containers** use: `--bg-surface-2` + `--shadow-2` + highlight borders
- [ ] **Interactive elements** have hover state with color transitions
- [ ] **Selected states** use accent color: `--ds-accent`
- [ ] **Tested in Modern mode** (default)
- [ ] **Tested in Glass mode** (Settings > Look & Feel > UI Style: Glass)
- [ ] **Tested in Light mode** (if applicable)
- [ ] **Tested with Purple tint** (if applicable)

---

## Example: Creating a New Panel Section

```tsx
// ✅ CORRECT: Uses CSS variables, works with all themes
function NewSection({ title, children }) {
  return (
    <div
      className="rounded-xl p-4 mb-4"
      style={{
        background: 'var(--bg-surface-2)',
        boxShadow: 'var(--shadow-2)',
        border: '1px solid var(--border-subtle)',
        borderTopColor: 'var(--border-highlight-top)',
        borderLeftColor: 'var(--border-highlight-left)',
      }}
    >
      <div className="flex items-center gap-3 px-3 py-2 mb-2">
        <Icon className="h-4 w-4" style={{ color: 'var(--ds-accent)' }} />
        <span
          className="font-semibold uppercase tracking-wide"
          style={{
            color: 'var(--text-primary)',
            fontSize: '0.8125rem',
            letterSpacing: '0.5px',
          }}
        >
          {title}
        </span>
      </div>
      {children}
    </div>
  );
}
```

```tsx
// ❌ WRONG: Hardcoded styles, only works in Glass mode
function WrongSection({ title, children }) {
  return (
    <div className="rounded-xl p-4 mb-4 backdrop-blur-md bg-white/5 border border-white/10">
      <h3 className="text-gray-200 font-semibold">{title}</h3>
      {children}
    </div>
  );
}
```

---

## Files to Reference

| File | Purpose |
|------|---------|
| `app/globals.css` | CSS variable definitions, utility classes |
| `components/control-panel/library-controls.tsx` | Example of correct patterns |
| `components/control-panel/control-panel.tsx` | PanelSection, PanelButton components |
| `docs/PAWKIT_UI_DESIGN_SYSTEM.md` | Full design system documentation |

---

## Quick Reference: Inline Style Templates

Copy-paste these for common use cases:

### Raised Container
```tsx
style={{
  background: 'var(--bg-surface-2)',
  boxShadow: 'var(--shadow-2)',
  border: '1px solid var(--border-subtle)',
  borderTopColor: 'var(--border-highlight-top)',
  borderLeftColor: 'var(--border-highlight-left)',
}}
```

### Inset Container
```tsx
style={{
  background: 'var(--bg-surface-1)',
  boxShadow: 'var(--inset-shadow)',
  border: 'var(--inset-border)',
  borderBottomColor: 'var(--inset-border-bottom)',
  borderRightColor: 'var(--inset-border-right)',
}}
```

### Raised Button (Selected)
```tsx
style={{
  background: 'linear-gradient(to bottom, var(--bg-surface-3) 0%, var(--bg-surface-2) 100%)',
  boxShadow: 'var(--raised-shadow)',
  border: '1px solid transparent',
  borderTopColor: 'var(--raised-border-top)',
  color: 'var(--text-primary)',
}}
```

### Raised Button (Unselected)
```tsx
style={{
  background: 'transparent',
  color: 'var(--text-muted)',
}}
```

### Dropdown Menu
```tsx
style={{
  background: 'var(--bg-surface-3)',
  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
  border: '1px solid var(--border-subtle)',
}}
```

### Scrollbar (Default)
**Always use `scrollbar-minimal` class on any scrollable container.**

```tsx
<div className="overflow-y-auto scrollbar-minimal">
  {/* Scrollable content */}
</div>
```

This provides:
- 6px width, transparent track
- Subtle thumb (`hsl(var(--foreground) / 0.2)`)
- Hover state (`hsl(var(--foreground) / 0.3)`)
- Firefox support via `scrollbar-width: thin`

---

**Remember**: If you use CSS variables correctly, your component automatically supports Modern, Glass, Light, Dark, and Purple tint with ZERO extra code.
