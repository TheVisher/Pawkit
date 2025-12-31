# Sync & Realtime Notes

## Post-Migration Grants (IMPORTANT)

After running any Prisma migration (`prisma migrate` or `prisma db push`), you MUST run the following SQL in Supabase SQL Editor:

```sql
GRANT SELECT ON "public"."Card" TO authenticated;
GRANT SELECT ON "public"."Card" TO anon;
```

**Why?** Prisma migrations wipe out Postgres grants. Without these, Supabase Realtime will return 401 Unauthorized errors and card sync between desktop/web will break.

The grants are also saved in `/prisma/post-migration-grants.sql`.

## Supabase Realtime Setup

The Card table requires these settings for realtime sync:

1. **Realtime enabled on Card table:**
   ```sql
   ALTER PUBLICATION supabase_realtime ADD TABLE "Card";
   ```

2. **REPLICA IDENTITY for full payload:**
   ```sql
   ALTER TABLE "Card" REPLICA IDENTITY FULL;
   ```

3. **RLS policy for authenticated users:**
   ```sql
   CREATE POLICY "Users can read own workspace cards via realtime"
   ON "public"."Card"
   FOR SELECT
   TO authenticated
   USING ("workspaceId" IN (
     SELECT id FROM "Workspace" WHERE "userId" = (auth.uid())::text
   ));
   ```

## How Sync Works

- **Desktop → Server:** Cards sync via sync-queue.ts pushing to API
- **Server → Web:** Supabase Realtime postgres_changes subscription
- **Conflicts:** Version-based detection, creates duplicate cards with `conflict` tag
