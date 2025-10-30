-- Fix: Remove full unique constraint and ensure only partial index exists
-- The issue is that notes are hitting a unique constraint when they shouldn't
-- Only URL-type cards should have unique (userId, url) constraint

-- Drop any existing full unique constraints on (userId, url)
-- This will drop both regular constraints and non-partial unique indexes
DO $$ 
BEGIN
    -- Drop constraint if it exists
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'Card_userId_url_key' 
        AND contype = 'u'
    ) THEN
        ALTER TABLE "Card" DROP CONSTRAINT "Card_userId_url_key";
        RAISE NOTICE 'Dropped unique constraint Card_userId_url_key';
    END IF;
    
    -- Drop non-partial unique index if it exists
    IF EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'Card_userId_url_key' 
        AND indexdef NOT LIKE '%WHERE%'
    ) THEN
        DROP INDEX "Card_userId_url_key";
        RAISE NOTICE 'Dropped non-partial unique index Card_userId_url_key';
    END IF;
END $$;

-- Ensure the partial unique index exists (only for URL-type cards)
-- This will be a no-op if it already exists with the correct definition
CREATE UNIQUE INDEX IF NOT EXISTS "Card_userId_url_key"
ON "Card"("userId", "url")
WHERE "type" = 'url';
