-- CreateTable
CREATE TABLE "UserViewSettings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "view" TEXT NOT NULL,
    "layout" TEXT NOT NULL DEFAULT 'grid',
    "cardSize" INTEGER NOT NULL DEFAULT 3,
    "showTitles" BOOLEAN NOT NULL DEFAULT true,
    "showUrls" BOOLEAN NOT NULL DEFAULT true,
    "showTags" BOOLEAN NOT NULL DEFAULT true,
    "cardPadding" INTEGER NOT NULL DEFAULT 2,
    "sortBy" TEXT NOT NULL DEFAULT 'createdAt',
    "sortOrder" TEXT NOT NULL DEFAULT 'desc',
    "viewSpecific" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserViewSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserViewSettings_userId_idx" ON "UserViewSettings"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserViewSettings_userId_view_key" ON "UserViewSettings"("userId", "view");

-- AddForeignKey
ALTER TABLE "UserViewSettings" ADD CONSTRAINT "UserViewSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

