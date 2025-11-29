---
name: pawkit-troubleshooting
description: Living document of issues encountered, their fixes, and prevention patterns
---

# Pawkit Troubleshooting Guide

**A living document of issues encountered, their fixes, and prevention patterns**

---

## Table of Contents

1. [How to Use This Document](#how-to-use-this-document)
2. [Known Issues & Fixes](#known-issues--fixes)
   - Variable Scope in Try-Catch Blocks
   - 'deleted' Field Not in Prisma Schema
   - PATCH vs PUT for Updates
   - Missing CORS Headers
   - Den Field Migration Timing
   - extractAndSaveLinks Performance
   - Multi-Session Conflict Detection
   - 'Failed to sync settings to server' Error
   - Chromium Flickering in Library View
   - Note Creation Defaulting to Daily Notes
   - Context Menus Rendering Behind Sidebar (z-index)
   - GenericContextMenu asChild Not Working with Complex Components
   - ESC Key Closing Sidebar Instead of Modal
   - Window.prompt() Breaking Visual Consistency
   - Deduplication Corrupting Data
   - Deduplication Removing Legitimate Server Cards
   - Sign Out Button Not Working - Dynamic Imports Failing Silently
   - User Isolation Failure - Missing localStorage Cleanup
   - Duplicate Card Issue - Deleted Cards Returned
   - Deleted Cards Appearing in Library View
   - Sync System Architectural Issues (January 2025 Analysis)
   - Duplicate Daily Note Creation in Notes View
   - Tags Column Displaying Collections Instead of Tags
   - Dead Code - Unused AppSidebar Component
   - Performance - Excessive Re-renders from Store Subscriptions
   - Duplicate URL Detection - Deleted Cards Not Excluded
   - Collection Header Label - Not Showing Pawkit Name (Mobile)
   - Browser Extension - Collections Using Slugs Not IDs
   - Ultrawide Monitor Card Rendering (Chrome GPU)
   - Rediscover Queue Reset on Card Update
   - Slow Modal Loading (API vs Local Data Store)
   - Optimistic Updates Pattern
   - Hidden vs Invisible CSS Classes
   - Panel Store close() Clears activeCardId
3. [Debugging Strategies](#debugging-strategies)
4. [How to Add New Issues](#how-to-add-new-issues)
5. [Maintenance](#maintenance)

---

## How to Use This Document

### When to Check This Guide

**✅ Check here FIRST when encountering:**
- API routes returning 500 errors
- TypeScript compilation errors
- Sync failures or conflicts
- Performance degradation
- Schema/database errors
- CORS issues
- Unexpected behavior after deployments

**✅ Add to this guide AFTER:**
- Fixing any bug that took >30 minutes to debug
- Discovering a pattern that caused issues
- Learning a new prevention technique
- Identifying a common pitfall

**✅ Update regularly:**
- After every major deployment
- When standardizing a new pattern
- When discovering edge cases
- During quarterly reviews

### This is a Living Document

This guide should grow and evolve with the codebase. Don't let it get stale:
- Remove issues that are no longer relevant
- Update fixes when better solutions are found
- Add new categories as patterns emerge
- Keep examples current with latest code

---

## Known Issues & Fixes

### 1. Variable Scope in Try-Catch Blocks

**Issue**: Variables declared inside try block are not accessible in catch block, causing TypeScript errors and preventing proper error logging.

**What Failed**:
```tsx
// ❌ WRONG: Variables not accessible in catch
export async function POST(request: Request) {
  try {
    const user = await getServerUser(request);
    const body = await request.json();

    // ... code
  } catch (error) {
    // ❌ ERROR: 'user' and 'body' not accessible here
    console.error('Error for user:', user?.id, error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'An error occurred' } },
      { status: 500 }
    );
  }
}
```

**The Fix**:
```tsx
// ✅ CORRECT: Variables declared outside try block
export async function POST(request: Request) {
  let user: User | null = null;
  let body: any = null;

  try {
    user = await getServerUser(request);
    body = await request.json();

    // ... code
  } catch (error) {
    // ✅ user and body are accessible here
    console.error('Error for user:', user?.id, 'with body:', body, error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'An error occurred' } },
      { status: 500 }
    );
  }
}
```

**How to Avoid**:
- Always declare variables outside try block if needed in catch
- Use optional chaining (`user?.id`) when accessing in catch
- Initialize with appropriate types (`User | null`, `any`, etc.)
- Pattern applies to ALL API routes

**Impact**: Standardized across 30 routes in October 2025 audit

---

### 2. 'deleted' Field Not in Prisma Schema

**Issue**: Using `deleted` field in Prisma queries causes runtime errors because the field was removed from schema (replaced with `deletedAt`).

**What Failed**:
```tsx
// ❌ WRONG: 'deleted' field doesn't exist
const cards = await prisma.card.findMany({
  where: {
    userId: user.id,
    deleted: false  // ❌ ERROR: Field doesn't exist
  }
});

// ❌ WRONG: Trying to update 'deleted' field
await prisma.card.update({
  where: { id: cardId },
  data: { deleted: true }  // ❌ ERROR: Field doesn't exist
});
```

**The Fix**:
```tsx
// ✅ CORRECT: Use 'deletedAt' for soft deletes
const cards = await prisma.card.findMany({
  where: {
    userId: user.id,
    deletedAt: null  // ✅ Not deleted
  }
});

// ✅ CORRECT: Set deletedAt timestamp for soft delete
await prisma.card.update({
  where: { id: cardId },
  data: { deletedAt: new Date() }
});

// ✅ CORRECT: To "undelete", set back to null
await prisma.card.update({
  where: { id: cardId },
  data: { deletedAt: null }
});
```

**How to Avoid**:
- **NEVER** use `deleted` field in any Prisma operation
- Always use `deletedAt: null` to filter non-deleted records
- Use `deletedAt: new Date()` for soft deletes
- Use `deletedAt: { not: null }` to query only deleted records
- Search codebase for "deleted:" before deploying

**Where to Check**:
- All Prisma queries in `/app/api/**/*.ts`
- Database queries in `/lib/db/*.ts`
- Type definitions in `/types/**/*.ts`

**Impact**: This caused production errors in October 2025, fixed in schema migration

---

### 3. PATCH vs PUT for Updates

**Issue**: Using PUT for updates is not standardized in our API. We exclusively use PATCH for partial updates.

**What Failed**:
```tsx
// ❌ WRONG: Using PUT method
export async function PUT(request: Request) {
  const body = await request.json();
  // ... update logic
}

// ❌ Client code using PUT
const response = await fetch('/api/cards/123', {
  method: 'PUT',
  body: JSON.stringify(updates)
});
```

**The Fix**:
```tsx
// ✅ CORRECT: Use PATCH for updates
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  let user: User | null = null;
  let body: any = null;

  try {
    user = await getServerUser(request);
    body = await request.json();

    const updated = await prisma.card.update({
      where: { id: params.id },
      data: body
    });

    return NextResponse.json(
      { success: true, data: updated },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error updating card:', user?.id, error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to update' } },
      { status: 500 }
    );
  }
}

// ✅ Client code using PATCH
const response = await fetch('/api/cards/123', {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(updates)
});
```

**How to Avoid**:
- **ALWAYS** use PATCH for partial updates
- **NEVER** use PUT in Pawkit API
- Standardized pattern: GET, POST, PATCH, DELETE only
- Review all API routes before deployment

**Why PATCH?**:
- PATCH is semantically correct for partial updates
- PUT requires sending complete resource representation
- PATCH is more efficient (only send changed fields)
- Consistent with REST best practices

**Impact**: Standardized across all 30 routes in October 2025

---

### 4. Missing CORS Headers

**Issue**: API routes return CORS errors when called from browser extension because CORS headers are missing or incorrect.

**What Failed**:
```tsx
// ❌ WRONG: No CORS headers
export async function POST(request: Request) {
  const user = await getServerUser(request);
  const data = await processRequest(request);

  return NextResponse.json(
    { success: true, data },
    { status: 200 }
    // ❌ Missing CORS headers - extension calls fail
  );
}

// ❌ WRONG: Incorrect CORS headers
export async function POST(request: Request) {
  // ... code

  return NextResponse.json(
    { success: true, data },
    {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': 'https://example.com'  // ❌ Wrong origin
      }
    }
  );
}
```

**The Fix**:
```tsx
// ✅ CORRECT: Use getCorsHeaders helper
import { getCorsHeaders } from '@/lib/cors';

export async function POST(request: Request) {
  let user: User | null = null;

  try {
    user = await getServerUser(request);
    const data = await processRequest(request);

    return NextResponse.json(
      { success: true, data },
      {
        status: 200,
        headers: getCorsHeaders(request)  // ✅ Correct CORS headers
      }
    );
  } catch (error) {
    console.error('Error:', user?.id, error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'An error occurred' } },
      {
        status: 500,
        headers: getCorsHeaders(request)  // ✅ Also on error responses
      }
    );
  }
}

// ✅ CORRECT: Handle OPTIONS preflight
export async function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: getCorsHeaders(request)
  });
}
```

**getCorsHeaders Helper** (`/lib/cors.ts`):
```tsx
export function getCorsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get('origin');

  // Allow extension origins
  const allowedOrigins = [
    'chrome-extension://',
    'moz-extension://',
    process.env.NEXT_PUBLIC_APP_URL
  ].filter(Boolean);

  const isAllowed = allowedOrigins.some(allowed =>
    origin?.startsWith(allowed as string)
  );

  if (!isAllowed) {
    return {};
  }

  return {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400'
  };
}
```

**How to Avoid**:
- **ALWAYS** use `getCorsHeaders(request)` helper on ALL responses
- Include CORS headers on success AND error responses
- Always implement OPTIONS handler for preflight requests
- Test with browser extension before deploying

**Where to Add**:
- All API routes in `/app/api/**/*.ts`
- Both success and error response paths
- OPTIONS method for preflight requests

**Impact**: Fixed extension CORS issues in October 2025

---

### 5. Den Field Migration Timing

**Issue**: Removing `inDen` field too early breaks existing code. Need to keep both fields during migration period.

**What Failed**:
```tsx
// ❌ WRONG: Dropping old field immediately
// Week 1: Added isPrivate field
await prisma.$executeRaw`ALTER TABLE collections ADD COLUMN "isPrivate" BOOLEAN`;

// Week 1: Dropped inDen field immediately
await prisma.$executeRaw`ALTER TABLE collections DROP COLUMN "inDen"`;
// ❌ ERROR: Existing code still uses inDen!
```

**The Fix**:
```tsx
// ✅ CORRECT: Gradual migration over 2-3 weeks

// Week 0 (Oct 15): Add new field, keep old
await prisma.$executeRaw`
  ALTER TABLE collections
  ADD COLUMN "isPrivate" BOOLEAN DEFAULT false
`;
// inDen still exists and works

// Week 1 (Oct 16): Deploy migration route
export async function POST(request: Request) {
  const user = await getServerUser(request);

  // Migrate user's data
  await prisma.collection.updateMany({
    where: {
      userId: user.id,
      inDen: true,
      isPrivate: null
    },
    data: { isPrivate: true }
  });

  return NextResponse.json({ success: true });
}

// Week 1-2 (Oct 17-30): Update code to use isPrivate
// Both fields work during transition

// Week 3 (Nov 1): Verify 100% migrated
const unmigrated = await prisma.collection.count({
  where: {
    inDen: true,
    isPrivate: null
  }
});
console.log('Unmigrated collections:', unmigrated);  // Should be 0

// Week 3 (Nov 5): Drop old field
await prisma.$executeRaw`ALTER TABLE collections DROP COLUMN "inDen"`;
```

**How to Avoid**:
- **NEVER** drop old fields immediately
- Keep old fields for 2-3 weeks minimum
- Deploy migration route first
- Monitor migration progress
- Verify 100% completion before dropping
- Update all code before dropping field

**Migration Timeline**:
1. Week 0: Add new field (keep old)
2. Week 1: Deploy migration route
3. Week 1-2: Gradual migration (per user on login)
4. Week 2-3: Monitor and verify
5. Week 3+: Drop old field after 100% verified

**Impact**: Den→Private Pawkits migration October 2025, zero data loss

**See**: `.claude/skills/pawkit-migrations/SKILL.md` for full migration patterns

---

### 6. extractAndSaveLinks Performance

**Issue**: `extractAndSaveLinks` function runs on every keystroke in note editor, causing excessive IndexedDB writes and performance degradation.

**What Failed**:
```tsx
// ❌ WRONG: Runs on every keystroke
function NoteEditor({ noteId }: { noteId: string }) {
  const [content, setContent] = useState('');

  useEffect(() => {
    extractAndSaveLinks(content, noteId);
    // ❌ Runs on EVERY character typed!
    // User types "hello" = 5 DB writes
  }, [content, noteId]);

  return (
    <textarea
      value={content}
      onChange={(e) => setContent(e.target.value)}
    />
  );
}
```

**The Fix**:
```tsx
// ✅ CORRECT: Debounced 500ms
import { debounce } from 'lodash';
import { useCallback, useEffect } from 'react';

function NoteEditor({ noteId }: { noteId: string }) {
  const [content, setContent] = useState('');

  // ✅ Create debounced function
  const extractDebounced = useCallback(
    debounce((text: string, id: string) => {
      extractAndSaveLinks(text, id);
    }, 500),  // Wait 500ms after last keystroke
    []
  );

  useEffect(() => {
    extractDebounced(content, noteId);

    // ✅ Cleanup on unmount
    return () => {
      extractDebounced.cancel();
    };
  }, [content, noteId, extractDebounced]);

  return (
    <textarea
      value={content}
      onChange={(e) => setContent(e.target.value)}
    />
  );
}
```

**Alternative: useDebouncedCallback Hook**:
```tsx
import { useDebouncedCallback } from 'use-debounce';

function NoteEditor({ noteId }: { noteId: string }) {
  const [content, setContent] = useState('');

  const extractDebounced = useDebouncedCallback(
    (text: string) => {
      extractAndSaveLinks(text, noteId);
    },
    500  // 500ms debounce
  );

  useEffect(() => {
    extractDebounced(content);
  }, [content, extractDebounced]);

  return (
    <textarea
      value={content}
      onChange={(e) => setContent(e.target.value)}
    />
  );
}
```

**How to Avoid**:
- **ALWAYS** debounce expensive operations in text inputs
- Use 500ms for link extraction and parsing
- Use 2000ms for server sync operations
- Clean up debounce timers on unmount
- Test typing performance before deploying

**When to Debounce**:
- Text input with processing (500ms)
- Server sync operations (2000ms)
- Search/filter operations (300ms)
- Auto-save operations (1000ms)

**Performance Impact**:
- Before: 5 DB writes for "hello" (5 keystrokes)
- After: 1 DB write after user stops typing
- 80% reduction in IndexedDB operations

**See**: `.claude/skills/pawkit-performance/SKILL.md` for more optimization patterns

---

### 7. Multi-Session Conflict Detection

**Issue**: Multiple tabs editing same data simultaneously causes conflicts, data loss, and cursor jumping without proper session coordination.

**What Failed**:
```tsx
// ❌ WRONG: No session check before editing
async function updateCard(cardId: string, updates: Partial<Card>) {
  // ❌ No check if another tab is editing
  await updateInIndexedDB(cardId, updates);
  queueSync(cardId);

  // ❌ Result: Race conditions, conflicts, data loss
}
```

**The Fix**:
```tsx
// ✅ CORRECT: Check active sessions before editing
import { useMultiSessionStore } from '@/stores/multiSessionStore';

async function updateCard(cardId: string, updates: Partial<Card>) {
  const { canWrite } = useMultiSessionStore.getState();

  // ✅ Check if this tab can write
  if (!canWrite()) {
    toast.error('Another tab is editing. Click "Take Control" to edit here.');
    return;
  }

  // ✅ Safe to write - no other active sessions
  await updateInIndexedDB(cardId, updates);
  queueSync(cardId);
}

// ✅ UI shows active session warning
function CardEditor({ card }: { card: Card }) {
  const { canWrite, activeSessions } = useMultiSessionStore();

  if (!canWrite()) {
    return (
      <div className="warning">
        <AlertCircle />
        Another tab is editing.
        <button onClick={() => takeControl()}>
          Take Control
        </button>
      </div>
    );
  }

  return <CardForm card={card} onSave={updateCard} />;
}
```

**Multi-Session Store** (`/stores/multiSessionStore.ts`):
```tsx
import create from 'zustand';

interface MultiSessionState {
  sessionId: string;
  activeSessions: Set<string>;
  canWrite: () => boolean;
  takeControl: () => void;
  checkSessions: () => void;
}

export const useMultiSessionStore = create<MultiSessionState>((set, get) => ({
  sessionId: generateSessionId(),
  activeSessions: new Set(),

  canWrite: () => {
    const { sessionId, activeSessions } = get();
    // Can write if this is the only active session
    return activeSessions.size === 0 ||
           (activeSessions.size === 1 && activeSessions.has(sessionId));
  },

  takeControl: () => {
    const { sessionId } = get();
    // Mark this session as active
    localStorage.setItem('activeSession', sessionId);
    set({ activeSessions: new Set([sessionId]) });
  },

  checkSessions: () => {
    const activeSession = localStorage.getItem('activeSession');
    const { sessionId } = get();

    if (activeSession && activeSession !== sessionId) {
      set({ activeSessions: new Set([activeSession]) });
    } else {
      set({ activeSessions: new Set() });
    }
  }
}));

// ✅ Check sessions every 2 seconds
setInterval(() => {
  useMultiSessionStore.getState().checkSessions();
}, 2000);
```

**How to Avoid**:
- **ALWAYS** check `canWrite()` before editing operations
- Show clear UI warnings when other tabs are active
- Provide "Take Control" option for users
- Use localStorage to track active session
- Broadcast session changes via BroadcastChannel

**Where to Add**:
- Card editor components
- Note editor components
- Pawkit editor components
- Any form that modifies shared data

**Conflict Resolution**:
1. Detect conflict (multiple active sessions)
2. Show warning to user
3. User chooses: wait, take control, or cancel
4. If take control: mark session active, proceed
5. Other tabs show warning and become read-only

**Impact**: Implemented October 2025 to prevent data loss from multi-tab editing

**See**: `.claude/skills/pawkit-sync-patterns/SKILL.md` for complete multi-session patterns

---

### 8. 'Failed to sync settings to server' Error

**Issue**: Error message about syncing view settings to server, but feature doesn't exist in current codebase.

**What Failed**:
```tsx
// ❌ ERROR: File doesn't exist
// lib/hooks/view-settings-store.ts
const syncToServer = async () => {
  const response = await fetch('/api/user/view-settings', {
    method: 'PATCH',
    body: JSON.stringify(settings)
  });
  
  if (!response.ok) {
    throw new Error('Failed to sync settings to server');
    // ❌ This error appears but shouldn't - no server sync exists!
  }
};
```

**The Reality**:
```tsx
// ✅ CURRENT IMPLEMENTATION: localStorage-only view settings
// app/(dashboard)/library/page.tsx
const savedLayout = typeof window !== 'undefined' 
  ? localStorage.getItem("library-layout") as LayoutMode | null 
  : null;

// Each view stores its own settings locally:
// - library-layout
// - notes-layout  
// - pawkit-{slug}-layout
// These don't sync to server (by design)
```

**Root Cause**:
- **No server sync implemented** - View settings are intentionally localStorage-only
- If you see this error, it's from:
  1. Old uncommitted code from previous session
  2. Stale webpack cache referencing deleted files
  3. Confusion about feature state

**Investigation Findings**:
```bash
# Searched for view-settings-store.ts - doesn't exist
$ find . -name "*view-settings*"
# No results

# Checked for server sync code - not implemented  
$ grep -r "syncToServer" .
# No results

# Current implementation confirmed
$ grep -r "localStorage.getItem.*layout" .
# Found in library/page.tsx, notes/page.tsx, pawkits/[slug]/page.tsx
```

**The Fix**:
```bash
# If you see this error:
# 1. Clear Next.js cache
cd "Test Bookmark Manager/Pawkit"
rm -rf .next
npm run dev

# 2. Verify no old files exist
find . -name "*view-settings-store*"
# Should return nothing

# 3. Confirm localStorage pattern
grep "localStorage.getItem" app/**/*.tsx
# Should see library-layout, notes-layout, etc.
```

**How to Avoid**:
- **Remember**: View settings = localStorage only (no server sync currently)
- If you see references to `syncToServer` or `view-settings-store.ts`, that's old code
- Clear `.next` cache when switching branches or after context loss
- Don't confuse this with `settings-store.ts` (which DOES exist, for app preferences)
- Server sync is on roadmap but not yet implemented

**Current localStorage Keys**:
```typescript
// Per-view layout preferences (localStorage only)
localStorage.getItem('library-layout')     // 'grid' | 'list' | 'masonry' | 'compact'
localStorage.getItem('notes-layout')       // same options
localStorage.getItem(`pawkit-${slug}-layout`) // per-collection layout
localStorage.getItem('timeline-layout')    // timeline view layout

// These are intentionally per-device, don't sync across browsers
```

**If You Want Server Sync**:
- This feature is on the roadmap (not yet implemented)
- Would require:
  1. New `UserViewSettings` Prisma model
  2. `/api/user/view-settings` endpoint (GET/PATCH)
  3. `view-settings-store.ts` Zustand store with sync
  4. Migration from localStorage to server
- See roadmap skill for prioritization

**Impact**: Clarified October 29, 2025 during debugging session - confirmed localStorage-only is current architecture

**See**: `.claude/skills/pawkit-conventions/SKILL.md` for view settings pattern documentation

---

### 9. Chromium Flickering in Library View (Multi-Select Integration)

**Issue**: Cards flicker and disappear in Library view when left sidebar is floating and right sidebar is anchored, but ONLY in Chromium browsers (Chrome, Dia, Edge). Works perfectly in Firefox and Zen Browser.

**Discovered**: October 29, 2025 during multi-select UI integration

**Context**:
- This started happening after multi-select integration moved bulk operations into right sidebar (commit 6f78f08)
- Previously worked fine (commit 8eb379e)
- Bug is specific to the combination: left floating + right anchored + Show Thumbnails + Show Labels

**What Failed** (All 8 attempted fixes):

```tsx
// ❌ ATTEMPT 1: CSS Padding Hacks
// Tried adding padding to content container to prevent overlap
<div className="flex-1 overflow-y-auto px-6 py-6 pr-[341px]">
  {children}
</div>
// Result: Made visual unity worse, cards still disappeared

// ❌ ATTEMPT 2: ResizeObserver Optimization
const resizeObserver = new ResizeObserver(() => {
  // Removed forced reflow
  // element.style.columns = 'auto';
  // element.offsetHeight; // ❌ This was causing infinite loop
  // element.style.columns = originalColumns;

  // Fixed infinite loop but flickering remained
});
// Result: Reduced resize count (8+ → fewer) but flickering persists

// ❌ ATTEMPT 3: Debounced ResizeObserver
const resizeObserver = new ResizeObserver((entries) => {
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(() => {
    // Process resize only after 350ms of no changes
    recalculateMasonry();
  }, 350); // Match ContentPanel transition duration
});
// Result: Helped slightly but core issue persists

// ❌ ATTEMPT 4: ContentPanel Hardware Acceleration
<div
  style={{
    willChange: "left, right",      // Hint to optimize transitions
    transform: "translateZ(0)",      // Force hardware acceleration
    transition: "left 0.3s ease-out, right 0.3s ease-out",
  }}
>
// Result: Panel transitions smoothly but cards still flicker

// ❌ ATTEMPT 5: Backdrop-blur Pills Optimization
<a
  className="backdrop-blur-md bg-black/40"
  style={{
    willChange: 'width',             // Pills resize during layout
    transform: 'translateZ(0)',      // GPU acceleration
  }}
>
// Result: Pills render better but cards still flicker

// ❌ ATTEMPT 6: Card Container GPU Acceleration
<div
  className="card-container"
  style={{
    willChange: 'transform',
    transform: 'translateZ(0)',
  }}
>
// Result: No visible improvement

// ❌ ATTEMPT 7: Masonry Container Optimization
case "masonry":
  return {
    style: {
      columns: `${columnWidth}px`,
      columnGap: `${gapPx}px`,
      willChange: 'columns',          // Hint GPU to optimize
      transform: 'translateZ(0)',     // Force GPU layer
    }
  };
// Result: Flickering persists

// ❌ ATTEMPT 8: Disable ContentPanel Transitions
<div
  style={{
    // Disable smooth transitions in embedded mode
    transition: isRightEmbedded ? "none" : "left 0.3s ease-out, right 0.3s ease-out",
  }}
>
// Result: No improvement (issue is CSS columns recalculation, not transitions)
```

**Root Cause Analysis**:

```tsx
// The problem sequence:
// 1. Right panel anchors → ContentPanel resizes from 1342px → 1359px
// 2. ContentPanel transition takes 300ms
// 3. During transition, browser fires 8+ resize events
// 4. Each resize triggers CSS columns recalculation
// 5. Chromium's CSS columns implementation can't handle parent transitions
// 6. Backdrop-blur pills recalculate width on each resize
// 7. Each recalculation triggers expensive repaint of backdrop filter
// 8. Result: Cards flicker and temporarily disappear

// Debug output showing the issue:
console.log('=== MASONRY RESIZE ===');
console.log('Container width:', entry.contentRect.width);  // 1342 → 1345 → 1350 → 1355 → 1359
console.log('Columns:', Math.floor(entry.contentRect.width / columnWidth));
// During 300ms transition, this logs 8+ times in Chromium
// In Firefox, logs only 1-2 times (handles CSS columns better)
```

**Why It Only Affects Chromium**:

```tsx
// Firefox CSS Columns Implementation:
// - Batches multiple resize events intelligently
// - Defers column recalculation until final size
// - Better optimized backdrop-blur rendering
// - Result: Smooth transition, no flickering

// Chromium CSS Columns Implementation:
// - Recalculates columns on EVERY resize event
// - Can't defer recalculation during parent transitions
// - Backdrop-blur triggers full repaint on each recalculation
// - Result: Flickering and disappearing cards

// This is a known Chromium issue with CSS columns + dynamic parent widths
// See: https://bugs.chromium.org/p/chromium/issues/detail?id=1234567 (example)
```

**Trigger Conditions**:

```tsx
// Configuration that triggers the bug:
const bugTriggers = {
  leftPanel: "floating",      // Left sidebar not taking layout space
  rightPanel: "anchored",     // Right sidebar attached to content panel
  showThumbnails: true,       // Thumbnail images enabled
  showLabels: true,           // URL/title pills enabled (backdrop-blur)
  browser: "chromium",        // Chrome, Dia, Edge, Brave (not Firefox/Zen)
  layout: "masonry"           // CSS columns layout
};

// Works fine if ANY of these is changed:
// - leftPanel: "anchored" (both panels anchored = no embedded mode)
// - rightPanel: "floating" (no embedding, standard positioning)
// - showThumbnails: false (fewer elements to reflow)
// - showLabels: false (no backdrop-blur recalculations)
// - browser: "firefox" (better CSS columns implementation)
// - layout: "grid" (no CSS columns)
```

**Workarounds**:

```tsx
// Option 1: Use Firefox or Zen Browser
// - These browsers handle CSS columns transitions correctly
// - No flickering, works perfectly

// Option 2: Disable one view setting
localStorage.setItem('show-thumbnails', 'false');  // OR
localStorage.setItem('show-labels', 'false');
// - Reduces elements being reflowed
// - Eliminates flickering

// Option 3: Keep panels in different modes
// - Keep right panel floating instead of anchored
// - OR keep left panel anchored
// - Avoids embedded panel mode that triggers the issue

// Option 4: Use different layout
localStorage.setItem('library-layout', 'grid');  // Instead of 'masonry'
// - Grid layout doesn't use CSS columns
// - No flickering but different visual layout
```

**Potential Future Solutions**:

```tsx
// Solution 1: Switch to JavaScript Masonry Library
import Masonry from 'masonry-layout';
// OR
import { Masonry } from 'react-masonry-css';

// Pros: Full control over layout recalculation, can batch updates
// Cons: Larger bundle, more complex implementation, 4-6 hours work

// Solution 2: Implement Virtual Scrolling
import { FixedSizeGrid } from 'react-window';

// Pros: Only renders visible cards, reduces reflow during transition
// Cons: Complex with masonry layout, 6-8 hours work

// Solution 3: Detect Chromium and Use Different Layout
const isChromium = !!window.chrome;
const layout = isChromium && isEmbeddedMode ? 'grid' : 'masonry';

// Pros: Quick fix, automatic browser detection
// Cons: Different UX for different browsers, not ideal

// Solution 4: Wait for Chromium Fix
// - File bug report with Chromium team
// - Wait for browser update
// Pros: Zero code changes needed
// Cons: Unknown timeline, may never be fixed

// Solution 5: Revert Multi-Select Integration
// - Go back to commit 8eb379e (known working state)
// - Keep multi-select as overlay drawer instead of panel
// Pros: Guaranteed fix
// Cons: Loses better UX from panel integration
```

**Related Debugging**:

```tsx
// Add debug logging to track the issue
// components/layout/content-panel.tsx
useEffect(() => {
  console.log('=== CONTENT PANEL DEBUG ===');
  console.log('Left:', { open: leftOpen, mode: leftMode, anchored: hasAnchoredLeft });
  console.log('Right:', { open: rightOpen, mode: rightMode, anchored: hasAnchoredRight });
  console.log('Content anchored:', contentIsAnchored);
  console.log('Right embedded:', isRightEmbedded);
  console.log('Positions:', { left: leftPosition, right: rightPosition });

  setTimeout(() => {
    const panel = document.querySelector('[data-content-panel]');
    if (panel) {
      const rect = panel.getBoundingClientRect();
      console.log('Actual ContentPanel dimensions:', {
        left: rect.left,
        right: rect.right,
        width: rect.width,    // Watch this change: 1342 → 1359px
        height: rect.height
      });
    }
  }, 350); // After transition completes
}, [leftOpen, leftMode, rightOpen, rightMode]);

// components/library/card-gallery.tsx
const resizeObserver = new ResizeObserver((entries) => {
  for (const entry of entries) {
    console.log('=== MASONRY RESIZE ===');
    console.log('Width:', entry.contentRect.width);
    console.log('Columns:', Math.floor(entry.contentRect.width / columnWidth));
    // In Chromium: This logs 8+ times during transition
    // In Firefox: This logs 1-2 times
  }
});
```

**How to Reproduce**:

```bash
# Steps:
# 1. Use Chrome, Dia, or Edge (Chromium browsers)
# 2. Go to Library view
# 3. Enable "Show Thumbnails" in right panel settings
# 4. Enable "Show Labels" in right panel settings
# 5. Set left panel to floating mode (click float button)
# 6. Set right panel to anchored mode (click anchor button)
# 7. Observe cards flickering when panel anchors/unanchors

# To verify Firefox works:
# 1. Open same page in Firefox or Zen Browser
# 2. Follow same steps
# 3. Observe: No flickering, smooth transition
```

**How to Avoid**:

- **Document limitations** - Add to user documentation that Chromium has rendering issues with certain panel combinations
- **Recommend Firefox** - Suggest Firefox/Zen for best experience in docs
- **Default to floating panels** - Keep panels in floating mode by default to avoid issue
- **Test across browsers** - Always test panel transitions in both Chromium and Firefox before shipping
- **Monitor Chromium bugs** - Watch for CSS columns improvements in future Chromium releases

**When This Might Be Fixed**:
- If Chromium improves CSS columns rendering during parent transitions
- If we switch to JavaScript masonry library (planned for Phase 2 performance optimization)
- If we implement virtual scrolling (planned for Phase 2)

**Decision**: Shipping with bug - Firefox/Zen users unaffected, Chromium users have workarounds, low priority for post-launch

**Impact**: Documented October 29, 2025 - Shipping with known issue, affects minority of users (Chromium only), workarounds available

**Related Commits**:
- 6f78f08 - Multi-select integration (when issue started)
- fae06ff - Reverted to original ContentPanel (removed padding hacks)
- 379bcd9 - Fixed ResizeObserver infinite loop
- 35a7f02 - Debounced ResizeObserver (350ms)
- e46a48d - Hardware acceleration on ContentPanel
- dd6e0d9 - Hardware acceleration on backdrop-blur pills
- 202b040 - GPU acceleration on card containers
- 3541ab3 - Hardware acceleration on masonry container
- 15449f5 - Disabled ContentPanel transitions in embedded mode
- 8eb379e - Last known working state before multi-select integration

**See**:
- `.claude/skills/pawkit-roadmap/SKILL.md` - KNOWN ISSUES section
- `.claude/skills/pawkit-performance/SKILL.md` - For future masonry optimization plans
- `.claude/skills/pawkit-ui-ux/SKILL.md` - Panel modes and embedded panel pattern

### 10. Note Creation Defaulting to Daily Notes

**Issue**: When creating a note, all notes were defaulting to daily notes regardless of user selection. State persisted between modal opens.

**What Failed**:
```tsx
// ❌ WRONG: Modal state persists between opens
export function CreateNoteModal({ open, onClose, onConfirm }: Props) {
  const [noteType, setNoteType] = useState<"md-note" | "text-note" | "daily-note">("md-note");
  const [title, setTitle] = useState("");

  // ❌ State persists - if user clicked "Daily Note" then closed modal,
  // noteType stays "daily-note" on next open

  if (!open) return null;
  // ... modal content
}
```

**The Fix**:
```tsx
// ✅ CORRECT: Reset state when modal opens
export function CreateNoteModal({ open, onClose, onConfirm }: Props) {
  const [noteType, setNoteType] = useState<"md-note" | "text-note" | "daily-note">("md-note");
  const [title, setTitle] = useState("");

  // ✅ Reset to default state when modal opens
  useEffect(() => {
    if (open) {
      setNoteType("md-note");
      setTitle("");
      setError(null);
      setShowTemplates(false);
      // ... load last template if exists
    }
  }, [open]);

  // ... modal content
}
```

**Root Cause**:
- React component state persists across renders
- When user clicks "Daily Note" button then closes modal without submitting
- Next time modal opens, `noteType` is still set to `"daily-note"`
- User sees "Markdown" selected but note is created as daily note

**How to Avoid**:
- **ALWAYS** reset form state when modals open
- Use `useEffect` with `open` dependency to reset state
- Reset ALL form fields (inputs, selections, errors, etc.)
- Common for modals, drawers, and multi-step forms

**Related Issue - Missing Tags Parameter**:

The note creation handlers also needed to accept and pass the `tags` parameter:

```tsx
// ❌ WRONG: Handler doesn't accept or pass tags
const handleCreateNote = async (data: { type: string; title: string; content?: string }) => {
  await addCard({
    type: data.type as 'md-note' | 'text-note',
    title: data.title,
    content: data.content || "",
    url: "",
    // ❌ Missing tags - modal sends tags but handler ignores them
  });
};

// ✅ CORRECT: Accept and pass tags parameter
const handleCreateNote = async (data: {
  type: string;
  title: string;
  content?: string;
  tags?: string[]
}) => {
  await addCard({
    type: data.type as 'md-note' | 'text-note',
    title: data.title,
    content: data.content || "",
    url: "",
    tags: data.tags,  // ✅ Pass tags to store
  });
};
```

**Where to Fix**:
- Modal component: `components/modals/create-note-modal.tsx`
- Layout handler: `app/(dashboard)/layout.tsx`
- OmniBar handler: `components/omni-bar.tsx`

**Impact**: Fixed October 30, 2025 - Users can now create regular notes instead of always creating daily notes

**See**: `.claude/skills/pawkit-ui-ux/SKILL.md` for modal state management patterns

---

### 11. Context Menus Rendering Behind Sidebar

**Issue**: Context menus rendered behind the left sidebar (z-index 102), making them invisible or partially obscured when right-clicking on Pawkit collections.

**What Failed**:
```tsx
// ❌ WRONG: Default z-index too low
// components/ui/generic-context-menu.tsx
export function GenericContextMenu({ children, items }: Props) {
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent className="w-56">
        {/* ❌ No z-index specified - uses Radix default z-50 */}
        {renderItems(items)}
      </ContextMenuContent>
    </ContextMenu>
  );
}

// components/navigation/left-navigation-panel.tsx
// Left sidebar has z-[102]
<div className="fixed left-0 top-0 h-screen w-64 bg-background/95 backdrop-blur-sm border-r border-border z-[102]">
  {/* Sidebar content */}
</div>

// ❌ Result: Context menu (z-50) appears behind sidebar (z-102)
```

**The Fix**:
```tsx
// ✅ CORRECT: Use z-[9999] for context menus
// components/ui/generic-context-menu.tsx
export function GenericContextMenu({ children, items, className }: Props) {
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent className={`z-[9999] ${className ?? "w-56"}`}>
        {renderItems(items)}
      </ContextMenuContent>
    </ContextMenu>
  );
}

// ✅ Also apply to submenus
const renderItems = (items: ContextMenuItemConfig[]) => {
  if (item.type === "submenu") {
    return (
      <ContextMenuSub key={`submenu-${index}`}>
        <ContextMenuSubTrigger>{item.label}</ContextMenuSubTrigger>
        <ContextMenuSubContent className="z-[9999] max-h-[300px] overflow-y-auto">
          {renderItems(item.items)}
        </ContextMenuSubContent>
      </ContextMenuSub>
    );
  }
};
```

**Z-Index Hierarchy**:
```tsx
// Pawkit z-index layers (from lowest to highest):
z-0       // Base layer (most content)
z-10      // Floating elements (cards, pills)
z-50      // Overlays (drawers, modals)
z-[102]   // Sidebars (left/right panels)
z-[150]   // Modal overlays (backgrounds)
z-[9999]  // Context menus (always on top)
```

**How to Avoid**:
- **ALWAYS** use z-[9999] for context menus and dropdowns
- Context menus should ALWAYS appear above all other UI elements
- Test context menus in areas with high z-index elements (sidebars, modals)
- Document z-index hierarchy in UI/UX skill
- Use z-index sparingly - only when necessary for layering

**Impact**: Fixed October 31, 2025 - Context menus now appear above all UI elements including sidebars

**Commit**: Part of context menu implementation work

**See**: `.claude/skills/pawkit-ui-ux/SKILL.md` for z-index hierarchy documentation

---

### 12. GenericContextMenu asChild Not Working with Complex Components

**Issue**: Wrapping `PanelSection` component with `GenericContextMenu` didn't work - right-click showed browser default menu instead of custom menu.

**What Failed**:
```tsx
// ❌ WRONG: Wrapping complex component with ContextMenuTrigger
// components/navigation/left-navigation-panel.tsx
<GenericContextMenu
  items={[
    { label: "View All Pawkits", icon: FolderOpen, onClick: () => router.push("/pawkits") },
    { label: "Create New Pawkit", icon: Plus, onClick: () => setShowCreatePawkitModal(true) },
  ]}
>
  <PanelSection
    title="PAWKITS"
    icon={FolderOpen}
    count={collections.length}
    isExpanded={!collapsedSections["left-pawkits"]}
    onToggle={() => toggleSection("left-pawkits")}
  />
</GenericContextMenu>
// ❌ Context menu doesn't appear - browser menu shows instead
```

**Why It Failed**:
```tsx
// PanelSection is a complex component with internal structure:
function PanelSection({ title, icon, count, isExpanded, onToggle }: Props) {
  return (
    <div className="flex items-center justify-between">
      <button onClick={handleNavigate}>
        {/* Button with icon and title */}
      </button>
      <div className="flex items-center gap-2">
        {/* Action buttons */}
      </div>
    </div>
  );
}

// ContextMenuTrigger with asChild expects:
// 1. Single direct child element (not a component)
// 2. Element to forward props (onClick, onContextMenu, etc.)
// 3. PanelSection has internal buttons that intercept events
// 4. Result: Context menu trigger never fires
```

**The Fix**:
```tsx
// ✅ CORRECT: Inline structure and wrap the button directly
<div className={`w-full flex items-center gap-2 group relative ${pathname === pathPrefix + "/pawkits" ? "pb-2" : ""}`}>
  <GenericContextMenu
    items={[
      { label: "View All Pawkits", icon: FolderOpen, onClick: () => handleNavigate("/pawkits") },
      { label: "Create New Pawkit", icon: Plus, onClick: () => setShowCreatePawkitModal(true) },
    ]}
  >
    {/* ✅ Wrap the button element directly */}
    <button
      onClick={() => {
        handleNavigate("/pawkits");
        if (collapsedSections["left-pawkits"]) toggleSection("left-pawkits");
      }}
      className="flex items-center gap-2 hover:opacity-80 transition-opacity flex-1"
    >
      <FolderOpen className={`h-4 w-4 ${pathname === pathPrefix + "/pawkits" ? "text-accent drop-shadow-glow-accent" : "text-accent"}`} />
      <h3 className={`text-sm font-semibold uppercase tracking-wide transition-all ${pathname === pathPrefix + "/pawkits" ? "text-accent-foreground drop-shadow-glow-accent" : "text-foreground"}`}>
        Pawkits
      </h3>
    </button>
  </GenericContextMenu>
  {/* Action buttons outside context menu wrapper */}
  <button onClick={() => router.push("/pawkits/create")} className="...">
    <Plus className="h-4 w-4" />
  </button>
</div>
```

**How to Avoid**:
- **NEVER** wrap complex components with ContextMenuTrigger asChild
- ContextMenuTrigger asChild works with:
  - Simple HTML elements (`<div>`, `<button>`, `<a>`, etc.)
  - Single-element components that forward refs
  - Elements without internal event handlers
- For complex components:
  - Inline the structure
  - Wrap the specific element you want the menu on
  - Move other elements outside the wrapper
- Test context menus actually appear (not browser default)

**Technical Explanation**:
```tsx
// How asChild works (Radix UI pattern):
<ContextMenuTrigger asChild>
  <button>Click me</button>
</ContextMenuTrigger>

// Radix clones the child and adds props:
const enhancedChild = React.cloneElement(children, {
  onContextMenu: handleContextMenu,
  onClick: handleClick,
  // ... other event handlers
});

// ❌ Doesn't work with components:
<ContextMenuTrigger asChild>
  <MyComponent />  {/* Can't clone component, props won't forward */}
</ContextMenuTrigger>

// ✅ Works with elements:
<ContextMenuTrigger asChild>
  <button />  {/* Element can be cloned and enhanced */}
</ContextMenuTrigger>
```

**Impact**: Fixed October 31, 2025 - PAWKITS header now has working context menu

**Commit**: Part of context menu implementation work

**See**:
- Radix UI docs on asChild pattern
- `.claude/skills/pawkit-ui-ux/SKILL.md` for component composition patterns

---

### 13. ESC Key Closing Sidebar Instead of Modal

**Issue**: When Rename Pawkit modal was open, pressing ESC closed the sidebar instead of the modal. Event was bubbling up to parent handlers.

**What Failed**:
```tsx
// ❌ WRONG: Modal only handles ESC in input onKeyDown
// components/navigation/left-navigation-panel.tsx
{showRenameModal && (
  <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 backdrop-blur-sm">
    <div className="..." onClick={(e) => e.stopPropagation()}>
      <input
        onKeyDown={(e) => {
          if (e.key === "Enter") handleRenameCollection();
          else if (e.key === "Escape") {
            setShowRenameModal(false);
            // ❌ This only works when input is focused
            // ❌ Event still bubbles to sidebar ESC handler
          }
        }}
      />
    </div>
  </div>
)}

// Left sidebar has global ESC handler:
useEffect(() => {
  const handleEsc = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      toggleLeftSidebar();  // ❌ This fires even when modal is open
    }
  };
  document.addEventListener("keydown", handleEsc);
  return () => document.removeEventListener("keydown", handleEsc);
}, []);

// ❌ Result: ESC closes sidebar, modal stays open
```

**Event Flow**:
```tsx
// Event phases:
// 1. CAPTURE phase (document → target) - Runs first
// 2. TARGET phase (on element itself)
// 3. BUBBLE phase (target → document) - Runs last

// Default behavior (bubble phase):
User presses ESC
  → Input onKeyDown (bubble) - Handles ESC
  → Modal div onClick (bubble) - Ignored
  → Sidebar ESC handler (bubble) - Also handles ESC!
  → ❌ Both handlers fire!
```

**The Fix**:
```tsx
// ✅ CORRECT: Use capture phase to intercept ESC before bubbling
useEffect(() => {
  if (!showRenameModal) return;

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      e.stopPropagation();  // ✅ Prevent bubbling to parent handlers
      e.preventDefault();   // ✅ Prevent default browser behavior

      if (!renamingCollection) {
        setShowRenameModal(false);
        setRenameValue("");
        setRenameCollectionId(null);
        setRenameCollectionName("");
      }
    }
  };

  // ✅ Third parameter = true → Use CAPTURE phase
  document.addEventListener("keydown", handleKeyDown, true);

  return () => {
    document.removeEventListener("keydown", handleKeyDown, true);
  };
}, [showRenameModal, renamingCollection]);

// Event flow with fix:
User presses ESC
  → Modal ESC handler (CAPTURE) - Handles ESC, calls stopPropagation()
  → Event propagation STOPPED
  → Sidebar ESC handler NEVER FIRES
  → ✅ Only modal closes!
```

**Capture Phase vs Bubble Phase**:
```tsx
// Bubble phase (default):
document.addEventListener("keydown", handler);         // Fires LAST
document.addEventListener("keydown", handler, false);  // Same as above

// Capture phase:
document.addEventListener("keydown", handler, true);   // Fires FIRST

// Use cases:
// - Bubble phase: Normal event handling (most cases)
// - Capture phase: Intercept events before they reach children
//                  Perfect for modals/overlays that need priority
```

**How to Avoid**:
- Use **capture phase** for modal/overlay ESC handlers
- Call `stopPropagation()` to prevent bubbling to parent handlers
- Call `preventDefault()` to prevent default browser behavior
- Add/remove listener in useEffect based on modal state
- Test: First ESC closes modal, second ESC closes sidebar

**Common Pattern for Modals**:
```tsx
// Pattern for all modals that need ESC priority:
useEffect(() => {
  if (!modalOpen) return;

  const handleEsc = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      e.stopPropagation();
      e.preventDefault();
      handleClose();
    }
  };

  // ✅ Capture phase to intercept before parent handlers
  document.addEventListener("keydown", handleEsc, true);
  return () => document.removeEventListener("keydown", handleEsc, true);
}, [modalOpen]);
```

**Impact**: Fixed October 31, 2025 - ESC now closes modal first, then sidebar on second press

**Commit**: Part of rename modal implementation

**See**:
- MDN: Event flow and phases
- `.claude/skills/pawkit-ui-ux/SKILL.md` for modal event handling patterns

---

### 14. Window.prompt() Breaking Visual Consistency

**Issue**: Using `window.prompt()` for rename/create/move operations broke app's visual consistency with ugly browser default dialogs. Users expected glassmorphism modals matching the app design.

**What Failed**:
```tsx
// ❌ WRONG: Browser default prompt
const renameCollection = async (node: CollectionNode) => {
  const name = window.prompt("Rename collection", node.name);
  if (!name || name === node.name) return;

  try {
    await updateCollection(node.id, { name });
  } catch (err) {
    console.error("Failed to rename collection");
  }
};

// ❌ Result: Ugly browser default dialog
// - No styling control
// - Doesn't match app design
// - No loading state
// - No validation feedback
// - Inconsistent with rest of app
```

**The Fix**:
```tsx
// ✅ CORRECT: Custom glassmorphism modal
// 1. Add state for modal
const [showRenameModal, setShowRenameModal] = useState(false);
const [renameCollectionId, setRenameCollectionId] = useState<string | null>(null);
const [renameCollectionName, setRenameCollectionName] = useState("");
const [renameValue, setRenameValue] = useState("");
const [renamingCollection, setRenamingCollection] = useState(false);

// 2. Handler opens modal instead of prompt
const handleRenameClick = (collection: CollectionNode) => {
  setRenameCollectionId(collection.id);
  setRenameCollectionName(collection.name);
  setRenameValue(collection.name);
  setShowRenameModal(true);
};

// 3. Rename handler with loading state
const handleRenameCollection = async () => {
  const trimmedName = renameValue.trim();
  if (!trimmedName || !renameCollectionId || renamingCollection) return;

  setRenamingCollection(true);
  try {
    await updateCollection(renameCollectionId, { name: trimmedName });
    setToastMessage("Pawkit Renamed");
    setShowToast(true);
    setShowRenameModal(false);
    // Reset state
  } catch (error) {
    console.error('Failed to rename collection:', error);
  } finally {
    setRenamingCollection(false);
  }
};

// 4. Glassmorphism modal JSX
{showRenameModal && (
  <div
    className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 backdrop-blur-sm"
    onClick={() => {
      if (!renamingCollection) {
        setShowRenameModal(false);
        // Reset state
      }
    }}
  >
    <div
      className="bg-white/5 backdrop-blur-lg rounded-2xl border border-white/10 shadow-glow-accent p-6 w-full max-w-md mx-4"
      onClick={(e) => e.stopPropagation()}
    >
      <h3 className="text-lg font-semibold text-foreground mb-4">
        Rename Pawkit
      </h3>
      <input
        type="text"
        value={renameValue}
        onChange={(e) => setRenameValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleRenameCollection();
        }}
        className="w-full rounded-lg bg-white/5 backdrop-blur-sm px-4 py-2 text-sm text-foreground placeholder-muted-foreground border border-white/10 focus:border-accent focus:outline-none transition-colors"
        autoFocus
        disabled={renamingCollection}
      />
      <div className="flex gap-2 mt-4">
        <button
          onClick={() => {
            if (!renamingCollection) setShowRenameModal(false);
          }}
          className="flex-1 px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-white/10 transition-colors"
          disabled={renamingCollection}
        >
          Esc to Cancel
        </button>
        <button
          onClick={handleRenameCollection}
          className="flex-1 px-4 py-2 rounded-lg text-sm font-medium bg-accent text-accent-foreground hover:bg-accent/90 transition-colors disabled:opacity-50"
          disabled={renamingCollection || !renameValue.trim()}
        >
          {renamingCollection ? "Renaming..." : "Enter to Rename"}
        </button>
      </div>
    </div>
  </div>
)}
```

**Glassmorphism Modal Pattern**:
```tsx
// Required elements for glassmorphism modals:
const modalStyles = {
  // Overlay
  overlay: "fixed inset-0 z-[150] flex items-center justify-center bg-black/60 backdrop-blur-sm",

  // Modal container
  container: "bg-white/5 backdrop-blur-lg rounded-2xl border border-white/10 shadow-glow-accent p-6 w-full max-w-md mx-4",

  // Input field
  input: "w-full rounded-lg bg-white/5 backdrop-blur-sm px-4 py-2 text-sm text-foreground placeholder-muted-foreground border border-white/10 focus:border-accent focus:outline-none transition-colors",

  // Primary button
  primary: "px-4 py-2 rounded-lg text-sm font-medium bg-accent text-accent-foreground hover:bg-accent/90 transition-colors disabled:opacity-50",

  // Secondary button
  secondary: "px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-white/10 transition-colors"
};
```

**Features to Include**:
- ✅ Auto-focus input field
- ✅ Enter to confirm, ESC to cancel (with proper event handling)
- ✅ Loading state with disabled inputs during async operations
- ✅ Toast notification on success
- ✅ Click outside to close (with stopPropagation on modal)
- ✅ Validation (disable submit if invalid)
- ✅ Reset state when modal closes

**How to Avoid**:
- **NEVER** use `window.prompt()` or `window.confirm()` in the app
- Always use custom modals with glassmorphism styling
- Match app's visual design language
- Provide loading states for async operations
- Use toast notifications for success feedback
- Test keyboard shortcuts (Enter, ESC)

**Where to Replace**:
All instances of:
- `window.prompt()` → Custom input modal
- `window.confirm()` → Custom confirmation modal
- `window.alert()` → Toast notification

**Impact**: Fixed October 31, 2025 - All prompts now use app-styled modals maintaining visual consistency

**Commit**: Part of rename modal implementation

**See**: `.claude/skills/pawkit-ui-ux/SKILL.md` for glassmorphism design patterns and modal components

---

### 15. Duplicate Card Issue - Deleted Cards Returned

**Issue**: Creating new notes triggered duplicate constraint errors and returned deleted daily notes instead of creating new notes. Server returned 409 Conflict errors.

---

### 12. Deleted Cards Appearing in Library View

**Issue**: Deleted cards appearing in Library view even though sync works correctly and cards are properly marked as deleted in database.

**What Failed**:
```tsx
// ❌ WRONG: Deleted cards injected into state during updates
export const useDataStore = create<DataState>((set, get) => ({
  updateCard: async (id: string) => {
    // After successful update, fetch latest from server
    const serverCard = await fetchCardFromServer(id);

    // ❌ This injects deleted card into state if serverCard.deleted === true
    set((state) => ({
      cards: state.cards.map(c => c.id === id ? serverCard : c)
    }));
  }
}));
```

**The Fix**:
```tsx
// ✅ CORRECT: Check if server card is deleted before mapping into state
export const useDataStore = create<DataState>((set, get) => ({
  updateCard: async (id: string) => {
    // After successful update, fetch latest from server
    const serverCard = await fetchCardFromServer(id);

    // ✅ If server card is deleted, remove from state instead of mapping
    if (serverCard.deleted === true) {
      console.log('[DataStore] Server card is deleted, removing from state:', id);
      set((state) => ({
        cards: state.cards.filter(c => c.id !== id)
      }));
    } else {
      // Only map non-deleted cards
      set((state) => ({
        cards: state.cards.map(c => c.id === id ? serverCard : c)
      }));
    }
  }
}));
```

**Root Cause**:
- During sync operations, code fetches latest card from server
- Uses `.map()` to replace card in state with server version
- If server card has `deleted: true`, deleted card is injected directly into state
- All filtering in `initialize()`, `sync()`, and `refresh()` is bypassed
- Deleted card appears in Library even though it shouldn't

**Locations Found** (lib/stores/data-store.ts):
1. **Line 659** - Conflict resolution with server wins
2. **Line 676** - Conflict resolution with local wins
3. **Line 712** - Successful update sync response
4. **Line 552** - Metadata fetch after update
5. **Line 535** - Card creation sync response

**How to Avoid**:
- **NEVER** use `.map()` to inject server cards without checking `deleted` status
- **ALWAYS** check if `serverCard.deleted === true` before mapping
- Use `.filter(c => c.id !== id)` to remove deleted cards
- Add debug logging when deleted cards are filtered out
- Validate state after all sync operations

**Prevention Pattern**:
```tsx
// Pattern for all server card updates:
if (serverCard.deleted === true) {
  // Remove from state
  set((state) => ({
    cards: state.cards.filter(c => c.id !== serverCard.id)
  }));
} else {
  // Update in state
  set((state) => ({
    cards: state.cards.map(c => c.id === serverCard.id ? serverCard : c)
  }));
}
```

**Impact**: Fixed October 30, 2025 - Deleted cards no longer appear in Library view

**Commit**: 85ed692

**See**: `.claude/skills/pawkit-sync-patterns/SKILL.md` for state management patterns

---

### 13. Deduplication Corrupting Data

**Issue**: Navigating to Library page corrupts IndexedDB - 25 cards incorrectly marked as deleted. Force Full Sync shows perfect data, but clicking Library corrupts it.

**What Failed**:
```tsx
// ❌ WRONG: Using soft delete to remove duplicates
async function deduplicateCards(cards: CardDTO[]): Promise<CardDTO[]> {
  const cardsToDelete = findDuplicates(cards);

  // ❌ deleteCard() performs SOFT DELETE (sets deleted=true)
  await Promise.all(cardsToDelete.map(id => localDb.deleteCard(id)));

  // ❌ Result: Duplicates marked as deleted in IndexedDB
  // ❌ These sync to server and other devices
  return cards.filter(c => !cardsToDelete.includes(c.id));
}
```

**The Fix**:
```tsx
// ✅ CORRECT: Use hard delete to permanently remove duplicates
async function deduplicateCards(cards: CardDTO[]): Promise<CardDTO[]> {
  console.log('[deduplicateCards] Starting deduplication for', cards.length, 'cards');

  const cardsToDelete = findDuplicates(cards);

  // Log cards being removed
  for (const id of cardsToDelete) {
    const card = cards.find(c => c.id === id);
    console.log('[deduplicateCards] Removing duplicate:', {
      id: card?.id,
      title: card?.title,
      url: card?.url
    });
  }

  // ✅ permanentlyDeleteCard() completely removes from IndexedDB
  await Promise.all(cardsToDelete.map(id => localDb.permanentlyDeleteCard(id)));

  console.log('[deduplicateCards] Deduplication complete:', {
    input: cards.length,
    output: cards.length - cardsToDelete.length,
    removed: cardsToDelete.length
  });

  return cards.filter(c => !cardsToDelete.includes(c.id));
}
```

**Root Cause**:
- `deduplicateCards()` runs when Library loads to clean up duplicate temp cards
- Function calls `localDb.deleteCard()` to remove duplicates
- `deleteCard()` is for USER deletions (soft delete to trash)
- Soft delete sets `deleted: true` and `deletedAt: timestamp`
- These "deleted" cards then sync to server
- Result: 25 cards incorrectly marked as deleted

**Critical Distinction**:
```tsx
// SOFT DELETE (for user deletions to trash)
async deleteCard(id: string): Promise<void> {
  const card = await this.db.get('cards', id);
  if (card) {
    card.deleted = true;  // ❌ Marks as deleted
    card.deletedAt = new Date().toISOString();
    await this.db.put('cards', card);
  }
}

// HARD DELETE (for internal cleanup)
async permanentlyDeleteCard(id: string): Promise<void> {
  await this.db.delete('cards', id);  // ✅ Completely removes
}
```

**How to Avoid**:
- **NEVER** use `deleteCard()` for internal cleanup
- Use `permanentlyDeleteCard()` for:
  - Removing temp cards
  - Deduplication
  - Replacing temporary IDs
  - Any non-user-facing deletion
- Use `deleteCard()` ONLY for user-triggered deletions to trash
- Add logging to track which cards are being removed
- Test deduplication doesn't corrupt data

**Related Bugs - Same Pattern**:

After fixing deduplication, found TWO MORE locations with same bug:

**Bug Location 2 - data-store.ts:531**:
```tsx
// ❌ WRONG: Soft delete when replacing temp card
async addCard(data: CardInput) {
  const tempCard = { ...data, id: generateTempId() };

  // Save temp card locally
  await localDb.saveCard(tempCard);

  // Sync to server
  const serverCard = await syncToServer(tempCard);

  // Replace temp with real card
  await localDb.deleteCard(tempCard.id);  // ❌ WRONG! Uses soft delete
  await localDb.saveCard(serverCard);
}

// ✅ CORRECT: Hard delete temp card
await localDb.permanentlyDeleteCard(tempCard.id);  // ✅ Completely removes
```

**Bug Location 3 - sync-service.ts:661**:
```tsx
// ❌ WRONG: Soft delete during sync
async syncCard(card: CardDTO) {
  if (card.id.startsWith('temp_')) {
    const serverCard = await pushToServer(card);

    // Replace temp ID with real ID
    await localDb.deleteCard(card.id);  // ❌ WRONG! Uses soft delete
    await localDb.saveCard(serverCard);
  }
}

// ✅ CORRECT: Hard delete temp card
await localDb.permanentlyDeleteCard(card.id);  // ✅ Completely removes
```

**Impact**: Fixed October 30, 2025 - Data no longer corrupts when navigating to Library

**Commits**:
- 61ba60e - Fixed deduplication (line 100)
- 699e796 - Fixed addCard and sync-service (lines 531, 661)

**See**: `.claude/skills/pawkit-conventions/SKILL.md` for soft vs hard delete patterns

---

### 14. Deduplication Removing Legitimate Server Cards

**Issue**: Force Full Sync shows "Perfect Sync" but 26 cards are missing. Comprehensive logging revealed deduplication was removing legitimate server cards just because they had the same title.

**What Failed**:
```tsx
// ❌ WRONG: Removes real server cards when they have same title
async function deduplicateCards(cards: CardDTO[]): Promise<CardDTO[]> {
  for (const card of cards) {
    const key = card.url || card.title || card.id;
    if (seenCardUrls.has(key)) {
      const existingCard = cards.find(c => c.id === seenCardUrls.get(key));
      const isTempExisting = existingId?.startsWith('temp_');
      const isTempDuplicate = card.id.startsWith('temp_');

      // Priority 3: Both are real OR both are temp - keep older one
      if (!isTempExisting && !isTempDuplicate) {
        // ❌ WRONG! Both have real server IDs but treating as duplicate
        const existingTime = new Date(existingCard.createdAt).getTime();
        const duplicateTime = new Date(card.createdAt).getTime();

        if (duplicateTime > existingTime) {
          cardsToDelete.push(card.id);  // ❌ Deleting legitimate card!
        }
      }
    }
  }
}
```

**Debug Output Showing the Bug**:
```typescript
// Console showed:
[DataStore V2] ⚠️ DUPLICATE DETECTED - Same content, different IDs:
{
  existing: "cmhe11aet0000la0471dhden3",  // Real server ID
  duplicate: "cmhe11ozf0000kw0479j7jtr1",  // Also real server ID!
  key: "SYNC TEST",                       // Same title
  isTempExisting: false,                  // Not temp
  isTempDuplicate: false,                 // Not temp
  existingCreatedAt: "2025-10-30T...",
  duplicateCreatedAt: "2025-10-30T..."
}
[DataStore V2] 🧹 Cleaning up newer duplicate: cmhe11ozf0000kw0479j7jtr1
// ❌ WRONG! This is a legitimate card that happens to have same title
```

**The Fix**:
```tsx
// ✅ CORRECT: Skip deduplication when both cards have real server IDs
async function deduplicateCards(cards: CardDTO[]): Promise<CardDTO[]> {
  for (const card of cards) {
    const key = card.url || card.title || card.id;
    if (seenCardUrls.has(key)) {
      const existingCard = cards.find(c => c.id === seenCardUrls.get(key));
      const isTempExisting = existingId?.startsWith('temp_');
      const isTempDuplicate = card.id.startsWith('temp_');

      // Priority 1: Duplicate is temp, existing is real → Delete temp
      if (isTempDuplicate && !isTempExisting) {
        cardsToDelete.push(card.id);
      }
      // Priority 2: Existing is temp, duplicate is real → Delete temp
      else if (isTempExisting && !isTempDuplicate) {
        cardsToDelete.push(existingId);
        seenCardUrls.set(key, card.id);
      }
      // Priority 3: Both are REAL server cards - DON'T deduplicate!
      else if (!isTempExisting && !isTempDuplicate) {
        console.log('[DataStore V2] ✅ Both cards have server IDs, keeping both:', {
          existing: existingId,
          duplicate: card.id,
          title: card.title
        });
        // ✅ Don't delete! These are legitimate separate cards
        seenCardUrls.set(card.id, card.id); // Track separately
      }
      // Priority 4: Both are temp → Keep older one
      else {
        if (duplicateTime > existingTime) {
          cardsToDelete.push(card.id);
        } else {
          cardsToDelete.push(existingId);
        }
      }
    }
  }
}
```

**Root Cause**:
- Deduplication logic was designed to clean up temp cards during sync
- Priority 3 case handled "both real OR both temp" together
- When both cards had real server IDs, it treated them as duplicates
- Removed one based on `createdAt` timestamp
- These were actually legitimate separate cards that happened to have the same title
- 26 test cards with titles like "SYNC TEST" and "Final delete test" were being removed

**How to Avoid**:
- **NEVER** deduplicate cards when BOTH have real server IDs
- Deduplication should ONLY remove temp cards:
  - When replacing temp with real (one is temp, one is real)
  - When multiple temp cards exist (both are temp)
- Real server cards are ALWAYS legitimate, even if they share title/URL
- Add explicit check: `if (!isTempExisting && !isTempDuplicate)` → keep both
- Log when skipping deduplication for real cards

**Deduplication Rules** (in priority order):
1. **Duplicate is temp, existing is real** → Delete temp (replace with real)
2. **Existing is temp, duplicate is real** → Delete temp (replace with real)
3. **Both are real server cards** → Keep both! (Skip deduplication)
4. **Both are temp cards** → Delete newer one (keep older by createdAt)

**How This Was Found**:
1. User reported 26 cards missing after Force Full Sync
2. Added comprehensive logging to Force Full Sync (track save success/failure)
3. Added comprehensive logging to deduplication (show what's removed and why)
4. Logs revealed all 26 cards were real server IDs being flagged as "duplicates"
5. Root cause: Priority 3 logic didn't distinguish between "both real" and "both temp"

**Impact**: Fixed October 30, 2025 - All 26 missing cards now preserved, deduplication only removes temp cards

**Commit**: 476d04a

**See**: `.claude/skills/pawkit-sync-patterns/SKILL.md` for deduplication patterns

---

### 15. Sign Out Button Not Working - Dynamic Imports Failing Silently

**Issue**: Sign Out button completely unresponsive - no UI feedback, no console logs, button appeared dead. Clicking the button did nothing visible.

**What Failed**:
```tsx
// ❌ WRONG: Complex cleanup with dynamic imports failing silently
const signOut = async () => {
  // Get current user ID
  const { data: { user }, error } = await supabase.auth.getUser();
  const userId = user?.id;

  if (userId) {
    // Dynamic imports - THIS FAILED SILENTLY!
    const { localDb } = await import('@/lib/services/local-storage');
    const { syncQueue } = await import('@/lib/services/sync-queue');

    // Clear databases
    await localDb.clearUserData(userId);
    await syncQueue.clearUserData(userId);

    // Clear localStorage
    // ... complex cleanup ...
  }

  await supabase.auth.signOut();
  router.push('/login');
}
```

**Debug Output**:
```typescript
// Button clicked:
[ProfileModal] 🔴 Sign Out button clicked!
[ProfileModal] 🔴 Sign Out ERROR LOG TEST
// ❌ NOTHING AFTER THIS - execution stops!
// No [Auth] logs, no errors, just silence
```

**Root Cause**:
- Complex async cleanup code with dynamic imports was **failing silently**
- Dynamic imports (`await import(...)`) can fail in client-side React components without visible errors
- No error thrown, no catch block triggered - execution just stopped
- User saw no feedback - button appeared completely broken

**The Fix**:
```tsx
// ✅ CORRECT: Simple, reliable signOut
const signOut = async () => {
  console.log('[Auth] Sign out initiated');

  try {
    // CRITICAL: Clear session markers FIRST
    localStorage.removeItem('pawkit_last_user_id');
    localStorage.removeItem('pawkit_active_device');

    // Sign out from Supabase
    await supabase.auth.signOut();

    // Close connections (with try/catch for safety)
    try {
      const { localDb } = await import('@/lib/services/local-storage');
      const { syncQueue } = await import('@/lib/services/sync-queue');
      await localDb.close();
      await syncQueue.close();
    } catch (dbError) {
      // Non-critical - continue anyway
    }

    router.push('/login');
  } catch (error) {
    console.error('[Auth] Sign out failed:', error);
    // Try to redirect anyway
    router.push('/login');
  }
}
```

**Debugging Process**:
1. Added comprehensive logging at every execution step
2. Created test buttons (inline vs named handlers) to isolate issue
3. Discovered named handlers worked BUT signOut() call never executed
4. Found that alert() in handler worked but complex code after stopped
5. Reverted to simple signOut from main branch that was previously working

**How to Avoid**:
- **Keep critical code paths simple** - Dynamic imports can fail silently in React
- **Add defensive logging** - Log before/after critical operations
- **Use try/catch** - Wrap dynamic imports in try/catch with fallback
- **Test button responsiveness** - Ensure user gets immediate feedback
- **Prefer static imports** - Use dynamic imports only when truly needed
- **Have fallback behavior** - Continue with core functionality even if cleanup fails

**Key Learning**:
- Dynamic imports in async React handlers can break execution without visible errors
- Simple solutions are often more reliable than complex ones
- Always provide immediate user feedback (console logs, UI state changes)
- Don't let optional cleanup (database closing) block critical operations (sign out)

**Impact**: Fixed January 3, 2025 - Sign Out now works reliably with simplified approach

**Commit**: d2fa27d, d4a379f

**Files Modified**:
- `lib/contexts/auth-context.tsx` - Simplified signOut function
- `components/modals/profile-modal.tsx` - Simplified button handler

---

### 16. User Isolation Failure - Missing localStorage Cleanup

**Issue**: Complete user isolation breakdown - ALL data bleeding between accounts. User A's data (URLs + notes) visible to User B after sign in/out cycle.

**What Failed**:
```tsx
// ❌ WRONG: Sign Out doesn't clear critical markers
const signOut = async () => {
  // Just sign out from Supabase
  await supabase.auth.signOut();
  router.push('/login');

  // ❌ MISSING: localStorage.removeItem('pawkit_last_user_id')
  // This marker is CRITICAL for user switch detection!
}
```

**The Flow That Broke Isolation**:
```typescript
// 1. User A logs in
localStorage.setItem('pawkit_last_user_id', 'user-a-id');

// 2. User A creates data
// Saved to: pawkit-user-a-id-default-local-storage

// 3. User A signs out
await supabase.auth.signOut();  // ✓ Supabase session cleared
// ❌ BUT: pawkit_last_user_id still says "user-a-id"!

// 4. User B logs in
const previousUserId = localStorage.getItem('pawkit_last_user_id');
// previousUserId = "user-a-id" (not cleared!)
// currentUserId = "user-b-id"

if (previousUserId && previousUserId !== currentUserId) {
  // This SHOULD detect user switch and cleanup...
  // ❌ BUT: Since marker wasn't cleared, system doesn't detect it!
}

// 5. Result: User B sees User A's data! 🐛
```

**Root Cause**:
- `localStorage.getItem('pawkit_last_user_id')` is used by `useUserStorage` hook to detect user switches
- When different user logs in, system compares `previousUserId` vs `currentUserId`
- If they don't match → triggers `cleanupPreviousUser()` to clear old data
- BUT: If sign out doesn't clear this marker, system thinks it's the same user
- No cleanup triggered → User B sees User A's data

**The Fix**:
```tsx
// ✅ CORRECT: Clear ALL session markers on sign out
const signOut = async () => {
  try {
    // CRITICAL: Clear session markers so next login detects user switch
    localStorage.removeItem('pawkit_last_user_id');  // ← THE KEY FIX
    localStorage.removeItem('pawkit_active_device');

    // Sign out from Supabase
    await supabase.auth.signOut();

    // Close database connections
    try {
      const { localDb } = await import('@/lib/services/local-storage');
      const { syncQueue } = await import('@/lib/services/sync-queue');
      await localDb.close();
      await syncQueue.close();
    } catch (dbError) {
      // Non-critical - continue anyway
    }

    router.push('/login');
  } catch (error) {
    console.error('[Auth] Sign out failed:', error);
    router.push('/login');
  }
}
```

**User Switch Detection Logic** (from `lib/hooks/use-user-storage.ts`):
```typescript
const previousUserId = localStorage.getItem('pawkit_last_user_id');
const currentUserId = user.id;

if (previousUserId && previousUserId !== currentUserId) {
  console.warn('[useUserStorage] USER SWITCH DETECTED!');

  // CRITICAL: Clean up previous user's data
  await cleanupPreviousUser(previousUserId);

  // Delete previous user's database
  await localDb.clearUserData(previousUserId);
  await syncQueue.clearUserData(previousUserId);

  // Clear localStorage keys
  // ...
}

// Initialize NEW user's database
await localDb.init(currentUserId, workspaceId);
await syncQueue.init(currentUserId, workspaceId);

// Store current user for next login
localStorage.setItem('pawkit_last_user_id', currentUserId);  // ← CRITICAL
```

**Per-User Database Architecture**:
- Each user gets isolated IndexedDB: `pawkit-{userId}-default-local-storage`
- User switch triggers automatic cleanup of previous user's database
- Fresh database initialized for new user
- Zero data bleeding between accounts

**Testing Results**:
- ✅ User A's data (notes + URLs) invisible to User B
- ✅ User B's data (notes + URLs) invisible to User A
- ✅ Sign Out clears markers properly
- ✅ User switch detected and cleanup triggered
- ✅ Console logs show: `[useUserStorage] USER SWITCH DETECTED!`

**How to Avoid**:
- **Document critical localStorage keys** - Track which keys are required for security
- **Test user switching** - Verify isolation works with 2+ real accounts
- **Log session markers** - Console log when setting/clearing markers
- **Check cleanup logic** - Ensure all cleanup paths are tested
- **Audit signOut thoroughly** - This is a critical security function

**Critical Session Markers**:
```typescript
// These MUST be cleared on sign out:
localStorage.removeItem('pawkit_last_user_id');      // User switch detection
localStorage.removeItem('pawkit_active_device');     // Multi-session management

// These are user-specific and should exist:
localStorage.getItem(`pawkit-recent-history-${userId}`);
localStorage.getItem(`pawkit-${userId}-active-workspace`);
```

**Impact**: Fixed January 3, 2025 - Critical security vulnerability resolved, user data fully isolated

**Commit**: d4a379f

**Files Modified**:
- `lib/contexts/auth-context.tsx` - Added session marker cleanup
- `lib/hooks/use-user-storage.ts` - (Already had detection logic)
- `lib/services/local-storage.ts` - (Already had per-user databases)

**See**: `.claude/skills/pawkit-security/SKILL.md` for isolation architecture

---

### 11. Duplicate Card Issue - Deleted Cards Returned

**Issue**: Creating new notes triggered duplicate constraint errors and returned deleted daily notes instead of creating new notes. Server returned 409 Conflict errors.

**What Failed**:
```tsx
// ❌ WRONG: Full unique constraint on ALL card types
// This was the database constraint that existed:
CREATE UNIQUE INDEX "Card_userId_url_key"
ON "Card"("userId", "url");
// ❌ Applies to ALL cards including notes with empty URLs

// Result: Every note with url="" triggers P2002 duplicate error
```

**Debug Output**:
```typescript
// Client sends:
{
  "type": "md-note",
  "title": "Testing notes again",
  "content": "",
  "url": ""
}

// Server response (WRONG - returning deleted daily note):
{
  "id": "cmhcc60ss0001l404oegzz57u",
  "type": "md-note",
  "title": "2025-10-29 - Wednesday",  // Old deleted note
  "deleted": true,                     // Deleted!
  "deletedAt": "2025-10-30T01:41:34.517Z",
  "tags": ["daily"]
}

// Error in logs:
[createCard] P2002 ERROR - Duplicate detected for type: md-note URL:  Target: [ 'userId', 'url' ]
```

**The Fix - Part 1: Database Migration**:
```sql
-- ✅ CORRECT: Remove full constraint, keep only partial index for URL cards
DO $$
BEGIN
    -- Drop any full unique constraints on (userId, url)
    IF EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'Card_userId_url_key'
        AND contype = 'u'
    ) THEN
        ALTER TABLE "Card" DROP CONSTRAINT "Card_userId_url_key";
    END IF;

    -- Drop non-partial unique index if exists
    IF EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE indexname = 'Card_userId_url_key'
        AND indexdef NOT LIKE '%WHERE%'
    ) THEN
        DROP INDEX "Card_userId_url_key";
    END IF;
END $$;

-- ✅ Create PARTIAL unique index - ONLY for URL-type cards
CREATE UNIQUE INDEX IF NOT EXISTS "Card_userId_url_key"
ON "Card"("userId", "url")
WHERE "type" = 'url';  -- ✅ Notes excluded from constraint
```

**The Fix - Part 2: Error Handling**:
```tsx
// ✅ CORRECT: Look for existing cards of same type, exclude deleted
try {
  const created = await prisma.card.create({ data });
  return mapCard(created);
} catch (error) {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
    console.log('[createCard] P2002 ERROR - Duplicate detected for type:', cardType);

    // ✅ Find existing non-deleted card of same type
    const existingCard = await prisma.card.findFirst({
      where: {
        userId,
        url: parsed.url || "",
        type: cardType,        // ✅ Same type (md-note, text-note, url)
        deleted: false         // ✅ Exclude deleted cards
      }
    });

    if (existingCard) {
      return mapCard(existingCard);
    }
  }
  throw error;
}
```

**Root Cause**:
1. Database had **full unique constraint** on `(userId, url)` for ALL card types
2. Should only apply to `type = 'url'` cards (partial unique index)
3. Notes with empty URLs (`url: ""`) triggered P2002 duplicate errors
4. Error handler looked for existing card but only checked `type: "url"`
5. When creating `md-note` with `url: ""`, it found old deleted daily note
6. Server returned deleted card with `deleted: true`
7. Client displayed card briefly then it disappeared on refresh

**How to Avoid**:
- **ALWAYS** use partial unique indexes when constraint shouldn't apply to all rows
- **NEVER** return deleted records from lookup queries
- Use `deleted: false` or `deletedAt: null` in WHERE clauses
- Log P2002 errors with target field to debug constraint violations
- Test edge cases: empty strings, null values, deleted records

**Where to Check**:
- Database constraints: `SELECT * FROM pg_indexes WHERE tablename = 'Card';`
- Prisma schema: `schema.prisma` - Document partial indexes in comments
- Server error handling: `lib/server/cards.ts`
- Duplicate detection logic: Always exclude soft-deleted records

**Migration File**:
- `prisma/migrations/20251029192328_fix_card_unique_constraint/migration.sql`

**Impact**: Fixed October 30, 2025 - Notes can now be created freely without triggering duplicate errors

**Prevention**:
- Document partial indexes in schema comments
- Add test for creating multiple notes with empty URLs
- Test deleted record exclusion in all lookup queries
- Monitor P2002 errors in production logs

**See**:
- `.claude/skills/pawkit-migrations/SKILL.md` for migration patterns
- `.claude/skills/pawkit-conventions/SKILL.md` for data model conventions

---

### 20. Sync System Architectural Issues (January 2025 Analysis)

**Issue**: Comprehensive analysis identified 12 architectural flaws causing card duplication, cross-device sync failures, and collection propagation issues.

**Symptoms**:
- **Card Duplication**: Cards duplicate across devices, temp IDs visible (`temp_1704384000000`)
- **Cross-Device Failures**: Changes made on one device don't appear on others
- **Collection Issues**: Pawkits don't update across sessions, hierarchy randomly changes
- **Data Loss**: User edits overwritten by background metadata fetching
- **UI Inconsistency**: Cards appear/disappear on refresh, state doesn't match database

**Categories of Issues** (12 total across 8 categories):
1. **Race Conditions** (5 CRITICAL): Multi-tab sync collision, temp ID races, deduplication false positives, metadata overwrites, init races
2. **Database Issues** (2 HIGH): Incomplete unique constraints, no optimistic locking
3. **Sync Architecture** (3 CRITICAL): Missing transactions, collection tree flattening, no cache rollback
4. **Concurrency** (2 MEDIUM): Sync queue not idempotent, hook initialization races

**Root Cause**: IndexDB V2 migration (October 2025) introduced multi-user database architecture without updating coordination mechanisms.

**What Changed**:
```
Before V2: pawkit-local-storage (single global DB)
After V2:  pawkit-{userId}-{workspaceId}-local-storage (per-user)
```

**What Broke**:
- BroadcastChannel coordination (worked for single DB, fails with multi-user)
- Temp ID pattern (worked single-user, races in multi-user)
- Transaction boundaries (simple ops became complex multi-user flows)
- Deduplication logic (reactive fix insufficient for multi-user/device)

**Top 3 Fixes (80% Impact)**:
1. **Eliminate Temp ID Pattern** (6-8 hours) - Use client UUIDs, no ID replacement
2. **Distributed Lock for Multi-Tab** (4-6 hours) - localStorage mutex for sync coordination
3. **IndexDB Transactions** (8-10 hours) - Wrap multi-step operations atomically

**Quick Fix** (Temporary):
- Refresh browser if seeing duplicates
- Work in single tab only (close other tabs)
- Avoid rapid edits across multiple devices
- Wait 5 seconds between edits on different devices

**Proper Fix Status**: Documented in roadmap, awaiting prioritization (18-24 hours estimated)

**Root Cause Analysis**:
See `.claude/skills/pawkit-project-context/SKILL.md` - "Date: January 4, 2025 - Comprehensive Sync System Deep-Dive Analysis"

**Detailed Issue Breakdown**:
See `.claude/skills/pawkit-roadmap/SKILL.md` - "BACKLOG - CRITICAL SYNC FIXES (Priority 0)" section for all 12 issues with:
- Specific file locations and line numbers
- User-visible symptoms
- Root causes
- Time estimates
- Proper fixes

**Architectural Patterns**:
See `.claude/skills/pawkit-sync-patterns/SKILL.md` - "KNOWN ARCHITECTURAL FLAWS (January 2025 Analysis)" section for:
- Detailed code examples of each flaw
- Why current approach is broken
- Anti-patterns to avoid
- Proper fix implementations
- Prevention checklist

**How to Avoid**:
- **Never** use temp IDs that can leak into persistent storage
- **Always** wrap multi-step operations in transactions
- **Always** implement distributed locks for cross-tab operations
- **Never** use reactive deduplication to fix proactive creation bugs
- **Always** test with multiple tabs AND multiple devices
- **Always** separate user-edited fields from auto-fetched fields

**Where to Check**:
- Sync orchestration: `lib/services/sync-service.ts`
- Local storage: `lib/services/local-storage.ts`
- Sync queue: `lib/services/sync-queue.ts`
- Data store: `lib/stores/data-store.ts`
- Database schema: `prisma/schema.prisma`
- User storage init: `lib/hooks/use-user-storage.ts`

**Impact**: Critical technical debt documented January 4, 2025. Affects all users with multiple devices or tabs.

**Prevention**:
- Review sync patterns skill before making sync changes
- Follow prevention checklist for all new sync features
- Test multi-tab and multi-device scenarios
- Monitor duplicate card creation in production
- Add version fields for optimistic locking
- Use operation-based sync for temporal dependencies

**See Also**:
- `.claude/skills/pawkit-roadmap/SKILL.md` - "BACKLOG - CRITICAL SYNC FIXES" for prioritized fix list
- `.claude/skills/pawkit-sync-patterns/SKILL.md` - "KNOWN ARCHITECTURAL FLAWS" for detailed analysis
- `.claude/skills/pawkit-project-context/SKILL.md` - Session history for investigation details
- Git commits: `61ba60e`, `476d04a`, `c60c41b`, `e8be3fa` (previous reactive fixes)

---

### 21. Deletion Sync Not Propagating Between Devices

**Issue**: Collections deleted on one device not appearing as deleted on other devices. Server has correct deletion (`deleted: true`) but other devices keep showing deleted items with `deleted: false`.

**What Failed**:
```tsx
// ❌ WRONG: API filtering out deleted collections before sync
// lib/server/collections.ts
export const listCollections = unstable_cache(
  async (userId: string) => {
    const items = await prisma.collection.findMany({
      where: { userId, deleted: false, inDen: false },  // ❌ Filters out deletions!
      orderBy: { name: "asc" }
    });

    // Build tree from items...
    return { tree: roots, flat: Array.from(nodes.values()) };
  },
  ['collections'],
  { revalidate: 5, tags: ['collections'] }
);

// app/api/pawkits/route.ts
export async function GET() {
  const user = await getCurrentUser();
  const result = await listCollections(user.id);  // ❌ No deleted items
  return success(result);
}

// lib/services/sync-service.ts
private async pullFromServer() {
  // Fetch collections from server
  const collectionsRes = await this.fetchWithTimeout('/api/pawkits');
  const serverCollections = collectionsData.tree || [];

  // ❌ serverCollections NEVER includes deleted items!
  // ❌ Sync service can't process deletions it doesn't receive
  const collectionConflicts = await this.mergeCollections(serverCollections, localCollections);
}

// Result:
// - Device A deletes collection → server gets deleted: true ✅
// - Device B syncs → API returns 0 deleted collections ❌
// - Sync service never sees deletion ❌
// - Collection stays visible on Device B ❌
```

**Debug Output Showing the Bug**:
```typescript
// Console logs with comprehensive debugging:
🔵 [SYNC] pullFromServer() STARTED
🔵 [SYNC] Fetching collections from /api/pawkits...
🔵 [SYNC] Fetched from server: { rawCount: 15 }
🔵 [SYNC] Test collection NOT found in server data  // ❌ Filtered out!
🔵 [SYNC] mergeCollections() CALLED
🔵 [SYNC] Starting to process 15 server collections...
// ❌ Test collection with deleted: true never appears
// ❌ Sync merge logic never runs for deleted items
```

**The Fix**:
```tsx
// ✅ CORRECT: Add includeDeleted parameter to sync endpoint

// lib/server/collections.ts - Accept includeDeleted parameter
export const listCollections = unstable_cache(
  async (userId: string, includeDeleted = false) => {
    const items = await prisma.collection.findMany({
      where: {
        userId,
        ...(includeDeleted ? {} : { deleted: false }),  // ✅ Conditional filter
        inDen: false
      },
      orderBy: { name: "asc" }
    });

    return { tree: roots, flat: Array.from(nodes.values()) };
  },
  ['collections'],
  { revalidate: 5, tags: ['collections'] }
);

// app/api/pawkits/route.ts - Read query parameter
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();

  // ✅ Allow sync service to request deleted collections
  const searchParams = request.nextUrl.searchParams;
  const includeDeleted = searchParams.get('includeDeleted') === 'true';

  const result = await listCollections(user.id, includeDeleted);
  return success(result);
}

// lib/services/sync-service.ts - Pass includeDeleted parameter
private async pullFromServer() {
  // ✅ CRITICAL: Include deleted collections for proper sync
  const collectionsRes = await this.fetchWithTimeout('/api/pawkits?includeDeleted=true');

  const serverCollections = collectionsData.tree || [];
  // ✅ Now includes collections with deleted: true
  // ✅ Sync service can process deletions properly

  const collectionConflicts = await this.mergeCollections(serverCollections, localCollections);
}

// mergeCollections() already has correct deletion handling:
if (localCollection.deleted || serverCollection.deleted) {
  // Deletion always wins - keep deleted state
  const deletedVersion = localCollection.deleted ? localCollection : serverCollection;
  if (!deletedVersion.deleted) {
    deletedVersion.deleted = true;
    deletedVersion.updatedAt = new Date().toISOString();
  }
  await localDb.saveCollection(deletedVersion, { fromServer: true });
  continue;  // ✅ Exits early - deletion processed
}
```

**Root Cause**:
- `/api/pawkits` endpoint filtered out deleted collections with `deleted: false` WHERE clause
- Sync service called `/api/pawkits` expecting to receive ALL collections including deleted
- Server returned only non-deleted collections → sync service never saw deletions
- Without deleted items in server response, merge logic couldn't process deletions
- Result: Deleted collections remained visible on other devices indefinitely

**The Flow (Before Fix)**:
```typescript
// Device A:
User clicks "Delete Pawkit"
  → localDb.saveCollection({...collection, deleted: true})
  → Sync pushes to server
  → Server saves: deleted: true, deletedAt: timestamp ✅

// Device B:
User triggers sync (minimize/restore browser)
  → syncService.pullFromServer()
  → fetch('/api/pawkits')
  → Server query: WHERE deleted: false
  → Server response: [] (empty - deleted item filtered out) ❌
  → mergeCollections([], localCollections)
  → No deleted item in server data to merge ❌
  → Local collection stays with deleted: false ❌
```

**The Flow (After Fix)**:
```typescript
// Device A:
User clicks "Delete Pawkit"
  → localDb.saveCollection({...collection, deleted: true})
  → Sync pushes to server
  → Server saves: deleted: true, deletedAt: timestamp ✅

// Device B:
User triggers sync (minimize/restore browser)
  → syncService.pullFromServer()
  → fetch('/api/pawkits?includeDeleted=true')  // ✅ New parameter
  → Server query: WHERE (no deleted filter)
  → Server response: [{...collection, deleted: true}] ✅
  → mergeCollections([{deleted: true}], localCollections)
  → Deletion check: serverCollection.deleted === true ✅
  → localDb.saveCollection({...collection, deleted: true}) ✅
  → Collection disappears from UI (existing filter logic works) ✅
```

**How to Avoid**:
- **ALWAYS** include deleted items in sync API responses
- Use query parameter (`?includeDeleted=true`) to opt-in for sync endpoints
- Keep default behavior (filtered) for UI-facing endpoints
- Test deletion propagation across multiple devices
- Add debug logging to verify deleted items in server responses
- Document which endpoints include deleted items vs filter them

**Where to Check**:
- Sync endpoints: Should accept `includeDeleted` parameter
- UI endpoints: Should filter `deleted: false` by default
- List endpoints: `/api/cards`, `/api/pawkits`, `/api/collections`
- Sync service: Always pass `includeDeleted=true` when syncing

**Debugging Tips**:
```typescript
// Add logging to verify deleted items in response
console.log('[API] Returning collections:', {
  total: result.tree.length,
  includeDeleted,
  deletedCount: result.flat.filter(c => c.deleted).length
});

// In sync service, verify deleted items received
console.log('[Sync] Server collections:', {
  total: serverCollections.length,
  deleted: serverCollections.filter(c => c.deleted).length
});
```

**Testing Checklist**:
- [ ] Device A deletes collection → syncs to server (deleted: true)
- [ ] Device B syncs → receives deleted collection in API response
- [ ] Device B merge logic processes deletion
- [ ] Collection disappears from Device B UI
- [ ] Server shows deleted: true, deletedAt timestamp
- [ ] Both devices show same state (deleted)

**Impact**: Fixed January 12, 2025 - Deletions now sync correctly between all devices

**Commits**:
- `9dd5849` - Added includeDeleted parameter to API
- `aea9073` - Cleaned up debug logging after fix verified

**Files Modified**:
- `lib/server/collections.ts` - Added includeDeleted parameter
- `app/api/pawkits/route.ts` - Read includeDeleted query param
- `lib/services/sync-service.ts` - Pass includeDeleted=true when syncing

**Prevention**:
- Document sync endpoints must include deleted items
- Add tests for cross-device deletion propagation
- Monitor for "deletion not syncing" reports
- Review all list endpoints for proper deleted handling

**See Also**:
- `.claude/skills/pawkit-sync-patterns/SKILL.md` - Deletion sync patterns
- `.claude/skills/pawkit-api-patterns/SKILL.md` - Query parameter conventions
- `.claude/skills/pawkit-conventions/SKILL.md` - Soft delete patterns

---

### 22. Sync Creating Duplicate Collections Instead of Marking as Deleted

**Date**: January 13, 2025
**Severity**: 🔴 Critical
**Category**: Sync, Data Corruption
**Status**: ✅ Fixed

**What Failed**:
When sync received `deleted: true` from server, it created DUPLICATE collections/cards instead of marking existing local entities as deleted. This caused:
- 76 collections in IndexedDB (48 marked deleted, 28 active with duplicates)
- "Zombie apocalypse" - deleted collections appearing in UI across devices
- Data duplication on every deletion sync
- User confusion with duplicate collection names in sidebar

**Evidence**:
```
IndexedDB state after bug:
- Total collections: 76
- Marked deleted: 48
- Active (many duplicates): 28
- Example: "Secret Projects" had 4 duplicates with different IDs
```

**Root Cause**:
In `lib/services/sync-service.ts`, the deletion merge logic was selecting between local and server versions:
```typescript
// ❌ BAD: Created duplicates
if (localCollection.deleted || serverCollection.deleted) {
  const deletedVersion = localCollection.deleted ? localCollection : serverCollection;
  await localDb.saveCollection(deletedVersion, { fromServer: true });
  // When serverCollection selected, this CREATED NEW entity with server ID!
}
```

When server had `deleted: true`, it selected `serverCollection` and saved it as a NEW entity instead of updating the existing local one.

**The Fix**:
Modified both `mergeCollections()` and `mergeCards()` to ALWAYS update the LOCAL entity:
```typescript
// ✅ GOOD: Updates existing entity
if (localCollection.deleted || serverCollection.deleted) {
  // Mark LOCAL version as deleted (don't create duplicate from server)
  localCollection.deleted = true;
  localCollection.deletedAt = serverCollection.deletedAt || localCollection.deletedAt || new Date().toISOString();
  localCollection.updatedAt = new Date().toISOString();

  // Save the updated LOCAL version (prevents duplicates)
  await localDb.saveCollection(localCollection, { fromServer: true });
  continue;
}
```

**Additional Fix - Auto Cleanup**:
Added one-time cleanup function in `lib/stores/data-store.ts` that runs on app initialization:
```typescript
const CORRUPTED_COLLECTION_IDS = [
  'cmhwwy77y0007kt04z7v9tgl7', // Personal sub person test (duplicate)
  'cmhwwxzoe0003kt04ic855omr', // Personal test (duplicate)
  // ... 16 total duplicate collection IDs
];

async function cleanupCorruptedCollections() {
  for (const id of CORRUPTED_COLLECTION_IDS) {
    await localDb.permanentlyDeleteCollection(id);
  }
}

// Called in initialize() BEFORE loading data
```

**Testing Checklist**:
- [x] Delete collection on Device A
- [x] Sync on Device B
- [x] Verify collection marked deleted (not duplicated) on Device B
- [x] Check IndexedDB - no new duplicate IDs created
- [x] Verify sidebar shows clean list after sync
- [x] Test with cards (same fix applied to mergeCards)
- [x] Run cleanup SQL on Supabase to remove server duplicates
- [x] Verify cleanup runs on app startup across all devices

**Before/After Flow**:

**BEFORE (Bug)**:
```
Device A: Delete "Test Collection" (id: abc123)
Server: Collection abc123 marked deleted: true
Device B sync receives: { id: abc123, deleted: true, ... }
Device B already has: { id: abc123, deleted: false, ... }
Merge logic: Selects serverCollection as deletedVersion
Result: Saves serverCollection as NEW entity → DUPLICATE!
```

**AFTER (Fixed)**:
```
Device A: Delete "Test Collection" (id: abc123)
Server: Collection abc123 marked deleted: true
Device B sync receives: { id: abc123, deleted: true, ... }
Device B already has: { id: abc123, deleted: false, ... }
Merge logic: Updates localCollection.deleted = true
Result: Updates EXISTING entity → No duplicate!
```

**Commits**:
- `b1f077a` - Fixed merge logic to update local entity instead of creating duplicate
- `bc006be` - Added missing `deletedAt` field to CollectionNode TypeScript type
- `fb30ffc` - Added auto-cleanup function for existing corrupted collections

**Files Modified**:
- `lib/services/sync-service.ts:551-560` - Fixed mergeCollections() deletion logic
- `lib/services/sync-service.ts:407-416` - Fixed mergeCards() deletion logic
- `lib/types.ts:120` - Added `deletedAt?: string | null` to CollectionNode type
- `lib/stores/data-store.ts:247-267` - Added cleanupCorruptedCollections() function
- `lib/stores/data-store.ts:288` - Call cleanup in initialize() before data load
- `cleanup-corrupted-collections.sql` - SQL script to clean Supabase duplicates

**Prevention**:
- **Never save server entity directly** - Always update local entity to preserve identity
- **Use local entity as merge target** - Server data should update local, not replace
- **Test deletion sync** - Ensure no duplicates created in IndexedDB after sync
- **Monitor collection count** - Alert if IndexedDB collection count spikes
- **Review all merge logic** - Apply same pattern for other sync operations

**See Also**:
- `.claude/skills/pawkit-sync-patterns/SKILL.md` - Proper merge patterns
- `.claude/skills/pawkit-conventions/SKILL.md` - Entity identity preservation
- Issue #21 - Related deletion sync issues

---

### 23. Note Double-Creation from Sync Queue

**Date**: January 13, 2025
**Severity**: 🔴 Critical
**Category**: Sync, Data Duplication
**Status**: ✅ Fixed

**What Failed**:
When creating a note, TWO notes were created on the server within 5 seconds:
1. First note: Created immediately with content (12:23:44)
2. Second note: Created 5 seconds later as blank duplicate (12:23:49)

**Evidence from Supabase**:
```
cmhxehhju... | "Testing for duplication" | "Testing to see..." | 2025-11-13 12:23:44
cmhxehlwz... | "Testing for duplication" | NULL                | 2025-11-13 12:23:49
```

**User Flow**:
1. User clicks "Create Note" → Modal opens
2. Note created with temp ID, queued for sync
3. Immediate sync fires → Note created on server (✅ First note)
4. User starts typing → Auto-save fires
5. 5 seconds later → Sync queue drains → Creates SAME note AGAIN (❌ Duplicate)

**Root Cause**:
In `lib/stores/data-store.ts:446` (addCard function), the code was:
```typescript
// STEP 3: Sync to server in background (if enabled)
if (serverSync) {
  // Queue for sync
  await syncQueue.enqueue({
    type: 'CREATE_CARD',
    payload: cardData,
    tempId: newCard.id,
  });

  // Try immediate sync
  const response = await fetch('/api/cards', { method: 'POST', ... });

  if (response.ok) {
    const serverCard = await response.json();
    // ❌ BUG: Queued item NOT removed after immediate sync success!
    // Queue still has the create operation
    // When queue drains later → Creates duplicate
    ...
  }
}
```

**Why the 5-Second Gap**:
The sync queue drains every 5 seconds (network-sync.ts interval). When immediate sync succeeded, the card was already created on the server, but the queued operation remained. When the queue drained 5 seconds later, it posted the same card data AGAIN, creating a duplicate with blank/NULL content.

**The Fix**:
Added `removeByTempId()` method to sync-queue.ts and called it after successful immediate sync:

```typescript
if (response.ok) {
  const serverCard = await response.json();

  // ✅ CRITICAL: Remove from sync queue since immediate sync succeeded
  // This prevents duplicate creation when queue drains
  await syncQueue.removeByTempId(tempId);

  // ... rest of logic
}
```

**Implementation Details**:

1. **Added `removeByTempId()` method** (sync-queue.ts:246-258):
```typescript
async removeByTempId(tempId: string): Promise<void> {
  if (!this.db) {
    throw new Error('[SyncQueue] Database not initialized');
  }

  const operations = await this.db.getAll('operations');
  const toRemove = operations.filter(op => op.tempId === tempId);

  for (const op of toRemove) {
    await this.db.delete('operations', op.id);
  }
}
```

2. **Call after immediate sync success** (data-store.ts:516):
```typescript
await syncQueue.removeByTempId(tempId);
```

**Testing Checklist**:
- [x] Create new note
- [x] Immediately start typing
- [x] Wait 5+ seconds for queue drain
- [x] Check Supabase - verify only ONE note created
- [x] Verify sync queue is empty after creation
- [x] Check no blank duplicates appear
- [x] Test with cards, bookmarks (all card types)

**Before/After Flow**:

**BEFORE (Bug)**:
```
User creates note → addCard() runs
├─ Queue card for sync (pending in IndexedDB sync-queue)
├─ Immediate sync fires → POST /api/cards → 201 Created ✅
│  └─ Card created on server (id: cmhxehhju, content: "Testing to see...")
├─ [BUG] Queued operation NOT removed
└─ 5 seconds later → Queue drains
   └─ POST /api/cards with SAME data → 201 Created
      └─ Duplicate created (id: cmhxehlwz, content: NULL) ❌
```

**AFTER (Fixed)**:
```
User creates note → addCard() runs
├─ Queue card for sync (pending in IndexedDB sync-queue)
├─ Immediate sync fires → POST /api/cards → 201 Created ✅
│  └─ Card created on server (id: cmhxehhju, content: "Testing to see...")
├─ removeByTempId(tempId) called → Removes queued operation ✅
└─ 5 seconds later → Queue drains
   └─ No pending operations → Nothing posted → No duplicate! ✅
```

**Commits**:
- `ec5a34c` - Added removeByTempId and fixed addCard to dequeue after immediate sync

**Files Modified**:
- `lib/services/sync-queue.ts:246-258` - Added removeByTempId() method
- `lib/stores/data-store.ts:516` - Call removeByTempId after immediate sync success

**Prevention**:
- **Always dequeue after immediate sync success** - Don't leave operations in queue
- **Test create operations** - Verify no duplicates after queue drain
- **Monitor duplicate creation** - Alert if same title/URL created twice within seconds
- **Review all immediate sync paths** - Apply same pattern to collections, updates
- **Check sync queue after operations** - Ensure proper cleanup

**See Also**:
- `.claude/skills/pawkit-sync-patterns/SKILL.md` - Queue management patterns
- Issue #22 - Related sync duplication issues

---

### 24. Duplicate Daily Note Creation in Notes View

**Date**: January 13, 2025
**Severity**: 🟡 Medium
**Category**: UI Logic, Daily Notes
**Status**: ✅ Fixed

**What Failed**:
The "Daily Note" button in the Notes view created multiple daily notes for the same date when clicked rapidly, instead of checking if one already existed and opening it.

**Evidence**:
User reported seeing three "2025-11-13 - Thursday" entries in their notes list after clicking the Daily Note button multiple times.

**Root Cause**:
The check for an existing daily note was happening at **render time** (line 111), not **click time**:

```typescript
// ❌ BUG: Calculated at render time
const today = new Date();
const todayDateStr = today.toISOString().split('T')[0];
const todaysNote = dailyNotes.find(note => note.date === todayDateStr);
const hasTodaysNote = !!todaysNote;

// In createDailyNote function
const createDailyNote = async () => {
  // ❌ Uses stale render-time value
  if (hasTodaysNote) {
    // Open existing note
    return;
  }
  // Create new note
};
```

**Why It Failed**:
1. First click: `hasTodaysNote` = false → creates note
2. Component hasn't re-rendered yet
3. Second click: `hasTodaysNote` = **still false** → creates duplicate!
4. Third click: `hasTodaysNote` = **still false** → creates another duplicate!

The component only re-renders after the async `addCard` completes, so rapid clicks all see the same stale value.

**The Fix**:
Replicate the working sidebar pattern - check for existing note **inside** the click handler using current store state:

```typescript
// ✅ CORRECT: Check at click time
const createDailyNote = async () => {
  const today = new Date();

  // Check current store state, not stale render value
  const existingNote = findDailyNoteForDate(dataStore.cards, today);

  if (existingNote) {
    openCardDetails(existingNote.id);  // Open existing
    return;
  }

  // Only create if doesn't exist
  await dataStore.addCard({ type: 'md-note', title, content, tags: ['daily'] });

  // Find newly created note and open it
  setTimeout(() => {
    const newNote = findDailyNoteForDate(dataStore.cards, today);
    if (newNote) {
      openCardDetails(newNote.id);
    }
  }, 100);
};
```

**Implementation Details**:

1. **Import findDailyNoteForDate** - Utility that checks current store state
2. **Check inside function** - Query dataStore.cards at click time, not render time
3. **Use setTimeout** - Small delay to find newly created note (matches sidebar pattern)

**Working Reference**:
The sidebar "Today's Note" button (components/navigation/left-navigation-panel.tsx:263-289) had the correct pattern all along - it checks for the existing note inside the goToTodaysNote function.

**Files Modified**:
- `components/notes/notes-view.tsx:13` - Import findDailyNoteForDate
- `components/notes/notes-view.tsx:114-152` - Rewrote createDailyNote function

**Testing Checklist**:
- [x] Click "Daily Note" button once → Creates note
- [x] Click "Daily Note" button again → Opens existing note (no duplicate)
- [x] Click rapidly multiple times → All clicks open the same note
- [x] Check Notes list → Only ONE daily note per date
- [x] Verify works across different dates

**Commits**:
- `c3e6683` - Fix duplicate daily note creation in Notes view

**Prevention**:
- **Check state at action time, not render time** - Use current store state inside handlers
- **Test rapid clicks** - Verify no race conditions from stale render values
- **Reference working implementations** - Sidebar had correct pattern, should have been template
- **Use store queries in handlers** - Don't rely on useMemo/useState derived values

**See Also**:
- `lib/utils/daily-notes.ts` - findDailyNoteForDate utility
- Sidebar implementation - Correct pattern reference

---

### 25. Tags Column Displaying Collections Instead of Tags

**Date**: January 13, 2025
**Severity**: 🟡 Medium
**Category**: UI Display, Data Model Confusion
**Status**: ✅ Fixed

**What Failed**:
The "Tags" column in Library list view was showing:
- **Bookmarks**: Displayed collections (pawkits like "restaurants", "seattle")
- **Notes**: Displayed "-" even though they had tags (like "daily")

**Root Cause**:
The Tags column header said "Tags" but the code was rendering `card.collections` instead of `card.tags`:

```typescript
// ❌ WRONG: Showing collections, not tags
<th className="text-left py-3 px-4 font-medium">Tags</th>

<td className="py-3 px-4">
  <div className="flex flex-wrap gap-1">
    {card.collections && card.collections.length > 0 ? (  // ❌ Wrong property!
      card.collections.slice(0, 2).map((collection) => (
        <span>{collection}</span>
      ))
    ) : (
      <span>-</span>
    )}
  </div>
</td>
```

**Data Model Confusion**:
- **Collections** = Hierarchical pawkits/folders (e.g., "restaurants", "seattle")
- **Tags** = Flat metadata labels (e.g., "daily", "important", "work")

Cards can have **both** collections AND tags, but the column was only showing collections.

**Why It Was Partially Working**:
- **Bookmarks** typically have collections but no tags → Showed collections (incorrect but visible)
- **Notes** typically have tags but no collections → Showed "-" (completely broken)

**First Attempted Fix** (Broke bookmarks):
```typescript
// ❌ This fixed notes but broke bookmarks
{card.tags && card.tags.length > 0 ? (
  card.tags.map((tag) => <span>{tag}</span>)
) : (
  <span>-</span>
)}
// Now bookmarks show "-" because they have no tags!
```

**The Correct Fix**:
Show **both** tags AND collections in the Tags column:

```typescript
// ✅ CORRECT: Merge tags and collections
<td className="py-3 px-4">
  <div className="flex flex-wrap gap-1">
    {(() => {
      // Combine both tags and collections for display
      const allTags = [
        ...(card.tags || []),
        ...(card.collections || [])
      ];

      if (allTags.length > 0) {
        return allTags.slice(0, 2).map((tag) => (
          <span key={tag} className="text-xs text-muted-foreground bg-surface-soft px-2 py-0.5 rounded">
            {tag}
          </span>
        ));
      }

      return <span className="text-sm text-muted-foreground">-</span>;
    })()}
  </div>
</td>
```

**Why This Solution Works**:
- **Bookmarks with collections**: Shows collections (restaurants, products, seattle)
- **Notes with tags**: Shows tags (daily)
- **Cards with both**: Shows tags + collections (first 2 total)
- **Cards with neither**: Shows "-"

**Files Modified**:
- `components/library/card-gallery.tsx:499-519` - Tags column rendering logic

**Testing Checklist**:
- [x] Bookmarks display their collections (restaurants, products, seattle)
- [x] Daily notes display "daily" tag
- [x] Notes with tags display correctly
- [x] Cards without tags or collections show "-"
- [x] Shows maximum 2 items (doesn't overflow)

**Commits**:
- `04b407f` - First attempt (fixed notes, broke bookmarks)
- `0abb2f9` - Correct fix (show both tags and collections)

**Prevention**:
- **Understand data model** - Tags and collections are different concepts
- **Test all card types** - Bookmarks, notes, cards with both, cards with neither
- **Consider all use cases** - Don't fix one case by breaking another
- **Use descriptive column names** - Consider renaming to "Tags & Pawkits" for clarity

**See Also**:
- `.claude/skills/pawkit-conventions/SKILL.md` - Data model documentation
- `lib/types.ts` - CardModel type definition (tags vs collections)

---

### 26. Dead Code - Unused AppSidebar Component

**Date**: January 14, 2025
**Severity**: 🟡 Medium
**Category**: Code Cleanup, Performance
**Status**: ✅ Fixed

**What Failed**:
The `AppSidebar` component existed in the codebase (417 lines) but was completely disabled in the layout. It was replaced by `LeftNavigationPanel` but never removed, creating confusion and wasting bundle size.

**Evidence**:
```tsx
// app/(dashboard)/layout.tsx:403
{false && <AppSidebar username={username} displayName={displayName} collections={collections} />}
// ❌ Component never renders - disabled with false &&
```

**Root Cause**:
- During UI overhaul (October 2025), sidebar was replaced with new panel system
- `LeftNavigationPanel` became the actual sidebar
- `AppSidebar` was disabled but never deleted
- Initial performance fix was applied to wrong component (the disabled one)

**The Fix**:
```bash
# Removed entire file and all imports
rm components/sidebar/app-sidebar.tsx

# Cleaned up layout imports
# app/(dashboard)/layout.tsx
- import { AppSidebar } from "@/components/sidebar/app-sidebar";

# Removed disabled component reference
- {false && <AppSidebar username={username} displayName={displayName} collections={collections} />}
```

**Impact**:
- **-417 lines** of dead code removed
- **Cleaner bundle** - Removed unused component from build
- **Less confusion** - No ambiguity about which sidebar is in use
- **Better documentation** - Code matches actual architecture

**How It Was Found**:
1. Applied performance fix to `AppSidebar` (selective Zustand subscription)
2. Tested in preview build - console.log never appeared
3. Investigated: Found component disabled in layout with `false &&`
4. Realized performance fix was applied to wrong component
5. Removed dead code and fixed actual sidebar (`LeftNavigationPanel`)

**How to Avoid**:
- **Remove disabled components** - Don't leave `{false && ...}` code in production
- **Clean up after migrations** - When replacing components, delete old ones
- **Search before fixing** - Verify component is actually rendering before debugging
- **Code review** - Flag commented-out or disabled code for removal
- **Regular audits** - Scan for `{false &&`, `if (false)`, commented blocks

**Prevention Checklist**:
- [ ] Search codebase for `{false &&` patterns
- [ ] Search for `if (false)` or `const DISABLED = true`
- [ ] Review large commented-out blocks
- [ ] Check imports for unused components
- [ ] Verify component actually renders before debugging

**Commits**:
- `98d0640` - Initial fix applied to wrong component (AppSidebar)
- `c8271bc` - Removed AppSidebar and fixed actual component

**Files Removed**:
- `components/sidebar/app-sidebar.tsx` - 417 lines deleted

**Files Modified**:
- `app/(dashboard)/layout.tsx` - Removed import and disabled component

**See Also**:
- Issue #27 - The actual performance fix for LeftNavigationPanel
- `.claude/skills/pawkit-ui-ux/SKILL.md` - Panel architecture documentation

---

### 27. Performance - Excessive Re-renders from Store Subscriptions

**Date**: January 14, 2025
**Severity**: 🔴 Critical
**Category**: Performance, Store Subscriptions
**Status**: ✅ Fixed

**What Failed**:
Two critical performance issues causing excessive re-renders across the entire app:

1. **ProfileModal** - Re-rendered on EVERY settings change even when closed
2. **LeftNavigationPanel** - Re-rendered on EVERY card change across entire app

**Evidence - ProfileModal**:
```typescript
// Console logs showed dozens of re-renders:
[ProfileModal] Component rendering, open: false
[ProfileModal] Component rendering, open: false
[ProfileModal] Component rendering, open: false
// ... repeated 50+ times during normal usage
```

**Evidence - LeftNavigationPanel**:
```typescript
// Sidebar subscribed to ALL cards:
const { cards, addCard, updateCard, ... } = useDemoAwareStore();

// Result: Re-rendered on EVERY card modification:
// - User edits bookmark in Library → Sidebar re-renders ❌
// - User creates note → Sidebar re-renders ❌
// - Metadata fetch updates card → Sidebar re-renders ❌
```

**Root Cause #1 - ProfileModal**:
```tsx
// ❌ WRONG: Store subscriptions BEFORE early return
export function ProfileModal({ open, onClose, username }: Props) {
  // 15+ store subscriptions here
  const theme = useSettingsStore((state) => state.theme);
  const accentColor = useSettingsStore((state) => state.accentColor);
  const notifications = useSettingsStore((state) => state.notifications);
  // ... 12 more subscriptions

  if (!open) return null;  // ❌ Early return AFTER subscriptions!
  // Even when closed, component subscribed to 15+ settings
  // Every settings change triggers re-render
}
```

**Root Cause #2 - LeftNavigationPanel**:
```tsx
// ❌ WRONG: Subscribed to entire cards array
const { cards, addCard, updateCard } = useDemoAwareStore();

// All of these triggered sidebar re-render:
// - Edit bookmark title
// - Update card metadata
// - Create new card
// - Delete card
// - ANY change to ANY card

// But sidebar only needs:
// - Daily notes (for streak counter)
// - Pinned notes (for pinned list)
// - Active card (for pawkit actions)
```

**The Fix #1 - ProfileModal**:
```tsx
// ✅ CORRECT: Wrapper component with early return BEFORE subscriptions
export function ProfileModal(props: ProfileModalProps) {
  // Early return prevents all store subscriptions when closed
  if (!props.open || typeof document === 'undefined') return null;

  return <ProfileModalContent {...props} />;
}

// Inner component only renders when open
function ProfileModalContent({ open, onClose, username }: Props) {
  // Now these subscriptions only happen when modal is OPEN
  const theme = useSettingsStore((state) => state.theme);
  const accentColor = useSettingsStore((state) => state.accentColor);
  // ...
}
```

**The Fix #2 - LeftNavigationPanel**:
```tsx
// ✅ CORRECT: Selective subscription with shallow comparison
import { shallow } from "zustand/shallow";

const pinnedNoteIds = useSettingsStore((state) => state.pinnedNoteIds);
const activeCardId = usePanelStore((state) => state.activeCardId);

// Only subscribe to relevant cards
const cards = useDataStore((state) => {
  return state.cards.filter((card) => {
    // Include daily notes (for streak, navigation)
    if (card.tags?.includes('daily')) return true;
    // Include pinned notes
    if (pinnedNoteIds.includes(card.id)) return true;
    // Include active card (for pawkit actions)
    if (card.id === activeCardId) return true;
    return false;
  });
}, shallow);  // ✅ Shallow comparison prevents unnecessary re-renders
```

**Impact**:
- **ProfileModal**: **100% reduction** in re-renders when closed (verified in logs)
- **LeftNavigationPanel**: **40-60% expected reduction** in re-renders
  - Before: Re-renders on ALL card changes (100% of events)
  - After: Re-renders only when daily/pinned/active cards change (~40-60% of events)

**Testing Results**:
```
Before:
- Opened Library view
- Modified 10 bookmarks
- Console: 50+ ProfileModal renders, sidebar re-rendered 10 times

After:
- Opened Library view
- Modified 10 bookmarks
- Console: 0 ProfileModal renders, sidebar re-rendered 0 times ✅
```

**Performance Gains**:
- **Faster UI updates** - Less work on every state change
- **Reduced CPU usage** - Components don't compute when unnecessary
- **Better battery life** - Especially on laptops/mobile
- **Smoother animations** - Less render blocking
- **Cleaner console logs** - Only see relevant renders

**How to Avoid**:
- **Modal pattern**: ALWAYS early return BEFORE store subscriptions
- **Selective subscriptions**: Only subscribe to data components actually need
- **Shallow comparison**: Use `shallow` from zustand for filtered arrays
- **Test re-renders**: Add console.log to verify component render count
- **Profile performance**: Use React DevTools Profiler to catch excessive renders

**Prevention Checklist**:
- [ ] Modals use wrapper with early return before subscriptions
- [ ] Components subscribe only to needed data (not entire arrays)
- [ ] Array subscriptions use `shallow` comparison
- [ ] Added console.log during development to verify render count
- [ ] Tested with React DevTools Profiler

**Store Subscription Patterns**:
```tsx
// ❌ BAD: Full array subscription
const cards = useDataStore((state) => state.cards);
// Re-renders on ANY card change

// ✅ GOOD: Selective with shallow
const relevantCards = useDataStore(
  (state) => state.cards.filter(c => isRelevant(c)),
  shallow
);
// Re-renders only when relevant cards change

// ❌ BAD: Multiple individual subscriptions
const field1 = useStore((state) => state.field1);
const field2 = useStore((state) => state.field2);
// Two separate subscriptions

// ✅ GOOD: Single object subscription with shallow
const { field1, field2 } = useStore(
  (state) => ({ field1: state.field1, field2: state.field2 }),
  shallow
);
// One subscription, shallow comparison
```

**Commits**:
- `fbbdd1a` - Fixed ProfileModal re-rendering when closed
- `c8271bc` - Optimized LeftNavigationPanel with selective subscription

**Files Modified**:
- `components/modals/profile-modal.tsx` - Added wrapper component pattern
- `components/navigation/left-navigation-panel.tsx` - Selective card subscription
- `components/sidebar/app-sidebar.tsx` - Deleted (dead code)

**Bundle Impact**:
- **-437 lines** deleted (dead code removal)
- **+35 lines** added (optimizations)
- **Net: -402 lines**

**See Also**:
- `.claude/skills/pawkit-performance/SKILL.md` - Performance optimization patterns
- `.claude/skills/pawkit-conventions/SKILL.md` - Zustand subscription best practices
- Zustand docs: Selecting state slices and shallow comparison

---

### 28. Duplicate URL Detection - Deleted Cards Not Excluded

**Date**: January 14, 2025
**Severity**: 🟡 Medium
**Category**: Database, Duplicate Detection, User Experience
**Status**: ✅ Fixed

**Issue**: Users could not re-add URLs that were previously deleted because the unique constraint was checking ALL cards (including deleted ones), even though the application code correctly excluded deleted cards.

**Symptom**:
```
1. User adds https://example.com (card ID: abc123)
2. User deletes the card (soft delete → deleted=true)
3. User tries to add https://example.com again
4. Gets 409 "This URL is already bookmarked" error
5. User confused - card isn't visible in their library
```

**What Failed**:
The database unique constraint didn't match the application logic:

```sql
-- ❌ WRONG: Database constraint checking ALL cards
CREATE UNIQUE INDEX "Card_userId_url_key"
ON "Card"("userId", "url")
WHERE "type" = 'url';
-- Missing: AND "deleted" = false
```

Meanwhile, the application code correctly excluded deleted cards:
```typescript
// ✅ Application code was CORRECT
const existingCard = await prisma.card.findFirst({
  where: {
    userId,
    url: parsed.url,
    type: "url",
    deleted: false  // ← Application checked this
  }
});
```

**Root Cause**:
- **Application layer**: Pre-flight check excluded `deleted=true` cards ✅
- **Database layer**: Unique constraint applied to ALL cards (including deleted) ❌
- When Prisma tried to INSERT, database threw P2002 unique violation
- User got duplicate error even though no active card with that URL existed

**The Fix**:
Migration `20250114000000_exclude_deleted_from_url_constraint`:

```sql
-- ✅ CORRECT: Exclude deleted cards from constraint
DROP INDEX IF EXISTS "Card_userId_url_key";

CREATE UNIQUE INDEX "Card_userId_url_key"
ON "Card"("userId", "url")
WHERE "type" = 'url' AND "deleted" = false;
```

**Why This Matters**:
1. **User Workflow**: Common to delete and re-add URLs during link management
2. **Data Integrity**: Deleted cards shouldn't block new creations
3. **Consistency**: Database constraint should match application logic
4. **Trust**: Users expect deleted items to be truly "gone"

**Files Changed**:
- `prisma/migrations/20250114000000_exclude_deleted_from_url_constraint/migration.sql`
- `prisma/schema.prisma` (updated comment)
- `lib/server/cards.ts` (already had correct logic)

**Testing**:
```typescript
// Verify deleted cards don't block re-creation:
1. Add card: https://test-deletion.com
2. Delete the card (deleted=true)
3. Verify: Card gone from library view
4. Add same URL again: https://test-deletion.com
5. Expected: Creates new card successfully ✅
6. Verify: New card appears in library
```

**How to Avoid**:
- **Align constraints with code**: Database constraints should match application logic
- **Document partial indexes**: Add comments in schema explaining WHERE clauses
- **Test edge cases**: Always test with deleted data, not just active data
- **Migration reviews**: Verify partial indexes include all necessary conditions

**Prevention Checklist**:
- [ ] Partial unique indexes include `deleted = false` for soft-delete models
- [ ] Schema comments document all WHERE clause conditions
- [ ] Test scenarios include re-adding deleted items
- [ ] Migration SQL matches application query logic
- [ ] Both pre-flight checks AND database constraints aligned

**Impact**:
- ✅ Users can now re-add previously deleted URLs
- ✅ Database constraint matches application logic
- ✅ Duplicate detection only applies to active (non-deleted) cards
- ✅ Better user experience for link management workflows

**Related Issues**:
- Issue #15: Duplicate Card Issue - Deleted Cards Returned
- Issue #12: Deleted Cards Appearing in Library View

**See Also**:
- `.claude/skills/pawkit-api-patterns/SKILL.md` - 409 Conflict error handling
- `.claude/skills/pawkit-migrations/SKILL.md` - Safe migration patterns
- Prisma docs: Partial unique indexes

---

## Debugging Strategies

### 29. Collection Header Label - Not Showing Pawkit Name (Mobile)

**Date**: November 23, 2025
**Severity**: 🟡 Medium
**Category**: UI/UX, Mobile, Navigation
**Status**: ✅ Fixed

**Issue**: When navigating to a specific collection (pawkit) in the mobile app, the header label always showed "Library" instead of the collection name, making it unclear which collection the user was viewing.

**Symptom**:
```
1. User taps on a collection named "Work Projects" in left panel
2. Right content area loads cards from that collection correctly
3. Header still displays "Library" instead of "Work Projects"
4. User confused about which collection they're viewing
```

**What Failed**:
The header text logic only checked for search query, not collection context:

```typescript
// ❌ WRONG: No check for collection name
<Text style={styles.libraryLabel}>
  {searchQuery.trim() ? 'Search Results' : 'Library'}
</Text>
```

**Root Cause**:
- Route parameter `collection` contained the collection slug
- Collections were loaded into state as tree structure
- Header rendering didn't look up the collection name from the slug
- No helper function to recursively search collection tree

**The Fix**:
Added collection name lookup with recursive tree search in `BookmarksListScreen_New.tsx`:

```typescript
// ✅ CORRECT: Helper function to find collection name from slug
const getCollectionName = (slug: string | undefined): string | null => {
  if (!slug) return null;

  const findInTree = (nodes: CollectionNode[]): string | null => {
    for (const node of nodes) {
      if (node.slug === slug) return node.name;
      if (node.children) {
        const found = findInTree(node.children);
        if (found) return found;
      }
    }
    return null;
  };

  return findInTree(collections);
};

const collectionName = getCollectionName(collection);

// Updated header with priority order
<Text style={styles.libraryLabel}>
  {searchQuery.trim() ? 'Search Results' : (collectionName || 'Library')}
</Text>
```

**Priority Order**:
1. **"Search Results"** - When actively searching
2. **Collection name** - When viewing a specific pawkit
3. **"Library"** - Default view (all cards)

**Why This Matters**:
1. **Navigation Context**: Users need to know where they are in the app
2. **Multi-Collection Workflows**: Essential when managing multiple pawkits
3. **Visual Feedback**: Confirms that tapping a collection succeeded
4. **Nested Collections**: Works with both top-level and nested collections

**Files Changed**:
- `mobile/src/screens/BookmarksListScreen_New.tsx` (lines 659-677, 707, 757)

**Testing**:
```typescript
// Verify collection name display:
1. Navigate to Library view → Header shows "Library" ✅
2. Tap a collection "Work" → Header shows "Work" ✅
3. Tap nested collection "Work/Projects" → Header shows "Projects" ✅
4. Enter search query "test" → Header shows "Search Results" ✅
5. Clear search while in collection → Header shows collection name ✅
```

**How to Avoid**:
- **Context-aware labels**: Always check navigation state before rendering labels
- **Route parameters**: Use route params to determine current context
- **Helper functions**: Create reusable lookup functions for nested data structures
- **Test edge cases**: Verify nested collections, empty states, and search combinations

**Prevention Checklist**:
- [ ] All navigation labels check route parameters for context
- [ ] Helper functions handle nested data structures (trees, hierarchies)
- [ ] Labels update reactively when navigation changes
- [ ] Search/filter states don't override navigation context incorrectly
- [ ] Test all navigation paths (top-level, nested, search, default)

**Impact**:
- ✅ Users can see which collection they're viewing
- ✅ Works with nested collections (recursive search)
- ✅ Proper priority: Search > Collection > Default
- ✅ Better navigation awareness and UX

**Related Issues**:
- UI/UX improvements for mobile navigation

**See Also**:
- `.claude/skills/pawkit-ui-ux/skill.md` - Collection Header Label Fix
- React Navigation docs: Route parameters

---

### 30. Browser Extension - Collections Using Slugs Not IDs

**Date**: November 24, 2025
**Severity**: 🟡 Medium
**Category**: API Integration, Browser Extension
**Status**: ✅ Fixed

**Issue**: Browser extension saving cards to "Library" even when a specific collection (pawkit) was selected from dropdown.

**Symptom**:
```
1. User selects "Work Projects" collection from dropdown in extension popup
2. User clicks "Save to Pawkit"
3. Card saved successfully
4. Card appears in Library, NOT in "Work Projects" collection
5. User confused - selection seemed to have no effect
```

**What Failed**:
```typescript
// ❌ WRONG: Using collection ID instead of slug
const payload = {
  title: 'My Card',
  url: 'https://example.com',
  collectionId: selectedCollection?.id  // ❌ API doesn't use collectionId!
}
```

**Root Cause**:
- API expects `collections: string[]` (array of **slugs**)
- Extension was passing `collectionId` which is ignored by API
- No error returned - API just saved card without collection association
- User saw success but card wasn't in expected collection

**The Fix**:
```typescript
// ✅ CORRECT: Use collections array with slugs
const [selectedCollectionSlug, setSelectedCollectionSlug] = useState<string | null>(null)

// When saving
const message: SaveCardMessage = {
  type: 'SAVE_CARD',
  payload: {
    title: title.trim(),
    url: url.trim(),
    collections: selectedCollectionSlug ? [selectedCollectionSlug] : undefined,  // ✅ Array of slugs!
    source: 'webext'
  }
}
```

**Fetching Collections Correctly**:
```typescript
// GET /api/pawkits returns flat array with slugs
const response = await apiGet<{ flat: Array<Collection> }>('/pawkits')

if (response.ok && response.data?.flat) {
  const collections = response.data.flat.map(c => ({
    id: c.id,      // For React key only
    name: c.name,  // For display
    emoji: c.emoji,
    slug: c.slug   // ← THIS is what you pass to API when saving
  }))
}
```

**Additional Fix - View Button URL Pattern**:
```typescript
// ❌ WRONG: Using incorrect URL pattern
const targetUrl = `https://getpawkit.com/p/${slug}`  // 404!

// ✅ CORRECT: Use /pawkits/{slug}
const targetPath = selectedCollectionSlug
  ? `/pawkits/${selectedCollectionSlug}`  // ✅ Correct pattern
  : '/library'
const targetUrl = `https://getpawkit.com${targetPath}`
```

**Files Changed**:
- `packages/extension/src/popup/Popup.tsx` - Use slug for collections and navigation
- `packages/extension/src/shared/types.ts` - Added Collection interface with slug
- `packages/extension/src/background/api.ts` - Added getCollections function

**Testing**:
```
1. Open extension popup on any page
2. Select a collection from dropdown ("Work Projects")
3. Click "Save to Pawkit"
4. Open Pawkit web app → Navigate to "Work Projects"
5. Verify card appears in that collection ✅
6. Click "View" after saving → Opens /pawkits/work-projects ✅
```

**How to Avoid**:
- **Read API docs**: Collections API uses slugs, NOT IDs
- **Log payloads**: Console.log the exact payload being sent to API
- **Test association**: Verify card appears in correct collection, not just "saved"
- **Check URL patterns**: Verify navigation URLs match web app routes

**Key Learnings**:
- API ignores unknown fields - no error when sending wrong field name
- Always check database/server for actual association, not just success response
- URL patterns: `/pawkits/{slug}` not `/p/{slug}` or `/pawkits/{id}`
- Collections dropdown should track slug, not ID

**Prevention Checklist**:
- [ ] Use `collections: [slug]` not `collectionId` when saving cards
- [ ] Store and pass slug from dropdown selection
- [ ] Test actual collection membership, not just save success
- [ ] Use correct URL pattern for navigation: `/pawkits/{slug}`

**Impact**:
- ✅ Cards now save to selected collection correctly
- ✅ View button navigates to correct collection page
- ✅ Collection dropdown shows correct selection

**See Also**:
- `.claude/skills/pawkit-api-patterns/SKILL.md` - Collections API section (CRITICAL)
- Extension source: `packages/extension/src/`

---

### 31. Ultrawide Monitor Card Rendering (Chrome GPU)

**Date**: November 25, 2025
**Severity**: 🟡 Medium
**Category**: CSS, GPU Rendering, Chrome
**Status**: ✅ Fixed

**Issue**: Cards appeared empty/black on 3440x1440 ultrawide monitors when the right sidebar was anchored (embedded mode).

**Symptom**:
```
1. User has 3440x1440 ultrawide monitor
2. Right sidebar anchored (3-panel layout)
3. Cards in Library view show as empty black rectangles
4. Same page works fine when right sidebar is floating
```

**Root Cause**:
- `backdrop-filter: blur()` on content panel caused Chrome GPU memory overflow
- High-resolution monitors with glass-morphism effects exceeded GPU texture limits
- Issue only manifested when embedded mode because more panels meant more blur layers

**What Failed**:
```tsx
// ❌ WRONG: Always applying backdrop blur
<div className={cn(
  "flex-1 overflow-auto h-full bg-background/50 backdrop-blur-sm",
  // ...
)}>
```

**Solution**:
```tsx
// ✅ CORRECT: Disable blur in embedded mode
const isRightEmbedded = rightMode === "anchored";

<div className={cn(
  "flex-1 overflow-auto h-full",
  isRightEmbedded
    ? "bg-background/80"  // No blur, just darker background
    : "bg-background/50 backdrop-blur-sm"  // Blur only when not embedded
)}>
```

**Files Changed**:
- `components/panels/content-panel.tsx`

**Testing**:
```
1. Set display resolution to 3440x1440 (or similar ultrawide)
2. Open Library view with right sidebar anchored
3. Verify cards render with proper thumbnails ✅
4. Toggle sidebar mode - cards should work in both modes ✅
```

**How to Avoid**:
- Test on high-resolution displays before releasing glass-morphism features
- Be cautious with stacking multiple `backdrop-filter: blur()` layers
- Consider conditional blur based on panel configuration

---

### 32. Rediscover Queue Reset on Card Update

**Date**: November 25, 2025
**Severity**: 🟡 Medium
**Category**: React, useEffect Dependencies, State Management
**Status**: ✅ Fixed

**Issue**: Rediscover queue reset to beginning whenever a card was updated (e.g., adding to a Pawkit).

**Symptom**:
```
1. User reviews 10 cards in Rediscover, reaches card #11
2. User clicks "Add to Pawkit" for card #11
3. After selecting Pawkit, queue resets to card #1
4. All progress lost
```

**Root Cause**:
- `useEffect` for initializing queue included `items` in dependency array
- `items` is a memoized filtered array from `cards`
- Updating ANY card triggered cards store change → new items array → queue reset

**What Failed**:
```tsx
// ❌ WRONG: items in dependency array
useEffect(() => {
  if (isRediscoverMode) {
    const filtered = getFilteredCards(rediscoverStore.filter);
    rediscoverStore.setQueue(filtered);
    rediscoverStore.setCurrentIndex(0);  // RESETS TO 0!
  }
}, [isRediscoverMode, items]);  // ← items causes reset on every card update
```

**Solution**:
```tsx
// ✅ CORRECT: Only depend on mode, handle filter separately
useEffect(() => {
  if (isRediscoverMode) {
    if (!rediscoverStore.isActive) {
      const filtered = getFilteredCards(rediscoverStore.filter);
      rediscoverStore.reset();
      rediscoverStore.setActive(true);
      rediscoverStore.setQueue(filtered);
      rediscoverStore.setCurrentIndex(0);
    }
  } else {
    if (rediscoverStore.isActive) {
      rediscoverStore.reset();
    }
  }
}, [isRediscoverMode]);  // ← Only mode changes trigger reset

// Separate effect for filter changes
const [lastFilter, setLastFilter] = useState(rediscoverStore.filter);
useEffect(() => {
  if (isRediscoverMode && rediscoverStore.isActive && rediscoverStore.filter !== lastFilter) {
    const filtered = getFilteredCards(rediscoverStore.filter);
    rediscoverStore.setQueue(filtered);
    rediscoverStore.setCurrentIndex(0);
    setLastFilter(rediscoverStore.filter);
  }
}, [rediscoverStore.filter]);
```

**Files Changed**:
- `app/(dashboard)/library/page.tsx`

**How to Avoid**:
- Don't include dynamic arrays in useEffect dependencies unless you want to react to changes
- Separate "initialization" from "update" logic into different effects
- Use flags like `isActive` to prevent re-initialization

---

### 33. Slow Modal Loading (API vs Local Data Store)

**Date**: November 25, 2025
**Severity**: 🟡 Medium
**Category**: Performance, Local-First Architecture
**Status**: ✅ Fixed

**Issue**: MoveToPawkitModal took 3-4 seconds to show Pawkits list.

**Symptom**:
```
1. User clicks "Add to Pawkit" in Rediscover
2. Modal opens with loading spinner
3. 3-4 seconds pass while fetching from API
4. Finally shows Pawkit list
5. Poor UX - feels broken
```

**Root Cause**:
- Modal was fetching from `/api/pawkits` endpoint every time it opened
- Network latency + server processing caused delay
- Data already existed in local Zustand store (synced on app load)

**What Failed**:
```tsx
// ❌ WRONG: Fetching from API when data is already local
export function MoveToPawkitModal({ ... }) {
  const [loading, setLoading] = useState(true);
  const [collections, setCollections] = useState<Collection[]>([]);

  useEffect(() => {
    if (open) {
      fetch('/api/pawkits')
        .then(res => res.json())
        .then(data => {
          setCollections(data);
          setLoading(false);
        });
    }
  }, [open]);
  // ... loading spinner while fetching
}
```

**Solution**:
```tsx
// ✅ CORRECT: Use local data store (instant)
export function MoveToPawkitModal({ open, onClose, onConfirm, collections: propCollections }) {
  // Use prop collections or fall back to data store (instant, local-first)
  const storeCollections = useDataStore((state) => state.collections);
  const collections = propCollections ?? storeCollections;

  // No loading state needed - data is already available
  const pawkits = useMemo(() => flattenPawkits(collections), [collections]);
  // ... render immediately
}
```

**Files Changed**:
- `components/modals/move-to-pawkit-modal.tsx`

**Key Insight**:
- Pawkit uses local-first architecture
- Collections are synced to Zustand store on app load
- Use `useDataStore((state) => state.collections)` for instant access
- Only fetch from API for data not already in store

**How to Avoid**:
- Check if data exists in local store before fetching
- Modals should read from store, not fetch
- Reserve API calls for initial sync and mutations

---

### 34. Optimistic Updates Pattern

**Date**: November 25, 2025
**Severity**: 🟢 Low (Pattern Documentation)
**Category**: UX, Local-First Architecture
**Status**: ✅ Documented

**Issue**: User perceived 4-5 second delay after selecting a Pawkit in modal.

**Symptom**:
```
1. User clicks "Add to Pawkit" in Rediscover
2. User selects a Pawkit from modal
3. 4-5 second delay while card updates
4. THEN next card appears
5. Feels sluggish
```

**Root Cause**:
- Handler was awaiting the updateCard call before advancing UI
- updateCard syncs to server, which takes time
- UI blocked on network operation

**What Failed**:
```tsx
// ❌ WRONG: Blocking on server sync
const handlePawkitSelected = async (slug: string) => {
  if (!pendingPawkitCard) return;

  setShowPawkitModal(false);
  setPendingPawkitCard(null);

  // Wait for server sync (4-5 seconds)
  await useDataStore.getState().updateCard(pendingPawkitCard.id, {
    collections: [...currentCollections, slug]
  });

  // THEN advance (too late!)
  rediscoverStore.setCurrentIndex(rediscoverStore.currentIndex + 1);
};
```

**Solution - Optimistic Update Pattern**:
```tsx
// ✅ CORRECT: Advance UI first, sync in background
const handlePawkitSelected = (slug: string) => {  // No async!
  if (!pendingPawkitCard) return;

  // 1. Close modal and advance FIRST (optimistic - instant)
  setShowPawkitModal(false);
  const cardToUpdate = pendingPawkitCard;  // Capture reference
  setPendingPawkitCard(null);
  rediscoverStore.updateStats("addedToPawkit");
  rediscoverStore.setCurrentIndex(rediscoverStore.currentIndex + 1);

  // 2. Then update card in background (local-first, syncs later)
  const currentCollections = cardToUpdate.collections || [];
  if (!currentCollections.includes(slug)) {
    useDataStore.getState().updateCard(cardToUpdate.id, {
      collections: [...currentCollections, slug]
    });  // No await!
  }
};
```

**Key Pattern**:
1. **Capture data** needed for background operation
2. **Update UI immediately** (optimistic)
3. **Fire-and-forget** the async operation
4. Local-first store handles sync automatically

**Files Changed**:
- `app/(dashboard)/library/page.tsx`

**When to Use Optimistic Updates**:
- User expects immediate feedback
- Operation will almost always succeed
- Server sync can happen in background
- Local store can reconcile later if needed

**When NOT to Use**:
- Operation might fail and needs user attention
- Need to show server-generated data (like new IDs)
- Critical operations that must be confirmed

---

### 35. Card Modal Has TWO Tab Systems - One is Disabled

**Date**: November 26, 2025
**Severity**: 🔴 High (UI Not Appearing)
**Category**: Architecture, Modal Design
**Status**: ✅ Documented

**Issue**: Adding UI to the card modal's vertical sidebar tabs doesn't work because that sidebar is disabled with `{false && ...}`.

**Symptom**:
```
1. Add new tab to vertical sidebar in card-detail-modal.tsx
2. Component renders in code but doesn't appear in UI
3. No errors, just missing UI
4. Hours spent debugging "why isn't my tab showing?"
```

**Root Cause**:
The card detail modal has TWO separate tab systems:
1. **Disabled vertical sidebar** (wrapped in `{false && ...}`) - DO NOT USE
2. **Active bottom bar** using `bottomTabMode` state - USE THIS

**What Failed**:
```tsx
// ❌ WRONG: Adding to disabled sidebar (this code is wrapped in {false && ...})
{/* Vertical Tabs Sidebar - DISABLED */}
{false && (
  <div className="sidebar">
    <TabsTrigger value="preview">Preview</TabsTrigger>
    <TabsTrigger value="reader">Reader</TabsTrigger>
    <TabsTrigger value="attachments">Attachments</TabsTrigger>  {/* Won't appear! */}
  </div>
)}
```

**The Fix - Use Bottom Tab Bar**:
```tsx
// ✅ CORRECT: Use bottomTabMode state with Button components
const [bottomTabMode, setBottomTabMode] = useState<'preview' | 'reader' | 'metadata' | 'attachments'>('preview');

// In the bottom bar section:
<div className="flex gap-2">
  <Button
    onClick={() => setBottomTabMode('preview')}
    variant={bottomTabMode === 'preview' ? 'default' : 'ghost'}
  >
    Preview
  </Button>
  <Button
    onClick={() => setBottomTabMode('attachments')}
    variant={bottomTabMode === 'attachments' ? 'default' : 'ghost'}
  >
    <Paperclip size={16} />
    Attachments
  </Button>
</div>

// Content area:
{bottomTabMode === 'preview' && <PreviewContent />}
{bottomTabMode === 'attachments' && <AttachmentsTabContent cardId={card.id} />}
```

**Key Pattern**:
1. Bottom bar uses `bottomTabMode` state (string union type)
2. Uses `Button` components with variant switching, NOT Radix Tabs
3. Content rendered conditionally based on `bottomTabMode` value
4. Add new mode to type union: `'preview' | 'reader' | 'metadata' | 'attachments'`

**Files**:
- `components/modals/card-detail-modal.tsx` - Search for `bottomTabMode` state

**How to Avoid**:
- **NEVER** add tabs to the `{false && ...}` wrapped sidebar
- **ALWAYS** search for `bottomTabMode` when adding modal tabs
- Look for the pattern: `setBottomTabMode('tabname')` in onClick handlers
- Check for Button components with `variant={bottomTabMode === 'x' ? 'default' : 'ghost'}`

---

### 36. URL Pill Icon Styling - Text Must Stay Centered

**Date**: November 26, 2025
**Severity**: 🟡 Medium (UI Broken)
**Category**: Styling, CSS
**Status**: ✅ Documented

**Issue**: Adding icons to URL pills affects text positioning, making pills look broken.

**Symptom**:
```
1. Add paperclip icon to URL pill using flex
2. Pills become massive or text is off-center
3. Different URL lengths cause inconsistent appearance
```

**What Failed**:
```tsx
// ❌ WRONG: Flex pushes text off-center
<a className="px-3 py-1.5 rounded-full bg-black/40 ...">
  <span className="flex items-center justify-center gap-1.5">
    <span className="truncate">{hostname}</span>
    {hasAttachments && <Paperclip className="w-3 h-3" />}  {/* Affects centering! */}
  </span>
</a>

// ❌ WRONG: Block makes pill full-width
<a className="block text-center ...">
  {hostname}
  {hasAttachments && <Paperclip className="w-3 h-3" />}
</a>
```

**The Fix - Absolute Positioning**:
```tsx
// ✅ CORRECT: Icon on separate layer, doesn't affect text
<a className="absolute bottom-2 left-8 right-8 px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-xs text-white hover:bg-black/60 transition-colors">
  {/* Text always centered */}
  <span className="block text-center truncate">
    {hostname}
  </span>
  {/* Icon floats on right, separate layer */}
  {hasAttachments && (
    <Paperclip className="w-3 h-3 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2" />
  )}
</a>
```

**Key Pattern**:
1. Text uses `block text-center truncate` - always centered
2. Icon uses `absolute right-2.5 top-1/2 -translate-y-1/2` - fixed position
3. Icon doesn't affect text layout (separate layer)
4. Long URLs can truncate and pass "behind" the icon
5. Pill size/shape stays consistent regardless of URL length

**Files**:
- `components/library/card-gallery.tsx` - All URL pill overlays

**Where Used**:
- Grid view URL pills
- List view URL pills
- Masonry view URL pills
- Compact view URL pills

**When to Apply**:
- Adding indicators to fixed-size UI elements
- Icons that shouldn't push/shift text
- Badges or status indicators on pills/buttons

---

### 37. Hidden vs Invisible CSS Classes - Tab Content Disappearing

**Date**: November 26, 2025
**Severity**: 🟡 Medium (UI Broken)
**Category**: CSS, Layout
**Status**: ✅ Fixed

**Issue**: Using `hidden` class instead of `invisible` causes sibling elements to collapse, making entire tab content areas disappear.

**Symptom**:
```
1. Card detail modal has multiple tabs (Preview, Reader, Metadata)
2. When non-Preview tab is active, content area shows empty
3. Entire tab container appears to have zero height
```

**Root Cause**:
```css
/* hidden = display: none */
.hidden { display: none; }
/* Removes element from layout flow entirely */

/* invisible = visibility: hidden */
.invisible { visibility: hidden; }
/* Element still takes up space but is not visible */
```

**What Failed**:
```tsx
// ❌ WRONG: hidden removes from layout, parent collapses
<div className={bottomTabMode === 'preview' ? '' : 'hidden'}>
  <PreviewContent />  {/* When hidden, parent height = 0 */}
</div>
<div>
  {bottomTabMode === 'reader' && <ReaderContent />}  {/* Shows but in collapsed container */}
</div>
```

**The Fix**:
```tsx
// ✅ CORRECT: invisible preserves layout space
<div className={bottomTabMode === 'preview' ? '' : 'invisible'}>
  <PreviewContent />  {/* Still occupies space when invisible */}
</div>
<div>
  {bottomTabMode === 'reader' && <ReaderContent />}  {/* Shows in properly sized container */}
</div>
```

**When to Use Each**:
| Class | Effect | Use When |
|-------|--------|----------|
| `hidden` | `display: none` | Completely remove from layout (dropdowns, modals) |
| `invisible` | `visibility: hidden` | Keep space reserved (tabs, carousels) |

**Files**:
- `components/modals/card-detail-modal.tsx` - Tab content visibility

**Prevention**:
- Use `invisible` when sibling content needs the space to render correctly
- Use `hidden` only when you want layout reflow
- Test tab switching with different content heights

---

### 38. Panel Store close() Clears activeCardId - Modal Unmounts

**Date**: November 26, 2025
**Severity**: 🔴 High (Feature Broken)
**Category**: State Management, Zustand
**Status**: ✅ Fixed

**Issue**: Calling panel store's `close()` function to hide the sidebar also clears `activeCardId`, causing modals that depend on it to unmount.

**Symptom**:
```
1. Open a PDF in card detail modal
2. Click "Reader" tab to enter fullscreen reader mode
3. Modal closes instead of expanding to fullscreen
4. Both sidebars close but no reader content shows
```

**Root Cause**:
The `close()` function in `use-panel-store.ts` resets multiple state values:
```typescript
close: () => {
  set({
    isOpen: false,
    contentType: "closed",
    activeCardId: null,  // ← This unmounts the modal!
    // ...
  });
},
```

When `activeCardId` becomes `null`, any component with `if (!activeCardId) return null` unmounts.

**What Failed**:
```typescript
// ❌ WRONG: Using close() to hide panel during reader mode
const closePanel = usePanelStore((state) => state.close);

const handleEnterReaderMode = () => {
  closePanel();  // ← Clears activeCardId, unmounts modal!
  setIsReaderExpanded(true);
};
```

**The Fix - Add hide/show Functions**:
```typescript
// In use-panel-store.ts, add new functions that ONLY toggle visibility:
hideRight: () => {
  set({ isOpen: false });  // Only changes isOpen, preserves activeCardId
},

showRight: () => {
  set({ isOpen: true });
},

// ✅ CORRECT: Use hideRight() instead of close()
const hideRightPanel = usePanelStore((state) => state.hideRight);

const handleEnterReaderMode = () => {
  hideRightPanel();  // ← Only hides panel, keeps activeCardId
  setIsReaderExpanded(true);
};
```

**Rule**:
| Function | Use When |
|----------|----------|
| `close()` | User explicitly closes panel (X button, toggle) |
| `hideRight()` | Temporarily hiding panel while keeping modal context |

**Files Modified**:
- `lib/hooks/use-panel-store.ts` - Added `hideRight()`/`showRight()` functions
- `components/modals/card-detail-modal.tsx` - Use hideRight for reader mode

**Prevention**:
- Always check what state a store function modifies before using it
- If you need to hide UI without losing context, add targeted visibility functions
- Don't reuse general-purpose functions for specialized use cases

---

## Debugging Strategies

### When API Returns 500 Error

**Step 1: Check Server Logs**
```bash
# Development
npm run dev
# Look for error stack traces in console

# Production (Vercel)
vercel logs
# Look for function invocation errors
```

**Step 2: Common Causes**
1. **Variable scope issue** - Check if variables are declared outside try block
2. **Schema mismatch** - Check for `deleted` field usage (should be `deletedAt`)
3. **Missing CORS headers** - Add `getCorsHeaders(request)` to response
4. **Prisma error** - Check for invalid field names, missing relations
5. **Auth failure** - Check if `getServerUser()` is returning null

**Step 3: Add Detailed Logging**
```tsx
export async function POST(request: Request) {
  let user: User | null = null;
  let body: any = null;

  try {
    console.log('[POST /api/cards] Starting request');

    user = await getServerUser(request);
    console.log('[POST /api/cards] User:', user?.id);

    body = await request.json();
    console.log('[POST /api/cards] Body:', JSON.stringify(body));

    const result = await processRequest(body);
    console.log('[POST /api/cards] Result:', result.id);

    return NextResponse.json({ success: true, data: result }, { status: 200 });
  } catch (error) {
    console.error('[POST /api/cards] Error for user:', user?.id);
    console.error('[POST /api/cards] Body:', JSON.stringify(body));
    console.error('[POST /api/cards] Error:', error);

    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'An error occurred' } },
      { status: 500 }
    );
  }
}
```

**Step 4: Test in Isolation**
```bash
# Test API route directly
curl -X POST http://localhost:3000/api/cards \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"title":"Test","url":"https://example.com"}'
```

---

### When Sync Fails

**Step 1: Check Sync Queue**
```tsx
// Open browser console on any page
import { useSyncStore } from '@/stores/syncStore';

// Check queue status
const queue = useSyncStore.getState().queue;
console.log('Sync queue:', queue);

// Check if sync is running
const isSyncing = useSyncStore.getState().isSyncing;
console.log('Is syncing:', isSyncing);

// Check failed operations
const failed = queue.filter(op => op.status === 'failed');
console.log('Failed operations:', failed);
```

**Step 2: Common Causes**
1. **Network offline** - Check `navigator.onLine` status
2. **Auth expired** - Check if token is valid
3. **Server error** - Check API logs for 500 errors
4. **Conflict** - Check for concurrent edits from multiple tabs
5. **Rate limiting** - Check if too many requests sent
6. **Invalid data** - Check Zod validation errors

**Step 3: Manual Retry**
```tsx
// Retry all failed operations
import { useSyncStore } from '@/stores/syncStore';

const failed = useSyncStore.getState().queue.filter(op => op.status === 'failed');
for (const op of failed) {
  useSyncStore.getState().retry(op.id);
}
```

**Step 4: Check IndexedDB**
```tsx
// Verify local data integrity
import { getAllCards } from '@/lib/db/cards';

const cards = await getAllCards();
console.log('Total cards in IndexedDB:', cards.length);

// Check for cards pending sync
const pending = cards.filter(card => card.needsSync);
console.log('Cards pending sync:', pending.length);
```

**Step 5: Force Full Sync**
```tsx
// Clear queue and sync everything
import { useSyncStore } from '@/stores/syncStore';

useSyncStore.getState().clearQueue();
useSyncStore.getState().syncAll();
```

---

### When Performance Degrades

**Step 1: Use React DevTools Profiler**
```bash
# Install React DevTools extension
# Open DevTools > Profiler tab
# Record interaction
# Look for:
# - Components rendering >50ms
# - Excessive re-renders
# - Large commit times
```

**Step 2: Check IndexedDB Performance**
```tsx
// Measure IndexedDB operation time
console.time('getCards');
const cards = await getAllCards();
console.timeEnd('getCards');
// Should be <100ms for 1000 cards

console.time('searchCards');
const results = await searchCards('query');
console.timeEnd('searchCards');
// Should be <50ms for search
```

**Step 3: Common Causes**
1. **Missing debounce** - Check text inputs for debouncing
2. **Excessive re-renders** - Check for missing React.memo
3. **No virtualization** - Check long lists for virtualization
4. **Missing indexes** - Check IndexedDB indexes exist
5. **Large bundle** - Check for unnecessary imports
6. **Memory leak** - Check for missing cleanup in useEffect

**Step 4: Profile Network**
```bash
# Open DevTools > Network tab
# Look for:
# - Slow API responses (>500ms)
# - Failed requests
# - Large payloads (>100kb)
# - Too many requests (>10 per action)
```

**Step 5: Check Memory Usage**
```bash
# Open DevTools > Memory tab
# Take heap snapshot
# Look for:
# - Large objects (>1MB)
# - Retained objects (detached DOM)
# - Memory leaks (increasing over time)
```

**Performance Targets**:
- Initial load: <2 seconds
- Search 1000 cards: <100ms
- Background sync: <5 seconds
- Scroll 60fps (16.67ms per frame)
- IndexedDB read: <50ms
- IndexedDB write: <100ms

**See**: `.claude/skills/pawkit-performance/SKILL.md` for optimization patterns

---

## How to Add New Issues

When you fix a bug that took significant time to debug, add it to this document.

### Issue Format

```markdown
### N. Issue Title (Short, Descriptive)

**Issue**: One sentence describing what went wrong.

**What Failed**:
```tsx
// ❌ WRONG: Show the buggy code
// Include comments explaining why it's wrong
```

**The Fix**:
```tsx
// ✅ CORRECT: Show the fixed code
// Include comments explaining why it's correct
```

**How to Avoid**:
- Bullet points with prevention tips
- Pattern to follow
- Where to check
- What to test

**Impact**: When was this fixed, how widespread was it

**See**: Link to related skill or documentation
```

### When to Add

Add new issues when:
- **Debugging took >30 minutes** - Significant time investment
- **Issue affected multiple routes** - Widespread problem
- **Caused production errors** - User-facing impact
- **Common pitfall** - Easy to repeat mistake
- **Pattern emerged** - New standard identified

### Don't Add

Don't add issues that are:
- **One-off typos** - Not systematic problems
- **Environment-specific** - Local setup issues
- **Already documented** - Duplicates existing entries
- **Too specific** - Won't help others

### Maintenance Tasks

After adding a new issue:
1. ✅ Add to table of contents if new category
2. ✅ Update related skills with cross-references
3. ✅ Add to deployment checklist if relevant
4. ✅ Update test suite to catch the issue
5. ✅ Share with team if widespread

---

## Maintenance

### Quarterly Review (Every 3 Months)

**Tasks**:
1. **Remove Resolved Issues**
   - Check if issue still exists in codebase
   - Remove if fully resolved and prevented
   - Archive to historical document if needed

2. **Update Examples**
   - Ensure code examples are current
   - Update file paths if structure changed
   - Fix any deprecated patterns

3. **Add New Categories**
   - Review recent bug fixes
   - Identify new patterns
   - Create new sections if needed

4. **Cross-Reference Skills**
   - Ensure links to other skills are current
   - Add new cross-references
   - Remove broken links

5. **Verify Fixes**
   - Test that documented fixes still work
   - Update if better solutions found
   - Add warnings if issues resurface

### Monthly Check (Every Month)

**Quick Tasks**:
- [ ] Add any significant bugs fixed this month
- [ ] Update examples if code structure changed
- [ ] Remove issues that are no longer relevant
- [ ] Add cross-references to new skills

### After Major Deployments

**Immediate Tasks**:
- [ ] Document any new issues discovered
- [ ] Update migration timing if fields added/removed
- [ ] Add deployment-specific problems
- [ ] Update performance benchmarks

---

### 39. Filen Direct Upload - Files Corrupted After Upload

**Date**: November 29, 2025
**Severity**: Critical
**Component**: File sync / Filen integration

**Symptom**: Files upload to Filen successfully (appear in folder with correct name) but cannot be downloaded or viewed - they're corrupted.

**Root Cause**: Encryption key format mismatch between our implementation and Filen SDK.

**What Failed**:
```typescript
// ❌ WRONG: Using hex-encoded key
const encryptionKey = generateRandomHex(32);  // "a1b2c3d4e5f6..." (64 hex chars)
const keyBytes = hexToBuffer(encryptionKey);  // Decoded to 32 bytes
```

**What Worked**:
```typescript
// ✅ CORRECT: Using alphanumeric string as UTF-8
const encryptionKey = generateRandomString(32);  // "aBc123XyZ..." (32 chars)
const keyBytes = new TextEncoder().encode(encryptionKey);  // 32 UTF-8 bytes
```

**Why**: Filen SDK uses `Buffer.from(key, "utf-8")` to convert the key string to bytes. It treats the key as a literal UTF-8 string, not as hex. The key stored in file metadata is the raw 32-char string.

**Prevention**:
- When reverse-engineering crypto protocols, pay attention to encoding (UTF-8 vs hex vs base64)
- Test file decryption immediately after implementing encryption
- The encryption key format in metadata must match what the decryptor expects

**Files Changed**:
- `lib/services/filen-direct.ts` - Changed key generation and usage

**Related**: See sync-patterns skill "FILEN DIRECT UPLOAD" section for full implementation details.

---

### 40. Filen API - api.filen.io Does Not Exist

**Date**: November 29, 2025
**Severity**: High
**Component**: File sync / Filen integration

**Symptom**: `ERR_NAME_NOT_RESOLVED` when calling Filen API endpoints.

**Root Cause**: Documentation and some examples reference `api.filen.io` but this domain doesn't exist (NXDOMAIN).

**What Failed**:
```typescript
// ❌ WRONG: Domain doesn't exist
const response = await fetch("https://api.filen.io/v3/upload/done", { ... });
// Error: getaddrinfo ENOTFOUND api.filen.io
```

**What Worked**:
```typescript
// ✅ CORRECT: Use gateway.filen.io
const response = await fetch("https://gateway.filen.io/v3/upload/done", { ... });
```

**Filen API Endpoints**:
| Endpoint | Purpose | CORS |
|----------|---------|------|
| `ingest.filen.io` | Chunk uploads | ✅ Yes |
| `gateway.filen.io` | All other API calls | ❌ No |
| `api.filen.io` | **DOES NOT EXIST** | N/A |

**Prevention**:
- Always verify API endpoints actually resolve before implementing
- When documentation is unclear, check actual SDK source code
- Test DNS resolution: `nslookup api.filen.io` → NXDOMAIN

**Files Changed**:
- `lib/services/filen-direct.ts`
- `app/api/filen/upload-done/route.ts`

---

## Issue Categories Quick Reference

**API Routes**:
- Variable scope in try-catch
- Missing CORS headers
- PATCH vs PUT
- Status code standards

**Database**:
- Schema field mismatches (`deleted` vs `deletedAt`)
- Migration timing
- Prisma query errors
- Index missing
- Deduplication logic

**Sync**:
- Multi-session conflicts
- Queue failures
- Retry logic
- Offline handling

**Performance**:
- Missing debounce
- Excessive re-renders
- No virtualization
- IndexedDB optimization
- Browser-specific rendering (Chromium flickering)

**UI/UX**:
- Context menu z-index issues
- asChild prop with complex components
- Event propagation (ESC key handling)
- Modal state management
- Window.prompt() vs custom modals
- Visual consistency (glassmorphism)

**Security**:
- Auth failures
- IDOR vulnerabilities
- Information disclosure
- Privacy rule violations

**Browser Extension**:
- Collections use slugs not IDs
- URL patterns: `/pawkits/{slug}` not `/p/{slug}`
- Tab reuse for existing Pawkit tabs
- Content script injection patterns

---

## Related Skills

- **API Patterns**: `.claude/skills/pawkit-api-patterns/SKILL.md`
- **Sync Patterns**: `.claude/skills/pawkit-sync-patterns/SKILL.md`
- **Performance**: `.claude/skills/pawkit-performance/SKILL.md`
- **Security**: `.claude/skills/pawkit-security/SKILL.md`
- **Migrations**: `.claude/skills/pawkit-migrations/SKILL.md`
- **Testing**: `.claude/skills/pawkit-testing/SKILL.md`

---

## Quick Links

- **Check First**: Known Issues section
- **Add Issue**: How to Add New Issues section
- **Debug API**: When API Returns 500 Error
- **Debug Sync**: When Sync Fails
- **Debug Performance**: When Performance Degrades
- **Review**: Quarterly Maintenance checklist

---

**Last Updated**: November 29, 2025 (Added Issues #39-40: Filen Direct Upload encryption key format, api.filen.io DNS)
**Next Review**: April 2025 (Quarterly)

**This is a living document. Keep it current!**
