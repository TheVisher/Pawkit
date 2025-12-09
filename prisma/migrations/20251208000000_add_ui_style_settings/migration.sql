-- Add uiStyle and surfaceTint columns to UserSettings
ALTER TABLE "UserSettings" ADD COLUMN IF NOT EXISTS "uiStyle" TEXT NOT NULL DEFAULT 'modern';
ALTER TABLE "UserSettings" ADD COLUMN IF NOT EXISTS "surfaceTint" TEXT NOT NULL DEFAULT 'none';
