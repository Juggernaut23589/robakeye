import { inngest, orderRefunded } from "@/lib/inngest/client";
import { prisma } from "@/lib/prisma";
import { getResend, FROM_EMAIL } from "@/lib/resend";
import { formatNaira } from "@/lib/utils";

// The actual Paystack refund API call and status update happen
// synchronously in actions/refunds.ts (an admin action, not a webhook —
// there's no "fast response required" constraint forcing it async). This
// function is purely the notification half the brief asks for: "triggers
// order.refunded Inngest event for notification."
export const handleOrderRefunded = inngest.createFunction(
  { id: "handle-order-refunded", triggers: orderRefunded, retries: 4 },
  async ({ event, step }) => {
    const { orderId, amountKobo } = event.data;

    const order = await step.run("load-order", async () => {
      return prisma.order.findUnique({
        where: { id: orderId },
        include: { user: { select: { name: true, email: true } } },
      });
    });
    if (!order) return { skipped: true, reason: "order not found" };

    await step.run("send-refund-email", async () => {
      const { error } = await getResend().emails.send({
        from: FROM_EMAIL,
        to: order.user.email,
        subject: `Refund issued for order ${order.orderNumber}`,
        html: `
          <p>Hi ${order.user.name},</p>
          <p>We've issued a refund of ${formatNaira(amountKobo)} for order <b>${order.orderNumber}</b>.
          It should reflect on your original payment method within a few business days.</p>
        `,
      });
      if (error) throw new Error(`Resend error: ${error.message}`);
    });

    return { orderNumber: order.orderNumber };
  },
);
