# Database Migration Instructions

## Purpose
This migration adds `hidePreview` and `useCoverAsBackground` columns to the `Collection` table to support the new pawkit display customization features.

## Status
- ✅ Code changes complete
- ✅ Prisma schema updated
- ✅ Prisma client generated
- ⏳ **Database columns not yet created** (migration pending)

## Why the Migration Didn't Auto-Apply
The Supabase pooler (port 6543) doesn't support the DDL operations that Prisma migrations require. The migration commands hang indefinitely when trying to connect through the pooler.

## How to Apply the Migration

### Option 1: Using Supabase Dashboard (Easiest)
1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Run this SQL:

```sql
ALTER TABLE "Collection" ADD COLUMN IF NOT EXISTS "hidePreview" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Collection" ADD COLUMN IF NOT EXISTS "useCoverAsBackground" BOOLEAN NOT NULL DEFAULT false;
```

### Option 2: Using Direct Database Connection
If you have `psql` installed:

```bash
# Use the direct connection (port 5432) instead of pooler (port 6543)
psql "postgresql://postgres.jaasnsfhfrmbqnnghogt:GB8x8yIDLQBvBiQp@aws-1-us-west-1.pooler.supabase.com:5432/postgres" <<SQL
ALTER TABLE "Collection" ADD COLUMN IF NOT EXISTS "hidePreview" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Collection" ADD COLUMN IF NOT EXISTS "useCoverAsBackground" BOOLEAN NOT NULL DEFAULT false;
SQL
```

### Option 3: Wait for Automatic Migration
The migration file exists at:
`prisma/migrations/20251026000000_add_pawkit_display_options/migration.sql`

Once Supabase improves pooler support for DDL, you can run:
```bash
npx prisma migrate deploy
```

## Current Behavior
**Features work with optimistic UI updates:**
- ✅ Hiding/showing preview works visually
- ✅ Cover as background works visually
- ✅ All settings toggleable via 3-dot menu
- ⚠️ Settings don't persist on page refresh (revert to defaults)
- ⚠️ Server logs show Prisma validation errors

**After applying migration:**
- ✅ All settings persist to database
- ✅ Server errors disappear
- ✅ Settings survive page refreshes

## Verification
After applying the migration, refresh your Pawkits page and toggle a setting. Refresh again - the setting should persist.
