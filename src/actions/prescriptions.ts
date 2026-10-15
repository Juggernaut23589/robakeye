"use server";

import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  getPrescriptionUploadSignature,
  isCloudinaryConfigured,
  getSignedPrescriptionUrl,
} from "@/lib/cloudinary";
import { inngest, prescriptionSubmitted, prescriptionReviewed } from "@/lib/inngest/client";

export async function getUploadSignature() {
  const session = await auth();
  if (!session?.user) return { ok: false as const, error: "Sign in to upload a prescription" };
  if (!isCloudinaryConfigured()) {
    return {
      ok: false as const,
      error: "Prescription upload isn't configured in this environment yet.",
    };
  }
  const sig = getPrescriptionUploadSignature(`prescriptions/${session.user.id}`);
  return { ok: true as const, ...sig };
}

const submitSchema = z.object({
  imagePublicId: z.string().min(1),
  lines: z
    .array(z.object({ productId: z.string(), quantity: z.number().int().positive() }))
    .min(1, "Add at least one medicine"),
});

export async function submitPrescription(input: unknown) {
  const session = await auth();
  if (!session?.user) return { ok: false as const, error: "Sign in to submit a prescription" };

  const parsed = submitSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid submission" };
  }

  // Only POM products from Pharmacy/Veterinary go through pharmacist
  // review — reject anything else so the queue never fills with items
  // that were never meant to need a prescription.
  const products = await prisma.product.findMany({
    where: { id: { in: parsed.data.lines.map((l) => l.productId) } },
    select: { id: true, class: true },
  });
  const invalid = products.some((p) => p.class !== "POM");
  if (invalid || products.length !== parsed.data.lines.length) {
    return { ok: false as const, error: "One or more items don't require a prescription" };
  }

  const prescription = await prisma.prescription.create({
    data: {
      userId: session.user.id,
      imagePublicId: parsed.data.imagePublicId,
      status: "PENDING",
      lines: { create: parsed.data.lines },
      audit: { create: { action: "SUBMITTED" } },
    },
  });

  await inngest.send(prescriptionSubmitted.create({ prescriptionId: prescription.id }));

  return { ok: true as const, prescriptionId: prescription.id };
}

export async function getMyPrescriptions() {
  const session = await auth();
  if (!session?.user) return [];
  return prisma.prescription.findMany({
    where: { userId: session.user.id },
    include: { lines: { include: { product: { select: { name: true } } } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function getPendingPrescriptionQueue() {
  const session = await auth();
  if (!session?.user?.permissions.includes("prescriptions.view")) return [];
  return prisma.prescription.findMany({
    where: { status: { in: ["PENDING"] } },
    include: {
      user: { select: { name: true, email: true } },
      lines: { include: { product: { select: { name: true, sku: true } } } },
    },
    orderBy: { createdAt: "asc" },
  });
}

export async function getPrescriptionForReview(prescriptionId: string) {
  const session = await auth();
  if (!session?.user?.permissions.includes("prescriptions.view")) return null;

  const prescription = await prisma.prescription.findUnique({
    where: { id: prescriptionId },
    include: {
      user: { select: { name: true, email: true } },
      lines: { include: { product: { select: { name: true, sku: true, priceKobo: true } } } },
      audit: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!prescription) return null;

  const imageUrl = isCloudinaryConfigured()
    ? getSignedPrescriptionUrl(prescription.imagePublicId)
    : null;

  return { ...prescription, imageUrl };
}

const decisionSchema = z.object({
  lineId: z.string(),
  decision: z.enum(["APPROVED", "REJECTED"]),
  note: z.string().optional(),
});

// Per-line-item approval — the core compliance rule
// (docs/pharmacy-vet-compliance.html): never all-or-nothing.
export async function decidePrescriptionLine(input: unknown) {
  const session = await auth();
  if (!session?.user?.permissions.includes("prescriptions.review")) {
    return { ok: false as const, error: "Not authorized to review prescriptions" };
  }
  const parsed = decisionSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Invalid decision" };

  const line = await prisma.prescriptionLine.findUnique({
    where: { id: parsed.data.lineId },
    include: { prescription: { include: { lines: true } } },
  });
  if (!line) return { ok: false as const, error: "Line not found" };

  await prisma.$transaction([
    prisma.prescriptionLine.update({
      where: { id: line.id },
      data: {
        status: parsed.data.decision,
        rejectionReason: parsed.data.decision === "REJECTED" ? parsed.data.note : null,
      },
    }),
    prisma.prescriptionAuditEntry.create({
      data: {
        prescriptionId: line.prescriptionId,
        lineId: line.id,
        staffId: session.user.id,
        action: parsed.data.decision === "APPROVED" ? "LINE_APPROVED" : "LINE_REJECTED",
        note: parsed.data.note,
      },
    }),
  ]);

  // Once every line has a decision, roll up the prescription-level status
  // and start the 48h approval-token clock.
  const remainingLines = line.prescription.lines.filter((l) => l.id !== line.id);
  const allDecided = remainingLines.every((l) => l.status !== "PENDING");
  if (allDecided) {
    // Re-fetch rather than compute from in-memory state, so the rollup
    // reflects this line's just-written status alongside the rest.
    const finalLines = await prisma.prescriptionLine.findMany({
      where: { prescriptionId: line.prescriptionId },
      select: { status: true },
    });
    const anyApproved = finalLines.some((l) => l.status === "APPROVED");
    const anyRejected = finalLines.some((l) => l.status === "REJECTED");
    const finalStatus = anyApproved && anyRejected ? "PARTIALLY_APPROVED" : anyApproved ? "APPROVED" : "REJECTED";

    const expiresAt =
      finalStatus === "APPROVED" || finalStatus === "PARTIALLY_APPROVED"
        ? new Date(Date.now() + 48 * 60 * 60 * 1000)
        : null;

    await prisma.prescription.update({
      where: { id: line.prescriptionId },
      data: {
        status: finalStatus,
        pharmacistId: session.user.id,
        reviewedAt: new Date(),
        expiresAt,
      },
    });

    await inngest.send(
      prescriptionReviewed.create({ prescriptionId: line.prescriptionId, status: finalStatus }),
    );
  }

  return { ok: true as const };
}

// How much of a POM product the current customer is cleared to buy right
// now — an APPROVED line whose Prescription hasn't passed its 48h
// expiresAt. Read live at add-to-cart time, same "real-time stock check"
// discipline the rest of this project applies.
export async function getApprovedPrescriptionQuantity(productId: string) {
  const session = await auth();
  if (!session?.user) return 0;

  const lines = await prisma.prescriptionLine.findMany({
    where: {
      productId,
      status: "APPROVED",
      prescription: {
        userId: session.user.id,
        status: { in: ["APPROVED", "PARTIALLY_APPROVED"] },
        expiresAt: { gt: new Date() },
      },
    },
    select: { quantity: true },
  });
  return lines.reduce((sum, l) => sum + l.quantity, 0);
}
