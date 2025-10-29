# Pawkit Troubleshooting Guide

**A living document of issues encountered, their fixes, and prevention patterns**

---

## Table of Contents

1. [How to Use This Document](#how-to-use-this-document)
2. [Known Issues & Fixes](#known-issues--fixes)
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

**Last Updated**: October 2025 (Initial creation)
**Next Review**: January 2026 (Quarterly)

**This is a living document. Keep it current!**
