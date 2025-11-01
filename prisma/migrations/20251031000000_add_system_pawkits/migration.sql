-- Add isSystem field to Collection table for system pawkits (To Categorize, etc)
ALTER TABLE "Collection" ADD COLUMN IF NOT EXISTS "isSystem" BOOLEAN NOT NULL DEFAULT false;
