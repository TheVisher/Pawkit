---
name: pawkit-ui-ux
description: Official Pawkit design language - glass morphism with strategic purple glow for interactions
---

# Pawkit UI/UX Design System - "Selective Glow"

**Purpose**: Official Pawkit design language - glass morphism with strategic purple glow for interactions

**Philosophy**: Glass is default. Purple glow reveals interaction. Not everything glows - hierarchy, not chaos.

---

## DESIGN PHILOSOPHY

### Core Principles

1. **Glass is Default** - Consistency without overwhelming
2. **Purple Glow = Interaction** - Appears on hover, constant on selected, enhanced on active
3. **Selective Application** - Not everything glows (creates hierarchy)
4. **Line Icons Only** - No emojis (sleek, modern, elegant)
5. **Backdrop Blur Foundation** - Everything has subtle glass effect

### Visual Hierarchy

```
GLOW HIERARCHY (most to least prominent):
1. Selected State   → Constant purple glow (always visible)
2. Hover State      → Purple glow appears (temporary)
3. Active State     → Enhanced glow (brief interaction feedback)
4. Inactive State   → Glass only, no glow (resting state)
```

### Color Palette

```css
/* Primary Interaction */
--purple-glow: rgba(168, 85, 247, 0.4)      /* Purple-500 at 40% */
--purple-accent: rgb(168, 85, 247)           /* Purple-500 solid */
--purple-subtle: rgba(168, 85, 247, 0.2)    /* Purple-500 at 20% */

/* Glass Foundation */
--glass-base: rgba(255, 255, 255, 0.05)     /* White at 5% */
--glass-border: rgba(255, 255, 255, 0.1)    /* White at 10% */
--glass-strong: rgba(17, 24, 39, 0.9)       /* Gray-900 at 90% */
```

---

## CANONICAL PATTERNS

### 1. BUTTONS

#### Glass Pill Button (Primary Interactive Element)

**Use Cases**: Top nav workspace switcher ("Personal"), right sidebar filters ("All", "Bookmarks Only"), **tag filters (Library and Pawkits views)**

**Base State** (Inactive):
```tsx
<button className="
  rounded-full
  backdrop-blur-md
  bg-white/5
  border border-white/10
  px-6 py-2
  text-sm font-medium
  transition-all duration-200
">
  Personal
</button>
```

**Hover State**:
```tsx
<button className="
  rounded-full
  backdrop-blur-md
  bg-white/5
  border border-purple-500/50
  shadow-[0_0_20px_rgba(168,85,247,0.4)]
  px-6 py-2
  text-sm font-medium
  transition-all duration-200
">
  Personal
</button>
```

**Selected State** (Constant Glow):
```tsx
<button className="
  rounded-full
  backdrop-blur-md
  bg-purple-500/20
  border border-purple-500/50
  shadow-[0_0_15px_rgba(168,85,247,0.3)]
  px-6 py-2
  text-sm font-medium text-purple-200
  transition-all duration-200
">
  Personal
</button>
```

**Complete Component Example**:
```tsx
interface GlassPillButtonProps {
  children: React.ReactNode;
  selected?: boolean;
  onClick?: () => void;
  className?: string;
}

export function GlassPillButton({
  children,
  selected = false,
  onClick,
  className = ""
}: GlassPillButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        // Base styles
        "rounded-full backdrop-blur-md px-6 py-2 text-sm font-medium transition-all duration-200",
        // Inactive state
        !selected && "bg-white/5 border border-white/10 hover:border-purple-500/50 hover:shadow-[0_0_20px_rgba(168,85,247,0.4)]",
        // Selected state
        selected && "bg-purple-500/20 border border-purple-500/50 shadow-[0_0_15px_rgba(168,85,247,0.3)] text-purple-200",
        className
      )}
    >
      {children}
    </button>
  );
}

// Usage
<GlassPillButton selected={activeWorkspace === 'personal'} onClick={() => setWorkspace('personal')}>
  Personal
</GlassPillButton>
```

**✅ DO**:
- Use for primary interactive elements (workspace switchers, filters)
- Let purple glow indicate interaction state
- Use `rounded-full` for pill shape
- Include `backdrop-blur-md` for glass effect

**❌ DON'T**:
- Use flat purple background on hover (old pattern: `hover:bg-purple-500`)
- Use gray hover states (needs purple glow!)
- Skip the backdrop blur (essential for glass effect)
- Use on every button (reserve for primary interactions)

#### Tag Display Pattern

**CANONICAL PATTERN**: Tags ALWAYS use glass pill buttons across all views.

**Implementation Note**: As of October 29, 2025, Library view was updated (commit 58132cd) to match Pawkits view pattern. Tags now consistently appear as interactive glass pill buttons with purple glow on hover and selected states.

**Why**: Consistency across views reduces cognitive load and creates unified UX. Tags are primary filter mechanism in both Library and Pawkits views.

**Example** (Tag Filter):
```tsx
<button
  onClick={() => toggleTag(tagName)}
  className={`rounded-full backdrop-blur-md px-3 py-1 text-xs font-medium transition-all duration-200 ${
    selectedTags.includes(tagName)
      ? "bg-purple-500/20 border border-purple-500/50 shadow-[0_0_15px_rgba(168,85,247,0.3)] text-purple-200"
      : "bg-white/5 border border-white/10 hover:border-purple-500/50 hover:shadow-[0_0_20px_rgba(168,85,247,0.4)] text-muted-foreground"
  }`}
>
  #{tagName} ({count})
</button>
```

**Where Applied**:
- Library view tag filters (components/control-panel/library-controls.tsx)
- Pawkits view tag filters (components/control-panel/pawkits-controls.tsx)
- Any future views with tag filtering

---

### 2. DROPDOWN / POPOVER

**Use Cases**: Workspace switcher dropdown, action menus, filter popovers

**Old Pattern** (Outdated - Flat Purple Tooltip):
```tsx
// ❌ DON'T USE THIS
<div className="absolute bg-purple-500 text-white rounded px-4 py-2">
  Workspace Options
</div>
```

**New Pattern** (Glass Blur Popover):
```tsx
<div className="
  backdrop-blur-md
  bg-gray-900/90
  border border-white/10
  rounded-xl
  p-4
  shadow-[0_0_30px_rgba(0,0,0,0.5)]
">
  <div className="space-y-2">
    <button className="
      w-full text-left px-4 py-2 rounded-lg
      hover:bg-white/5 hover:border-purple-500/50
      transition-all duration-200
    ">
      Personal Workspace
    </button>
    <button className="
      w-full text-left px-4 py-2 rounded-lg
      hover:bg-white/5 hover:border-purple-500/50
      transition-all duration-200
    ">
      Work Workspace
    </button>
  </div>
</div>
```

**Complete Component Example**:
```tsx
interface GlassPopoverProps {
  children: React.ReactNode;
  open: boolean;
  className?: string;
}

export function GlassPopover({ children, open, className = "" }: GlassPopoverProps) {
  if (!open) return null;

  return (
    <div className={cn(
      "absolute z-50",
      "backdrop-blur-md bg-gray-900/90",
      "border border-white/10 rounded-xl",
      "p-4 shadow-[0_0_30px_rgba(0,0,0,0.5)]",
      "animate-in fade-in-0 zoom-in-95 duration-200",
      className
    )}>
      {children}
    </div>
  );
}
```

**✅ DO**:
- Use glass blur background (`backdrop-blur-md bg-gray-900/90`)
- Use `rounded-xl` for modern look
- Add subtle border (`border-white/10`)
- Include large shadow for depth

**❌ DON'T**:
- Use flat solid backgrounds (`bg-purple-500`)
- Use small tooltips with just text
- Skip the backdrop blur
- Use sharp corners (`rounded` vs `rounded-xl`)

---

### 3. CARDS

#### GlassCard (The Signature Pawkit Style)

**Use Cases**: Bookmark cards with product images, note previews, content cards

**Base State**:
```tsx
<div className="
  rounded-3xl
  border border-white/10
  bg-white/5
  backdrop-blur-lg
  p-6
  transition-all duration-300
">
  {/* Card content */}
</div>
```

**Hover State** (Purple Glow Appears):
```tsx
<div className="
  rounded-3xl
  border border-white/10
  bg-white/5
  backdrop-blur-lg
  p-6
  transition-all duration-300
  hover:shadow-[0_0_25px_rgba(168,85,247,0.3)]
  hover:border-purple-500/30
">
  {/* Card content */}
</div>
```

**Complete GlassCard Component**:
```tsx
interface GlassCardProps {
  children: React.ReactNode;
  hover?: boolean;
  className?: string;
  onClick?: () => void;
}

export function GlassCard({
  children,
  hover = true,
  className = "",
  onClick
}: GlassCardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        // Base glass effect
        "rounded-3xl border border-white/10 bg-white/5 backdrop-blur-lg",
        "p-6 transition-all duration-300",
        // Hover glow (optional)
        hover && "hover:shadow-[0_0_25px_rgba(168,85,247,0.3)] hover:border-purple-500/30 cursor-pointer",
        className
      )}
    >
      {children}
    </div>
  );
}

// Usage in bookmark card
<GlassCard hover={true} onClick={() => openCard(card.id)}>
  <img src={card.imageUrl} className="rounded-xl mb-4" />
  <h3 className="font-semibold text-lg mb-2">{card.title}</h3>

  {/* URL Pill */}
  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10">
    <Globe className="h-3 w-3 text-gray-400" />
    <span className="text-xs text-gray-400">{card.domain}</span>
  </div>
</GlassCard>
```

**URL Pill Inside Card**:
```tsx
<div className="
  inline-flex items-center gap-2
  px-3 py-1
  rounded-full
  bg-white/5
  border border-white/10
  backdrop-blur-sm
">
  <Globe className="h-3 w-3 text-gray-400" />
  <span className="text-xs text-gray-400">{domain}</span>
</div>
```

**✅ DO**:
- Use `rounded-3xl` for cards (signature Pawkit style)
- Include backdrop blur (`backdrop-blur-lg`)
- Add purple glow on hover for interactive cards
- Use glass pills for metadata (URLs, tags)
- **Tags MUST use glass pill buttons** (canonical pattern, consistent across all views)

**❌ DON'T**:
- Use flat cards without glass effect
- Use sharp corners (`rounded-lg`)
- Skip hover states on interactive cards
- Use solid backgrounds

---

### 4. MODALS

#### GlassModal Pattern (User-Approved Style)

**Structure**:
1. **Top Bar**: Glass pill with title + action buttons
2. **Content Area**: Main modal content
3. **Bottom Bar**: Glass pill with primary/secondary action buttons

**User Loves**: Card detail modal style (glass top bar, clean layout, glass button bar at bottom)

**User Hates**: Dig Up modal (🐕 emoji, clunky buttons, inconsistent style)

**Complete GlassModal Example**:
```tsx
interface GlassModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  primaryAction?: {
    label: string;
    onClick: () => void;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
}

export function GlassModal({
  open,
  onClose,
  title,
  children,
  primaryAction,
  secondaryAction
}: GlassModalProps) {
  if (!open) return null;

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl">

          {/* Top Bar - Glass Pill */}
          <div className="
            backdrop-blur-md bg-white/5 border border-white/10
            rounded-full px-6 py-3 mb-4
            flex items-center justify-between
          ">
            <h2 className="font-semibold text-lg">{title}</h2>
            <button
              onClick={onClose}
              className="
                rounded-full p-2
                hover:bg-white/10 hover:border-purple-500/50
                transition-all duration-200
              "
              aria-label="Close modal"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <div className="
            backdrop-blur-md bg-gray-900/90 border border-white/10
            rounded-3xl p-6
            max-h-[70vh] overflow-y-auto
          ">
            {children}
          </div>

          {/* Bottom Bar - Glass Pill */}
          {(primaryAction || secondaryAction) && (
            <div className="
              backdrop-blur-md bg-white/5 border border-white/10
              rounded-full px-6 py-3 mt-4
              flex items-center justify-end gap-3
            ">
              {secondaryAction && (
                <button
                  onClick={secondaryAction.onClick}
                  className="
                    px-6 py-2 rounded-full
                    bg-white/5 border border-white/10
                    hover:border-purple-500/50 hover:shadow-[0_0_15px_rgba(168,85,247,0.3)]
                    transition-all duration-200
                  "
                >
                  {secondaryAction.label}
                </button>
              )}
              {primaryAction && (
                <button
                  onClick={primaryAction.onClick}
                  className="
                    px-6 py-2 rounded-full
                    bg-purple-500/20 border border-purple-500/50
                    shadow-[0_0_15px_rgba(168,85,247,0.3)]
                    hover:bg-purple-500/30 hover:shadow-[0_0_20px_rgba(168,85,247,0.4)]
                    transition-all duration-200
                  "
                >
                  {primaryAction.label}
                </button>
              )}
            </div>
          )}

        </div>
      </div>
    </>,
    document.body
  );
}
```

**Usage**:
```tsx
<GlassModal
  open={isOpen}
  onClose={() => setIsOpen(false)}
  title="Card Details"
  primaryAction={{
    label: "Save Changes",
    onClick: handleSave
  }}
  secondaryAction={{
    label: "Cancel",
    onClick: () => setIsOpen(false)
  }}
>
  <div className="space-y-4">
    {/* Modal content */}
  </div>
</GlassModal>
```

**Fixing Dig Up Modal**:
```tsx
// ❌ BEFORE (User Hates This)
<div className="text-center">
  <div className="text-6xl mb-4">🐕</div>  {/* Emoji - NO! */}
  <h2>Dig Up Something New</h2>
  <button className="mt-4 px-6 py-3 bg-purple-500 rounded">  {/* Plain button - NO! */}
    Start Digging
  </button>
</div>

// ✅ AFTER (Pawkit Style)
<GlassModal
  open={digUpOpen}
  onClose={() => setDigUpOpen(false)}
  title="Discover Something New"
  primaryAction={{
    label: "Start Discovering",
    onClick: handleDigUp
  }}
>
  <div className="text-center space-y-4">
    {/* Line icon instead of emoji */}
    <div className="inline-flex p-4 rounded-full bg-purple-500/10 border border-purple-500/20">
      <Sparkles className="h-8 w-8 text-purple-400" />
    </div>
    <p className="text-gray-300">
      Let Pawkit surface a forgotten bookmark from your collection
    </p>
  </div>
</GlassModal>
```

**✅ DO**:
- Use glass top bar with title + close button
- Use glass pill bottom bar for actions
- Use `rounded-3xl` for content area
- Use line icons (lucide-react)

**❌ DON'T**:
- Use emojis (🐕 specifically called out)
- Use plain buttons at bottom without glass pill bar
- Use flat purple backgrounds
- Skip the glass effect

---

### 5. NAVIGATION

#### Active View Indicator

**User Feedback**: Current underline is too minimal (h-0.5), hard to see

**Old Pattern** (Too Minimal):
```tsx
<div className="border-b-2 border-purple-500" />  // Too thin
```

**New Pattern** (Thicker with Glow):
```tsx
<div className="
  h-1
  bg-purple-500
  shadow-[0_0_10px_rgba(168,85,247,0.6)]
  rounded-full
" />
```

**Complete Nav Item Component**:
```tsx
interface NavItemProps {
  label: string;
  active: boolean;
  onClick: () => void;
}

export function NavItem({ label, active, onClick }: NavItemProps) {
  return (
    <button
      onClick={onClick}
      className="relative px-4 py-2 transition-all duration-200"
    >
      <span className={cn(
        "text-sm font-medium",
        active ? "text-purple-300" : "text-gray-400 hover:text-gray-200"
      )}>
        {label}
      </span>

      {/* Active indicator bar */}
      {active && (
        <div className="
          absolute bottom-0 left-0 right-0
          h-1 bg-purple-500
          shadow-[0_0_10px_rgba(168,85,247,0.6)]
          rounded-full
        " />
      )}
    </button>
  );
}

// Usage
<nav className="flex items-center gap-2 border-b border-white/10 pb-2">
  <NavItem label="Library" active={view === 'library'} onClick={() => setView('library')} />
  <NavItem label="Calendar" active={view === 'calendar'} onClick={() => setView('calendar')} />
  <NavItem label="Timeline" active={view === 'timeline'} onClick={() => setView('timeline')} />
</nav>
```

**✅ DO**:
- Use `h-1` for indicator (not h-0.5)
- Add purple glow shadow
- Make indicator width match text width
- Use `rounded-full` for smooth appearance

**❌ DON'T**:
- Use thin underlines (h-0.5)
- Use fixed width indicators
- Skip the glow shadow
- Use sharp edges

#### Nav Hover/Selected States

**Hover State** (Purple Glow Appears):
```tsx
<button className="
  px-4 py-2 rounded-lg
  text-gray-400
  hover:text-purple-300
  hover:bg-white/5
  hover:shadow-[0_0_15px_rgba(168,85,247,0.2)]
  transition-all duration-200
">
  Dashboard
</button>
```

**Selected State** (Constant Purple Glow):
```tsx
<button className="
  px-4 py-2 rounded-lg
  text-purple-300
  bg-purple-500/10
  shadow-[0_0_15px_rgba(168,85,247,0.3)]
">
  Dashboard
</button>
```

---

### 6. SLIDERS

#### Glass Slider (Right Sidebar)

**User Feedback**: Current sliders don't match glass theme

**Old Pattern**:
```tsx
<input type="range" className="w-full" />  // Browser default styling
```

**New Pattern** (Glass with Purple Glow):
```tsx
<div className="relative w-full h-2">
  {/* Track */}
  <div className="
    absolute inset-0
    bg-white/5 border border-white/10
    backdrop-blur-md rounded-full
  " />

  {/* Fill (Purple) */}
  <div
    className="
      absolute left-0 top-0 bottom-0
      bg-purple-500 rounded-full
      shadow-[0_0_10px_rgba(168,85,247,0.4)]
    "
    style={{ width: `${value}%` }}
  />

  {/* Thumb */}
  <div
    className="
      absolute top-1/2 -translate-y-1/2
      w-4 h-4 rounded-full
      bg-white/10 border-2 border-purple-500
      backdrop-blur-md
      shadow-[0_0_15px_rgba(168,85,247,0.5)]
      cursor-pointer
      hover:scale-110 transition-transform
    "
    style={{ left: `${value}%` }}
  />
</div>
```

**Complete Glass Slider Component**:
```tsx
interface GlassSliderProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label?: string;
}

export function GlassSlider({
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  label
}: GlassSliderProps) {
  const percentage = ((value - min) / (max - min)) * 100;

  return (
    <div className="space-y-2">
      {label && (
        <label className="text-sm text-gray-400">{label}</label>
      )}

      <div className="relative w-full h-2">
        {/* Track */}
        <div className="absolute inset-0 bg-white/5 border border-white/10 backdrop-blur-md rounded-full" />

        {/* Fill */}
        <div
          className="absolute left-0 top-0 bottom-0 bg-purple-500 rounded-full shadow-[0_0_10px_rgba(168,85,247,0.4)]"
          style={{ width: `${percentage}%` }}
        />

        {/* Native input (invisible but functional) */}
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="absolute inset-0 w-full opacity-0 cursor-pointer z-10"
        />

        {/* Visual thumb */}
        <div
          className="
            absolute top-1/2 -translate-y-1/2 -translate-x-1/2
            w-4 h-4 rounded-full
            bg-white/10 border-2 border-purple-500
            backdrop-blur-md
            shadow-[0_0_15px_rgba(168,85,247,0.5)]
            pointer-events-none
            transition-transform
          "
          style={{ left: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

// Usage
<GlassSlider
  label="Opacity"
  value={opacity}
  onChange={setOpacity}
  min={0}
  max={100}
  step={5}
/>
```

**✅ DO**:
- Use glass track (`bg-white/5 border-white/10 backdrop-blur-md`)
- Add purple glow to fill and thumb
- Use `rounded-full` for smooth appearance
- Make thumb interactive with hover scale

**❌ DON'T**:
- Use browser default slider styling
- Use solid backgrounds without glass effect
- Skip the purple glow on interaction
- Use square or sharp sliders

---

### 7. ICONS

**Rule**: Line icons only from lucide-react. NO EMOJIS.

**Icon Library**: `lucide-react`

```tsx
import {
  Globe,
  Calendar,
  Tag,
  Search,
  Plus,
  Trash2,
  Settings,
  Sparkles,  // Use instead of 🐕 in Dig Up modal
  ChevronDown,
  X
} from 'lucide-react';
```

**Icon Sizing**:
```tsx
// Small icons (buttons, pills)
<Globe className="h-3 w-3" />

// Medium icons (standard buttons)
<Settings className="h-4 w-4" />

// Large icons (feature areas)
<Sparkles className="h-6 w-6" />

// Extra large icons (empty states)
<Inbox className="h-8 w-8" />
```

**Icon with Purple Glow** (Feature Highlights):
```tsx
<div className="
  inline-flex p-4 rounded-full
  bg-purple-500/10 border border-purple-500/20
  shadow-[0_0_20px_rgba(168,85,247,0.3)]
">
  <Sparkles className="h-8 w-8 text-purple-400" />
</div>
```

**✅ DO**:
- Use lucide-react for all icons
- Size consistently (h-3, h-4, h-6, h-8)
- Add aria-labels for icon-only buttons
- Use purple tint for accent icons

**❌ DON'T**:
- Use emojis (🐕 🔖 📅 ❌)
- Mix icon libraries
- Use inconsistent sizes
- Skip accessibility labels

---

### 8. CONTEXT MENUS

**Purpose**: Right-click menus for cards, Pawkit collections, and other interactive elements

**Implementation**: Uses Radix UI's Context Menu primitives with reusable `GenericContextMenu` wrapper component

**Created**: October 31, 2025 (Context Menu System Implementation)

#### Z-Index Hierarchy

**CRITICAL**: Context menus must ALWAYS appear above all other UI elements.

```tsx
// Pawkit z-index layers (from lowest to highest):
z-0       // Base layer (most content)
z-10      // Floating elements (cards, pills)
z-50      // Overlays (drawers, modals)
z-[102]   // Sidebars (left/right panels)
z-[150]   // Modal overlays (backgrounds)
z-[9999]  // Context menus (ALWAYS ON TOP)
```

**Why z-[9999]?**
- Context menus must appear above sidebars (z-[102])
- Context menus must appear above modal overlays (z-[150])
- Using z-[9999] ensures they're always visible regardless of other UI layers
- Applies to both ContextMenuContent AND ContextMenuSubContent

#### GenericContextMenu Component

**Location**: `components/ui/generic-context-menu.tsx`

**Purpose**: Reusable wrapper with simple array-based API supporting icons, separators, submenus, shortcuts, and destructive actions

**Basic Usage**:
```tsx
import { GenericContextMenu } from "@/components/ui/generic-context-menu";
import { FolderPlus, Edit3, Trash2 } from "lucide-react";

<GenericContextMenu
  items={[
    {
      label: "Create New",
      icon: FolderPlus,
      onClick: () => handleCreate(),
    },
    { type: "separator" },
    {
      label: "Rename",
      icon: Edit3,
      onClick: () => handleRename(),
    },
    {
      label: "Delete",
      icon: Trash2,
      onClick: () => handleDelete(),
      destructive: true,  // Red text color
    },
  ]}
>
  <div>Right-click me</div>
</GenericContextMenu>
```

**With Submenu**:
```tsx
<GenericContextMenu
  items={[
    {
      type: "submenu",
      label: "Move to",
      icon: ArrowUpDown,
      items: [
        { label: "Root (Top Level)", onClick: () => moveToRoot() },
        { type: "separator" },
        { label: "Projects", onClick: () => moveTo("projects") },
        { label: "Archive", onClick: () => moveTo("archive") },
      ],
    },
  ]}
>
  <div>Right-click for move menu</div>
</GenericContextMenu>
```

**TypeScript Types**:
```tsx
export type ContextMenuItemConfig = {
  type?: "item" | "separator" | "submenu";
  label?: string;
  icon?: LucideIcon;
  onClick?: () => void;
  disabled?: boolean;
  destructive?: boolean;  // Red text for delete actions
  shortcut?: string;      // Display keyboard shortcut (e.g., "⌘D")
  items?: ContextMenuItemConfig[];  // For submenus
};

export interface GenericContextMenuProps {
  children: ReactNode;
  items: ContextMenuItemConfig[];
  className?: string;  // Override default width
}
```

#### Implementation Details

**CRITICAL: asChild Prop Usage**

The `asChild` prop only works with simple HTML elements, NOT complex components:

```tsx
// ✅ CORRECT: Wrap simple elements
<GenericContextMenu items={menuItems}>
  <button className="...">Click me</button>
</GenericContextMenu>

// ✅ CORRECT: Wrap simple div
<GenericContextMenu items={menuItems}>
  <div className="...">
    <h3>Title</h3>
    <p>Content</p>
  </div>
</GenericContextMenu>

// ❌ WRONG: Wrap complex components
<GenericContextMenu items={menuItems}>
  <MyCustomComponent prop={value} />
  {/* Context menu won't work - browser default menu will show */}
</GenericContextMenu>
```

**Why?** Radix UI's `asChild` pattern uses `React.cloneElement()` to add event handlers. This only works with elements, not components.

**Solution**: Inline the component structure and wrap the specific element:

```tsx
// Instead of wrapping the component:
<GenericContextMenu items={menuItems}>
  <PanelSection title="Collections" />
</GenericContextMenu>

// Inline and wrap the button:
<div className="panel-section">
  <GenericContextMenu items={menuItems}>
    <button className="title-button">
      Collections
    </button>
  </GenericContextMenu>
  {/* Other panel section elements */}
</div>
```

#### Where Context Menus Are Used

**Cards** (`components/cards/card-context-menu.tsx`):
- Add to Pawkit (submenu with collection tree)
- Remove from Pawkit (submenu with current collections)
- Fetch metadata (for URL cards)
- Pin/Unpin to sidebar (for notes)
- Delete

**Pawkit Collections** (left sidebar, `components/navigation/left-navigation-panel.tsx`):
- Open (navigate to collection)
- New sub-collection
- Rename
- Move to (submenu with available destinations)
- Delete

**PAWKITS Header** (left sidebar):
- View All Pawkits
- Create New Pawkit

**Right Sidebar Collections** (`components/pawkits/sidebar.tsx`):
- New sub-collection
- Rename
- Move
- Delete

#### Visual Styling

Context menus use glass morphism with subtle borders:

```tsx
<ContextMenuContent className="
  z-[9999]           // CRITICAL: Always on top
  w-56               // Default width (can override)
  backdrop-blur-lg   // Glass effect
  bg-gray-950/95     // Dark background with transparency
  border border-white/10  // Subtle border
  rounded-lg         // Rounded corners
  shadow-lg          // Drop shadow
  p-1                // Internal padding
">
  {/* Menu items */}
</ContextMenuContent>
```

**Menu Items**:
```tsx
<ContextMenuItem className="
  flex items-center gap-2     // Icon + text layout
  px-2 py-1.5                 // Padding
  text-sm                     // Text size
  rounded                     // Rounded corners
  cursor-pointer              // Pointer cursor
  hover:bg-white/10           // Hover state
  focus:bg-white/10           // Keyboard focus
  transition-colors           // Smooth transition
">
  <Icon className="h-4 w-4" />
  Label
</ContextMenuItem>
```

**Destructive Items** (red for delete):
```tsx
<ContextMenuItem className="text-rose-400 hover:text-rose-300">
  <Trash2 className="mr-2 h-4 w-4" />
  Delete
</ContextMenuItem>
```

**Submenus**:
```tsx
<ContextMenuSub>
  <ContextMenuSubTrigger className="
    flex items-center justify-between
    px-2 py-1.5 text-sm rounded
    cursor-pointer
    hover:bg-white/10
  ">
    Move to
    <ChevronRight className="h-4 w-4" />
  </ContextMenuSubTrigger>
  <ContextMenuSubContent className="
    z-[9999]           // CRITICAL: Same high z-index
    max-h-[300px]      // Max height
    overflow-y-auto    // Scrollable if needed
  ">
    {/* Submenu items */}
  </ContextMenuSubContent>
</ContextMenuSub>
```

#### Common Patterns

**Collection Tree Submenu**:
```tsx
// Build hierarchical collection menu recursively
const buildCollectionMenu = (collections: CollectionNode[]): ContextMenuItemConfig[] => {
  return collections.map(collection => {
    const hasChildren = collection.children && collection.children.length > 0;

    if (hasChildren) {
      return {
        type: "submenu",
        label: collection.name,
        items: [
          { label: `Add to ${collection.name}`, onClick: () => addTo(collection.slug) },
          { type: "separator" },
          ...buildCollectionMenu(collection.children)
        ]
      };
    }

    return {
      label: collection.name,
      onClick: () => addTo(collection.slug)
    };
  });
};
```

**Dynamic Menu Items** (fetch collections on open):
```tsx
const [collections, setCollections] = useState<CollectionNode[]>([]);

const fetchCollections = async () => {
  const response = await fetch("/api/pawkits");
  const data = await response.json();
  setCollections(data.tree || []);
};

<ContextMenu onOpenChange={(open) => open && fetchCollections()}>
  <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
  <ContextMenuContent>
    {/* Render collections */}
  </ContextMenuContent>
</ContextMenu>
```

#### ✅ DO

- **ALWAYS** use z-[9999] on ContextMenuContent and ContextMenuSubContent
- Wrap simple HTML elements with ContextMenuTrigger asChild
- Fetch dynamic menu items using `onOpenChange` handler
- Use icons from lucide-react for consistency
- Use `destructive: true` for delete/remove actions
- Test context menus appear above sidebars and modals
- Use submenus for hierarchical options (collections, categories)
- Add separators to group related actions

#### ❌ DON'T

- **NEVER** wrap complex components with ContextMenuTrigger asChild
- Don't use z-index lower than z-[9999] for context menus
- Don't use window.prompt() - use proper modals instead
- Don't forget to stop event propagation in modal handlers
- Don't use flat purple backgrounds (use glass morphism)
- Don't skip the backdrop-blur on menu content
- Don't use emojis in menu items (use lucide-react icons)

#### Troubleshooting

**Context menu shows browser default menu**:
- Problem: Wrapping a complex component with asChild
- Solution: Inline the structure and wrap the specific element

**Context menu appears behind sidebar**:
- Problem: Missing or incorrect z-index
- Solution: Add `z-[9999]` to ContextMenuContent and ContextMenuSubContent

**ESC key closes sidebar instead of modal**:
- Problem: Event bubbling to parent handlers
- Solution: Use capture phase with `document.addEventListener("keydown", handler, true)`

**See**: `.claude/skills/pawkit-troubleshooting/SKILL.md` for detailed troubleshooting of context menu issues (Issues #11-14)

---

## COMPONENT USAGE RULES

### When to Use Each Pattern

| Pattern | Use When | Example |
|---------|----------|---------|
| **GlassPillButton** | Primary interactions, filters, workspace switchers | "Personal" workspace, "All/Bookmarks Only" filters |
| **GlassCard** | Content displays with hover interaction | Bookmark cards, note previews |
| **GlassModal** | Full modal dialogs with top/bottom bars | Card details, settings, forms |
| **GlassPopover** | Dropdown menus, filter options | Workspace switcher dropdown, action menus |
| **GlassSlider** | Adjustable values in control panel | Opacity, spacing, size controls |
| **NavItem** | View switching navigation | Library, Calendar, Timeline tabs |
| **GenericContextMenu** | Right-click menus on interactive elements | Card actions, Pawkit collection management |

### Glow Application Decision Tree

```
Does this element support interaction?
├─ YES → Continue
│   └─ Is it a primary action?
│       ├─ YES → Use purple glow on hover + selected
│       └─ NO → Use subtle hover state (bg-white/5)
│
└─ NO → Use glass only (no glow)
```

**Examples**:

✅ **Gets Purple Glow**:
- Workspace switcher buttons (primary interaction)
- Filter buttons (primary interaction)
- Active navigation items (selected state)
- Interactive cards on hover (content selection)
- Primary action buttons (save, submit)

❌ **Glass Only (No Glow)**:
- Static text labels
- Non-interactive cards (read-only displays)
- Disabled buttons
- Background panels
- Dividers

---

## MIGRATION GUIDE

### Priority 1: Fix Dig Up Modal

**File**: `components/modals/dig-up-modal.tsx` (or wherever it lives)

**Changes Required**:
1. Remove 🐕 emoji → Replace with `<Sparkles>` icon
2. Convert to GlassModal pattern with top/bottom bars
3. Update buttons to glass pill style
4. Use `rounded-3xl` for content area

**Before**:
```tsx
<div className="text-center p-8">
  <div className="text-6xl mb-4">🐕</div>
  <h2 className="text-2xl font-bold mb-4">Dig Up Something New</h2>
  <button className="px-6 py-3 bg-purple-500 rounded">
    Start Digging
  </button>
</div>
```

**After**:
```tsx
<GlassModal
  open={digUpOpen}
  onClose={() => setDigUpOpen(false)}
  title="Discover Something New"
  primaryAction={{
    label: "Start Discovering",
    onClick: handleDigUp
  }}
>
  <div className="text-center space-y-4">
    <div className="inline-flex p-4 rounded-full bg-purple-500/10 border border-purple-500/20">
      <Sparkles className="h-8 w-8 text-purple-400" />
    </div>
    <p className="text-gray-300">
      Let Pawkit surface a forgotten bookmark from your collection
    </p>
  </div>
</GlassModal>
```

### Priority 2: Update Navigation Indicators

**Files**: Any nav component showing current view

**Change**: Update active indicator from thin underline to thicker bar with glow

```tsx
// Before
<div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-500" />

// After
<div className="absolute bottom-0 left-0 right-0 h-1 bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.6)] rounded-full" />
```

### Priority 3: Convert Flat Purple Tooltips to Glass Popovers

**Search for**: `bg-purple-500` in tooltip/popover components

**Replace with**: Glass popover pattern

```tsx
// Before
<div className="absolute bg-purple-500 text-white rounded px-4 py-2">
  Tooltip Text
</div>

// After
<div className="absolute backdrop-blur-md bg-gray-900/90 border border-white/10 rounded-xl px-4 py-2 shadow-[0_0_30px_rgba(0,0,0,0.5)]">
  Tooltip Text
</div>
```

### Priority 4: Update Sliders in Right Sidebar

**Files**: Control panel components with range inputs

**Replace**: Browser default sliders with GlassSlider component

### Priority 5: Replace All Emojis with Line Icons

**Search for**: Emoji unicode characters in JSX

**Replace with**: lucide-react icons

Common replacements:
- 🐕 → `<Sparkles>`
- 🔖 → `<Bookmark>`
- 📅 → `<Calendar>`
- ⚙️ → `<Settings>`
- ❌ → `<X>`
- ➕ → `<Plus>`
- 🗑️ → `<Trash2>`

---

## CODE EXAMPLES FROM CODEBASE

### ✅ User Loves These Patterns

**Card Detail Modal** (Reference this style):
- Glass top bar with title + close button
- Clean content area with `rounded-3xl`
- Glass pill bottom bar with action buttons

**Bookmark Cards in Library**:
- `rounded-3xl` glass cards
- Purple glow on hover
- Glass URL pills inside cards
- Product image previews

**"Personal" Workspace Button**:
- Glass pill shape (`rounded-full`)
- Purple glow on selected state
- Smooth transitions

### ⚠️ User Wants These Fixed

**Dig Up Modal**:
- ❌ Remove 🐕 emoji
- ❌ Remove clunky plain buttons
- ✅ Use GlassModal pattern
- ✅ Use `<Sparkles>` icon
- ✅ Use glass pill buttons

**Flat Purple Tooltips**:
- ❌ Solid purple backgrounds
- ✅ Glass blur popovers with `backdrop-blur-md`

**Thin Navigation Indicators**:
- ❌ `h-0.5` underlines (too minimal)
- ✅ `h-1` bars with purple glow

**Browser Default Sliders**:
- ❌ Native range input styling
- ✅ Custom glass slider with purple fill

---

## ACCESSIBILITY

All glass components must maintain WCAG 2.1 AA standards:

### Contrast Requirements
- Text on glass backgrounds: minimum 4.5:1 contrast
- Purple-300 text on dark backgrounds: ✅ Passes
- Gray-400 text on glass: ✅ Passes

### Keyboard Navigation
- All glass pill buttons: Tab, Enter, Space
- Glass modals: Escape to close, Tab to cycle focus
- Glass sliders: Arrow keys to adjust value

### Screen Readers
- Icon-only buttons need `aria-label`
- Glass modals need `aria-labelledby` for title
- Sliders need `aria-valuemin`, `aria-valuemax`, `aria-valuenow`

### Focus Indicators
Purple glow serves as focus indicator (don't disable outline!)

```tsx
<button className="
  focus:outline-none
  focus:ring-2 focus:ring-purple-500
  focus:shadow-[0_0_20px_rgba(168,85,247,0.5)]
">
  Glass Button
</button>
```

---

## QUALITY CHECKLIST

Before marking UI work complete, verify:

### Visual Consistency
- [ ] Uses glass base (`backdrop-blur-md bg-white/5`)
- [ ] Purple glow for interactions only (not everywhere)
- [ ] `rounded-full` for pills, `rounded-3xl` for cards
- [ ] `rounded-xl` for popovers
- [ ] Line icons only (no emojis)

### Interaction States
- [ ] Inactive: Glass only
- [ ] Hover: Purple glow appears
- [ ] Selected: Constant purple glow
- [ ] Active: Enhanced glow (if applicable)

### Code Quality
- [ ] Uses shared components (GlassPillButton, GlassCard, etc.)
- [ ] Includes transition animations (`transition-all duration-200`)
- [ ] Proper TypeScript types
- [ ] Accessibility attributes (aria-label, etc.)

### Testing
- [ ] Tested hover states
- [ ] Tested selected states
- [ ] Keyboard navigation works
- [ ] Looks good on dark background
- [ ] No console errors

---

## RESOURCES

### Icon Library
- **lucide-react**: https://lucide.dev
- Search icons: https://lucide.dev/icons

### Tailwind Utilities
- **Backdrop Blur**: `backdrop-blur-sm`, `backdrop-blur-md`, `backdrop-blur-lg`
- **Box Shadow** (glow): `shadow-[0_0_20px_rgba(168,85,247,0.4)]`
- **Border Opacity**: `border-white/10`, `border-purple-500/50`
- **Background Opacity**: `bg-white/5`, `bg-purple-500/20`

### Reference Files
- **UI_AUDIT.md**: Current pattern analysis
- **pawkit-conventions.md**: Data model conventions
- **pawkit-roadmap/SKILL.md**: Feature roadmap

---

**Last Updated**: October 31, 2025 (Added Context Menu System)
**Design System**: Selective Glow v1.0
**Status**: Official Pawkit UI Language

**Key Principle**: Glass is foundation. Purple glow reveals interaction. Hierarchy over chaos.
