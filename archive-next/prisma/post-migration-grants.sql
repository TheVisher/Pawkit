-- Post-Migration Grants for Supabase Realtime
-- Run this after any Prisma migration as Prisma may wipe out these grants
-- See: https://supabase.com/partners/integrations/prisma

-- Grant SELECT to authenticated users for Realtime postgres_changes
GRANT SELECT ON "public"."Card" TO authenticated;
GRANT SELECT ON "public"."Card" TO anon;

-- If you add more tables that need Realtime, add grants here:
-- GRANT SELECT ON "public"."TableName" TO authenticated;
-- GRANT SELECT ON "public"."TableName" TO anon;
