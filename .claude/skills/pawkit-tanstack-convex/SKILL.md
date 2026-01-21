# Pawkit TanStack Start + Convex

**Purpose**: Core guidance for the TanStack Start app with Convex backend

**Created**: January 21, 2026

**Stack**: TanStack Start (React framework) + Convex (backend/database)

---

## DOCUMENTATION REFERENCE

**When to read the docs:**
- Implementing new features or routes
- Working with Convex queries, mutations, or schema
- Unsure about TanStack Start patterns (routing, server functions, loaders)
- Debugging data flow or real-time sync issues

**Documentation files:**
- `docs/convex-guide.md` - Convex schemas, queries, mutations, React hooks, auth, file storage
- `docs/tanstack-start-guide.md` - Routing, server functions, layouts, head management

**Read these docs before implementing significant features.** Don't guess at patterns - check the docs first.

---

## PROJECT STRUCTURE

```
Pawkit/                   # Root (flat structure, not monorepo)
├── src/
│   ├── routes/           # TanStack Start file-based routing
│   │   ├── __root.tsx    # Root layout
│   │   └── *.tsx         # Route files
│   ├── components/       # React components
│   ├── hooks/            # Custom hooks
│   ├── lib/              # Utilities, stores
│   ├── pages/            # Page components
│   ├── router.tsx        # Router config
│   ├── routeTree.gen.ts  # Auto-generated (don't edit)
│   └── styles.css        # Global CSS
├── convex/
│   ├── schema.ts         # Database schema
│   ├── *.ts              # Queries, mutations, actions
│   └── _generated/       # Auto-generated (don't edit)
├── docs/                 # Stack documentation
├── public/               # Static assets
├── archive-next/         # Old Next.js version (archived)
└── vite.config.ts        # Vite/Start config
```

---

## KEY PATTERNS

### Routing (TanStack Start)
- File-based routing in `src/routes/`
- Use `createFileRoute` for routes
- `$param` for dynamic segments
- `_layout` for pathless layouts
- Route path is auto-managed - don't hardcode

### Data (Convex)
- Schema in `convex/schema.ts` (at project root)
- Queries for reads (real-time subscribed)
- Mutations for writes (transactional)
- Actions for external API calls
- Use `useQuery` and `useMutation` hooks in React

### Server Functions
- Use `createServerFn` for server-side logic in TanStack Start
- Use Convex functions for database operations
- Don't mix them unnecessarily - Convex handles most data needs

---

## CONVEX SAFETY GUARDRAILS

### NEVER DO THESE

```typescript
// FORBIDDEN - Mass deletion without explicit user approval
await ctx.db.query("cards").collect().then(cards =>
  Promise.all(cards.map(c => ctx.db.delete(c._id)))
);

// FORBIDDEN - Deleting all documents
for await (const doc of ctx.db.query("tableName")) {
  await ctx.db.delete(doc._id);
}
```

```bash
# FORBIDDEN - Database destruction
npx convex import --replace  # Replaces all data
npx convex env set --prod    # Without explicit approval
```

### ALWAYS DO THESE

1. **Use soft deletes** - Set `deleted: true` instead of actually deleting
2. **Ask before bulk operations** - Any operation affecting multiple records
3. **Confirm environment** - Dev vs prod before destructive operations
4. **Test schema changes locally** - Before pushing to production

### Safe Patterns

```typescript
// SAFE - Soft delete
await ctx.db.patch(id, { deleted: true, deletedAt: Date.now() });

// SAFE - Single record delete (with user intent)
await ctx.db.delete(args.id);  // User explicitly requested this specific item

// SAFE - Filtered queries
const activeCards = await ctx.db
  .query("cards")
  .filter(q => q.eq(q.field("deleted"), false))
  .collect();
```

---

## RELATED V2 SKILLS (Still Applicable)

These skills from the Next.js V2 app are still relevant for UI/design:

| Skill | Status | Notes |
|-------|--------|-------|
| `pawkit-v2-ui` | **Still relevant** | Global CSS, design tokens, theming |
| `pawkit-v2-components` | **Still relevant** | Component patterns, shadcn/ui |
| `pawkit-v2-layout` | **Still relevant** | Layout system, panels |
| `pawkit-v2-masonry` | **Still relevant** | Masonry grid implementation |
| `pawkit-v2-view-settings` | **Review needed** | May need Convex adaptation |
| `pawkit-tag-architecture` | **Review needed** | Tag system concepts apply, implementation differs |

These V2 skills are **NOT applicable** (replaced by Convex):

| Skill | Status | Notes |
|-------|--------|-------|
| `pawkit-v2-data-model` | **Deprecated** | Was Prisma/Supabase, now Convex |
| `pawkit-v2-sync` | **Deprecated** | Convex handles sync automatically |
| `pawkit-v2-extension-auth` | **Review needed** | Auth approach may differ |
| `pawkit-v2-safety` | **Superseded** | Safety rules in this file now |

---

## WORKFLOW

### When implementing a new feature:

1. **Check the docs** - Read relevant sections of convex-guide.md and tanstack-start-guide.md
2. **Check related V2 skills** - For UI/component patterns
3. **Schema first** - Define Convex schema if new data is needed
4. **Functions second** - Write queries/mutations in convex/
5. **Routes/UI last** - Create routes and components

### When debugging:

1. **Check Convex dashboard** - For function logs and data
2. **Check browser console** - For React/client errors
3. **Read the docs** - For correct patterns

---

## COMMANDS

```bash
# Development
pnpm dev              # Start dev server (runs Convex too)

# Convex
npx convex dev        # Convex dev mode (usually runs with pnpm dev)
npx convex dashboard  # Open Convex dashboard

# Build
pnpm build            # Production build
pnpm start            # Start production server
```

---

**Remember: When in doubt, read the docs in `docs/` first.**
