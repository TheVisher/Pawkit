# Security & Data Integrity Fixes

Based on Codex code review + Claude verification. Tackle these issues when ready.

## Priority Order

1. **CRITICAL** - Sync Data Loss
2. **HIGH** - UploadThing Auth
3. **Related** - Mock Upload Fallback
4. **MEDIUM** - SSRF Protection
5. **LOW** - Error Message Leak
6. **LOW** - Dead Code Cleanup

> **Deferred:** Extension Auth Origin fix - see `security-hardening.md`

---

## Issue 1: CRITICAL - Sync Data Loss

**Files:** `src/lib/services/sync/entity-sync.ts`, `src/lib/services/sync/types.ts`

### Problem
`serverCardToLocal()` creates new LocalCard with only ServerCard fields, then `bulkPut()` replaces entire record - losing ~25 fields including notes, metadata, scheduledDates, isFileCard (hardcoded to `false`).

### Solution: Properly Categorize Fields

**Server-synced fields** (expand ServerCard/ServerCollection types):
- `notes`, `metadata`, `scheduledDates`, `isFileCard`, `fileId`
- `cloudId`, `cloudProvider`, `cloudSyncedAt`
- Collection: `coverImagePosition`, `coverImageHeight`, `coverContentOffset`, `metadata`

**Truly local/derived fields** (preserve during merge):
- `dominantColor`, `aspectRatio`, `blurDataUri` (image optimization - derived locally)
- `articleContentEdited` (local edits to fetched content)
- `readProgress`, `lastScrollPosition`, `manuallyMarkedUnread` (reading state)
- `wordCount`, `readingTime` (derived from content)
- `linkStatus`, `lastLinkCheck`, `redirectUrl` (link health checks)
- `transcriptSegments` (YouTube transcripts - fetched locally)
- `structuredData`, `source` (AI-extracted data)
- `convertedToTodo`, `dismissedTodoSuggestion` (UI state)
- UI-only: `headerGradientColor`, `headerImagePosition`

### Implementation Steps

1. Update `src/lib/services/sync/types.ts` - Add missing fields to ServerCard/ServerCollection interfaces
2. Update `serverCardToLocal()` to map all server-synced fields
3. In cards upsert logic:
   - Fetch existing cards with `db.cards.bulkGet(ids)`
   - Merge: apply server data, preserve only truly local/derived fields
   - Remove hardcoded `isFileCard: false`
4. Expand collections merge to preserve local-only display fields

---

## Issue 2: HIGH - UploadThing Auth

**File:** `src/lib/uploadthing.ts`

### Problem
```typescript
.middleware(() => ({}))  // No auth check - anyone can upload
```

### Solution
```typescript
import { createClient } from '@/lib/supabase/server';
import { UploadThingError } from 'uploadthing/server';

.middleware(async ({ req }) => {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    throw new UploadThingError('Unauthorized');
  }

  return { userId: user.id };
})
```

If `createClient()` doesn't work in middleware context, use `createServerClient` from `@supabase/ssr` with `req.cookies`.

---

## Issue 3: Mock Upload Fallback

**File:** `src/hooks/use-upload-file.ts`

### Problem
Lines 64-90: On upload failure, creates mock upload with `createObjectURL()` - masks auth failures.

### Solution
Remove mock fallback, let failures propagate:
```typescript
catch (error) {
  const errorMessage = getErrorMessage(error);
  toast.error(errorMessage.includes('Unauthorized')
    ? 'Please log in to upload files'
    : errorMessage);
  onUploadError?.(error);
  throw error;  // No mock fallback
}
```

---

## Issue 4: MEDIUM - SSRF Protection

**Files:**
- `src/lib/metadata/fetcher.ts`
- `src/app/api/article/route.ts`
- `src/lib/services/link-checker.ts`

### Problem
Prefix matching bypassed by: decimal IPs (`2130706433`), octal IPs (`0177.0.0.1`), IPv4-mapped IPv6 (`::ffff:127.0.0.1`), DNS rebinding.

### Solution
Create `src/lib/utils/ssrf-protection.ts`:

```typescript
// Sync validation (for client/quick checks) - improved but no DNS
export function validateUrlSync(url: string): { valid: boolean; error?: string }

// Async validation (for server routes) - includes DNS resolution
export async function validateUrlAsync(url: string): Promise<{ valid: boolean; error?: string }> {
  // 1. Basic URL parsing
  // 2. Protocol check (HTTP/S only)
  // 3. Hostname blocklist check
  // 4. DNS resolution with dns.promises.lookup()
  // 5. Check resolved IP against private ranges
}
```

Update server routes to use `validateUrlAsync()`.

---

## Issue 5: LOW - Error Message Leak

**File:** `src/app/api/user/delete-data/route.ts`

### Problem
Line 46: `error.message` returned to client - leaks internal details.

### Solution
```typescript
} catch (error) {
  console.error('[delete-data] Error:', error);
  return NextResponse.json(
    { error: 'Failed to delete data. Please try again.' },
    { status: 500 }
  );
}
```

---

## Issue 6: LOW - Dead Code Cleanup

**File:** `src/lib/services/sync-queue.ts`

### Remove
- Lines 845-938: `handleCardConflict()` function (deprecated)
- `recentConflictTimestamps` Map
- `CONFLICT_RATE_LIMIT` / `CONFLICT_RATE_WINDOW_MS` constants

Keep `resolveConflictOnDelete()` - still used.

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/lib/services/sync/types.ts` | Expand ServerCard/ServerCollection types |
| `src/lib/services/sync/entity-sync.ts` | Merge strategy preserving local-only fields |
| `src/lib/uploadthing.ts` | Add auth middleware |
| `src/hooks/use-upload-file.ts` | Remove mock fallback |
| `src/lib/utils/ssrf-protection.ts` | NEW - sync + async SSRF validation |
| `src/lib/metadata/fetcher.ts` | Use async SSRF validation |
| `src/app/api/article/route.ts` | Use async SSRF validation |
| `src/lib/services/link-checker.ts` | Use async SSRF validation |
| `src/app/api/user/delete-data/route.ts` | Sanitize error messages |
| `src/lib/services/sync-queue.ts` | Remove dead code |

---

## Verification

### Sync Data Loss
1. Create card with notes, images, scheduledDates, reading progress
2. Sync to server
3. Modify card title on server
4. Pull sync
5. Verify: server fields updated, local-only fields (readProgress, dominantColor, etc.) preserved

### UploadThing
1. Upload while logged out → should fail with "Unauthorized"
2. Upload while logged in → should succeed
3. Verify no mock fallback on failure

### SSRF
1. `http://2130706433/` → rejected (decimal IP)
2. `http://0177.0.0.1/` → rejected (octal)
3. `http://[::ffff:127.0.0.1]/` → rejected (IPv4-mapped)
4. DNS rebinding domain → rejected (resolved IP check)
