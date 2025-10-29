-- Migration: Convert Den from boolean flag to a private collection
-- This migration:
-- 1. Creates "The Den" collection for users who have cards with inDen=true
-- 2. Adds 'the-den' to the collections array for all cards with inDen=true
-- 3. Sets inDen=false on those cards
--
-- This migration is idempotent and safe to run multiple times.

-- Step 1: Create "The Den" collection for each user who has cards with inDen=true
-- Only create if the user doesn't already have a 'the-den' collection
INSERT INTO "Collection" (id, "userId", name, slug, "isPrivate", "createdAt", "updatedAt")
SELECT
  'den_' || "userId" as id,
  "userId",
  'The Den' as name,
  'the-den' as slug,
  true as "isPrivate",
  NOW() as "createdAt",
  NOW() as "updatedAt"
FROM (
  SELECT DISTINCT "userId"
  FROM "Card"
  WHERE "inDen" = true
    AND deleted = false
) AS users_with_den_cards
WHERE NOT EXISTS (
  SELECT 1
  FROM "Collection"
  WHERE "Collection"."userId" = users_with_den_cards."userId"
    AND "Collection".slug = 'the-den'
);

-- Step 2: Update cards with inDen=true to add 'the-den' to their collections
-- This handles various cases:
-- - collections is NULL -> set to '["the-den"]'
-- - collections is empty string -> set to '["the-den"]'
-- - collections is empty array '[]' -> set to '["the-den"]'
-- - collections already contains 'the-den' -> no change (idempotent)
-- - collections has other items -> append 'the-den'

UPDATE "Card"
SET
  collections = CASE
    -- If collections is NULL, empty string, or empty array, set to ["the-den"]
    WHEN collections IS NULL OR collections = '' OR collections = '[]' THEN '["the-den"]'
    -- If collections already contains 'the-den', no change (idempotent)
    WHEN collections::jsonb ? 'the-den' THEN collections
    -- Otherwise, append 'the-den' to the existing array
    ELSE jsonb_insert(
      collections::jsonb,
      '{-1}',
      '"the-den"'::jsonb
    )::text
  END,
  "updatedAt" = NOW()
WHERE "inDen" = true
  AND deleted = false;

-- Step 3: Set inDen=false on all cards that were in the Den
-- This runs after Step 2, so all cards should now have 'the-den' in collections
UPDATE "Card"
SET
  "inDen" = false,
  "updatedAt" = NOW()
WHERE "inDen" = true
  AND deleted = false;
