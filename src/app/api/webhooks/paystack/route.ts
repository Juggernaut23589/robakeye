import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyWebhookSignature } from "@/lib/paystack";
import { inngest, orderPaid } from "@/lib/inngest/client";

// Per the brief: verify signature, on charge.success → update payment
// status FAST (minimal synchronous work), send the order.paid Inngest
// event, return 200 quickly. All the slow fulfilment work (inventory,
// email, SMS, branch notify) happens in the Inngest function, not here.
export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-paystack-signature");

  const valid = await verifyWebhookSignature(rawBody, signature);
  if (!valid) {
    // Never trust an unsigned/mis-signed request to mark anything paid.
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const event = JSON.parse(rawBody);

  if (event.event === "charge.success") {
    const reference: string = event.data.reference;

    const payment = await prisma.payment.findUnique({ where: { reference } });
    if (!payment) {
      // Unknown reference — ack 200 anyway so Paystack doesn't retry
      // forever on something we'll never recognize, but log it.
      console.error(`[paystack webhook] charge.success for unknown reference ${reference}`);
      return NextResponse.json({ received: true });
    }

    // Idempotent: a webhook can legitimately be delivered more than once.
    if (payment.status !== "SUCCESS") {
      await prisma.$transaction([
        prisma.payment.update({
          where: { id: payment.id },
          data: { status: "SUCCESS", paystackRaw: event },
        }),
        prisma.order.updateMany({
          where: { groupId: payment.groupId },
          data: { status: "PAID" },
        }),
      ]);

      await inngest.send(orderPaid.create({ groupId: payment.groupId }));
    }
  }

  return NextResponse.json({ received: true });
}
