---
name: pawkit-database
description: Supabase database schema, RLS policies, constraints, and backend audit patterns
---

# Pawkit Database & Supabase Backend

**Purpose**: Document database schema, RLS policies, constraints, and how to audit backend health

**Last Audit**: December 13, 2025

**Project ID**: `jaasnsfhfrmbqnnghogt`
**Region**: `us-west-1`
**Organization**: Pawkit (Free plan)

---

## DATABASE SCHEMA

### Core Tables

| Table | Rows (Dec 2025) | Purpose |
|-------|-----------------|---------|
| Card | ~765 | Bookmarks, notes, files |
| Collection | ~85 | Pawkits (folders) |
| User | ~61 | User profiles |
| UserSettings | ~57 | User preferences |
| UserViewSettings | ~31 | View/layout preferences |
| CalendarEvent | ~46 | Calendar events |
| Todo | ~4 | Task items |
| NoteFolder | ~2 | Note organization (new feature) |
| CollectionNote | 0 | Many-to-many notes↔pawkits (new feature) |
| kit_usage | ~17 | Kit AI usage tracking |
| DeviceSession | ~10 | Multi-device sessions |

### Key Relationships

```
User (1) ──────────────────────── (N) Card
  │                                    │
  │                                    │ collectionId
  │                                    ▼
  └──────────────────────────── (N) Collection
                                       │
                                       │ (junction table)
                                       ▼
                               CollectionNote ◄──── Card (notes in multiple pawkits)
```

---

## RLS POLICIES

### Status: All Tables Protected ✅

**Audit completed December 13, 2025** - All 11 public tables have RLS enabled with proper policies.

### Policy Pattern

All policies use the optimized `(select auth.uid())` pattern for performance:

```sql
-- ✅ CORRECT: Subquery pattern (evaluated once)
USING (((select auth.uid()))::text = "userId")

-- ❌ WRONG: Function call pattern (evaluated per row)
USING ((auth.uid())::text = "userId")
```

### Tables with Direct userId

These tables have a `userId` column and use simple ownership policies:

- **Card** - SELECT, INSERT, UPDATE, DELETE
- **Collection** - SELECT, INSERT, UPDATE, DELETE
- **User** - SELECT, INSERT, UPDATE, DELETE (own profile only)
- **UserSettings** - SELECT, INSERT, UPDATE, DELETE
- **UserViewSettings** - SELECT, INSERT, UPDATE, DELETE
- **CalendarEvent** - SELECT, INSERT, UPDATE, DELETE
- **Todo** - SELECT, INSERT, UPDATE, DELETE
- **NoteFolder** - SELECT, INSERT, UPDATE, DELETE
- **kit_usage** - SELECT, INSERT, UPDATE, DELETE
- **DeviceSession** - SELECT, INSERT, UPDATE, DELETE

### Tables with Indirect Access

**CollectionNote** (junction table) - Access through Collection ownership:

```sql
-- Users can only access CollectionNote rows where they own the Collection
CREATE POLICY "Users can view their collection notes" ON public."CollectionNote"
  FOR SELECT TO public
  USING (
    EXISTS (
      SELECT 1 FROM public."Collection" c 
      WHERE c.id = "collectionId" 
      AND c."userId" = ((select auth.uid()))::text
    )
  );
```

---

## CONSTRAINTS & INDEXES

### Unique Constraints

| Table | Constraint | Scope | Notes |
|-------|-----------|-------|-------|
| Card | `Card_userId_url_key` | Per-user | Only for `type='url'`, excludes notes |
| Collection | `Collection_userId_slug_key` | Per-user | Fixed Dec 2025 (was global) |
| CollectionNote | `CollectionNote_collectionId_cardId_key` | Per-collection | Prevents duplicate links |

### Important: Collection Slug is Per-User

```sql
-- ✅ CURRENT: Different users can have same slug
CREATE UNIQUE INDEX "Collection_userId_slug_key" 
ON public."Collection" ("userId", slug);

-- ❌ OLD (BROKEN): Global uniqueness blocked all users
-- CREATE UNIQUE INDEX "Collection_slug_key" ON public."Collection" (slug);
```

### Performance Indexes

```sql
-- Card indexes
"Card_userId_idx" ON "Card"("userId")
"Card_userId_deleted_idx" ON "Card"("userId", deleted)
"Card_collectionId_idx" ON "Card"("collectionId")
"Card_type_idx" ON "Card"(type)

-- Collection indexes
"Collection_userId_idx" ON "Collection"("userId")
"Collection_userId_deleted_idx" ON "Collection"("userId", deleted)
"Collection_userId_isPrivate_idx" ON "Collection"("userId", "isPrivate")
```

---

## SUPABASE MIGRATIONS

### December 2025 Migrations

All tracked in `supabase_migrations.schema_migrations`:

1. **enable_rls_kit_usage** - Added RLS to kit_usage table
2. **security_and_performance_fixes** - Hardened function search_path, added indexes
3. **optimize_rls_card_policies** - Converted to `(select auth.uid())` pattern
4. **optimize_rls_collection_policies**
5. **optimize_rls_user_policies**
6. **optimize_rls_calendar_event_policies**
7. **optimize_rls_todo_policies**
8. **optimize_rls_user_settings_policies**
9. **optimize_rls_user_view_settings_policies**
10. **optimize_rls_device_session_policies**
11. **optimize_rls_kit_usage_policies**
12. **fix_collection_slug_per_user** - Changed slug uniqueness to per-user
13. **enable_rls_note_folder** - RLS for NoteFolder table
14. **enable_rls_collection_note** - RLS for CollectionNote junction table

### Viewing Migrations

```sql
SELECT version, name, created_by, statements
FROM supabase_migrations.schema_migrations
ORDER BY version DESC;
```

---

## BACKEND AUDIT CHECKLIST

### Quick Health Check

Run these to verify backend health:

```sql
-- 1. Check RLS is enabled on all public tables
SELECT 
  relname as table_name,
  relrowsecurity as rls_enabled
FROM pg_class
WHERE relnamespace = 'public'::regnamespace
  AND relkind = 'r'
  AND relname NOT LIKE '_prisma%'
ORDER BY relname;

-- 2. Check for tables missing policies
SELECT tablename 
FROM pg_tables 
WHERE schemaname = 'public'
  AND tablename NOT IN (
    SELECT DISTINCT tablename FROM pg_policies WHERE schemaname = 'public'
  )
  AND tablename NOT LIKE '_prisma%';

-- 3. Check dead rows (vacuum needed?)
SELECT 
  relname as table_name,
  n_live_tup as live_rows,
  n_dead_tup as dead_rows,
  CASE WHEN n_live_tup > 0 
    THEN round(100.0 * n_dead_tup / n_live_tup, 2) 
    ELSE 0 
  END as dead_pct
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY n_dead_tup DESC;

-- 4. Check for orphaned records
SELECT COUNT(*) as orphaned_cards 
FROM "Card" c 
WHERE NOT EXISTS (SELECT 1 FROM "User" u WHERE u.id = c."userId");
```

### Using Supabase Advisors

```sql
-- Security advisors (via Supabase MCP)
supabase:get_advisors(project_id, type='security')

-- Performance advisors
supabase:get_advisors(project_id, type='performance')
```

### Log Analysis

Check logs for errors:

```sql
-- Postgres logs (look for ERROR severity)
supabase:get_logs(project_id, service='postgres')

-- Auth logs
supabase:get_logs(project_id, service='auth')

-- API logs
supabase:get_logs(project_id, service='api')
```

---

## COMMON ISSUES & FIXES

### Duplicate Key Errors

**Symptom**: `duplicate key value violates unique constraint "Collection_slug_key"`

**Cause**: Global uniqueness on slug (fixed Dec 2025)

**Fix**: Ensure constraint is per-user:
```sql
DROP INDEX IF EXISTS "Collection_slug_key";
CREATE UNIQUE INDEX "Collection_userId_slug_key" ON public."Collection" ("userId", slug);
```

### RLS Policy Blocking Legitimate Access

**Symptom**: Users can't see their own data

**Debug**:
```sql
-- Check what policies exist
SELECT * FROM pg_policies WHERE tablename = 'Card';

-- Test as specific user
SET request.jwt.claim.sub = 'user-uuid-here';
SELECT * FROM "Card" LIMIT 5;
```

### Slow Queries

**Symptom**: Library/dashboard loads slowly

**Check**:
```sql
-- Find missing indexes
SELECT 
  schemaname, tablename, attname, n_distinct, correlation
FROM pg_stats
WHERE schemaname = 'public'
ORDER BY n_distinct DESC;

-- Check query plans
EXPLAIN ANALYZE SELECT * FROM "Card" WHERE "userId" = 'xxx' AND deleted = false;
```

---

## APPLYING NEW MIGRATIONS

### Via Supabase MCP

```typescript
// Use supabase:apply_migration tool
{
  name: "descriptive_migration_name",
  project_id: "jaasnsfhfrmbqnnghogt",
  query: `
    -- Your SQL here
    ALTER TABLE ...
  `
}
```

### Best Practices

1. **Always check current state first** - Run SELECT queries before ALTER
2. **Use IF EXISTS / IF NOT EXISTS** - Make migrations idempotent
3. **Test on read before write** - Verify data won't be lost
4. **Name migrations descriptively** - `fix_collection_slug_per_user` not `update_1`

---

## DANGER ZONE ⚠️

### Never Run Without Explicit User Approval

- `DROP TABLE`
- `DELETE FROM` (without WHERE)
- `TRUNCATE`
- `DROP INDEX` on primary keys
- Anything that deletes migrations history

### Always Backup First

Before major schema changes, verify backup exists:
```sql
-- Check recent backups in Supabase dashboard
-- Or use pg_dump locally
```

---

**Last Updated**: December 13, 2025
**Maintained By**: Claude sessions via Supabase MCP
