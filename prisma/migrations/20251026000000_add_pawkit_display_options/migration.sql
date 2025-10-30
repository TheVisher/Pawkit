-- Add hidePreview and useCoverAsBackground fields to Collection table
ALTER TABLE "Collection" ADD COLUMN IF NOT EXISTS "hidePreview" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Collection" ADD COLUMN IF NOT EXISTS "useCoverAsBackground" BOOLEAN NOT NULL DEFAULT false;
