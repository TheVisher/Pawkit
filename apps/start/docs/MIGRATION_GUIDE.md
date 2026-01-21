# Pawkit Migration Guide: Old Stack → New Stack

> **Quick Reference for developers migrating from Next.js/Supabase to TanStack Start/Convex**

---

## ⚠️ Migration Status Summary

### Known Issues & Red Flags (Fix Before Production)

#### 🔴 High Priority
1. **Missing Error Handlers** - 5 unhandled promises that could crash
   - `use-mention-search.ts:22,197` - chrono-node import
   - `bills-widget.tsx:195` - getPaidBills

2. **Incomplete Features**
   - `template-applicator.ts:110-118` - JSON content merging (prepend/append not working)
   - `pawkit-plate-editor.tsx:221` - References sync disabled
   - `block-discussion.tsx:338` - Known throw error

3. **No Error Tracking** - Error boundary only logs to console (no Sentry)

#### 🟡 Medium Priority
- 50+ console.log statements in production code
- Fragile `../../../../convex/_generated/api` import paths
- 50+ uses of TypeScript `any` type
- 30+ deprecated HTML template functions

### Critical Schema & Feature Gaps

#### ❌ Lost Features
1. **Vector Embeddings** - AI similarity search not available in Convex
   - Need external vector DB (Pinecone/Weaviate)
2. **QuickNoteArchive Table** - Weekly note consolidation tracking lost
3. **Sync Conflict Resolution** - No version/conflict tracking (may not need with Convex)

#### ⚠️ Breaking Changes
1. **ID System** - Supabase UUIDs → Convex auto-generated IDs
2. **File Storage** - IndexedDB refs → Convex native storage (need re-upload)
3. **DateTime → Unix Timestamps** - All dates now numbers

#### ✅ Security Improvements
- Extension tokens now hashed (SHA-256)
- API/OAuth tokens now encrypted
- Better token management

---

## Table of Contents

1. [Known Issues & Red Flags](#️-migration-status-summary)
2. [Framework Changes](#1-framework-changes)
3. [Backend & Database Changes](#2-backend--database-changes)
4. [Authentication Changes](#3-authentication-changes)
5. [Routing Changes](#4-routing-changes)
6. [API & Hook Signature Changes](#5-api--hook-signature-changes)
7. [Data Fetching Patterns](#6-data-fetching-patterns)

---

## 1. Framework Changes

### Next.js App Router → TanStack Start/Router

| Aspect | Old (Next.js) | New (TanStack Start) |
|--------|---------------|----------------------|
| **Framework** | Next.js 16.1.3 | TanStack Start 1.132.0 + Vite 7.1.7 |
| **Runtime** | Node.js (SSR + SSG) | Vite dev server (dev), Nitro (production) |
| **Meta-framework** | Next.js App Router | TanStack Start (file-based routing) |
| **Dev command** | `next dev` | `vite dev --port 3000` |
| **Build command** | `next build` | `vite build` |

### File-Based Routing Structure

**OLD: Next.js App Router**
```
src/app/
├── (auth)/
│   ├── login/
│   │   └── page.tsx          // Route: /login
│   ├── signup/
│   │   └── page.tsx          // Route: /signup
│   └── layout.tsx            // Layout for auth routes
├── (dashboard)/
│   ├── home/
│   │   └── page.tsx          // Route: /home
│   └── layout.tsx            // Layout for dashboard routes
├── layout.tsx                // Root layout
└── page.tsx                  // Route: /
```

**NEW: TanStack Router**
```
apps/start/src/routes/
├── __root.tsx                // Root layout (replaces app/layout.tsx)
├── index.tsx                 // Route: /
├── login.tsx                 // Route: /login
├── signup.tsx                // Route: /signup
├── home.tsx                  // Route: /home
└── dashboard.tsx             // Route: /dashboard
```

**Key Differences:**
- No route groups `(auth)`, `(dashboard)` in TanStack Router
- Single file per route (no `page.tsx` in folders)
- `__root.tsx` instead of `layout.tsx` for root layout
- Route exports use `createFileRoute()` instead of default export

### Server vs Client Component Patterns

**OLD: Next.js**
```tsx
// Server Component (default)
import { createClient } from '@/lib/supabase/server';

export default async function HomePage() {
  const supabase = await createClient();
  const { data } = await supabase.from('cards').select();

  return <div>{/* ... */}</div>;
}

// Client Component
'use client';
import { useState } from 'react';

export default function LoginForm() {
  const [email, setEmail] = useState('');
  // ...
}
```

**NEW: TanStack Start**
```tsx
// All components are client-side by default
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/home')({
  component: HomePage,
});

function HomePage() {
  // Component logic - all runs on client
  return <div>{/* ... */}</div>;
}
```

**Key Differences:**
- No `'use client'` directive needed
- No server components by default (can opt-in with server functions)
- Data fetching happens via Convex queries (real-time subscriptions)

### Root Layout Comparison

**OLD: Next.js**
```tsx
// app/layout.tsx
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
```

**NEW: TanStack Start**
```tsx
// routes/__root.tsx
import { createRootRoute, HeadContent, Scripts } from '@tanstack/react-router';

export const Route = createRootRoute({
  head: () => ({
    meta: [{ charSet: 'utf-8' }, { name: 'viewport', content: 'width=device-width, initial-scale=1' }],
    links: [{ rel: 'stylesheet', href: appCss }],
  }),
  shellComponent: RootDocument,
});

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head><HeadContent /></head>
      <body>
        <ConvexClientProvider>
          <ThemeProvider>{children}</ThemeProvider>
        </ConvexClientProvider>
        <Scripts />
      </body>
    </html>
  );
}
```

**Key Differences:**
- Must include `<HeadContent />` and `<Scripts />` explicitly
- Use `head()` function for meta tags instead of `metadata` export
- Use `shellComponent` instead of default export

---

## 2. Backend & Database Changes

### Supabase → Convex

| Feature | Old (Supabase) | New (Convex) |
|---------|----------------|--------------|
| **Backend** | PostgreSQL + Supabase API | Convex (serverless functions + database) |
| **Database** | PostgreSQL (relational) | Convex (document-based) |
| **Schema** | Prisma Schema | Convex Schema (TypeScript) |
| **ORM** | Prisma Client | Convex API (native) |
| **Real-time** | Supabase Realtime (PostgreSQL) | Convex subscriptions (built-in) |
| **File Storage** | Supabase Storage | Convex File Storage |

### Schema Comparison

**OLD: Prisma Schema**
```prisma
// prisma/schema.prisma
model Card {
  id          String   @id @default(cuid())
  workspaceId String
  workspace   Workspace @relation(fields: [workspaceId], references: [id])

  type        String
  title       String?
  description String?
  content     Json?
  tags        String[]
  pinned      Boolean  @default(false)
  deleted     Boolean  @default(false)

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([workspaceId])
  @@index([workspaceId, deleted])
}
```

**NEW: Convex Schema**
```typescript
// apps/start/convex/schema.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  cards: defineTable({
    workspaceId: v.id("workspaces"),

    type: v.string(),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    content: v.optional(v.any()),
    tags: v.array(v.string()),
    pinned: v.boolean(),
    deleted: v.boolean(),

    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_workspace_deleted", ["workspaceId", "deleted"])
    .searchIndex("search_by_title", {
      searchField: "title",
      filterFields: ["workspaceId", "deleted"],
    }),
});
```

**Key Differences:**
- Convex uses TypeScript for schema definition
- `v.id("tableName")` for foreign keys instead of string IDs
- Timestamps are numbers (milliseconds) instead of DateTime
- `v.optional()` for nullable fields
- `v.any()` for JSON/flexible data
- Built-in search indexes (full-text search)

### Query Patterns

**OLD: Prisma**
```typescript
// API Route: app/api/cards/route.ts
import { prisma } from '@/lib/db/prisma';

export async function GET(request: Request) {
  const cards = await prisma.card.findMany({
    where: {
      workspaceId,
      deleted: false,
    },
    orderBy: { updatedAt: 'desc' },
    take: 100,
  });

  return NextResponse.json({ cards });
}
```

**NEW: Convex**
```typescript
// Convex Function: apps/start/convex/cards.ts
import { query } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: { workspaceId: v.id("workspaces") },
  handler: async (ctx, { workspaceId }) => {
    return await ctx.db
      .query("cards")
      .withIndex("by_workspace_deleted", (q) =>
        q.eq("workspaceId", workspaceId).eq("deleted", false)
      )
      .collect();
  },
});
```

**Key Differences:**
- Convex functions are defined in `convex/` directory
- Use `query()` and `mutation()` helpers
- Queries run on Convex backend (not Next.js API routes)
- Built-in type safety with `args` validation
- Use `ctx.db.query()` instead of Prisma client

### Real-Time Subscriptions

**OLD: Supabase Realtime (Manual Setup)**
```typescript
// Manual subscription setup required
const supabase = createClient();

const channel = supabase
  .channel('cards-changes')
  .on('postgres_changes',
    { event: '*', schema: 'public', table: 'Card' },
    (payload) => {
      console.log('Change received!', payload);
      // Manually update local state
    }
  )
  .subscribe();
```

**NEW: Convex (Automatic)**
```typescript
// Real-time subscriptions are automatic with useQuery
import { useQuery } from 'convex/react';
import { api } from '../convex/_generated/api';

function CardList() {
  // Automatically subscribes to changes - updates in real-time!
  const cards = useQuery(api.cards.list, { workspaceId });

  return <div>{/* cards auto-update on any change */}</div>;
}
```

**Key Differences:**
- Convex subscriptions are automatic with `useQuery`
- No manual subscription setup needed
- Changes propagate instantly to all connected clients
- Type-safe query parameters

---

## 3. Authentication Changes

### Supabase Auth → Convex Auth

| Feature | Old (Supabase Auth) | New (Convex Auth) |
|---------|---------------------|-------------------|
| **Provider** | Supabase Auth | `@convex-dev/auth` |
| **Session** | JWT in cookies | Convex session tokens |
| **Client Setup** | `createBrowserClient()` | `useAuthActions()` hook |
| **Server Setup** | `createServerClient()` | Convex backend functions |

### Client-Side Authentication

**OLD: Supabase**
```tsx
// Login Form
import { getClient } from '@/lib/supabase/client';

function LoginForm() {
  const supabase = getClient();

  const handleLogin = async () => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (!error) {
      router.push('/dashboard');
    }
  };
}
```

**NEW: Convex Auth**
```tsx
// Login Form
import { useAuthActions } from '@convex-dev/auth/react';

function LoginForm() {
  const { signIn } = useAuthActions();

  const handleLogin = async () => {
    try {
      await signIn('password', {
        email,
        password,
        flow: 'signIn',
      });
      router.push('/dashboard');
    } catch (err) {
      // Handle error
    }
  };
}
```

**Key Differences:**
- Use `useAuthActions()` hook instead of Supabase client
- `signIn('password', { ... })` instead of `signInWithPassword()`
- Specify `flow: 'signIn'` or `flow: 'signUp'`

### Server-Side Authentication

**OLD: Supabase**
```typescript
// Server Component / API Route
import { createClient } from '@/lib/supabase/server';

export async function getAuthUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}
```

**NEW: Convex**
```typescript
// Convex Query/Mutation
import { query } from "./_generated/server";

export const getUserData = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    return { userId: identity.subject };
  },
});
```

**Key Differences:**
- Use `ctx.auth.getUserIdentity()` in Convex functions
- Returns `null` if not authenticated
- `identity.subject` contains the user ID

### Auth Hooks Comparison

**OLD: Supabase**
```tsx
// Custom hook needed
function useUser() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const supabase = getClient();
    supabase.auth.getUser().then(({ data }) => setUser(data.user));

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => setUser(session?.user ?? null)
    );

    return () => subscription.unsubscribe();
  }, []);

  return user;
}
```

**NEW: Convex**
```tsx
// Built-in hooks
import { useConvexAuth } from 'convex/react';

function Component() {
  const { isAuthenticated, isLoading } = useConvexAuth();

  if (isLoading) return <div>Loading...</div>;
  if (!isAuthenticated) return <div>Not logged in</div>;

  return <div>Logged in!</div>;
}
```

**Key Differences:**
- Convex provides built-in `useConvexAuth()` hook
- No manual subscription management needed
- Automatic loading states

---

## 4. Routing Changes

### Next.js Navigation → TanStack Router

| Feature | Old (Next.js) | New (TanStack Router) |
|---------|---------------|----------------------|
| **Link Component** | `next/link` | `@tanstack/react-router` |
| **Router Hook** | `useRouter()` from `next/navigation` | `useRouter()` from `@tanstack/react-router` |
| **Params** | `useParams()` | `Route.useParams()` |
| **Search Params** | `useSearchParams()` | `Route.useSearch()` |

### Link Components

**OLD: Next.js**
```tsx
import Link from 'next/link';

function Navigation() {
  return (
    <>
      <Link href="/dashboard">Dashboard</Link>
      <Link href="/pawkits/my-collection">Collection</Link>
    </>
  );
}
```

**NEW: TanStack Router**
```tsx
import { Link } from '@tanstack/react-router';

function Navigation() {
  return (
    <>
      <Link to="/dashboard">Dashboard</Link>
      <Link to="/pawkits/my-collection">Collection</Link>
    </>
  );
}
```

**Key Differences:**
- Import from `@tanstack/react-router` instead of `next/link`
- Use `to` prop instead of `href`
- Type-safe routes (TypeScript knows all valid routes)

### Navigation Patterns

**OLD: Next.js**
```tsx
import { useRouter } from 'next/navigation';

function LoginForm() {
  const router = useRouter();

  const handleLogin = async () => {
    await signIn();
    router.push('/dashboard');
    router.refresh(); // Refresh server data
  };
}
```

**NEW: TanStack Router**
```tsx
import { useRouter } from '@tanstack/react-router';

function LoginForm() {
  const router = useRouter();

  const handleLogin = async () => {
    await signIn();
    router.navigate({ to: '/dashboard' });
    // No need to refresh - Convex queries auto-update
  };
}
```

**Key Differences:**
- `router.navigate({ to: '/dashboard' })` instead of `router.push()`
- No need to call `router.refresh()` (Convex auto-updates)
- Type-safe navigation

### Route Parameters

**OLD: Next.js**
```tsx
// app/pawkits/[slug]/page.tsx
import { useParams } from 'next/navigation';

export default function PawkitPage() {
  const params = useParams();
  const slug = params.slug as string;

  return <div>{slug}</div>;
}
```

**NEW: TanStack Router**
```tsx
// routes/pawkits.$slug.tsx
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/pawkits/$slug')({
  component: PawkitPage,
});

function PawkitPage() {
  const { slug } = Route.useParams();

  return <div>{slug}</div>;
}
```

**Key Differences:**
- Use `$slug` in filename for dynamic segments
- Access params via `Route.useParams()` (type-safe)
- No need to cast types

---

## 5. API & Hook Signature Changes

### Data Fetching Hooks

**OLD: Custom API Hooks (with fetch)**
```typescript
// No standard pattern - manual fetch calls
function useCards(workspaceId: string) {
  const [cards, setCards] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/cards?workspaceId=${workspaceId}`)
      .then(res => res.json())
      .then(data => {
        setCards(data.cards);
        setIsLoading(false);
      });
  }, [workspaceId]);

  return { cards, isLoading };
}
```

**NEW: Convex Hooks**
```typescript
// Built-in real-time subscriptions
import { useQuery } from 'convex/react';
import { api } from '../convex/_generated/api';

function useCards(workspaceId: Id<'workspaces'>) {
  const cards = useQuery(
    api.cards.list,
    workspaceId ? { workspaceId } : 'skip'
  );

  return {
    cards: cards ?? [],
    isLoading: cards === undefined,
  };
}
```

**Key Differences:**
- Convex `useQuery` automatically subscribes to changes
- No manual loading state management (undefined = loading)
- Use `'skip'` to conditionally skip queries
- Type-safe arguments

### Mutation Hooks

**OLD: API Mutations**
```typescript
async function createCard(data: CardData) {
  const response = await fetch('/api/cards', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!response.ok) throw new Error('Failed to create card');
  return response.json();
}

// In component
const handleCreate = async () => {
  await createCard({ title: 'New Card', ... });
  // Manually refetch or update state
};
```

**NEW: Convex Mutations**
```typescript
import { useMutation } from 'convex/react';
import { api } from '../convex/_generated/api';

function Component() {
  const createCard = useMutation(api.cards.create);

  const handleCreate = async () => {
    const cardId = await createCard({
      workspaceId,
      type: 'md-note',
      title: 'New Card',
    });
    // Queries automatically re-run - no manual refetch needed!
  };
}
```

**Key Differences:**
- Use `useMutation()` hook instead of manual fetch
- Mutations automatically trigger query re-runs
- Returns the created ID directly
- Type-safe mutation arguments

### Context Provider Pattern

**OLD: Manual Data Context**
```tsx
// Custom context with manual state management
const DataContext = createContext<DataContextValue | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const [cards, setCards] = useState<Card[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Manual fetching
  useEffect(() => {
    fetchCards().then(setCards).finally(() => setIsLoading(false));
  }, []);

  return (
    <DataContext.Provider value={{ cards, isLoading }}>
      {children}
    </DataContext.Provider>
  );
}
```

**NEW: Convex Data Context**
```tsx
// Context wraps Convex hooks for real-time subscriptions
import { useQuery } from 'convex/react';

export function ConvexDataProvider({ children }: { children: ReactNode }) {
  const workspace = useCurrentWorkspace();

  // Automatic real-time subscriptions
  const cards = useQuery(
    api.cards.list,
    workspace?._id ? { workspaceId: workspace._id } : 'skip'
  );

  const isLoading = cards === undefined;

  return (
    <DataContext.Provider value={{ cards: cards ?? [], isLoading }}>
      {children}
    </DataContext.Provider>
  );
}
```

**Key Differences:**
- Wrap Convex queries in context for global state
- No manual fetching or state updates
- Automatic real-time updates propagate through context
- Simpler implementation

---

## 6. Data Fetching Patterns

### Server-Side Data Fetching

**OLD: Next.js (getServerSideProps → Server Components)**
```tsx
// Next.js 13+ Server Component
import { createClient } from '@/lib/supabase/server';

export default async function HomePage() {
  const supabase = await createClient();

  const { data: cards } = await supabase
    .from('cards')
    .select('*')
    .eq('workspaceId', workspaceId);

  return <CardList cards={cards} />;
}
```

**NEW: TanStack Start (Loader Pattern)**
```tsx
// TanStack Start with loader
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/home')({
  loader: async () => {
    // Server-side data fetching (optional)
    const data = await fetchSomeData();
    return data;
  },
  component: HomePage,
});

function HomePage() {
  const data = Route.useLoaderData();

  // OR use Convex real-time queries
  const cards = useQuery(api.cards.list, { workspaceId });

  return <CardList cards={cards} />;
}
```

**Key Differences:**
- TanStack loaders are optional (Convex queries preferred)
- Use `Route.useLoaderData()` to access loader data
- Convex queries run on client but feel like SSR (instant)

### Search / Full-Text Search

**OLD: PostgreSQL Full-Text Search (Prisma)**
```typescript
// Limited search - manual LIKE queries
const cards = await prisma.card.findMany({
  where: {
    OR: [
      { title: { contains: searchQuery, mode: 'insensitive' } },
      { description: { contains: searchQuery, mode: 'insensitive' } },
    ],
  },
});
```

**NEW: Convex Search Indexes**
```typescript
// Built-in full-text search
export const search = query({
  args: { workspaceId: v.id("workspaces"), query: v.string() },
  handler: async (ctx, { workspaceId, query: searchQuery }) => {
    return await ctx.db
      .query("cards")
      .withSearchIndex("search_by_title", (q) =>
        q.search("title", searchQuery)
         .eq("workspaceId", workspaceId)
         .eq("deleted", false)
      )
      .take(20);
  },
});
```

**Key Differences:**
- Convex has built-in full-text search indexes
- Much faster than SQL LIKE queries
- Define search indexes in schema
- Can search across multiple fields

### Pagination

**OLD: Offset-Based Pagination (Prisma)**
```typescript
const cards = await prisma.card.findMany({
  where: { workspaceId },
  orderBy: { updatedAt: 'desc' },
  take: 50,
  skip: page * 50,
});
```

**NEW: Cursor-Based Pagination (Convex)**
```typescript
export const listPaginated = query({
  args: {
    workspaceId: v.id("workspaces"),
    cursor: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { workspaceId, cursor, limit = 50 }) => {
    const results = await ctx.db
      .query("cards")
      .withIndex("by_workspace_deleted", (q) =>
        q.eq("workspaceId", workspaceId).eq("deleted", false)
      )
      .paginate({ cursor: cursor ?? null, numItems: limit });

    return {
      cards: results.page,
      nextCursor: results.continueCursor,
      isDone: results.isDone,
    };
  },
});
```

**Key Differences:**
- Convex uses cursor-based pagination (more efficient)
- Returns `nextCursor` for next page
- `isDone` flag indicates no more pages

---

## Quick Migration Checklist

### 1. Project Setup
- [ ] Set up Convex account and project
- [ ] Install Convex CLI: `npm install -g convex`
- [ ] Initialize Convex in new project: `npx convex dev`
- [ ] Set up TanStack Start project
- [ ] Configure environment variables (`.env.local`)

### 2. Schema Migration
- [ ] Convert Prisma schema to Convex schema
- [ ] Define all tables with `defineTable()`
- [ ] Add indexes for common queries
- [ ] Add search indexes for text search
- [ ] Deploy schema: `npx convex deploy`

### 3. Backend Migration
- [ ] Convert API routes to Convex functions (`query`, `mutation`)
- [ ] Move authentication logic to Convex Auth
- [ ] Set up Convex Auth with password provider
- [ ] Test authentication flow

### 4. Frontend Migration
- [ ] Convert Next.js routes to TanStack routes
- [ ] Update all `Link` imports and `href` → `to`
- [ ] Replace Supabase client with Convex hooks
- [ ] Update all `useQuery`/`useMutation` calls
- [ ] Remove `'use client'` directives
- [ ] Update root layout to TanStack format

### 5. Data Fetching Migration
- [ ] Replace API fetch calls with `useQuery(api.*.list)`
- [ ] Replace mutations with `useMutation(api.*.create)`
- [ ] Remove manual loading states (use `undefined` check)
- [ ] Remove manual refetch logic (Convex auto-updates)

### 6. Testing & Verification
- [ ] Test authentication (login, signup, logout)
- [ ] Test all CRUD operations
- [ ] Verify real-time updates work
- [ ] Test search functionality
- [ ] Test pagination
- [ ] Check file uploads (Convex storage)

---

## Common Patterns & Examples

### Creating a New Entity

**OLD: Prisma + Next.js API Route**
```typescript
// API: app/api/cards/route.ts
export async function POST(request: Request) {
  const body = await request.json();
  const card = await prisma.card.create({
    data: {
      workspaceId: body.workspaceId,
      title: body.title,
      type: body.type,
    },
  });
  return NextResponse.json({ card });
}

// Client
const response = await fetch('/api/cards', {
  method: 'POST',
  body: JSON.stringify({ title: 'New Card', ... }),
});
```

**NEW: Convex**
```typescript
// Backend: convex/cards.ts
export const create = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    title: v.optional(v.string()),
    type: v.string(),
  },
  handler: async (ctx, args) => {
    const cardId = await ctx.db.insert("cards", {
      ...args,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    return cardId;
  },
});

// Client
import { useMutation } from 'convex/react';
import { api } from '../convex/_generated/api';

const createCard = useMutation(api.cards.create);
const cardId = await createCard({
  workspaceId,
  title: 'New Card',
  type: 'md-note',
});
```

### Real-Time List Updates

**OLD: Manual Polling or Supabase Realtime**
```tsx
// Manual polling
useEffect(() => {
  const interval = setInterval(() => {
    fetchCards().then(setCards);
  }, 5000);
  return () => clearInterval(interval);
}, []);

// OR Supabase Realtime (complex setup)
const channel = supabase.channel('cards-changes')...
```

**NEW: Convex (Automatic)**
```tsx
// Automatic real-time updates - no setup needed!
const cards = useQuery(api.cards.list, { workspaceId });
// Updates instantly when any card changes
```

---

## Resources

- [TanStack Router Docs](https://tanstack.com/router/latest)
- [TanStack Start Docs](https://tanstack.com/start/latest)
- [Convex Docs](https://docs.convex.dev/)
- [Convex Auth Docs](https://labs.convex.dev/auth)

---

## Notes

- **Type Safety**: Both stacks have excellent TypeScript support, but Convex generates types automatically from your schema
- **Real-Time**: Convex real-time is significantly simpler than Supabase Realtime
- **No API Routes Needed**: Convex eliminates the need for Next.js API routes
- **File Storage**: Use `ctx.storage` in Convex instead of Supabase Storage
- **Search**: Convex search indexes are faster than PostgreSQL full-text search
- **Offline Support**: Both support offline-first patterns (IndexedDB on client)

---

**Last Updated**: 2026-01-21
