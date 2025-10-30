# Pawkit API Routes Audit Report

**Date:** October 28, 2025
**Branch:** feat/multi-session-detection
**Auditor:** Claude Code
**Total Routes Reviewed:** 30 API routes

---

## Executive Summary

This audit reviews all API routes in the Pawkit application for proper error handling, input validation, edge cases, and consistency. Overall, the API architecture demonstrates **good practices** with centralized error handling, Zod validation, and rate limiting. However, there are several areas for improvement to enhance security, consistency, and robustness.

### Overall Assessment

✅ **Strengths:**
- Centralized error handling with `handleApiError()`
- Zod validation schemas for input validation
- Rate limiting on critical endpoints
- CORS handling for browser extension support
- Consistent authentication pattern
- Conflict detection for multi-device scenarios

⚠️ **Areas for Improvement:**
- Inconsistent error response formats
- Missing input validation on some routes
- Incomplete edge case handling
- Inconsistent request body parsing
- Missing rate limiting on some endpoints
- Inconsistent logging practices

---

## Detailed Findings

### 1. Error Handling

#### ✅ What's Working Well

**Centralized Error Handler (`lib/utils/api-error.ts`)**
```typescript
export function handleApiError(error: unknown): NextResponse
```
- Handles Zod validation errors (400)
- Handles Prisma errors (P2025, P2002, P2003)
- Falls back to generic errors (500)
- Logs unexpected errors

**Consistent Usage**
Most routes use try-catch with `handleApiError()`:
```typescript
try {
  // Route logic
} catch (error) {
  return handleApiError(error);
}
```

#### ⚠️ Issues Found

**1. Inconsistent Error Response Format**

Different routes return different error structures:

```typescript
// Some routes (cards/route.ts:76)
{ error: "Unauthorized" }

// Other routes (cards/[id]/route.ts:26)
{ message: "Not found" }

// Conflict responses (cards/[id]/route.ts:80-86)
{
  error: "Conflict",
  message: "Card was modified...",
  serverCard: currentCard
}

// View settings (user/view-settings/route.ts:52)
{ error: "Missing required fields: view, settings" }
```

**Impact:** Client code must handle multiple error formats, complicating error handling logic.

**2. Generic Error Messages**

Some error messages are too generic for debugging:

```typescript
// sessions/heartbeat/route.ts:56
{ error: 'Internal server error' }

// user/view-settings/route.ts:104
{ error: "Failed to update view settings" }
```

**Impact:** Hard to debug production issues without examining server logs.

**3. Missing Error Context**

Some errors don't provide enough context:

```typescript
// extension/token/route.ts:58
{ error: 'Failed to generate token' }
// Missing: Why did it fail? Database error? Validation?
```

#### 📋 Recommendations

**Priority: HIGH**

1. **Standardize Error Response Format**

Create a consistent error response structure:

```typescript
// lib/utils/api-error.ts - Proposed enhancement
interface ApiErrorResponse {
  error: string;           // Error type/code
  message: string;         // Human-readable message
  details?: any;           // Additional context
  code?: string;           // Error code (e.g., "VALIDATION_ERROR")
}

// Usage
return NextResponse.json({
  error: "Validation Error",
  message: "Invalid input data",
  details: zodError.errors,
  code: "VALIDATION_ERROR"
}, { status: 400 });
```

2. **Add Error Codes**

Define error codes for common scenarios:

```typescript
// lib/utils/error-codes.ts
export const ErrorCodes = {
  UNAUTHORIZED: "UNAUTHORIZED",
  NOT_FOUND: "NOT_FOUND",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  CONFLICT: "CONFLICT",
  RATE_LIMITED: "RATE_LIMITED",
  DATABASE_ERROR: "DATABASE_ERROR",
  LOCAL_ONLY_MODE: "LOCAL_ONLY_MODE",
} as const;
```

3. **Enhance Error Context**

Include more diagnostic information (without exposing sensitive data):

```typescript
catch (error) {
  console.error('[API][/api/cards] Error creating card:', {
    userId: user.id,
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined
  });
  return handleApiError(error);
}
```

---

### 2. Input Validation

#### ✅ What's Working Well

**Zod Schemas**

Well-defined schemas in `lib/validators/`:
- `card.ts` - Card create/update/query validation
- `collection.ts` - Collection create/update validation
- `import.ts` - Import data validation

**Validation Features:**
- Type coercion (e.g., `z.coerce.number()`)
- String transformations (trim, normalize)
- Custom refinements (e.g., URL required for URL cards)
- Default values

Example from `card.ts`:
```typescript
export const cardCreateSchema = z.object({
  type: z.enum(["url", "md-note", "text-note"]).default("url"),
  url: z.string().optional().transform(...),
  // ... more fields
}).refine(
  (data) => data.type === "url" ? !!data.url : true,
  { message: "URL is required for URL type cards" }
);
```

#### ⚠️ Issues Found

**1. Inconsistent Validation Usage**

Some routes validate in the API handler, others in the service layer:

```typescript
// cards/route.ts - Validates in service layer (lib/server/cards.ts:47)
const card = await createCard(user.id, body); // ✅ Validates here

// user/route.ts:36-45 - Manual validation in route
const { displayName, serverSync } = body; // ❌ No schema validation
```

**2. Missing Validation on Some Routes**

Routes without explicit validation:

- `app/api/user/route.ts` (PATCH) - No Zod schema for user updates
- `app/api/pawkits/[id]/route.ts` (PATCH) - Validation happens in service, but not documented
- `app/api/import/route.ts` (POST) - Should validate import structure

**3. Query Parameter Validation**

Some routes parse query params without validation:

```typescript
// cards/route.ts:79-89
const query = Object.fromEntries(searchParams.entries());
const statusParam = query.status;
const status = statusParam && ["PENDING", "READY", "ERROR"].includes(statusParam)
  ? statusParam as "PENDING" | "READY" | "ERROR"
  : undefined;
```

This is manual validation - could use Zod schema instead:

```typescript
const parsed = cardListQuerySchema.parse(query); // ✅ Better approach
```

**4. No Validation for Request Headers**

Special headers like `If-Unmodified-Since` are used but not validated:

```typescript
// cards/[id]/route.ts:70
const ifUnmodifiedSince = request.headers.get('If-Unmodified-Since');
if (ifUnmodifiedSince && !isMetadataUpdate) {
  const clientTimestamp = new Date(ifUnmodifiedSince).getTime(); // No validation
```

#### 📋 Recommendations

**Priority: HIGH**

1. **Create Validation Schemas for All Routes**

```typescript
// lib/validators/user.ts - New file
export const userUpdateSchema = z.object({
  displayName: z.string().trim().max(100).nullable().optional(),
  serverSync: z.boolean().optional(),
}).refine(
  (data) => Object.keys(data).length > 0,
  { message: "At least one field required" }
);
```

2. **Validate in Route Handlers**

Always validate at the API boundary:

```typescript
export async function PATCH(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();

    const body = await request.json();
    const validated = userUpdateSchema.parse(body); // ✅ Validate here

    await updateUser(user.id, validated);
    return success();
  } catch (error) {
    return handleApiError(error);
  }
}
```

3. **Validate Query Parameters**

```typescript
// Use Zod for query params
const { searchParams } = new URL(request.url);
const query = cardListQuerySchema.parse(
  Object.fromEntries(searchParams.entries())
);
```

4. **Validate Special Headers**

```typescript
// lib/validators/headers.ts
export const ifUnmodifiedSinceSchema = z.string().datetime();

// In route
const ifUnmodifiedSince = request.headers.get('If-Unmodified-Since');
if (ifUnmodifiedSince) {
  try {
    ifUnmodifiedSinceSchema.parse(ifUnmodifiedSince);
  } catch {
    return NextResponse.json(
      { error: "Invalid If-Unmodified-Since header" },
      { status: 400 }
    );
  }
}
```

---

### 3. Edge Cases

#### ⚠️ Issues Found

**1. Empty Request Bodies**

Some routes don't handle empty bodies:

```typescript
// user/route.ts:36
const body = await request.json(); // What if body is malformed JSON?
```

**2. Missing Resource Handling**

Inconsistent 404 responses:

```typescript
// cards/[id]/route.ts:24-28 - Good
const card = await getCard(user.id, params.id);
if (!card) {
  return NextResponse.json({ message: "Not found" }, { status: 404 });
}

// pawkits/[id]/route.ts:21 - Missing explicit check
const collection = await updateCollection(user.id, params.id, body);
// What if collection doesn't exist? Throws in service layer
```

**3. Race Conditions**

Multi-step operations aren't transactional:

```typescript
// cards/route.ts:129-135
const card = await createCard(user.id, body);
// Race: What if card is deleted here?
if (body.source === 'webext' && card.type === 'url') {
  fetchAndUpdateCardMetadata(card.id, card.url).catch(...);
}
```

**4. Large Payload Handling**

No explicit limits on request body size:

```typescript
// import/route.ts:30 - Could be huge JSON
const body = await request.json();
const result = await importData(user.id, body);
```

**5. Concurrent Update Detection**

Only card updates check for conflicts, collections don't:

```typescript
// cards/[id]/route.ts:70-89 - Has conflict detection ✅
const ifUnmodifiedSince = request.headers.get('If-Unmodified-Since');

// pawkits/[id]/route.ts - No conflict detection ❌
```

#### 📋 Recommendations

**Priority: MEDIUM**

1. **Wrap JSON Parsing**

```typescript
async function safeJsonParse(request: NextRequest) {
  try {
    return await request.json();
  } catch (error) {
    throw new Error("Invalid JSON in request body");
  }
}

// Usage
const body = await safeJsonParse(request);
```

2. **Always Check Resource Existence**

```typescript
export async function PATCH(request: NextRequest, segmentData: RouteParams) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const params = await segmentData.params;

  // Check existence first
  const existing = await getCollection(user.id, params.id);
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json();
  const updated = await updateCollection(user.id, params.id, body);
  return NextResponse.json(updated);
}
```

3. **Use Transactions for Multi-Step Operations**

```typescript
// trash/empty/route.ts:15-22 - Already uses transaction ✅
await prisma.$transaction([
  prisma.card.deleteMany({ where: { userId: user.id, deleted: true }}),
  prisma.collection.deleteMany({ where: { userId: user.id, deleted: true }})
]);
```

Apply this pattern to other multi-step operations.

4. **Add Payload Size Limits**

```typescript
// middleware.ts or per-route
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb', // Adjust based on needs
    },
  },
};
```

5. **Add Conflict Detection to Collections**

```typescript
// pawkits/[id]/route.ts
const ifUnmodifiedSince = request.headers.get('If-Unmodified-Since');
if (ifUnmodifiedSince) {
  const current = await getCollection(user.id, params.id);
  if (current && new Date(current.updatedAt) > new Date(ifUnmodifiedSince)) {
    return NextResponse.json(
      { error: "Conflict", serverCollection: current },
      { status: 409 }
    );
  }
}
```

---

### 4. Authentication & Authorization

#### ✅ What's Working Well

**Dual Auth Support**

Extension token auth + session auth:

```typescript
// cards/route.ts:47-62
async function getAuthenticatedUser(request: NextRequest) {
  // Try extension token first
  const authHeader = request.headers.get('Authorization')
  if (authHeader) {
    const token = extractTokenFromHeader(authHeader)
    if (token) {
      const user = await getUserByExtensionToken(token)
      if (user) return user
    }
  }
  // Fall back to session
  return getCurrentUser()
}
```

**Consistent Auth Checks**

All routes check authentication:

```typescript
const user = await getCurrentUser();
if (!user) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
```

#### ⚠️ Issues Found

**1. Inconsistent Auth Function Usage**

Some routes use `getCurrentUser()`, others use `createClient().auth.getUser()`:

```typescript
// Most routes (cards/[id]/route.ts:18)
const user = await getCurrentUser(); // ✅

// user/view-settings/route.ts:7-10
const supabase = await createClient();
const { data: { user } } = await supabase.auth.getUser(); // ❌ Inconsistent
```

**2. No Authorization Checks**

Routes verify authentication but not authorization. All users can access all resources of other users?

Example missing check:
```typescript
// What if a user tries to access another user's card by guessing the ID?
const card = await getCard(user.id, params.id); // ✅ userId filter present
```

Actually, the service functions DO filter by userId, which is good. But this should be documented.

**3. Extension Token Security**

Token generation is rate-limited (5/hour) but token usage isn't:

```typescript
// extension/token/route.ts:18-35 - Rate limited ✅
rateLimit({ identifier: `token-gen:${user.id}`, limit: 5, windowMs: 3600000 })

// cards/route.ts:52 - Extension token auth - No rate limit? ❌
const user = await getUserByExtensionToken(token)
```

#### 📋 Recommendations

**Priority: MEDIUM**

1. **Standardize Auth Method**

Always use `getCurrentUser()`:

```typescript
// user/view-settings/route.ts - Update
const user = await getCurrentUser(); // Instead of supabase.auth.getUser()
```

2. **Document Authorization Pattern**

Add comments explaining how userId filtering prevents unauthorized access:

```typescript
export async function GET(_request: NextRequest, segmentData: RouteParams) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const params = await segmentData.params;

  // Authorization: getCard filters by userId, preventing access to other users' cards
  const card = await getCard(user.id, params.id);
  if (!card) return notFound();

  return NextResponse.json(card);
}
```

3. **Add Rate Limiting to Extension Token Usage**

```typescript
// cards/route.ts
if (authHeader) {
  // Rate limit extension token requests (prevent token abuse)
  const rateLimitResult = rateLimit({
    identifier: `ext-auth:${authHeader}`,
    limit: 1000,
    windowMs: 60000, // 1000 requests per minute
  });

  if (!rateLimitResult.allowed) {
    return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  }
}
```

---

### 5. Rate Limiting

#### ✅ What's Working Well

**Rate Limiting on Critical Endpoints**

```typescript
// cards/route.ts:108-124 - Card creation (60/min)
const rateLimitResult = rateLimit({
  identifier: `card-create:${user.id}`,
  limit: 60,
  windowMs: 60000,
});

// extension/token/route.ts:18-35 - Token generation (5/hour)
rateLimit({
  identifier: `token-gen:${user.id}`,
  limit: 5,
  windowMs: 3600000,
});
```

**Proper Headers**

```typescript
const rateLimitHeaders = getRateLimitHeaders(rateLimitResult);
return NextResponse.json(data, { headers: rateLimitHeaders });
```

#### ⚠️ Issues Found

**1. Missing Rate Limits**

Many endpoints lack rate limiting:

- Card updates (PATCH `/api/cards/[id]`) - No limit
- Collection creation (POST `/api/pawkits`) - No limit
- Import (POST `/api/import`) - No limit (could be abused)
- Metadata fetch (POST `/api/cards/[id]/fetch-metadata`) - No limit
- Session heartbeat (POST `/api/sessions/heartbeat`) - No limit

**2. Inconsistent Limits**

No documented rate limiting strategy. Why 60/min for cards but 5/hour for tokens?

#### 📋 Recommendations

**Priority: MEDIUM**

1. **Add Rate Limiting to All Write Endpoints**

```typescript
// Suggested limits:
const RATE_LIMITS = {
  cardCreate: { limit: 60, windowMs: 60000 },      // 60/min
  cardUpdate: { limit: 120, windowMs: 60000 },     // 120/min
  collectionCreate: { limit: 20, windowMs: 60000 }, // 20/min
  collectionUpdate: { limit: 60, windowMs: 60000 }, // 60/min
  import: { limit: 5, windowMs: 3600000 },         // 5/hour
  metadataFetch: { limit: 100, windowMs: 60000 },  // 100/min
  heartbeat: { limit: 120, windowMs: 60000 },      // 120/min (2/sec)
};
```

2. **Document Rate Limiting Strategy**

Create `lib/utils/rate-limits.ts`:

```typescript
/**
 * Rate Limiting Strategy
 *
 * - Read operations: Higher limits (minimize UX impact)
 * - Write operations: Moderate limits (prevent abuse)
 * - Expensive operations: Lower limits (protect resources)
 * - Auth operations: Strict limits (security)
 */
export const RATE_LIMITS = { /* ... */ };
```

---

### 6. CORS Handling

#### ✅ What's Working Well

**Sophisticated CORS Logic**

```typescript
// cards/route.ts:16-45
function getCorsHeaders(request: NextRequest): HeadersInit {
  const origin = request.headers.get('origin') || '';
  const requestUrl = new URL(request.url);

  // Same-origin
  if (origin === requestUrl.origin) return corsHeaders;

  // Authorized extension
  if (isAllowedExtensionOrigin(origin)) return corsHeaders;

  // Reject others
  return defaultHeaders;
}
```

**OPTIONS Handler**

```typescript
export async function OPTIONS(request: NextRequest) {
  const corsHeaders = getCorsHeaders(request);
  return NextResponse.json({}, { headers: corsHeaders })
}
```

#### ⚠️ Issues Found

**1. CORS Logic Only on Some Routes**

CORS handling is implemented on:
- `/api/cards` ✅

But missing on:
- `/api/pawkits`
- `/api/import`
- `/api/user`
- Most other routes

**2. No Global CORS Middleware**

CORS logic is duplicated per-route instead of using middleware.

#### 📋 Recommendations

**Priority: LOW** (only if browser extension needs access to more routes)

1. **Extract CORS to Middleware**

```typescript
// middleware.ts
import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  // CORS handling
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 200,
      headers: getCorsHeaders(request),
    });
  }

  const response = NextResponse.next();
  const corsHeaders = getCorsHeaders(request);
  Object.entries(corsHeaders).forEach(([key, value]) => {
    response.headers.set(key, value as string);
  });

  return response;
}

export const config = {
  matcher: '/api/:path*',
};
```

---

### 7. Logging & Monitoring

#### ⚠️ Issues Found

**1. Inconsistent Logging**

Some routes log extensively, others don't:

```typescript
// cards/[id]/fetch-metadata/route.ts - Verbose logging ✅
console.log('[API] Fetch metadata request received');
console.log('[API] Card ID:', id);
console.log('[API] Fetching metadata for URL:', url);

// cards/[id]/route.ts - No logging ❌
export async function PATCH(request: NextRequest, segmentData: RouteParams) {
  try {
    // ... no logs
  }
}
```

**2. Inconsistent Log Prefixes**

Different prefixes used:
- `[API]`
- `[Heartbeat]`
- `[fetchAndUpdateCardMetadata]`
- None

**3. No Structured Logging**

Logs are plain strings, not structured:

```typescript
console.error('Error generating extension token:', error) // Plain string
```

Should be:

```typescript
logger.error('Token generation failed', {
  userId: user.id,
  error: error instanceof Error ? error.message : String(error),
  timestamp: new Date().toISOString(),
});
```

#### 📋 Recommendations

**Priority: LOW**

1. **Implement Structured Logging**

```typescript
// lib/utils/logger.ts
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: any;
}

export const logger = {
  debug: (message: string, context?: LogContext) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(JSON.stringify({ level: 'debug', message, ...context, timestamp: new Date() }));
    }
  },
  info: (message: string, context?: LogContext) => {
    console.log(JSON.stringify({ level: 'info', message, ...context, timestamp: new Date() }));
  },
  error: (message: string, context?: LogContext) => {
    console.error(JSON.stringify({ level: 'error', message, ...context, timestamp: new Date() }));
  },
};

// Usage
logger.error('Card creation failed', { userId: user.id, error: error.message });
```

2. **Add Request ID Tracking**

```typescript
// middleware.ts
export function middleware(request: NextRequest) {
  const requestId = crypto.randomUUID();
  request.headers.set('X-Request-ID', requestId);
  return NextResponse.next();
}

// In routes
const requestId = request.headers.get('X-Request-ID');
logger.info('Processing request', { requestId, route: '/api/cards' });
```

---

### 8. Specific Route Issues

#### `/api/cards/route.ts`

**Issues:**
1. Manual status validation (line 82) - should use Zod
2. CORS logic duplicated
3. Background metadata fetch has no error recovery

**Recommendations:**
```typescript
// Use Zod for query params
const query = cardListQuerySchema.parse(Object.fromEntries(searchParams.entries()));

// Add retry logic for background metadata
fetchAndUpdateCardMetadata(card.id, card.url)
  .catch(err => {
    logger.error('Metadata fetch failed', { cardId: card.id, error: err.message });
    // Queue for retry
    queueMetadataRetry(card.id);
  });
```

#### `/api/cards/[id]/route.ts`

**Issues:**
1. No logging for update operations
2. Manual metadata update detection (line 68) - fragile logic
3. serverSync check duplicated (could be middleware)

**Recommendations:**
```typescript
// Add logging
logger.info('Updating card', { cardId: params.id, userId: user.id });

// Better metadata detection
const METADATA_FIELDS = ['metadata', 'title', 'description', 'image', 'domain'];
const isMetadataUpdate = Object.keys(body).some(k => METADATA_FIELDS.includes(k));
```

#### `/api/import/route.ts`

**Issues:**
1. No validation of import structure
2. No rate limiting (could import huge datasets)
3. No size limit check

**Recommendations:**
```typescript
// Add validation
import { importDataSchema } from '@/lib/validators/import';

export async function POST(request: NextRequest) {
  // ... auth

  // Rate limit
  const rateLimitResult = rateLimit({
    identifier: `import:${user.id}`,
    limit: 5,
    windowMs: 3600000,
  });
  if (!rateLimitResult.allowed) return tooManyRequests();

  // Validate
  const body = await request.json();
  const validated = importDataSchema.parse(body);

  // Check size
  if (validated.cards.length > 10000) {
    return NextResponse.json(
      { error: "Import too large", message: "Maximum 10,000 cards" },
      { status: 413 }
    );
  }

  const result = await importData(user.id, validated);
  return NextResponse.json(result);
}
```

#### `/api/user/view-settings/route.ts`

**Issues:**
1. Uses Supabase client directly instead of `getCurrentUser()`
2. Manual validation instead of Zod schema
3. Hard-coded validViews array

**Recommendations:**
```typescript
// Use getCurrentUser()
const user = await getCurrentUser();

// Create Zod schema
const viewSettingsUpdateSchema = z.object({
  view: z.enum(["library", "notes", "den", "timeline", "pawkits", "home", "favorites", "trash"]),
  settings: z.object({
    layout: z.string().optional(),
    cardSize: z.number().int().min(1).max(5).optional(),
    // ... other fields
  }),
});

// Validate
const { view, settings } = viewSettingsUpdateSchema.parse(body);
```

#### `/api/sessions/heartbeat/route.ts`

**Issues:**
1. No rate limiting (called every 30s per tab)
2. No validation of deviceId format
3. Could accumulate stale sessions

**Recommendations:**
```typescript
// Add rate limiting
const rateLimitResult = rateLimit({
  identifier: `heartbeat:${user.id}`,
  limit: 120, // 2/sec
  windowMs: 60000,
});

// Validate input
const heartbeatSchema = z.object({
  deviceId: z.string().uuid(),
  deviceName: z.string().min(1).max(200),
  browser: z.string().max(100).optional(),
  os: z.string().max(100).optional(),
});
const validated = heartbeatSchema.parse(body);

// Cleanup old sessions periodically
if (Math.random() < 0.01) { // 1% of requests
  await cleanupOldSessions(user.id);
}
```

---

## Summary of Recommendations

### Priority: HIGH (Security & Data Integrity)

1. **Standardize error response format** across all routes
2. **Add validation schemas** for all routes missing them
3. **Validate at API boundary** (in route handlers, not just service layer)
4. **Add error codes** for client error handling

**Estimated Effort:** 2-3 days

### Priority: MEDIUM (Robustness & UX)

1. **Add rate limiting** to all write endpoints
2. **Implement conflict detection** for collections
3. **Add request body size limits**
4. **Improve error messages** with more context
5. **Always check resource existence** before operations

**Estimated Effort:** 2-3 days

### Priority: LOW (Code Quality & Maintenance)

1. **Implement structured logging**
2. **Extract CORS to middleware**
3. **Add request ID tracking**
4. **Document authorization patterns**

**Estimated Effort:** 1-2 days

---

## Proposed Code Improvements

### 1. Create Standard Response Helpers

```typescript
// lib/utils/api-responses.ts
import { NextResponse } from 'next/server';

export const ErrorCodes = {
  UNAUTHORIZED: 'UNAUTHORIZED',
  NOT_FOUND: 'NOT_FOUND',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  CONFLICT: 'CONFLICT',
  RATE_LIMITED: 'RATE_LIMITED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

interface ApiErrorResponse {
  error: string;
  message: string;
  code: string;
  details?: any;
}

export function unauthorized(message = 'Unauthorized'): NextResponse {
  return NextResponse.json<ApiErrorResponse>({
    error: 'Unauthorized',
    message,
    code: ErrorCodes.UNAUTHORIZED,
  }, { status: 401 });
}

export function notFound(resource = 'Resource', details?: any): NextResponse {
  return NextResponse.json<ApiErrorResponse>({
    error: 'Not Found',
    message: `${resource} not found`,
    code: ErrorCodes.NOT_FOUND,
    details,
  }, { status: 404 });
}

export function validationError(message: string, details?: any): NextResponse {
  return NextResponse.json<ApiErrorResponse>({
    error: 'Validation Error',
    message,
    code: ErrorCodes.VALIDATION_ERROR,
    details,
  }, { status: 400 });
}

export function conflict(message: string, details?: any): NextResponse {
  return NextResponse.json<ApiErrorResponse>({
    error: 'Conflict',
    message,
    code: ErrorCodes.CONFLICT,
    details,
  }, { status: 409 });
}

export function rateLimited(message = 'Too many requests'): NextResponse {
  return NextResponse.json<ApiErrorResponse>({
    error: 'Rate Limited',
    message,
    code: ErrorCodes.RATE_LIMITED,
  }, { status: 429 });
}

export function success<T>(data: T, status = 200): NextResponse {
  return NextResponse.json(data, { status });
}

export function created<T>(data: T): NextResponse {
  return NextResponse.json(data, { status: 201 });
}
```

### 2. Enhanced Error Handler

```typescript
// lib/utils/api-error.ts - Enhanced version
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { validationError, unauthorized, notFound, conflict } from "./api-responses";
import { logger } from "./logger";

export function handleApiError(error: unknown, context?: { route?: string; userId?: string }): NextResponse {
  // Log all errors with context
  logger.error('API Error', {
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    ...context,
  });

  // Zod validation errors
  if (error instanceof ZodError) {
    return validationError('Invalid input', error.errors);
  }

  // Prisma errors
  if (error && typeof error === 'object' && 'code' in error && typeof error.code === 'string') {
    const prismaError = error as { code: string; meta?: any };
    switch (prismaError.code) {
      case "P2025":
        return notFound('Resource', prismaError.meta);
      case "P2002":
        return conflict('Resource already exists', prismaError.meta);
      case "P2003":
        return validationError('Invalid reference', prismaError.meta);
      default:
        if (prismaError.code.startsWith('P')) {
          return NextResponse.json({
            error: 'Database Error',
            message: 'A database error occurred',
            code: 'DATABASE_ERROR',
          }, { status: 500 });
        }
    }
  }

  // Custom validation errors
  if (error instanceof Error) {
    if (error.message.includes("required") || error.message.includes("invalid")) {
      return validationError(error.message);
    }
  }

  // Unknown error
  return NextResponse.json({
    error: 'Internal Server Error',
    message: 'An unexpected error occurred',
    code: 'INTERNAL_ERROR',
  }, { status: 500 });
}
```

### 3. Rate Limiting Configuration

```typescript
// lib/config/rate-limits.ts
export const RATE_LIMITS = {
  // Card operations
  cardCreate: { limit: 60, windowMs: 60000, identifier: (userId: string) => `card-create:${userId}` },
  cardUpdate: { limit: 120, windowMs: 60000, identifier: (userId: string) => `card-update:${userId}` },
  cardDelete: { limit: 60, windowMs: 60000, identifier: (userId: string) => `card-delete:${userId}` },

  // Collection operations
  collectionCreate: { limit: 20, windowMs: 60000, identifier: (userId: string) => `collection-create:${userId}` },
  collectionUpdate: { limit: 60, windowMs: 60000, identifier: (userId: string) => `collection-update:${userId}` },

  // Expensive operations
  import: { limit: 5, windowMs: 3600000, identifier: (userId: string) => `import:${userId}` },
  export: { limit: 10, windowMs: 3600000, identifier: (userId: string) => `export:${userId}` },
  metadataFetch: { limit: 100, windowMs: 60000, identifier: (userId: string) => `metadata:${userId}` },

  // Session management
  heartbeat: { limit: 120, windowMs: 60000, identifier: (userId: string) => `heartbeat:${userId}` },

  // Auth operations
  tokenGenerate: { limit: 5, windowMs: 3600000, identifier: (userId: string) => `token-gen:${userId}` },
  tokenAuth: { limit: 1000, windowMs: 60000, identifier: (token: string) => `ext-auth:${token}` },
} as const;

// Helper function
export function applyRateLimit(
  limitName: keyof typeof RATE_LIMITS,
  identifier: string
) {
  const config = RATE_LIMITS[limitName];
  return rateLimit({
    identifier: typeof config.identifier === 'function' ? config.identifier(identifier) : identifier,
    limit: config.limit,
    windowMs: config.windowMs,
  });
}
```

---

## Testing Recommendations

1. **Add Integration Tests** for all routes
2. **Test Error Scenarios**:
   - Invalid auth
   - Missing required fields
   - Invalid data types
   - Resource not found
   - Conflict conditions
   - Rate limiting
3. **Test Edge Cases**:
   - Empty request bodies
   - Malformed JSON
   - Very large payloads
   - Concurrent updates
   - Network timeouts

---

## Conclusion

The Pawkit API is **well-structured** with good foundations (centralized error handling, Zod validation, rate limiting on key endpoints). However, there are opportunities to improve consistency, robustness, and security.

**Next Steps:**
1. Implement HIGH priority recommendations first (error standardization, validation)
2. Add comprehensive integration tests
3. Monitor error rates and adjust rate limits
4. Document API standards for future development

**Estimated Total Effort:** 5-8 days for all improvements

---

**Report Generated:** October 28, 2025
**Version:** 1.0
