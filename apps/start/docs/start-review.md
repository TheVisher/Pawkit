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

Status: **PARTIALLY DONE** (everything above except block discussion).

### P2 — Tech debt / stability
- ResizeObserver removal flagged as CRITICAL (scroll issues). `src/components/debug/sections/resize-observer-section.tsx`
- Lots of console logging in production paths. `src/lib/metadata/*`, `src/lib/services/article-extractor.ts`, `convex/*`
- Many `any` types across Plate/supertag parsing and Convex config. `src/lib/tags/supertags/*`, `src/components/editor/*`, `convex/schema.ts`
- Deprecated HTML template functions still present. `src/lib/tags/supertags/*`
- Deep relative imports to `convex/_generated/*` (fragile). e.g. `src/lib/hooks/convex/use-convex-workspace.ts`

Status: **OPEN**

## What’s left to do (next actions)

1) Fix block discussion TODO
- `src/components/ui/block-discussion.tsx` has a TODO “fix throw error.” Investigate and resolve the edge case that triggers it.

2) Decide on error reporting
- `src/components/error-boundary.tsx` is console-only. Add Sentry (or remove the TODO if intentionally deferred).

3) Resolve ResizeObserver/scroll issues
- Debug UI flags CRITICAL removal and scroll freezes. Re-evaluate card sizing strategy or introduce throttled observer with hard limits.

4) Trim production console logs
- Reduce or gate logs behind dev flag; many noisy logs in metadata/image persistence/article extractor.

5) Type cleanup + deprecations
- Gradually reduce `any` usage in Plate/supertags.
- Remove or document deprecated HTML template functions.

## Notes
- Local dev auth being imperfect does **not** eliminate the P0 risks. If any endpoints are exposed publicly, keep the protections in place.
