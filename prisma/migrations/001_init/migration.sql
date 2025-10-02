-- CreateTable
CREATE TABLE "Card" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "url" TEXT NOT NULL,
    "title" TEXT,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "tags" TEXT,
    "collections" TEXT,
    "domain" TEXT,
    "image" TEXT,
    "description" TEXT,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Collection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "parentId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "Collection_slug_key" ON "Collection"("slug");

-- Trigger to update updatedAt columns
CREATE TRIGGER IF NOT EXISTS update_card_updatedAt
AFTER UPDATE ON "Card"
FOR EACH ROW
BEGIN
  UPDATE "Card" SET "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = NEW."id";
END;

CREATE TRIGGER IF NOT EXISTS update_collection_updatedAt
AFTER UPDATE ON "Collection"
FOR EACH ROW
BEGIN
  UPDATE "Collection" SET "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = NEW."id";
END;
