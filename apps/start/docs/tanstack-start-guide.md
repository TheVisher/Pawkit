# TanStack Start Guide

A comprehensive guide to TanStack Start for this project.

## Overview

TanStack Start is a full-stack React framework built on Vite, Nitro, and TanStack Router. It provides:

- Full-document SSR with streaming
- Server functions
- File-based routing with full type safety
- Code splitting
- Deployment to any hosting provider

## Project Structure

```
app/
├── routes/
│   ├── __root.tsx      # Root layout
│   ├── index.tsx       # Home page (/)
│   ├── about.tsx       # About page (/about)
│   └── posts.$postId.tsx  # Dynamic route (/posts/:postId)
├── client.tsx          # Client entry point
├── router.tsx          # Router configuration
├── routeTree.gen.ts    # Auto-generated route tree
└── ssr.tsx             # SSR handler
app.config.ts           # Vite/Start configuration
```

## Core Files

### app.config.ts

```typescript
import { defineConfig } from '@tanstack/react-start/config';
import tsConfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  vite: {
    plugins: [
      tsConfigPaths({
        projects: ['./tsconfig.json'],
      }),
    ],
  },
});
```

### app/router.tsx

```typescript
import { createRouter as createTanStackRouter } from '@tanstack/react-router';
import { routeTree } from './routeTree.gen';

export function createRouter() {
  const router = createTanStackRouter({
    routeTree,
    scrollRestoration: true,
  });
  return router;
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof createRouter>;
  }
}
```

### app/client.tsx

```typescript
/// <reference types="vinxi/types/client" />
import { hydrateRoot } from 'react-dom/client';
import { StartClient } from '@tanstack/react-start';
import { createRouter } from './router';

const router = createRouter();

hydrateRoot(document, <StartClient router={router} />);
```

### app/ssr.tsx

```typescript
import {
  createStartHandler,
  defaultStreamHandler,
} from '@tanstack/react-start/server';
import { getRouterManifest } from '@tanstack/react-start/router-manifest';
import { createRouter } from './router';

export default createStartHandler({
  createRouter,
  getRouterManifest,
})(defaultStreamHandler);
```

### app/routes/__root.tsx

```typescript
import {
  Outlet,
  createRootRoute,
  HeadContent,
  Scripts,
} from '@tanstack/react-router';
import type { ReactNode } from 'react';

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'My App' },
    ],
  }),
  component: RootComponent,
});

function RootComponent() {
  return (
    <RootDocument>
      <Outlet />
    </RootDocument>
  );
}

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html>
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}
```

## File-Based Routing

### File Naming Conventions

| Pattern | Route Path | Description |
|---------|-----------|-------------|
| `index.tsx` | `/` | Index route |
| `about.tsx` | `/about` | Static route |
| `posts.tsx` | `/posts` | Parent route |
| `posts.index.tsx` | `/posts` (exact) | Posts index |
| `posts.$postId.tsx` | `/posts/:postId` | Dynamic param |
| `posts_.$postId.edit.tsx` | `/posts/:postId/edit` | Non-nested dynamic |
| `_layout.tsx` | (none) | Pathless layout |
| `*.lazy.tsx` | (same) | Code-split component |

### Special Characters

- `$` - Dynamic parameter: `$postId` matches any value
- `_` prefix - Pathless layout: `_layout.tsx` wraps children without URL segment
- `_` suffix - Non-nested route: `posts_.$postId` breaks out of nesting
- `.lazy` - Code splitting: loads component only when route matches

### Creating Routes

**Basic route:**

```typescript
// app/routes/about.tsx
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/about')({
  component: AboutPage,
});

function AboutPage() {
  return <h1>About Us</h1>;
}
```

**Dynamic route:**

```typescript
// app/routes/posts.$postId.tsx
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/posts/$postId')({
  component: PostPage,
});

function PostPage() {
  const { postId } = Route.useParams();
  return <h1>Post: {postId}</h1>;
}
```

**Route with loader:**

```typescript
// app/routes/posts.$postId.tsx
import { createFileRoute } from '@tanstack/react-router';
import { getPost } from '../api/posts';

export const Route = createFileRoute('/posts/$postId')({
  loader: async ({ params }) => {
    return await getPost(params.postId);
  },
  component: PostPage,
});

function PostPage() {
  const post = Route.useLoaderData();
  return <h1>{post.title}</h1>;
}
```

### Layouts

**Pathless layout (shared UI without URL segment):**

```typescript
// app/routes/_authenticated.tsx
import { createFileRoute, Outlet } from '@tanstack/react-router';

export const Route = createFileRoute('/_authenticated')({
  component: AuthLayout,
});

function AuthLayout() {
  return (
    <div>
      <nav>Authenticated Nav</nav>
      <Outlet />
    </div>
  );
}

// app/routes/_authenticated.dashboard.tsx - accessible at /dashboard
// app/routes/_authenticated.settings.tsx - accessible at /settings
```

**Parent layout:**

```typescript
// app/routes/posts.tsx
import { createFileRoute, Outlet } from '@tanstack/react-router';

export const Route = createFileRoute('/posts')({
  component: PostsLayout,
});

function PostsLayout() {
  return (
    <div>
      <h1>Posts</h1>
      <Outlet />
    </div>
  );
}
```

## Server Functions

Server functions run on the server but can be called from anywhere in your app.

### Creating Server Functions

```typescript
import { createServerFn } from '@tanstack/react-start';

const getProjects = createServerFn({
  method: 'GET',
}).handler(async () => {
  const res = await fetch('https://api.github.com/users/me/repos');
  return res.json();
});
```

### Server Functions with Validation

```typescript
import { createServerFn } from '@tanstack/react-start';

const submitForm = createServerFn({ method: 'POST' })
  .validator((data: FormData) => {
    const email = data.get('email');
    const message = data.get('message');
    if (!email || !message) {
      throw new Error('Email and Message required');
    }
    return {
      email: email.toString(),
      message: message.toString(),
    };
  })
  .handler(async (ctx) => {
    // ctx.data contains validated { email, message }
    await sendEmail(ctx.data);
    return { success: true };
  });
```

### Using Server Functions in Routes

```typescript
// app/routes/projects.tsx
import { createFileRoute } from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';

const getProjects = createServerFn({
  method: 'GET',
}).handler(async () => {
  return await db.query('projects').collect();
});

export const Route = createFileRoute('/projects')({
  loader: () => getProjects(),
  component: ProjectsPage,
});

function ProjectsPage() {
  const projects = Route.useLoaderData();
  return (
    <ul>
      {projects.map((p) => (
        <li key={p.id}>{p.name}</li>
      ))}
    </ul>
  );
}
```

### Using Server Functions in Components

```typescript
import { useServerFn } from '@tanstack/react-start';

function ContactForm() {
  const submit = useServerFn(submitForm);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const result = await submit({ data: formData });
    if (result.success) {
      alert('Sent!');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input name="email" type="email" required />
      <textarea name="message" required />
      <button type="submit">Send</button>
    </form>
  );
}
```

## Server Routes (API Endpoints)

Create API endpoints using the `server` property:

```typescript
// app/routes/api.health.tsx
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/api/health')({
  server: {
    GET: async () => {
      return new Response(JSON.stringify({ status: 'ok' }), {
        headers: { 'Content-Type': 'application/json' },
      });
    },
  },
});
```

## Navigation

### Link Component

```typescript
import { Link } from '@tanstack/react-router';

function Nav() {
  return (
    <nav>
      <Link to="/">Home</Link>
      <Link to="/about">About</Link>
      <Link to="/posts/$postId" params={{ postId: '123' }}>
        Post 123
      </Link>
    </nav>
  );
}
```

### useNavigate Hook

```typescript
import { useNavigate } from '@tanstack/react-router';

function LoginButton() {
  const navigate = useNavigate();

  const handleLogin = async () => {
    await login();
    navigate({ to: '/dashboard' });
  };

  return <button onClick={handleLogin}>Login</button>;
}
```

### Search Params

```typescript
// app/routes/search.tsx
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/search')({
  validateSearch: (search) => ({
    q: (search.q as string) || '',
    page: Number(search.page) || 1,
  }),
  component: SearchPage,
});

function SearchPage() {
  const { q, page } = Route.useSearch();
  const navigate = useNavigate();

  return (
    <div>
      <input
        value={q}
        onChange={(e) =>
          navigate({
            search: { q: e.target.value, page: 1 },
          })
        }
      />
      <p>Page: {page}</p>
    </div>
  );
}
```

## Head Management

```typescript
export const Route = createFileRoute('/about')({
  head: () => ({
    meta: [
      { title: 'About Us' },
      { name: 'description', content: 'Learn about our company' },
    ],
    links: [
      { rel: 'canonical', href: 'https://example.com/about' },
    ],
  }),
  component: AboutPage,
});
```

Dynamic head based on loader data:

```typescript
export const Route = createFileRoute('/posts/$postId')({
  loader: async ({ params }) => getPost(params.postId),
  head: ({ loaderData }) => ({
    meta: [
      { title: loaderData.title },
      { name: 'description', content: loaderData.excerpt },
    ],
  }),
  component: PostPage,
});
```

## Styling with Tailwind CSS

1. Install: `npm install tailwindcss @tailwindcss/vite`

2. Update `app.config.ts`:

```typescript
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  vite: {
    plugins: [tailwindcss()],
  },
});
```

3. Create `app/styles/app.css`:

```css
@import 'tailwindcss';
```

4. Import in `__root.tsx`:

```typescript
import appCSS from '../styles/app.css?url';

export const Route = createRootRoute({
  head: () => ({
    links: [{ rel: 'stylesheet', href: appCSS }],
  }),
  component: RootComponent,
});
```

## Error Handling

```typescript
export const Route = createFileRoute('/posts/$postId')({
  loader: async ({ params }) => {
    const post = await getPost(params.postId);
    if (!post) {
      throw notFound();
    }
    return post;
  },
  notFoundComponent: () => <div>Post not found</div>,
  errorComponent: ({ error }) => <div>Error: {error.message}</div>,
  component: PostPage,
});
```

## Pending States

```typescript
function PostPage() {
  const post = Route.useLoaderData();
  const { isLoading } = Route.useMatch();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return <h1>{post.title}</h1>;
}
```

## Commands

```bash
npm run dev    # Start development server
npm run build  # Build for production
npm run start  # Start production server
```

## Resources

- [TanStack Start Docs](https://tanstack.com/start/latest)
- [TanStack Router Docs](https://tanstack.com/router/latest)
- [TanStack Discord](https://tlinz.com/discord)
