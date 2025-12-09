-- Add sidebar visibility settings
ALTER TABLE "UserSettings" ADD COLUMN IF NOT EXISTS "showSyncStatusInSidebar" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "UserSettings" ADD COLUMN IF NOT EXISTS "showKeyboardShortcutsInSidebar" BOOLEAN NOT NULL DEFAULT true;

-- Add default view preferences
ALTER TABLE "UserSettings" ADD COLUMN IF NOT EXISTS "defaultView" TEXT NOT NULL DEFAULT 'masonry';
ALTER TABLE "UserSettings" ADD COLUMN IF NOT EXISTS "defaultSort" TEXT NOT NULL DEFAULT 'dateAdded';
