# Kit Overlay UI + Floating Action Bar Implementation

> **Purpose**: Replace sidebar Kit chat with floating overlay window + action bar
> **Created**: December 10, 2025
> **Status**: Ready for implementation
> **Branch**: `feature/note-folders`

---

## Overview

Transform Kit from a cramped sidebar section into a proper floating chat window that users can position, resize, and anchor. Add a Floating Action Bar (FAB) for quick access to Kit, search, and content creation.

### Goals
1. Kit chat window as draggable/resizable overlay
2. Floating Action Bar with 3 quick actions
3. Context awareness based on current route
4. Persist window position/size across sessions

---

## Component Architecture

```
components/
├── fab/
│   ├── floating-action-bar.tsx    # Main FAB component
│   ├── fab-menu.tsx               # Slide-out menu for + button
│   └── fab-button.tsx             # Individual FAB button
├── kit/
│   ├── kit-overlay.tsx            # Main overlay container (draggable/resizable)
│   ├── kit-chat-panel.tsx         # Existing chat UI (keep, minor tweaks)
│   ├── kit-header.tsx             # Window header with controls
│   └── kit-context-indicator.tsx  # Shows current context (Library, Notes, etc.)
hooks/
├── use-kit-store.ts               # Update with window state
└── use-current-context.ts         # NEW: Detect current route/context
```

---

## Task 1: Floating Action Bar (FAB)

### Design Specs
- **Position**: Fixed, bottom-right corner (24px from edges)
- **Layout**: Horizontal row of 3 circular buttons
- **Size**: 48px diameter each, 8px gap between
- **Style**: Glass morphism matching app theme, subtle glow on hover

### Buttons (left to right)
1. **Add (+)** - Opens slide-out menu
2. **Search (🔍)** - Triggers command palette (⌘K)
3. **Kit (🐕)** - Toggles Kit overlay

### FAB Component

```tsx
// components/fab/floating-action-bar.tsx

'use client';

import { useState } from 'react';
import { Plus, Search, MessageCircle } from 'lucide-react';
import { useKitStore } from '@/hooks/use-kit-store';
import { FabButton } from './fab-button';
import { FabMenu } from './fab-menu';
import { cn } from '@/lib/utils';

export function FloatingActionBar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { isOpen, toggleOpen } = useKitStore();

  const handleSearch = () => {
    // Trigger command palette
    const event = new KeyboardEvent('keydown', {
      key: 'k',
      metaKey: true,
      bubbles: true,
    });
    document.dispatchEvent(event);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2">
      {/* Slide-out menu */}
      <FabMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
      
      {/* Add button */}
      <FabButton
        icon={Plus}
        label="Add content"
        onClick={() => setMenuOpen(!menuOpen)}
        active={menuOpen}
      />
      
      {/* Search button */}
      <FabButton
        icon={Search}
        label="Search (⌘K)"
        onClick={handleSearch}
      />
      
      {/* Kit button */}
      <FabButton
        icon={MessageCircle}
        label="Ask Kit"
        onClick={toggleOpen}
        active={isOpen}
        highlight // Purple glow for Kit
      />
    </div>
  );
}
```

### FAB Button Component

```tsx
// components/fab/fab-button.tsx

'use client';

import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FabButtonProps {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  active?: boolean;
  highlight?: boolean;
}

export function FabButton({ 
  icon: Icon, 
  label, 
  onClick, 
  active,
  highlight 
}: FabButtonProps) {
  return (
    <button
      onClick={onClick}
      title={label}
      className={cn(
        "w-12 h-12 rounded-full flex items-center justify-center",
        "bg-black/40 backdrop-blur-xl border border-white/10",
        "hover:bg-white/10 hover:border-white/20",
        "transition-all duration-200",
        "shadow-lg",
        active && "bg-white/10 border-white/20",
        highlight && "hover:shadow-purple-500/25 hover:border-purple-500/50",
        highlight && active && "shadow-purple-500/30 border-purple-500/50 bg-purple-500/20"
      )}
    >
      <Icon size={20} className={cn(
        "text-white/70",
        active && "text-white",
        highlight && active && "text-purple-300"
      )} />
    </button>
  );
}
```

### FAB Menu (Add Content)

```tsx
// components/fab/fab-menu.tsx

'use client';

import { useRef, useEffect } from 'react';
import { Link2, FileText, Upload, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FabMenuProps {
  open: boolean;
  onClose: () => void;
}

const menuItems = [
  { icon: Link2, label: 'Add Bookmark', action: 'bookmark' },
  { icon: FileText, label: 'New Note', action: 'note' },
  { icon: Upload, label: 'Upload File', action: 'upload' },
  { icon: Calendar, label: 'New Event', action: 'event' },
];

export function FabMenu({ open, onClose }: FabMenuProps) {
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

  const handleAction = (action: string) => {
    // TODO: Implement actions
    // - bookmark: Open add bookmark modal
    // - note: Navigate to /notes/new or open note modal
    // - upload: Open file picker
    // - event: Open event modal
    console.log('FAB action:', action);
    onClose();
  };

  if (!open) return null;

  return (
    <div
      ref={menuRef}
      className={cn(
        "absolute bottom-full right-0 mb-2",
        "bg-black/60 backdrop-blur-xl rounded-xl",
        "border border-white/10 shadow-xl",
        "p-2 min-w-[160px]",
        "animate-in fade-in slide-in-from-bottom-2 duration-200"
      )}
    >
      {menuItems.map((item) => (
        <button
          key={item.action}
          onClick={() => handleAction(item.action)}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2 rounded-lg",
            "text-sm text-white/80 hover:text-white",
            "hover:bg-white/10 transition-colors"
          )}
        >
          <item.icon size={16} />
          {item.label}
        </button>
      ))}
    </div>
  );
}
```

---

## Task 2: Kit Overlay Window

### Design Specs
- **Default size**: 400w × 500h pixels
- **Min size**: 320w × 400h pixels
- **Max size**: 800w × 80vh pixels
- **Default position**: Bottom-right, above FAB
- **Style**: Glass morphism, rounded corners, subtle shadow

### Features
1. **Draggable** - Grab header to move window
2. **Resizable** - Drag edges/corners to resize
3. **Anchorable** - Button to snap to right side (like existing panels)
4. **Minimizable** - Collapse to just header
5. **Closeable** - X button or click Kit FAB again

### Dependencies
Add to package.json:
```bash
pnpm add react-rnd
```
(react-rnd provides draggable + resizable in one package)

### Kit Overlay Component

```tsx
// components/kit/kit-overlay.tsx

'use client';

import { useEffect, useCallback } from 'react';
import { Rnd } from 'react-rnd';
import { useKitStore } from '@/hooks/use-kit-store';
import { KitHeader } from './kit-header';
import { KitChatPanel } from './kit-chat-panel';
import { KitContextIndicator } from './kit-context-indicator';
import { cn } from '@/lib/utils';

const DEFAULT_WIDTH = 400;
const DEFAULT_HEIGHT = 500;
const MIN_WIDTH = 320;
const MIN_HEIGHT = 400;
const MAX_WIDTH = 800;

export function KitOverlay() {
  const {
    isOpen,
    isMinimized,
    isAnchored,
    position,
    size,
    setPosition,
    setSize,
    toggleMinimized,
    toggleAnchored,
    close,
  } = useKitStore();

  // Calculate anchored position (right side, full height minus FAB space)
  const getAnchoredBounds = useCallback(() => {
    if (typeof window === 'undefined') return { x: 0, y: 0, width: DEFAULT_WIDTH, height: 500 };
    return {
      x: window.innerWidth - DEFAULT_WIDTH - 24,
      y: 80, // Below header
      width: DEFAULT_WIDTH,
      height: window.innerHeight - 160, // Leave space for FAB
    };
  }, []);

  // Handle anchor toggle
  useEffect(() => {
    if (isAnchored) {
      const bounds = getAnchoredBounds();
      setPosition({ x: bounds.x, y: bounds.y });
      setSize({ width: bounds.width, height: bounds.height });
    }
  }, [isAnchored, getAnchoredBounds, setPosition, setSize]);

  if (!isOpen) return null;

  const currentPosition = isAnchored ? getAnchoredBounds() : position;
  const currentSize = isAnchored ? getAnchoredBounds() : size;

  return (
    <Rnd
      position={{ x: currentPosition.x, y: currentPosition.y }}
      size={{ width: currentSize.width, height: isMinimized ? 48 : currentSize.height }}
      minWidth={MIN_WIDTH}
      minHeight={isMinimized ? 48 : MIN_HEIGHT}
      maxWidth={MAX_WIDTH}
      maxHeight={typeof window !== 'undefined' ? window.innerHeight - 100 : 800}
      bounds="window"
      dragHandleClassName="kit-drag-handle"
      disableDragging={isAnchored}
      enableResizing={!isAnchored && !isMinimized}
      onDragStop={(e, d) => {
        if (!isAnchored) {
          setPosition({ x: d.x, y: d.y });
        }
      }}
      onResizeStop={(e, direction, ref, delta, position) => {
        if (!isAnchored) {
          setSize({
            width: parseInt(ref.style.width),
            height: parseInt(ref.style.height),
          });
          setPosition(position);
        }
      }}
      className={cn(
        "z-[100] flex flex-col",
        "bg-black/70 backdrop-blur-xl",
        "border border-white/10 rounded-xl",
        "shadow-2xl shadow-black/50",
        "overflow-hidden",
        isAnchored && "rounded-l-xl rounded-r-none border-r-0"
      )}
    >
      {/* Header - always visible, draggable */}
      <KitHeader
        onClose={close}
        onMinimize={toggleMinimized}
        onAnchor={toggleAnchored}
        isMinimized={isMinimized}
        isAnchored={isAnchored}
      />
      
      {/* Context indicator */}
      {!isMinimized && <KitContextIndicator />}
      
      {/* Chat panel */}
      {!isMinimized && (
        <div className="flex-1 overflow-hidden">
          <KitChatPanel />
        </div>
      )}
    </Rnd>
  );
}
```

### Kit Header Component

```tsx
// components/kit/kit-header.tsx

'use client';

import { X, Minus, PanelRightClose, PanelRightOpen, GripHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';

interface KitHeaderProps {
  onClose: () => void;
  onMinimize: () => void;
  onAnchor: () => void;
  isMinimized: boolean;
  isAnchored: boolean;
}

export function KitHeader({ 
  onClose, 
  onMinimize, 
  onAnchor,
  isMinimized,
  isAnchored 
}: KitHeaderProps) {
  return (
    <div className={cn(
      "kit-drag-handle", // Makes this draggable
      "flex items-center justify-between",
      "px-3 py-2 h-12",
      "border-b border-white/10",
      "cursor-move select-none",
      "bg-white/5"
    )}>
      {/* Left side - icon and title */}
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-full bg-purple-500/20 flex items-center justify-center">
          <span className="text-sm">🐕</span>
        </div>
        <div>
          <h3 className="font-medium text-sm leading-none">Kit</h3>
          {!isMinimized && (
            <p className="text-[10px] text-muted-foreground">Your Pawkit Assistant</p>
          )}
        </div>
      </div>
      
      {/* Right side - window controls */}
      <div className="flex items-center gap-1">
        {/* Anchor button */}
        <button
          onClick={onAnchor}
          title={isAnchored ? "Detach window" : "Anchor to side"}
          className="p-1.5 hover:bg-white/10 rounded-md transition-colors"
        >
          {isAnchored ? (
            <PanelRightOpen size={14} className="text-muted-foreground" />
          ) : (
            <PanelRightClose size={14} className="text-muted-foreground" />
          )}
        </button>
        
        {/* Minimize button */}
        <button
          onClick={onMinimize}
          title={isMinimized ? "Expand" : "Minimize"}
          className="p-1.5 hover:bg-white/10 rounded-md transition-colors"
        >
          <Minus size={14} className="text-muted-foreground" />
        </button>
        
        {/* Close button */}
        <button
          onClick={onClose}
          title="Close"
          className="p-1.5 hover:bg-white/10 rounded-md transition-colors"
        >
          <X size={14} className="text-muted-foreground" />
        </button>
      </div>
    </div>
  );
}
```

### Kit Context Indicator

```tsx
// components/kit/kit-context-indicator.tsx

'use client';

import { useCurrentContext } from '@/hooks/use-current-context';
import { Library, FileText, Calendar, Folder, Home } from 'lucide-react';
import { cn } from '@/lib/utils';

const contextIcons = {
  library: Library,
  notes: FileText,
  calendar: Calendar,
  pawkit: Folder,
  home: Home,
};

const contextLabels = {
  library: 'Searching Library',
  notes: 'Searching Notes',
  calendar: 'Viewing Calendar',
  pawkit: 'In Pawkit:',
  home: 'Home',
};

export function KitContextIndicator() {
  const { context, pawkitName } = useCurrentContext();
  const Icon = contextIcons[context] || Library;
  const label = contextLabels[context] || 'Library';

  return (
    <div className={cn(
      "flex items-center gap-2 px-3 py-1.5",
      "text-xs text-muted-foreground",
      "border-b border-white/5",
      "bg-white/[0.02]"
    )}>
      <Icon size={12} />
      <span>
        {label}
        {context === 'pawkit' && pawkitName && (
          <span className="text-purple-400 ml-1">{pawkitName}</span>
        )}
      </span>
    </div>
  );
}
```

---

## Task 3: Context Awareness Hook

```tsx
// hooks/use-current-context.ts

'use client';

import { usePathname, useParams } from 'next/navigation';
import { useMemo } from 'react';

export type KitContext = 'library' | 'notes' | 'calendar' | 'pawkit' | 'home';

interface CurrentContext {
  context: KitContext;
  pawkitSlug?: string;
  pawkitName?: string;
}

export function useCurrentContext(): CurrentContext {
  const pathname = usePathname();
  const params = useParams();

  return useMemo(() => {
    // Check route patterns
    if (pathname === '/' || pathname === '/home') {
      return { context: 'home' };
    }
    
    if (pathname.startsWith('/library')) {
      return { context: 'library' };
    }
    
    if (pathname.startsWith('/notes')) {
      return { context: 'notes' };
    }
    
    if (pathname.startsWith('/calendar')) {
      return { context: 'calendar' };
    }
    
    if (pathname.startsWith('/pawkits/')) {
      const slug = params?.slug as string;
      // TODO: Could fetch pawkit name from store if available
      return { 
        context: 'pawkit',
        pawkitSlug: slug,
        pawkitName: slug // Will be slug until we wire up name lookup
      };
    }
    
    // Default to library
    return { context: 'library' };
  }, [pathname, params]);
}
```

---

## Task 4: Update Kit Store

Update the existing store to include window state:

```tsx
// hooks/use-kit-store.ts

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface Position {
  x: number;
  y: number;
}

interface Size {
  width: number;
  height: number;
}

interface KitState {
  // Window state
  isOpen: boolean;
  isMinimized: boolean;
  isAnchored: boolean;
  position: Position;
  size: Size;
  
  // Chat state
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  
  // Current context (card being discussed)
  activeCardContext: {
    id: string;
    title: string;
    content?: string;
  } | null;
  
  // Window actions
  open: () => void;
  close: () => void;
  toggleOpen: () => void;
  toggleMinimized: () => void;
  toggleAnchored: () => void;
  setPosition: (position: Position) => void;
  setSize: (size: Size) => void;
  
  // Chat actions
  addMessage: (role: 'user' | 'assistant', content: string) => void;
  clearMessages: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setActiveCardContext: (card: KitState['activeCardContext']) => void;
  sendMessage: (message: string, context?: string) => Promise<void>;
}

const DEFAULT_POSITION = { x: 0, y: 0 }; // Will be calculated on mount
const DEFAULT_SIZE = { width: 400, height: 500 };

export const useKitStore = create<KitState>()(
  persist(
    (set, get) => ({
      // Window defaults
      isOpen: false,
      isMinimized: false,
      isAnchored: false,
      position: DEFAULT_POSITION,
      size: DEFAULT_SIZE,
      
      // Chat defaults
      messages: [],
      isLoading: false,
      error: null,
      activeCardContext: null,
      
      // Window actions
      open: () => set({ isOpen: true }),
      close: () => set({ isOpen: false }),
      toggleOpen: () => set(state => ({ isOpen: !state.isOpen })),
      toggleMinimized: () => set(state => ({ isMinimized: !state.isMinimized })),
      toggleAnchored: () => set(state => ({ 
        isAnchored: !state.isAnchored,
        isMinimized: false // Expand when anchoring
      })),
      setPosition: (position) => set({ position }),
      setSize: (size) => set({ size }),
      
      // Chat actions (keep existing implementation)
      addMessage: (role, content) => {
        const message: Message = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          role,
          content,
          timestamp: new Date(),
        };
        set(state => ({
          messages: [...state.messages, message],
          error: null,
        }));
      },
      
      clearMessages: () => set({ messages: [], error: null }),
      setLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error }),
      setActiveCardContext: (card) => set({ activeCardContext: card }),
      
      sendMessage: async (message: string, context?: string) => {
        const { messages, activeCardContext, addMessage, setLoading, setError } = get();
        
        addMessage('user', message);
        setLoading(true);
        setError(null);
        
        try {
          const response = await fetch('/api/kit/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message,
              conversationHistory: messages.slice(-10).map(m => ({
                role: m.role,
                content: m.content,
              })),
              cardContext: activeCardContext,
              viewContext: context, // NEW: Pass current view context
            }),
          });
          
          const data = await response.json();
          
          if (!response.ok) {
            throw new Error(data.error || 'Failed to send message');
          }
          
          addMessage('assistant', data.message);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Something went wrong';
          setError(errorMessage);
          set(state => ({
            messages: state.messages.slice(0, -1),
          }));
        } finally {
          setLoading(false);
        }
      },
    }),
    {
      name: 'kit-store',
      partialize: (state) => ({
        // Persist window state and recent messages
        isAnchored: state.isAnchored,
        position: state.position,
        size: state.size,
        messages: state.messages.slice(-20),
      }),
    }
  )
);
```

---

## Task 5: Integration

### 1. Add FAB to main layout

In `app/(dashboard)/layout.tsx`, add:

```tsx
import { FloatingActionBar } from '@/components/fab/floating-action-bar';
import { KitOverlay } from '@/components/kit/kit-overlay';

export default function DashboardLayout({ children }) {
  return (
    <div>
      {/* Existing layout */}
      {children}
      
      {/* Kit overlay (renders when open) */}
      <KitOverlay />
      
      {/* Floating action bar (always visible) */}
      <FloatingActionBar />
    </div>
  );
}
```

### 2. Remove Kit from sidebar

Remove `<KitSection />` from control panel components:
- `components/control-panel/library-controls.tsx`
- Any other control panels that include it

### 3. Set initial position on mount

In `KitOverlay`, calculate default position based on window size:

```tsx
useEffect(() => {
  // Set initial position if not yet set (0,0)
  if (position.x === 0 && position.y === 0 && typeof window !== 'undefined') {
    setPosition({
      x: window.innerWidth - size.width - 80, // 80px from right (room for FAB)
      y: window.innerHeight - size.height - 100, // 100px from bottom
    });
  }
}, []);
```

---

## Task 6: Update Chat API for Context

Update `/api/kit/chat/route.ts` to accept and use `viewContext`:

```typescript
interface ChatRequest {
  message: string;
  conversationHistory?: ChatMessage[];
  cardContext?: { ... };
  viewContext?: 'library' | 'notes' | 'calendar' | 'pawkit' | 'home';
}

// In the handler, pass viewContext to buildKitContext
const context = await buildKitContext(
  user.id, 
  message, 
  supabase, 
  cardContext,
  body.viewContext // NEW
);
```

Then update `buildKitContext` to adjust behavior based on view:
- `notes` → Fetch notes instead of cards
- `calendar` → Fetch events
- `pawkit` → Filter to specific collection
- `library` / `home` → Current behavior (all cards)

---

## File Checklist

After implementation, these files should exist/be updated:

**New files:**
- [ ] `components/fab/floating-action-bar.tsx`
- [ ] `components/fab/fab-button.tsx`
- [ ] `components/fab/fab-menu.tsx`
- [ ] `components/kit/kit-overlay.tsx`
- [ ] `components/kit/kit-header.tsx`
- [ ] `components/kit/kit-context-indicator.tsx`
- [ ] `hooks/use-current-context.ts`

**Updated files:**
- [ ] `hooks/use-kit-store.ts` - Add window state
- [ ] `app/(dashboard)/layout.tsx` - Add FAB and KitOverlay
- [ ] `components/control-panel/library-controls.tsx` - Remove KitSection
- [ ] `app/api/kit/chat/route.ts` - Accept viewContext
- [ ] `lib/ai/kit-context.ts` - Use viewContext

**Dependencies:**
- [ ] `pnpm add react-rnd`

---

## Testing Checklist

- [ ] FAB appears in bottom-right corner
- [ ] Click Kit button opens overlay
- [ ] Click Kit button again closes overlay
- [ ] Overlay is draggable by header
- [ ] Overlay is resizable from edges/corners
- [ ] Anchor button snaps window to right side
- [ ] Minimize collapses to header only
- [ ] Close button closes window
- [ ] Position and size persist after refresh
- [ ] Context indicator shows current route
- [ ] Chat still works correctly
- [ ] Search button triggers command palette
- [ ] Add menu opens with options

---

## Future Enhancements (Not in scope)

1. **Keyboard shortcut** - `⌘+Shift+K` to toggle Kit
2. **Drag to anchor** - Drag window to edge to auto-anchor
3. **Multiple windows** - Support multiple Kit conversations
4. **Kit actions** - Create events, bookmarks from chat
5. **Voice input** - Microphone button for speech-to-text

---

**End of Implementation Plan**
