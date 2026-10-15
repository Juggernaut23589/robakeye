-- CreateEnum
CREATE TYPE "ComboDiscountType" AS ENUM ('FIXED_PRICE', 'PERCENT_OFF');

-- AlterTable
ALTER TABLE "Cart" ADD COLUMN     "abandonedStage" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "deliveryPartnerId" TEXT;

-- AlterTable
ALTER TABLE "Promotion" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "generatedForUserId" TEXT,
ADD COLUMN     "minSpendKobo" INTEGER;

-- CreateTable
CREATE TABLE "ComboDeal" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "productIds" TEXT[],
    "discountType" "ComboDiscountType" NOT NULL,
    "valueKobo" INTEGER,
    "percentOff" INTEGER,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isFeaturedOnHomepage" BOOLEAN NOT NULL DEFAULT false,
    "bannerHeadline" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ComboDeal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Promotion_generatedForUserId_idx" ON "Promotion"("generatedForUserId");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_deliveryPartnerId_fkey" FOREIGN KEY ("deliveryPartnerId") REFERENCES "DeliveryPartner"("id") ON DELETE SET NULL ON UPDATE CASCADE;
