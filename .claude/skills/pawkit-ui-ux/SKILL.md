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

### 8. CALENDAR COMPONENTS

**Purpose**: Calendar-specific UI patterns for month/week navigation, day details, and event management

**Created**: January 2, 2025 (Calendar View Improvements)

#### Month Grid Selector

**Use Case**: Quick month navigation without arrows - direct jump to any month

**Pattern**: 3x4 grid of month buttons (Jan-Dec) in calendar sidebar controls

```tsx
<div className="grid grid-cols-4 gap-2">
  {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((month, index) => {
    const monthDate = new Date(currentMonth.getFullYear(), index, 1);
    const isCurrentMonth = isSameMonth(monthDate, currentMonth);
    const isToday = isSameMonth(monthDate, new Date());

    return (
      <button
        key={month}
        onClick={() => setCurrentMonth(monthDate)}
        className={cn(
          "px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
          isCurrentMonth
            ? "bg-purple-500/20 border border-purple-500/50 shadow-[0_0_15px_rgba(168,85,247,0.3)] text-purple-200"
            : "bg-surface-soft border border-subtle text-muted-foreground hover:border-purple-500/50 hover:text-foreground"
        )}
      >
        {month}
      </button>
    );
  })}
</div>
```

**✅ DO**:
- Use 3x4 grid layout (grid-cols-4)
- Show all 12 months at once for quick access
- Highlight current month with purple glow
- Show subtle indicator for today's month
- Use abbreviated month names (Jan, Feb, etc.)

**❌ DON'T**:
- Use dropdown select (less visual, requires clicks)
- Use prev/next arrows only (slower navigation)
- Hide months behind menus

#### Content Type Filters

**Use Case**: Filter calendar events by type for future AI auto-categorization

**Pattern**: Checkbox filters with glass pill styling

```tsx
const contentFilters = [
  { id: "movies-shows", label: "Movies & Shows", icon: Film },
  { id: "concerts-events", label: "Concerts & Events", icon: Music },
  { id: "deadlines", label: "Deadlines", icon: Clock },
  { id: "product-launches", label: "Product Launches", icon: Rocket },
  { id: "other-events", label: "Other Events", icon: Calendar },
  { id: "daily-notes", label: "Daily Notes", icon: FileText },
];

<div className="space-y-2">
  {contentFilters.map((filter) => (
    <label
      key={filter.id}
      className="flex items-center gap-2 p-2 rounded-lg hover:bg-surface-soft transition-colors cursor-pointer"
    >
      <input
        type="checkbox"
        checked={activeFilters.includes(filter.id)}
        onChange={() => toggleContentFilter(filter.id)}
        className="rounded border-subtle"
      />
      <filter.icon size={16} className="text-muted-foreground" />
      <span className="text-sm text-foreground">{filter.label}</span>
    </label>
  ))}
</div>
```

**✅ DO**:
- Use lucide-react icons for each filter type
- Store filter state in calendar store
- Prepare for future AI detection
- Make filters collapsible to save space

**❌ DON'T**:
- Hard-code event type detection (prepare for AI)
- Use radio buttons (events can have multiple types)

#### Week View Layout

**Use Case**: Show week at a glance with all events visible

**Pattern**: Horizontal columns (7 days side-by-side) with vertical scrolling per day

```tsx
<div className="grid grid-cols-7 gap-3">
  {weekDays.map((day, index) => {
    const dateStr = format(day, 'yyyy-MM-dd');
    const dayCards = cardsByDate.get(dateStr) || [];
    const dailyNote = dailyNotesByDate.get(dateStr);
    const isCurrentDay = isClient ? isSameDay(day, new Date()) : false;

    return (
      <div
        key={index}
        className={cn(
          "card-hover rounded-2xl border transition-all flex flex-col",
          isCurrentDay
            ? "border-accent bg-accent/5"
            : "border-subtle bg-surface"
        )}
      >
        {/* Day header */}
        <div className="p-3 border-b border-white/5">
          <div className="text-sm font-semibold text-center">
            {format(day, 'EEE')}
          </div>
          <div className={cn(
            "text-xs text-center",
            isCurrentDay ? "text-accent" : "text-muted-foreground"
          )}>
            {format(day, 'MMM d')}
          </div>
        </div>

        {/* Scrollable events container */}
        <div className="flex-1 p-2 space-y-2 overflow-y-auto max-h-[500px]">
          {/* Daily note */}
          {dailyNote && (
            <button className="w-full text-left px-2 py-1.5 rounded-lg bg-purple-500/20 border border-purple-400/30 text-xs text-purple-200">
              <FileText size={12} className="inline mr-1" />
              Daily Note
            </button>
          )}

          {/* Scheduled cards */}
          {dayCards.map((card) => (
            <button
              key={card.id}
              className="w-full text-left px-2 py-1 rounded-lg bg-surface-soft hover:bg-surface transition-colors text-xs"
            >
              {card.title || card.domain || card.url}
            </button>
          ))}
        </div>
      </div>
    );
  })}
</div>
```

**✅ DO**:
- Use grid-cols-7 for side-by-side days
- Make each day column scrollable independently
- Highlight today with accent color
- Show day name (EEE) and date (MMM d)
- Use max-h-[500px] to prevent excessive height

**❌ DON'T**:
- Use full-width horizontal layout (hard to scan)
- Make entire week scroll together
- Show too many events per day (truncate or scroll)

#### Day Details Panel

**Use Case**: Detailed view of single day when clicked from calendar

**Pattern**: Sidebar panel that slides in (replaces calendar controls temporarily)

```tsx
export function DayDetailsPanel() {
  const selectedDay = useCalendarStore((state) => state.selectedDay);
  const setSelectedDay = useCalendarStore((state) => state.setSelectedDay);
  const { openCalendarControls } = usePanelStore();

  const handleClose = () => {
    setSelectedDay(null);
    openCalendarControls(); // Return to calendar controls
  };

  if (!selectedDay) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Select a day to view details</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">
          {format(selectedDay, 'EEEE, MMMM d, yyyy')}
        </h2>
        <GlowButton onClick={handleClose} variant="ghost" size="sm">
          Close Daily View
        </GlowButton>
      </div>

      {/* Daily Note */}
      {dailyNote && (
        <div className="p-4 rounded-2xl border border-subtle bg-surface">
          <div className="flex items-center gap-2 mb-2">
            <FileText size={16} className="text-purple-400" />
            <span className="font-medium">{dailyNote.title}</span>
          </div>
          <p className="text-sm text-muted-foreground">
            {dailyNote.content?.substring(0, 200)}...
          </p>
        </div>
      )}

      {/* Scheduled Cards */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-foreground">
          Scheduled ({scheduledCards.length})
        </h3>
        {scheduledCards.map((card) => (
          <div key={card.id} className="p-3 rounded-lg bg-surface-soft border border-subtle">
            {card.title || card.domain || card.url}
          </div>
        ))}
      </div>

      {/* Add Event Button */}
      <GlowButton onClick={() => setShowAddEventModal(true)} variant="primary">
        + Add Event
      </GlowButton>
    </div>
  );
}
```

**✅ DO**:
- Return to calendar controls on close (not blank state)
- Show full date format (EEEE, MMMM d, yyyy)
- Group daily note and scheduled events clearly
- Use createPortal for Add Event modal

**❌ DON'T**:
- Show blank screen when no day selected
- Use restorePreviousContent() on close (causes blank screen)
- Render modal inside panel (z-index issues)

#### Add Event Modal

**Use Case**: Quick event creation for specific date from calendar

**Pattern**: Glass modal with title/URL inputs, rendered at document.body

```tsx
export function AddEventModal({
  open,
  onClose,
  scheduledDate,
}: AddEventModalProps) {
  const { addCard } = useDataStore();
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    await addCard({
      type: 'url',
      title: title.trim(),
      url: url.trim() || undefined,
      scheduledDate: scheduledDate.toISOString(),
      tags: [],
      collections: []
    });

    onClose();
    setTitle("");
    setUrl("");
  };

  if (!open) return null;

  const modalContent = (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-lg p-6 w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-semibold mb-4">Add Event</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Event title"
            className="w-full px-4 py-2 rounded-lg bg-surface border border-subtle"
          />
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="URL (optional)"
            className="w-full px-4 py-2 rounded-lg bg-surface border border-subtle"
          />
          <div className="flex gap-3">
            <GlowButton type="button" onClick={onClose} variant="ghost">
              Cancel
            </GlowButton>
            <GlowButton type="submit" variant="primary">
              Add Event
            </GlowButton>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
```

**✅ DO**:
- Use createPortal to render at document.body
- Use z-[200] to appear above sidebar (z-[102])
- Include both title and URL fields
- Clear form on submit/close

**❌ DON'T**:
- Render modal inside sidebar component (z-index issues)
- Forget to stopPropagation on modal click
- Use z-index lower than sidebar

#### Dynamic View Toggle Button

**Use Case**: Switch between month and week view from calendar controls

**Pattern**: Button label changes based on current view mode

```tsx
const viewMode = useCalendarStore((state) => state.viewMode);
const setViewMode = useCalendarStore((state) => state.setViewMode);
const setCurrentMonth = useCalendarStore((state) => state.setCurrentMonth);

const handleToggleView = () => {
  setCurrentMonth(new Date()); // Jump to current month/week
  setViewMode(viewMode === "week" ? "month" : "week");
};

<GlowButton onClick={handleToggleView} variant="secondary" className="w-full">
  {viewMode === "week" ? (
    <>
      <Calendar size={16} />
      View This Month
    </>
  ) : (
    <>
      <CalendarRange size={16} />
      View This Week
    </>
  )}
</GlowButton>
```

**✅ DO**:
- Change button label based on view mode
- Jump to current month/week on toggle
- Use Calendar icon for month, CalendarRange for week
- Show what the button WILL switch to (not current state)

**❌ DON'T**:
- Keep static "View This Week" label
- Just jump to today without changing view mode
- Show current mode (confusing - show action instead)

---

### 9. CONTEXT MENUS

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

### 10. RIGHT SIDEBAR PATTERNS

**Purpose**: Control panels for view-specific settings (sorting, filtering, display options)

**Implementation**: Uses `PanelSection` component with consistent structure across all views

**Created**: January 13, 2025 (Sidebar Visual Consistency Update)

#### PanelSection Component Pattern

**Anatomy**:
```tsx
<PanelSection
  id="section-id"           // Unique identifier for collapse state
  title="Section Title"     // Display name
  icon={<Icon className="h-4 w-4 text-accent" />}  // Section icon
  action={<Badge>5</Badge>} // Optional: Badge or action button
>
  <div className="space-y-2">
    {/* Section content */}
  </div>
</PanelSection>
```

**Properties**:
- `id`: Used for managing collapse state persistence
- `title`: Always title case (e.g., "Sort", "View", "Display")
- `icon`: Lucide icon, always `h-4 w-4 text-accent`
- `action`: Optional badge/button shown in header (e.g., todo count)

#### Controls Component Structure

**✅ Correct Pattern**:
```tsx
export function HomeControls() {
  return (
    <>
      {/* Todos Section - Always first */}
      <TodosSection />

      {/* View-specific sections */}
      <PanelSection id="stats" title="Stats" icon={<BarChart className="h-4 w-4 text-accent" />}>
        {/* Stats content */}
      </PanelSection>

      <PanelSection id="activity" title="Activity" icon={<Activity className="h-4 w-4 text-accent" />}>
        {/* Activity content */}
      </PanelSection>
    </>
  );
}
```

**❌ Wrong Pattern**:
```tsx
// Don't wrap in custom container
export function WrongControls() {
  return (
    <div className="flex h-full flex-col">
      <div className="border-b px-6 py-4">
        <h2>Custom Header</h2>
      </div>
      {/* This breaks the consistent spacing */}
    </div>
  );
}
```

#### TodosSection Integration

**Rule**: TodosSection MUST always be the first section in any controls component.

**Example**:
```tsx
import { TodosSection } from "./todos-section";

export function LibraryControls() {
  return (
    <>
      <TodosSection />  {/* Always first */}
      <PanelSection id="filters" ...>
        {/* Other sections follow */}
      </PanelSection>
    </>
  );
}
```

#### Common PanelSection Configurations

**Sort Section**:
```tsx
<PanelSection id="view-sort" title="Sort" icon={<SortAsc className="h-4 w-4 text-accent" />}>
  <div>
    {/* Sort Direction Toggle */}
    <div className="flex items-center justify-between mb-2">
      <span className="text-xs text-muted-foreground">Direction</span>
      <button onClick={handleToggleSortOrder} className="flex items-center gap-1 text-xs text-accent">
        <ArrowUpDown size={12} />
        {sortOrder === "asc" ? "Ascending" : "Descending"}
      </button>
    </div>
    {/* Sort Options */}
    <div className="flex flex-col gap-2">
      <PanelButton active={sortBy === "title"} onClick={() => handleSortChange("title")}>
        Title
      </PanelButton>
      {/* More sort options */}
    </div>
  </div>
</PanelSection>
```

**View Section**:
```tsx
<PanelSection id="view-layout" title="View" icon={<Eye className="h-4 w-4 text-accent" />}>
  <div className="flex flex-col gap-2">
    <PanelButton active={layout === "grid"} onClick={() => setLayout("grid")} icon={<Grid size={16} />}>
      Grid
    </PanelButton>
    <PanelButton active={layout === "list"} onClick={() => setLayout("list")} icon={<List size={16} />}>
      List
    </PanelButton>
    <PanelButton active={layout === "compact"} onClick={() => setLayout("compact")} icon={<Columns size={16} />}>
      Compact
    </PanelButton>
  </div>
</PanelSection>
```

**Display Section**:
```tsx
<PanelSection id="view-display" title="Display" icon={<Maximize2 className="h-4 w-4 text-accent" />}>
  <div className="space-y-2">
    <div className="flex items-center justify-between text-xs text-muted-foreground">
      <span>Card Size</span>
      <span>{Math.round(cardSizeValue)}%</span>
    </div>
    <input
      type="range"
      min="1"
      max="100"
      value={cardSizeValue}
      onChange={(e) => handleCardSizeChange(Number(e.target.value))}
      className="w-full accent-accent"
    />
  </div>
</PanelSection>
```

---

### 11. VIEW PATTERNS

**Purpose**: Three distinct layout modes for browsing different types of content

**Implementation**: Grid, List, and Compact views serving specific use cases

**Created**: January 13, 2025 (Pawkits View Redesign)

#### Three-View System

**Grid View**:
- **Use Case**: Visual browsing with rich previews
- **Best For**: Cards with images, Pawkits with previews
- **Layout**: Responsive grid with card previews
- **Features**: Image thumbnails, preview stacks, hover effects

**List View**:
- **Use Case**: Data table for scanning metadata
- **Best For**: Reviewing dates, counts, hierarchies
- **Layout**: Full-width table with sortable columns
- **Features**: Multiple columns, inline metadata, table headers

**Compact View**:
- **Use Case**: Dense grid for maximum item visibility
- **Best For**: Quick scanning, space efficiency
- **Layout**: 2-6 column responsive grid (no previews)
- **Features**: Icon + title only, minimal footprint

#### Grid View Pattern

**Structure**:
```tsx
<div
  className="grid gap-6"
  style={{
    gridTemplateColumns: `repeat(auto-fill, minmax(${minWidth}px, 1fr))`
  }}
>
  {items.map((item) => (
    <div key={item.id} className="card-hover group relative flex h-56 cursor-pointer flex-col rounded-2xl border-2 p-5">
      {/* Card header */}
      <div className="flex items-center justify-between pb-4">
        <span className="flex items-center gap-2 text-sm font-semibold">
          <Icon size={16} />
          {item.name}
        </span>
        <span className="text-xs text-muted-foreground">
          {item.count} items
        </span>
      </div>

      {/* Preview area */}
      <div className="relative h-full w-full overflow-hidden">
        {/* Preview tiles positioned absolutely */}
      </div>
    </div>
  ))}
</div>
```

**Key Features**:
- Responsive `auto-fill` grid
- Fixed height cards (h-56)
- Preview area with absolutely positioned thumbnails
- Hover effects with `card-hover` class

#### List View Pattern

**Structure**:
```tsx
<div className="w-full overflow-x-auto">
  <table className="w-full border-collapse">
    <thead>
      <tr className="border-b border-subtle text-xs text-muted-foreground">
        <th className="text-left py-3 px-4 font-medium">Name</th>
        <th className="text-left py-3 px-4 font-medium">Items</th>
        <th className="text-left py-3 px-4 font-medium">Sub-Pawkits</th>
        <th className="text-left py-3 px-4 font-medium">Date Created</th>
        <th className="text-left py-3 px-4 font-medium">Last Activity</th>
        <th className="text-left py-3 px-4 font-medium w-16"></th>
      </tr>
    </thead>
    <tbody>
      {items.map((item) => (
        <tr
          key={item.id}
          onClick={() => handleClick(item)}
          className="border-b border-subtle hover:bg-white/5 cursor-pointer transition-colors"
        >
          <td className="py-3 px-4">
            <div className="flex items-center gap-3">
              <Icon size={16} />
              <span className="text-sm text-foreground font-medium">{item.name}</span>
              {item.isPinned && <Pin size={14} className="text-purple-400" />}
            </div>
          </td>
          <td className="py-3 px-4">
            <span className="text-sm text-muted-foreground">{item.count} items</span>
          </td>
          <td className="py-3 px-4">
            <span className="text-sm text-muted-foreground">
              {item.hasChildren ? "Yes" : "-"}
            </span>
          </td>
          <td className="py-3 px-4">
            <span className="text-sm text-muted-foreground">{formattedCreatedAt}</span>
          </td>
          <td className="py-3 px-4">
            <span className="text-sm text-muted-foreground">{formattedUpdatedAt}</span>
          </td>
          <td className="py-3 px-4">
            {/* Actions menu */}
          </td>
        </tr>
      ))}
    </tbody>
  </table>
</div>
```

**Key Features**:
- Full-width table with `overflow-x-auto` for horizontal scroll
- Semantic HTML table structure
- Hover state on rows (`hover:bg-white/5`)
- Text alignment: left for all columns
- Consistent padding: `py-3 px-4`
- Last column: fixed width for actions (`w-16`)

#### Compact View Pattern

**Structure**:
```tsx
<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
  {items.map((item) => (
    <div
      key={item.id}
      onClick={() => handleClick(item)}
      className="group relative flex flex-col items-center gap-2 p-4 rounded-xl border cursor-pointer transition-all hover:scale-105 border-purple-500/30 bg-surface/80"
    >
      {/* Icon */}
      <span className="flex items-center justify-center h-12 w-12 rounded-lg bg-accent/20 text-accent">
        {item.isPrivate ? '🔒' : '📁'}
      </span>

      {/* Name */}
      <div className="text-center w-full">
        <div className="text-sm font-semibold text-foreground truncate">
          {item.name}
        </div>
        <div className="text-xs text-muted-foreground mt-1">
          {item.count} {item.count === 1 ? "item" : "items"}
        </div>
      </div>

      {/* Actions menu - show on hover */}
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <ActionsMenu />
      </div>
    </div>
  ))}
</div>
```

**Key Features**:
- Responsive grid: 2 cols on mobile, up to 6 on xl screens
- Icon-centric design (no previews)
- Hover scale effect (`hover:scale-105`)
- Actions menu appears on hover
- Minimal footprint for maximum density

#### View Switching Implementation

**Using View Settings Store**:
```tsx
const viewSettings = useViewSettingsStore((state) => state.getSettings("viewKey"));
const layout = viewSettings.layout;

if (layout === "list") {
  return <ListView items={items} />;
}

if (layout === "compact") {
  return <CompactView items={items} />;
}

// Default: grid view
return <GridView items={items} />;
```

---

### 12. ICON PATTERNS

**Purpose**: Consistent icon usage across the application

**Implementation**: Lucide React icons with standardized sizing and colors

**Created**: January 13, 2025 (Icon Standardization)

#### Pin Icon Standard

**Usage**: Indicating pinned items (Pawkits, cards, etc.)

**Pattern**:
```tsx
import { Pin } from "lucide-react";

{item.isPinned && <Pin size={14} className="text-purple-400" />}
```

**Rules**:
- **Size**: Always `14` (pixels)
- **Color**: Always `text-purple-400`
- **Placement**: After item name in Grid/List views
- **Conditional**: Only show when `isPinned` is true

**✅ DO**:
```tsx
<div className="flex items-center gap-3">
  <span>Pawkit Name</span>
  {isPinned && <Pin size={14} className="text-purple-400" />}
</div>
```

**❌ DON'T**:
```tsx
// Don't use emoji
{isPinned && <span>⭐</span>}

// Don't use different size
<Pin size={16} className="text-purple-400" />

// Don't use different color
<Pin size={14} className="text-accent" />
```

#### Date Formatting Standards

**Purpose**: Consistent date display across all views

**Absolute Dates** (for "Date Created" columns):
```tsx
const formattedCreatedAt = dateString
  ? new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  : "-";

// Output: "Nov 10, 2025"
```

**Relative Dates** (for "Last Activity" columns):
```tsx
import { formatDistanceToNow } from 'date-fns';

const formattedUpdatedAt = dateString
  ? formatDistanceToNow(new Date(dateString), { addSuffix: true })
  : "-";

// Output: "2 hours ago", "3 days ago"
```

**Rules**:
- Use absolute dates for creation timestamps
- Use relative dates for recent activity
- Always provide fallback "-" for missing dates
- Use `date-fns` library for relative formatting

#### System Pawkit Icons

**All Pawkits Pawkit**:
```tsx
import { Inbox } from "lucide-react";

<span className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/30 text-purple-300">
  <Inbox size={16} />
</span>
```

**Rules**:
- Use `Inbox` icon for system Pawkits
- Background: `bg-purple-500/30`
- Text color: `text-purple-300`
- Size: `16` pixels
- Container: `h-8 w-8 rounded-lg`

---

### 13. LIST VIEW STANDARDIZATION

**Purpose**: Unified data table patterns across all views (Pawkits, Notes, Library)

**Implementation**: Pixel-perfect consistency in row height, padding, font sizes, and column structure

**Created**: January 13, 2025 (List View Consistency Update)

#### Canonical List View Pattern

**✅ REQUIRED STRUCTURE**: All list views MUST follow this exact pattern.

```tsx
<div className="w-full overflow-x-auto">
  <table className="w-full border-collapse">
    <thead>
      <tr className="border-b border-subtle text-xs text-muted-foreground">
        <th className="text-left py-3 px-4 font-medium">Name</th>
        <th className="text-left py-3 px-4 font-medium">Type</th>
        <th className="text-left py-3 px-4 font-medium">Tags</th>
        <th className="text-left py-3 px-4 font-medium">Date Created</th>
        <th className="text-left py-3 px-4 font-medium">Date Modified</th>
        <th className="text-left py-3 px-4 font-medium w-16"></th>
      </tr>
    </thead>
    <tbody>
      {items.map((item) => (
        <tr
          key={item.id}
          onClick={() => handleClick(item)}
          className="border-b border-subtle hover:bg-white/5 cursor-pointer transition-colors"
        >
          <td className="py-3 px-4 max-w-xs">
            <div className="flex items-center gap-3 min-w-0">
              {/* Icon container - REQUIRED */}
              <span className="flex items-center justify-center h-8 w-8 rounded-lg backdrop-blur-sm bg-accent/20 text-accent flex-shrink-0">
                <Icon size={16} className="text-purple-400" />
              </span>
              {/* Title with truncation support */}
              <span className="text-sm text-foreground font-medium truncate min-w-0 flex-1">
                {item.title}
              </span>
              {/* Pin indicator */}
              {item.isPinned && <Pin size={14} className="text-purple-400 flex-shrink-0" />}
            </div>
          </td>
          <td className="py-3 px-4">
            <span className="text-sm text-muted-foreground">{item.type}</span>
          </td>
          <td className="py-3 px-4">
            <span className="text-sm text-muted-foreground">{item.tags}</span>
          </td>
          <td className="py-3 px-4">
            <span className="text-sm text-muted-foreground">{formattedCreatedAt}</span>
          </td>
          <td className="py-3 px-4">
            <span className="text-sm text-muted-foreground">{formattedUpdatedAt}</span>
          </td>
          <td className="py-3 px-4">
            <ActionsMenu item={item} />
          </td>
        </tr>
      ))}
    </tbody>
  </table>
</div>
```

#### Critical Dimensions

**Row Structure**:
- **Row padding**: `py-3 px-4` (ALWAYS - no exceptions)
- **Row hover**: `hover:bg-white/5 cursor-pointer transition-colors`
- **Row border**: `border-b border-subtle`

**Name Column (First Column)**:
- **Max width**: `max-w-xs` on `<td>` for truncation
- **Flex container**: `flex items-center gap-3 min-w-0`
- **Icon container**: `h-8 w-8 rounded-lg backdrop-blur-sm flex-shrink-0`
- **Title span**: `text-sm font-medium truncate min-w-0 flex-1`
- **Pin icon**: `size={14} flex-shrink-0` (if pinned)

**Data Columns**:
- **All text**: `text-sm text-muted-foreground` (NOT text-xs!)
- **Padding**: `py-3 px-4` (matches row padding)

**Actions Column (Last Column)**:
- **Width**: `w-16` (fixed width for consistent alignment)
- **Content**: 3-dot menu or action button

#### Icon Container Pattern

**Purpose**: Consistent visual weight and alignment for all list items.

**REQUIRED for all list views**:
```tsx
<span className="flex items-center justify-center h-8 w-8 rounded-lg backdrop-blur-sm bg-accent/20 text-accent flex-shrink-0">
  {isNote ? (
    <FileText size={16} className="text-purple-400" />
  ) : card.image ? (
    <img src={card.image} alt="" className="w-5 h-5 rounded object-cover" />
  ) : (
    <Bookmark size={16} className="text-muted-foreground" />
  )}
</span>
```

**Rules**:
- Always `h-8 w-8` (8x8 units = 32px)
- Always `backdrop-blur-sm` for glass effect
- Always `flex-shrink-0` to prevent squishing
- Icon size: `16` pixels for Lucide icons
- Image size: `w-5 h-5` (20px) for thumbnails

#### URL/Title Truncation Pattern

**Problem**: Long URLs push columns off-screen without proper constraints.

**Solution**: Multi-layer truncation setup using flex constraints.

```tsx
<td className="py-3 px-4 max-w-xs">
  {/* Level 1: max-w-xs limits td width */}
  <div className="flex items-center gap-3 min-w-0">
    {/* Level 2: min-w-0 allows flex child to shrink */}
    <span className="flex items-center justify-center h-8 w-8 flex-shrink-0">
      {/* Icon - never shrinks */}
    </span>
    <span className="text-sm truncate min-w-0 flex-1">
      {/* Level 3: flex-1 + min-w-0 + truncate for ellipsis */}
      {displayTitle}
    </span>
    {isPinned && <Pin size={14} className="flex-shrink-0" />}
    {/* Pin - never shrinks */}
  </div>
</td>
```

**Why each class is required**:
1. `max-w-xs` on `<td>`: Limits overall column width
2. `min-w-0` on flex container: Allows children to shrink below content size
3. `flex-1` on text span: Takes all available space
4. `min-w-0` on text span: Allows text to shrink for truncation
5. `truncate` on text span: Adds ellipsis when overflowing
6. `flex-shrink-0` on icons: Prevents icon squishing

**❌ WRONG** (truncate doesn't work):
```tsx
<td className="py-3 px-4">
  <div className="flex items-center gap-3">
    <Icon />
    <span className="truncate">{title}</span>  {/* No flex-1, no min-w-0! */}
  </div>
</td>
```

**✅ CORRECT**:
```tsx
<td className="py-3 px-4 max-w-xs">
  <div className="flex items-center gap-3 min-w-0">
    <span className="flex-shrink-0"><Icon /></span>
    <span className="text-sm truncate min-w-0 flex-1">{title}</span>
  </div>
</td>
```

#### Standard Column Headers

**Pawkits View**:
- Name | Items | Sub-Pawkits | Date Created | Date Modified | [menu]

**Library/Notes View**:
- Name | Type | Tags | Date Created | Date Modified | [menu]

**Rules**:
- All headers: `text-xs text-muted-foreground font-medium`
- All headers: `text-left py-3 px-4`
- Last column: `w-16` (fixed width for actions)

#### 3-Dot Actions Menu

**Pattern**: Portal-based dropdown menu for row actions.

**Implementation**:
```tsx
function CardActionsMenu({ card, onDelete, onAddToPawkit, isPinned, onPinToggle, onOpenDetails }: Props) {
  const [showMenu, setShowMenu] = useState(false);
  const [mounted, setMounted] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleOpenDetails = () => {
    onOpenDetails(card.id);
    setShowMenu(false);
  };

  const handlePinToggle = async () => {
    await onPinToggle();
    setShowMenu(false);
  };

  const handleDelete = async () => {
    if (confirm("Are you sure you want to delete this card?")) {
      await onDelete();
      setShowMenu(false);
    }
  };

  const menuContent = showMenu && mounted && buttonRef.current ? (
    <div className="fixed z-[9999]" style={{
      top: `${buttonRef.current.getBoundingClientRect().bottom + 4}px`,
      left: `${buttonRef.current.getBoundingClientRect().left}px`,
    }}>
      <div className="backdrop-blur-lg bg-gray-950/95 border border-white/10 rounded-lg shadow-lg p-1 min-w-[160px]">
        <button onClick={handleOpenDetails} className="w-full text-left px-3 py-2 text-sm rounded hover:bg-white/10 transition-colors flex items-center gap-2">
          <ExternalLink size={14} />
          Open
        </button>
        <button onClick={handlePinToggle} className="w-full text-left px-3 py-2 text-sm rounded hover:bg-white/10 transition-colors flex items-center gap-2">
          <Pin size={14} />
          {isPinned ? "Unpin" : "Pin"}
        </button>
        <button onClick={handleDelete} className="w-full text-left px-3 py-2 text-sm rounded hover:bg-white/10 transition-colors flex items-center gap-2 text-rose-400">
          <Trash2 size={14} />
          Delete
        </button>
      </div>
    </div>
  ) : null;

  return (
    <>
      <button
        ref={buttonRef}
        onClick={(e) => {
          e.stopPropagation();
          setShowMenu(!showMenu);
        }}
        className="p-1 rounded hover:bg-white/10 transition-colors"
      >
        <MoreVertical size={16} className="text-muted-foreground" />
      </button>
      {mounted && createPortal(menuContent, document.body)}
    </>
  );
}
```

**Key Features**:
- Portal rendering at `document.body` for proper z-index
- Position calculation using `getBoundingClientRect()`
- `z-[9999]` to appear above all other UI
- Click outside to close (via useEffect with document listener)
- `e.stopPropagation()` to prevent row click

#### Font Size Standards

**❌ WRONG** (Old pattern - too small):
```tsx
<td className="py-2 px-4">
  <span className="text-xs text-muted-foreground">Content</span>
</td>
```

**✅ CORRECT** (New standard):
```tsx
<td className="py-3 px-4">
  <span className="text-sm text-muted-foreground">Content</span>
</td>
```

**Rules**:
- Headers: `text-xs` (small, de-emphasized)
- Data cells: `text-sm` (readable, scannable)
- Row padding: `py-3` (NOT py-2!)

#### View-Specific Adaptations

**Pawkits List View**:
```tsx
<th className="text-left py-3 px-4 font-medium">Items</th>

// Data cell
<td className="py-3 px-4">
  <span className="text-sm text-muted-foreground">
    {collection.count} item{collection.count === 1 ? "" : "s"}
  </span>
</td>
```

**Library/Notes List View**:
```tsx
<th className="text-left py-3 px-4 font-medium">Type</th>

// Data cell
<td className="py-3 px-4">
  <span className="text-sm text-muted-foreground">
    {isNote ? "Note" : "URL"}
  </span>
</td>
```

#### ✅ DO

- Use exact row padding: `py-3 px-4` (no variation!)
- Include icon container with `h-8 w-8 backdrop-blur-sm`
- Use `text-sm` for all data cells (not text-xs)
- Add `font-medium` to title/name text
- Use `max-w-xs min-w-0 flex-1` pattern for truncation
- Use `flex-shrink-0` on icons and badges
- Use Pin size 14 (not 12 or 16)
- Test with extremely long URLs to verify truncation

#### ❌ DON'T

- Use `py-2` for row padding (old pattern - too cramped)
- Use `text-xs` for data cells (old pattern - too small)
- Skip the icon container (causes alignment issues)
- Forget `min-w-0` on flex containers (breaks truncation)
- Use `truncate` without `flex-1 min-w-0` (doesn't work!)
- Vary padding or font sizes between views
- Add custom table headers without matching other views

#### Migration Checklist

When updating a list view to this standard:

1. ✅ Update row padding from `py-2` to `py-3`
2. ✅ Update data cell text from `text-xs` to `text-sm`
3. ✅ Add icon container with `h-8 w-8` dimensions
4. ✅ Add `backdrop-blur-sm` to icon container
5. ✅ Update pin icon size from `12` to `14`
6. ✅ Add `font-medium` to title text
7. ✅ Apply truncation pattern (max-w-xs, min-w-0, flex-1)
8. ✅ Add `flex-shrink-0` to all icons and badges
9. ✅ Test with long URLs to verify truncation works
10. ✅ Verify row height matches other list views

#### Files Implementing This Pattern

- `components/library/card-gallery.tsx` (Library/Notes list view)
- `components/pawkits/grid.tsx` (Pawkits list view)
- Future: All list views MUST follow this pattern

---

### 14. FOLDER ICON STANDARDIZATION

**Purpose**: Consistent folder representation using Lucide Folder icon

**Implementation**: Replace all emoji folder icons with Lucide React component

**Created**: January 13, 2025 (Icon Consistency Update)

#### Standard Folder Icon Pattern

**✅ CORRECT**:
```tsx
import { Folder } from "lucide-react";

<Folder size={16} className="text-purple-400" />
```

**❌ WRONG**:
```tsx
// NO emojis!
📁
```

#### Size Guidelines by Context

**Small** (List items, inline badges):
```tsx
<Folder size={14} className="text-purple-400" />  // 14px for badges
<Folder size={16} className="text-purple-400" />  // 16px for list icons
```

**Medium** (Icon containers, buttons):
```tsx
<Folder size={16} className="text-purple-400" />  // Standard icon container
<Folder size={20} className="text-purple-400" />  // Larger containers
```

**Large** (Headers, feature areas):
```tsx
<Folder size={24} className="text-purple-400" />  // Section headers
```

#### Usage in Collection Tree Picker

**Modal/Dialog Tree Picker**:
```tsx
<button className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/5">
  <Folder className="h-4 w-4 text-purple-400" />
  <span>{collection.name}</span>
</button>
```

#### Usage in Collection Badges

**Inline Collection Badges**:
```tsx
<Badge variant="secondary" className="flex items-center gap-1.5">
  <Folder className="h-3 w-3 text-purple-400" />
  {collectionName}
</Badge>
```

#### Usage in List Views

**Icon Container Pattern**:
```tsx
<span className="flex items-center justify-center h-8 w-8 rounded-lg backdrop-blur-sm bg-accent/20 text-accent">
  <Folder size={16} className="text-purple-400" />
</span>
```

#### Usage in Grid/Compact Views

**Pawkit Card Icon**:
```tsx
<span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/20 text-accent">
  <Folder size={16} className="text-purple-400" />
</span>
```

#### Color Standard

**ALWAYS use `text-purple-400`** for folder icons (consistency with purple theme).

**Exception**: System pawkits use Inbox icon with `text-purple-300`:
```tsx
{collection.isSystem ? (
  <Inbox size={16} className="text-purple-300" />
) : (
  <Folder size={16} className="text-purple-400" />
)}
```

#### Files Updated

- `components/pawkits/grid.tsx`
- `components/library/card-gallery.tsx`
- `components/modals/card-detail-modal.tsx`
- `components/dig-up/dig-up-view.tsx`
- `components/home/quick-access-pawkit-card.tsx`

---

### 15. HIERARCHICAL TAG INHERITANCE

**Purpose**: Automatic parent tag inheritance for nested collections

**Implementation**: Utility functions for managing hierarchical collection tags

**Created**: January 13, 2025 (Collection Hierarchy System)

#### Problem Statement

When adding a card to a sub-collection (e.g., "Restaurants > Everett"), the card was only getting the direct collection tag ("everett"), not the parent tag ("restaurants"). This broke filtering at the parent level.

**Before**:
```tsx
// Adding card to "Everett" sub-collection
card.collections = ["everett"]  // Missing "restaurants"!

// Viewing "Restaurants" collection
// Card doesn't show up because it's only tagged with "everett"
```

**After**:
```tsx
// Adding card to "Everett" sub-collection
card.collections = ["everett", "restaurants"]  // ✅ Includes parent!

// Viewing "Restaurants" collection
// Card shows up because it has "restaurants" tag
```

#### Core Utility Functions

**File**: `lib/utils/collection-hierarchy.ts`

**getCollectionHierarchy**:
```tsx
/**
 * Gets the complete hierarchy of collection slugs for a given collection,
 * walking up the parent chain to include all ancestor collections.
 */
export function getCollectionHierarchy(
  targetSlug: string,
  collections: CollectionNode[]
): string[] {
  const collectionMap = new Map<string, CollectionNode>();

  // Flatten nested collections into map
  const flattenCollections = (nodes: CollectionNode[]) => {
    for (const node of nodes) {
      collectionMap.set(node.slug, node);
      if (node.children && node.children.length > 0) {
        flattenCollections(node.children);
      }
    }
  };

  flattenCollections(collections);

  // Walk up hierarchy
  const hierarchy: string[] = [];
  let current = collectionMap.get(targetSlug);

  while (current) {
    hierarchy.push(current.slug);

    if (current.parentId) {
      current = Array.from(collectionMap.values()).find(c => c.id === current!.parentId);
      if (!current) break;
    } else {
      break;
    }
  }

  return hierarchy;  // ["child", "parent", "grandparent"]
}
```

**addCollectionWithHierarchy**:
```tsx
/**
 * Adds a collection and all its parent collections to a card's collection array.
 * Ensures no duplicates and maintains existing collections.
 */
export function addCollectionWithHierarchy(
  currentCollections: string[],
  newCollectionSlug: string,
  allCollections: CollectionNode[]
): string[] {
  const hierarchy = getCollectionHierarchy(newCollectionSlug, allCollections);
  const combined = [...currentCollections, ...hierarchy];
  return Array.from(new Set(combined));  // Remove duplicates
}
```

**removeCollectionWithHierarchy**:
```tsx
/**
 * Removes a collection and optionally its child collections from a card.
 * When removing a parent, can choose to keep or remove orphaned children.
 */
export function removeCollectionWithHierarchy(
  currentCollections: string[],
  collectionToRemove: string,
  allCollections: CollectionNode[],
  removeChildrenToo: boolean = false
): string[] {
  // Build collection map
  const collectionMap = new Map<string, CollectionNode>();
  const flattenCollections = (nodes: CollectionNode[]) => {
    for (const node of nodes) {
      collectionMap.set(node.slug, node);
      if (node.children && node.children.length > 0) {
        flattenCollections(node.children);
      }
    }
  };
  flattenCollections(allCollections);

  let toRemove = new Set([collectionToRemove]);

  // Optionally collect descendants
  if (removeChildrenToo) {
    const collectDescendants = (slug: string) => {
      const collection = collectionMap.get(slug);
      if (collection && collection.children) {
        for (const child of collection.children) {
          toRemove.add(child.slug);
          collectDescendants(child.slug);
        }
      }
    };
    collectDescendants(collectionToRemove);
  }

  return currentCollections.filter(slug => !toRemove.has(slug));
}
```

**isCardInCollectionHierarchy** (for future use):
```tsx
/**
 * Checks if a card should be visible in a collection view, considering hierarchy.
 * A card is visible if it has the collection slug OR any of its descendants.
 */
export function isCardInCollectionHierarchy(
  cardCollections: string[],
  viewCollectionSlug: string,
  allCollections: CollectionNode[]
): boolean {
  // Direct match
  if (cardCollections.includes(viewCollectionSlug)) {
    return true;
  }

  // Check descendants
  const collectionMap = new Map<string, CollectionNode>();
  const flattenCollections = (nodes: CollectionNode[]) => {
    for (const node of nodes) {
      collectionMap.set(node.slug, node);
      if (node.children && node.children.length > 0) {
        flattenCollections(node.children);
      }
    }
  };
  flattenCollections(allCollections);

  const getDescendantSlugs = (slug: string): Set<string> => {
    const descendants = new Set<string>();
    const collection = collectionMap.get(slug);

    if (collection && collection.children) {
      for (const child of collection.children) {
        descendants.add(child.slug);
        const childDescendants = getDescendantSlugs(child.slug);
        childDescendants.forEach(d => descendants.add(d));
      }
    }

    return descendants;
  };

  const descendants = getDescendantSlugs(viewCollectionSlug);
  return cardCollections.some(slug => descendants.has(slug));
}
```

#### Usage in Components

**Adding Card to Collection**:
```tsx
import { addCollectionWithHierarchy } from "@/lib/utils/collection-hierarchy";

const { collections: allCollections } = useDemoAwareStore();

const handleAddToPawkit = (slug: string) => {
  const newCollections = addCollectionWithHierarchy(
    card.collections || [],
    slug,
    allCollections
  );

  updateCard(card.id, { collections: newCollections });
};
```

**Removing Card from Collection**:
```tsx
import { removeCollectionWithHierarchy } from "@/lib/utils/collection-hierarchy";

const handleRemoveFromPawkit = (slug: string) => {
  const newCollections = removeCollectionWithHierarchy(
    card.collections || [],
    slug,
    allCollections,
    true  // Remove children too
  );

  updateCard(card.id, { collections: newCollections });
};
```

#### Data Migration

**Problem**: Existing cards only have child tags, missing parent tags.

**Solution**: API endpoint to backfill missing parent tags.

**Endpoint**: `POST /api/admin/migrate-collection-hierarchy`

**Implementation**: See `app/api/admin/migrate-collection-hierarchy/route.ts`

**Features**:
- Fetches all collections and cards for authenticated user
- Builds hierarchy map
- Identifies cards missing parent tags
- Batch updates cards with complete hierarchy
- Idempotent (safe to run multiple times)

**Response**:
```json
{
  "success": true,
  "message": "Migration complete. Updated 42 cards.",
  "stats": {
    "totalCards": 150,
    "updatedCards": 42,
    "totalCollections": 12
  }
}
```

#### Implementation Files

- `lib/utils/collection-hierarchy.ts` - Core utilities
- `components/library/card-gallery.tsx` - Library/Notes view integration
- `app/(dashboard)/home/page.tsx` - Home view integration
- `app/api/admin/migrate-collection-hierarchy/route.ts` - Migration endpoint

#### ✅ DO

- ALWAYS use `addCollectionWithHierarchy()` when adding collections
- ALWAYS use `removeCollectionWithHierarchy()` when removing collections
- Pass `allCollections` from store (includes hierarchy structure)
- Set `removeChildrenToo: true` when removing from sub-collection
- Run migration endpoint after deploying hierarchy updates

#### ❌ DON'T

- Manually push collection slugs to array (skips parent inheritance!)
- Use direct array manipulation for collection updates
- Forget to pass hierarchical collection tree to utility functions
- Remove parent tags when user removes child tag

#### Future Enhancement

The `isCardInCollectionHierarchy()` function is prepared for future filtering logic:
- Show cards in parent collection if they're in ANY descendant
- Enable "include sub-collections" toggle in UI
- Support hierarchical search/filtering

---

## Toast Notifications

### System Architecture

Pawkit uses a **centralized toast system** with a single global provider for consistency:

**Core Components:**
- `lib/stores/toast-store.ts` - Zustand store for toast state management
- `components/ui/toast.tsx` - Toast UI component with glass morphism styling
- `components/providers/global-toast-provider.tsx` - Single rendering point via React Portal

**Key Properties:**
- **Position**: `fixed top-20 left-1/2 -translate-x-1/2` (top-center of viewport)
- **Z-Index**: `z-[9999]` (above all UI including sidebar at z-[102])
- **Styling**: Glass morphism with backdrop blur (`backdrop-blur-lg bg-gray-900/90`)
- **Colors**: Success (green border), Error (red border), Info (white border)

### Usage Patterns

#### Basic Toast Call

```typescript
import { useToastStore } from "@/lib/stores/toast-store";

// Success toast
useToastStore.getState().success("Bookmark saved");

// Error toast
useToastStore.getState().error("Failed to save bookmark");

// Info toast
useToastStore.getState().info("Tags coming soon");
```

#### In React Components

```typescript
const toast = useToastStore();

// Later in function
toast.success("Card deleted");
```

#### With Dynamic Import (to avoid circular dependencies)

```typescript
const { useToastStore } = await import("@/lib/stores/toast-store");
useToastStore.getState().success("Note created");
```

### Common Toast Messages

**Card Operations:**
- Create: `"Bookmark saved"`
- Delete: `"Card deleted"` or `"X card(s) deleted"` (with count)
- Move: `"X card(s) moved to Pawkit"`

**Note Operations:**
- Create regular note: `"Note created"`
- Create daily note: `"Daily note created"`
- Delete note: `"Card deleted"` (same as bookmark)

**Pawkit Operations:**
- Create: `"Pawkit created"` or `"Sub-Pawkit created"`
- Delete: `"Pawkit deleted"`
- Rename: `"Pawkit renamed"`
- Move: `"Pawkit moved"`
- Add card to pawkit: `"Added to ${pawkitName}"`
- Remove from pawkit: `"Removed from ${pawkitName}"`

**Duplicate Detection:**
- Active duplicate: `"This URL is already bookmarked"`
- Trashed duplicate: `"This URL is in your trash. Empty trash to add it again."`

### ✅ DO

- **Always use global toast store** - Never create local toast state
- **Use top-center positioning** - Consistent with GlobalToastProvider
- **Use glass morphism styling** - Matches overall design system
- **Show toasts for user actions** - Any create/update/delete operation
- **Include counts in bulk operations** - "5 cards deleted" not just "Cards deleted"
- **Handle duplicate URLs properly** - Different messages for active vs trashed

#### ❌ DON'T

- **Never render toasts locally** - No `<Toast message={...} />` in components
- **Never use bottom positioning** - `fixed bottom-6` breaks ultra-wide monitor visibility
- **Never use hardcoded blue styling** - Use glass morphism variants
- **Never skip toasts on success** - Users need feedback for all operations
- **Never use console.log for user feedback** - Always use toasts instead

### Migration Guide

**Old Pattern (DON'T USE):**
```typescript
// ❌ Local toast state
const [showToast, setShowToast] = useState(false);
const [toastMessage, setToastMessage] = useState("");

setToastMessage("Pawkit created");
setShowToast(true);
setTimeout(() => setShowToast(false), 2000);

// Local rendering
{showToast && <div className="fixed bottom-8...">...</div>}
```

**New Pattern (USE THIS):**
```typescript
// ✅ Global toast store
import { useToastStore } from "@/lib/stores/toast-store";

useToastStore.getState().success("Pawkit created");
// Toast automatically appears at top-center and auto-dismisses
```

### Troubleshooting

**Toast doesn't appear:**
1. Check if operation code path is actually executed (add temporary console.log)
2. Verify toast call syntax: `useToastStore.getState().success("message")`
3. Check for errors in browser console
4. Ensure GlobalToastProvider is mounted in app root

**Toast appears at wrong position:**
1. Search for `fixed bottom-` in codebase (should find nothing)
2. Verify no local toast rendering (`<Toast`, `toast-container`)
3. Check z-index is `z-[9999]` in toast.tsx

**Toast has wrong styling:**
1. Verify using `useToastStore` not old `useToast` hook
2. Check toast type (success/error/info) matches intent
3. Ensure glass morphism base: `backdrop-blur-lg bg-gray-900/90`

---

**Last Updated**: January 15, 2025 (Added Toast Notifications System Documentation)
**Design System**: Selective Glow v1.2
**Status**: Official Pawkit UI Language

**Key Principle**: Glass is foundation. Purple glow reveals interaction. Hierarchy over chaos.

---

## MOBILE GLASS MORPHISM PATTERNS (React Native / Expo)

### Date Added: January 23, 2025
### Platform: React Native (Expo SDK 54) / iOS & Android

**Context**: Mobile app implementation of Pawkit glass morphism design using React Native.

---

### Core Theme Definition

**File**: `mobile/src/theme/glass.ts`

```typescript
export const GlassTheme = {
  colors: {
    // Glass morphism
    glass: {
      base: 'rgba(255, 255, 255, 0.05)',
      medium: 'rgba(255, 255, 255, 0.08)',
      strong: 'rgba(17, 24, 39, 0.9)',
    },
    
    // Purple accent (interaction color)
    purple: {
      '400': 'rgb(192, 132, 252)',
      '500': 'rgb(168, 85, 247)',
      subtle: 'rgba(168, 85, 247, 0.2)',
    },
    
    // Borders
    border: {
      subtle: 'rgba(255, 255, 255, 0.1)',
      medium: 'rgba(255, 255, 255, 0.2)',
    },
    
    // Text
    text: {
      primary: 'rgba(255, 255, 255, 0.95)',
      secondary: 'rgba(255, 255, 255, 0.8)',
      muted: 'rgba(255, 255, 255, 0.5)',
    },
  },
  
  shadows: {
    purpleGlow: {
      shadowColor: 'rgb(168, 85, 247)',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.4,
      shadowRadius: 10,
      elevation: 5, // Android
    },
  },
  
  borderRadius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
  },
  
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
  },
};
```

---

### Pattern 1: Swipeable Drawers (Side Panels)

**File**: `mobile/src/components/SwipeableDrawer.tsx`

**Use Case**: Collections panel (left), Settings panel (right)

**Key Features**:
- Glass morphism background (iOS: BlurView, Android: translucent overlay)
- Swipe from screen edges to open (25px edge detection zones)
- Purple glow border on focus
- Backdrop with pointer events control
- Smooth 300ms animations

**Dimensions**:
- Width: 70% of screen
- Height: 82% of screen
- Vertically centered
- Rounded corners: 16px (all 4 corners)

**Implementation**:
```tsx
// Drawer container with glass background
{Platform.OS === 'ios' ? (
  <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill}>
    <View style={[StyleSheet.absoluteFill, styles.glassOverlay]} />
  </BlurView>
) : (
  <View style={[StyleSheet.absoluteFill, styles.glassBackground]} />
)}

// Border with purple glow when open
<View style={[
  styles.border,
  isOpen && styles.borderFocused
]} />
```

**Styles**:
```typescript
glassOverlay: {
  backgroundColor: GlassTheme.colors.glass.base,
},
glassBackground: {
  backgroundColor: GlassTheme.colors.glass.strong,
},
border: {
  position: 'absolute',
  top: 0, left: 0, right: 0, bottom: 0,
  borderRadius: GlassTheme.borderRadius.xl,
  borderWidth: 1,
  borderColor: GlassTheme.colors.border.subtle,
  pointerEvents: 'none',
},
borderFocused: {
  borderColor: GlassTheme.colors.purple.subtle,
  borderWidth: 2,
  ...GlassTheme.shadows.purpleGlow,
},
```

---

### Pattern 2: Omnibar (Search/Create Input)

**File**: `mobile/src/components/Omnibar.tsx`

**Use Case**: Bottom-fixed smart input for URL saving and search

**Key Features**:
- Glass background with blur
- Purple glow on focus
- Dynamic icon (search 🔍 vs link 🔗 based on URL detection)
- Clear button (X) when text present
- Plus button when valid URL detected
- Keyboard-avoiding behavior

**URL Detection**:
```typescript
import { isProbablyUrl } from '../lib/utils';

const isUrl = isProbablyUrl(value);

// Show link icon if URL, search icon otherwise
<MaterialCommunityIcons
  name={isUrl ? "link-variant" : "magnify"}
  size={20}
  color={GlassTheme.colors.text.muted}
/>

// Plus button only appears for URLs
{isUrl && (
  <TouchableOpacity onPress={handleSubmit}>
    <MaterialCommunityIcons
      name="plus"
      size={24}
      color={GlassTheme.colors.purple[400]}
    />
  </TouchableOpacity>
)}
```

**Positioning**:
```tsx
// Fixed at bottom with keyboard avoidance
<KeyboardAvoidingView
  behavior={Platform.OS === 'ios' ? 'position' : 'height'}
  keyboardVerticalOffset={110}
>
  <View style={styles.omnibar}>
    {/* Glass input */}
  </View>
</KeyboardAvoidingView>
```

---

### Pattern 3: Edge Indicators (Swipe Hints)

**File**: `mobile/src/components/EdgeIndicators.tsx`

**Use Case**: Subtle swipe hints at screen edges

**Specifications**:
- Width: 1-2px
- Height: 150px
- Position: 5px from edge
- Opacity: 0.2-0.3
- Purple gradient

**Implementation**:
```tsx
import { LinearGradient } from 'expo-linear-gradient';

<LinearGradient
  colors={[
    'rgba(168, 85, 247, 0)',
    'rgba(168, 85, 247, 0.3)',
    'rgba(168, 85, 247, 0)',
  ]}
  style={{
    position: 'absolute',
    left: 5,  // or right: 5 for right edge
    top: '50%',
    transform: [{ translateY: -75 }],
    width: 2,
    height: 150,
  }}
/>
```

---

### Pattern 4: Glass Cards (Mobile)

**File**: `mobile/src/components/GlassCard.tsx`

**Use Case**: Bookmark/note cards in masonry grid

**Key Features**:
- Glass background with blur
- Rounded corners (12px)
- Subtle border
- Tap interactions

**Implementation**:
```tsx
<View style={styles.card}>
  {Platform.OS === 'ios' ? (
    <BlurView intensity={60} tint="dark" style={StyleSheet.absoluteFill}>
      <View style={styles.glassOverlay} />
    </BlurView>
  ) : (
    <View style={[StyleSheet.absoluteFill, styles.glassBackground]} />
  )}
  
  <View style={styles.border} />
  
  {/* Card content */}
</View>
```

---

### Mobile-Specific Considerations

**1. Platform Differences**:
- **iOS**: Use `BlurView` from expo-blur for true glass effect
- **Android**: Use translucent backgrounds (BlurView less performant)

**2. Performance**:
- Limit BlurView usage (expensive on older devices)
- Use `shouldRasterizeIOS={true}` for static blur areas
- Prefer `rgba()` backgrounds on Android

**3. Touch Targets**:
- Minimum 44x44 points for buttons (iOS HIG)
- Minimum 48x48 dp for buttons (Android Material)

**4. Safe Areas**:
- Use `SafeAreaView` or `useSafeAreaInsets` hook
- Account for notches, home indicators
- Don't position critical UI at screen edges

**5. Keyboard Handling**:
- Use `KeyboardAvoidingView` for inputs
- Set appropriate `keyboardVerticalOffset` (typically 110px for bottom-fixed inputs)
- Dismiss keyboard on backdrop tap

---

### Critical Rules for Mobile Glass

1. **Always provide fallback for Android** - BlurView not as performant
2. **Test on real devices** - Simulators don't accurately represent blur performance
3. **Minimize blur areas** - Use selectively for best performance
4. **Respect platform conventions** - iOS vs Android have different interaction patterns
5. **Consider dark backgrounds** - Glass morphism works best on dark/gradient backgrounds

---

**Last Updated**: January 23, 2025
**Platform**: React Native / Expo SDK 54
**Tested**: iOS Simulator, Real iPhone devices
**Status**: Production-ready mobile glass morphism system

