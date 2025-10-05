-- AlterTable
ALTER TABLE "Card" ADD COLUMN     "encryptedContent" TEXT,
ADD COLUMN     "inDen" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "denEncryptionEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "denPasswordHash" TEXT,
ADD COLUMN     "denSyncEnabled" BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE INDEX "Card_userId_inDen_idx" ON "Card"("userId", "inDen");
