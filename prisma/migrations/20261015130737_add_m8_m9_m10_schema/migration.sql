/*
  Warnings:

  - You are about to drop the column `serviceName` on the `VetAppointment` table. All the data in the column will be lost.
  - Added the required column `serviceId` to the `VetAppointment` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "VetAppointment" DROP COLUMN "serviceName",
ADD COLUMN     "reminderSentAt" TIMESTAMP(3),
ADD COLUMN     "serviceId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "PrescriptionAuditEntry" (
    "id" TEXT NOT NULL,
    "prescriptionId" TEXT NOT NULL,
    "lineId" TEXT,
    "staffId" TEXT,
    "action" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PrescriptionAuditEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsultRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "productId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "callbackPhone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConsultRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsultMessage" (
    "id" TEXT NOT NULL,
    "consultId" TEXT NOT NULL,
    "senderKind" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConsultMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VetService" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "durationMinutes" INTEGER NOT NULL DEFAULT 30,
    "priceKobo" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "VetService_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VetAvailability" (
    "id" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,

    CONSTRAINT "VetAvailability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminAlert" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'INFO',
    "message" TEXT NOT NULL,
    "branchId" TEXT,
    "productId" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminAlert_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PrescriptionAuditEntry_prescriptionId_idx" ON "PrescriptionAuditEntry"("prescriptionId");

-- CreateIndex
CREATE INDEX "ConsultMessage_consultId_idx" ON "ConsultMessage"("consultId");

-- CreateIndex
CREATE INDEX "VetAvailability_staffId_idx" ON "VetAvailability"("staffId");

-- CreateIndex
CREATE INDEX "AdminAlert_isRead_createdAt_idx" ON "AdminAlert"("isRead", "createdAt");

-- AddForeignKey
ALTER TABLE "PrescriptionAuditEntry" ADD CONSTRAINT "PrescriptionAuditEntry_prescriptionId_fkey" FOREIGN KEY ("prescriptionId") REFERENCES "Prescription"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsultRequest" ADD CONSTRAINT "ConsultRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsultRequest" ADD CONSTRAINT "ConsultRequest_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsultMessage" ADD CONSTRAINT "ConsultMessage_consultId_fkey" FOREIGN KEY ("consultId") REFERENCES "ConsultRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VetAppointment" ADD CONSTRAINT "VetAppointment_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "VetService"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VetAvailability" ADD CONSTRAINT "VetAvailability_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminAlert" ADD CONSTRAINT "AdminAlert_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminAlert" ADD CONSTRAINT "AdminAlert_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
