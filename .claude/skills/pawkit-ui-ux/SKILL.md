# Pawkit UI/UX Design Standards

**Purpose**: Enforce consistent UI/UX patterns across all development

**See Also**: `UI_AUDIT.md` for comprehensive pattern analysis

---

## Instructions for Claude

When building or modifying UI components:

1. **ALWAYS use shadcn/ui components** as the default choice
2. **CHECK the UI_AUDIT.md** to see what patterns are currently used
3. **FLAG inconsistencies** when you encounter mixed patterns
4. **SUGGEST refactoring** opportunities to improve consistency
5. **FOLLOW the design system** defined below

---

## DESIGN SYSTEM

### Button Standards

**Rule**: ALWAYS use shadcn Button component from `components/ui/button.tsx`

#### Variants

```tsx
import { Button } from "@/components/ui/button"

// Primary actions (saves, submits, confirms)
<Button variant="default">Save</Button>

// Secondary actions (cancel, back, alternative)
<Button variant="outline">Cancel</Button>

// Tertiary actions (badges, tags, optional)
<Button variant="secondary">Tag</Button>

// Icon-only buttons (toolbars, menus)
<Button variant="ghost" size="icon"><Icon /></Button>

// Destructive actions (delete, remove, clear)
<Button variant="destructive">Delete</Button>
```

#### When NOT to use Button

❌ **NEVER** create plain `<button>` elements for:
- Action buttons
- Submit buttons
- Menu items that look like buttons
- Toolbar actions
- Icon buttons

✅ **OK** to use plain `<button>` only for:
- Custom calendar date cells (if Button adds too much styling)
- Highly specialized interactive elements with unique styling needs

**Migration Note**: Current codebase has 200+ plain buttons that need refactoring (see UI_AUDIT.md)

---

### Card Standards

**Rule**: Use shadcn Card for all card-like containers

#### Basic Card

```tsx
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card"

<Card>
  <CardHeader>
    <CardTitle>Card Title</CardTitle>
    <CardDescription>Optional description</CardDescription>
  </CardHeader>
  <CardContent>
    Main content here
  </CardContent>
  <CardFooter>
    Optional footer actions
  </CardFooter>
</Card>
```

#### Card Variants

**For glassmorphism/special styling**:
```tsx
import { CardSurface } from "@/components/ui/card-surface"

// Use CardSurface when glassmorphism effect is needed
<CardSurface hover={true} className="p-4">
  Content with backdrop blur effect
</CardSurface>
```

**Guidelines**:
- Use `Card` for standard containers (landing page, auth, settings)
- Use `CardSurface` for glassmorphism effects (notes view, special features)
- Document which to use where

**Migration Note**: 65+ plain div cards need refactoring (see UI_AUDIT.md)

---

### Input/Form Standards

**Rule**: Use shadcn Input and create Textarea component

#### Text Input

```tsx
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

<div className="space-y-2">
  <Label htmlFor="email">Email</Label>
  <Input
    id="email"
    type="email"
    placeholder="you@example.com"
  />
</div>
```

#### Textarea (TODO: Create Component)

**Current Issue**: No Textarea component exists, 8 plain textareas in codebase

**Action Required**: Create `components/ui/textarea.tsx` matching Input styling

```tsx
// TODO: Implement this
import { Textarea } from "@/components/ui/textarea"

<Textarea
  placeholder="Enter notes here..."
  rows={4}
/>
```

#### Search Input Pattern

```tsx
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"

<div className="relative">
  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
  <Input
    placeholder="Search..."
    className="pl-9"
  />
</div>
```

**Migration Note**: 47+ plain HTML inputs need refactoring (see UI_AUDIT.md)

---

### Modal/Dialog Standards

**Rule**: Use shadcn Dialog component (currently NOT used!)

#### Standard Dialog

```tsx
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

<Dialog open={open} onOpenChange={setOpen}>
  <DialogTrigger asChild>
    <Button>Open Dialog</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Dialog Title</DialogTitle>
      <DialogDescription>Description text</DialogDescription>
    </DialogHeader>

    {/* Content here */}

    <DialogFooter>
      <Button variant="outline" onclick={onClose}>Cancel</Button>
      <Button onClick={onSave}>Save</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

#### Confirmation Dialog

```tsx
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

// Use for destructive confirmations
<AlertDialog open={open} onOpenChange={setOpen}>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Are you sure?</AlertDialogTitle>
      <AlertDialogDescription>
        This action cannot be undone.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancel</AlertDialogCancel>
      <AlertDialogAction onClick={onConfirm}>Continue</AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

**Critical Issue**: Current codebase has 10+ modals using custom `createPortal` implementations instead of shadcn Dialog. ALL need refactoring.

**Migration Note**: See UI_AUDIT.md for list of all modal files requiring refactoring

---

### Navigation Standards

#### Sidebar Pattern

**Primary**: Use shadcn Sidebar components

```tsx
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

<Sidebar>
  <SidebarContent>
    <SidebarGroup>
      <SidebarGroupLabel>Navigation</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <a href="/library">Library</a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  </SidebarContent>
</Sidebar>
```

**Current State**: Two sidebar implementations exist (LeftNavigationPanel and AppSidebar) - needs consolidation

#### Tabs Pattern

```tsx
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"

<Tabs defaultValue="overview">
  <TabsList>
    <TabsTrigger value="overview">Overview</TabsTrigger>
    <TabsTrigger value="pawkits">Pawkits</TabsTrigger>
    <TabsTrigger value="notes">Notes</TabsTrigger>
  </TabsList>
  <TabsContent value="overview">
    Overview content
  </TabsContent>
  {/* ... other tabs */}
</Tabs>
```

**Status**: ✅ Tabs usage is consistent in codebase

#### Dropdown Menu Pattern

```tsx
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant="ghost" size="icon">
      <MoreVertical className="h-4 w-4" />
    </Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent align="end">
    <DropdownMenuLabel>Actions</DropdownMenuLabel>
    <DropdownMenuSeparator />
    <DropdownMenuItem>Edit</DropdownMenuItem>
    <DropdownMenuItem>Duplicate</DropdownMenuItem>
    <DropdownMenuSeparator />
    <DropdownMenuItem className="text-destructive">
      Delete
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

**Status**: ✅ DropdownMenu usage is consistent

---

## SPACING & LAYOUT

### Standard Spacing Scale

Use Tailwind's spacing scale consistently:

```tsx
// Padding inside containers
<div className="p-4">     // Small padding (16px)
<div className="p-6">     // Medium padding (24px)
<div className="p-8">     // Large padding (32px)

// Gaps between elements
<div className="space-y-2">  // Small gaps (8px)
<div className="space-y-4">  // Medium gaps (16px)
<div className="space-y-6">  // Large gaps (24px)

// Margins
<div className="mt-4">    // Top margin (16px)
<div className="mb-6">    // Bottom margin (24px)
```

### Container Sizes

```tsx
// Modal widths
<DialogContent className="max-w-md">    // Small modal (448px)
<DialogContent className="max-w-lg">    // Medium modal (512px)
<DialogContent className="max-w-xl">    // Large modal (576px)
<DialogContent className="max-w-2xl">   // Extra large modal (672px)

// Card max-widths
<Card className="max-w-sm">  // Small card (384px)
<Card className="max-w-md">  // Medium card (448px)
<Card className="max-w-lg">  // Large card (512px)
```

---

## COLOR SYSTEM

### Semantic Colors

Use shadcn's semantic color system:

```tsx
// Backgrounds
className="bg-background"          // Main background
className="bg-card"                 // Card background
className="bg-popover"              // Popover background
className="bg-muted"                // Muted background

// Text
className="text-foreground"         // Primary text
className="text-muted-foreground"   // Secondary text
className="text-card-foreground"    // Text on cards

// Borders
className="border-border"           // Default border
className="border-input"            // Input borders

// Interactive states
className="hover:bg-accent"         // Hover state
className="focus:ring-ring"         // Focus ring
className="text-destructive"        // Destructive actions
```

### Dark Mode

- All components should support dark mode automatically via CSS variables
- Use semantic color tokens, NOT hardcoded colors
- Test in both light and dark modes

---

## ACCESSIBILITY REQUIREMENTS

### Keyboard Navigation

**ALL interactive elements MUST**:
- Be keyboard accessible (Tab, Enter, Space, Escape)
- Show focus indicators
- Support expected keyboard shortcuts

```tsx
// Good: Keyboard accessible button
<Button onClick={handleClick}>
  Action
</Button>

// Bad: Div that looks like button but no keyboard support
<div onClick={handleClick} className="cursor-pointer">
  Action
</div>
```

### Screen Reader Support

**ALL components MUST have**:
- Proper ARIA labels
- Semantic HTML
- Alt text for images
- Descriptive button labels (not just icons)

```tsx
// Good: Screen reader accessible
<Button variant="ghost" size="icon" aria-label="Delete card">
  <Trash2 className="h-4 w-4" />
</Button>

// Bad: No label for icon-only button
<Button variant="ghost" size="icon">
  <Trash2 className="h-4 w-4" />
</Button>
```

### Focus Management

**Modals MUST**:
- Trap focus within the modal
- Return focus to trigger element on close
- Handle Escape key to close

**shadcn Dialog handles this automatically** - another reason to use it!

---

## COMMON PATTERNS

### Loading States

```tsx
import { Skeleton } from "@/components/ui/skeleton"

// Card loading skeleton
<Card>
  <CardHeader>
    <Skeleton className="h-4 w-[250px]" />
    <Skeleton className="h-4 w-[200px]" />
  </CardHeader>
  <CardContent>
    <Skeleton className="h-[200px] w-full" />
  </CardContent>
</Card>
```

### Empty States

```tsx
<div className="flex flex-col items-center justify-center p-8 text-center">
  <div className="rounded-full bg-muted p-3 mb-4">
    <Icon className="h-6 w-6 text-muted-foreground" />
  </div>
  <h3 className="font-semibold text-lg mb-2">No items found</h3>
  <p className="text-sm text-muted-foreground mb-4">
    Get started by creating your first item
  </p>
  <Button>
    <Plus className="h-4 w-4 mr-2" />
    Create Item
  </Button>
</div>
```

### Form Validation

```tsx
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"

const [error, setError] = useState("")

<div className="space-y-2">
  <Label htmlFor="email">Email</Label>
  <Input
    id="email"
    type="email"
    className={error ? "border-destructive" : ""}
  />
  {error && (
    <p className="text-sm text-destructive">{error}</p>
  )}
</div>
```

---

## MIGRATION CHECKLIST

When refactoring existing components:

### Buttons
- [ ] Replace all plain `<button>` with `<Button>` component
- [ ] Choose appropriate variant (default, outline, ghost, secondary, destructive)
- [ ] Add size prop if needed (default, sm, lg, icon)
- [ ] Add aria-label for icon-only buttons
- [ ] Verify keyboard navigation works
- [ ] Remove custom Tailwind classes (use variants instead)

### Cards
- [ ] Replace plain divs with `<Card>` component
- [ ] Use CardHeader, CardContent, CardFooter structure
- [ ] Or use `<CardSurface>` if glassmorphism needed
- [ ] Ensure consistent spacing (p-4, p-6)
- [ ] Remove duplicate border/background classes

### Inputs
- [ ] Replace plain `<input>` with `<Input>` component
- [ ] Add Label component for accessibility
- [ ] Replace `<textarea>` with `<Textarea>` (once created)
- [ ] Add error state styling
- [ ] Ensure aria-describedby for errors

### Modals
- [ ] Replace createPortal implementation with `<Dialog>`
- [ ] Use DialogHeader, DialogContent, DialogFooter
- [ ] Ensure Escape key closes modal
- [ ] Verify focus traps within modal
- [ ] Test keyboard navigation
- [ ] Add proper ARIA labels

---

## DECISION FLOWCHART

### "Should I use a custom component or shadcn?"

```
Is there a shadcn component for this?
├─ YES → Use shadcn component
│   └─ Need custom styling?
│       ├─ YES → Extend with className prop or variants
│       └─ NO → Use as-is
│
└─ NO → Check if custom component exists
    ├─ YES (e.g., GlowButton, CardSurface)
    │   └─ Is it documented and used consistently?
    │       ├─ YES → Use it
    │       └─ NO → Propose refactor to shadcn
    │
    └─ NO → Create new component
        └─ Consider if it should be added to shadcn/ui
```

---

## WHEN TO REFACTOR

**Immediate refactor required when**:
- Adding new features to file with 10+ plain buttons
- Modifying any modal implementation
- Working on form with 5+ inputs
- Creating new card display patterns

**Flag for future refactor when**:
- Encountering mixed button patterns in same file
- Seeing plain HTML elements that should be components
- Finding duplicate styling patterns across files

**Ask user before refactoring if**:
- Change affects 20+ files
- Requires breaking changes to component APIs
- Needs design approval for visual changes

---

## QUALITY GATES

Before submitting any UI work, verify:

### Visual Consistency
- [ ] Uses shadcn components where available
- [ ] Follows spacing scale (p-4, space-y-4, etc.)
- [ ] Uses semantic color tokens
- [ ] Consistent with existing patterns

### Accessibility
- [ ] All interactive elements keyboard accessible
- [ ] Focus indicators visible
- [ ] ARIA labels on icon buttons
- [ ] Modals trap focus and close on Escape

### Responsive Design
- [ ] Works on mobile (320px+)
- [ ] Works on tablet (768px+)
- [ ] Works on desktop (1024px+)
- [ ] Touch targets minimum 44x44px on mobile

### Dark Mode
- [ ] Tested in dark mode
- [ ] Uses semantic colors (not hardcoded)
- [ ] Proper contrast ratios

---

## EXAMPLES FROM CODEBASE

### ✅ Good Examples

**Button usage in conflict-resolution.tsx**:
```tsx
<Button variant="outline" onClick={onClose}>
  Cancel
</Button>
<Button variant="destructive" onClick={handleDelete}>
  Delete
</Button>
```

**Tabs in card-detail-modal.tsx**:
```tsx
<Tabs value={activeTab} onValueChange={setActiveTab}>
  <TabsList>
    <TabsTrigger value="overview">Overview</TabsTrigger>
    <TabsTrigger value="pawkits">Pawkits</TabsTrigger>
  </TabsList>
  {/* ... */}
</Tabs>
```

**DropdownMenu in view-options-menu.tsx**:
```tsx
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant="ghost" size="icon">
      <Settings className="h-4 w-4" />
    </Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent>
    {/* Menu items */}
  </DropdownMenuContent>
</DropdownMenu>
```

### ⚠️ Needs Improvement

**Plain buttons in control-panel.tsx** (lines 93-163):
```tsx
// ❌ Current: Plain button with custom classes
<button className="flex items-center justify-center rounded hover:bg-gray-800">
  <Icon />
</button>

// ✅ Should be: shadcn Button
<Button variant="ghost" size="icon" aria-label="Description">
  <Icon className="h-4 w-4" />
</Button>
```

**Custom modal in add-card-modal.tsx**:
```tsx
// ❌ Current: Custom createPortal implementation
createPortal(
  <>
    <div className="fixed inset-0 bg-black/60" onClick={onClose} />
    <div className="fixed inset-0 flex items-center justify-center">
      {/* Modal content */}
    </div>
  </>,
  document.body
)

// ✅ Should be: shadcn Dialog
<Dialog open={open} onOpenChange={setOpen}>
  <DialogContent>
    {/* Modal content */}
  </DialogContent>
</Dialog>
```

---

## RESOURCES

### Documentation
- shadcn/ui docs: https://ui.shadcn.com
- Tailwind CSS docs: https://tailwindcss.com/docs
- Radix UI docs: https://www.radix-ui.com

### Tools
- shadcn CLI: `npx shadcn@latest add [component]`
- Tailwind Play: https://play.tailwindcss.com
- Component preview: Run Storybook (if set up)

### Internal References
- **UI_AUDIT.md**: Current state analysis
- **pawkit-conventions.md**: Data model conventions
- **pawkit-roadmap/SKILL.md**: Feature roadmap

---

**Last Updated**: October 29, 2025
**Status**: Design system documented, migration in progress
**Priority**: P0 - Critical for launch consistency
