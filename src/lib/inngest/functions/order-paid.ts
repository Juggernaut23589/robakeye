import { inngest, orderPaid } from "@/lib/inngest/client";
import { prisma } from "@/lib/prisma";
import { getResend, FROM_EMAIL } from "@/lib/resend";
import { sendSms } from "@/lib/termii";
import { formatNaira } from "@/lib/utils";

// Fires after the Paystack webhook has already marked the Payment SUCCESS
// and returned 200 (fast path) — this function does the actual fulfilment
// work asynchronously, each step independently retried by Inngest on
// failure. Per the brief's 5 numbered steps.
export const handleOrderPaid = inngest.createFunction(
  { id: "handle-order-paid", triggers: orderPaid, retries: 4 },
  async ({ event, step }) => {
    const { groupId } = event.data;

    const orders = await step.run("load-orders", async () => {
      return prisma.order.findMany({
        where: { groupId },
        include: {
          branch: { select: { name: true, phone: true } },
          user: { select: { name: true, email: true, phone: true } },
          items: { include: { product: { select: { name: true } } } },
        },
      });
    });

    if (orders.length === 0) {
      return { skipped: true, reason: "no orders found for groupId" };
    }

    // Step 1 — decrement inventory. Atomic conditional update, same
    // race-safe pattern as the rest of this project: two customers racing
    // for the last unit can't both succeed. This is the first point stock
    // is actually reserved — not at checkout, which would hold inventory
    // hostage against an abandoned payment popup.
    const stockIssues: string[] = await step.run("decrement-inventory", async () => {
      const issues: string[] = [];
      for (const order of orders) {
        for (const item of order.items) {
          // The listing belongs to exactly one store (Product.branchId);
          // matching it too guards against an order line ever drawing down
          // another store's shelf.
          const result = await prisma.product.updateMany({
            where: { id: item.productId, branchId: order.branchId, stockQuantity: { gte: item.quantity } },
            data: { stockQuantity: { decrement: item.quantity } },
          });
          if (result.count === 0) {
            issues.push(`${item.product.name} at ${order.branch.name} (order ${order.orderNumber})`);
          }
        }
      }
      return issues;
    });

    // Step 5 (done early, deliberately) — record the status transition
    // regardless of the stock-issue outcome below, so there's always an
    // audit trail of "payment succeeded" even if fulfilment has a problem.
    await step.run("record-status-history", async () => {
      await prisma.$transaction(
        orders.map((o) =>
          prisma.orderStatusHistory.create({
            data: {
              orderId: o.id,
              status: "PAID",
              note:
                stockIssues.length > 0
                  ? "Payment confirmed — stock issue flagged, needs manual review"
                  : "Payment confirmed",
            },
          }),
        ),
      );
      await prisma.order.updateMany({
        where: { id: { in: orders.map((o) => o.id) } },
        data: { status: "PROCESSING" },
      });
    });

    // Steps 2-4 are independent notification channels — email, SMS and
    // branch-notify .catch() at the call site (not inside the step body)
    // so a permanently-broken integration (e.g. RESEND_API_KEY unset)
    // can't block the other two from ever running. Each step.run still
    // gets Inngest's own per-step retry/observability for transient
    // failures; this only stops one channel's failure from cascading into
    // the others within a single function execution.

    // Step 2 — order confirmation email.
    await step
      .run("send-confirmation-email", async () => {
        const email = orders[0].user.email;
        const orderList = orders
          .map(
            (o) =>
              `<li><b>${o.orderNumber}</b> — ${o.branch.name} — ${formatNaira(o.totalKobo)}</li>`,
          )
          .join("");
        const { error } = await getResend().emails.send({
          from: FROM_EMAIL,
          to: email,
          subject:
            orders.length > 1
              ? `Your Robakeye order is confirmed — ${orders.length} deliveries`
              : `Your Robakeye order ${orders[0].orderNumber} is confirmed`,
          html: `
            <p>Hi ${orders[0].user.name},</p>
            <p>Payment received. ${orders.length > 1 ? "Your order ships as separate deliveries:" : "Your order:"}</p>
            <ul>${orderList}</ul>
            ${stockIssues.length > 0 ? `<p><b>Note:</b> we're double-checking stock on part of this order and will follow up shortly.</p>` : ""}
          `,
        });
        if (error) throw new Error(`Resend error: ${error.message}`);
      })
      .catch((err) => console.error("[order-paid] confirmation email failed", err));

    // Step 3 — order confirmation SMS.
    await step
      .run("send-confirmation-sms", async () => {
        const phone = orders[0].user.phone;
        if (!phone) return { skipped: true, reason: "no phone on file" };
        const orderNumbers = orders.map((o) => o.orderNumber).join(", ");
        await sendSms(
          phone,
          `Robakeye: payment received for order${orders.length > 1 ? "s" : ""} ${orderNumbers}. Thank you!`,
        );
      })
      .catch((err) => console.error("[order-paid] confirmation SMS failed", err));

    // Step 4 — notify the fulfilling branch. No admin notification
    // center/inbox exists yet (that's Milestone 10's admin dashboard) —
    // honestly logging rather than pretending to deliver an in-app alert
    // nobody can see yet.
    await step
      .run("notify-branch", async () => {
        for (const order of orders) {
          console.log(
            `[branch-notify] ${order.branch.name}: new paid order ${order.orderNumber} (${order.items.length} items) — admin alert UI lands in Milestone 10`,
          );
        }
      })
      .catch((err) => console.error("[order-paid] branch notify failed", err));

    return { orderNumbers: orders.map((o) => o.orderNumber), stockIssues };
  },
);
