# Visual Bookmark Manager

A minimal visual bookmark manager built with Next.js App Router, React, TypeScript, Tailwind CSS, Prisma, and SQLite. It supports CRUD for bookmark cards, hierarchical collections with drag and drop, metadata fetching integration, import/export, and a Playwright smoke test.

## Prerequisites

- Node.js 20+
- pnpm (recommended) or npm/yarn

## Getting Started

1. Install dependencies:

   ```bash
   pnpm install
   # or
   npm install
   ```

2. Apply Prisma schema and generate the client:

   ```bash
   pnpm exec prisma migrate deploy
   pnpm exec prisma generate
   ```

   The repository includes an initial migration for the SQLite database (`prisma/dev.db`).

3. Run the development server:

   ```bash
   pnpm dev
   ```

   Visit `http://localhost:3000` to access the application.

## Environment Variables

| Name | Description | Default |
| ---- | ----------- | ------- |
| `NEXT_PUBLIC_PREVIEW_SERVICE_URL` | Template URL for the metadata preview service. The string must contain the `{{url}}` token, which will be replaced with the encoded bookmark URL when the server fetches metadata. | `http://localhost:8787/preview?url={{url}}` |

The preview service itself is out of scope for this project. If the service is unavailable, cards are still created with a `PENDING` status.

## Available Scripts

| Command | Description |
| ------- | ----------- |
| `pnpm dev` | Start Next.js in development mode. |
| `pnpm build` | Create an optimized production build. |
| `pnpm start` | Run the production server. |
| `pnpm lint` | Run Next.js ESLint checks. |
| `pnpm prisma:migrate` | Run Prisma migrations in development (`prisma migrate dev`). |
| `pnpm prisma:generate` | Regenerate the Prisma client. |
| `pnpm test:e2e` | Execute the Playwright smoke test. |

## Testing

The project ships with a Playwright smoke test (`tests/playwright/smoke.spec.ts`) that exercises the primary flow (create → open → edit notes → delete a card). Run it with:

```bash
pnpm test:e2e
```

Playwright is configured to start the development server automatically using the command defined in `playwright.config.ts`.

## Project Structure

- `app/` — Next.js App Router routes and layouts.
- `components/` — Reusable UI building blocks (cards, sidebar, settings, modals).
- `lib/` — Shared utilities, server-side helpers, and Zustand stores.
- `prisma/` — Prisma schema and migrations for the SQLite database.
- `tests/playwright/` — Playwright end-to-end smoke test.

## Data Model

Prisma models for cards and collections are defined in `prisma/schema.prisma`. Cards store tags and collection slugs as JSON strings in SQLite for simplicity; the API layer validates and normalizes inputs with Zod.

## Notes

- Drag and drop uses `@dnd-kit/core`; dropping one or more selected cards onto a collection assigns the collection slug to every card in the selection.
- User preferences (auto metadata fetch, thumbnail visibility, preview service URL) persist locally via Zustand with `localStorage`.
- Import and export endpoints operate on JSON payloads `{ cards, collections, exportedAt }`. Imports upsert matching entities by ID when provided.
