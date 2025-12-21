# Pawkit V2 Extension Auth

**Purpose**: Browser extension compatibility, token format, CORS configuration

**Created**: December 20, 2025

---

## TOKEN FORMAT (MUST PRESERVE)

### Generation
```typescript
import { randomBytes } from 'crypto';
import bcrypt from 'bcrypt';

// Generate 64-character hex string
const token = randomBytes(32).toString('hex');

// Hash before storing (10 rounds)
const hashedToken = await bcrypt.hash(token, 10);
```

### Storage
```prisma
model User {
  extensionToken          String?   @unique
  extensionTokenCreatedAt DateTime?
}
```

### Token Format
- **Length**: 64 characters
- **Format**: Hexadecimal string
- **Example**: `a1b2c3d4e5f6...` (64 chars)

---

## TOKEN EXPIRY

```typescript
const TOKEN_EXPIRY_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function isTokenExpired(createdAt: Date): boolean {
  return Date.now() - createdAt.getTime() > TOKEN_EXPIRY_MS;
}
```

---

## AUTH FLOW

### 1. User Initiates in Extension
```
Extension Options → "Sign in with Pawkit" button
```

### 2. Opens Popup Window
```typescript
// Extension opens:
const authUrl = `${PAWKIT_URL}/extension/auth?source=extension`;
window.open(authUrl, 'pawkit-auth', 'width=500,height=600');
```

### 3. Web App Generates Token
```typescript
// POST /api/extension/token
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return unauthorized();

  const token = randomBytes(32).toString('hex');
  const hashedToken = await bcrypt.hash(token, 10);

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      extensionToken: hashedToken,
      extensionTokenCreatedAt: new Date()
    }
  });

  // Return plain token (only time it's visible)
  return Response.json({ token });
}
```

### 4. Extension Stores Token
```typescript
// Extension receives token via postMessage
chrome.storage.local.set({ pawkitToken: token });
```

---

## TOKEN VALIDATION

```typescript
// lib/auth/extension-auth.ts
const tokenCache = new Map<string, { user: User; expiresAt: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

async function getUserByExtensionToken(token: string): Promise<User | null> {
  // 1. Check in-memory cache
  const cached = tokenCache.get(token);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.user;
  }

  // 2. Fetch users with extension tokens
  const users = await prisma.user.findMany({
    where: { extensionToken: { not: null } }
  });

  // 3. Check expiry and bcrypt compare
  for (const user of users) {
    if (!user.extensionTokenCreatedAt) continue;

    const tokenAge = Date.now() - user.extensionTokenCreatedAt.getTime();
    if (tokenAge > TOKEN_EXPIRY_MS) continue;

    if (await bcrypt.compare(token, user.extensionToken!)) {
      // Cache for 5 minutes
      tokenCache.set(token, {
        user,
        expiresAt: Date.now() + CACHE_TTL_MS
      });
      return user;
    }
  }

  return null;
}
```

---

## API ENDPOINTS EXTENSION USES

### Generate Token
```
POST /api/extension/token
Headers:
  - Cookie: session (web auth required)
Response:
  { token: "64-char-hex-string" }
```

### Create Card
```
POST /api/cards
Headers:
  - Authorization: Bearer <token>
  - Content-Type: application/json
Body:
  { url, title?, tags?, collections? }
```

### List Collections
```
GET /api/pawkits
Headers:
  - Authorization: Bearer <token>
Response:
  { collections: [...] }
```

---

## CORS CONFIGURATION

```typescript
// lib/config/extension-config.ts
const ALLOWED_EXTENSION_ORIGINS = [
  'chrome-extension://bbmhcminlncbpkmblbaelhkamhmknjcj',  // Chrome production
  // Firefox uses dynamic IDs
];

function isExtensionOrigin(origin: string): boolean {
  if (process.env.NODE_ENV === 'development') {
    // Allow any extension in dev
    return origin.startsWith('chrome-extension://') ||
           origin.startsWith('moz-extension://');
  }

  return ALLOWED_EXTENSION_ORIGINS.includes(origin) ||
         origin.startsWith('moz-extension://');
}

// In API route
export async function OPTIONS(req: Request) {
  const origin = req.headers.get('origin');

  if (origin && isExtensionOrigin(origin)) {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      }
    });
  }

  return new Response(null, { status: 403 });
}
```

---

## REQUEST HEADERS FROM EXTENSION

```
Authorization: Bearer <64-char-token>
Content-Type: application/json
Origin: chrome-extension://bbmhcminlncbpkmblbaelhkamhmknjcj
```

---

## V2 REQUIREMENTS CHECKLIST

- [x] Preserve 64-char hex token format
- [x] Preserve bcrypt hashing (10 rounds)
- [x] Preserve 30-day expiry
- [x] Preserve 5-minute token cache
- [x] Preserve Bearer token header format
- [x] Maintain `/api/extension/token` endpoint
- [x] Maintain `/api/cards` POST with extension auth
- [x] Maintain `/api/pawkits` GET with extension auth
- [x] Preserve CORS whitelist pattern

---

## MIDDLEWARE PATTERN

```typescript
// middleware/extension-auth.ts
export async function withExtensionAuth(
  req: Request,
  handler: (user: User) => Promise<Response>
): Promise<Response> {
  const authHeader = req.headers.get('Authorization');

  if (!authHeader?.startsWith('Bearer ')) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const token = authHeader.slice(7);
  const user = await getUserByExtensionToken(token);

  if (!user) {
    return Response.json({ error: 'Invalid or expired token' }, { status: 401 });
  }

  return handler(user);
}

// Usage in API route
export async function POST(req: Request) {
  return withExtensionAuth(req, async (user) => {
    const body = await req.json();
    const card = await createCard({ ...body, userId: user.id });
    return Response.json(card);
  });
}
```

---

## ERROR RESPONSES

| Status | Meaning | Response |
|--------|---------|----------|
| 401 | No token provided | `{ error: "Unauthorized" }` |
| 401 | Invalid token | `{ error: "Invalid or expired token" }` |
| 403 | CORS rejected | Empty response |

---

**Last Updated**: December 20, 2025
