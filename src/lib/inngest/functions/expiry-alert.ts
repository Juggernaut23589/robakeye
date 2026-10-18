import { inngest } from "@/lib/inngest/client";
import { cron } from "inngest";
import { prisma } from "@/lib/prisma";
import { getResend, FROM_EMAIL } from "@/lib/resend";

// Daily CRON — scans every store's listings for items whose expiryDate
// crosses the 90/60/30-day thresholds, raises one AdminAlert per
// (threshold, store listing) — deduped so the same item at the same
// threshold is never alerted twice — and emails the branch's own
// Branch Manager(s) plus every org-wide Inventory Manager.
const THRESHOLDS = [
  { days: 90, type: "EXPIRY_90", severity: "INFO" },
  { days: 60, type: "EXPIRY_60", severity: "WARNING" },
  { days: 30, type: "EXPIRY_30", severity: "CRITICAL" },
] as const;

export const productExpiryAlert = inngest.createFunction(
  { id: "product-expiry-alert", triggers: cron("0 6 * * *") }, // 6am daily
  async ({ step }) => {
    let alertsRaised = 0;

    for (const threshold of THRESHOLDS) {
      const windowStart = new Date();
      windowStart.setHours(0, 0, 0, 0);
      const windowEnd = new Date(windowStart.getTime() + (threshold.days + 1) * 24 * 60 * 60 * 1000);
      const windowFloor = new Date(windowStart.getTime() + threshold.days * 24 * 60 * 60 * 1000);

      const expiring = await step.run(`find-expiring-${threshold.type}`, async () => {
        // Each listing is one store's own stock, so the listing row *is*
        // the (product, branch) pair being alerted on.
        const rows = await prisma.product.findMany({
          where: { isActive: true, expiryDate: { gte: windowFloor, lt: windowEnd } },
          select: { id: true, name: true, branchId: true, expiryDate: true, branch: { select: { id: true, name: true } } },
        });
        return rows.map((r) => ({
          id: r.id,
          productId: r.id,
          branchId: r.branchId,
          expiryDate: r.expiryDate,
          product: { id: r.id, name: r.name },
          branch: r.branch,
        }));
      });

      for (const item of expiring) {
        await step
          .run(`alert-${threshold.type}-${item.id}`, async () => {
            const alreadyAlerted = await prisma.adminAlert.findFirst({
              where: { type: threshold.type, productId: item.productId, branchId: item.branchId },
            });
            if (alreadyAlerted) return { skipped: true };

            const expiryLabel = item.expiryDate ? new Date(item.expiryDate).toLocaleDateString("en-NG") : "unknown date";
            const message = `${item.product.name} at ${item.branch.name} expires in ${threshold.days} days (${expiryLabel}).`;

            await prisma.adminAlert.create({
              data: {
                type: threshold.type,
                severity: threshold.severity,
                message,
                branchId: item.branchId,
                productId: item.productId,
              },
            });

            const recipients = await prisma.staff.findMany({
              where: {
                isActive: true,
                OR: [
                  { role: { name: "INVENTORY_MANAGER" } },
                  { role: { name: "BRANCH_MANAGER" }, branches: { some: { branchId: item.branchId } } },
                ],
              },
              include: { user: { select: { email: true } } },
            });

            for (const recipient of recipients) {
              const { error } = await getResend().emails.send({
                from: FROM_EMAIL,
                to: recipient.user.email,
                subject: `Expiry alert: ${item.product.name} — ${threshold.days} days`,
                html: `<p>${message}</p>`,
              });
              if (error) console.error(`[expiry-alert] email failed for ${recipient.user.email}`, error);
            }

            return { alerted: true };
          })
          .catch((err) => console.error(`[expiry-alert] failed for listing ${item.id}`, err));
        alertsRaised++;
      }
    }

    return { alertsRaised };
  },
);
