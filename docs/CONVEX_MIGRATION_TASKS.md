# Convex Migration Task List

Status: Historical. Migration tasks are kept for reference; current development uses Convex by default.

> Quick reference for migration progress. See `CONVEX_MIGRATION_PLAYBOOK.md` for full details.

## Phase 1: Create Native Convex Hooks

- [ ] `src/lib/hooks/convex/use-convex-cards.ts`
- [ ] `src/lib/hooks/convex/use-convex-collections.ts`
- [ ] `src/lib/hooks/convex/use-convex-events.ts`
- [ ] `src/lib/hooks/convex/use-convex-workspace.ts`
- [ ] `src/lib/hooks/convex/index.ts`

## Phase 1.5: Remove Compatibility Layers (No Fallback)

- [ ] Delete `src/lib/contexts/unified-data-context.tsx`
- [ ] Delete `src/lib/contexts/data-context.tsx`
- [ ] Delete `src/lib/hooks/use-unified-mutations.ts`
- [ ] Delete `src/lib/hooks/use-live-data.ts`
- [ ] Delete Dexie DB files: `src/lib/db/index.ts`, `src/lib/db/schema.ts`, `src/lib/db/types.ts`, `src/lib/db/local-only.ts`
- [ ] Remove Dexie-dependent store: `src/lib/stores/data-store.ts`

## Phase 1.8: Client-Only Data Components

- [ ] Convert any data-reading server components to client components
- [ ] Ensure all data reads use `useQuery` and all writes use `useMutation`

## Phase 2: Migrate Home Widgets

- [ ] `src/components/home/daily-log-widget.tsx`
- [ ] `src/components/home/todo-widget.tsx`
- [ ] `src/components/home/bills-widget.tsx`
- [ ] `src/components/home/scheduled-today-widget.tsx`
- [ ] `src/components/home/continue-reading-widget.tsx`
- [ ] `src/components/home/recent-cards-widget.tsx`
- [ ] `src/components/cards/todays-note-widget.tsx`

## Phase 3: Migrate Core Views

- [ ] `src/app/(dashboard)/library/page.tsx`
- [ ] `src/app/(dashboard)/home/page.tsx`
- [ ] `src/app/(dashboard)/calendar/page.tsx`
- [ ] `src/app/(dashboard)/pawkits/[slug]/page.tsx`
- [ ] `src/app/(dashboard)/tags/page.tsx`
- [ ] `src/app/(dashboard)/trash/page.tsx`

## Phase 4: Migrate Card Components

- [ ] `src/components/cards/card-item/grid-card.tsx`
- [ ] `src/components/cards/card-item/masonry-card.tsx`
- [ ] `src/components/cards/card-list-view/` (all files)
- [ ] `src/components/cards/muuri-grid.tsx`

## Phase 5: Migrate Modals

- [ ] `src/components/modals/card-detail/index.tsx`
- [ ] `src/components/modals/card-detail/content.tsx`
- [ ] `src/components/modals/card-detail/content/*.tsx`
- [ ] `src/components/modals/add-card-form.tsx`

## Phase 6: Migrate Navigation/Layout

- [ ] `src/components/layout/left-sidebar.tsx`
- [ ] `src/components/layout/mobile-sidebar.tsx`
- [ ] `src/components/layout/omnibar/use-omnibar/use-search.ts`
- [ ] `src/components/layout/omnibar/use-omnibar/use-add-mode.ts`

## Phase 6.5: Auth & Routing (Convex Only)

- [ ] Remove Supabase auth pages in `src/app/(auth)/`
- [ ] Remove Supabase auth checks in `src/middleware.ts`
- [ ] Replace sign-out flows with Convex Auth sign-out
- [ ] Gate app with `Authenticated` / `Unauthenticated`

## Phase 6.8: Storage (Convex Only)

- [ ] Replace Supabase storage usage in `src/lib/metadata/image-persistence.ts`
- [ ] Update `src/components/modals/card-photo-picker-modal.tsx` to use Convex storage

## Phase 7: Migrate Context Menus

- [ ] `src/components/context-menus/card-context-menu.tsx`
- [ ] `src/components/context-menus/content-area-context-menu.tsx`
- [ ] `src/components/context-menus/schedule-submenu.tsx`

## Phase 8: Migrate Stores

- [ ] `src/lib/stores/tag-store.ts` → Use Convex for tag data
- [ ] `src/lib/stores/workspace-store.ts` → Use Convex workspace

## Phase 9: Cleanup - Delete Files

### Sync Infrastructure
- [ ] `src/lib/services/sync-queue.ts`
- [ ] `src/lib/hooks/use-sync.ts`
- [ ] `src/lib/hooks/use-realtime-sync.ts`

### Supabase
- [ ] `src/lib/supabase/` (entire directory)
- [ ] `src/app/api/auth/` (entire directory)
- [ ] `src/middleware.ts` (remove Supabase auth)

## Phase 10: Final Cleanup

- [ ] Update `package.json` - remove dexie, supabase deps
- [ ] Update `.env.example` - remove Supabase vars
- [ ] Update `README.md` - document Convex setup
- [ ] Run full test suite
- [ ] Deploy and verify production

---

## Quick Commands

```bash
# Run TypeScript check
npx tsc --noEmit

# Run dev server
pnpm dev

# Deploy Convex functions
npx convex deploy

# Push Convex schema changes
npx convex dev
```

---

## Key Type Changes Reference

| Old (LocalCard) | New (Doc<"cards">) |
|-----------------|-------------------|
| `card.id` | `card._id` |
| `card._deleted` | `card.deleted` |
| `card.scheduledDate` | `card.scheduledDates[0]` |
| `new Date(card.createdAt)` | `new Date(card.createdAt)` (already timestamp) |
| `LocalCard` type | `Doc<"cards">` type |
| `string` IDs | `Id<"cards">` typed IDs |
