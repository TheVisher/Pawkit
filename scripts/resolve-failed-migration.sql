-- Resolve failed migration in production database
-- This marks the failed migration as rolled back so new migrations can proceed

-- Check current migration status
SELECT migration_name, finished_at, started_at, applied_steps_count
FROM "_prisma_migrations"
WHERE migration_name = '20251015135138_add_user_view_settings';

-- Mark the failed migration as rolled back
UPDATE "_prisma_migrations"
SET rolled_back_at = NOW()
WHERE migration_name = '20251015135138_add_user_view_settings'
  AND rolled_back_at IS NULL;

-- Verify it's marked as rolled back
SELECT migration_name, finished_at, rolled_back_at
FROM "_prisma_migrations"
WHERE migration_name = '20251015135138_add_user_view_settings';
