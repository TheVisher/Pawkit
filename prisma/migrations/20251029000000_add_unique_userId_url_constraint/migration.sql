-- Data Migration: Remove duplicate cards before adding unique constraint
-- Keep the most recently updated card for each (userId, url) pair
DELETE FROM "Card" a
USING "Card" b
WHERE a."userId" = b."userId"
  AND a."url" = b."url"
  AND a."id" < b."id"  -- Keep the card with the higher ID (more recent)
  AND a."id" != b."id";  -- Don't delete the same card

-- CreateIndex
-- Add unique constraint to prevent duplicate URLs per user
-- This prevents race condition duplicates at the database level
CREATE UNIQUE INDEX "Card_userId_url_key" ON "Card"("userId", "url");
