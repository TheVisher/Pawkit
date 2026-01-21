## Pawkit Codex Instructions

These instructions mirror the core Claude guidance for this repo and point to the existing Claude skills. Do not edit or remove any files under `C:\Users\VishLap\Pawkit\.claude`.

## Always-On Rules (TanStack Start + Convex)

- **Stack**: TanStack Start (React) + Convex (backend/database).
- **Docs first**: For new features, routes, Convex schema/functions, or when unsure, read:
  - `docs/convex-guide.md`
  - `docs/tanstack-start-guide.md`
- **Project structure (repo root)**:
  - `src/routes/` for file-based routing using `createFileRoute`.
  - `convex/` for schema, queries, mutations, actions.
  - `src/routeTree.gen.ts` and `convex/_generated/` are auto-generated (do not edit).
- **Convex safety guardrails**:
  - Never mass-delete documents or run destructive commands without explicit user approval.
  - Avoid `npx convex import --replace` and prod environment changes unless explicitly approved.
  - Prefer soft deletes (`deleted: true`) over hard deletes.
  - Ask before any bulk operation that affects multiple records.

## Skills (Claude Compatibility)

Claude skills live at `C:\Users\VishLap\Pawkit\.claude\skills`. When a task matches a skill, open and follow that skill's `SKILL.md` (or `skill.md`) for detailed rules. Do not copy/edit those files.

### Skill Status (per `pawkit-tanstack-convex`)

Still applicable (UI/design guidance):
- `pawkit-v2-ui`
- `pawkit-v2-components`
- `pawkit-v2-layout`
- `pawkit-v2-masonry`

Review needed (concepts may apply, implementation may differ under Convex):
- `pawkit-v2-view-settings`
- `pawkit-tag-architecture`
- `pawkit-v2-extension-auth`

Not applicable or replaced by Convex:
- `pawkit-v2-data-model` (deprecated)
- `pawkit-v2-sync` (deprecated)
- `pawkit-v2-safety` (superseded by Convex safety rules above)

Other skills present (use if task matches):
- `pawkit-tanstack-convex` (main stack guide; read first for app-wide changes)
- `pawkit-ai-integration`
- `pawkit-v2-kit-ai`
- `pawkit-v2-integrations`

## Workflow Defaults

- For significant changes: check docs -> check relevant skill -> update schema/functions -> update routes/UI.
- For debugging: check Convex dashboard/logs, then browser console, then docs.
