# Start App Review + Fixes (TanStack + Convex)

## What was fixed

### DnD crash ("Cannot have two HTML5 backends")
- Root cause: multiple `react-dnd` providers were mounted (one per editor + another in app shell).
- Fix: provide a single `DndProvider` at the app root and remove the per-editor provider.
- Files:
  - `src/lib/contexts/dnd-context.tsx`
  - `src/components/editor/plugins/dnd-kit.tsx`
  - `src/components/layout/dashboard-shell.tsx`
  - `src/routes/__root.tsx`

### P0 security/data isolation
- Added auth + private-host protections to Convex HTTP routes to reduce SSRF/abuse.
- Added auth + ownership checks for storage actions; prevent deleting arbitrary storage IDs.
- Enforced card/workspace match in collections (prevents cross-workspace leakage).
- Files:
  - `convex/http.ts`
  - `convex/storage.ts`
  - `convex/collections.ts`

### P1 data integrity
- Trash permanent delete now cleans references + storage blobs.
- Template prepend/append now merges content instead of always replacing.
- Reference sync restored on editor blur (Convex references sync).
- Added async error guards (chrono lazy import + bills widget missed-payment loop).
- Files:
  - `convex/cards.ts`
  - `src/lib/utils/template-applicator.ts`
  - `src/components/editor/pawkit-plate-editor.tsx`
  - `src/lib/hooks/use-mention-search.ts`
  - `src/components/home/bills-widget.tsx`

## Prioritized list (single source of truth)

### P0 — Fix before anything public
- Storage actions missing auth/ownership checks; arbitrary `cardId`/`storageId` can be mutated/deleted. `convex/storage.ts`
- Public HTTP routes allow arbitrary URL fetches (SSRF/abuse). `convex/http.ts`
- Collections allow cross-workspace card references; `getCards` can leak other workspace cards. `convex/collections.ts`

Status: **DONE** in this pass.

### P1 — Core data integrity / feature gaps
- Reference sync disabled (mentions/backlinks won’t update). `src/components/editor/pawkit-plate-editor.tsx`
- Template prepend/append not implemented (always replace). `src/lib/utils/template-applicator.ts`
- Known TODO error in block discussion. `src/components/ui/block-discussion.tsx`
- Empty trash doesn’t delete references or storage files. `convex/cards.ts`
- Unhandled async in bills widget (missed-payments loop). `src/components/home/bills-widget.tsx`
- Chrono lazy-load has no error handling. `src/lib/hooks/use-mention-search.ts`

Status: **DONE**

### P2 — Tech debt / stability
- ~~ResizeObserver removal flagged as CRITICAL (scroll issues).~~ **RESOLVED** - see notes below.
- ~~Lots of console logging in production paths.~~ **DONE** - see item 4 below.
- Many `any` types across Plate/supertag parsing and Convex config. `src/lib/tags/supertags/*`, `src/components/editor/*`, `convex/schema.ts`
- Deprecated HTML template functions still present. `src/lib/tags/supertags/*`
- Deep relative imports to `convex/_generated/*` (fragile). e.g. `src/lib/hooks/convex/use-convex-workspace.ts`

Status: **OPEN**

## What’s left to do (next actions)

1) ~~Fix block discussion TODO~~ **DONE**
- The TODO comment was misleading - the code is correct, it handles initializing the path map for comment IDs. Updated the comment to clarify this is expected behavior, not an error.

2) ~~Decide on error reporting~~ **DEFERRED**
- Sentry integration deferred until production launch with real users. Convex dashboard captures most errors (queries, mutations, actions). Console.error handles client-side for now.

3) ~~Resolve ResizeObserver/scroll issues~~ **RESOLVED**
- See "ResizeObserver Context" in notes below.

4) ~~Trim production console logs~~ **DONE**
- Updated metadata handlers, image-persistence, and article-extractor to use `createModuleLogger()` from `src/lib/utils/logger.ts`
- Debug/trace logs are dev-only (`log.debug/warn`), silenced in production
- Actionable failures use `log.error` (visible in prod): missing Convex config, persistence failures
- Article extraction timeouts remain `log.warn` (dev-only) since timeouts are expected behavior

5) Type cleanup + deprecations
- Gradually reduce `any` usage in Plate/supertags.
- Remove or document deprecated HTML template functions.

## Notes

### ResizeObserver Context

**Status: RESOLVED** - No action needed.

The per-item ResizeObserver was **already removed** from `muuri-grid.tsx` (see lines 532-541). It was causing scroll freezes because:
1. ResizeObserver fired on minor size changes during scroll
2. Triggered 50ms delayed `grid.layout()` which recalculates ALL positions
3. Layout calculation blocked main thread, causing scroll to queue up
4. When unblocked, scroll "fast forwarded" to catch up

**What's still there:**
- A ResizeObserver on the *container* (not individual items) to recalculate column widths on resize - this is fine.

**Why we don't need per-item ResizeObserver:**
- **Images**: Cards get `aspectRatio` at creation time via `metadata-service.ts`, so image loads don't cause layout shifts
- **Media load events**: Grid re-layouts on `<img>`/`<video>` load/error events (lines 426-446)
- **Content changes**: Handled via `layoutVersion` prop - parent increments it to trigger re-layout

**The debug panel** (`src/components/debug/sections/resize-observer-section.tsx`) exists for testing if a "smarter" per-item observer could work in the future. It's OFF by default. The "CRITICAL" warning is just documenting why it was removed, not indicating a problem to fix.

---

### Other Notes
- Local dev auth being imperfect does **not** eliminate the P0 risks. If any endpoints are exposed publicly, keep the protections in place.
