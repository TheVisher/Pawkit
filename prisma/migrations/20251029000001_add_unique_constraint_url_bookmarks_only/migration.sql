-- Add PARTIAL unique constraint to prevent duplicate URL bookmarks
-- This ONLY applies to cards with type = 'url', NOT to notes
-- Notes can have duplicate/empty URLs without any issues

-- First, remove any duplicate URL bookmarks (type = 'url' only)
-- Keep the most recent bookmark for each (userId, url) pair
DELETE FROM "Card" a
USING "Card" b
WHERE a."userId" = b."userId"
  AND a."url" = b."url"
  AND a."type" = 'url'  -- ONLY delete duplicate URL bookmarks
  AND b."type" = 'url'  -- ONLY compare with other URL bookmarks
  AND a."id" < b."id"   -- Keep the more recent one (higher ID)
  AND a."id" != b."id"; -- Don't delete the same card

-- Create PARTIAL unique index - only applies to URL bookmarks
-- Notes (md-note, text-note) are completely excluded from this constraint
CREATE UNIQUE INDEX "Card_userId_url_key"
ON "Card"("userId", "url")
WHERE "type" = 'url';
