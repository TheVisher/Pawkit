---
name: pawkit-project-context
description: Track development progress, major milestones, and session history across sessions
---

# Pawkit Project Context & Session History

**Purpose**: Track development progress, major milestones, and session history to maintain context across development sessions.

---

## Current Status

**Branch**: `main`
**Status**: Multi-provider cloud sync complete - Filen AND Google Drive both working
**Last Updated**: December 3, 2025
**Next Steps**: Dropbox integration, OneDrive integration, onboarding improvements

---

## Security

**Audit Completed**: December 3, 2025
**Documentation**: `/SECURITY_AUDIT_2025-12-03.md`

### Current Security Posture

| Area | Status |
|------|--------|
| API Authentication | ✅ All routes protected |
| Rate Limiting | ✅ All write endpoints + Filen auth + GET endpoints |
| File Uploads | ✅ Magic byte validation, 50MB limit, filename sanitization |
| Supabase RLS | ✅ All user data tables have row-level security |
| Sessions | ✅ Extension tokens invalidated on logout |
| Security Headers | ✅ CSP, CORS, HSTS, X-Frame-Options configured |
| Input Validation | ✅ XSS/SSRF protection, Zod schemas on key routes |

### Remaining Items

- **4 upstream vulnerabilities in `@filen/sdk`** (axios, elliptic) - monitoring for SDK updates
- Optional: "Clear local data" on logout (LOW priority)
- Optional: IndexedDB encryption (LOW priority)

### Key Security Files

- `middleware.ts` - CORS, auth middleware
- `next.config.js` - Security headers (CSP, HSTS, etc.)
- `lib/utils/rate-limit.ts` - Rate limiting implementation
- `lib/utils/crypto.ts` - AES-256-GCM encryption for credentials
- `app/api/filen/files/route.ts` - File upload validation

---

## Session History

### Date: November 30, 2025 - Google Drive Integration Complete

**Status**: ✅ COMPLETED
**Priority**: ⚡ FEATURE MILESTONE
**Branch**: `main`
**Impact**: Users can now sync to Google Drive alongside Filen for backup redundancy

**Summary**: Implemented Google Drive as a second cloud storage provider. Both Filen and Google Drive now sync in parallel - when a user connects both, all files sync to both providers independently. Created comprehensive `pawkit-cloud-providers` skill documenting how to add future providers.

#### Key Implementation Details

**1. Google Drive Provider**
- OAuth 2.0 authentication flow
- HTTP-only cookie for token storage (`gdrive-token`)
- Full folder structure matching Filen (`/Pawkit/_Notes`, `_Images`, etc.)
- Files: `lib/services/google-drive/gdrive-provider.ts`, `oauth.ts`

**2. Multi-Provider Sync Architecture**
- Modified sync scheduler to iterate ALL connected providers
- Each dirty item syncs to each connected provider
- Independent success/failure tracking per provider
- File: `lib/services/cloud-storage/sync-scheduler.ts`

**3. Multi-Provider Deletion**
- Notes: Delete from both Filen and Google Drive in `data-store.ts`
- Files: Delete from both providers in `file-store.ts`
- Google Drive deletes by filename lookup (no stored cloud ID)

**4. OAuth Routes**
- `app/api/auth/gdrive/route.ts` - Start OAuth flow
- `app/api/auth/gdrive/callback/route.ts` - Handle OAuth callback
- `app/api/auth/gdrive/status/route.ts` - Check connection status
- `app/api/auth/gdrive/token/route.ts` - Get access token
- `app/api/auth/gdrive/disconnect/route.ts` - Clear tokens

**5. UI Integration**
- Added Google Drive connector in `connectors-section.tsx`
- Added Google Drive connector in `profile-modal.tsx`
- Shows connected email and disconnect button

#### Issues Fixed

- **400 Bad Request**: Filenames with special characters needed URL encoding
- **Filen sync broken**: Changed path format from `_Notes` back to `/Pawkit/_Notes`
- **Missing import**: Added `useConnectorStore` import to `data-store.ts`

#### Documentation Created

- Created `pawkit-cloud-providers` skill with complete guide for adding new providers
- Updated `pawkit-sync-patterns` skill with multi-provider section

---

### Date: November 27, 2025 - Filen Cloud Storage Integration Phase 2

**Status**: ✅ COMPLETED
**Priority**: ⚡ FEATURE MILESTONE
**Branch**: `feature/filen-integration` → merged to `main`
**Impact**: Files now sync to Filen cloud storage with encrypted session persistence

**Summary**: Completed Filen integration Phase 2 with file upload/download/list APIs, encrypted session cookie storage, and sync status UI indicators. Solved multiple technical challenges including serverless crypto compatibility, 2FA session tokens, and cookie size limits.

#### 1. Server-Side Encryption Utilities

**Feature**: AES-256-GCM encryption with gzip compression for secure cookie storage.

**Files Created**:
- `lib/utils/crypto.ts` - Encryption utilities

**Key Implementation**:
```typescript
// Uses Node.js crypto (not Web Crypto API) for serverless compatibility
import { createCipheriv, createDecipheriv, randomBytes } from "crypto";
import { gzipSync, gunzipSync } from "zlib";

export function encrypt(text: string): string {
  const compressed = gzipSync(Buffer.from(text, "utf8"));
  const iv = randomBytes(16);
  const cipher = createCipheriv("aes-256-gcm", getSecretKey(), iv);
  const encrypted = Buffer.concat([cipher.update(compressed), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString("base64")}:${authTag.toString("base64")}:${encrypted.toString("base64")}`;
}
```

**Why Node.js crypto instead of Web Crypto API**: Web Crypto API is async and doesn't work reliably in serverless environments (Vercel Edge).

#### 2. Filen API Routes

**Feature**: RESTful API endpoints for Filen file operations.

**Files Created**:
- `app/api/filen/auth/route.ts` - Login/logout/status endpoints
- `app/api/filen/files/route.ts` - Upload and list files
- `app/api/filen/files/[uuid]/route.ts` - Download and delete files
- `lib/services/filen-server.ts` - Server-side SDK helpers

**Key Pattern - Session Token Storage (not credentials)**:
```typescript
// For 2FA accounts, store session tokens instead of email/password
interface FilenSession {
  email: string;
  apiKey: string;
  masterKeys: string[];  // Only first key needed
  userId: number;
  baseFolderUUID: string;
  authVersion: 1 | 2 | 3;
  privateKey: string;    // Required for HMAC file encryption
}

// Restore session without calling login()
const filen = new FilenSDK({
  apiKey: session.apiKey,
  masterKeys: session.masterKeys,
  userId: session.userId,
  // ... other config
});
```

**Why session tokens**: 2FA accounts require a fresh code on every login. By storing the authenticated session tokens, users only need to enter 2FA once.

#### 3. Sync Status UI Indicators

**Feature**: Visual indicators showing file sync status.

**Files Created**:
- `components/files/sync-status-badge.tsx` - Badge and icon components

**Files Modified**:
- `components/files/file-card.tsx` - Added sync status badges to file cards

**Status Types**:
- `local` - CloudOff icon, gray (local only)
- `synced` - Check icon, green (fully synced)
- `uploading` - Upload icon, blue + pulse animation
- `downloading` - Download icon, blue + pulse animation
- `cloud-only` - Cloud icon, purple (ghost file)
- `error` - AlertCircle icon, red

#### 4. Cookie Size Optimization

**Problem**: Encrypted Filen session exceeded 4KB cookie limit.

**Solutions Applied**:
1. **Gzip compression** - Reduced size by ~60%
2. **Base64 encoding** - 33% smaller than hex
3. **Minimal fields** - Removed publicKey, kept only first masterKey

**Final Session Size**: ~2.8KB (under 4KB limit)

#### 5. Bug Fixes and Technical Challenges

**Next.js Route Export Error**:
- Issue: `getFilenClient is not a valid Route export field`
- Fix: Moved helper functions from route file to `lib/services/filen-server.ts`
- Lesson: Next.js route files can only export HTTP methods (GET, POST, etc.)

**401 Authentication Error**:
- Issue: Web Crypto API async functions failing in serverless
- Fix: Rewrote to use Node.js `crypto` module with synchronous functions

**Cookie Not Persisting**:
- Issue: Using `cookies()` helper instead of `NextResponse.cookies.set()`
- Fix: Use NextResponse for reliable cookie setting, changed sameSite from 'strict' to 'lax'

**Upload Failed - Missing privateKey**:
- Issue: "No private key set for HMAC key generation"
- Fix: Added privateKey back to session (required for file encryption)

**TypeScript Null Check Errors**:
- Issue: `file.blob` is possibly null (new ghost file type)
- Fix: Capture blob in local variable before async operations

#### Files Modified Summary

**New Files (6)**:
- `lib/utils/crypto.ts`
- `lib/services/filen-server.ts`
- `app/api/filen/auth/route.ts`
- `app/api/filen/files/route.ts`
- `app/api/filen/files/[uuid]/route.ts`
- `components/files/sync-status-badge.tsx`

**Modified Files (4)**:
- `components/files/file-card.tsx`
- `components/files/pdf-metadata-view.tsx`
- `components/files/pdf-reader-view.tsx`
- `lib/types/index.ts` (StoredFile.blob now nullable)

#### Merge Stats

```
22 files changed, 3724 insertions(+), 112 deletions(-)
```

---

### Date: November 26, 2025 - File Attachments Feature Complete

**Status**: ✅ COMPLETED
**Priority**: ⚡ FEATURE MILESTONE
**Branch**: `feature/file-attachments` → merged to `main`
**Impact**: Full PDF viewing experience with reader mode and professional UX

**Summary**: Completed and merged the file attachments feature with focus on PDF viewing. Added fullscreen reader mode, zoom controls, and fixed multiple UX bugs.

#### 1. PDF Reader Mode with Fullscreen Expansion

**Feature**: Fullscreen reader mode for distraction-free PDF reading.

**Implementation**:
- Reader tab in card detail modal expands to fullscreen
- Auto-hides both left and right panels when entering reader mode
- Restores panel state when exiting
- Floating exit button (X) in top-right corner
- Keyboard shortcut: Escape to exit

**Files Modified**:
- `components/modals/card-detail-modal.tsx` - Added panel state management for reader mode
- `lib/hooks/use-panel-store.ts` - Added `hideRight()`/`showRight()` functions

**Key Pattern - Preserve activeCardId**:
```typescript
// DON'T use close() - it clears activeCardId and unmounts modal
closePanel(); // ❌ Wrong - unmounts the modal

// DO use hideRight() - only toggles visibility
hideRight(); // ✅ Correct - preserves activeCardId
```

#### 2. PDF Zoom Controls

**Feature**: Floating zoom bar with keyboard shortcuts.

**Implementation**:
- Floating control bar at bottom center (only in expanded mode)
- Zoom range: 50% to 200% in 25% increments
- Page counter display (e.g., "3/12")
- Keyboard shortcuts: `+`/`-` for zoom, `0` for reset

**Technical**:
```typescript
// Transform scale applied to each page
style={isExpanded ? {
  transform: `scale(${zoom})`,
  transformOrigin: 'top center',
  marginBottom: zoom > 1 ? `${(zoom - 1) * 100}%` : undefined,
} : undefined}
```

**Files Modified**:
- `components/files/pdf-reader-view.tsx`

#### 3. PDF Metadata Layout Consistency

**Problem**: PDF metadata view had different layout from URL card metadata.

**Solution**: Rewrote layout to match URL card style:
- Simple key-value rows with border separator
- Wider container (max-w-3xl)
- No icons, cleaner visual hierarchy
- Consistent text styling

**Files Modified**:
- `components/files/pdf-metadata-view.tsx`

#### 4. Bug Fixes

**Reader/Metadata Tabs Showing Empty**:
- Issue: Used `hidden` class on Preview tab, causing parent to collapse
- Fix: Changed to `invisible` class (preserves layout space)
- Lesson: `hidden` = `display: none`, `invisible` = `visibility: hidden`

**Reader Mode Closing Modal Instead of Expanding**:
- Issue: `close()` function cleared `activeCardId`, unmounting modal
- Fix: Added `hideRight()`/`showRight()` functions that only toggle `isOpen`

**Files Modified**:
- `components/modals/card-detail-modal.tsx`
- `lib/hooks/use-panel-store.ts`

---

### Date: November 25, 2025 - Rediscover Mode Enhancements + Sidebar UX

**Status**: ✅ COMPLETED
**Priority**: ⚡ UX IMPROVEMENT
**Branch**: `main`
**Impact**: Rediscover is now discoverable, fast, and feature-complete; pinned notes easier to manage

**Summary**: Major improvements to the Rediscover feature including sidebar placement, new "Add to Pawkit" action, multiple bug fixes, and added unpin context menu for pinned notes.

#### 5. Pinned Notes Unpin Context Menu

**Problem**: To unpin a note from the sidebar, users had to navigate to the card in Library view and unpin from there.

**Solution**: Added right-click context menu to pinned notes in sidebar with "Unpin from sidebar" option.

**Implementation**:
- Added `PinOff` icon import from lucide-react
- Added `unpinNote` from settings store
- Wrapped `SortablePinnedNote` component with `GenericContextMenu`
- Single menu item: "Unpin from sidebar" with PinOff icon

**Files Modified**:
- `components/navigation/left-navigation-panel.tsx`

**Impact**: Users can now quickly unpin notes directly from the sidebar via right-click.

#### 1. Ultrawide Monitor Bug Fix

**Problem**: Cards appeared empty/black on 3440x1440 monitors when right sidebar was anchored (Chrome GPU issue).

**Root Cause**: `backdrop-filter: blur()` on content panel caused GPU memory overflow in Chrome.

**Solution**: Disabled backdrop blur on content panel when `isRightEmbedded` is true:
```typescript
className={cn(
  "...",
  !isRightEmbedded && "backdrop-blur-sm"
)}
```

**Files Modified**:
- `components/panels/content-panel.tsx`

#### 2. Rediscover Discoverability

**Problem**: Users couldn't find the Rediscover feature hidden behind Library header button.

**Solution**:
- Added Rediscover nav item to left sidebar after Calendar in HOME section
- Added Sparkles icon and uncategorized count badge
- Count calculation excludes: deleted cards, notes, The Den, private collections, previously reviewed cards
- Removed the less-discoverable button from Library header

**Files Modified**:
- `components/navigation/left-navigation-panel.tsx` - Added nav item with count
- `components/library/library-view.tsx` - Removed button

**Impact**: Users can now find Rediscover easily with a clear count showing cards to review.

#### 3. "Add to Pawkit" Feature

**Problem**: Users wanted to organize cards during Rediscover without leaving the flow.

**Solution**: Added third action button with quick Pawkit picker:
- New "Add to Pawkit" button with FolderPlus icon (center position)
- Keyboard shortcut "A" for quick access
- Quick Pawkit picker modal using local data store (instant)
- New animation: slide up + scale (suggests "filing away")
- Button order: Delete (D) | Add to Pawkit (A) | Keep (K)

**Files Modified**:
- `components/rediscover/rediscover-mode.tsx` - Added button, keyboard handler, animation
- `app/(dashboard)/library/page.tsx` - Added modal state and handlers

**Technical Pattern - Optimistic Updates**:
```typescript
// Close modal and advance FIRST (optimistic)
setShowPawkitModal(false);
setPendingPawkitCard(null);
rediscoverStore.setCurrentIndex(rediscoverStore.currentIndex + 1);

// Then update card in background (local-first, syncs later)
useDataStore.getState().updateCard(cardToUpdate.id, {
  collections: [...currentCollections, slug]
});
```

#### 4. Bug Fixes

**Queue Reset Bug**: Queue reset when cards were updated (Add to Pawkit action).
- Fix: Removed `items` from useEffect dependency array
- Added separate useEffect for filter changes only

**Slow Pawkit Modal (3-4 seconds)**: Modal fetched from `/api/pawkits`.
- Fix: Changed `MoveToPawkitModal` to use `useDataStore((state) => state.collections)` for instant local data

**Card Flickering on Keep**: First card briefly appeared before next card.
- Fix: Don't reset `cardTransition` state in handleAction, let entering effect handle it

**4-5 Second Delay After Pawkit Selection**: Awaited updateCard completion.
- Fix: Made optimistic - advance UI immediately, update card in background

**Queue Not Persisting Keep Actions**: Kept cards reappeared when re-entering Rediscover.
- Fix: Added `metadata.rediscoverReviewedAt` timestamp when clicking Keep
- Updated getFilteredCards to exclude cards with rediscoverReviewedAt
- Updated sidebar uncategorizedCount to also exclude reviewed cards

**Long Title Overflow**: TikTok video titles pushed buttons off screen.
- Fix: Added `line-clamp-2` to title h2 element

**Files Modified**:
- `app/(dashboard)/library/page.tsx` - Queue management, optimistic updates, review tracking
- `components/modals/move-to-pawkit-modal.tsx` - Local data store instead of API
- `components/rediscover/rediscover-mode.tsx` - Animation fix, title truncation

**Technical Pattern - Review Tracking**:
```typescript
// Mark as reviewed on Keep action
useDataStore.getState().updateCard(cardId, {
  metadata: {
    ...currentMetadata,
    rediscoverReviewedAt: new Date().toISOString()
  }
});

// Filter excludes reviewed cards
const metadata = card.metadata as Record<string, unknown> | undefined;
if (metadata?.rediscoverReviewedAt) return false;
```

---

### Date: November 24, 2025 - New User Onboarding Improvements

**Status**: ✅ COMPLETED
**Priority**: ⚡ UX IMPROVEMENT
**Branch**: `main`
**Impact**: Better first-time user experience with expanded sidebar and helpful empty states

**Summary**: Fixed two issues affecting new user experience: sidebar defaulting to collapsed mode and missing empty state guidance for accounts with no cards.

#### 1. Sidebar Default State Fix

**Problem**: New users saw collapsed sidebar (icons only) instead of the full 3-panel layout with labels visible.

**Root Cause**: In `lib/hooks/use-panel-store.ts`, the `_switchUser` function was resetting `leftMode` to `"floating"` instead of `"anchored"`.

**Solution**: Changed default `leftMode` from `"floating"` to `"anchored"` in two locations:
- Line 250: `_switchUser` default reset
- Line 267: localStorage fallback value

**Files Modified**:
- `lib/hooks/use-panel-store.ts`

**Impact**: New users now see the full expanded sidebar with labels (Library, Calendar, Notes, etc.) visible by default.

#### 2. Empty State Onboarding

**Problem**: New accounts with zero cards had no guidance on how to get started.

**Solution**: Added helpful onboarding empty states in two locations:

**Home Page** (`app/(dashboard)/home/page.tsx`):
- Enhanced `EmptyState` component with `showOnboarding` prop
- When `cards.length === 0`, shows welcoming onboarding card with:
  - Pawkit icon and "Welcome to Pawkit!" header
  - Instructions for getting started
  - Quick action hints: "Paste URL above", "Use browser extension", "Create a note"

**Library Page** (`components/library/card-gallery.tsx`):
- Added early return with empty state when `cards.length === 0`
- Shows "Your library is empty" with same helpful guidance
- Bookmark icon and consistent styling

**Files Modified**:
- `app/(dashboard)/home/page.tsx` - Enhanced EmptyState component
- `components/library/card-gallery.tsx` - Added empty state for card gallery

**Impact**: New users now see clear guidance on how to add their first bookmarks and notes.

---

### Date: January 14, 2025 - Performance Optimization: Excessive Re-renders

**Status**: ✅ COMPLETED & TESTED
**Priority**: 🔥 CRITICAL PERFORMANCE
**Branch**: `fix/performance-critical-issues`
**Impact**: 100% reduction in ProfileModal re-renders when closed, 40-60% expected reduction in sidebar re-renders

**Summary**: Critical performance optimization session addressing excessive component re-renders caused by inefficient Zustand store subscriptions. Fixed ProfileModal re-rendering dozens of times when closed, removed 417 lines of dead code (unused AppSidebar), and optimized LeftNavigationPanel with selective subscriptions.

#### 1. ProfileModal Excessive Re-renders Fix (CRITICAL)

**Problem**: ProfileModal re-rendered on EVERY settings change even when closed, causing significant performance degradation.

**Root Cause Analysis**:
- Modal subscribed to 15+ settings store values at component level
- ALL subscriptions active regardless of modal open/closed state
- Every settings change triggered re-render even when modal invisible
- User console logs showed dozens of ProfileModal renders during normal usage

**Solution - Wrapper Component Pattern**:
```typescript
// ✅ FIXED: Wrapper with early return BEFORE subscriptions
export function ProfileModal(props: ProfileModalProps) {
  if (!props.open || typeof document === 'undefined') return null;
  return <ProfileModalContent {...props} />;
}

function ProfileModalContent({ open, onClose, username }: Props) {
  // Subscriptions only happen when modal is OPEN
  const theme = useSettingsStore((state) => state.theme);
  const font = useSettingsStore((state) => state.font);
  // ... 13+ other subscriptions
}
```

**Why This Works**:
- Wrapper component returns null BEFORE any hooks execute
- Inner content component only mounts when `open === true`
- Zero subscriptions when modal closed
- 100% reduction in unnecessary re-renders

**Files Modified**:
- `components/modals/profile-modal.tsx` - Split into wrapper + content components

**Impact**: ProfileModal now renders ZERO times when closed (previously dozens per session)

#### 2. Dead Code Removal - Unused AppSidebar (417 lines)

**Discovery**: Initial performance fix applied to wrong component.

**Investigation**:
- Applied selective subscription fix to `AppSidebar` component
- Added `console.log('[AppSidebar] Rendering')` for testing
- User tested preview build - log never appeared
- Found: `app/(dashboard)/layout.tsx:403` - `{false && <AppSidebar.../>}`
- AppSidebar completely disabled, never rendering

**Decision**: Remove dead code entirely instead of optimizing.

**Files Deleted**:
- `components/sidebar/app-sidebar.tsx` - 417 lines removed

**Files Modified**:
- `app/(dashboard)/layout.tsx` - Removed AppSidebar import and disabled component

**Impact**: Cleaner codebase, eliminated confusion about which sidebar is actually used

#### 3. LeftNavigationPanel Selective Subscriptions

**Problem**: LeftNavigationPanel (the ACTUAL sidebar) subscribed to ALL cards from data store.

**Root Cause**:
```typescript
// ❌ BEFORE: Subscribes to entire cards array
const cards = useDataStore((state) => state.cards);
```

**Solution - Selective Subscription with Shallow Comparison**:
```typescript
import { shallow } from "zustand/shallow";

const pinnedNoteIds = useSettingsStore((state) => state.pinnedNoteIds);
const activeCardId = usePanelStore((state) => state.activeCardId);

// ✅ AFTER: Only subscribe to relevant cards
const cards = useDataStore((state) => {
  return state.cards.filter((card) => {
    if (card.tags?.includes('daily')) return true;
    if (pinnedNoteIds.includes(card.id)) return true;
    if (card.id === activeCardId) return true;
    return false;
  });
}, shallow);
```

**Why Shallow Comparison**:
- Without `shallow`: Re-renders when ANY card in store changes
- With `shallow`: Only re-renders when filtered subset changes
- Compares array contents, not reference
- Critical for performance with large card libraries

**Files Modified**:
- `components/navigation/left-navigation-panel.tsx` - Selective subscription pattern

**Impact**: Expected 40-60% reduction in sidebar re-renders during normal usage

#### User Testing & Validation

**Testing Process**:
1. Deployed preview build to Vercel
2. User performed comprehensive testing:
   - Opened cards
   - Created daily note
   - Clicked recent viewed items
   - Changed settings
   - Navigated between views

**User Feedback**:
- "Okay, from what I can tell, this seems to be working and didn't break anything."
- Console logs showed ZERO ProfileModal re-renders (previously dozens)
- No functional issues detected
- Performance improvement noticeable

**Console Log Evidence** (Before Fix):
```
[ProfileModal] Rendering - Settings changed
[ProfileModal] Rendering - Settings changed
[ProfileModal] Rendering - Settings changed
... (repeated dozens of times)
```

**Console Log Evidence** (After Fix):
```
(no ProfileModal logs when closed - perfect!)
```

#### Technical Patterns Established

**1. Wrapper Pattern for Conditional Modals**:
```typescript
export function ConditionalModal(props: Props) {
  if (!props.open) return null;  // Early return BEFORE hooks
  return <ModalContent {...props} />;
}

function ModalContent(props: Props) {
  // Hooks and subscriptions only when open
  const data = useStore((state) => state.data);
}
```

**2. Selective Zustand Subscription Pattern**:
```typescript
import { shallow } from "zustand/shallow";

const filteredData = useStore((state) => {
  return state.items.filter(item => {
    // Only subscribe to items that matter
    return relevanceCheck(item);
  });
}, shallow);  // Shallow comparison prevents unnecessary re-renders
```

**3. Dead Code Detection**:
- Search for `{false &&` patterns in codebase
- Remove disabled components instead of maintaining them
- Verify actual component usage before optimization

#### Files Modified Summary

**Modified**:
- `components/modals/profile-modal.tsx` - Wrapper pattern
- `components/navigation/left-navigation-panel.tsx` - Selective subscriptions
- `app/(dashboard)/layout.tsx` - Removed AppSidebar references

**Deleted**:
- `components/sidebar/app-sidebar.tsx` - 417 lines

**Documentation**:
- `.claude/skills/pawkit-troubleshooting/skill.md` - Issues #26 and #27
- `.claude/skills/pawkit-project-context/skill.md` - This session entry

#### Commits

**Branch**: `fix/performance-critical-issues`

1. Initial commit - ProfileModal wrapper pattern
2. Dead code removal - AppSidebar deletion
3. LeftNavigationPanel selective subscriptions

**Total Changes**:
- 3 files modified
- 1 file deleted (417 lines removed)
- 2 troubleshooting issues documented

#### Lessons Learned

1. **Verify Component Usage First**: Always confirm component is actually rendering before optimizing
2. **Wrapper Pattern for Modals**: Early return before hooks prevents unnecessary subscriptions
3. **Selective Subscriptions**: Filter data inside Zustand selector, use `shallow` for array comparisons
4. **Console Logs for Validation**: User testing with console logs provides concrete evidence of fixes
5. **Dead Code is Technical Debt**: Remove disabled code immediately instead of maintaining it

**Impact**:
- **Performance**: Major improvement - eliminated dozens of unnecessary re-renders
- **Code Quality**: 417 lines of dead code removed
- **User Experience**: Noticeable performance improvement during testing
- **Maintainability**: Clearer codebase with only active components

**Next Steps**:
- Update pawkit-roadmap skill with completed performance items
- Merge `fix/performance-critical-issues` to main
- Monitor performance in production
- Consider applying selective subscription pattern to other components if needed

---

### Date: January 13, 2025 - Bug Fixes: Daily Notes & Tags Display

**Status**: ✅ COMPLETED
**Priority**: 🐛 BUG FIXES
**Branch**: `main`
**Impact**: Fixed duplicate daily note creation and tags column display issues

**Summary**: Quick bug fix session addressing two user-reported issues in Notes view and Library list view.

#### 1. Duplicate Daily Note Creation Fix

**Problem**: "Daily Note" button in Notes view created multiple daily notes for the same date when clicked rapidly.

**Root Cause**: Check for existing note was at render time (stale value), not click time (current state).

**Solution**:
- Check for existing note INSIDE click handler using `findDailyNoteForDate(dataStore.cards, today)`
- Replicated working sidebar pattern from left-navigation-panel.tsx
- Query current store state at action time, not render time

**Files Modified**:
- `components/notes/notes-view.tsx` - Rewrote createDailyNote function

**Commit**: `c3e6683`

#### 2. Tags Column Display Fix

**Problem**: Tags column showed "-" for notes even though they had tags (like "daily"), while bookmarks showed their collections instead of tags.

**Root Cause**: Column was rendering `card.collections` (pawkits) instead of `card.tags`.

**Solution**:
- First attempt: Show only tags → broke bookmarks (they have collections, not tags)
- Correct solution: Merge both `card.tags` AND `card.collections` for display
- Shows first 2 items from combined array

**Files Modified**:
- `components/library/card-gallery.tsx` - Tags column rendering logic

**Commits**:
- `04b407f` - First attempt (fixed notes, broke bookmarks)
- `0abb2f9` - Correct fix (show both tags and collections)

#### Documentation Updates

**Updated Skills**:
- `.claude/skills/pawkit-troubleshooting/SKILL.md` - Added Issues #24 and #25

**Impact**:
- ✅ No more duplicate daily notes from rapid clicks
- ✅ Tags column shows both tags and collections correctly
- ✅ Notes display their tags (daily, etc.)
- ✅ Bookmarks continue showing collections (restaurants, seattle, etc.)

**Lessons Learned**:
1. **Check state at action time** - Don't rely on render-time derived values in handlers
2. **Test all card types** - Bookmarks, notes, cards with both tags and collections
3. **Reference working code** - Sidebar had correct pattern for daily notes
4. **Understand data model** - Tags (flat labels) vs Collections (hierarchical folders)

---

### Date: January 13, 2025 - List View Standardization & Hierarchical Tags

**Status**: ✅ COMPLETED & DOCUMENTED
**Priority**: ⚡ UX CONSISTENCY + FEATURE ENHANCEMENT
**Branch**: `main`
**Impact**: Pixel-perfect UI consistency across all list views, automatic parent tag inheritance for sub-collections

**Summary**: Comprehensive UI standardization session achieving pixel-perfect consistency across all list views (Pawkits, Notes, Library), implementing hierarchical tag inheritance for nested collections, and establishing canonical patterns for icons and table structures.

#### 1. Security Update - Next.js 15.5

**Implementation**:
- Upgraded Next.js from 15.1.6 to 15.5.4 for critical CVE fix
- Updated React from 19.0.0 to 19.2.0
- Fixed package manager confusion (npm vs pnpm)
- Successfully installed and committed updates

**Files Modified**:
- `package.json`
- `pnpm-lock.yaml`

**Issue**: Initially tried `npm install` which failed due to pnpm lockfile. Fixed by using `pnpm install`.

#### 2. Folder Icon Standardization

**Problem**: Emoji folder icons (📁) used inconsistently across codebase.

**Solution**: Replaced ALL emoji icons with Lucide Folder component using standardized purple color.

**Pattern Established**:
```tsx
import { Folder } from "lucide-react";

<Folder size={16} className="text-purple-400" />
```

**Files Modified**:
- `components/pawkits/grid.tsx`
- `components/library/card-gallery.tsx`
- `components/modals/card-detail-modal.tsx`
- `components/dig-up/dig-up-view.tsx`
- `components/home/quick-access-pawkit-card.tsx`

**Impact**: Visual consistency across all collection/folder representations, professional icon usage.

#### 3. Sidebar Configuration Standardization

**Problem**: Inconsistent sorting terminology and unnecessary toggles between Pawkits and Notes views.

**Changes**:
- **Standardized sorting options**: "Name", "Date Created", "Date Modified" across ALL views
- **Removed from Notes**: Masonry view, Show Thumbnails, Show Metadata (non-functional)
- **Updated slider styling**: Pawkits now matches Notes (darker track: `bg-white/10`)
- **Fixed Direction label**: Changed from `text-muted-foreground` to `text-accent` (purple)

**Files Modified**:
- `components/control-panel/notes-controls.tsx`
- `components/control-panel/pawkits-controls.tsx`

**Impact**: Unified user experience, removed confusing non-functional options.

#### 4. List View Standardization (MAJOR UPDATE)

**Problem**: List view rows had inconsistent heights, font sizes, and padding across Pawkits, Notes, and Library views.

**Solution**: Established canonical list view pattern with pixel-perfect consistency.

**Critical Dimensions Standardized**:
- **Row padding**: `py-3 px-4` (changed from `py-2`)
- **Data cell text**: `text-sm` (changed from `text-xs`)
- **Icon container**: `h-8 w-8 rounded-lg backdrop-blur-sm` (NEW - added to all views)
- **Pin icon size**: `14` pixels (changed from `12`)
- **Title text**: Added `font-medium`

**Column Structure Standardized**:
- **Pawkits**: Name | Items | Sub-Pawkits | Date Created | Date Modified | [menu]
- **Library/Notes**: Name | Type | Tags | Date Created | Date Modified | [menu]

**URL Truncation Fix** (CRITICAL):

**Problem**: Extremely long URLs pushed columns off-screen without proper constraints.

**Solution**: Multi-layer truncation pattern using flex constraints:
```tsx
<td className="py-3 px-4 max-w-xs">
  <div className="flex items-center gap-3 min-w-0">
    <span className="flex-shrink-0"><Icon /></span>
    <span className="text-sm truncate min-w-0 flex-1">{title}</span>
    {isPinned && <Pin size={14} className="flex-shrink-0" />}
  </div>
</td>
```

**Why each class matters**:
1. `max-w-xs` on `<td>`: Limits column width
2. `min-w-0` on flex container: Allows children to shrink
3. `flex-1` on text: Takes available space
4. `min-w-0` on text: Enables truncation
5. `truncate` on text: Adds ellipsis
6. `flex-shrink-0` on icons: Prevents squishing

**3-Dot Actions Menu Component**:

Created `CardActionsMenu` inline component with portal rendering:
- Portal to `document.body` for proper z-index
- Position calculation using `getBoundingClientRect()`
- `z-[9999]` to appear above all UI
- Actions: Open, Pin/Unpin, Delete

**Files Modified**:
- `components/library/card-gallery.tsx` - Complete list view rewrite
- `components/pawkits/grid.tsx` - Updated list view to match pattern

**Testing**: Verified with extremely long URLs - truncation works correctly.

**Impact**: All three views (Pawkits, Notes, Library) now have IDENTICAL list view dimensions and behavior.

#### 5. Hierarchical Tag Inheritance (NEW FEATURE)

**Problem**: Cards added to sub-collections (e.g., "Restaurants > Everett") only got direct tag ("everett"), missing parent tag ("restaurants"). This broke filtering at parent level.

**Before**:
```tsx
card.collections = ["everett"]  // Missing "restaurants"!
// Card doesn't appear when viewing "Restaurants" collection
```

**After**:
```tsx
card.collections = ["everett", "restaurants"]  // ✅ Includes parent
// Card appears in both "Everett" AND "Restaurants" views
```

**Implementation**:

Created `lib/utils/collection-hierarchy.ts` with 4 utility functions:

1. **getCollectionHierarchy()**: Walks up parent chain to get all ancestor slugs
2. **addCollectionWithHierarchy()**: Adds collection + all parents to card
3. **removeCollectionWithHierarchy()**: Removes collection (optionally with children)
4. **isCardInCollectionHierarchy()**: Checks if card should appear in collection view (for future)

**Usage Pattern**:
```tsx
import { addCollectionWithHierarchy } from "@/lib/utils/collection-hierarchy";

const handleAddToPawkit = (slug: string) => {
  const newCollections = addCollectionWithHierarchy(
    card.collections || [],
    slug,
    allCollections  // Hierarchical collection tree from store
  );
  updateCard(card.id, { collections: newCollections });
};
```

**Data Migration**:

Created `/api/admin/migrate-collection-hierarchy` endpoint:
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

**Files Created**:
- `lib/utils/collection-hierarchy.ts` - Core utilities
- `app/api/admin/migrate-collection-hierarchy/route.ts` - Migration endpoint

**Files Modified**:
- `components/library/card-gallery.tsx` - Updated all add/remove handlers
- `app/(dashboard)/home/page.tsx` - Updated handlers with hierarchy
- Variable rename: `collections` → `allCollections` to avoid shadowing

**TypeScript Fixes**:
- Fixed `createServerClient` → `createClient` import error
- Added type annotations to avoid implicit `any` errors

**Impact**: Filtering now works correctly at all hierarchy levels. Cards in sub-collections appear in parent collection views.

#### Documentation Updates

**Updated Skills**:
1. **pawkit-ui-ux/SKILL.md**:
   - Added Section 13: LIST VIEW STANDARDIZATION
   - Added Section 14: FOLDER ICON STANDARDIZATION
   - Added Section 15: HIERARCHICAL TAG INHERITANCE
   - Updated design system version to v1.2

2. **pawkit-project-context/SKILL.md** (this document):
   - Added this comprehensive session summary

3. **pawkit-roadmap/SKILL.md** (pending):
   - Mark list view standardization as complete
   - Mark hierarchical tags as complete

4. **pawkit-conventions/SKILL.md** (pending):
   - Add hierarchy utility usage patterns

**Technical Patterns Established**:

1. **List View Dimensions**: `py-3 px-4`, `text-sm`, `h-8 w-8` icon containers
2. **URL Truncation**: `max-w-xs` + `min-w-0` + `flex-1` + `truncate` pattern
3. **Icon Container**: `h-8 w-8 rounded-lg backdrop-blur-sm bg-accent/20`
4. **Pin Icon**: `<Pin size={14} className="text-purple-400" />`
5. **Folder Icon**: `<Folder size={16} className="text-purple-400" />`
6. **Hierarchical Tags**: ALWAYS use `addCollectionWithHierarchy()`, never manual array push

**Testing Results**:
- ✅ All list views have identical row heights
- ✅ Long URLs truncate correctly without breaking layout
- ✅ Pin icons display consistently at size 14
- ✅ Folder icons use Lucide component with purple-400
- ✅ Cards in sub-collections appear in parent collections
- ✅ Migration endpoint successfully backfills parent tags

**Commits**:
- Security: Next.js 15.5 upgrade
- Icons: Folder emoji → Lucide Folder replacements
- Sidebar: Standardized controls and terminology
- List Views: Canonical pattern implementation
- Truncation: URL overflow fix
- Hierarchy: Tag inheritance system
- Migration: Collection hierarchy backfill endpoint

**Impact**:
- **UI Consistency**: Pixel-perfect alignment across all views
- **Data Model**: Hierarchical filtering now works correctly
- **Developer Experience**: Clear patterns documented for future list views
- **User Experience**: Intuitive parent/child collection behavior

---

### Date: January 13, 2025 - Universal Todo List & Pawkits View Polish

**Status**: ✅ COMPLETED & DOCUMENTED
**Priority**: ⚡ FEATURE RELEASE + UX POLISH
**Branch**: `main`
**Impact**: Cross-device todo management, improved Pawkits view consistency and usability

**Summary**: Major development session implementing a universal cross-device todo list feature and comprehensive polish of the Pawkits view, including right sidebar customization and new List/Compact view modes.

#### 1. Universal Todo List Feature

**Implementation**:
- **Database Schema**: Added `Todo` model to Prisma schema with userId foreign key, title, completed status, createdAt/updatedAt timestamps
- **API Endpoints**:
  - `GET /api/todos` - Fetch all user's todos
  - `POST /api/todos` - Create new todo
  - `PATCH /api/todos/[id]` - Update todo (title/completed)
  - `DELETE /api/todos/[id]` - Delete todo
  - All endpoints include user ownership validation via Clerk auth
- **State Management**: Zustand store at `lib/hooks/use-todos.ts` with:
  - Optimistic updates for instant UI feedback
  - Automatic rollback on API errors
  - Persist middleware for cross-page state
- **UI Component**: `TodosSection` at `components/control-panel/todos-section.tsx`
  - Appears in ALL view right sidebars (Home, Library, Notes, Calendar, Pawkits)
  - Uses `PanelSection` pattern for visual consistency
  - Shows active todo count badge in header
  - Inline create, edit, delete, and toggle completion
- **Sync**: Backed by Supabase, syncs across all user devices

**Files Modified**:
- `prisma/schema.prisma`
- `app/api/todos/route.ts` (new)
- `app/api/todos/[id]/route.ts` (new)
- `lib/hooks/use-todos.ts` (new)
- `components/control-panel/todos-section.tsx` (new)
- `components/control-panel/home-controls.tsx`
- `components/control-panel/library-controls.tsx`
- `components/control-panel/notes-controls.tsx`
- `components/control-panel/calendar-controls.tsx`
- `components/control-panel/pawkits-controls.tsx`

**Testing Results**:
- ✅ Todos persist across page navigation
- ✅ Todos sync across devices in real-time
- ✅ Optimistic updates work correctly
- ✅ Ownership validation prevents unauthorized access
- ✅ TodosSection appears consistently in all view sidebars

#### 2. Right Sidebar Visual Consistency

**Problem**: Right sidebar controls had inconsistent padding, indentation, and section styling across different views.

**Solution**: Standardized on `PanelSection` component pattern across all control panels:
- Removed custom wrapper divs that were adding extra indentation
- Ensured all control components return fragment (`<>...</>`) with `TodosSection` first
- Pixel-perfect alignment of all sections using PanelSection's built-in styles
- Consistent spacing, borders, and collapse behavior

**Pattern Established**:
```tsx
export function ViewControls() {
  return (
    <>
      <TodosSection />  {/* Always first */}
      <PanelSection id="..." title="..." icon={<Icon />}>
        {/* Section content */}
      </PanelSection>
    </>
  );
}
```

**Files Modified**:
- All control panel components updated to follow pattern
- Documented in `pawkit-ui-ux/SKILL.md` under "RIGHT SIDEBAR PATTERNS"

#### 3. Home View Control Panel

**Problem**: Home view had no right sidebar controls when selected.

**Solution**:
- Created `components/control-panel/home-controls.tsx` with TodosSection
- Added `openHomeControls()` method to panel store
- Updated Home page to call `openHomeControls()` on mount
- Updated `app/(dashboard)/layout.tsx` to register HomeControls component
- Right sidebar now properly switches to home controls when navigating to Home

**Files Modified**:
- `components/control-panel/home-controls.tsx` (new)
- `lib/hooks/use-panel-store.ts`
- `app/(dashboard)/page.tsx`
- `app/(dashboard)/layout.tsx`

#### 4. Pawkits Right Sidebar Customization

**Changes**:
- **Removed**: Tags section, Content Type section (not applicable to Pawkits)
- **Updated Sort Options**: Name, Date Created, Date Modified (removed "Added to Library")
- **Updated View Options**: Grid, List, Compact only (removed Masonry - not applicable)
- **Simplified Display**: Pawkit Size slider only (removed Card Size)
- **Added**: Sort direction toggle (Ascending/Descending)

**Files Modified**:
- `components/control-panel/pawkits-controls.tsx`

**Impact**:
- Cleaner, more focused controls for Pawkits management
- Removed irrelevant options that confused users
- Better alignment with Pawkits-specific functionality

#### 5. Pawkits List & Compact Views Redesign

**List View Redesign**:
- Converted from grid cards to full-width data table
- Columns: Name, Items, Sub-Pawkits, Date Created, Last Activity
- Hover effect on rows (`hover:bg-white/5`)
- Purple Pin icon replacing star emoji
- Date formatting:
  - Date Created: Absolute format (`Nov 10, 2025`)
  - Last Activity: Relative format (`2 hours ago`)
- System Pawkits highlighted with purple background
- Actions menu in last column

**Compact View Redesign**:
- Dense grid: 2-6 columns (responsive)
- Icon + title + count only (no previews)
- Hover scale effect
- Actions menu appears on hover
- Maximum density for quick scanning

**Files Modified**:
- `components/pawkits/grid.tsx`
  - Added imports: `Pin` from lucide-react, `formatDistanceToNow` from date-fns
  - Added `createdAt` and `updatedAt` to type definitions
  - Completely rewrote List view section (lines 67-158)
  - Completely rewrote Compact view section (lines 161-220)
- `app/(dashboard)/pawkits/page.tsx`
  - Added `createdAt` and `updatedAt` to gridItems mapping

**Testing Results**:
- ✅ List view displays all metadata correctly
- ✅ Compact view shows maximum items per screen
- ✅ Date formatting works (absolute and relative)
- ✅ Pin icon appears for pinned Pawkits
- ✅ System Pawkits visually distinguished
- ✅ All three views (Grid/List/Compact) switch correctly
- ✅ Responsive behavior works across screen sizes

#### Technical Patterns Established

**PanelSection Pattern**: Standardized right sidebar component structure documented in `pawkit-ui-ux/SKILL.md`

**Controls Component Structure**: Always return fragment with TodosSection first, followed by PanelSection components

**Three-View System**:
- Grid: Visual browsing with previews
- List: Data table for metadata scanning
- Compact: Dense grid for maximum density

**Date Formatting Standards**:
- Creation dates: Absolute (`toLocaleDateString()`)
- Activity dates: Relative (`formatDistanceToNow()`)

**Pin Icon Usage**: `<Pin size={14} className="text-purple-400" />` replaces star emoji everywhere

---

### Date: January 13, 2025 - Note Double-Creation from Sync Queue (Issue #23)

**Status**: ✅ FIXED & DEPLOYED
**Priority**: 🔴 CRITICAL - Data Duplication
**Branch**: `main`
**Commits**: ec5a34c

**Problem**:
When creating a note, TWO notes were created on the server within 5 seconds:
1. First note: Created immediately with content (12:23:44)
2. Second note: Created 5 seconds later as blank duplicate (12:23:49)

**User Flow**:
- User clicks "Create Note" → Note created with temp ID
- Immediate sync fires → Note created on server ✅
- User starts typing → Auto-save fires
- 5 seconds later → Sync queue drains → Creates SAME note AGAIN ❌

**Root Cause**:
In `lib/stores/data-store.ts:446` (addCard function):
1. Operation queued for sync (line 497-501)
2. Immediate sync attempted (line 505-509) → succeeded
3. **BUG**: Queued item NOT removed from sync queue
4. Queue drains 5 seconds later → Posts same data again → Duplicate

**The Fix**:
Added `removeByTempId()` method to sync-queue.ts and called it after successful immediate sync:
```typescript
if (response.ok) {
  const serverCard = await response.json();

  // CRITICAL: Remove from sync queue since immediate sync succeeded
  await syncQueue.removeByTempId(tempId);

  // ... rest of logic
}
```

**Files Modified**:
- `lib/services/sync-queue.ts:246-258` - Added removeByTempId() method
- `lib/stores/data-store.ts:516` - Call removeByTempId after immediate sync success

**Documentation Updated**:
- `.claude/skills/pawkit-troubleshooting/SKILL.md` - Added Issue #23
- `.claude/skills/pawkit-sync-patterns/SKILL.md` - Added Strategy 6: Dequeue After Immediate Sync Success

**Validation**:
- [x] Create note and immediately type
- [x] Wait 5+ seconds for queue drain
- [x] Verify only ONE note created on server
- [x] Verify sync queue empty after creation
- [x] No blank duplicates appear

**Prevention Pattern**:
**Critical Rule**: Always dequeue operations from sync queue after immediate sync success to prevent duplicate execution when queue drains.

---

### Date: January 13, 2025 - Critical Sync Duplication Bug Fix (Issue #22)

**Status**: ✅ FIXED & DEPLOYED
**Priority**: 🔴 CRITICAL - Data Corruption
**Branch**: `main`
**Commits**: b1f077a, bc006be, fb30ffc

**Problem**:
Sync service was creating DUPLICATE collections and cards instead of marking existing ones as deleted when receiving `deleted: true` from server.

**Impact**:
- 76 collections in IndexedDB (48 marked deleted, 28 active with duplicates)
- "Zombie apocalypse" - deleted collections appearing in sidebar across devices
- Data duplication on every deletion sync
- User confusion with duplicate collection names

**Root Cause**:
In `lib/services/sync-service.ts`, the deletion merge logic was selecting between local and server versions:
```typescript
// ❌ BUG: Created duplicates
const deletedVersion = localCollection.deleted ? localCollection : serverCollection;
await localDb.saveCollection(deletedVersion);
// When serverCollection selected, this CREATED NEW entity instead of updating existing
```

**Fix Implemented**:
Modified both `mergeCollections()` and `mergeCards()` to ALWAYS update the LOCAL entity:
```typescript
// ✅ FIXED: Updates existing entity
localCollection.deleted = true;
localCollection.deletedAt = serverCollection.deletedAt || localCollection.deletedAt || new Date().toISOString();
localCollection.updatedAt = new Date().toISOString();
await localDb.saveCollection(localCollection); // Updates existing, no duplicates
```

**Additional Fixes**:
1. Added missing `deletedAt` field to `CollectionNode` TypeScript type (bc006be)
2. Created auto-cleanup function in data-store.ts to remove 16 known corrupted collection IDs on app startup (fb30ffc)
3. Generated SQL script to clean server database (cleanup-corrupted-collections.sql)

**Files Modified**:
- `lib/services/sync-service.ts:551-560` - mergeCollections() deletion logic
- `lib/services/sync-service.ts:407-416` - mergeCards() deletion logic
- `lib/types.ts:120` - Added deletedAt field
- `lib/stores/data-store.ts:247-267` - Auto-cleanup function
- `lib/stores/data-store.ts:288` - Call cleanup in initialize()

**Documentation Updated**:
- `.claude/skills/pawkit-troubleshooting/SKILL.md` - Added Issue #22
- `.claude/skills/pawkit-sync-patterns/SKILL.md` - Added Strategy 5: Deletion Handling

**Validation**:
- [x] Type errors fixed - build successful
- [x] Auto-cleanup implemented and tested
- [x] Server database cleaned via SQL script
- [x] All devices auto-clean on next app load
- [x] No more duplicates created on deletion sync
- [x] Sidebar shows clean collection list

**Prevention Pattern**:
**Critical Rule**: Never save server entity directly when handling deletions. Always update LOCAL entity to preserve identity and prevent duplicates.

---

### Date: January 4, 2025 - Comprehensive Sync System Deep-Dive Analysis

**Status**: ✅ ANALYSIS COMPLETE - Issues documented, fixes deferred
**Priority**: CRITICAL TECHNICAL DEBT
**Branch**: `main` (no code changes made, documentation only)

**Analysis Context**:

User requested comprehensive investigation of sync system after observing:
- Cards duplicating across devices and sessions
- Pawkits not updating on other devices
- Cross-device sync failures
- Data inconsistencies between multiple sessions

**Objective**: "Act as a backend expert who has shipped hundreds of products that use sync systems. Dive fully into the sync code, look for any potential issues with local storage, syncing to supabase, possible reasons why cards might duplicate, pawkits might not update in other sessions, etc."

**Investigation Approach**:

Conducted comprehensive analysis using specialized Plan agent:
1. Complete architecture review of sync-service.ts, local-storage.ts, sync-queue.ts
2. IndexDB V2 historical investigation via git history
3. Cross-referenced with previous bug fixes and workarounds
4. Identified specific race conditions, transaction boundaries, conflict resolution gaps
5. Mapped full data flows and identified potential race windows

**Key Findings - 8 Critical Categories**:

**1. Race Conditions (5 CRITICAL issues)**:
- Multi-tab sync collision (BroadcastChannel coordination flawed)
- Temp ID → Server ID race condition (3 race windows)
- Deduplication false positives (3 separate flaws)
- Metadata quality score overwrites user changes
- Database initialization race (double initialization possible)

**2. Database-Level Issues (2 HIGH issues)**:
- Incomplete unique index (only covers URL cards)
- No optimistic locking (metadata updates bypass conflict detection)

**3. Sync Flow Architecture (3 CRITICAL issues)**:
- Missing transaction boundaries (operations not atomic)
- Collection tree flattening loses parent relationships
- No cache invalidation strategy (no rollback on failure)

**4. Concurrency Issues (2 MEDIUM issues)**:
- Sync queue not idempotent (failed operations can duplicate)
- useUserStorage hook order race (components mount before init)

**Historical Context - IndexDB V2 Migration**:

**When**: October 2025 (commits: 35ade04, 4c5f810, f3114aa)

**What Changed**:
```
Database Naming:
  Before: pawkit-local-storage (single global database)
  After: pawkit-{userId}-{workspaceId}-local-storage (per-user databases)

Init Pattern:
  Before: Single initialization on app load
  After: Dynamic init with user context, workspace support

Sync Queue:
  Before: Global queue
  After: Per-user-per-workspace queue

Multi-Session:
  Before: No detection
  After: Active session tracking with localStorage
```

**Why It Broke**:

1. **BroadcastChannel Coordination**:
   - Worked: Single DB, simple coordination
   - Broke: Multiple user contexts, race conditions between tabs

2. **Temp ID Pattern**:
   - Worked: Single user, no cross-device sync
   - Broke: Multi-user environment, temp IDs leak into sync, create ghost duplicates

3. **Transaction Boundaries**:
   - Worked: Simple single-DB operations
   - Broke: Complex multi-user flows need ACID guarantees

4. **Deduplication Logic**:
   - Worked: Reactive cleanup for single user
   - Broke: Insufficient for multi-user/multi-device, creates false positives

**Root Cause Summary**:

The IndexDB V2 migration successfully achieved its goal (per-user data isolation) but inadvertently introduced architectural issues:
- **Split Brain Problem**: Temp IDs in transit create divergent realities between devices
- **Lost Atomicity**: Multi-step operations lack transaction boundaries
- **Coordination Failure**: BroadcastChannel insufficient for multi-tab mutual exclusion
- **Reactive vs Preventive**: Client-side deduplication is bandaid for database-level constraint gaps

**Git Evidence of Reactive Fixes**:

Commit history shows multiple bandaid fixes addressing symptoms:
- `61ba60e`: Changed deduplication from soft delete to hard delete (reactive fix)
- `476d04a`: Skip deduplication when both cards have server IDs (bandaid for temp ID races)
- `c60c41b`: Fixed local deletions overwritten by server (collection timing issue)
- `e8be3fa`: Prevent duplicate operations in queue (idempotency issue)

Each fix addressed a specific symptom but didn't solve underlying architectural issues.

**Critical Insights**:

1. **Temp ID Pattern is Primary Duplicate Cause**:
   - 4-step process (create temp → UI update → server sync → ID replacement) has 3 race windows
   - Other tabs can sync temp cards before ID replacement completes
   - If server sync fails, temp card persists in queue AND IndexDB
   - **Solution**: Use client-generated UUIDs, eliminate ID replacement entirely

2. **Multi-Tab Sync is Fundamentally Flawed**:
   - BroadcastChannel has message delay (~10ms) creating race window
   - `otherTabSyncing` flag checked before message processed
   - Both tabs can start sync simultaneously, pull different versions, create duplicates
   - **Solution**: Distributed lock using localStorage with timestamps and mutex

3. **No ACID Guarantees at IndexDB Level**:
   - Operations like pullFromServer do multiple steps without transaction wrapper
   - If mergeCards succeeds but mergeCollections fails, data is inconsistent
   - Rollback mechanism uses Promise.all which can partially fail
   - **Solution**: Wrap all multi-step operations in IndexDB transactions

4. **Deduplication is Reactive Bandaid**:
   - Runs on every sync trying to clean up duplicates after creation
   - Has false positives (same title/URL treated as duplicate)
   - Deleted cards can resurrect before deletion detected
   - **Solution**: Remove client deduplication, enforce at database level with proper constraints

5. **Metadata Quality Score Causes Data Loss**:
   - Background metadata fetching scores higher than user manual edits
   - User adds notes/tags on Device A, Device B fetches metadata, sync overwrites user's work
   - 1-hour window check insufficient mitigation
   - **Solution**: Separate user-edited fields from auto-fetched, never overwrite user edits

**Recommended Fix Priority - Top 3 (80% Impact)**:

1. **Eliminate Temp ID Pattern** (6-8 hours)
   - Impact: Eliminates primary duplicate card issue
   - Files: lib/stores/data-store.ts, lib/services/sync-service.ts
   - Approach: Use client UUIDs, remove ID replacement logic

2. **Add Distributed Lock for Multi-Tab Sync** (4-6 hours)
   - Impact: Eliminates multi-tab sync collision
   - Files: lib/services/sync-service.ts
   - Approach: localStorage mutex with exponential backoff

3. **Wrap Operations in IndexDB Transactions** (8-10 hours)
   - Impact: Ensures data consistency, prevents corruption
   - Files: lib/services/sync-service.ts, lib/services/local-storage.ts
   - Approach: Transaction boundaries on all multi-step operations

**Total Estimated Time**: 18-24 hours
**Expected User Impact**: Resolve 80% of sync issues (duplicates, cross-device failures)

**Prevention Guidelines for Future Sync Work**:

When making sync changes, always:
1. ✅ Wrap multi-step operations in transactions
2. ✅ Never use temporary IDs that can leak into sync
3. ✅ Implement distributed locks for cross-tab operations
4. ✅ Use vector clocks or operation sequence numbers for causality
5. ✅ Add optimistic locking (version fields) to all entities
6. ✅ Test with multiple tabs AND multiple devices simultaneously
7. ✅ Monitor for duplicate creation in production logs
8. ✅ Use preventive constraints (database) not reactive deduplication (client)

**Files Analyzed**:
- `lib/services/sync-service.ts` - Sync orchestration and merge logic
- `lib/services/local-storage.ts` - IndexDB operations and data persistence
- `lib/services/sync-queue.ts` - Operation queue and retry logic
- `lib/stores/data-store.ts` - Zustand state management and optimistic updates
- `lib/hooks/use-user-storage.ts` - User context initialization
- `lib/services/storage-migration.ts` - V1 to V2 migration logic
- `prisma/schema.prisma` - Database schema and constraints
- `app/api/cards/[id]/route.ts` - API conflict detection
- Git history - Commits related to sync fixes and IndexDB V2

**Documentation Updated**:
- `.claude/skills/pawkit-roadmap/SKILL.md` - Added "BACKLOG - CRITICAL SYNC FIXES (Priority 0)" section with all 12 issues
- `.claude/skills/pawkit-project-context/SKILL.md` - This session entry
- `.claude/skills/pawkit-sync-patterns/SKILL.md` - Added "KNOWN ARCHITECTURAL FLAWS" section
- `.claude/skills/pawkit-troubleshooting/SKILL.md` - Added specific troubleshooting entries (if size permits)

**Current Status**:
- Analysis complete and documented
- No code changes made (documentation only)
- Issues prioritized by impact and effort
- Ready for future fix session when prioritized

**User Decision**: Document now, fix later when sync work is prioritized

**Next Steps** (when user decides to address sync):
1. Review documented issues in roadmap skill
2. Start with Top 3 fixes (18-24 hours estimated)
3. Test with multiple tabs and devices
4. Monitor production for duplicate creation reduction
5. Address remaining issues as needed

**Impact**:
- Created comprehensive reference for future sync fix session
- Identified root causes preventing guessing/trial-and-error
- Prioritized fixes by impact to optimize development time
- Established prevention guidelines to avoid regressions

**Lessons Learned**:
1. Architecture changes (single → multi-user DB) require comprehensive review of all coordination mechanisms
2. Race conditions are multiplicative - each new async operation adds exponential complexity
3. Reactive fixes (deduplication, bandaids) mask underlying architectural issues
4. Local-first architecture requires ACID guarantees even at client level
5. Temp IDs are dangerous in distributed systems - UUIDs or server-assigned IDs only

---

### Date: January 3, 2025 - CRITICAL FIX: User Isolation & Sign Out Restoration

**Status**: ✅ COMPLETE - Merged to main (commit 6f9fe5f)
**Priority**: CRITICAL SECURITY FIX
**Branch**: `claude/fix-sync-bugs-011CUmJiyEbu2iTCVjMM8wvD`

**Problem Discovery**:

After previous session's isolation work, two critical bugs emerged:
1. **Sign Out button completely broken** - No UI response, no console logs, button appeared dead
2. **Complete user isolation failure** - ALL data bleeding between accounts (URLs + notes)

**Investigation & Fixes**:

**Bug #1: Sign Out Button Not Working**

**Root Cause**: The complex cleanup code added for isolation (dynamic imports, database clearing, localStorage cleanup) was **failing silently**. When Sign Out was clicked:
- Button onClick handler fired
- But the complex async operations inside failed without visible errors
- Dynamic imports (`await import('@/lib/services/local-storage')`) appeared to break execution
- User saw no feedback - button seemed dead

**Debugging Process**:
1. Started with comprehensive logging to track execution flow
2. Added test buttons (inline vs named handlers) to isolate issue
3. Discovered that named handlers worked BUT signOut() call never executed
4. Found that inline handlers with alerts worked, but complex code stopped execution
5. Reverted to simple signOut from main branch (just `supabase.auth.signOut()` + redirect)

**Files**:
- `components/modals/profile-modal.tsx` - Simplified to named handler function
- `lib/contexts/auth-context.tsx` - Reverted to simple signOut (lines 59-93)

**Bug #2: Complete User Isolation Failure**

**Root Cause**: When we simplified signOut to fix the button, we **removed critical localStorage cleanup**. Specifically:
- `localStorage.removeItem('pawkit_last_user_id')` was missing
- This marker is used by `useUserStorage` hook to detect user switches
- Without clearing it, system couldn't tell when a different user logged in

**The Flow**:
1. User A logs in → `pawkit_last_user_id = "user-a-id"` stored
2. User A creates data → Saved to `pawkit-user-a-id-default-local-storage`
3. User A signs out → OLD CODE: Only cleared Supabase session
4. User B logs in → `useUserStorage` checks `pawkit_last_user_id`
   - Found: `"user-a-id"` (not cleared!)
   - Current: `"user-b-id"`
   - **SHOULD** trigger `cleanupPreviousUser()` but marker wasn't cleared
   - System thinks it's same user, doesn't clean up
5. User B sees User A's data! 🐛

**The Fix**:
```typescript
const signOut = async () => {
  // CRITICAL: Clear session markers so next login detects user switch
  localStorage.removeItem('pawkit_last_user_id');  // ← THE KEY FIX
  localStorage.removeItem('pawkit_active_device');

  // Sign out from Supabase
  await supabase.auth.signOut();

  // Close database connections for clean slate
  try {
    const { localDb } = await import('@/lib/services/local-storage');
    const { syncQueue } = await import('@/lib/services/sync-queue');
    await localDb.close();
    await syncQueue.close();
  } catch (dbError) {
    // Non-critical - continue anyway
  }

  router.push('/login');
}
```

**Technical Implementation**:

**User Switch Detection** (from `lib/hooks/use-user-storage.ts`):
```typescript
// Check if this is a different user than last time
const previousUserId = localStorage.getItem('pawkit_last_user_id');

if (previousUserId && previousUserId !== currentUserId) {
  console.warn('[useUserStorage] USER SWITCH DETECTED!');
  // CRITICAL: Clean up previous user's data
  await cleanupPreviousUser(previousUserId);
}

// Initialize storage for current user
await localDb.init(currentUserId, workspaceId);
await syncQueue.init(currentUserId, workspaceId);

// Store current user ID for next login
localStorage.setItem('pawkit_last_user_id', currentUserId);
```

**Per-User Database Architecture**:
- Each user gets isolated IndexedDB: `pawkit-{userId}-default-local-storage`
- User switch triggers automatic cleanup of previous user's database
- Fresh database initialized for new user
- Zero data bleeding between accounts

**Debugging Process**:

1. **Initial test showed complete failure** - Both URLs and notes bleeding between accounts
2. **Checked `useUserStorage` hook** - Confirmed it has proper isolation logic
3. **Checked database naming** - Confirmed per-user databases exist
4. **Realized**: If local storage is isolated, issue must be sign out not clearing markers
5. **Added marker cleanup to signOut** - Instant fix!

**Testing & Verification**:

User tested with 2 accounts:
- ✅ User A's data (notes + URLs) invisible to User B
- ✅ User B's data (notes + URLs) invisible to User A
- ✅ Sign Out works reliably
- ✅ Data persists correctly for each user
- ✅ Console logs show proper cleanup and user switch detection

**Files Modified**:
- `lib/contexts/auth-context.tsx` - Added session marker cleanup to signOut
- `components/modals/profile-modal.tsx` - Simplified Sign Out button handler
- `lib/hooks/use-user-storage.ts` - (Already had isolation logic, no changes needed)
- `lib/services/local-storage.ts` - (Already had per-user databases, no changes needed)

**Commits** (11 total on branch):
- 35ade04 - Initial user workspace architecture
- 4c5f810 - Complete user-specific database implementation
- f3114aa - Fix React Hook exhaustive-deps warnings
- 917d039 - Fix TypeScript errors in hooks
- 5d06487 - Clean up: remove redundant syncQueue.init() call
- fa17320 - debug: add comprehensive logging to signOut functionality
- 2f46823 - debug: add component-level logging and test button
- 7b9c557 - debug: add aggressive logging and alerts to both buttons
- faa9463 - fix: add comprehensive logging and await to signOut call
- ... (more debug commits)
- d4a379f - **fix: clear session markers on signOut to enable user isolation** ← THE FIX
- 444db1c - cleanup: remove test button, keep only Sign Out

**Merge to Main**: 6f9fe5f
- 18 files changed, 1,033 additions, 111 deletions
- Successfully merged and deployed to production

**New Files Created**:
- `lib/hooks/use-user-storage.ts` - User storage initialization hook
- `lib/services/storage-migration.ts` - Migration from old global database

**Architecture Improvements**:
1. **User-Specific Storage Hook** - Dashboard layout now calls `useUserStorage()` before initializing data
2. **Automatic User Switch Detection** - System detects when different user logs in
3. **Automatic Cleanup** - Previous user's data automatically cleaned up
4. **Database Isolation** - Per-user IndexedDB databases with workspace support
5. **Migration Support** - Automatically migrates existing users from old global database

**Impact**:
- Critical security vulnerability completely resolved
- User data fully isolated between accounts
- Sign Out functionality restored and reliable
- Clean user switching with automatic cleanup
- Production-ready and deployed

**Lessons Learned**:
1. Dynamic imports can fail silently in client-side React components
2. Session markers are CRITICAL for user switch detection
3. Always test the happy path after fixing bugs (we broke sign out while fixing isolation)
4. localStorage cleanup is just as important as database cleanup
5. Simple solutions are often better than complex ones

---

### Date: January 2, 2025 (Evening) - CRITICAL: User Data Isolation Bug Investigation

**Status**: UNDER INVESTIGATION - Branch: `user-isolation-debug`
**Priority**: CRITICAL SECURITY ISSUE - Multiple users on same browser share data
**Impact**: Cards created in Account A appear in Account B after login/logout

**Problem Discovery**:

User reported critical security bug: IndexedDB and localStorage were not user-specific. When multiple users logged into same browser:
- User A's cards appeared in User B's library
- Recently viewed items leaked between accounts
- URLs duplicated without metadata (cards spin forever)
- Notes appeared isolated but URL cards leaked

**Investigation Summary**:

Discovered and addressed **5 separate isolation problems**:

1. **IndexedDB Globally Shared** - ✅ FIXED
   - **Symptom**: All users shared single database `'pawkit-local-storage'`
   - **Fix**: Changed to per-user databases `'pawkit-{userId}'`
   - **Files**: `lib/services/local-storage.ts`, `lib/contexts/auth-context.tsx`
   - **Commit**: Initial user isolation fixes

2. **Recently Viewed Items Shared** - ✅ FIXED
   - **Symptom**: Sidebar recently viewed showed cards from all users
   - **Fix**: Changed localStorage key to `'pawkit-recent-history-{userId}'`
   - **Files**: `lib/hooks/use-recent-history.ts`
   - **Commit**: Same commit as above

3. **Database Initialization Race Condition** - ✅ FIXED
   - **Symptom**: "Cannot initialize database without userId" errors
   - **Root Cause**: DataStore.initialize() called before auth set userId
   - **Fix**: Dashboard layout waits for `authLoading=false` AND `user!=null`
   - **Files**: `app/(dashboard)/layout.tsx`
   - **Commit**: Same commit as above

4. **Auth Cache Contamination** - ✅ FIXED
   - **Symptom**: Next.js router cached previous user's session data
   - **Fix**: Added `router.refresh()` before navigation in signOut
   - **Files**: `lib/contexts/auth-context.tsx`
   - **Commit**: Same commit as above

5. **SERVER-SIDE DATA LEAK** - 🔍 UNDER INVESTIGATION
   - **Symptom**: Cards (URLs specifically) still duplicate between accounts
   - **Status**: Added comprehensive server-side logging to debug
   - **Logging Points**:
     - `getCurrentUser()` - Track which user Supabase returns
     - API `/cards` GET/POST - Track authenticated user ID
     - `listCards()` - Detect if database returns foreign user cards
   - **Next Step**: Deploy and check logs for "🚨 DATA LEAK DETECTED" alerts

**Technical Implementation**:

**Per-User IndexedDB Pattern**:
```typescript
class LocalStorage {
  private userId: string | null = null;

  private getDbName(): string {
    if (!this.userId) {
      throw new Error('Cannot access database without userId');
    }
    return `pawkit-${this.userId}`; // USER-SPECIFIC DATABASE
  }

  async setUserId(userId: string | null): Promise<void> {
    if (this.db) {
      this.db.close(); // Close previous user's database
      this.db = null;
    }
    this.userId = userId;
    if (userId) await this.init(); // Open new user's database
  }
}
```

**Auth-Coordinated Database Switching**:
```typescript
// lib/contexts/auth-context.tsx
supabase.auth.onAuthStateChange(async (_event, session) => {
  const newUser = session?.user ?? null;
  setUser(newUser);

  if (newUser) {
    await localDb.setUserId(newUser.id); // Switch to user's database
  } else {
    await localDb.close(); // Close on logout
  }

  router.refresh(); // Clear Next.js cache
});
```

**Per-User localStorage Keys**:
```typescript
// lib/hooks/use-recent-history.ts
function getStorageKey(userId: string | null): string {
  if (!userId) return "pawkit-recent-history";
  return `pawkit-recent-history-${userId}`; // USER-SPECIFIC KEY
}
```

**Auth-Aware Initialization**:
```typescript
// app/(dashboard)/layout.tsx
useEffect(() => {
  if (authLoading) return; // Wait for auth
  if (!user) return; // Require user
  if (!isInitialized) {
    initialize(); // Now safe to initialize
  }
}, [authLoading, user, isInitialized, initialize]);
```

**Data Store Reset on User Switch**:
```typescript
// lib/stores/data-store.ts
reset: () => {
  console.log('[DataStore V2] Resetting state for user switch');
  set({
    cards: [],
    collections: [],
    isInitialized: false,
    isLoading: false,
    isSyncing: false,
  });
}
```

**Server-Side Debugging (user-isolation-debug branch)**:
```typescript
// lib/auth/get-user.ts
console.log('[getCurrentUser] 🔑 Supabase user:', {
  id: user.id,
  email: user.email,
  timestamp: new Date().toISOString()
});

// app/api/cards/route.ts
console.log('[API /cards GET] ✅ Authenticated user:', {
  id: user.id,
  email: user.email
});

// lib/server/cards.ts
const foreignCards = items.filter(c => c.userId !== userId);
if (foreignCards.length > 0) {
  console.error('[listCards] 🚨🚨🚨 DATA LEAK DETECTED!', {
    requestedUserId: userId,
    foreignCards: foreignCards.map(c => ({
      id: c.id,
      title: c.title,
      userId: c.userId
    }))
  });
}
```

**Branch Structure**:
- **main**: Clean and stable (reset to commit 110a1c7)
- **user-isolation-debug**: Contains all fixes + comprehensive logging (4 commits)

**Files Modified**:
- `lib/services/local-storage.ts` - Per-user database naming, setUserId/close methods
- `lib/contexts/auth-context.tsx` - Database switching on auth changes, router refresh
- `lib/hooks/use-recent-history.ts` - Per-user localStorage keys
- `lib/stores/data-store.ts` - Auth-aware initialization, reset() method
- `app/(dashboard)/layout.tsx` - Wait for auth before initialization
- `lib/auth/get-user.ts` - Debugging logs (debug branch only)
- `app/api/cards/route.ts` - Debugging logs (debug branch only)
- `lib/server/cards.ts` - Debugging logs (debug branch only)

**Commits** (on user-isolation-debug):
1. Initial user isolation fixes (IndexedDB + recently viewed + race condition + auth cache)
2. Server-side debugging logs added to getCurrentUser
3. Server-side debugging logs added to /api/cards
4. Server-side debugging logs added to listCards with foreign card detection

**Current Status**:
- 4 out of 5 isolation problems fixed
- Server-side data leak still under investigation
- Comprehensive logging in place to identify leak source
- Main branch kept clean, all work on user-isolation-debug branch

**Next Steps for Continuation**:
1. Deploy `user-isolation-debug` branch to Vercel for testing
2. Test card creation:
   - Create URL card in Account A
   - Switch to Account B
   - Verify card does NOT appear in Account B
3. Check Vercel server logs for debugging output:
   - Look for userId mismatch between getCurrentUser → API → listCards
   - Look for "🚨 DATA LEAK DETECTED" alert
   - Track userId through entire request chain
4. Identify exact layer where user isolation breaks:
   - Is Supabase returning wrong user?
   - Is API middleware failing to authenticate correctly?
   - Is database WHERE clause not filtering?
5. Fix root cause once identified
6. Remove debugging logs
7. Merge user-isolation-debug to main
8. Verify in production with multiple test accounts

**User Feedback**:
- "Okay, it seems to be working. But there is one issue. The recently viewed items..." (Led to fix #2)
- "Nope, not isolated still. If I create cards on one or the other, it creates it on the other still. Notes don't seem to, but URLs seem to be duplicating..." (Led to debug logging)
- "We need to make this a different branch, not sure why this is getting put on main" (Led to branch cleanup)

**Impact**: Critical security vulnerability partially addressed. Local storage isolation complete. Server-side isolation debugging in progress. Cannot deploy to production until fully resolved.

---

### Date: January 2, 2025 - Calendar View Improvements & Sidebar Control System

**Accomplished**:

1. **Implemented Calendar Sidebar Control Panel**
   - Created `components/control-panel/calendar-controls.tsx` with comprehensive calendar controls
   - Features: Month grid selector (3x4 for Jan-Dec), content type filters, quick actions, upcoming events
   - Month grid replaces center panel navigation arrows for more intuitive month jumping
   - Content filters: Movies/Shows, Concerts/Events, Deadlines, Product Launches, Other Events, Daily Notes
   - Quick actions: Jump to Today, dynamic View This Week/Month toggle
   - Upcoming events section shows next 5 chronologically ordered events with "View all" link

2. **Created Day Details Panel**
   - Created `components/control-panel/day-details-panel.tsx` - slides in when day is clicked
   - Shows daily note (if exists) and all scheduled cards for selected day
   - "Add Event" button opens modal using createPortal to escape sidebar stacking context
   - Close button returns to calendar controls (calls openCalendarControls())
   - ESC key handling integrated with dashboard layout

3. **Implemented Week View**
   - Created `components/calendar/week-view.tsx` with horizontal columns layout
   - Shows 7 days side-by-side in compact vertical columns (grid-cols-7)
   - Each day shows: day name, date, daily note, scheduled cards (scrollable)
   - Dynamic toggle button in calendar controls switches between "View This Week" and "View This Month"

4. **Created Add Event Modal**
   - Created `components/modals/add-event-modal.tsx` for adding scheduled events
   - Glass morphism styling with z-[200] for proper stacking
   - Uses createPortal to render at document.body (escapes sidebar hierarchy)
   - Allows adding title and URL for events on specific dates

5. **Built Calendar State Management**
   - Created `lib/hooks/use-calendar-store.ts` - Zustand store for calendar-specific state
   - Manages: currentMonth, viewMode ("month" | "week"), selectedDay, contentFilters
   - Actions: setCurrentMonth, setViewMode, setSelectedDay, toggleContentFilter, clearContentFilters

6. **Updated Panel Store for Calendar**
   - Added "calendar-controls" and "day-details" content types to panel store
   - Fixed sidebar persistence: close() and toggle() now preserve previousContentType
   - Sidebar correctly restores to calendar controls when toggling on/off in calendar view
   - ESC key handling for day-details panel in layout

7. **Fixed Multiple UX Issues**
   - **Issue 1: Sidebar persistence** - Fixed close() to store previousContentType, toggle() to restore it
   - **Issue 2: Close Daily View showing blank screen** - Changed to openCalendarControls() instead of restorePreviousContent()
   - **Issue 3: Add Event modal clipped by sidebar** - Used createPortal with z-[200] to render at document.body
   - **Issue 4: TypeScript error** - Fixed variable name mismatch (setSelectedDate vs setSelectedDay)
   - **Issue 5: View This Week just jumped to today** - Added CalendarViewMode type and proper week view switching
   - **Issue 6: Week view layout was vertical** - Changed to grid-cols-7 with compact columns

**Key Technical Details**:

**Calendar Store State**:
```typescript
type CalendarState = {
  currentMonth: Date;
  viewMode: CalendarViewMode; // "month" | "week"
  selectedDay: Date | null;
  contentFilters: CalendarContentFilter[];
  setCurrentMonth: (date: Date) => void;
  setViewMode: (mode: CalendarViewMode) => void;
  setSelectedDay: (date: Date | null) => void;
  toggleContentFilter: (filter: CalendarContentFilter) => void;
  clearContentFilters: () => void;
};
```

**Content Filters for Future AI Detection**:
```typescript
export type CalendarContentFilter =
  | "movies-shows"
  | "concerts-events"
  | "deadlines"
  | "product-launches"
  | "other-events"
  | "daily-notes";
```

**Panel Store Updates**:
- Added "calendar-controls" and "day-details" to PanelContentType
- close() now preserves previousContentType unless closing temporary panels
- toggle() restores previous content type or defaults to library-controls

**Portal Pattern for Modal**:
```typescript
{isMounted && showAddEventModal && createPortal(
  <AddEventModal
    open={showAddEventModal}
    onClose={() => setShowAddEventModal(false)}
    scheduledDate={selectedDay}
  />,
  document.body
)}
```

**Files Created**:
- `components/control-panel/calendar-controls.tsx`
- `components/control-panel/day-details-panel.tsx`
- `components/calendar/week-view.tsx`
- `components/modals/add-event-modal.tsx`
- `lib/hooks/use-calendar-store.ts`

**Files Modified**:
- `lib/hooks/use-panel-store.ts` - Added calendar content types, fixed close/toggle
- `app/(dashboard)/calendar/page.tsx` - Uses calendar store, renders correct view
- `app/(dashboard)/layout.tsx` - Integrated CalendarControls and DayDetailsPanel, ESC handling
- `components/calendar/custom-calendar.tsx` - Accepts currentMonth prop from store

**Branch**: `calendar-view-improvements`

**Impact**: Calendar view now has dedicated sidebar control panel that only appears in calendar view, with full month navigation, content filtering, week view toggle, and day detail exploration. Sidebar transitions smoothly like other view-specific sidebars.

---

### Date: October 31, 2025 - Context Menu System & UI Fixes

**Accomplished**:

1. **Implemented Reusable Context Menu System**
   - Created `hooks/use-context-menu.ts` - Custom hook for context menu state management
   - Created `components/ui/generic-context-menu.tsx` - Reusable wrapper with array-based API
   - Supports icons, separators, submenus, shortcuts, destructive actions
   - Simple array-based configuration for easy implementation
   - TypeScript types for full type safety

2. **Created Comprehensive Context Menu Audit**
   - Documented all existing context menu patterns in codebase
   - Created `CONTEXT_MENU_AUDIT.md` with comprehensive analysis
   - Identified 3 existing patterns, 5 components with menus, 6+ missing menus
   - Provided recommendations for standardization

3. **Fixed Left Sidebar Context Menu**
   - Added context menus to Pawkit collections in left navigation panel
   - Previously showed browser default menu, now shows custom menu
   - Menu items: Open, New sub-collection, Rename, Move, Delete
   - Used GenericContextMenu wrapper for consistency

4. **Fixed Z-Index Issues**
   - Context menus were rendering behind sidebar (z-index 102)
   - Updated GenericContextMenu to use z-[9999] on both ContextMenuContent and ContextMenuSubContent
   - Documented z-index hierarchy: z-0 (base) → z-10 (floating) → z-50 (overlays) → z-[102] (sidebars) → z-[150] (modals) → z-[9999] (context menus)

5. **Fixed PAWKITS Header Context Menu**
   - First attempt: Wrapping PanelSection didn't work (asChild issue)
   - Technical learning: GenericContextMenu with asChild only works with simple elements, not complex components
   - Solution: Inlined header structure and wrapped button directly
   - Menu items: View All Pawkits, Create New Pawkit

6. **Replaced window.prompt() with Glassmorphism Modal**
   - Created custom modal for renaming Pawkits
   - Features: Auto-focus, Enter/Escape handling, loading state, toast notification
   - Modal styling: bg-white/5, backdrop-blur-lg, border-white/10, shadow-glow-accent
   - Maintains visual consistency with app design language

7. **Fixed Move Menu UX**
   - Replaced text prompt asking for slug with visual submenu
   - Shows all available Pawkits in hierarchical structure
   - Created `buildMoveMenuItems()` helper function for recursive menu building
   - Filters out current collection (can't move into itself)

8. **Fixed ESC Key Handling in Modal**
   - Problem: ESC was closing sidebar instead of modal (event bubbling)
   - Solution: Added useEffect with document-level keydown listener
   - Used capture phase (third param = true) to intercept before bubbling
   - Calls stopPropagation() and preventDefault()
   - Behavior: First ESC closes modal, second ESC closes sidebar

9. **Updated Skills Documentation**
   - Updated roadmap skill with all completed work from October 31, 2025
   - Updated troubleshooting skill with 4 new context menu issues (Issues #11-14)
   - Updated UI/UX skill with comprehensive Context Menu section including z-index hierarchy

**Key Technical Details**:

**Z-Index Hierarchy**:
```
z-0       // Base layer (most content)
z-10      // Floating elements (cards, pills)
z-50      // Overlays (drawers, modals)
z-[102]   // Sidebars (left/right panels)
z-[150]   // Modal overlays (backgrounds)
z-[9999]  // Context menus (ALWAYS ON TOP)
```

**Event Capture Pattern for Modals**:
```typescript
useEffect(() => {
  if (!modalOpen) return;

  const handleEsc = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      e.stopPropagation();
      e.preventDefault();
      handleClose();
    }
  };

  // Capture phase to intercept before parent handlers
  document.addEventListener("keydown", handleEsc, true);
  return () => document.removeEventListener("keydown", handleEsc, true);
}, [modalOpen]);
```

**asChild Prop Limitation**:
- Only works with simple HTML elements (button, div, a)
- Does NOT work with complex components
- Solution: Inline component structure and wrap specific element

**Files Modified**:
- `hooks/use-context-menu.ts` (Created)
- `components/ui/generic-context-menu.tsx` (Created)
- `CONTEXT_MENU_AUDIT.md` (Created)
- `components/navigation/left-navigation-panel.tsx` (Multiple updates)
- `components/pawkits/sidebar.tsx` (Updated to use GenericContextMenu)
- `.claude/skills/pawkit-roadmap/SKILL.md` (Updated)
- `.claude/skills/pawkit-troubleshooting/SKILL.md` (Updated)
- `.claude/skills/pawkit-ui-ux/SKILL.md` (Updated)

**Commits**: Multiple commits on branch `claude/fix-main-bugs-011CUfH4XKwHPJ29z3vN8LRb`

**Impact**: Standardized context menu system across application, improved UX consistency, fixed multiple visual and interaction bugs

---

### Date: October 30, 2025 (Night) - Delete Synchronization Bug Fixes

**Accomplished**:

1. **Fixed Critical Bug: Deleted Cards Injecting Into State**
   - **Problem**: Library showing deleted cards even though sync works correctly
   - **Root Cause**: When cards are updated with conflicts or successful syncs, code fetches from server and maps into state using `.map(c => c.id === id ? serverCard : c)`
   - If `serverCard.deleted === true`, deleted card injected into state, bypassing all filtering
   - **Found 5 Locations** where this happened in data-store.ts:
     - Lines 659, 676: Conflict resolution
     - Line 712: Successful update
     - Line 552: Metadata fetch
     - Line 535: Card creation sync
   - **Fix**: Added checks before all `.map()` operations to filter out deleted cards
   - Commit: 85ed692

2. **Fixed Critical Bug: Deduplication Corrupting Data**
   - **Problem**: Navigating to Library page corrupts IndexedDB - 25 cards incorrectly marked as deleted
   - **Root Cause**: `deduplicateCards()` called `localDb.deleteCard()` to remove duplicates
   - `deleteCard()` performs SOFT DELETE (sets `deleted=true`) not hard delete
   - Duplicate cards were being marked as deleted in IndexedDB
   - **Fix**: Changed line 100 in data-store.ts from `localDb.deleteCard()` to `localDb.permanentlyDeleteCard()`
   - Commit: 61ba60e

3. **Fixed Two More Soft Delete Bugs**
   - After comprehensive search, found TWO MORE places using soft delete for temp cards:
     - data-store.ts:531 - `addCard()` replacing temp card with server card
     - sync-service.ts:661 - Sync service replacing temp card with real ID
   - Both were using `deleteCard()` instead of `permanentlyDeleteCard()`
   - **Fix**: Changed both locations to use hard delete
   - Commit: 699e796

4. **Created Debug Page for Database Comparison**
   - Built `/debug/database-compare` page to compare Supabase vs IndexedDB
   - Shows total/active/deleted counts for both server and local
   - Identifies cards that exist only on server or only locally
   - Identifies deletion mismatches (server=active but local=deleted)
   - Added "Resolve Mismatches" button to fix conflicts (server as source of truth)
   - Added "Force Full Sync" button to clear local and re-download from server
   - Commit: 76fe9f4

5. **Added Comprehensive Logging for Missing Cards Investigation**
   - **Problem**: Force Full Sync shows "Perfect Sync" but 26 cards are missing
   - **Added Logging to Force Full Sync**:
     - Track save success/failure for each card
     - Immediate verification of IndexedDB contents
     - Compare server vs IndexedDB counts
     - List missing cards with IDs and titles
   - **Added Logging to Deduplication**:
     - Show input/output counts
     - Display which cards marked as duplicates
     - Show card details (ID, title, URL)
     - Final stats breakdown
   - Commit: b56dff1

6. **Fixed Fifth Bug: Deduplication Removing Legitimate Server Cards**
   - **Problem**: Comprehensive logging revealed 26 cards being removed as "duplicates"
   - **Root Cause**: Priority 3 logic treated "both real OR both temp" together
   - When both cards had real server IDs, deduplication removed one based on createdAt
   - These were legitimate separate cards that happened to have same title
   - Test cards with titles like "SYNC TEST" were being removed
   - **Fix**: Added explicit Priority 3 check - skip deduplication when BOTH are real server cards
   - Real server cards are ALWAYS legitimate, even if they share title/URL
   - Deduplication now ONLY removes temp cards
   - Commit: 476d04a

**Key Technical Details**:

**Critical Distinction - Soft Delete vs Hard Delete**:
```typescript
// SOFT DELETE (for user deletions to trash):
async deleteCard(id: string): Promise<void> {
  const card = await this.db.get('cards', id);
  if (card) {
    card.deleted = true;
    card.deletedAt = new Date().toISOString();
    await this.db.put('cards', card);
  }
}

// HARD DELETE (for internal cleanup):
async permanentlyDeleteCard(id: string): Promise<void> {
  await this.db.delete('cards', id);
}
```

**Bug Pattern**: Using soft delete when hard delete is needed causes cards to be marked as deleted and synced across devices.

**Files Modified**:
- `lib/stores/data-store.ts` - Fixed 3 locations (lines 100, 531, and 5 state injection points)
- `lib/services/sync-service.ts` - Fixed 1 location (line 661)
- `app/(dashboard)/debug/database-compare/page.tsx` - Created debug page with comparison and sync tools
- `lib/services/local-storage.ts` - Added `includeDeleted` parameter to getAllCards/getAllCollections
- `lib/validators/card.ts` - Added includeDeleted to cardListQuerySchema
- `lib/server/cards.ts` - Updated listCards to support includeDeleted
- `app/api/cards/route.ts` - Pass includeDeleted parameter
- `app/(dashboard)/library/page.tsx` - Added debug logging

**Commits**:
- 3a711b1 - Add debug logging to library page for deleted cards
- 259e4f0 - Update deletion filters to explicit checks
- 76fe9f4 - Add Resolve Mismatches feature to debug page
- 85ed692 - Fix deleted cards injecting into state via .map() operations
- 61ba60e - Fix deduplication using soft delete instead of hard delete
- 699e796 - Fix two more locations using soft delete for temp cards
- b56dff1 - Add comprehensive logging for missing cards investigation
- 476d04a - Fix deduplication removing legitimate server cards
- dcee287 - Update skills with delete sync bug fixes
- d2b881c - Merge fix/delete-sync to main

**Impact**: All 5 delete synchronization bugs fixed - deleted cards no longer appear in library, data no longer corrupts on navigation, all 26 missing cards preserved

**Result**: Perfect sync achieved! Force Full Sync now shows "Perfect Sync" with all cards present. Merged to main and deployed.

---

### Date: October 30, 2025 (Evening) - Production Deployment & Environment Sync

**Accomplished**:

1. **Database Connection Issues Resolved**
   - Database password was rotated in Supabase
   - Updated local `.env.local` and `.env` files with new password
   - Added critical `&schema=public` parameter to `DATABASE_URL`
   - URL-encoded special characters in password (`@` → `%40`)
   - Fixed: `postgresql://...?pgbouncer=true&schema=public`

2. **Successfully Merged feat/multi-session-detection to Main**
   - Resolved merge conflicts in:
     - `app/(dashboard)/layout.tsx` - Combined multi-session features with help center UI
     - `components/command-palette/command-palette.tsx` - Added both `footer` and `initialValue` props
   - All multi-session detection features now in production
   - Commits: 6f99d4e (merge), b907b42 (config updates)

3. **Fixed Content Security Policy (CSP) Blocking Next.js**
   - **Problem**: Production CSP was too restrictive, blocked Next.js runtime
   - **Root Cause**: Missing `'unsafe-eval'` and `'unsafe-inline'` in production CSP
   - **Fix**: Updated `next.config.js` to allow required Next.js directives
   - Changed `script-src 'self' blob:` to `script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:`
   - Changed `script-src-elem 'self' blob:` to `script-src-elem 'self' 'unsafe-inline' blob:`
   - Commit: 8b87241

4. **Environment Configuration Synchronized**
   - Local environment now matches production requirements
   - All environments use same database credentials
   - Schema parameter ensures Prisma migrations work correctly
   - Dev server running successfully on localhost:3000

**Key Technical Details**:

**DATABASE_URL Format**:
```bash
# Before (broken)
postgresql://...@host:6543/postgres?pgbouncer=true

# After (working)
postgresql://...@host:6543/postgres?pgbouncer=true&schema=public
```

**CSP Requirements for Next.js**:
- `'unsafe-eval'` - Required for Next.js runtime and webpack chunks
- `'unsafe-inline'` - Required for inline scripts Next.js generates
- Both needed even in production for framework to function

**Files Modified**:
- `.env.local` - Updated database credentials and schema parameter
- `.env` - Updated database credentials and schema parameter
- `next.config.js` - Fixed CSP configuration for production
- `app/(dashboard)/layout.tsx` - Resolved merge conflicts
- `components/command-palette/command-palette.tsx` - Resolved merge conflicts
- `.claude/skills/pawkit-project-context/SKILL.md` - This session

**Production Readiness**:
- ✅ Multi-session detection merged to main
- ✅ Database migrations applied
- ✅ CSP configured correctly
- ✅ Environment variables synchronized
- ✅ Local dev server working
- ⚠️ Vercel DATABASE_URL needs updating with new password

**Commits**:
- b907b42 - chore: merge remote changes and update local config
- 6f99d4e - Merge feat/multi-session-detection into main
- 8b87241 - fix: update CSP to allow Next.js scripts in production

**Next Steps**:
- Update Vercel environment variable `DATABASE_URL` with new password
- Monitor production deployment after Vercel redeploys
- Consider removing debug console.log statements (24 total)
- Verify card creation working in production

---

### Date: October 30, 2025 (Morning) - Note Creation Bug Fixes & Database Constraint Repair

**Accomplished**:

1. **Fixed Missing useMemo Import**
   - Added `useMemo` to React imports in `app/(dashboard)/layout.tsx`
   - Caused ReferenceError when navigating to /notes page
   - dailyNoteExists calculation required useMemo hook
   - Commit: 49ae3ee

2. **Fixed Note Creation Tags Parameter Bug**
   - `handleCreateNote` functions weren't accepting or passing `tags` parameter
   - Modal correctly sent `tags: ["daily"]` for daily notes and `tags: undefined` for regular notes
   - But handlers in layout.tsx and omni-bar.tsx ignored the tags
   - Result: Daily note tag never applied even when user selected "Daily Note"
   - Fixed by adding `tags?: string[]` to function signature and passing to `addCard`
   - Locations fixed:
     - `app/(dashboard)/layout.tsx` handleCreateNote
     - `components/omni-bar.tsx` handleCreateNote
   - Commit: 9562bec

3. **Fixed Note Creation State Persistence Bug**
   - Users reported all notes defaulting to daily notes
   - Root cause: Modal state persisted between opens
   - If user clicked "Daily Note" then closed modal, `noteType` stayed "daily-note"
   - Next open showed "Markdown" selected but created daily note
   - Fixed by adding useEffect to reset all modal state when opening:
     - Reset noteType to "md-note"
     - Reset title, error, showTemplates
     - Load last used template from localStorage
   - Also added `dailyNoteExists` prop to all CreateNoteModal instances
   - Commit: d5d0c29

4. **Fixed Critical Database Constraint Bug**
   - **Problem**: Creating notes triggered P2002 duplicate errors, returned deleted daily notes
   - **Root Cause**: Full unique constraint on `(userId, url)` applied to ALL card types
   - **Should Be**: Partial unique index with `WHERE type = 'url'` (only applies to URL cards)
   - **Impact**: Every note with `url: ""` triggered duplicate error
   - **Debugging Process**:
     - Added extensive logging to track card creation flow
     - Discovered server returning deleted card: `"deleted": true, "deletedAt": "2025-10-30T01:41:34.517Z"`
     - P2002 error showed: `Target: [ 'userId', 'url' ]`
     - Error handler only looked for `type: "url"` cards, missed md-note duplicates
     - Found old deleted daily note being returned instead of creating new note

5. **Database Migration to Fix Constraint**
   - Created migration: `prisma/migrations/20251029192328_fix_card_unique_constraint/migration.sql`
   - Migration actions:
     1. Drop any full unique constraints on (userId, url)
     2. Drop non-partial unique indexes
     3. Create PARTIAL unique index with `WHERE type = 'url'`
   - Result: Notes can have duplicate/empty URLs freely
   - URL cards still prevented from duplicates
   - Commit: a09bc7b

6. **Improved Error Handling for Duplicates**
   - Updated `lib/server/cards.ts` createCard function
   - Changed duplicate lookup to match card type (not just "url")
   - Added `deleted: false` filter to exclude deleted cards
   - Added detailed logging for P2002 errors
   - Commit: a09bc7b (same as migration)

**Debug Logging Added**:
```typescript
// components/modals/create-note-modal.tsx
console.log('[CreateNoteModal] Creating note with:', { noteType, actualType, tags, title });

// lib/stores/data-store.ts
console.log('[DataStore V2] Syncing card to server with payload:', JSON.stringify(cardData, null, 2));
console.log('[DataStore V2] Server response:', JSON.stringify(serverCard, null, 2));

// lib/server/cards.ts
console.log('[createCard] Attempting to create card:', { userId, type, url, title });
console.log('[createCard] P2002 ERROR - Duplicate detected for type:', cardType, 'URL:', url, 'Target:', error.meta?.target);
```

**Files Modified**:
- `app/(dashboard)/layout.tsx` - Added useMemo import, fixed handleCreateNote tags
- `components/omni-bar.tsx` - Fixed handleCreateNote tags parameter
- `components/modals/create-note-modal.tsx` - Added state reset useEffect, debug logging
- `lib/stores/data-store.ts` - Added debug logging for sync payload and response
- `lib/server/cards.ts` - Improved error handling, added logging
- `prisma/migrations/20251029192328_fix_card_unique_constraint/migration.sql` - New migration
- `.claude/skills/pawkit-troubleshooting/SKILL.md` - Added Issues #10 and #11
- `.claude/skills/pawkit-project-context/SKILL.md` - This session

**Technical Details**:

**The Full Error Chain**:
1. User creates note with title "Testing notes again"
2. Client sends: `{ type: "md-note", title: "Testing notes again", url: "", tags: undefined }`
3. Server attempts to create card
4. Database rejects with P2002: `UNIQUE constraint failed: Card.userId_url`
5. Server catches P2002, looks for existing card
6. Finds deleted daily note from 2025-10-29: `"deleted": true, "tags": ["daily"]`
7. Server returns deleted card (WRONG!)
8. Client shows card briefly, then card disappears on refresh (because deleted=true)
9. User sees 409 Conflict error, no card created

**The Fix**:
1. Database migration removes full constraint
2. Adds partial index: `WHERE type = 'url'` (notes excluded)
3. Server error handler now:
   - Looks for cards of same type (md-note, text-note, url)
   - Excludes deleted cards: `deleted: false`
   - Returns existing non-deleted card or re-throws error

**Impact**: All note creation bugs resolved - users can now create regular notes, markdown notes, and daily notes correctly

**Commits**:
- 49ae3ee - fix: add missing useMemo import in dashboard layout
- 9562bec - fix: pass tags parameter when creating notes
- d5d0c29 - fix: reset note modal state on open + add dailyNoteExists prop
- d893323 - debug: add logging to track note creation tags
- 3cbf441 - fix: exclude deleted cards from duplicate detection
- a09bc7b - fix: remove full unique constraint on Card(userId,url)

**Next Steps**:
- Monitor note creation in production
- Watch for any remaining P2002 errors in logs
- Consider removing debug logging once verified stable

---

### Date: October 29, 2025 - User Feedback & Discoverability Focus (REVISED)

**Accomplished**:

1. **Received and Prioritized User Feedback**
   - Conducted user testing session
   - Identified key pain points with collection management
   - Added 7 new UX improvement tasks to roadmap
   - Organized into HIGH and MEDIUM priority sections

2. **User Feedback Summary**
   - **Finding**: "Renaming collections not intuitive"
     - **Solution**: Added inline Pawkit rename (30 min) - click to edit like Finder/Explorer

   - **Finding**: "Adding to collections unclear (right-click works but not discoverable)"
     - **Solution**: Make 'Add to Pawkit' more prominent in context menu (20 min)
     - **Solution**: Add visual drag-and-drop feedback (45 min)
     - **Solution**: Add onboarding tooltips for new users (1 hour)

   - **Finding**: "Visual aspect of app is strong (bookmarking images/design)"
     - **Validation**: Glass morphism with purple glow resonating with users
     - **Action**: Enhance drag interactions to match visual quality

   - **Finding**: "PKM-lite positioning working well"
     - **Validation**: Users understand the product as a lighter alternative to heavy PKM tools
     - **Action**: Continue balancing simplicity with power features

3. **Roadmap Updated with Pawkit UX Tasks**

   **HIGH PRIORITY - Quick Wins** (added to Pre-Merge Critical):
   - Inline Pawkit rename (30 min)
   - 'Add to Pawkit' in context menu (20 min)
   - Visual drag-and-drop feedback (45 min)
   - Onboarding tooltips for Pawkits (1 hour)

   **MEDIUM PRIORITY - Enhanced Features** (Next Sprint):
   - Keyboard shortcut for Add to Pawkit (45 min)
   - Multi-select bulk add to Pawkit (2 hours)
   - Quick-add from card detail view (30 min)

4. **Strategic Insights**
   - Pawkits are core feature but discoverability is low
   - Right-click and drag work but users don't discover them organically
   - Need progressive disclosure: tooltips → visual feedback → power shortcuts
   - Quick wins can be implemented rapidly (all under 1 hour each)
   - Note: Internally called "collections" in code, but "Pawkits" in all UI text

**Files Modified**:
- `.claude/skills/pawkit-roadmap/SKILL.md` - Added Collection UX sections
- `.claude/skills/pawkit-project-context/SKILL.md` - This session

**REVISION - Discoverability Focus**:

After initial roadmap update, user clarified the real insight:
- **Key Finding**: Features already exist and work perfectly (right-click, CMD+select, hover+button)
- **Real Problem**: Users don't discover these features
- **Solution Shift**: Guide users to existing features instead of building new ones

**New Approach - 4 Discoverability Tasks** (5.75 hours):
1. **Interactive onboarding checklist** (3 hours) - PRIMARY SOLUTION
   - Step-by-step guided workflow: Create Pawkit → Add cards → Organize
   - Demonstrates right-click, drag-drop, hover+button in context
   - Tracks progress, reopenable from settings

2. **Inline Pawkit rename** (30 min)
   - Click-to-edit with edit icon affordance
   - Makes renaming discoverable through direct interaction

3. **Enhanced visual affordances** (45 min)
   - Stronger selection states (purple glow)
   - Drop zone highlighting during drag
   - Pulse animation on first hover+button interaction

4. **Empty state guidance** (30 min)
   - "Create your first Pawkit" when cards exist but no Pawkits
   - "Right-click cards or drag them here" in empty Pawkits

**Superseded**: 7 previous tasks that tried to rebuild/enhance existing features
- 'Add to Pawkit' in context menu - Already perfect in card-context-menu.tsx:137
- Onboarding tooltips - Replaced by comprehensive checklist
- Visual drag-and-drop feedback - Now part of enhanced affordances
- 3 power-user features - Moved to Phase 3 (keyboard shortcuts, bulk ops)

**Current Status**:
- Multi-session work complete and documented
- Discoverability improvements prioritized (4 new tasks)
- Interactive onboarding checklist is PRIMARY FOCUS (3 hours)
- 7 redundant tasks superseded/moved

**Next Steps**:
- Implement interactive onboarding checklist (3 hours)
- Then inline rename, visual affordances, empty states (~1.75 hours)
- Manual multi-session test still pending
- Then merge to main

---

### Date: October 29, 2025 - UI Polish & Debugging Session

**Accomplished**:

1. **Fixed Library Tags UI Consistency**
   - Updated Library view tags from checkboxes to glass pill buttons
   - Now matches Pawkits view pattern (purple glow on hover/selected)
   - Documented as canonical pattern in UI/UX skill
   - Commit: 58132cd

2. **Debugged "Failed to sync settings to server" Error**
   - Investigated supposed view-settings sync failure
   - **Root Cause**: Confusion about feature state - no server sync exists
   - **Reality**: View settings are localStorage-only (intentional design)
   - Clarified architecture:
     - Each view stores layout in localStorage (library-layout, notes-layout, etc.)
     - No server sync currently implemented
     - Per-device preferences by design
   - Documented in troubleshooting skill to prevent future confusion

3. **Verified Skills System Working Well**
   - Successfully navigated 9 comprehensive skills during debugging
   - Skills provided accurate context about codebase state
   - Added troubleshooting entry for clarity on localStorage architecture

**Key Findings**:

- View settings pattern: `localStorage.getItem('library-layout')` etc.
- No `view-settings-store.ts` file exists (was referenced in old summary)
- No `/api/user/view-settings` endpoint exists
- Server sync for view settings is on roadmap but not implemented
- Current implementation works as intended (localStorage-only)

**Files Modified**:
- `.claude/skills/pawkit-troubleshooting/SKILL.md` - Added sync error clarification
- `.claude/skills/pawkit-project-context/SKILL.md` - This session
- `.claude/skills/pawkit-conventions/SKILL.md` - Added view settings pattern

**Current Status**: 4 UI polish tasks remain on roadmap

**Next Steps**:
- Add server-side view settings sync to roadmap
- Continue with remaining UI polish tasks
- Manual multi-session test still pending from previous session

---

### Date: October 28, 2025 - Pre-merge Testing Complete

**Accomplished**:

1. **Created Comprehensive Test Suite** (91% pass rate)
   - Built `/test/pre-merge-suite` with 7 test sections
   - 42 total tests covering all core functionality
   - Visual test runner with color-coded results
   - Sections: CRUD Operations, Den Migration, Data Validation, Private Pawkits, Multi-Session Sync, Critical User Flows, API Endpoints

2. **Fixed API Validation Bugs**
   - Resolved variable scope issue in `/app/api/cards/route.ts`
   - Fixed `ReferenceError: user is not defined` in error handlers
   - API now returns proper 400/422 validation errors instead of 500 crashes
   - Added array validation for all test data loading

3. **Den Migration Ready and Tested**
   - Verified `inDen` field deprecated (no cards have `inDen=true`)
   - Confirmed `the-den` collection exists and is marked private
   - Tested Den filtering in Library view
   - Verified `is:den` search operator functionality
   - Den UI routes accessible

4. **All Core Functionality Verified**
   - Card CRUD operations (create, read, update, delete)
   - Collection/Pawkit management
   - Private collection isolation
   - Multi-session conflict detection
   - Search and filter workflows
   - Tag management
   - Data validation and error handling

**Test Results**:
- 38 passed ✓
- 4 warnings ⚠ (expected - features pending manual testing)
- 0 failed ✗

**Current Status**: Ready to merge `feat/multi-session-detection` to main

**Next Steps**:
1. Manual multi-session test (open 2 browser tabs, verify conflict detection)
2. Merge to main
3. Deploy to production

---

### Date: October 27, 2025 - Multi-Session Detection Implementation

**Accomplished**:

1. **Implemented Event-Based Multi-Session Management**
   - Created `/lib/stores/multi-session-store.ts` with localStorage-based tracking
   - Added write guards to prevent data conflicts
   - Implemented cross-tab communication via storage events
   - No polling - single registration on page load

2. **Fixed Collection Reference Bugs**
   - Corrected ID/slug mismatches across all views
   - Updated Library, Notes, Tags, and Pawkit detail pages
   - Ensured cards always reference collections by slug, never ID
   - Created `pawkit-conventions.md` skill to prevent future mistakes

3. **Added Multi-Session UI Components**
   - Created banner in `/components/ui/multi-session-banner.tsx`
   - Shows warning when multiple sessions detected
   - Provides "Take Control" button to become active device
   - Auto-hides when only one session active

**Technical Details**:
- localStorage key: `pawkit_active_device`
- Session ID format: `${timestamp}_${random()}`
- Heartbeat interval: 5 seconds
- Write guard checks before all mutations

---

## Architecture Overview

### Data Flow
```
IndexedDB (source of truth) → Zustand (UI state) → Server (backup/sync)
```

### Key Stores
- **data-store.ts** - Cards and collections (Zustand + IndexedDB)
- **multi-session-store.ts** - Session tracking and write guards
- **settings-store.ts** - User preferences
- **view-settings-store.ts** - View-specific UI state

### Critical Files
- `/lib/stores/data-store.ts` - Main data store with deduplication
- `/lib/stores/multi-session-store.ts` - Session management
- `/lib/types.ts` - Shared TypeScript types
- `/lib/server/cards.ts` - Server-side card operations
- `/app/api/cards/route.ts` - Cards API endpoints
- `/app/api/pawkits/[id]/route.ts` - Collections API endpoints

---

## Known Issues

### Resolved
- ✓ ID/slug mismatches in collection filtering
- ✓ API variable scope causing 500 errors
- ✓ Test data loading assumes arrays without validation
- ✓ Multi-session write conflicts

### Pending
- Manual multi-session testing needed
- Den migration final verification in production

---

## Feature Flags & Environment

### Environment Variables
- `DATABASE_URL` - PostgreSQL connection
- `NEXTAUTH_SECRET` - Authentication secret
- `NEXTAUTH_URL` - App URL

### Feature Status
- ✓ Multi-session detection - Complete
- ✓ Den migration - Ready
- ✓ Private pawkits - Complete
- ✓ Search operators - Complete
- ⚠ Collaborative editing - Not started

---

## Testing Strategy

### Pre-Merge Test Suite
Location: `/app/(dashboard)/test/pre-merge-suite/page.tsx`

**Test Sections**:
1. CRUD Operations (9 tests) - Card creation, updates, deletion, restore
2. Den Migration (6 tests) - inDen field, the-den collection, filtering, search
3. Data Validation (4 tests) - Duplicates, invalid data, orphaned refs, field constraints
4. Private Pawkits (4 tests) - Creation, isolation, access control, persistence
5. Multi-Session Sync (7 tests) - Conflict detection, device tracking, write guards
6. Critical User Flows (4 tests) - Collection mgmt, search, tags, bulk operations
7. API Endpoints (8 tests) - GET, POST, PATCH, DELETE for cards and pawkits

### Manual Testing Checklist
- [ ] Open 2 browser tabs
- [ ] Verify multi-session banner appears
- [ ] Test "Take Control" button
- [ ] Verify write guards block inactive session
- [ ] Test card creation in both sessions
- [ ] Verify deduplication works
- [ ] Test Den filtering in Library
- [ ] Test private pawkit isolation

---

## Development Principles

### 1. Local-First Architecture
- IndexedDB is primary source of truth
- Server is backup/sync layer
- Optimistic updates with background sync

### 2. Data Model Consistency
- Cards ALWAYS reference collections by `slug`, never `id`
- Use `CollectionNode` type consistently
- Clear variable naming (e.g., `privateCollectionSlugs`)

### 3. Multi-Session Safety
- Write guards on all mutations
- Event-based session tracking (no polling)
- Clear conflict resolution UI

### 4. Testing First
- Pre-merge test suite required
- Visual test runner for quick feedback
- Manual testing for UX-critical features

---

**Last Updated**: 2025-01-13
**Updated By**: Claude Code
**Reason**: Fixed note double-creation bug (Issue #23), added removeByTempId to sync queue, documented in troubleshooting and sync patterns skills

---

### Date: January 23, 2025 - Mobile App: Glass UI + Local-First Sync

**Status**: ✅ COMPLETED & PUSHED TO MAIN
**Priority**: 🎯 HIGH - Mobile Feature Parity
**Branch**: `main` (via cherry-pick from `feature/tiktok-embedding`)
**Impact**: Mobile app now has production-ready glass morphism UI and local-first storage with background sync

**Summary**: Comprehensive mobile app session implementing glass morphism design system and local-first architecture with AsyncStorage. Built swipeable panels, smart omnibar, real-time search, and background sync matching web app functionality.

#### 1. Glass Morphism UI System

**Components Created**:
- `ThreePanelLayout.tsx` - Main layout wrapper managing panels and background
- `SwipeableDrawer.tsx` - Glass panels with swipe gestures and animations
- `EdgeIndicators.tsx` - Purple gradient swipe hints
- `LeftPanel.tsx` - Collections browser panel
- `RightPanel.tsx` - Settings panel
- `Omnibar.tsx` - Smart search/create input with URL detection
- `GlassCard.tsx` - Card component with glass background
- `MasonryGrid.tsx` - 2-column dynamic height card layout
- `AnimatedBackground.tsx` - Gradient background

**Theme System**:
- Created `mobile/src/theme/glass.ts` with complete glass morphism palette
- Purple glow for interactions (#A855F7)
- Glass backgrounds with blur (iOS: BlurView, Android: translucent)
- Spacing, border radius, and shadow definitions

**Key Design Patterns**:
- iOS: True blur using `expo-blur` BlurView
- Android: Translucent backgrounds (better performance)
- 70% width, 82% height panels, vertically centered
- 16px rounded corners on all glass elements
- Purple glow on focus/interaction
- 300ms timing animations

#### 2. Swipe Gesture System

**Edge Detection**:
- 25px wide edge zones for swipe detection
- Left panel: Swipe right from left edge (0-25px)
- Right panel: Swipe left from right edge (screen width - 25px)
- 30% swipe threshold to trigger open/close

**Subtle Edge Indicators**:
- 2px wide purple gradient lines
- 150px height
- 5px from screen edge
- 0.2-0.3 opacity
- Hints at swipeable areas

**Critical Fixes**:
- Fixed panels stuck open (disabled background pointerEvents when panel open)
- Fixed keyboard covering omnibar (110px vertical offset)
- Fixed omnibar click area (TouchableOpacity wrapper with inputRef)

#### 3. Local-First Storage Architecture

**Storage Technology Decision**:
- **Attempted**: react-native-mmkv (high performance)
- **Blocker**: NitroModules not supported in Expo Go
- **Solution**: @react-native-async-storage/async-storage (Expo compatible)

**Local Storage Service** (`mobile/src/lib/local-storage.ts`):
- User-scoped keys: `pawkit_{userId}_{key}`
- Async-first API (all operations return Promises)
- Soft deletion pattern (marks `deleted: true`, doesn't remove)
- Automatic filtering of deleted items in `getAllCards()`
- Storage size tracking for debugging

**Key Patterns**:
```typescript
// Initialize for user
LocalStorage.initStorage(userId);

// Get all cards (auto-filters deleted)
const cards = await LocalStorage.getAllCards();

// Save card (updates existing or adds new)
await LocalStorage.saveCard(card);

// Soft delete (marks deleted)
await LocalStorage.deleteCard(id);

// Permanent delete (removes from storage)
await LocalStorage.permanentlyDeleteCard(id);
```

#### 4. Background Sync Service

**Sync Service** (`mobile/src/lib/sync-service.ts`):
- Bidirectional merge (local + server)
- Last-write-wins conflict resolution by `updatedAt` timestamp
- Rate limiting (minimum 30 seconds between syncs)
- Concurrent sync prevention (single sync at a time)

**Sync Strategy**:
1. Local AsyncStorage is always source of truth
2. Server is backup/sync layer between devices
3. On sync: MERGE server + local (never replace)
4. Conflicts: Last-write-wins by timestamp

**Flow**:
```typescript
1. User creates/updates card
2. Save to AsyncStorage immediately (instant UI)
3. Update UI optimistically
4. Background sync to server (async)
5. If conflict: Compare timestamps, newer wins
```

#### 5. App Initialization Flow

**Load Order**:
1. Initialize storage for user (`LocalStorage.initStorage(userId)`)
2. Load from AsyncStorage FIRST (instant UI, ~50ms)
3. Display cards immediately (no loading spinner)
4. Background sync after display (doesn't block UI)
5. Merge server changes if any

**Benefits**:
- App loads instantly even with 1000+ cards
- Works completely offline
- No "loading..." spinners for cached data
- Background sync updates data without disruption

#### 6. Smart Omnibar with URL Detection

**URL Detection** (`mobile/src/lib/utils.ts`):
- `isProbablyUrl(input)` - Detects URLs vs search queries
- Matches web app logic exactly
- Supports localhost, IP addresses, domains
- No whitespace allowed in URLs

**Domain Extraction**:
- `safeHost(url)` - Safely extracts hostname from URL
- Handles malformed URLs gracefully
- Used in API client for card creation
- **Fixes**: Mobile-created cards now show domain pills

**Omnibar Features**:
- Dynamic icon: 🔗 for URLs, 🔍 for search
- Clear button (X) when text present
- Plus button (+) only for valid URLs
- Smart keyboard type switching
- Keyboard avoiding behavior (110px offset)

#### 7. Real-Time Search

**Search Implementation**:
```typescript
const filteredCards = React.useMemo(() => {
  if (!searchQuery.trim()) return cards;
  
  const queryLower = searchQuery.toLowerCase();
  return cards.filter(card => {
    const searchableText = [
      card.title,
      card.url,
      card.description,
      card.domain,
      card.notes,
      ...(card.tags || []),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    
    return searchableText.includes(queryLower);
  });
}, [cards, searchQuery]);
```

**Features**:
- Searches across title, URL, description, domain, notes, tags
- Real-time filtering as user types
- Instant results (no debouncing needed)
- Case-insensitive matching

#### 8. Bug Fixes

**TypeError: Cannot read property 'trim' of undefined**:
- **Issue**: Omnibar receiving undefined value
- **Fix**: Added default parameter `value = ''` and safe value `safeValue = value || ''`

**Missing Domain Pills on Mobile Cards**:
- **Issue**: API client hardcoded `domain: null`
- **Fix**: Added `domain: safeHost(cardData.url) || null` to extract hostname

**Library Header Not Showing**:
- **Issue**: MasonryGrid didn't support ListHeaderComponent
- **Fix**: Added ListHeaderComponent prop and rendering

**Keyboard Covering Omnibar**:
- **Issue**: KeyboardAvoidingView offset too small (0px)
- **Fix**: Changed to 110px (omnibar height ~50-60px + spacing ~20-30px)

**Omnibar Click Area Not Working**:
- **Issue**: Right side of omnibar sometimes not clickable
- **Fix**: Wrapped in TouchableOpacity with inputRef and handleContainerPress

#### 9. Git Management

**Initial Commit** (feature/tiktok-embedding branch):
- 26 files changed: 10,835 insertions, 281 deletions
- Commit: `47c2219` - Mobile improvements (panels, omnibar, local storage, sync)

**Cherry-Pick to Main**:
- User requested to exclude TikTok embedding
- Switched to main branch
- Cherry-picked commit `47c2219` onto main
- New commit: `aa98737` - Same changes, excludes TikTok code
- Pushed to origin/main

#### Files Created (10 new components)

**Components**:
- `mobile/src/components/AnimatedBackground.tsx`
- `mobile/src/components/CardDetailModal.tsx`
- `mobile/src/components/EdgeIndicators.tsx`
- `mobile/src/components/GlassCard.tsx`
- `mobile/src/components/LeftPanel.tsx`
- `mobile/src/components/MasonryGrid.tsx`
- `mobile/src/components/Omnibar.tsx`
- `mobile/src/components/RightPanel.tsx`
- `mobile/src/components/SwipeableDrawer.tsx`
- `mobile/src/components/ThreePanelLayout.tsx`

**Lib Services**:
- `mobile/src/lib/local-storage.ts`
- `mobile/src/lib/metadata.ts`
- `mobile/src/lib/sync-service.ts`
- `mobile/src/lib/utils.ts`

**Theme**:
- `mobile/src/theme/glass.ts`

**Screens**:
- `mobile/src/screens/BookmarksListScreen_New.tsx`

#### Technical Details

**React Native / Expo Stack**:
- Expo SDK 54.0.25
- @react-native-async-storage/async-storage v2.0.0
- expo-blur v14.0.1
- react-native-gesture-handler v2.21.2
- expo-linear-gradient v14.0.1

**Platform Support**:
- iOS: Full glass morphism with BlurView
- Android: Translucent backgrounds (better performance)
- Tested: iOS Simulator, Real iPhone devices

**Performance Considerations**:
- Limited BlurView usage (expensive on older devices)
- Used translucent backgrounds on Android
- Async storage operations (no blocking)
- Memoized search filtering
- Rate-limited sync operations

#### Lessons Learned

1. **MMKV vs AsyncStorage**: Expo Go doesn't support MMKV's NitroModules. AsyncStorage is the safe choice for Expo apps.

2. **Keyboard Handling**: KeyboardAvoidingView requires careful offset tuning. 110px worked for bottom-fixed omnibar.

3. **Platform Differences**: iOS BlurView is beautiful but expensive. Android needs translucent fallbacks.

4. **Gesture Conflicts**: Background must disable pointerEvents when panel open to prevent stuck states.

5. **URL Detection**: Mobile and web should use identical URL detection logic to ensure consistent behavior.

6. **Local-First Benefits**: Instant app startup (no loading spinners), offline capability, better UX.

7. **Git Cherry-Pick**: Can selectively apply commits to exclude unwanted features (TikTok embedding).

#### Next Steps

**Completed**:
- ✅ Glass morphism UI system
- ✅ Swipeable panels with gestures
- ✅ Local-first storage with AsyncStorage
- ✅ Background sync service
- ✅ Smart omnibar with URL detection
- ✅ Real-time search
- ✅ Domain extraction for mobile cards
- ✅ All critical bug fixes
- ✅ Git commit and push to main

**Future Enhancements** (not in scope for this session):
- Pull-to-refresh
- Infinite scroll for large libraries
- Card detail editing
- Collection management UI
- Settings panel implementation
- Offline indicator
- Sync status UI

---

**Session Duration**: Full day session
**Commits**: 1 (aa98737 on main)
**Lines Changed**: +10,835, -281
**Status**: Production-ready mobile app with glass UI and local-first sync


---

## Session: November 23, 2025 - Mobile UI Refinements

### Overview
Quick polish session focusing on fixing UI bugs and cleaning up unnecessary components in the mobile app.

### Work Completed

#### 1. Fixed Collection Header Label Bug
**Problem**: Header always showed "Library" even when viewing a specific collection (pawkit).

**Solution**: Added recursive collection tree search to find collection name from slug:
```typescript
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

// Updated header with priority order:
// 1. Search Results (when searching)
// 2. Collection name (when in a pawkit)
// 3. Library (default)
{searchQuery.trim() ? 'Search Results' : (collectionName || 'Library')}
```

**Files Changed**:
- `mobile/src/screens/BookmarksListScreen_New.tsx`

**Impact**: Users can now clearly see which collection they're viewing.

---

#### 2. Cleaned Up RightPanel

**Problem**: RightPanel contained many unimplemented and unnecessary sections for MVP.

**Removed Sections**:
- TODAY'S TASKS (not implemented)
- TAGS (not implemented in mobile)
- CONTENT TYPE (not needed)
- DISPLAY section (card size, spacing, padding controls)
- Bottom status section (Online indicator, Server Sync toggle, "All changes saved", "Sync now" button)

**Kept Sections** (MVP essentials):
- Top actions (Avatar, trash, help, share buttons)
- SORT (Date Added, Recently Modified, Title A-Z, Domain)
- VIEW (Grid, Masonry, List, Compact)

**Code Cleanup**:
```typescript
// Removed unused imports
- Switch (from react-native)

// Removed unused state variables
- cardSize, cardSpacing, cardPadding
- showThumbnails, serverSync

// Updated padding
content: {
  padding: 12,
  paddingBottom: 16,  // Was 120px for bottom section
}
```

**Files Changed**:
- `mobile/src/components/RightPanel.tsx`

**Impact**: Cleaner, more focused panel with only essential controls for MVP.

---

### Technical Details

#### Collection Lookup Algorithm
- **Challenge**: Collections stored as tree structure with nested children
- **Solution**: Recursive depth-first search through tree
- **Handles**: Top-level and deeply nested collections
- **Edge cases**: Null slugs, missing collections (fallback to "Library")

#### UI Simplification Strategy
- **Approach**: Remove anything not functional or needed for MVP
- **Benefit**: Less visual clutter, faster development cycles
- **Future**: Can add back features as they're implemented

---

### Files Modified
1. `mobile/src/screens/BookmarksListScreen_New.tsx` - Header label fix
2. `mobile/src/components/RightPanel.tsx` - Removed unused sections

---

### Skills Updated
1. `pawkit-ui-ux` - Documented both changes
2. `pawkit-troubleshooting` - Added Issue #29 (Collection header label bug)
3. `pawkit-project-context` - This session summary

---

### Session Metrics
**Duration**: ~30 minutes
**Issues Fixed**: 2
**Files Changed**: 2
**Lines Removed**: ~400 (cleanup)
**Lines Added**: ~30 (bug fix)
**Commits**: 0 (changes uncommitted)

---

### Status
✅ Collection header label shows correct pawkit name
✅ RightPanel simplified for MVP
✅ All skills documentation updated
📝 Changes ready for commit

**Next Steps**: Commit changes when ready

---

**Last Updated**: November 23, 2025

---

## Future Features / Roadmap Ideas

### Tab Session Saving (Extension Feature)
**Status**: 📝 Concept / Future
**Priority**: Medium
**Type**: Browser Extension Feature

**Overview**: Capture all open tabs in browser window(s) with one click, similar to OneTab or Session Buddy, but integrated into the Pawkit ecosystem.

**Core Functionality**:
- Capture: URLs, titles, favicons, tab order, window groupings, tab groups
- Store as a "Session" card type OR as a collection with individual tab cards
- Options:
  - "Save & Close" (OneTab-style) - saves tabs and closes them
  - "Save Only" - saves snapshot without closing tabs
  - "Auto-save periodic snapshots" - background auto-save every X minutes

**Restore Options**:
- Open all tabs at once
- Open in new window
- Open individual tabs selectively
- Preview before restoring

**Integration Points**:
- Sessions backup to cloud storage like everything else (Filen, Google Drive, Dropbox, OneDrive)
- Sessions visible in web app Library
- Search across saved sessions
- Tags and collections for organization

**Competitive Advantage**:
- Unlike OneTab/Session Buddy: Full backup to multiple cloud providers
- Unlike browser sync: Cross-browser session restore
- Part of unified Pawkit ecosystem (notes, bookmarks, files, sessions)

**Technical Considerations**:
- New card type: `session` with `tabs: Tab[]` array
- Or: Collection with `isSession: true` flag containing individual tab cards
- Extension API: `chrome.tabs.query()` to capture current tabs
- Tab group support: `chrome.tabGroups` API (Chrome 89+)

**Competes With**: OneTab, Session Buddy, Toby, but integrated into Pawkit ecosystem

