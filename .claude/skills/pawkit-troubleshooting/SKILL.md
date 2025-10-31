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
   - Duplicate Card Issue - Deleted Cards Returned
   - Deleted Cards Appearing in Library View
   - Deduplication Corrupting Data
   - Deduplication Removing Legitimate Server Cards
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

**Last Updated**: October 31, 2025 (Added context menu issues)
**Next Review**: January 2026 (Quarterly)

**This is a living document. Keep it current!**
