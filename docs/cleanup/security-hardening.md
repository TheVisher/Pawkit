# Security Hardening - Future Cleanup

Items to address after coordinating with browser extension updates.

---

## Extension Auth Origin Validation

**File:** `src/app/api/auth/extension/route.ts`

### Current Issues

1. **Line 40:** `if (!origin) return true` - Allows null origin requests
2. **Lines 61-65:** If `TRUSTED_EXTENSION_IDS` env var is not set, allows ANY browser extension to get access tokens

### Recommended Fix

```typescript
function validateExtensionOrigin(origin: string | null): boolean {
  const isProduction = process.env.NODE_ENV === 'production';

  // Reject null origin in production
  if (!origin) {
    if (isProduction) {
      console.warn('[Auth/Extension] Rejected null origin in production');
      return false;
    }
    return true;
  }

  // ... existing Pawkit domain checks ...

  // Require TRUSTED_EXTENSION_IDS in production
  const trustedIds = getTrustedExtensionIds();
  if (trustedIds.length === 0) {
    if (isProduction) {
      console.error('SECURITY: TRUSTED_EXTENSION_IDS not configured!');
      return false;
    }
    return true;  // Allow in dev
  }

  return trustedIds.includes(extensionId);
}
```

### Pre-requisites Before Deploying

1. Get the Chrome extension's published ID from Chrome Web Store
2. Add `TRUSTED_EXTENSION_IDS=<extension-id>` to production environment
3. Verify extension still works with the env var set
4. Then deploy the code changes to reject null origin and require the env var

### Risk Assessment

- **Current risk:** Any browser extension can exfiltrate access tokens via session cookies
- **Mitigated by:** Only access tokens (not refresh tokens) are returned, limited damage window
- **After fix:** Only explicitly trusted extensions can get tokens

---

## Dead Code in Sync Queue

**File:** `src/lib/services/sync-queue.ts`

Already addressed in main security fix plan, but documenting here for completeness:

- `handleCardConflict()` function (lines 857-938) - deprecated
- `recentConflictTimestamps` Map
- `CONFLICT_RATE_LIMIT` / `CONFLICT_RATE_WINDOW_MS` constants

---

## Logging Inconsistency

**File:** `src/lib/services/sync-queue.ts`

The `clearAllSyncQueue()` function uses `console.log()` instead of the module logger (`log`). Should be updated for consistency.
