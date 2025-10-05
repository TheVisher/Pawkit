-- AlterTable
ALTER TABLE "User" ADD COLUMN "extensionToken" TEXT,
ADD COLUMN "extensionTokenCreatedAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "User_extensionToken_key" ON "User"("extensionToken");
