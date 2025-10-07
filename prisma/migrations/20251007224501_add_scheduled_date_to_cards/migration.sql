-- AlterTable
ALTER TABLE "Card" ADD COLUMN     "scheduledDate" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Card_userId_scheduledDate_idx" ON "Card"("userId", "scheduledDate");
