-- CreateTable
CREATE TABLE "Card" (
    "id" TEXT NOT NULL,
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
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Card_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Collection" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "parentId" TEXT,
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Collection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Collection_slug_key" ON "Collection"("slug");

