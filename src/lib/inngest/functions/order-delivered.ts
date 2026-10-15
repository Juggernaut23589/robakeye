import { inngest, orderDelivered } from "@/lib/inngest/client";
import { prisma } from "@/lib/prisma";
import { getResend, FROM_EMAIL } from "@/lib/resend";

// docs/revenue-features-roadmap.html §02 "Reviews & social proof": "a
// post-delivery automated request" — the review read/write path itself
// (Review model, ReviewsList, actions/reviews.ts) already exists; this is
// the trigger that actually invites a customer to use it. Waits 2h after
// delivery (long enough that the customer has actually unpacked the
// order) before sending, same `step.sleep` pattern as the prescription
// and appointment functions.
export const handleOrderDelivered = inngest.createFunction(
  { id: "handle-order-delivered", triggers: orderDelivered, retries: 4 },
  async ({ event, step }) => {
    const { orderId } = event.data;

    await step.sleep("wait-before-review-request", "2h");

    await step
      .run("send-review-request", async () => {
        const order = await prisma.order.findUnique({
          where: { id: orderId },
          include: { user: { select: { name: true, email: true } }, review: true },
        });
        // Still DELIVERED (not since refunded/disputed) and not already
        // reviewed — re-checked at wake time since 2h is enough for state
        // to have changed.
        if (!order || order.status !== "DELIVERED" || order.review) {
          return { skipped: true };
        }

        const { error } = await getResend().emails.send({
          from: FROM_EMAIL,
          to: order.user.email,
          subject: `How was your Robakeye order, ${order.user.name}?`,
          html: `
            <p>Hi ${order.user.name},</p>
            <p>Your order ${order.orderNumber} was delivered. We'd love to hear how it went —
            leave a quick rating and review from your account page.</p>
          `,
        });
        if (error) throw new Error(`Resend error: ${error.message}`);
      })
      .catch((err) => console.error(`[order-delivered] review request failed for ${orderId}`, err));

    return { orderId };
  },
);
