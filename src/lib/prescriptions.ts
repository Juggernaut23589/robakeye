import { prisma } from "@/lib/prisma";
import { remainingPrescriptionQuantity } from "@/lib/pricing";

// Approved, unexpired prescription quantity for a POM listing, minus what
// the customer has already ordered against it since approval.
export async function prescriptionAllowance(userId: string, productId: string) {
  const lines = await prisma.prescriptionLine.findMany({
    where: {
      productId,
      status: "APPROVED",
      prescription: {
        userId,
        status: { in: ["APPROVED", "PARTIALLY_APPROVED"] },
        expiresAt: { gt: new Date() },
      },
    },
    select: { quantity: true, prescription: { select: { reviewedAt: true } } },
  });
  if (lines.length === 0) return 0;
  const approved = lines.reduce((s, l) => s + l.quantity, 0);
  const since = lines
    .map((l) => l.prescription.reviewedAt)
    .filter((d): d is Date => d !== null)
    .sort((a, b) => a.getTime() - b.getTime())[0];
  const used = await prisma.orderItem.aggregate({
    _sum: { quantity: true },
    where: {
      productId,
      order: {
        userId,
        status: { notIn: ["PENDING_PAYMENT", "CANCELLED", "REFUNDED"] },
        ...(since ? { createdAt: { gte: since } } : {}),
      },
    },
  });
  return remainingPrescriptionQuantity(approved, used._sum.quantity ?? 0);
}
