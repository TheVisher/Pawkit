# Quick Start: Database Migration Required

## ⚠️ IMPORTANT: This Branch Requires Database Migration

**Branch:** `never-opened-tracking-rediscover`

**Status:** ❌ Production will fail without migration

**Error you'll see:**
```
The column `Card.lastOpenedAt` does not exist in the current database.
```

---

## Quick Deploy (Production)

### Step 1: Apply Migration

```bash
# Connect to production database
export DATABASE_URL="your-production-supabase-url"

# Apply migration (safe, idempotent)
npx prisma migrate deploy
```

**Expected output:**
```
✅ 1 migration found in prisma/migrations
✅ The following migration have been applied:

migrations/
  └─ 20251106000000_add_card_tracking_fields/
       └─ migration.sql

All migrations have been successfully applied.
```

### Step 2: Verify Columns Exist

**Option A: Using Prisma Studio**
```bash
npx prisma studio
```
Open the `Card` model and verify these columns exist:
- `lastOpenedAt` (DateTime?)
- `openCount` (Int)
- `lastAccessType` (String?)

**Option B: Using Supabase SQL Editor**
```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'Card'
AND column_name IN ('lastOpenedAt', 'openCount', 'lastAccessType');
```

### Step 3: Deploy to Vercel

Merge and deploy the branch. The app will now work correctly.

---

## What This Migration Does

**Adds 3 columns to `Card` table:**
1. `lastOpenedAt` - When card was last opened
2. `openCount` - How many times card was opened
3. `lastAccessType` - How it was accessed ('modal', 'external', 'rediscover')

**Adds 1 index:**
- `(userId, lastOpenedAt)` - For efficient "never opened" filtering

**Migration file:**
```
prisma/migrations/20251106000000_add_card_tracking_fields/migration.sql
```

---

## Features Enabled by This Migration

✅ **Never Opened Tracking** - Track which bookmarks have never been opened
✅ **Daily Dig Widget** - Shows random never-opened bookmark on home page
✅ **Rediscover Mode** - Filter library by "Never Opened" status
✅ **Badge Counter** - Shows count of never-opened bookmarks in sidebar
✅ **Open Statistics** - Track how many times each card is opened

---

## Safety

- ✅ **Non-destructive** - Only adds columns, doesn't modify existing data
- ✅ **No downtime** - ALTER TABLE is fast, doesn't lock table
- ✅ **Idempotent** - Safe to run multiple times
- ✅ **Reversible** - Can rollback if needed (see MIGRATION_GUIDE.md)
- ✅ **Tested** - Verified on preview environments

---

## If Something Goes Wrong

### Rollback (Emergency)

```sql
-- Run in Supabase SQL Editor
ALTER TABLE "Card"
  DROP COLUMN "lastOpenedAt",
  DROP COLUMN "openCount",
  DROP COLUMN "lastAccessType";

DROP INDEX "Card_userId_lastOpenedAt_idx";
```

Then revert the code deployment.

---

## Questions?

See detailed guide: `MIGRATION_GUIDE.md`

**Key points:**
- ✅ Use `npx prisma migrate deploy` for production
- ❌ Don't use `npx prisma db push` for production
- ✅ Apply migration before deploying code
- ✅ Test in preview environment first
