# Pawkit UI Quick Reference

> **⚠️ READ THIS FIRST** before any UI work. This is the authoritative style guide.
> **Full details**: See `pawkit-ui-ux/SKILL.md` and `docs/PAWKIT_UI_DESIGN_SYSTEM.md`

---

## THE DEFAULT: Modern (Solid Surfaces with Depth)

**Modern is the default UI style.** Glass is opt-in via settings.

When creating UI components, **always use Modern patterns unless explicitly told to use Glass**.

---

## Modern Style: Core Principles

### 1. Depth Through Elevation (NOT blur)

Elements have **raised appearance** through:
- Surface hierarchy (darker = more recessed)
- Box shadows with purple glow in dark mode
- `translateY(-1px)` on hover for "lift" effect

### 2. Surface Hierarchy

```
Level 0: --bg-base (darkest, page background)
Level 1: --bg-surface-1 (sidebars)
Level 2: --bg-surface-2 (cards, containers)
Level 3: --bg-surface-3 (raised elements, selected states)
Level 4: --bg-surface-4 (hover states)
```

### 3. Shadow System (Purple Glow in Dark Mode)

```css
--shadow-1: 0 2px 8px hsl(270 50% 25% / 0.25);   /* subtle */
--shadow-2: 0 4px 16px hsl(270 50% 25% / 0.35);  /* cards */
--shadow-3: 0 8px 32px hsl(270 50% 25% / 0.45);  /* modals */
--shadow-4: 0 16px 48px hsl(270 50% 25% / 0.55); /* popovers */
```

---

## Copy-Paste Patterns: Modern Style

### Button - Primary (Raised with Glow)

```tsx
<button className="
  bg-accent text-white
  px-5 py-2.5 rounded-lg
  font-medium
  shadow-elevation-1
  hover:shadow-[0_0_20px_hsl(270_50%_50%/0.4),var(--shadow-2)]
  hover:-translate-y-0.5
  active:translate-y-0 active:shadow-elevation-1
  transition-all duration-150
">
  Save Changes
</button>
```

### Button - Secondary (Raised Surface)

```tsx
<button className="
  bg-surface-2 text-foreground
  px-5 py-2.5 rounded-lg
  font-medium
  border border-subtle
  shadow-elevation-1
  hover:bg-surface-3
  hover:shadow-elevation-2
  hover:-translate-y-0.5
  active:translate-y-0
  transition-all duration-150
">
  Cancel
</button>
```

### Button - Ghost (No Elevation)

```tsx
<button className="
  bg-transparent text-muted-foreground
  px-5 py-2.5 rounded-lg
  hover:bg-surface-2 hover:text-foreground
  transition-all duration-150
">
  Skip
</button>
```

### Card (Raised Container)

```tsx
<div className="
  bg-surface-2 rounded-xl
  border border-subtle
  shadow-elevation-1
  hover:shadow-[0_0_20px_hsl(270_50%_50%/0.3),var(--shadow-2)]
  hover:-translate-y-0.5
  transition-all duration-200
">
  {/* Card content */}
</div>
```

### Sidebar Section Container

```tsx
<div className="
  bg-surface-2 rounded-xl
  p-3 mx-2 my-2
  shadow-elevation-1
">
  <h3 className="text-xs font-semibold uppercase text-muted-foreground mb-2">
    Section Title
  </h3>
  {/* Section content */}
</div>
```

### Selected Nav Item

```tsx
<button className={cn(
  "px-3 py-2 rounded-lg transition-all duration-150",
  isSelected
    ? "bg-surface-3 text-foreground shadow-elevation-2 border-l-3 border-accent"
    : "text-muted-foreground hover:bg-surface-3 hover:text-foreground"
)}>
  <Icon className="h-4 w-4 mr-2" />
  Library
</button>
```

### Input Field

```tsx
<input className="
  bg-surface-1 text-foreground
  px-4 py-2.5 rounded-lg
  border border-default
  placeholder:text-muted-foreground
  hover:border-strong
  focus:border-accent focus:shadow-[0_0_0_3px_hsl(270_50%_50%/0.2)]
  focus:outline-none
  transition-all duration-150
"/>
```

### Modal/Dialog

```tsx
{/* Backdrop */}
<div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" />

{/* Modal */}
<div className="
  fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
  bg-surface-1 rounded-2xl
  border border-subtle
  shadow-elevation-4
  w-full max-w-lg
  z-50
">
  {/* Header */}
  <div className="px-6 py-4 border-b border-subtle">
    <h2 className="text-lg font-semibold">Modal Title</h2>
  </div>
  
  {/* Content */}
  <div className="px-6 py-4">
    {children}
  </div>
  
  {/* Footer */}
  <div className="px-6 py-4 border-t border-subtle bg-surface-2 rounded-b-2xl flex justify-end gap-3">
    <button className="btn-secondary">Cancel</button>
    <button className="btn-primary">Confirm</button>
  </div>
</div>
```

### Dropdown/Popover

```tsx
<div className="
  bg-surface-1 rounded-xl
  border border-subtle
  shadow-elevation-3
  p-2
  z-[9999]
">
  <button className="
    w-full text-left px-3 py-2 rounded-lg
    text-muted-foreground
    hover:bg-surface-2 hover:text-foreground
    transition-colors
  ">
    Option 1
  </button>
</div>
```

---

## Glass Style: When Explicitly Requested

Only use Glass patterns when:
1. User has Glass mode enabled in settings
2. You're specifically told to use Glass style

### Glass Button (Pill Shape)

```tsx
<button className="
  rounded-full
  backdrop-blur-md
  bg-white/5
  border border-white/10
  px-6 py-2
  hover:border-purple-500/50
  hover:shadow-[0_0_20px_rgba(168,85,247,0.4)]
  transition-all duration-200
">
  Glass Button
</button>
```

### Glass Card

```tsx
<div className="
  rounded-3xl
  backdrop-blur-lg
  bg-white/5
  border border-white/10
  p-6
  hover:shadow-[0_0_25px_rgba(168,85,247,0.3)]
  hover:border-purple-500/30
  transition-all duration-300
">
  {/* Card content */}
</div>
```

---

## Quick Decision Guide

| Question | Answer |
|----------|--------|
| Which style is default? | **Modern** (solid surfaces with depth) |
| When to use Glass? | Only if user has Glass enabled or explicitly requested |
| How to show depth? | Shadows + surface levels + translateY on hover |
| How to show selection? | `bg-surface-3` + `shadow-elevation-2` + accent border |
| How to show hover? | Lift (`-translate-y-0.5`) + increased shadow |
| Rounded corners for cards? | `rounded-xl` (12px) for Modern, `rounded-3xl` for Glass |
| Rounded corners for buttons? | `rounded-lg` (8px) for Modern, `rounded-full` for Glass pills |

---

## Common Mistakes to Avoid

### ❌ WRONG: Flat button (no depth)

```tsx
<button className="bg-purple-500 px-4 py-2 rounded">
  Save
</button>
```

### ✅ CORRECT: Raised button with depth

```tsx
<button className="
  bg-accent px-5 py-2.5 rounded-lg
  shadow-elevation-1
  hover:shadow-[0_0_20px_hsl(270_50%_50%/0.4),var(--shadow-2)]
  hover:-translate-y-0.5
  transition-all duration-150
">
  Save
</button>
```

### ❌ WRONG: Using Glass in Modern mode

```tsx
// Don't use backdrop-blur in Modern mode!
<div className="backdrop-blur-md bg-white/5">
```

### ✅ CORRECT: Solid surface in Modern mode

```tsx
<div className="bg-surface-2 shadow-elevation-1">
```

### ❌ WRONG: Missing hover lift effect

```tsx
<div className="bg-surface-2 hover:bg-surface-3">
```

### ✅ CORRECT: Hover with lift

```tsx
<div className="
  bg-surface-2
  hover:bg-surface-3
  hover:shadow-elevation-2
  hover:-translate-y-0.5
  transition-all duration-150
">
```

---

## CSS Variables Reference

These are defined in `globals.css`. Use them via Tailwind or directly:

```css
/* Surfaces */
bg-surface-1, bg-surface-2, bg-surface-3, bg-surface-4

/* Text */
text-foreground, text-muted-foreground

/* Borders */
border-subtle, border-default, border-strong

/* Shadows (Tailwind extended) */
shadow-elevation-1, shadow-elevation-2, shadow-elevation-3, shadow-elevation-4

/* Accent */
bg-accent, text-accent, border-accent
```

---

## Checklist Before Submitting UI Work

- [ ] Used Modern patterns (solid surfaces, not glass) unless Glass was requested
- [ ] Buttons have shadow + hover lift effect
- [ ] Cards have shadow + hover glow effect  
- [ ] Selected states use `bg-surface-3` + accent border
- [ ] Hover states include `-translate-y-0.5` for lift
- [ ] Used correct border radius (`rounded-lg` for Modern, `rounded-full` for Glass pills)
- [ ] No `backdrop-blur` in Modern mode
- [ ] Transitions include `duration-150` or `duration-200`

---

**Last Updated**: December 10, 2025
**Default Style**: Modern (Solid Surfaces with Depth)
**Glass**: Opt-in via Settings > Look & Feel > UI Style
