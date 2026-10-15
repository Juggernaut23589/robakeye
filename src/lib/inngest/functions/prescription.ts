import { inngest, prescriptionSubmitted, prescriptionReviewed } from "@/lib/inngest/client";
import { prisma } from "@/lib/prisma";
import { getResend, FROM_EMAIL } from "@/lib/resend";

// Extracted so it's callable directly (e.g. from a test, or an admin
// "force expire" action later) without waiting on the real 48h sleep —
// the Inngest function below is a thin wrapper: notify, sleep, then call
// this.
export async function expirePrescriptionIfStillActive(prescriptionId: string) {
  const prescription = await prisma.prescription.findUnique({ where: { id: prescriptionId } });
  if (!prescription) return { expired: false, reason: "not found" };

  // Idempotent: only expire if it's still in the approved window and
  // hasn't already been consumed into an order or re-reviewed somehow.
  if (prescription.status !== "APPROVED" && prescription.status !== "PARTIALLY_APPROVED") {
    return { expired: false, reason: `status is ${prescription.status}, not approved` };
  }
  if (!prescription.expiresAt || prescription.expiresAt > new Date()) {
    return { expired: false, reason: "not yet past expiresAt" };
  }

  await prisma.$transaction([
    prisma.prescription.update({ where: { id: prescriptionId }, data: { status: "EXPIRED" } }),
    prisma.prescriptionAuditEntry.create({
      data: { prescriptionId, action: "EXPIRED", note: "48h approval window elapsed" },
    }),
  ]);
  return { expired: true };
}

// No admin notification center exists yet (Milestone 10's dashboard) —
// same honest-log pattern as order-paid's branch-notify step.
export const handlePrescriptionSubmitted = inngest.createFunction(
  { id: "handle-prescription-submitted", triggers: prescriptionSubmitted, retries: 4 },
  async ({ event, step }) => {
    await step.run("notify-pharmacist-queue", async () => {
      console.log(
        `[pharmacist-notify] New prescription ${event.data.prescriptionId} awaiting review — admin alert UI lands in Milestone 10`,
      );
    });
    return { notified: true };
  },
);

export const handlePrescriptionReviewed = inngest.createFunction(
  { id: "handle-prescription-reviewed", triggers: prescriptionReviewed, retries: 4 },
  async ({ event, step }) => {
    const { prescriptionId, status } = event.data;

    const prescription = await step.run("load-prescription", async () => {
      return prisma.prescription.findUnique({
        where: { id: prescriptionId },
        include: {
          user: { select: { name: true, email: true } },
          lines: { include: { product: { select: { name: true } } } },
        },
      });
    });
    if (!prescription) return { skipped: true, reason: "prescription not found" };

    // Step — decision notification email.
    await step
      .run("send-decision-email", async () => {
        const approvedNames = prescription.lines
          .filter((l) => l.status === "APPROVED")
          .map((l) => l.product.name);
        const rejectedNames = prescription.lines
          .filter((l) => l.status === "REJECTED")
          .map((l) => l.product.name);

        const { error } = await getResend().emails.send({
          from: FROM_EMAIL,
          to: prescription.user.email,
          subject: `Your prescription has been reviewed — ${status.replace("_", " ").toLowerCase()}`,
          html: `
            <p>Hi ${prescription.user.name},</p>
            ${approvedNames.length > 0 ? `<p>Approved — you have 48 hours to order: ${approvedNames.join(", ")}.</p>` : ""}
            ${rejectedNames.length > 0 ? `<p>Not approved: ${rejectedNames.join(", ")}.</p>` : ""}
          `,
        });
        if (error) throw new Error(`Resend error: ${error.message}`);
      })
      .catch((err) => console.error("[prescription-reviewed] email failed", err));

    // Only approved/partially-approved tokens expire — a fully rejected
    // prescription has nothing left to clean up.
    if (status === "REJECTED") {
      return { notified: true, expiry: "not applicable" };
    }

    // The 48h approval-token expiry, using Inngest's own sleep — per the
    // brief: "cleanup event for 48 hours later using Inngest's built-in
    // sleep/delay feature." This is durable: if the server restarts or
    // redeploys during the 48h wait, Inngest resumes it exactly where it
    // left off, not from zero.
    await step.sleep("wait-for-expiry-window", "48h");

    const result = await step.run("expire-if-unused", async () => {
      return expirePrescriptionIfStillActive(prescriptionId);
    });

    return { notified: true, ...result };
  },
);
