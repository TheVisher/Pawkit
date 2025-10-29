---
name: pawkit-security
description: Document authentication, authorization, and privacy patterns for secure data handling
---

# Pawkit Security & Privacy Patterns

**Purpose**: Document authentication, authorization, and privacy patterns for secure data handling

**Status**: Private pawkits implementation completed October 2025

**Key Principle**: Never trust the client. Always verify server-side. Privacy is paramount.

---

## SECURITY PHILOSOPHY

### Core Principles

1. **Never Trust the Client** - All security checks happen server-side
2. **Defense in Depth** - Multiple layers of security
3. **Privacy First** - Private content is truly private
4. **Fail Secure** - Default to restrictive permissions
5. **Audit Everything** - Log all security-relevant events

---

## AUTHENTICATION

### Server-Side Authentication

**Rule**: ALWAYS verify user identity server-side

**❌ WRONG: Client-side only**
```tsx
// Client component
function CardList() {
  const user = useAuth(); // Client-side auth

  if (!user) return <Login />;

  // ❌ Anyone can bypass this by modifying client code
  return <div>{cards.map(card => <Card {...card} />)}</div>;
}
```

**✅ CORRECT: Server-side verification**
```tsx
// app/api/cards/route.ts

export async function GET(request: Request) {
  // ✅ Verify user server-side
  const user = await getServerUser(request);

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

  // Only return cards for authenticated user
  const cards = await prisma.card.findMany({
    where: { userId: user.id }
  });

  return NextResponse.json(
    { success: true, data: cards },
    { status: 200, headers: getCorsHeaders(request) }
  );
}
```

---

### Authentication Middleware

**Pattern**: Check auth before processing request

```tsx
// lib/auth/middleware.ts

export async function requireAuth(
  request: Request
): Promise<{ user: User | null; error?: Response }> {
  // Get token from header or cookie
  const token = request.headers.get('authorization')?.replace('Bearer ', '') ||
                getCookie(request, 'auth-token');

  if (!token) {
    return {
      user: null,
      error: NextResponse.json(
        {
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required'
          }
        },
        { status: 401 }
      )
    };
  }

  try {
    // Verify token
    const payload = await verifyJWT(token);

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { id: payload.userId }
    });

    if (!user) {
      return {
        user: null,
        error: NextResponse.json(
          {
            success: false,
            error: {
              code: 'UNAUTHORIZED',
              message: 'Invalid authentication'
            }
          },
          { status: 401 }
        )
      };
    }

    return { user };
  } catch (error) {
    console.error('Auth error:', error);

    return {
      user: null,
      error: NextResponse.json(
        {
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Invalid authentication'
          }
        },
        { status: 401 }
      )
    };
  }
}

// Usage in API route
export async function GET(request: Request) {
  const { user, error } = await requireAuth(request);
  if (error) return error;

  // User is authenticated - proceed
  const cards = await getCardsForUser(user.id);
  return NextResponse.json({ success: true, data: cards });
}
```

---

### Don't Trust Client Checks

**❌ NEVER do this**:
```tsx
// app/api/cards/route.ts

export async function GET(request: Request) {
  const { userId } = await request.json();

  // ❌ Client can send any userId!
  const cards = await prisma.card.findMany({
    where: { userId }
  });

  return NextResponse.json({ data: cards });
}
```

**✅ ALWAYS do this**:
```tsx
export async function GET(request: Request) {
  // ✅ Get userId from verified token
  const user = await getServerUser(request);

  if (!user) {
    return NextResponse.json(
      { success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
      { status: 401 }
    );
  }

  // ✅ Use server-verified user ID
  const cards = await prisma.card.findMany({
    where: { userId: user.id }
  });

  return NextResponse.json({ success: true, data: cards });
}
```

---

## AUTHORIZATION

### Private Pawkits (October 2025 Implementation)

**Feature**: Collections can be marked private. Private cards never appear in public views.

**Data Model**:
```prisma
model Collection {
  id        String   @id @default(cuid())
  slug      String   @unique
  name      String
  isPrivate Boolean  @default(false)  // Privacy flag
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  cards     Card[]
}

model Card {
  id              String      @id @default(cuid())
  title           String
  url             String?
  collectionSlug  String?
  collection      Collection? @relation(fields: [collectionSlug], references: [slug])
  isPrivate       Boolean     @default(false)  // Denormalized for fast queries
  userId          String
  user            User        @relation(fields: [userId], references: [id])
}
```

---

### Check isPrivate Before Returning Cards

**Rule**: ALWAYS filter private cards server-side

**❌ WRONG: Client-side filtering**
```tsx
// app/api/cards/route.ts

export async function GET(request: Request) {
  const user = await getServerUser(request);

  // ❌ Returns ALL cards including private
  const cards = await prisma.card.findMany({
    where: { userId: user.id }
  });

  // ❌ Client filters private cards (can be bypassed!)
  return NextResponse.json({ success: true, data: cards });
}

// Client component
function CardList({ cards }: { cards: Card[] }) {
  // ❌ Client-side filtering can be removed
  const publicCards = cards.filter(card => !card.isPrivate);
  return <div>{publicCards.map(c => <Card {...c} />)}</div>;
}
```

**✅ CORRECT: Server-side filtering**
```tsx
// app/api/cards/route.ts

export async function GET(request: Request) {
  const user = await getServerUser(request);

  if (!user) {
    return NextResponse.json(
      { success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
      { status: 401 }
    );
  }

  // ✅ Filter private cards server-side
  const cards = await prisma.card.findMany({
    where: {
      userId: user.id,
      isPrivate: false  // Only return public cards
    }
  });

  return NextResponse.json(
    { success: true, data: cards },
    { status: 200 }
  );
}

// Client component (no filtering needed)
function CardList({ cards }: { cards: Card[] }) {
  // ✅ Server already filtered - just display
  return <div>{cards.map(c => <Card {...c} />)}</div>;
}
```

---

### Filter Private Cards in Library View

**Complete Server-Side Implementation**:

```tsx
// app/api/library/cards/route.ts

export async function GET(request: Request) {
  let user: User | null = null;

  try {
    // Verify authentication
    user = await getServerUser(request);

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

    // Get query parameters
    const url = new URL(request.url);
    const includePrivate = url.searchParams.get('includePrivate') === 'true';
    const collectionSlug = url.searchParams.get('collection');

    // Build where clause
    const where: any = {
      userId: user.id,
      deletedAt: null  // Exclude soft-deleted
    };

    // Filter by collection if specified
    if (collectionSlug) {
      where.collectionSlug = collectionSlug;
    }

    // Filter private cards unless explicitly requested
    if (!includePrivate) {
      where.isPrivate = false;
    }

    // Query cards with privacy filtering
    const cards = await prisma.card.findMany({
      where,
      include: {
        collection: {
          select: {
            slug: true,
            name: true,
            isPrivate: true
          }
        },
        tags: true
      },
      orderBy: { updatedAt: 'desc' }
    });

    // Additional privacy check: verify collection access
    const filteredCards = cards.filter(card => {
      // If no collection, card is valid
      if (!card.collection) return true;

      // If collection is private, verify it belongs to user
      if (card.collection.isPrivate) {
        return card.userId === user.id;
      }

      return true;
    });

    return NextResponse.json(
      { success: true, data: filteredCards },
      { status: 200, headers: getCorsHeaders(request) }
    );
  } catch (error) {
    console.error('Error fetching library cards for user:', user?.id, error);

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
```

---

### Verify Ownership Before Mutations

**Rule**: Verify user owns resource before update/delete

**❌ WRONG: No ownership check**
```tsx
// app/api/cards/[id]/route.ts

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const body = await request.json();

  // ❌ Any authenticated user can update any card!
  const card = await prisma.card.update({
    where: { id: params.id },
    data: body
  });

  return NextResponse.json({ success: true, data: card });
}
```

**✅ CORRECT: Verify ownership**
```tsx
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  let user: User | null = null;
  let body: any = null;

  try {
    body = await request.json();
    user = await getServerUser(request);

    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401, headers: getCorsHeaders(request) }
      );
    }

    // ✅ Check if card exists and belongs to user
    const existingCard = await prisma.card.findUnique({
      where: { id: params.id }
    });

    if (!existingCard) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Card not found' } },
        { status: 404, headers: getCorsHeaders(request) }
      );
    }

    // ✅ Verify ownership
    if (existingCard.userId !== user.id) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'You do not have permission to update this card'
          }
        },
        { status: 403, headers: getCorsHeaders(request) }
      );
    }

    // ✅ User owns card - proceed with update
    const card = await prisma.card.update({
      where: { id: params.id },
      data: {
        ...body,
        updatedAt: new Date()
      }
    });

    return NextResponse.json(
      { success: true, data: card },
      { status: 200, headers: getCorsHeaders(request) }
    );
  } catch (error) {
    console.error('Error updating card for user:', user?.id, error);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update card'
        }
      },
      { status: 500, headers: getCorsHeaders(request) }
    );
  }
}
```

---

### Never Expose Private Content in Public APIs

**❌ WRONG: Leaking private cards in search**
```tsx
// app/api/search/route.ts

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get('q');

  // ❌ Returns ALL matching cards including private
  const results = await prisma.card.findMany({
    where: {
      OR: [
        { title: { contains: query } },
        { content: { contains: query } }
      ]
    }
  });

  return NextResponse.json({ results });
}
```

**✅ CORRECT: Filter private content**
```tsx
export async function GET(request: Request) {
  const user = await getServerUser(request);

  if (!user) {
    return NextResponse.json(
      { success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
      { status: 401 }
    );
  }

  const query = new URL(request.url).searchParams.get('q');

  // ✅ Only search user's non-private cards
  const results = await prisma.card.findMany({
    where: {
      userId: user.id,  // ✅ Only user's cards
      isPrivate: false, // ✅ Exclude private
      deletedAt: null,  // ✅ Exclude deleted
      OR: [
        { title: { contains: query } },
        { content: { contains: query } }
      ]
    }
  });

  return NextResponse.json(
    { success: true, data: results },
    { status: 200 }
  );
}
```

---

## DATA VALIDATION

### Validate All Input with Zod

**Rule**: NEVER trust client input

```tsx
// lib/schemas/card.ts

import { z } from 'zod';

export const CreateCardSchema = z.object({
  // URL validation
  url: z.string()
    .url('Invalid URL format')
    .max(2000, 'URL too long')
    .optional(),

  // Title validation
  title: z.string()
    .min(1, 'Title is required')
    .max(500, 'Title too long')
    .trim(),

  // Content validation
  content: z.string()
    .max(50000, 'Content too long')
    .optional(),

  // Collection slug validation
  collectionSlug: z.string()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Invalid slug format')
    .optional(),

  // Tags validation
  tags: z.array(z.string().max(50))
    .max(20, 'Too many tags')
    .optional(),

  // Privacy validation
  isPrivate: z.boolean()
    .default(false)
});

export type CreateCardInput = z.infer<typeof CreateCardSchema>;
```

---

### Sanitize Before Database Operations

**Pattern**: Validate and sanitize all input

```tsx
// app/api/cards/route.ts

export async function POST(request: Request) {
  let user: User | null = null;
  let body: any = null;

  try {
    body = await request.json();
    user = await getServerUser(request);

    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    // ✅ Validate with Zod
    const validatedData = CreateCardSchema.parse(body);

    // ✅ Sanitize HTML content if needed
    if (validatedData.content) {
      validatedData.content = sanitizeHTML(validatedData.content);
    }

    // ✅ Verify collection exists and user has access
    if (validatedData.collectionSlug) {
      const collection = await prisma.collection.findUnique({
        where: { slug: validatedData.collectionSlug }
      });

      if (!collection) {
        return NextResponse.json(
          { success: false, error: { code: 'NOT_FOUND', message: 'Collection not found' } },
          { status: 404 }
        );
      }

      if (collection.userId !== user.id) {
        return NextResponse.json(
          { success: false, error: { code: 'FORBIDDEN', message: 'Cannot add to this collection' } },
          { status: 403 }
        );
      }

      // ✅ Inherit privacy from collection
      if (collection.isPrivate) {
        validatedData.isPrivate = true;
      }
    }

    // ✅ Create card with validated data
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

### Validate Slugs

**Pattern**: Ensure slugs are safe and unique

```tsx
// lib/validation/slug.ts

export function validateSlug(slug: string): boolean {
  // Only lowercase letters, numbers, and hyphens
  const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  return slugPattern.test(slug);
}

export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special chars
    .replace(/\s+/g, '-')     // Replace spaces with hyphens
    .replace(/-+/g, '-')      // Replace multiple hyphens with single
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}

// Usage in API
export async function POST(request: Request) {
  const { name } = await request.json();

  // Generate safe slug
  let slug = generateSlug(name);

  // Ensure unique
  let counter = 1;
  while (await collectionExists(slug)) {
    slug = `${generateSlug(name)}-${counter}`;
    counter++;
  }

  const collection = await prisma.collection.create({
    data: { name, slug, userId: user.id }
  });

  return NextResponse.json({ success: true, data: collection });
}
```

---

### Check Required Fields

**Pattern**: Validate required fields before operations

```tsx
// ❌ WRONG: No validation
export async function POST(request: Request) {
  const { title, url } = await request.json();

  // ❌ Could fail if title is undefined
  const card = await prisma.card.create({
    data: { title, url, userId: user.id }
  });
}

// ✅ CORRECT: Validate with Zod
export async function POST(request: Request) {
  const body = await request.json();

  // ✅ Zod validates required fields
  const validated = CardSchema.parse(body);

  const card = await prisma.card.create({
    data: { ...validated, userId: user.id }
  });
}
```

---

## PRIVACY RULES

### Rule 1: Private Pawkit Cards Never in Library

**Implementation**:
```tsx
// Server-side query for Library view
const libraryCards = await prisma.card.findMany({
  where: {
    userId: user.id,
    isPrivate: false,      // ✅ Exclude private
    deletedAt: null
  }
});
```

---

### Rule 2: Private Content Filtered Server-Side

**Never rely on client filtering**:

```tsx
// ❌ WRONG: Client filtering
const allCards = await fetch('/api/cards').then(r => r.json());
const publicCards = allCards.filter(c => !c.isPrivate); // Can be bypassed

// ✅ CORRECT: Server filtering
const publicCards = await fetch('/api/cards?includePrivate=false').then(r => r.json());
```

---

### Rule 3: isPrivate Checked on All Queries

**Pattern**: Always include isPrivate in where clause

```tsx
// lib/server/cards.ts

export async function getCardsForUser(
  userId: string,
  includePrivate: boolean = false
) {
  const where: any = {
    userId,
    deletedAt: null
  };

  // ✅ Always check isPrivate
  if (!includePrivate) {
    where.isPrivate = false;
  }

  return await prisma.card.findMany({ where });
}
```

---

### Rule 4: Don't Rely on Client-Side Filtering

**Why it fails**:
- User can modify client code
- User can intercept API responses
- User can bypass React components

**Solution**: Server-side filtering only

```tsx
// ✅ Server returns only public cards
// Client just displays them
function CardList() {
  const { data: cards } = useSWR('/api/cards', fetcher);

  // No filtering needed - server already filtered
  return <div>{cards?.map(c => <Card {...c} />)}</div>;
}
```

---

## ERROR MESSAGES

### Rule: Generic to Client, Detailed to Logs

**❌ WRONG: Exposing internal details**
```tsx
catch (error) {
  return NextResponse.json({
    error: {
      message: error.message,     // ❌ "connect ECONNREFUSED 127.0.0.1:5432"
      stack: error.stack,          // ❌ Full stack trace
      query: sqlQuery              // ❌ SQL query with data
    }
  });
}
```

**✅ CORRECT: Generic message to client, detailed logs**
```tsx
catch (error) {
  // ✅ Detailed log server-side
  console.error('Error creating card:', {
    userId: user?.id,
    error: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString()
  });

  // ✅ Generic message to client
  return NextResponse.json(
    {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred'
        // No internal details
      }
    },
    { status: 500 }
  );
}
```

---

### Don't Leak User Data

**❌ WRONG: Exposing other users' data in errors**
```tsx
// Check if card exists
const card = await prisma.card.findUnique({
  where: { id: cardId }
});

if (!card) {
  return NextResponse.json({
    error: 'Card not found'
  }, { status: 404 });
}

// ❌ Error: User can probe for existence of cards they don't own
if (card.userId !== user.id) {
  return NextResponse.json({
    error: 'Not your card',
    card: card  // ❌ Leaking other user's card data!
  }, { status: 403 });
}
```

**✅ CORRECT: Same error for not found and forbidden**
```tsx
const card = await prisma.card.findUnique({
  where: { id: cardId }
});

// ✅ Same error whether card doesn't exist or user doesn't own it
if (!card || card.userId !== user.id) {
  return NextResponse.json(
    {
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: 'Card not found'
      }
    },
    { status: 404 }  // Same status code
  );
}
```

---

## SECURITY CHECKLIST

### For Every API Route

**Authentication**:
- [ ] Verify user server-side with `getServerUser()`
- [ ] Return 401 if not authenticated
- [ ] Don't trust client-provided user ID

**Authorization**:
- [ ] Verify user owns resource before mutations
- [ ] Return 403 if user doesn't have permission
- [ ] Check collection privacy before returning cards

**Privacy**:
- [ ] Filter private cards server-side
- [ ] Check `isPrivate` flag on all queries
- [ ] Never expose private content in public APIs
- [ ] Verify collection access before returning cards

**Validation**:
- [ ] Validate all input with Zod schemas
- [ ] Sanitize HTML content
- [ ] Validate slugs with regex
- [ ] Check required fields

**Error Handling**:
- [ ] Generic error messages to client
- [ ] Detailed error logs server-side
- [ ] Don't expose internal details
- [ ] Don't leak user data in errors
- [ ] Same error for not found and forbidden

---

## COMMON VULNERABILITIES

### 1. IDOR (Insecure Direct Object Reference)

**Vulnerability**:
```tsx
// User requests: GET /api/cards/abc123
// Server returns card without checking ownership
```

**Fix**: Always verify ownership
```tsx
if (card.userId !== user.id) {
  return NextResponse.json(
    { success: false, error: { code: 'NOT_FOUND', message: 'Card not found' } },
    { status: 404 }
  );
}
```

---

### 2. Information Disclosure

**Vulnerability**:
```tsx
// Error exposes database structure
return NextResponse.json({
  error: "Foreign key constraint failed on field 'userId'"
});
```

**Fix**: Generic error messages
```tsx
return NextResponse.json({
  success: false,
  error: {
    code: 'INTERNAL_ERROR',
    message: 'An error occurred'
  }
});
```

---

### 3. Authorization Bypass

**Vulnerability**:
```tsx
// Client sends isPrivate=false to bypass privacy
const { isPrivate, ...data } = await request.json();

await prisma.card.update({
  where: { id },
  data: { ...data, isPrivate }  // ❌ Client controls privacy!
});
```

**Fix**: Server determines privacy
```tsx
// Get collection
const collection = await getCollection(data.collectionSlug);

// ✅ Server determines privacy based on collection
const isPrivate = collection?.isPrivate || false;

await prisma.card.update({
  where: { id },
  data: { ...data, isPrivate }
});
```

---

### 4. Privilege Escalation

**Vulnerability**:
```tsx
// User requests to join admin collection
const collection = await prisma.collection.findUnique({
  where: { slug: 'admin' }
});

// ❌ No ownership check - any user can add to any collection
await prisma.card.create({
  data: {
    title: 'My Card',
    collectionSlug: 'admin',  // ❌ Adding to admin collection!
    userId: user.id
  }
});
```

**Fix**: Verify collection ownership
```tsx
const collection = await prisma.collection.findUnique({
  where: { slug: collectionSlug }
});

// ✅ Verify user owns collection
if (collection.userId !== user.id) {
  return NextResponse.json(
    { success: false, error: { code: 'FORBIDDEN', message: 'Cannot add to this collection' } },
    { status: 403 }
  );
}
```

---

## OCTOBER 2025 SECURITY AUDIT

### Private Pawkits Implementation

**Feature**: Collections can be marked private

**Security Measures Implemented**:

1. **Database Model**
   - Added `isPrivate` boolean to Collection model
   - Added `isPrivate` boolean to Card model (denormalized)
   - Cards inherit privacy from collection

2. **Server-Side Filtering**
   - All card queries filter by `isPrivate: false` by default
   - Library view excludes private cards
   - Search excludes private cards
   - Tags view excludes private cards

3. **Authorization Checks**
   - Verify collection ownership before adding cards
   - Verify card ownership before updates
   - Check collection privacy before returning cards

4. **Privacy Inheritance**
   - Cards automatically marked private if in private collection
   - Moving card to private collection marks it private
   - Moving card to public collection marks it public

5. **UI Indicators**
   - Private pawkits show lock icon
   - Private cards show privacy badge
   - Clear visual distinction

---

## TESTING SECURITY

### Test Authentication

```tsx
// Test: Unauthenticated request
const response = await fetch('/api/cards', {
  // No auth header
});

expect(response.status).toBe(401);
```

### Test Authorization

```tsx
// Test: User tries to update another user's card
const response = await fetch(`/api/cards/${otherUserCardId}`, {
  method: 'PATCH',
  headers: { 'Authorization': `Bearer ${userToken}` },
  body: JSON.stringify({ title: 'Hacked' })
});

expect(response.status).toBe(404); // Not 403 - don't leak existence
```

### Test Privacy

```tsx
// Test: Private cards don't appear in Library
const user = await createUser();
const privateCollection = await createCollection({ isPrivate: true, userId: user.id });
const privateCard = await createCard({ collectionSlug: privateCollection.slug, userId: user.id });

const response = await fetch('/api/cards', {
  headers: { 'Authorization': `Bearer ${user.token}` }
});

const { data: cards } = await response.json();

// Private card should not be in library
expect(cards.find(c => c.id === privateCard.id)).toBeUndefined();
```

---

**Last Updated**: October 29, 2025
**Private Pawkits**: Implemented October 2025
**Security Posture**: Defense in depth with server-side verification

**Key Principle**: Never trust the client. Always verify server-side. Privacy is paramount.
