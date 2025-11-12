# Database Migration Guide: Never Opened Tracking

## Overview

This branch (`never-opened-tracking-rediscover`) introduces database schema changes to track card open statistics. **The production deployment will fail without applying this migration first.**

## Migration Details

**Migration Name:** `20251106000000_add_card_tracking_fields`

**Schema Changes:**
- Adds `lastOpenedAt` (DateTime, nullable) - Timestamp of last card open
- Adds `openCount` (Int, default: 0) - Total number of times card was opened
- Adds `lastAccessType` (String, nullable) - How card was accessed: 'modal', 'external', or 'rediscover'
- Adds index on `(userId, lastOpenedAt)` for efficient never-opened filtering

**Migration File Location:**
```
prisma/migrations/20251106000000_add_card_tracking_fields/migration.sql
```

## Why This Is Needed

The `/api/cards/[id]/track-open` endpoint will return 500 errors with this message:
```
The column `Card.lastOpenedAt` does not exist in the current database.
```

This occurs because:
1. Development used `npx prisma db push` which doesn't generate migrations
2. Production uses `npx prisma migrate deploy` which requires migration files
3. The migration file exists but hasn't been applied to production database

## Deployment Steps for Production

### Option 1: Using Prisma Migrate Deploy (RECOMMENDED)

This is the safest method for production deployments. It applies only pending migrations and maintains migration history.

**Steps:**

1. **Verify Migration Files**
   ```bash
   # Ensure the migration file exists
   ls -la prisma/migrations/20251106000000_add_card_tracking_fields/

   # Should show: migration.sql
   ```

2. **Set Production Database URL**
   ```bash
   # Set your production Supabase database URL
   export DATABASE_URL="postgresql://postgres:[password]@[host]:[port]/postgres"
   ```

3. **Apply Migration to Production**
   ```bash
   npx prisma migrate deploy
   ```

   This command:
   - ✅ Only applies pending migrations (safe for production)
   - ✅ Records migration in `_prisma_migrations` table
   - ✅ Skips migrations that were already applied
   - ✅ Transactional (rolls back on error)
   - ✅ Can be run multiple times safely (idempotent)

4. **Verify Migration Applied**
   ```bash
   # Check that the columns exist
   npx prisma db execute --stdin <<SQL
   SELECT column_name, data_type, is_nullable, column_default
   FROM information_schema.columns
   WHERE table_name = 'Card'
   AND column_name IN ('lastOpenedAt', 'openCount', 'lastAccessType')
   ORDER BY column_name;
   SQL
   ```

   Expected output:
   ```
   lastAccessType  | text                     | YES | NULL
   lastOpenedAt    | timestamp with time zone | YES | NULL
   openCount       | integer                  | NO  | 0
   ```

5. **Deploy Application Code**
   - Merge/deploy the branch to Vercel
   - The app will now work correctly with the new schema

### Option 2: Using Prisma DB Push (NOT RECOMMENDED for Production)

**⚠️ WARNING:** Only use this if you understand the risks.

```bash
npx prisma db push --skip-generate
```

**Risks:**
- ❌ No migration history recorded
- ❌ Cannot roll back easily
- ❌ May drop and recreate tables if schema drift detected
- ❌ Not suitable for production databases with data

**When to use:** Only for development/preview environments.

## Vercel Deployment Configuration

### Automatic Migration on Deploy

To apply migrations automatically during Vercel deployment, ensure your build script includes:

**In `package.json`:**
```json
{
  "scripts": {
    "vercel-build": "prisma migrate deploy && next build"
  }
}
```

**Or in `scripts/vercel-build.js`:**
```javascript
// Already configured in this project
const { execSync } = require('child_process');

// Apply migrations first
execSync('npx prisma migrate deploy', { stdio: 'inherit' });

// Then build
execSync('next build', { stdio: 'inherit' });
```

### Environment Variables Required

Ensure these are set in Vercel:
- `DATABASE_URL` - Your Supabase connection string
- `DIRECT_URL` - Direct connection string (if using connection pooler)

## Testing the Migration

### 1. Test in Preview Environment First

```bash
# Set preview database URL
export DATABASE_URL="your-preview-db-url"

# Apply migration
npx prisma migrate deploy

# Verify
npx prisma studio
```

### 2. Test the API Endpoint

```bash
# After migration, test the track-open endpoint
curl -X POST https://your-preview.vercel.app/api/cards/[card-id]/track-open \
  -H "Content-Type: application/json" \
  -H "Cookie: your-auth-cookie" \
  -d '{"accessType": "modal"}'
```

Expected response: `200 OK`

## Rollback Plan

If you need to rollback this migration:

### Option 1: Revert Migration (Clean)

```bash
# This creates a new migration that removes the columns
npx prisma migrate diff \
  --from-schema-datamodel prisma/schema.prisma \
  --to-schema-datasource prisma/schema.prisma \
  --script > rollback.sql

# Review rollback.sql, then apply:
npx prisma db execute --file rollback.sql
```

### Option 2: Manual Rollback (Quick)

```sql
-- Run this SQL directly in Supabase SQL Editor
ALTER TABLE "Card"
  DROP COLUMN IF EXISTS "lastOpenedAt",
  DROP COLUMN IF EXISTS "openCount",
  DROP COLUMN IF EXISTS "lastAccessType";

DROP INDEX IF EXISTS "Card_userId_lastOpenedAt_idx";

-- Delete migration record
DELETE FROM "_prisma_migrations"
WHERE migration_name = '20251106000000_add_card_tracking_fields';
```

Then revert the code changes and redeploy.

## Common Issues and Solutions

### Issue 1: "Migration has already been applied"

**Solution:** This is normal. The migration is idempotent and safe to run multiple times.

### Issue 2: "Database connection failed"

**Solution:**
- Verify `DATABASE_URL` is correct
- Check Supabase database is online
- Ensure IP allowlist includes Vercel IPs (if using IP restrictions)

### Issue 3: "Column already exists"

**Solution:**
```bash
# Check migration status
npx prisma migrate status

# If migration shows as applied but columns missing, try:
npx prisma migrate resolve --applied 20251106000000_add_card_tracking_fields
```

### Issue 4: "Transaction failed"

**Solution:**
- Check database permissions (user needs ALTER TABLE rights)
- Ensure no long-running queries are blocking schema changes
- Try during low-traffic period

## Verification Checklist

Before marking this as complete, verify:

- [ ] Migration file exists: `prisma/migrations/20251106000000_add_card_tracking_fields/migration.sql`
- [ ] Schema has three new fields: `lastOpenedAt`, `openCount`, `lastAccessType`
- [ ] Index created: `Card_userId_lastOpenedAt_idx`
- [ ] Migration applied to production: `npx prisma migrate deploy` succeeded
- [ ] Columns visible in Supabase SQL Editor
- [ ] API endpoint `/api/cards/[id]/track-open` returns 200 (not 500)
- [ ] Daily Dig widget shows on home page
- [ ] Rediscover mode shows "Never Opened" filter
- [ ] Badge counter appears on Rediscover sidebar item

## Support

If you encounter issues:

1. **Check Prisma logs:**
   ```bash
   DEBUG="*" npx prisma migrate deploy
   ```

2. **Check Vercel deployment logs:**
   - Look for "Running prisma migrate deploy"
   - Check for any error messages

3. **Verify database state:**
   ```bash
   npx prisma migrate status
   ```

4. **Manual inspection:**
   - Open Supabase SQL Editor
   - Run: `\d "Card"` to describe table structure
   - Verify columns exist

## Timeline

- **Created:** 2025-11-06
- **Status:** Ready for production deployment
- **Risk Level:** Low (adds columns only, no data changes)
- **Estimated Downtime:** None (columns added with ALTER TABLE)
- **Rollback Time:** < 1 minute
