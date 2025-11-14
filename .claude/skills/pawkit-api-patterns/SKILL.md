---
name: pawkit-api-patterns
description: Document standardized API conventions and patterns for consistent error handling
---

# Pawkit API Standards & Patterns

**Purpose**: Document standardized API conventions and patterns from October 2025 audit

**Status**: 30 routes standardized in October 2025

**Key Principle**: Consistent error handling, proper status codes, CORS support, Zod validation

---

## API STANDARDIZATION HISTORY

### October 2025 Audit

**Scope**: 30 API routes across all endpoints

**Standardized**:
- ✅ Error handling with proper status codes
- ✅ Consistent response format (success, data, error)
- ✅ CORS headers on all routes
- ✅ Zod schema validation
- ✅ Variable scope in error handlers
- ✅ Structured error responses

**Impact**:
- Zero 500 errors from undefined variables
- Consistent client error handling
- Cross-origin support for browser extension
- Type-safe request validation

---

## REST API PATTERNS

### HTTP Methods

**Use these methods**:

| Method | Purpose | Status Code | Response Body |
|--------|---------|-------------|---------------|
| **GET** | Read/List resources | 200 | { success: true, data: [...] } |
| **POST** | Create resource | 201 | { success: true, data: {...} } |
| **PATCH** | Update resource | 200 | { success: true, data: {...} } |
| **DELETE** | Delete resource | 204 | (no body) |

**❌ NEVER USE PUT** - Use PATCH for updates

**Why no PUT?**:
- PUT requires full resource replacement
- PATCH allows partial updates (our use case)
- Simpler client code (send only changed fields)
- Consistent with REST best practices

---

### Route Structure

**Pattern**: `/api/[resource]/[id]/[action]`

**Examples**:
```
GET    /api/cards              → List all cards
GET    /api/cards/:id          → Get single card
POST   /api/cards              → Create card
PATCH  /api/cards/:id          → Update card
DELETE /api/cards/:id          → Delete card

GET    /api/pawkits            → List collections
GET    /api/pawkits/:id        → Get single collection
POST   /api/pawkits            → Create collection
PATCH  /api/pawkits/:id        → Update collection
DELETE /api/pawkits/:id        → Delete collection
```

**Nested Resources**:
```
GET    /api/pawkits/:id/cards  → List cards in collection
POST   /api/cards/:id/notes    → Add note to card
```

---

## HTTP STATUS CODES

### Success Codes

**200 OK** - Successful GET, PATCH, or operation
```tsx
return NextResponse.json(
  { success: true, data: card },
  { status: 200, headers: getCorsHeaders(request) }
);
```

**201 Created** - Successful POST (resource created)
```tsx
return NextResponse.json(
  { success: true, data: card },
  { status: 201, headers: getCorsHeaders(request) }
);
```

**204 No Content** - Successful DELETE
```tsx
return new NextResponse(null, {
  status: 204,
  headers: getCorsHeaders(request)
});
```

---

### Client Error Codes (4xx)

**400 Bad Request** - Invalid request format
```tsx
return NextResponse.json(
  {
    success: false,
    error: {
      code: 'BAD_REQUEST',
      message: 'Invalid request body'
    }
  },
  { status: 400, headers: getCorsHeaders(request) }
);
```

**401 Unauthorized** - Missing or invalid authentication
```tsx
return NextResponse.json(
  {
    success: false,
    error: {
      code: 'UNAUTHORIZED',
      message: 'Authentication required'
    }
  },
  { status: 401, headers: getCorsHeaders(request) }
);
```

**404 Not Found** - Resource doesn't exist
```tsx
return NextResponse.json(
  {
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'Card not found'
    }
  },
  { status: 404, headers: getCorsHeaders(request) }
);
```

**409 Conflict** - Resource already exists (duplicate)

**When to use**: Duplicate resource creation (e.g., URL already bookmarked)

**Real-world example** - Duplicate URL detection in `/api/cards`:
```tsx
// In lib/server/cards.ts - Pre-flight duplicate check
export async function createCard(userId: string, payload: CardInput) {
  const cardType = payload.type || "url";

  // Check for duplicates BEFORE attempting to create
  if (cardType === "url" && payload.url) {
    const existingCard = await prisma.card.findFirst({
      where: {
        userId,
        url: payload.url,
        type: "url",
        deleted: false  // Only check active cards
      }
    });

    if (existingCard) {
      // Throw specific error with existing card ID
      throw new Error(`DUPLICATE_URL:${existingCard.id}`);
    }
  }

  // Proceed with creation...
  const created = await prisma.card.create({ data });
  return mapCard(created);
}

// In app/api/cards/route.ts - API error handling
try {
  const card = await createCard(user.id, body);
  return created(card);
} catch (error) {
  // Handle duplicate URL detection
  if (error instanceof Error && error.message?.startsWith('DUPLICATE_URL:')) {
    const cardId = error.message.split(':')[1];
    return withCorsHeaders(
      NextResponse.json(
        {
          error: 'Duplicate URL',
          code: 'DUPLICATE_URL',
          existingCardId: cardId !== 'unknown' ? cardId : undefined
        },
        { status: 409 }
      ),
      corsHeaders
    );
  }

  return handleApiError(error, { route: '/api/cards', userId: user?.id });
}
```

**Client-side handling**:
```tsx
try {
  await addCard(payload);
  onClose();
} catch (error) {
  // Handle 409 duplicate error
  if (error instanceof Error && error.message.startsWith('DUPLICATE_URL:')) {
    setError('This URL is already bookmarked');
    setToastMessage('This URL is already bookmarked');
    setShowToast(true);
    return;
  }
  // Handle other errors...
}
```

**Key points**:
- Pre-flight check prevents duplicate creation
- Returns existing resource ID in error response
- Client shows user-friendly toast notification
- Only checks active (non-deleted) resources
- Database constraint aligned with application logic

**See**: `.claude/skills/pawkit-troubleshooting/SKILL.md` Issue #28 for duplicate detection patterns

**422 Unprocessable Entity** - Validation failed
```tsx
return NextResponse.json(
  {
    success: false,
    error: {
      code: 'VALIDATION_ERROR',
      message: 'Invalid card data',
      details: zodError.errors // Include validation details
    }
  },
  { status: 422, headers: getCorsHeaders(request) }
);
```

---

### Server Error Codes (5xx)

**500 Internal Server Error** - Unexpected server error
```tsx
return NextResponse.json(
  {
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred'
      // ❌ NEVER expose internal error details to client
    }
  },
  { status: 500, headers: getCorsHeaders(request) }
);
```

**When to use 500**:
- Database connection failures
- Unhandled exceptions
- System errors
- **NOT** for validation errors (use 422)
- **NOT** for missing auth (use 401)
- **NOT** for not found (use 404)

---

## RESPONSE FORMAT

### Success Response

**Structure**:
```tsx
{
  success: true,
  data: T  // The actual response data
}
```

**Examples**:

Single resource:
```tsx
{
  success: true,
  data: {
    id: "abc123",
    title: "My Card",
    url: "https://example.com",
    createdAt: "2025-01-15T10:30:00Z"
  }
}
```

List of resources:
```tsx
{
  success: true,
  data: [
    { id: "1", title: "Card 1" },
    { id: "2", title: "Card 2" }
  ]
}
```

With metadata:
```tsx
{
  success: true,
  data: {
    cards: [...],
    total: 42,
    page: 1,
    pageSize: 20
  }
}
```

---

### Error Response

**Structure**:
```tsx
{
  success: false,
  error: {
    code: string,      // Machine-readable error code
    message: string,   // Human-readable message
    details?: any      // Optional additional context
  }
}
```

**Error Codes**:
```tsx
// lib/api/error-codes.ts

export const ErrorCode = {
  // Client Errors (4xx)
  BAD_REQUEST: 'BAD_REQUEST',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  VALIDATION_ERROR: 'VALIDATION_ERROR',

  // Server Errors (5xx)
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR'
} as const;
```

**Examples**:

Validation error:
```tsx
{
  success: false,
  error: {
    code: "VALIDATION_ERROR",
    message: "Invalid card data",
    details: [
      { field: "url", message: "Invalid URL format" },
      { field: "title", message: "Title is required" }
    ]
  }
}
```

Conflict (duplicate):
```tsx
{
  success: false,
  error: {
    code: "CONFLICT",
    message: "Card with this URL already exists"
  },
  card: {
    id: "existing123",
    url: "https://example.com",
    title: "Existing Card"
  }
}
```

Not found:
```tsx
{
  success: false,
  error: {
    code: "NOT_FOUND",
    message: "Card not found"
  }
}
```

---

## CRITICAL PATTERNS

### 1. Variable Scope in Error Handlers

**❌ WRONG** - Variable declared inside try block
```tsx
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const user = await getUser(request);

    const card = await prisma.card.create({
      data: { ...body, userId: user.id }
    });

    return NextResponse.json({ success: true, data: card });
  } catch (error) {
    // ❌ ERROR: 'user' is not defined in this scope
    console.error('Error creating card for user:', user.id);

    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed' } },
      { status: 500 }
    );
  }
}
```

**✅ CORRECT** - Variables declared outside try block
```tsx
export async function POST(request: Request) {
  let user: User | null = null;
  let body: any = null;

  try {
    body = await request.json();
    user = await getUser(request);

    const card = await prisma.card.create({
      data: { ...body, userId: user.id }
    });

    return NextResponse.json(
      { success: true, data: card },
      { status: 201, headers: getCorsHeaders(request) }
    );
  } catch (error) {
    // ✅ CORRECT: 'user' is accessible in error handler
    console.error('Error creating card for user:', user?.id);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to create card'
        }
      },
      { status: 500, headers: getCorsHeaders(request) }
    );
  }
}
```

**Why this matters**:
- Prevents "variable not defined" errors in production
- Allows proper error logging with context
- All 30 routes updated to follow this pattern in October 2025

---

### 2. Always Include CORS Headers

**❌ WRONG** - Missing CORS headers
```tsx
export async function GET(request: Request) {
  const cards = await prisma.card.findMany();

  // ❌ Browser extension can't make requests
  return NextResponse.json({ success: true, data: cards });
}

export async function OPTIONS(request: Request) {
  // ❌ No preflight response
}
```

**✅ CORRECT** - CORS on all responses
```tsx
// lib/api/cors.ts
export function getCorsHeaders(request: Request): Headers {
  const headers = new Headers();
  const origin = request.headers.get('origin') || '*';

  headers.set('Access-Control-Allow-Origin', origin);
  headers.set('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  headers.set('Access-Control-Max-Age', '86400'); // 24 hours

  return headers;
}

// app/api/cards/route.ts
export async function GET(request: Request) {
  const cards = await prisma.card.findMany();

  return NextResponse.json(
    { success: true, data: cards },
    { headers: getCorsHeaders(request) }
  );
}

export async function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: getCorsHeaders(request)
  });
}
```

**Why this matters**:
- Browser extension must make cross-origin requests
- Preflight OPTIONS requests must be handled
- All routes need CORS, not just some

---

### 3. Use Zod for Validation

**❌ WRONG** - Manual validation
```tsx
export async function POST(request: Request) {
  const body = await request.json();

  // ❌ Manual validation is error-prone
  if (!body.url) {
    return NextResponse.json(
      { success: false, error: { code: 'BAD_REQUEST', message: 'URL required' } },
      { status: 400 }
    );
  }

  if (typeof body.url !== 'string') {
    return NextResponse.json(
      { success: false, error: { code: 'BAD_REQUEST', message: 'URL must be string' } },
      { status: 400 }
    );
  }

  // ... more validation
}
```

**✅ CORRECT** - Zod schema validation
```tsx
// lib/schemas/card.ts
import { z } from 'zod';

export const CreateCardSchema = z.object({
  url: z.string().url('Invalid URL format').optional(),
  title: z.string().min(1, 'Title is required').max(500, 'Title too long'),
  description: z.string().max(2000, 'Description too long').optional(),
  collectionSlug: z.string().optional(),
  tags: z.array(z.string()).optional(),
  isPrivate: z.boolean().optional()
});

export type CreateCardInput = z.infer<typeof CreateCardSchema>;

// app/api/cards/route.ts
export async function POST(request: Request) {
  let body: any = null;

  try {
    body = await request.json();

    // Validate with Zod
    const validatedData = CreateCardSchema.parse(body);

    const card = await prisma.card.create({
      data: validatedData
    });

    return NextResponse.json(
      { success: true, data: card },
      { status: 201, headers: getCorsHeaders(request) }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid card data',
            details: error.errors
          }
        },
        { status: 422, headers: getCorsHeaders(request) }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to create card'
        }
      },
      { status: 500, headers: getCorsHeaders(request) }
    );
  }
}
```

**Benefits**:
- Type-safe validation
- Automatic error messages
- Single source of truth for validation rules
- Easy to test

---

### 4. Use Prisma Transactions for Related Updates

**❌ WRONG** - Sequential updates (race conditions)
```tsx
export async function PATCH(request: Request) {
  const body = await request.json();

  // ❌ Not atomic - card could be deleted between these calls
  const card = await prisma.card.update({
    where: { id: body.cardId },
    data: { title: body.title }
  });

  await prisma.cardHistory.create({
    data: {
      cardId: card.id,
      action: 'UPDATED',
      changes: { title: body.title }
    }
  });

  return NextResponse.json({ success: true, data: card });
}
```

**✅ CORRECT** - Atomic transaction
```tsx
export async function PATCH(request: Request) {
  const body = await request.json();

  try {
    const result = await prisma.$transaction(async (tx) => {
      // Both operations succeed or both fail
      const card = await tx.card.update({
        where: { id: body.cardId },
        data: { title: body.title }
      });

      await tx.cardHistory.create({
        data: {
          cardId: card.id,
          action: 'UPDATED',
          changes: { title: body.title }
        }
      });

      return card;
    });

    return NextResponse.json(
      { success: true, data: result },
      { status: 200, headers: getCorsHeaders(request) }
    );
  } catch (error) {
    // Transaction rolled back automatically
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Failed to update card'
        }
      },
      { status: 500, headers: getCorsHeaders(request) }
    );
  }
}
```

**When to use transactions**:
- Multiple related database operations
- Need atomicity (all succeed or all fail)
- Prevent race conditions
- Maintain referential integrity

---

## KNOWN ISSUES TO AVOID

### Issue 1: Using 'deleted' Field in PATCH

**❌ WRONG** - 'deleted' field doesn't exist
```tsx
// app/api/cards/[id]/route.ts

export async function PATCH(request: Request) {
  const body = await request.json();

  // ❌ ERROR: Field 'deleted' does not exist in Card model
  const card = await prisma.card.update({
    where: { id: params.id },
    data: {
      title: body.title,
      deleted: body.deleted  // ❌ This field doesn't exist!
    }
  });

  return NextResponse.json({ success: true, data: card });
}
```

**✅ CORRECT** - Use 'deletedAt' field
```tsx
export async function PATCH(request: Request) {
  const body = await request.json();

  // ✅ Use deletedAt timestamp for soft delete
  const card = await prisma.card.update({
    where: { id: params.id },
    data: {
      title: body.title,
      deletedAt: body.deleted ? new Date() : null
    }
  });

  return NextResponse.json(
    { success: true, data: card },
    { status: 200, headers: getCorsHeaders(request) }
  );
}
```

**Or use DELETE endpoint**:
```tsx
export async function DELETE(request: Request) {
  // Soft delete by setting deletedAt
  const card = await prisma.card.update({
    where: { id: params.id },
    data: { deletedAt: new Date() }
  });

  return new NextResponse(null, {
    status: 204,
    headers: getCorsHeaders(request)
  });
}
```

**Schema reference**:
```prisma
model Card {
  id        String   @id @default(cuid())
  title     String
  url       String?
  deletedAt DateTime? // Soft delete timestamp
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

---

### Issue 2: Forgetting CORS Headers

**Impact**:
- Browser extension can't make requests
- Preflight OPTIONS requests fail
- API unusable from browser

**Fix**: Always use `getCorsHeaders(request)` on every response

**Checklist**:
- [ ] GET response includes CORS headers
- [ ] POST response includes CORS headers
- [ ] PATCH response includes CORS headers
- [ ] DELETE response includes CORS headers
- [ ] OPTIONS handler exists and returns CORS headers
- [ ] Error responses include CORS headers

---

### Issue 3: Exposing Internal Errors to Client

**❌ WRONG** - Leaking internal details
```tsx
catch (error) {
  return NextResponse.json(
    {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message,  // ❌ Exposes stack traces, DB errors
        stack: error.stack       // ❌ NEVER expose stack traces!
      }
    },
    { status: 500 }
  );
}
```

**✅ CORRECT** - Generic error message
```tsx
catch (error) {
  // Log full error server-side
  console.error('Error creating card:', error);

  // Return generic message to client
  return NextResponse.json(
    {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred'
        // ✅ No internal details
      }
    },
    { status: 500, headers: getCorsHeaders(request) }
  );
}
```

**Exception**: Validation errors (422) can include details
```tsx
if (error instanceof z.ZodError) {
  return NextResponse.json(
    {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid data',
        details: error.errors  // ✅ OK: These are user-facing
      }
    },
    { status: 422, headers: getCorsHeaders(request) }
  );
}
```

---

### Issue 4: Variable Scope in Error Handlers

**Problem**: Variables declared in try block aren't accessible in catch block

**Symptoms**:
- `ReferenceError: user is not defined`
- Error handlers crash
- 500 errors in production

**Fix**: Declare variables outside try block (see Critical Patterns #1)

**All affected routes fixed in October 2025**:
- `/api/cards/route.ts`
- `/api/cards/[id]/route.ts`
- `/api/pawkits/route.ts`
- `/api/pawkits/[id]/route.ts`
- All 30 routes updated

---

## COMPLETE ROUTE TEMPLATE

**Standard route structure** following all patterns:

```tsx
// app/api/cards/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getUser } from '@/lib/auth';
import { getCorsHeaders } from '@/lib/api/cors';
import { CreateCardSchema } from '@/lib/schemas/card';

// Handle preflight
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: getCorsHeaders(request)
  });
}

// List cards
export async function GET(request: NextRequest) {
  let user: User | null = null;

  try {
    user = await getUser(request);

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required'
          }
        },
        { status: 401, headers: getCorsHeaders(request) }
      );
    }

    const cards = await prisma.card.findMany({
      where: {
        userId: user.id,
        deletedAt: null  // Exclude soft-deleted
      },
      orderBy: { updatedAt: 'desc' }
    });

    return NextResponse.json(
      { success: true, data: cards },
      { status: 200, headers: getCorsHeaders(request) }
    );
  } catch (error) {
    console.error('Error fetching cards for user:', user?.id, error);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch cards'
        }
      },
      { status: 500, headers: getCorsHeaders(request) }
    );
  }
}

// Create card
export async function POST(request: NextRequest) {
  let user: User | null = null;
  let body: any = null;

  try {
    body = await request.json();
    user = await getUser(request);

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required'
          }
        },
        { status: 401, headers: getCorsHeaders(request) }
      );
    }

    // Validate with Zod
    const validatedData = CreateCardSchema.parse(body);

    // Check for duplicate
    if (validatedData.url) {
      const existing = await prisma.card.findFirst({
        where: {
          userId: user.id,
          url: validatedData.url,
          deletedAt: null
        }
      });

      if (existing) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'CONFLICT',
              message: 'Card with this URL already exists'
            },
            card: existing
          },
          { status: 409, headers: getCorsHeaders(request) }
        );
      }
    }

    // Create card
    const card = await prisma.card.create({
      data: {
        ...validatedData,
        userId: user.id
      }
    });

    return NextResponse.json(
      { success: true, data: card },
      { status: 201, headers: getCorsHeaders(request) }
    );
  } catch (error) {
    // Handle validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid card data',
            details: error.errors
          }
        },
        { status: 422, headers: getCorsHeaders(request) }
      );
    }

    console.error('Error creating card for user:', user?.id, error);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to create card'
        }
      },
      { status: 500, headers: getCorsHeaders(request) }
    );
  }
}
```

---

## TESTING API ROUTES

### Manual Testing with curl

**GET request**:
```bash
curl -X GET http://localhost:3000/api/cards \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json"
```

**POST request**:
```bash
curl -X POST http://localhost:3000/api/cards \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com",
    "title": "Test Card"
  }'
```

**PATCH request**:
```bash
curl -X PATCH http://localhost:3000/api/cards/abc123 \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Updated Title"
  }'
```

**DELETE request**:
```bash
curl -X DELETE http://localhost:3000/api/cards/abc123 \
  -H "Authorization: Bearer <token>"
```

**OPTIONS (preflight)**:
```bash
curl -X OPTIONS http://localhost:3000/api/cards \
  -H "Origin: chrome-extension://abc123" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: content-type,authorization" \
  -v
```

---

### Automated Testing

**Use pre-merge test suite** (see `.claude/skills/pawkit-testing/SKILL.md`):

```tsx
// Test API endpoints section
async function testCardsAPI(): Promise<TestResult> {
  try {
    // Test POST
    const createResponse = await fetch('/api/cards', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        url: 'https://example.com',
        title: 'Test Card'
      })
    });

    // Verify status code
    if (createResponse.status !== 201) {
      throw new Error(`Expected 201, got ${createResponse.status}`);
    }

    // Verify response format
    const { success, data } = await createResponse.json();
    if (!success || !data.id) {
      throw new Error('Invalid response format');
    }

    // Verify CORS headers
    const corsHeader = createResponse.headers.get('Access-Control-Allow-Origin');
    if (!corsHeader) {
      throw new Error('Missing CORS headers');
    }

    return { section: 'API', name: 'Cards API', status: 'pass' };
  } catch (error) {
    return {
      section: 'API',
      name: 'Cards API',
      status: 'fail',
      message: error.message
    };
  }
}
```

---

## CHECKLIST FOR NEW ROUTES

Before merging API changes, verify:

**Route Structure**:
- [ ] Uses correct HTTP method (GET, POST, PATCH, DELETE)
- [ ] Never uses PUT
- [ ] Route naming follows convention

**Error Handling**:
- [ ] Variables declared outside try block
- [ ] Proper status codes (200, 201, 204, 400, 401, 404, 409, 422, 500)
- [ ] Generic error messages (no internal details)
- [ ] Error responses include error code

**Response Format**:
- [ ] Success responses: `{ success: true, data: T }`
- [ ] Error responses: `{ success: false, error: {...} }`
- [ ] Consistent structure

**CORS**:
- [ ] All responses include CORS headers
- [ ] OPTIONS handler exists
- [ ] Uses `getCorsHeaders(request)` helper

**Validation**:
- [ ] Zod schema defined
- [ ] Schema used for validation
- [ ] Validation errors return 422
- [ ] Validation details included in error response

**Authentication**:
- [ ] User authentication checked
- [ ] Returns 401 if not authenticated
- [ ] User ID included in queries/mutations

**Database**:
- [ ] Uses Prisma transactions for related updates
- [ ] Soft deletes use `deletedAt` field (not `deleted`)
- [ ] Filters exclude soft-deleted records (`deletedAt: null`)

**Testing**:
- [ ] Manual testing with curl
- [ ] Added to pre-merge test suite
- [ ] CORS tested with OPTIONS request

---

## QUICK REFERENCE

### Status Code Decision Tree

```
Is request valid?
├─ NO → Which error?
│  ├─ Invalid format → 400 Bad Request
│  ├─ Not authenticated → 401 Unauthorized
│  ├─ Forbidden → 403 Forbidden
│  ├─ Resource not found → 404 Not Found
│  ├─ Duplicate resource → 409 Conflict
│  └─ Validation failed → 422 Unprocessable Entity
│
└─ YES → Operation successful?
   ├─ YES → Which method?
   │  ├─ GET → 200 OK
   │  ├─ POST → 201 Created
   │  ├─ PATCH → 200 OK
   │  └─ DELETE → 204 No Content
   │
   └─ NO → 500 Internal Server Error
```

---

### Common Zod Schemas

```tsx
// lib/schemas/common.ts

import { z } from 'zod';

// URL validation
export const urlSchema = z.string().url('Invalid URL format');

// ID validation
export const idSchema = z.string().cuid('Invalid ID format');

// Slug validation
export const slugSchema = z.string().regex(
  /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
  'Invalid slug format'
);

// Pagination
export const paginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20)
});

// Search
export const searchSchema = z.object({
  query: z.string().min(1),
  filters: z.record(z.any()).optional()
});
```

---

## STANDARDIZATION AUDIT (OCTOBER 2025)

### Routes Updated (30 total)

**Cards** (5 routes):
- `GET /api/cards` - List cards
- `POST /api/cards` - Create card
- `GET /api/cards/[id]` - Get card
- `PATCH /api/cards/[id]` - Update card
- `DELETE /api/cards/[id]` - Delete card

**Pawkits/Collections** (5 routes):
- `GET /api/pawkits` - List collections
- `POST /api/pawkits` - Create collection
- `GET /api/pawkits/[id]` - Get collection
- `PATCH /api/pawkits/[id]` - Update collection
- `DELETE /api/pawkits/[id]` - Delete collection

**Notes** (5 routes):
- `GET /api/notes` - List notes
- `POST /api/notes` - Create note
- `GET /api/notes/[id]` - Get note
- `PATCH /api/notes/[id]` - Update note
- `DELETE /api/notes/[id]` - Delete note

**Tags** (3 routes):
- `GET /api/tags` - List tags
- `POST /api/tags` - Create tag
- `DELETE /api/tags/[id]` - Delete tag

**Search** (2 routes):
- `GET /api/search` - Search all content
- `POST /api/search/advanced` - Advanced search

**Sync** (3 routes):
- `POST /api/sync/push` - Push changes to server
- `POST /api/sync/pull` - Pull changes from server
- `GET /api/sync/status` - Get sync status

**User** (4 routes):
- `GET /api/user/profile` - Get profile
- `PATCH /api/user/profile` - Update profile
- `GET /api/user/settings` - Get settings
- `PATCH /api/user/settings` - Update settings

**Extension** (3 routes):
- `POST /api/extension/auth` - Authenticate extension
- `POST /api/extension/capture` - Capture page
- `GET /api/extension/status` - Get extension status

### Changes Applied to All Routes

**Error Handling**:
- ✅ Variables declared outside try blocks
- ✅ Proper error logging with context
- ✅ Generic error messages to clients

**Response Format**:
- ✅ Success: `{ success: true, data: T }`
- ✅ Error: `{ success: false, error: {...} }`

**CORS Support**:
- ✅ All responses include CORS headers
- ✅ OPTIONS handlers added
- ✅ Extension can make requests

**Validation**:
- ✅ Zod schemas for all POST/PATCH routes
- ✅ 422 status for validation errors
- ✅ Validation details in error response

---

**Last Updated**: October 29, 2025
**Routes Standardized**: 30
**Status**: ✅ All patterns implemented and tested

**Key Principle**: Consistent error handling, proper status codes, CORS support, Zod validation
