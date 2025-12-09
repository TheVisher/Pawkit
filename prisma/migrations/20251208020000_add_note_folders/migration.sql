-- Create NoteFolder table for hierarchical note organization
CREATE TABLE IF NOT EXISTS "NoteFolder" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "parentId" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NoteFolder_pkey" PRIMARY KEY ("id")
);

-- Create CollectionNote junction table for notes in Pawkits
CREATE TABLE IF NOT EXISTS "CollectionNote" (
    "id" TEXT NOT NULL,
    "collectionId" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CollectionNote_pkey" PRIMARY KEY ("id")
);

-- Add noteFolderId column to Card table
ALTER TABLE "Card" ADD COLUMN IF NOT EXISTS "noteFolderId" TEXT;

-- Create indexes for NoteFolder
CREATE INDEX IF NOT EXISTS "NoteFolder_userId_idx" ON "NoteFolder"("userId");
CREATE INDEX IF NOT EXISTS "NoteFolder_userId_parentId_idx" ON "NoteFolder"("userId", "parentId");

-- Create indexes for CollectionNote
CREATE INDEX IF NOT EXISTS "CollectionNote_collectionId_idx" ON "CollectionNote"("collectionId");
CREATE INDEX IF NOT EXISTS "CollectionNote_cardId_idx" ON "CollectionNote"("cardId");

-- Create unique constraint for CollectionNote
ALTER TABLE "CollectionNote" ADD CONSTRAINT "CollectionNote_collectionId_cardId_key" UNIQUE ("collectionId", "cardId");

-- Create index for Card.noteFolderId
CREATE INDEX IF NOT EXISTS "Card_userId_noteFolderId_idx" ON "Card"("userId", "noteFolderId");

-- Add foreign key constraints
ALTER TABLE "NoteFolder" ADD CONSTRAINT "NoteFolder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "NoteFolder" ADD CONSTRAINT "NoteFolder_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "NoteFolder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Card" ADD CONSTRAINT "Card_noteFolderId_fkey" FOREIGN KEY ("noteFolderId") REFERENCES "NoteFolder"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CollectionNote" ADD CONSTRAINT "CollectionNote_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "Collection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CollectionNote" ADD CONSTRAINT "CollectionNote_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card"("id") ON DELETE CASCADE ON UPDATE CASCADE;
