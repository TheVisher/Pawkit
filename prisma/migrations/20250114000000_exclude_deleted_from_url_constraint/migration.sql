-- Fix unique constraint to exclude deleted cards
-- Problem: Current constraint prevents adding a URL that was previously deleted
-- Solution: Add "deleted = false" to the WHERE clause of the partial index

-- Drop existing partial unique index (only applies to URL cards)
DROP INDEX IF EXISTS "Card_userId_url_key";

-- Recreate with deleted = false filter
-- This allows users to re-add URLs that were previously deleted
CREATE UNIQUE INDEX "Card_userId_url_key"
ON "Card"("userId", "url")
WHERE "type" = 'url' AND "deleted" = false;
