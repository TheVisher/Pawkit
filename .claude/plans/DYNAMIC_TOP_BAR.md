# Dynamic Top Bar / Island Implementation

> **Purpose**: Replace bottom FAB with a dynamic top bar that collapses into an iOS-style island on scroll
> **Created**: December 11, 2025
> **Status**: ✅ Completed (December 10, 2025)
> **Branch**: `feature/note-folders`
> **Replaces**: Bottom FAB (remove `floating-action-bar.tsx` and related)

---

## Overview

A persistent top bar that lives above all content in the app. Contains search + quick actions. When user scrolls, it morphs into a compact "Dynamic Island" style pill.

### Key Requirements
1. **Global** - Works in EVERY view (Library, Notes, Calendar, Pawkits, etc.)
2. **Morphing animation** - Smooth transition between expanded and collapsed states
3. **Sloped edges** - Collapsed state has curved edges that look like it emerges from top
4. **Always accessible** - Search + Add + Kit chat available everywhere

---

## Visual States

### State 1: Expanded (Default / Top of Page)

```
┌──────────────────────────────────────────────────────────────────┐
│  ← Sidebar                                                       │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│            ┌─────────────────────────────────────────┐           │
│            │ [+]   🔍 Search Pawkit...         [🐕] │           │
│            └─────────────────────────────────────────┘           │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │                                                            │  │
│  │                     Content Area                           │  │
│  │                                                            │  │
```

- Full search pill: ~500-600px wide, centered
- Left side: **+** button (add content menu)
- Center: Search input with placeholder "Search Pawkit..."
- Right side: **🐕** Kit button (opens chat overlay)
- Background: Glass/blur matching app theme
- Height: ~48-56px

### State 2: Collapsed (Scrolled)

```
┌──────────────────────────────────────────────────────────────────┐
│  ← Sidebar                                                       │
├────────────────────────╱‾‾‾‾‾‾‾‾‾‾‾‾‾╲───────────────────────────┤
│                       │ [+] [🔍] [🐕] │                          │
│                        ╲_____________╱                           │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │                                                            │  │
│  │                     Content Area                           │  │
```

- Compact pill: ~140-160px wide, centered
- Three icon buttons only: Add, Search, Kit
- Sloped/curved edges connecting to the top edge
- Same glass/blur background
- Height: ~40-44px

### The Slopes

The collapsed state should have curved "slopes" on each side that make it look like the island is emerging from the top of the content area:

```
        ────────────╱                    ╲────────────
                   │   [+]  [🔍]  [🐕]   │
                    ╲__________________╱

The curves (╱ and ╲) should be smooth bezier curves, not hard angles.
```

---

## Component Architecture

```
components/
├── top-bar/
│   ├── dynamic-top-bar.tsx      # Main component with scroll detection
│   ├── top-bar-expanded.tsx     # Expanded search bar state
│   ├── top-bar-collapsed.tsx    # Collapsed island state
│   ├── top-bar-add-menu.tsx     # + button dropdown menu
│   └── top-bar.css              # Animations and clip-path styles
```

---

## Implementation

### Main Component

```tsx
// components/top-bar/dynamic-top-bar.tsx

'use client';

import { useState, useEffect, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { TopBarExpanded } from './top-bar-expanded';
import { TopBarCollapsed } from './top-bar-collapsed';
import { useKitStore } from '@/hooks/use-kit-store';
import { cn } from '@/lib/utils';
import './top-bar.css';

const SCROLL_THRESHOLD = 50; // Pixels scrolled before collapsing

export function DynamicTopBar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const { toggleOpen: toggleKit } = useKitStore();
  const pathname = usePathname();

  // Track scroll position
  useEffect(() => {
    const handleScroll = () => {
      // Don't collapse if search is focused
      if (isSearchFocused) return;
      
      // Get the main scrollable content area
      const scrollY = window.scrollY;
      setIsCollapsed(scrollY > SCROLL_THRESHOLD);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isSearchFocused]);

  // Reset to expanded when navigating
  useEffect(() => {
    setIsCollapsed(false);
  }, [pathname]);

  // Keep expanded while search is focused
  const handleSearchFocus = useCallback(() => {
    setIsSearchFocused(true);
    setIsCollapsed(false);
  }, []);

  const handleSearchBlur = useCallback(() => {
    setIsSearchFocused(false);
  }, []);

  // Expand when clicking collapsed bar
  const handleExpandClick = useCallback(() => {
    setIsCollapsed(false);
    // Scroll to top smoothly
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  return (
    <div className="dynamic-top-bar-container">
      {/* Background slopes for collapsed state */}
      <div 
        className={cn(
          "dynamic-top-bar-slopes",
          isCollapsed ? "slopes-visible" : "slopes-hidden"
        )}
      />
      
      {/* The bar itself */}
      <div 
        className={cn(
          "dynamic-top-bar",
          isCollapsed ? "collapsed" : "expanded"
        )}
      >
        {isCollapsed ? (
          <TopBarCollapsed
            onExpand={handleExpandClick}
            onKitClick={toggleKit}
          />
        ) : (
          <TopBarExpanded
            onSearchFocus={handleSearchFocus}
            onSearchBlur={handleSearchBlur}
            onKitClick={toggleKit}
          />
        )}
      </div>
    </div>
  );
}
```

### Expanded State

```tsx
// components/top-bar/top-bar-expanded.tsx

'use client';

import { useState, useRef, useEffect } from 'react';
import { Plus, Search, MessageCircle } from 'lucide-react';
import { TopBarAddMenu } from './top-bar-add-menu';
import { cn } from '@/lib/utils';

interface TopBarExpandedProps {
  onSearchFocus: () => void;
  onSearchBlur: () => void;
  onKitClick: () => void;
}

export function TopBarExpanded({ 
  onSearchFocus, 
  onSearchBlur, 
  onKitClick 
}: TopBarExpandedProps) {
  const [searchValue, setSearchValue] = useState('');
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Handle search submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchValue.trim()) {
      // Trigger command palette or search
      // Could dispatch to a global search store
      console.log('Search:', searchValue);
    }
  };

  // Keyboard shortcut to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K to focus search
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="top-bar-expanded">
      <form onSubmit={handleSubmit} className="top-bar-pill">
        {/* Add button */}
        <button
          type="button"
          onClick={() => setAddMenuOpen(!addMenuOpen)}
          className={cn(
            "top-bar-btn left",
            addMenuOpen && "active"
          )}
          title="Add content"
        >
          <Plus size={18} />
        </button>
        
        {/* Search input */}
        <div className="top-bar-search">
          <Search size={16} className="search-icon" />
          <input
            ref={inputRef}
            type="text"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            onFocus={onSearchFocus}
            onBlur={onSearchBlur}
            placeholder="Search Pawkit..."
            className="search-input"
          />
          <kbd className="search-shortcut">⌘K</kbd>
        </div>
        
        {/* Kit button */}
        <button
          type="button"
          onClick={onKitClick}
          className="top-bar-btn right kit-btn"
          title="Ask Kit"
        >
          <MessageCircle size={18} />
        </button>
      </form>
      
      {/* Add menu dropdown */}
      <TopBarAddMenu 
        open={addMenuOpen} 
        onClose={() => setAddMenuOpen(false)} 
      />
    </div>
  );
}
```

### Collapsed State

```tsx
// components/top-bar/top-bar-collapsed.tsx

'use client';

import { Plus, Search, MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TopBarCollapsedProps {
  onExpand: () => void;
  onKitClick: () => void;
}

export function TopBarCollapsed({ onExpand, onKitClick }: TopBarCollapsedProps) {
  return (
    <div className="top-bar-collapsed">
      <div className="top-bar-island">
        {/* Add button */}
        <button
          onClick={onExpand}
          className="island-btn"
          title="Add content"
        >
          <Plus size={16} />
        </button>
        
        {/* Search button - expands the bar */}
        <button
          onClick={onExpand}
          className="island-btn search"
          title="Search (⌘K)"
        >
          <Search size={16} />
        </button>
        
        {/* Kit button */}
        <button
          onClick={onKitClick}
          className="island-btn kit"
          title="Ask Kit"
        >
          <MessageCircle size={16} />
        </button>
      </div>
    </div>
  );
}
```

### Add Menu

```tsx
// components/top-bar/top-bar-add-menu.tsx

'use client';

import { useRef, useEffect } from 'react';
import { Link2, FileText, Upload, Calendar, StickyNote } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TopBarAddMenuProps {
  open: boolean;
  onClose: () => void;
}

const menuItems = [
  { icon: Link2, label: 'Add Bookmark', action: 'bookmark', shortcut: '⌘⇧B' },
  { icon: FileText, label: 'New Note', action: 'note', shortcut: '⌘⇧N' },
  { icon: StickyNote, label: 'Quick Note', action: 'quick-note' },
  { icon: Upload, label: 'Upload File', action: 'upload' },
  { icon: Calendar, label: 'New Event', action: 'event' },
];

export function TopBarAddMenu({ open, onClose }: TopBarAddMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open, onClose]);

  // Close on Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (open) {
      document.addEventListener('keydown', handleEscape);
    }
    return () => document.removeEventListener('keydown', handleEscape);
  }, [open, onClose]);

  const handleAction = (action: string) => {
    // TODO: Implement actions
    // - bookmark: Open add bookmark modal
    // - note: Navigate to /notes/new or open note modal
    // - quick-note: Open quick note capture
    // - upload: Open file picker
    // - event: Open event modal
    console.log('Add action:', action);
    onClose();
  };

  if (!open) return null;

  return (
    <div
      ref={menuRef}
      className="top-bar-add-menu"
    >
      {menuItems.map((item) => (
        <button
          key={item.action}
          onClick={() => handleAction(item.action)}
          className="add-menu-item"
        >
          <item.icon size={16} />
          <span>{item.label}</span>
          {item.shortcut && (
            <kbd className="add-menu-shortcut">{item.shortcut}</kbd>
          )}
        </button>
      ))}
    </div>
  );
}
```

### Styles & Animations

```css
/* components/top-bar/top-bar.css */

/* Container - positioned at top of content area */
.dynamic-top-bar-container {
  position: sticky;
  top: 0;
  z-index: 40;
  display: flex;
  justify-content: center;
  padding: 12px 0;
  pointer-events: none; /* Allow clicks through to content */
}

.dynamic-top-bar {
  pointer-events: auto; /* Re-enable clicks on the bar itself */
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

/* ========== EXPANDED STATE ========== */

.top-bar-expanded {
  position: relative;
}

.top-bar-pill {
  display: flex;
  align-items: center;
  gap: 0;
  width: 500px;
  max-width: calc(100vw - 48px);
  height: 48px;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 24px;
  padding: 4px;
  box-shadow: 
    0 4px 24px rgba(0, 0, 0, 0.3),
    0 0 0 1px rgba(255, 255, 255, 0.05) inset;
}

.top-bar-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 20px;
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.7);
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.top-bar-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: white;
}

.top-bar-btn.active {
  background: rgba(255, 255, 255, 0.15);
  color: white;
}

.top-bar-btn.kit-btn:hover {
  background: rgba(168, 85, 247, 0.2);
  color: rgb(216, 180, 254);
}

.top-bar-search {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 12px;
  height: 100%;
}

.search-icon {
  color: rgba(255, 255, 255, 0.5);
  flex-shrink: 0;
}

.search-input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  color: white;
  font-size: 14px;
}

.search-input::placeholder {
  color: rgba(255, 255, 255, 0.4);
}

.search-shortcut {
  padding: 2px 6px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.5);
  font-family: inherit;
  flex-shrink: 0;
}

/* ========== COLLAPSED STATE ========== */

.top-bar-collapsed {
  display: flex;
  justify-content: center;
}

.top-bar-island {
  display: flex;
  align-items: center;
  gap: 4px;
  height: 40px;
  padding: 4px 8px;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  box-shadow: 
    0 4px 16px rgba(0, 0, 0, 0.4),
    0 0 0 1px rgba(255, 255, 255, 0.05) inset;
}

.island-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 16px;
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.7);
  cursor: pointer;
  transition: all 0.2s ease;
}

.island-btn:hover {
  background: rgba(255, 255, 255, 0.15);
  color: white;
}

.island-btn.kit:hover {
  background: rgba(168, 85, 247, 0.25);
  color: rgb(216, 180, 254);
}

/* ========== SLOPES (Dynamic Island Effect) ========== */

.dynamic-top-bar-slopes {
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 200px;
  height: 52px;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.dynamic-top-bar-slopes::before,
.dynamic-top-bar-slopes::after {
  content: '';
  position: absolute;
  top: 0;
  width: 40px;
  height: 100%;
  background: var(--background); /* Match page background */
}

/* Left slope */
.dynamic-top-bar-slopes::before {
  right: 100%;
  border-radius: 0 0 20px 0;
  clip-path: path('M 40 0 L 40 52 L 0 52 Q 40 52 40 12 Z');
}

/* Right slope */
.dynamic-top-bar-slopes::after {
  left: 100%;
  border-radius: 0 0 0 20px;
  clip-path: path('M 0 0 L 0 52 L 40 52 Q 0 52 0 12 Z');
}

.slopes-visible {
  opacity: 1;
}

.slopes-hidden {
  opacity: 0;
}

/* ========== ANIMATIONS ========== */

.dynamic-top-bar.expanded {
  animation: expand 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards;
}

.dynamic-top-bar.collapsed {
  animation: collapse 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards;
}

@keyframes expand {
  from {
    transform: scale(0.8);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}

@keyframes collapse {
  from {
    transform: scale(1.1);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}

/* ========== ADD MENU ========== */

.top-bar-add-menu {
  position: absolute;
  top: calc(100% + 8px);
  left: 4px;
  min-width: 200px;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 4px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  animation: menuAppear 0.2s ease;
}

@keyframes menuAppear {
  from {
    opacity: 0;
    transform: translateY(-8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.add-menu-item {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 10px 12px;
  background: transparent;
  border: none;
  border-radius: 8px;
  color: rgba(255, 255, 255, 0.8);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.15s ease;
  text-align: left;
}

.add-menu-item:hover {
  background: rgba(255, 255, 255, 0.1);
  color: white;
}

.add-menu-item span {
  flex: 1;
}

.add-menu-shortcut {
  padding: 2px 6px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  font-size: 10px;
  color: rgba(255, 255, 255, 0.5);
  font-family: inherit;
}

/* ========== RESPONSIVE ========== */

@media (max-width: 640px) {
  .top-bar-pill {
    width: calc(100vw - 32px);
  }
  
  .search-shortcut {
    display: none;
  }
}
```

---

## Integration

### Add to Root Layout

The bar needs to be in the dashboard layout, inside the main content area (not in sidebar):

```tsx
// app/(dashboard)/layout.tsx

import { DynamicTopBar } from '@/components/top-bar/dynamic-top-bar';
import { KitOverlay } from '@/components/kit/kit-overlay';

export default function DashboardLayout({ children }) {
  return (
    <div className="dashboard-layout">
      <Sidebar />
      
      <main className="main-content">
        {/* Dynamic top bar - inside main content area */}
        <DynamicTopBar />
        
        {/* Page content */}
        {children}
      </main>
      
      {/* Kit overlay (global, renders when open) */}
      <KitOverlay />
    </div>
  );
}
```

### Remove Old FAB

Delete or comment out the bottom FAB:
- Remove `<FloatingActionBar />` from layout
- Can keep the component files for reference or delete entirely

### Scroll Container

Make sure the main content area is the scroll container, not the window. If using a custom scroll container, update the scroll listener:

```tsx
// If main content scrolls independently
useEffect(() => {
  const scrollContainer = document.querySelector('.main-content');
  if (!scrollContainer) return;
  
  const handleScroll = () => {
    const scrollY = scrollContainer.scrollTop;
    setIsCollapsed(scrollY > SCROLL_THRESHOLD);
  };

  scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
  return () => scrollContainer.removeEventListener('scroll', handleScroll);
}, []);
```

---

## Behavior Details

### Scroll Behavior
- **Threshold**: Collapse after 50px of scroll
- **Instant collapse**: No delay, responds immediately to scroll
- **Smooth animation**: 300ms transition between states

### Search Focus
- When search input is focused, bar stays expanded (never collapses)
- Blur allows collapse again

### Navigation
- Reset to expanded state when navigating to new page
- Prevents jarring collapsed state on fresh page load

### Kit Button
- Same behavior in both states: toggles Kit overlay
- Has purple highlight on hover to match Kit branding

### Add Button
- Expanded: Opens dropdown menu below the bar
- Collapsed: Expands bar first, then user can click again for menu

### Click Collapsed Bar
- Clicking any button on collapsed bar (except Kit) expands it
- Also smoothly scrolls page to top

---

## File Checklist

**New files:**
- [x] `components/top-bar/dynamic-top-bar.tsx`
- [x] `components/top-bar/top-bar-expanded.tsx`
- [x] `components/top-bar/top-bar-collapsed.tsx`
- [x] `components/top-bar/top-bar-add-menu.tsx`
- [x] `components/top-bar/top-bar.css`

**Modified files:**
- [x] `components/layout/content-panel.tsx` - Add DynamicTopBar to content area
- [x] `app/(dashboard)/layout.tsx` - Remove FAB, add event listeners for add menu

**Removed/deprecated:**
- [x] `components/fab/floating-action-bar.tsx` - Removed from layout (file kept)
- [x] `components/fab/fab-button.tsx` - No longer used (file kept)
- [x] `components/fab/fab-menu.tsx` - Logic moved to top-bar-add-menu.tsx (file kept)

---

## Testing Checklist

- [ ] Bar appears at top of content area in all views
- [ ] Collapses on scroll (after ~50px)
- [ ] Expands when scrolling back to top
- [ ] Search input focuses with ⌘K
- [ ] Search focus prevents collapse
- [ ] Add menu opens and closes correctly
- [ ] Kit button opens overlay
- [ ] Clicking collapsed bar expands it
- [ ] Smooth animations between states
- [ ] Works on mobile (responsive)
- [ ] Slopes render correctly in collapsed state
- [ ] Works in Library, Notes, Calendar, Pawkits, Home views

---

## Future Enhancements

1. **Search integration** - Connect to actual search/command palette
2. **Add menu actions** - Wire up bookmark, note, file upload flows
3. **Haptic feedback** - On mobile, vibrate on collapse/expand
4. **Custom threshold** - Let users adjust scroll sensitivity
5. **Hide option** - Button to fully hide bar (keyboard shortcut to show)

---

**End of Implementation Plan**
