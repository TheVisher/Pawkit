-- AlterTable
ALTER TABLE "Collection" ADD COLUMN     "inDen" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "Collection_userId_inDen_idx" ON "Collection"("userId", "inDen");
