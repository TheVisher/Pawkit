-- CreateIndex
-- Add unique constraint to prevent duplicate URLs per user
-- This prevents race condition duplicates at the database level
CREATE UNIQUE INDEX "Card_userId_url_key" ON "Card"("userId", "url");
