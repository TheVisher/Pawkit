# Pawkit Security Audit Report
**Date:** 2025-01-17
**Auditor:** Claude (Comprehensive Security Analysis)
**Scope:** API routes, authentication, user isolation, CORS, environment variables, and data exposure

---

## Executive Summary

This security audit identified **3 CRITICAL**, **4 HIGH**, **3 MEDIUM**, and **2 LOW** severity issues across the Pawkit codebase. The most critical findings include unauthenticated endpoints and potential timing-based enumeration vulnerabilities. While most API routes implement proper authentication and user isolation, several security gaps require immediate attention.

### Risk Distribution
- **Critical (3):** Require immediate fix before production deployment
- **High (4):** Should be addressed before next release
- **Medium (3):** Address within next sprint
- **Low (2):** Address during next maintenance cycle

---

## Critical Issues (Priority 1)

### 🔴 CRITICAL-1: Unauthenticated CSP Report Endpoint
**File:** `app/api/csp-report/route.ts`
**Lines:** 5-24
**Severity:** CRITICAL

**Issue:**
The CSP (Content Security Policy) report endpoint accepts POST requests without any authentication. This allows anyone to flood the endpoint with fake CSP violation reports, potentially:
- Causing denial of service through log flooding
- Masking real security violations
- Consuming server resources

```typescript
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    // NO AUTH CHECK - anyone can POST here
    console.error('[CSP Violation]', {
      timestamp: new Date().toISOString(),
      userAgent: request.headers.get('user-agent'),
      violation: body['csp-report'] || body,
    });
    return success({ received: true });
  } catch (error) {
    return handleApiError(error, { route: '/api/csp-report' });
  }
}
```

**Impact:**
- Log flooding attack vector
- Resource exhaustion
- False CSP violation data

**Recommendation:**
1. Remove authentication requirement but implement strict rate limiting (e.g., 10 requests per IP per minute)
2. Validate CSP report structure before logging
3. Consider using dedicated CSP reporting service (Sentry, LogRocket)
4. Add IP-based rate limiting to prevent abuse

---

### 🔴 CRITICAL-2: Unauthenticated Storage Setup Endpoint
**File:** `app/api/admin/setup-storage/route.ts`
**Lines:** 11-60
**Severity:** CRITICAL

**Issue:**
The storage setup endpoint creates Supabase storage buckets without any authentication. This is an administrative operation that should be heavily restricted.

```typescript
export async function POST() {
  try {
    // NO AUTH CHECK - anyone can call this
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    // Creates storage bucket...
  }
}
```

**Impact:**
- Unauthorized admin operations
- Potential resource exhaustion through bucket creation
- Unauthorized access to Supabase admin operations

**Recommendation:**
1. Add authentication check: `const user = await getCurrentUser(); if (!user) return unauthorized();`
2. Implement admin role check (user table should have `isAdmin` boolean)
3. Add rate limiting for admin operations
4. Consider moving this to a CLI script instead of API endpoint
5. If keeping as API endpoint, require additional secret header or token

---

### 🔴 CRITICAL-3: Extension Token Enumeration Vulnerability
**File:** `lib/auth/extension-auth.ts`
**Lines:** 14-54
**Severity:** CRITICAL

**Issue:**
The extension token validation function loads ALL users with tokens from the database and performs bcrypt comparisons in a loop. This creates multiple security issues:

1. **Timing Attack:** Response time reveals whether token is close to valid (bcrypt comparison takes longer)
2. **Performance DoS:** Attacker can cause expensive bcrypt operations by sending invalid tokens
3. **User Enumeration:** Can determine how many users have extension tokens
4. **N+1 Problem:** Performance degrades as user base grows

```typescript
export async function getUserByExtensionToken(token: string): Promise<PrismaUser | null> {
  // Fetches ALL users with tokens!
  const users = await prisma.user.findMany({
    where: {
      extensionToken: { not: null },
      extensionTokenCreatedAt: { not: null }
    }
  })

  // Loops through ALL users doing expensive bcrypt comparisons
  for (const user of users) {
    const isValid = await bcrypt.compare(token, user.extensionToken)
    if (isValid) {
      return user
    }
  }
  return null
}
```

**Impact:**
- Timing-based token enumeration
- Performance degradation with scale
- Potential DoS through expensive crypto operations
- User enumeration

**Recommendation:**
1. **Immediate Fix:** Add token indexing strategy:
   - Store first 8 characters of token hash as separate indexed field
   - Use this to filter users before bcrypt comparison
   - Reduces bcrypt operations from N to ~1 on average

2. **Better Long-term Solution:**
   - Create separate `extension_tokens` table with indexed `token_prefix` column
   - Store: `{ id, userId, tokenHash, tokenPrefix (first 8 chars), createdAt }`
   - Query by prefix, then verify hash

3. **Add Rate Limiting:**
   - Implement aggressive rate limiting on extension auth (5 attempts per 5 minutes per IP)
   - Add exponential backoff on failed attempts

4. **Constant-Time Response:**
   - Always perform at least one bcrypt comparison (with dummy hash) even if no users found
   - This prevents timing-based user enumeration

---

## High Severity Issues (Priority 2)

### 🟠 HIGH-1: Missing userId Check in Card Update Function
**File:** `lib/server/cards.ts`
**Lines:** 132-188 (fetchAndUpdateCardMetadata)
**Severity:** HIGH

**Issue:**
The `fetchAndUpdateCardMetadata` function updates cards by ID without verifying userId ownership. While current callers validate ownership first, this function is vulnerable if called from new locations.

```typescript
export async function fetchAndUpdateCardMetadata(cardId: string, url: string, previewServiceUrl?: string): Promise<CardDTO> {
  // ... fetch metadata ...

  // Updates card WITHOUT userId check!
  const updated = await prisma.card.update({
    where: { id: cardId },  // Only checks ID, not userId
    data: updateData
  });

  return mapCard(updated);
}
```

**Impact:**
- IDOR (Insecure Direct Object Reference) vulnerability if function called without prior ownership check
- Could allow updating other users' cards if caller doesn't validate first

**Recommendation:**
1. Add userId parameter to function signature: `fetchAndUpdateCardMetadata(userId: string, cardId: string, ...)`
2. Update where clause: `where: { id: cardId, userId }`
3. Return null if card not found/doesn't belong to user
4. Update all callers to pass userId

---

### 🟠 HIGH-2: CORS Policy Allows All Extensions in Development
**File:** `lib/config/extension-config.ts`
**Lines:** 20-35
**Severity:** HIGH

**Issue:**
The CORS configuration allows ANY browser extension to access the API in development mode and when no extensions are configured:

```typescript
export const ALLOW_ANY_EXTENSION_IN_DEV = process.env.NODE_ENV === 'development';
export const ALLOW_ANY_EXTENSION_WHEN_EMPTY =
  ALLOWED_CHROME_EXTENSIONS.length === 0 && ALLOWED_FIREFOX_EXTENSIONS.length === 0;

export function isAllowedExtensionOrigin(origin: string): boolean {
  // In development, allow any extension for easier testing
  if (ALLOW_ANY_EXTENSION_IN_DEV) {
    return origin.startsWith('chrome-extension://') || origin.startsWith('moz-extension://');
  }

  // If no specific extensions are configured, allow all
  if (ALLOW_ANY_EXTENSION_WHEN_EMPTY) {
    return origin.startsWith('chrome-extension://') || origin.startsWith('moz-extension://');
  }
}
```

**Impact:**
- In development: Malicious extensions can access API
- In production with default config: All extensions allowed by default
- CSRF-like attacks from untrusted extensions

**Recommendation:**
1. Never allow all extensions, even in development
2. For development, maintain a separate `ALLOWED_DEV_EXTENSIONS` list
3. Fail secure: If no extensions configured in production, deny all (don't allow all)
4. Add warning log when running in "allow all extensions" mode
5. Update deployment checklist to require extension ID configuration

---

### 🟠 HIGH-3: Missing RLS Policies (Supabase Bypass)
**File:** `lib/server/supabase.ts:4-6`
**Severity:** HIGH

**Issue:**
The server-side Supabase client uses the service role key, which **bypasses all Row Level Security (RLS) policies**. The application relies entirely on application-level userId checks in Prisma queries.

```typescript
// Use service role key for server-side operations (bypasses RLS)
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
```

**Current Status:**
- ✅ Prisma schema includes proper userId foreign keys
- ✅ Most queries include userId in where clauses
- ❌ No defense-in-depth at database level
- ❌ Single missed userId check could expose all user data

**Impact:**
- No defense-in-depth protection
- Single missed userId check in query could leak all user data
- Direct database access (via migrations, scripts) bypasses security

**Recommendation:**
1. **Implement Supabase RLS policies for all tables:**
   ```sql
   -- Example for cards table
   ALTER TABLE cards ENABLE ROW LEVEL SECURITY;

   CREATE POLICY "Users can only access their own cards"
   ON cards FOR ALL
   USING (auth.uid() = "userId");
   ```

2. **Keep service role key for background jobs only**
3. **Use user context-aware Supabase client for user operations:**
   ```typescript
   // Pass user context to Supabase client
   const supabase = createClient(url, key, {
     global: {
       headers: {
         'X-User-ID': userId // Custom header for RLS
       }
     }
   })
   ```

4. **Add RLS policy tests to CI/CD pipeline**

---

### 🟠 HIGH-4: Admin Migration Endpoint Limited Protection
**File:** `app/api/admin/migrate-collection-hierarchy/route.ts`
**Lines:** 14-152
**Severity:** HIGH

**Issue:**
The migration endpoint is only protected by NODE_ENV check, not by admin role:

```typescript
// SECURITY: Admin-only endpoint - verify user has admin role
// For now, disable this endpoint in production until admin roles are implemented
if (process.env.NODE_ENV === 'production') {
  return NextResponse.json(
    { error: "This endpoint is disabled in production. Please run migrations via CLI." },
    { status: 403 }
  );
}
```

**Impact:**
- Any authenticated user can run migrations in development
- Migrations modify data structure which could cause data corruption
- No audit trail of who ran migrations

**Recommendation:**
1. Implement admin role system:
   - Add `isAdmin` boolean to User model
   - Create `requireAdmin()` helper function
   - Protect all admin endpoints with admin check
2. Move migrations to CLI scripts instead of API endpoints
3. Add comprehensive migration logging with user attribution
4. Implement migration approval workflow for production

---

## Medium Severity Issues (Priority 3)

### 🟡 MEDIUM-1: Supabase Service Role Key Fallback
**File:** `lib/server/supabase.ts:5`, `app/api/admin/setup-storage/route.ts:15`
**Severity:** MEDIUM

**Issue:**
Service role key falls back to anon key if not set:

```typescript
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
```

**Impact:**
- Reduced security if service role key not configured
- Operations may fail with anon key permissions
- Unclear error messages

**Recommendation:**
1. Make SUPABASE_SERVICE_ROLE_KEY required for production
2. Throw clear error if not set instead of falling back
3. Add startup validation for required environment variables
4. Document required environment variables in .env.example

---

### 🟡 MEDIUM-2: Insufficient Rate Limiting on Token Generation
**File:** `app/api/extension/token/route.ts:22-26`
**Severity:** MEDIUM

**Issue:**
Extension token generation allows 5 requests per hour per user. While reasonable, this doesn't prevent IP-based attacks or account enumeration:

```typescript
const rateLimitResult = rateLimit({
  identifier: `token-gen:${user.id}`,
  limit: 5,
  windowMs: 60 * 60 * 1000, // 1 hour
});
```

**Impact:**
- Attacker could attempt to generate tokens for enumerated user IDs
- No IP-based rate limiting for brute force protection

**Recommendation:**
1. Add additional IP-based rate limiting
2. Implement CAPTCHA after 2 failed attempts
3. Add email notification when token is generated
4. Log all token generation attempts with IP for audit

---

### 🟡 MEDIUM-3: Preview Service URL Validation Too Permissive
**File:** `app/api/user/settings/route.ts:133-155`
**Severity:** MEDIUM

**Issue:**
Preview service URL validation only checks protocol, not domain:

```typescript
if (body.previewServiceUrl !== undefined) {
  if (body.previewServiceUrl !== null && body.previewServiceUrl !== '') {
    try {
      const url = new URL(body.previewServiceUrl);
      // Only allow https in production
      if (process.env.NODE_ENV === 'production' && url.protocol !== 'https:') {
        return NextResponse.json(
          { error: 'Preview service URL must use HTTPS in production' },
          { status: 400 }
        );
      }
      updateData.previewServiceUrl = body.previewServiceUrl;
    }
  }
}
```

**Impact:**
- Users could configure malicious preview services
- SSRF (Server-Side Request Forgery) vulnerability if preview service is called server-side
- Privacy leak to attacker-controlled domains

**Recommendation:**
1. Maintain allowlist of approved preview service domains
2. Validate URL format includes placeholder: `{{url}}`
3. Add warning to users about custom preview services
4. Consider sandboxing preview service calls
5. Add timeout and size limits for preview service responses

---

## Low Severity Issues (Priority 4)

### 🔵 LOW-1: IndexedDB Database Name Exposes User IDs
**File:** `lib/services/local-storage.ts:99-107`
**Severity:** LOW

**Issue:**
IndexedDB database names include user IDs in plain text:

```typescript
private getDbName(): string {
  if (!this.userId) {
    throw new Error('[LocalStorage] userId not initialized - cannot get database name');
  }
  if (!this.workspaceId) {
    throw new Error('[LocalStorage] workspaceId not initialized - cannot get database name');
  }
  return `pawkit-${this.userId}-${this.workspaceId}-local-storage`;
}
```

**Impact:**
- User IDs visible in browser DevTools
- Minimal security impact (IDs already accessible via API)
- Minor privacy concern

**Recommendation:**
1. Consider hashing userId in database name: `pawkit-${hash(userId)}-local-storage`
2. Or use sessionStorage key to map to database name
3. Low priority as browser storage is already user-isolated

---

### 🔵 LOW-2: Console Logging in Production
**File:** Multiple files (api routes, lib files)
**Severity:** LOW

**Issue:**
Production code includes console.log statements that may leak sensitive information:

Examples:
- `app/api/user/settings/route.ts:34,73` - Logs settings data
- `lib/server/cards.ts:137,244` - Logs card metadata and queries

**Impact:**
- Logs may contain sensitive user data
- Performance overhead in production
- Log storage costs

**Recommendation:**
1. Implement proper logging library (e.g., Pino, Winston)
2. Use log levels (debug, info, warn, error)
3. Disable debug logging in production
4. Strip console.log statements in production build (vite/webpack plugin)
5. Use structured logging with log sampling for high-volume logs

---

## Positive Security Findings ✅

### Strong Points:
1. ✅ **Authentication Implementation:** Most API routes properly check authentication via `getCurrentUser()`
2. ✅ **User Isolation in Prisma:** Database queries consistently include userId in where clauses
3. ✅ **IndexedDB Isolation:** LocalStorage properly isolates data per userId and workspaceId
4. ✅ **Token Hashing:** Extension tokens are properly hashed with bcrypt before storage
5. ✅ **Rate Limiting:** Most endpoints implement reasonable rate limiting
6. ✅ **Input Validation:** Uses Zod schemas for input validation
7. ✅ **CORS Configuration:** Granular CORS configuration per route (though needs tightening)
8. ✅ **SQL Injection Protection:** Uses Prisma ORM which prevents SQL injection
9. ✅ **Password Security:** Uses bcrypt with proper salt rounds
10. ✅ **Cascade Deletion:** Proper foreign key constraints with onDelete: Cascade

---

## Data Exposure Analysis

### Sensitive Data Handling Review:

#### ✅ Properly Protected:
- User passwords: Only hashes stored and never returned
- Extension tokens: Hashed with bcrypt, plain token only shown once at generation
- Session tokens: Handled by Supabase, never exposed

#### ⚠️ Potential Concerns:
1. **Email addresses** returned in `/api/user` endpoint - Consider if necessary
2. **Extension token creation time** exposed - Could enable timing attacks
3. **Card metadata** includes raw metadata from scraped sites - May contain sensitive info
4. **User settings** returned in full - Consider filtering sensitive fields

#### Recommendation:
Implement a response filtering layer to strip sensitive fields based on context.

---

## Environment Variables Security

### Current Configuration (`.env.example`):
```
DATABASE_URL
DIRECT_URL
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_PREVIEW_SERVICE_URL
```

### Issues:
1. ❌ Missing `SUPABASE_SERVICE_ROLE_KEY` in example
2. ❌ No validation that required secrets are set
3. ❌ No documentation of which variables are required vs optional

### Recommendations:
1. Update `.env.example` with all required variables and comments
2. Create environment validation script:
   ```typescript
   // lib/config/validate-env.ts
   const requiredEnvVars = [
     'DATABASE_URL',
     'NEXT_PUBLIC_SUPABASE_URL',
     'NEXT_PUBLIC_SUPABASE_ANON_KEY',
     'SUPABASE_SERVICE_ROLE_KEY'
   ]

   export function validateEnv() {
     const missing = requiredEnvVars.filter(key => !process.env[key])
     if (missing.length > 0) {
       throw new Error(`Missing required environment variables: ${missing.join(', ')}`)
     }
   }
   ```
3. Call validation on app startup
4. Add to deployment checklist

---

## Supabase RLS Policies Status

### Current State: ❌ NO RLS POLICIES

**Analysis:**
The application uses Supabase for authentication but stores data in a separate PostgreSQL database via Prisma. This means:

1. ✅ Data is in Prisma-managed PostgreSQL, not Supabase's database
2. ❌ No Row Level Security at database level
3. ✅ Security enforced via application logic (userId checks)
4. ❌ No defense-in-depth

### Impact:
- Single missed userId check could expose all data
- Direct database access bypasses security
- No protection against SQL injection (though Prisma mitigates this)

### Recommendations:
1. If staying with separate PostgreSQL:
   - Implement PostgreSQL RLS policies
   - Use SET LOCAL for user context in database sessions
   - Add database-level security tests

2. Alternative approach:
   - Migrate to Supabase-hosted PostgreSQL
   - Leverage Supabase's built-in RLS
   - Use Supabase client with user context

---

## Prioritized Remediation Plan

### Phase 1: Immediate (Deploy This Week)
1. **Fix CRITICAL-1:** Add auth or aggressive rate limiting to CSP endpoint
2. **Fix CRITICAL-2:** Add authentication to storage setup endpoint
3. **Fix HIGH-2:** Update CORS config to deny-by-default

### Phase 2: High Priority (Deploy Within 2 Weeks)
1. **Fix CRITICAL-3:** Implement token prefix indexing for extension auth
2. **Fix HIGH-1:** Add userId parameter to fetchAndUpdateCardMetadata
3. **Fix HIGH-4:** Move admin endpoints to CLI or add admin role check

### Phase 3: Medium Priority (Next Sprint)
1. **Fix HIGH-3:** Implement RLS policies or equivalent database-level security
2. **Fix MEDIUM-1:** Require service role key in production
3. **Fix MEDIUM-2:** Add IP-based rate limiting to token generation
4. **Fix MEDIUM-3:** Add preview service URL allowlist

### Phase 4: Low Priority (Next Quarter)
1. **Fix LOW-1:** Consider hashing user IDs in IndexedDB names
2. **Fix LOW-2:** Implement proper logging library, remove console.logs
3. Add comprehensive security tests
4. Implement automated security scanning in CI/CD

---

## Testing Recommendations

### Add Security Tests:
1. **Authentication Tests:**
   - Verify all API routes require authentication
   - Test with expired/invalid tokens
   - Test with missing auth headers

2. **Authorization Tests:**
   - Attempt to access other users' resources (IDOR tests)
   - Verify userId checks in all queries
   - Test admin endpoints with non-admin users

3. **Input Validation Tests:**
   - Test with malformed JSON
   - Test with SQL injection patterns
   - Test with XSS payloads
   - Test with oversized payloads

4. **Rate Limiting Tests:**
   - Verify rate limits enforced
   - Test rate limit bypass attempts
   - Test distributed rate limit attacks

5. **CORS Tests:**
   - Test with unauthorized origins
   - Test with missing Origin header
   - Test preflight requests

---

## Security Checklist for Production Deployment

- [ ] All CRITICAL issues resolved
- [ ] All HIGH issues resolved or accepted as known risks
- [ ] Extension IDs configured in production (CORS allowlist)
- [ ] Service role key set and validated
- [ ] Rate limiting configured and tested
- [ ] Admin endpoints protected or disabled
- [ ] Environment variables validated on startup
- [ ] Security tests passing
- [ ] Logging configured with log levels
- [ ] CSP headers configured
- [ ] HTTPS enforced everywhere
- [ ] Security monitoring/alerting configured
- [ ] Incident response plan documented
- [ ] Backup and recovery tested
- [ ] Audit logging enabled for sensitive operations

---

## Conclusion

The Pawkit codebase demonstrates strong security practices in most areas, particularly in authentication implementation and user isolation at the application level. However, several critical issues require immediate attention before production deployment:

1. Unauthenticated admin endpoints
2. Extension token enumeration vulnerability
3. CORS policy too permissive
4. Missing database-level security (RLS policies)

**Overall Security Grade: B-**
With recommended fixes implemented: **A**

The application follows many security best practices but needs defense-in-depth improvements and critical vulnerability patches before production deployment.

---

## Appendix: API Route Security Summary

| Endpoint | Auth | userId Check | Rate Limit | Status |
|----------|------|--------------|------------|--------|
| `/api/cards` (GET/POST) | ✅ | ✅ | ✅ | SECURE |
| `/api/cards/[id]` (GET/PATCH/DELETE) | ✅ | ✅ | ❌ | SECURE |
| `/api/cards/count` | ✅ | ✅ | ❌ | SECURE |
| `/api/cards/recent` | ✅ | ✅ | ❌ | SECURE |
| `/api/cards/quick-access` | ✅ | ✅ | ❌ | SECURE |
| `/api/cards/refresh-expired-images` | ✅ | ✅ | ❌ | SECURE |
| `/api/cards/[id]/fetch-metadata` | ✅ | ✅ | ❌ | SECURE |
| `/api/cards/[id]/extract-article` | ✅ | ✅ | ❌ | SECURE |
| `/api/pawkits` (GET/POST) | ✅ | ✅ | ❌ | SECURE |
| `/api/pawkits/[id]` | ✅ | ✅ | ❌ | SECURE |
| `/api/pawkits/pinned` | ✅ | ✅ | ❌ | SECURE |
| `/api/pawkits/preview` | ✅ | ✅ | ❌ | SECURE |
| `/api/todos` | ✅ | ✅ | ✅ | SECURE |
| `/api/todos/[id]` | ✅ | ✅ | ✅ | SECURE |
| `/api/user` | ✅ | ✅ | ❌ | SECURE |
| `/api/user/settings` | ✅ | ✅ | ✅ | SECURE |
| `/api/user/view-settings` | ✅ | ✅ | ❌ | SECURE |
| `/api/extension/token` | ✅ | ✅ | ✅ | SECURE |
| `/api/import` | ✅ | ✅ | ❌ | SECURE |
| `/api/notes` | ✅ | ✅ | ❌ | SECURE |
| `/api/timeline` | ✅ | ✅ | ❌ | SECURE |
| `/api/distill` | ✅ | ✅ | ❌ | SECURE |
| `/api/trash/cards/[id]` | ✅ | ✅ | ❌ | SECURE |
| `/api/trash/cards/[id]/restore` | ✅ | ✅ | ❌ | SECURE |
| `/api/trash/pawkits/[id]` | ✅ | ✅ | ❌ | SECURE |
| `/api/trash/pawkits/[id]/restore` | ✅ | ✅ | ❌ | SECURE |
| `/api/trash/empty` | ✅ | ✅ | ❌ | SECURE |
| `/api/sync/check` | ✅ | ✅ | ❌ | SECURE |
| `/api/admin/clear` | ✅ | ✅ | ❌ | DEV-ONLY |
| `/api/admin/setup-storage` | ❌ | ❌ | ❌ | **CRITICAL** |
| `/api/admin/migrate-collection-hierarchy` | ✅ | ✅ | ❌ | PROD-DISABLED |
| `/api/csp-report` | ❌ | N/A | ❌ | **CRITICAL** |

**Legend:**
- ✅ Implemented correctly
- ❌ Missing or insufficient
- N/A Not applicable
- DEV-ONLY Only enabled in development
- PROD-DISABLED Disabled in production

---

**Report End**
