-- AlterTable
ALTER TABLE "Card" ADD COLUMN "lastOpenedAt" TIMESTAMP(3),
ADD COLUMN "openCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "lastAccessType" TEXT;

-- CreateIndex
CREATE INDEX "Card_userId_lastOpenedAt_idx" ON "Card"("userId", "lastOpenedAt");
