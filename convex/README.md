# Convex Backend

This directory contains Pawkit's Convex schema and functions (queries, mutations, actions, and HTTP routes).

## Common Commands

Run Convex locally in a separate terminal:

```bash
npx convex dev
```

Deploy changes:

```bash
npx convex deploy
```

Open the Convex dashboard:

```bash
npx convex dashboard
```

## Structure

- `schema.ts` defines the database schema.
- Files in this folder export queries, mutations, and actions.
- `_generated/` is auto-generated. Do not edit it directly.
