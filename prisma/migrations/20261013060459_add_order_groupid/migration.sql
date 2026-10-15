-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "groupId" TEXT;

-- CreateIndex
CREATE INDEX "Order_groupId_idx" ON "Order"("groupId");
