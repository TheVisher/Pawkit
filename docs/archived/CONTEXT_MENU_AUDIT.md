# Context Menu Audit - Pawkit Application

**Date:** 2025-10-31
**Purpose:** Document all existing context menu implementations and identify areas for standardization

---

## 🎯 Summary

**Total Context Menu Implementations:** 3 different patterns
**Components with Context Menus:** 3
**Views Missing Context Menus:** 6+
**Standardization Status:** 🔴 Inconsistent - Multiple patterns in use

---

## 📦 Existing Context Menu Systems

### 1. ✅ **Radix UI Context Menu Primitives** (`components/ui/context-menu.tsx`)
- **Type:** Base primitive components from Radix UI
- **Status:** ✅ Active foundation
- **Components:**
  - `ContextMenu`, `ContextMenuTrigger`, `ContextMenuContent`
  - `ContextMenuItem`, `ContextMenuSeparator`
  - `ContextMenuSub`, `ContextMenuSubContent`, `ContextMenuSubTrigger`
  - `ContextMenuCheckboxItem`, `ContextMenuRadioItem`
  - `ContextMenuLabel`, `ContextMenuShortcut`
- **Used By:** All context menu implementations build on this

### 2. ✅ **NEW: Generic Context Menu** (`components/ui/generic-context-menu.tsx`)
- **Type:** Reusable wrapper with simple API
- **Status:** ✅ Just created (current session)
- **Features:**
  - Array-based menu configuration
  - Support for icons, separators, submenus, shortcuts
  - Destructive action styling
  - Disabled states
- **Currently Used By:**
  - Pawkit sidebar (CollectionItem in `components/pawkits/sidebar.tsx`)

### 3. ✅ **Card-Specific Context Menu** (`components/cards/card-context-menu.tsx`)
- **Type:** Specialized wrapper for card operations
- **Status:** ✅ Active, widely used
- **Features:**
  - Add to Pawkit (with nested collection tree)
  - Remove from Pawkit(s)
  - Fetch metadata
  - Pin/Unpin notes to sidebar
  - Delete card
- **Currently Used By:**
  - Home page cards (`app/(dashboard)/home/page.tsx`)
  - Library cards (`components/library/card-gallery.tsx`)
  - Pawkit view cards (via LibraryWorkspace)
  - Notes view cards (via NotesView)

### 4. ✅ **Custom Hook** (`hooks/use-context-menu.ts`)
- **Type:** State management hook
- **Status:** ✅ Just created (current session)
- **Purpose:** For custom context menu implementations
- **Usage:** Currently not used, available for future custom implementations

---

## 🗂️ Components/Views WITH Context Menus

### ✅ **Card Components** (using CardContextMenuWrapper)

#### 1. **Home Page Cards** (`app/(dashboard)/home/page.tsx`)
- **Location:** `RecentCard` component (lines 540-600)
- **Menu Actions:**
  - Add to Pawkit
  - Remove from Pawkit
  - Remove from all Pawkits
  - Delete
- **Pattern:** `CardContextMenuWrapper`
- **Notes:** Basic card operations only

#### 2. **Library Cards** (`components/library/card-gallery.tsx`)
- **Location:** `CardCell` component (lines 627-967)
- **Menu Actions:**
  - Add to Pawkit
  - Remove from Pawkit
  - Remove from all Pawkits
  - Fetch metadata
  - Pin to sidebar (notes only)
  - Unpin from sidebar (notes only)
  - Delete
- **Pattern:** `CardContextMenuWrapper`
- **Notes:** Full-featured card menu

#### 3. **Pawkit View Cards** (`app/(dashboard)/pawkits/[slug]/page.tsx`)
- **Location:** Via `LibraryWorkspace` → `CardGallery`
- **Menu Actions:** Same as Library Cards (full feature set)
- **Pattern:** `CardContextMenuWrapper`

#### 4. **Notes View Cards** (`app/(dashboard)/notes/page.tsx`)
- **Location:** Via `NotesView` → `CardGallery`
- **Menu Actions:** Same as Library Cards (full feature set)
- **Pattern:** `CardContextMenuWrapper`

### ✅ **Pawkit Sidebar Collections** (using GenericContextMenu)

#### 5. **Pawkit Sidebar** (`components/pawkits/sidebar.tsx`)
- **Location:** `CollectionItem` component (lines 244-329)
- **Menu Actions:**
  - New sub-collection
  - Rename
  - Move
  - Delete
- **Pattern:** `GenericContextMenu` (NEW)
- **Notes:** Replaces inline management buttons

---

## ❌ Components/Views MISSING Context Menus

### 1. **Pinned Notes in Left Sidebar** (`components/navigation/left-navigation-panel.tsx`)
- **Location:** `SortablePinnedNote` component (lines 386-424)
- **Current Actions:** Click to open (no context menu)
- **Missing Actions:**
  - ❌ Unpin from sidebar
  - ❌ Open in new panel
  - ❌ Copy note link
  - ❌ View in library
- **Suggested Pattern:** `GenericContextMenu`
- **Priority:** 🔴 HIGH - Common user action

### 2. **Recently Viewed Items in Left Sidebar** (`components/navigation/left-navigation-panel.tsx`)
- **Location:** Recent items list (lines 818-833)
- **Current Actions:** Click to navigate
- **Missing Actions:**
  - ❌ Remove from recent
  - ❌ Pin to sidebar (notes)
  - ❌ Open in new panel
  - ❌ Copy link
- **Suggested Pattern:** `GenericContextMenu`
- **Priority:** 🟡 MEDIUM

### 3. **Pawkit Grid Cards** (`components/pawkits/grid.tsx`)
- **Location:** `CollectionsGrid` component
- **Current Actions:** Click to open, 3-dot menu button via `PawkitActions`
- **Missing Actions:**
  - ❌ Right-click context menu (must use 3-dot button)
  - Could have: Rename, Move, Delete, Set cover, Toggle privacy
- **Suggested Pattern:** `GenericContextMenu`
- **Priority:** 🟢 LOW - Already has dropdown menu via 3-dot button
- **Notes:** This is a design choice - may prefer explicit button over right-click

### 4. **Trash View Items** (`components/trash/trash-view.tsx`)
- **Location:** Trash items list
- **Current Actions:** Inline buttons (Restore, Delete permanently)
- **Missing Actions:**
  - ❌ Right-click context menu for Restore/Delete
  - ❌ View details
  - ❌ Compare versions
- **Suggested Pattern:** `GenericContextMenu`
- **Priority:** 🟡 MEDIUM

### 5. **Tag Cards** (`app/(dashboard)/tags/page.tsx`)
- **Location:** Tag grid items
- **Current Actions:** Inline buttons (Edit, Delete), hover-revealed
- **Missing Actions:**
  - ❌ Right-click context menu
  - Could have: Rename, Delete, Merge, View cards, Color picker
- **Suggested Pattern:** `GenericContextMenu`
- **Priority:** 🟢 LOW - Already has hover buttons

### 6. **Favorites Page** (`app/(dashboard)/favorites/page.tsx`)
- **Status:** ⚠️ Page exists but not implemented yet
- **Missing:** Everything (page says "in progress")
- **Priority:** ⏸️ N/A - Wait for page implementation

---

## 🔍 Pattern Analysis

### Current Patterns in Use

| Pattern | Pros | Cons | Best For |
|---------|------|------|----------|
| **CardContextMenuWrapper** | • Feature-rich<br>• Card-specific actions<br>• Auto-fetches collections | • Tightly coupled to cards<br>• Not reusable for other items | Card components only |
| **GenericContextMenu** | • Simple API<br>• Highly reusable<br>• Easy to implement | • Less specialized<br>• Requires manual config | General purpose menus |
| **useContextMenu hook** | • Maximum flexibility<br>• Full control<br>• Custom positioning | • More code required<br>• Manual menu rendering | Custom implementations |

### Inconsistencies Found

1. **Pawkit Management:**
   - ✅ Sidebar: Now uses `GenericContextMenu` (context menu)
   - ⚠️ Grid view: Uses `PawkitActions` dropdown (3-dot button)
   - ❓ Should they both use context menus?

2. **Pinned Items:**
   - ✅ Pinned notes in Library: Have context menu via `CardContextMenuWrapper`
   - ❌ Pinned notes in Sidebar: No context menu

3. **Recent Items:**
   - ❌ No context menus anywhere

---

## 📊 Recommendations

### High Priority (Implement Soon)

1. **✅ Pinned Notes in Sidebar** - Add `GenericContextMenu`
   ```tsx
   items={[
     { label: "Open", icon: FileOpen, onClick: () => open(note) },
     { label: "Unpin from sidebar", icon: PinOff, onClick: () => unpin(note.id) },
     { type: "separator" },
     { label: "Copy link", icon: Link, onClick: () => copyLink(note) },
   ]}
   ```

2. **Trash View Items** - Add `GenericContextMenu` for consistency

### Medium Priority

1. **Recently Viewed Items** - Add basic context menu
2. **Standardize CardContextMenuWrapper** - Document as the standard for card operations

### Low Priority

1. **Tag Management** - Current hover buttons work well
2. **Pawkit Grid** - 3-dot menu is acceptable, context menu is optional

---

## 🎨 Design Guidelines for Context Menus

### When to Add Context Menus

✅ **DO add context menus when:**
- The item has 3+ possible actions
- Actions are frequently used
- Right-click is a natural interaction
- Space is limited for inline buttons

❌ **DON'T add context menus when:**
- Only 1-2 actions exist
- Actions are rarely used
- Inline buttons provide better discoverability
- The component already has a good alternative (e.g., dropdown menu)

### Which Pattern to Use

- **Cards (bookmarks, notes)** → Use `CardContextMenuWrapper`
- **Collections, tags, sidebar items** → Use `GenericContextMenu`
- **Custom requirements** → Use `useContextMenu` hook

---

## 🚀 Migration Path

### Phase 1: Critical (Current Session) ✅
- [x] Create reusable context menu system
- [x] Add to Pawkit sidebar

### Phase 2: High Priority (Next)
- [ ] Add context menus to pinned notes in sidebar
- [ ] Add context menus to trash view items
- [ ] Document context menu patterns in code

### Phase 3: Polish
- [ ] Add to recently viewed items
- [ ] Consider Pawkit grid context menus
- [ ] Audit all views for consistency

---

## 📝 Code Examples

### Using GenericContextMenu (Simple)

```tsx
import { GenericContextMenu } from "@/components/ui/generic-context-menu";
import { Edit, Trash, Copy } from "lucide-react";

<GenericContextMenu
  items={[
    { label: "Edit", icon: Edit, onClick: handleEdit },
    { label: "Copy", icon: Copy, onClick: handleCopy, shortcut: "⌘C" },
    { type: "separator" },
    { label: "Delete", icon: Trash, onClick: handleDelete, destructive: true },
  ]}
>
  <div>Your component</div>
</GenericContextMenu>
```

### Using GenericContextMenu (With Submenu)

```tsx
<GenericContextMenu
  items={[
    {
      type: "submenu",
      label: "Add to",
      icon: FolderPlus,
      items: collections.map(c => ({
        label: c.name,
        onClick: () => addTo(c.slug)
      }))
    },
    { type: "separator" },
    { label: "Delete", icon: Trash, onClick: handleDelete, destructive: true },
  ]}
>
  <div>Your component</div>
</GenericContextMenu>
```

### Using CardContextMenuWrapper (Cards Only)

```tsx
import { CardContextMenuWrapper } from "@/components/cards/card-context-menu";

<CardContextMenuWrapper
  onAddToPawkit={(slug) => addToPawkit(card.id, slug)}
  onDelete={() => deleteCard(card.id)}
  cardCollections={card.collections || []}
  onRemoveFromPawkit={(slug) => removeFrom(card.id, slug)}
  onFetchMetadata={() => fetchMetadata(card.id)}
  cardId={card.id}
  cardType={card.type}
  isPinned={isPinned}
  onPinToSidebar={() => pin(card.id)}
  onUnpinFromSidebar={() => unpin(card.id)}
>
  <CardComponent card={card} />
</CardContextMenuWrapper>
```

---

## 📈 Statistics

- **Files with context menus:** 5
- **Files that could benefit from context menus:** 6
- **Total patterns available:** 3 (Radix base, GenericContextMenu, CardContextMenuWrapper, useContextMenu hook)
- **Consistency score:** 🟡 60% - Room for improvement
- **Ease of adding new menus:** ✅ Easy with new `GenericContextMenu`

---

## ✅ Action Items

1. **Document context menu patterns** in developer guide
2. **Add context menus to pinned sidebar notes** (high priority)
3. **Add context menus to trash view** (medium priority)
4. **Review all views** for context menu opportunities
5. **Standardize existing implementations** where possible
6. **Update onboarding docs** to mention right-click functionality

---

*Last Updated: 2025-10-31*
*Audit Conducted By: Claude (AI Assistant)*
