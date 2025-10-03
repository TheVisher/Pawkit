-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Card" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL DEFAULT 'url',
    "url" TEXT NOT NULL,
    "title" TEXT,
    "notes" TEXT,
    "content" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "tags" TEXT,
    "collections" TEXT,
    "domain" TEXT,
    "image" TEXT,
    "description" TEXT,
    "metadata" TEXT,
    "articleContent" TEXT,
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Card" ("articleContent", "collections", "createdAt", "deleted", "deletedAt", "description", "domain", "id", "image", "metadata", "notes", "pinned", "status", "tags", "title", "updatedAt", "url") SELECT "articleContent", "collections", "createdAt", "deleted", "deletedAt", "description", "domain", "id", "image", "metadata", "notes", "pinned", "status", "tags", "title", "updatedAt", "url" FROM "Card";
DROP TABLE "Card";
ALTER TABLE "new_Card" RENAME TO "Card";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
