# Pawkit UI Design System v2.0

> **Purpose:** Refresh Pawkit's UI with depth, elevation, and a cohesive HSL-based color system.
> **Branch:** Create `feat/ui-refresh` branch for all changes
> **Goal:** Maintain minimal aesthetic while adding visual hierarchy through elevation and subtle purple glow effects

---

## Overview

This design system replaces the current glassmorphism approach with:
1. **HSL-based color tokens** - Consistent, easy to maintain
2. **Elevation system** - Depth through shadows, not blur
3. **Purple glow** - Brand-unique shadow color in dark mode
4. **Surface hierarchy** - Clear visual layers

The layout stays the same (3-panel view). Only the visual styling changes.

---

## Part 1: Color Tokens

### Base Colors (HSL Format)

All colors use HSL for easy manipulation. Define these as CSS custom properties in `globals.css` or a new `design-tokens.css` file.

```css
:root {
  /* === CORE HSL VALUES === */
  --hue-neutral: 0;
  --hue-purple: 270;
  
  /* === PURPLE ACCENT SCALE === */
  --purple-sat: 60%;
  --accent: hsl(var(--hue-purple) var(--purple-sat) 55%);
  --accent-hover: hsl(var(--hue-purple) var(--purple-sat) 65%);
  --accent-active: hsl(var(--hue-purple) var(--purple-sat) 45%);
  --accent-muted: hsl(var(--hue-purple) var(--purple-sat) 35%);
  --accent-subtle: hsl(var(--hue-purple) var(--purple-sat) 20%);
}

/* === DARK MODE (Default) === */
:root, [data-theme="dark"] {
  /* Backgrounds - stepping up in 4% lightness increments */
  --bg-base: hsl(var(--hue-neutral) 0% 4%);        /* deepest - page bg */
  --bg-surface-1: hsl(var(--hue-neutral) 0% 7%);   /* sidebars */
  --bg-surface-2: hsl(var(--hue-neutral) 0% 11%);  /* cards, containers */
  --bg-surface-3: hsl(var(--hue-neutral) 0% 15%);  /* raised elements, selected */
  --bg-surface-4: hsl(var(--hue-neutral) 0% 19%);  /* hover states */
  
  /* Text */
  --text-primary: hsl(var(--hue-neutral) 0% 95%);
  --text-secondary: hsl(var(--hue-neutral) 0% 70%);
  --text-muted: hsl(var(--hue-neutral) 0% 50%);
  --text-disabled: hsl(var(--hue-neutral) 0% 35%);
  
  /* Borders */
  --border-subtle: hsl(var(--hue-neutral) 0% 15%);
  --border-default: hsl(var(--hue-neutral) 0% 20%);
  --border-strong: hsl(var(--hue-neutral) 0% 30%);
  
  /* Shadows - PURPLE GLOW in dark mode */
  --shadow-color: var(--hue-purple) 50% 25%;
  --shadow-1: 0 2px 8px hsl(var(--shadow-color) / 0.25);
  --shadow-2: 0 4px 16px hsl(var(--shadow-color) / 0.35);
  --shadow-3: 0 8px 32px hsl(var(--shadow-color) / 0.45);
  --shadow-4: 0 16px 48px hsl(var(--shadow-color) / 0.55);
  
  /* Glow effects */
  --glow-hover: 0 0 20px hsl(var(--hue-purple) var(--purple-sat) 50% / 0.4);
  --glow-focus: 0 0 0 3px hsl(var(--hue-purple) var(--purple-sat) 50% / 0.3);
  --glow-active: 0 0 30px hsl(var(--hue-purple) var(--purple-sat) 50% / 0.5);
}

/* === LIGHT MODE === */
[data-theme="light"] {
  /* Backgrounds - inverted, stepping down */
  --bg-base: hsl(var(--hue-neutral) 0% 94%);
  --bg-surface-1: hsl(var(--hue-neutral) 0% 100%);
  --bg-surface-2: hsl(var(--hue-neutral) 0% 96%);
  --bg-surface-3: hsl(var(--hue-neutral) 0% 92%);
  --bg-surface-4: hsl(var(--hue-neutral) 0% 88%);
  
  /* Text */
  --text-primary: hsl(var(--hue-neutral) 0% 5%);
  --text-secondary: hsl(var(--hue-neutral) 0% 30%);
  --text-muted: hsl(var(--hue-neutral) 0% 50%);
  --text-disabled: hsl(var(--hue-neutral) 0% 65%);
  
  /* Borders */
  --border-subtle: hsl(var(--hue-neutral) 0% 90%);
  --border-default: hsl(var(--hue-neutral) 0% 85%);
  --border-strong: hsl(var(--hue-neutral) 0% 75%);
  
  /* Shadows - traditional dark in light mode */
  --shadow-color: var(--hue-neutral) 0% 0%;
  --shadow-1: 0 2px 8px hsl(var(--shadow-color) / 0.06);
  --shadow-2: 0 4px 16px hsl(var(--shadow-color) / 0.10);
  --shadow-3: 0 8px 32px hsl(var(--shadow-color) / 0.14);
  --shadow-4: 0 16px 48px hsl(var(--shadow-color) / 0.18);
  
  /* Glow effects - softer in light mode */
  --glow-hover: 0 0 20px hsl(var(--hue-purple) var(--purple-sat) 50% / 0.2);
  --glow-focus: 0 0 0 3px hsl(var(--hue-purple) var(--purple-sat) 50% / 0.2);
}
```

---

## Part 2: Elevation System

### Elevation Levels

| Level | Use Case | Shadow | Transform |
|-------|----------|--------|-----------|
| 0 | Page background | none | none |
| 1 | Sidebars, base containers | `--shadow-1` | none |
| 2 | Cards, section containers | `--shadow-2` | none |
| 3 | Selected items, raised buttons | `--shadow-2` | `translateY(-1px)` |
| 4 | Modals, dropdowns, popovers | `--shadow-3` | none |
| 5 | Tooltips, toasts | `--shadow-4` | none |

### CSS Utility Classes

```css
/* Elevation utilities */
.elevation-0 { box-shadow: none; }
.elevation-1 { box-shadow: var(--shadow-1); }
.elevation-2 { box-shadow: var(--shadow-2); }
.elevation-3 { box-shadow: var(--shadow-2); transform: translateY(-1px); }
.elevation-4 { box-shadow: var(--shadow-3); }
.elevation-5 { box-shadow: var(--shadow-4); }

/* Surface backgrounds */
.surface-base { background: var(--bg-base); }
.surface-1 { background: var(--bg-surface-1); }
.surface-2 { background: var(--bg-surface-2); }
.surface-3 { background: var(--bg-surface-3); }
.surface-4 { background: var(--bg-surface-4); }
```

---

## Part 3: Component Specifications

### 3.1 Left Sidebar

```
┌─────────────────────────┐
│  SIDEBAR (surface-1)    │
│  ┌───────────────────┐  │
│  │ HOME SECTION      │  │  ← surface-2 + shadow-1 + rounded-lg
│  │ ┌───────────────┐ │  │
│  │ │ Library ✓     │ │  │  ← SELECTED: surface-3 + shadow-2 + accent left border
│  │ ├───────────────┤ │  │
│  │ │ Calendar      │ │  │  ← DEFAULT: transparent, hover → surface-3
│  │ ├───────────────┤ │  │
│  │ │ Rediscover    │ │  │
│  │ └───────────────┘ │  │
│  └───────────────────┘  │
│                         │
│  ┌───────────────────┐  │
│  │ PAWKITS SECTION   │  │  ← surface-2 + shadow-1 + rounded-lg
│  │ ...               │  │
│  └───────────────────┘  │
└─────────────────────────┘
```

**CSS for section containers:**
```css
.sidebar-section {
  background: var(--bg-surface-2);
  border-radius: 12px;
  padding: 12px;
  margin: 8px;
  box-shadow: var(--shadow-1);
}

.sidebar-item {
  padding: 8px 12px;
  border-radius: 8px;
  color: var(--text-secondary);
  transition: all 0.15s ease;
}

.sidebar-item:hover {
  background: var(--bg-surface-3);
  color: var(--text-primary);
}

.sidebar-item.active {
  background: var(--bg-surface-3);
  color: var(--text-primary);
  box-shadow: var(--shadow-2);
  border-left: 3px solid var(--accent);
}
```

### 3.2 Right Sidebar

Same container pattern as left sidebar:

```css
.filter-section {
  background: var(--bg-surface-2);
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 12px;
  box-shadow: var(--shadow-1);
}

.filter-section-title {
  color: var(--text-muted);
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 12px;
}
```

### 3.3 Cards (Bookmark Cards)

```css
.card {
  background: var(--bg-surface-2);
  border-radius: 12px;
  overflow: hidden;
  box-shadow: var(--shadow-1);
  transition: all 0.2s ease;
}

.card:hover {
  box-shadow: var(--glow-hover), var(--shadow-2);
  transform: translateY(-2px);
}

.card:active {
  transform: translateY(0);
  box-shadow: var(--shadow-1);
}

/* Card thumbnail area */
.card-thumbnail {
  background: var(--bg-surface-1);
}

/* Card content area */
.card-content {
  padding: 12px;
}

.card-title {
  color: var(--text-primary);
  font-weight: 500;
}

.card-domain {
  color: var(--text-muted);
  font-size: 12px;
}
```

### 3.4 Note Cards (Redesigned)

Replace current verbose note cards with clean document-style cards:

```css
.note-card {
  background: var(--bg-surface-2);
  border-radius: 12px;
  overflow: hidden;
  box-shadow: var(--shadow-1);
  position: relative;
  min-height: 180px;
}

/* Folded corner indicator */
.note-card::after {
  content: '';
  position: absolute;
  top: 0;
  right: 0;
  width: 24px;
  height: 24px;
  background: linear-gradient(
    135deg,
    transparent 50%,
    var(--bg-surface-3) 50%
  );
  border-radius: 0 12px 0 0;
}

.note-card-preview {
  padding: 16px;
  color: var(--text-secondary);
  font-size: 13px;
  line-height: 1.5;
  /* Show first ~3 lines, fade out */
  max-height: 80px;
  overflow: hidden;
  mask-image: linear-gradient(to bottom, black 60%, transparent 100%);
}

.note-card-title {
  padding: 0 16px 16px;
  color: var(--text-primary);
  font-weight: 500;
}
```

### 3.5 Buttons

**Primary Button (Accent)**
```css
.btn-primary {
  background: var(--accent);
  color: white;
  padding: 10px 20px;
  border-radius: 8px;
  font-weight: 500;
  box-shadow: var(--shadow-1);
  transition: all 0.15s ease;
}

.btn-primary:hover {
  background: var(--accent-hover);
  box-shadow: var(--glow-hover), var(--shadow-2);
  transform: translateY(-1px);
}

.btn-primary:active {
  background: var(--accent-active);
  transform: translateY(0);
  box-shadow: var(--shadow-1);
}
```

**Secondary Button (Surface)**
```css
.btn-secondary {
  background: var(--bg-surface-2);
  color: var(--text-primary);
  padding: 10px 20px;
  border-radius: 8px;
  font-weight: 500;
  box-shadow: var(--shadow-1);
  border: 1px solid var(--border-subtle);
  transition: all 0.15s ease;
}

.btn-secondary:hover {
  background: var(--bg-surface-3);
  box-shadow: var(--shadow-2);
  transform: translateY(-1px);
}
```

**Ghost Button**
```css
.btn-ghost {
  background: transparent;
  color: var(--text-secondary);
  padding: 10px 20px;
  border-radius: 8px;
  transition: all 0.15s ease;
}

.btn-ghost:hover {
  background: var(--bg-surface-2);
  color: var(--text-primary);
}
```

### 3.6 Inputs

```css
.input {
  background: var(--bg-surface-1);
  border: 1px solid var(--border-default);
  border-radius: 8px;
  padding: 10px 14px;
  color: var(--text-primary);
  transition: all 0.15s ease;
}

.input::placeholder {
  color: var(--text-muted);
}

.input:hover {
  border-color: var(--border-strong);
}

.input:focus {
  outline: none;
  border-color: var(--accent);
  box-shadow: var(--glow-focus);
}
```

### 3.7 Modals & Dialogs

```css
.modal-overlay {
  background: hsl(0 0% 0% / 0.6);
  backdrop-filter: blur(4px);
}

.modal {
  background: var(--bg-surface-1);
  border-radius: 16px;
  box-shadow: var(--shadow-4);
  border: 1px solid var(--border-subtle);
}

.modal-header {
  padding: 20px 24px;
  border-bottom: 1px solid var(--border-subtle);
}

.modal-content {
  padding: 24px;
}

.modal-footer {
  padding: 16px 24px;
  border-top: 1px solid var(--border-subtle);
  background: var(--bg-surface-2);
  border-radius: 0 0 16px 16px;
}
```

### 3.8 Tags

```css
.tag {
  background: var(--bg-surface-3);
  color: var(--text-secondary);
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  transition: all 0.15s ease;
}

.tag:hover {
  background: var(--bg-surface-4);
  color: var(--text-primary);
}

.tag.active {
  background: var(--accent-subtle);
  color: var(--accent);
  border: 1px solid var(--accent-muted);
}
```

### 3.9 Dropdowns & Popovers

```css
.dropdown {
  background: var(--bg-surface-1);
  border-radius: 12px;
  box-shadow: var(--shadow-3);
  border: 1px solid var(--border-subtle);
  padding: 8px;
}

.dropdown-item {
  padding: 10px 14px;
  border-radius: 8px;
  color: var(--text-secondary);
  transition: all 0.1s ease;
}

.dropdown-item:hover {
  background: var(--bg-surface-2);
  color: var(--text-primary);
}

.dropdown-item.active {
  background: var(--accent-subtle);
  color: var(--accent);
}
```

---

## Part 4: Spacing System

Use consistent spacing based on 4px grid:

```css
:root {
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-10: 40px;
  --space-12: 48px;
}
```

---

## Part 5: Border Radius System

```css
:root {
  --radius-sm: 6px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;
  --radius-full: 9999px;
}
```

| Use Case | Radius |
|----------|--------|
| Tags, chips | `--radius-sm` |
| Buttons, inputs | `--radius-md` |
| Cards, containers | `--radius-lg` |
| Modals | `--radius-xl` |
| Avatars, badges | `--radius-full` |

---

## Part 6: Typography

Keep existing font, just ensure consistent color usage:

```css
:root {
  --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  
  /* Font sizes */
  --text-xs: 11px;
  --text-sm: 13px;
  --text-base: 14px;
  --text-lg: 16px;
  --text-xl: 18px;
  --text-2xl: 24px;
  
  /* Font weights */
  --font-normal: 400;
  --font-medium: 500;
  --font-semibold: 600;
  --font-bold: 700;
}
```

---

## Part 7: Transitions

Standardize all transitions:

```css
:root {
  --transition-fast: 0.1s ease;
  --transition-base: 0.15s ease;
  --transition-slow: 0.25s ease;
}
```

| Use Case | Timing |
|----------|--------|
| Button hover, active | `--transition-fast` |
| Card hover, nav items | `--transition-base` |
| Modal open/close | `--transition-slow` |

---

## Part 8: Implementation Checklist

### Phase 1: Foundation
- [ ] Create `design-tokens.css` (or add to `globals.css`)
- [ ] Define all CSS custom properties
- [ ] Add utility classes for surfaces and elevation
- [ ] Test dark/light mode switching

### Phase 2: Core Components
- [ ] Update left sidebar with section containers
- [ ] Update right sidebar with filter section containers
- [ ] Update nav item selected states
- [ ] Update button styles (primary, secondary, ghost)
- [ ] Update input styles

### Phase 3: Cards
- [ ] Update bookmark card styles
- [ ] Redesign note cards (folded corner, preview text)
- [ ] Update card hover effects (purple glow)
- [ ] Test card grid layout with new shadows

### Phase 4: Overlays
- [ ] Update modal styles
- [ ] Update dropdown styles
- [ ] Update popover styles
- [ ] Update toast/notification styles

### Phase 5: Polish
- [ ] Audit all components for token usage
- [ ] Remove old glassmorphism styles
- [ ] Test responsive behavior
- [ ] Test accessibility (contrast ratios)

---

## Part 9: Migration Notes

### What to Remove

1. **Glassmorphism effects:**
   - `backdrop-filter: blur(...)`
   - `background: rgba(..., 0.x)` on containers
   - Semi-transparent overlays (except modal backdrop)

2. **Old color variables:**
   - Any hardcoded hex/rgb values
   - Inconsistent rgba usage

3. **Old shadow definitions:**
   - Generic black box-shadows
   - Inconsistent shadow values

### What to Keep

1. **Layout structure** - 3-panel view unchanged
2. **Component functionality** - Just restyling
3. **Tailwind utilities** - Can coexist with CSS variables
4. **Existing animations** - Unless they conflict

---

## Part 10: Tailwind Integration

If using Tailwind, extend the config:

```js
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        surface: {
          base: 'var(--bg-base)',
          1: 'var(--bg-surface-1)',
          2: 'var(--bg-surface-2)',
          3: 'var(--bg-surface-3)',
          4: 'var(--bg-surface-4)',
        },
        accent: {
          DEFAULT: 'var(--accent)',
          hover: 'var(--accent-hover)',
          muted: 'var(--accent-muted)',
        }
      },
      boxShadow: {
        'elevation-1': 'var(--shadow-1)',
        'elevation-2': 'var(--shadow-2)',
        'elevation-3': 'var(--shadow-3)',
        'elevation-4': 'var(--shadow-4)',
        'glow': 'var(--glow-hover)',
        'glow-focus': 'var(--glow-focus)',
      },
      borderRadius: {
        'sm': 'var(--radius-sm)',
        'md': 'var(--radius-md)',
        'lg': 'var(--radius-lg)',
        'xl': 'var(--radius-xl)',
      }
    }
  }
}
```

Usage:
```jsx
<div className="bg-surface-2 shadow-elevation-2 rounded-lg hover:shadow-glow">
  ...
</div>
```

---

## Summary

This design system transforms Pawkit from flat glassmorphism to layered depth with:

1. **HSL-based tokens** - One value to adjust for variants
2. **Purple glow shadows** - Unique brand identity in dark mode
3. **Surface hierarchy** - Clear visual organization
4. **Elevation system** - Consistent depth relationships
5. **Minimal aesthetic preserved** - Clean, not cluttered

The purple glow as the shadow/elevation indicator is the signature element that makes Pawkit visually distinct.

---

**End of Design System Specification**
