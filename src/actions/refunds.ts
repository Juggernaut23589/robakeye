"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { refundTransaction } from "@/lib/paystack";
import { inngest, orderRefunded } from "@/lib/inngest/client";

// Admin-triggered refund — per the brief: "admin-triggered, Paystack
// refund API, triggers order.refunded Inngest event for notification."
// The full admin Order Management surface (filterable table, CSV export)
// is Milestone 10's job; this is the refund action itself plus the
// minimal trigger point needed to exercise and verify it now.
export async function refundOrder(orderId: string) {
  const session = await auth();
  if (!session?.user || !session.user.permissions.includes("orders.refund")) {
    return { ok: false as const, error: "Not authorized to issue refunds" };
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { payments: { where: { status: "SUCCESS" }, orderBy: { createdAt: "desc" } } },
  });
  if (!order) return { ok: false as const, error: "Order not found" };
  if (order.status === "REFUNDED") return { ok: false as const, error: "Already refunded" };

  const payment = order.payments[0];
  if (!payment) return { ok: false as const, error: "No successful payment found for this order" };

  try {
    await refundTransaction(payment.reference, order.totalKobo);
  } catch (err) {
    console.error("Paystack refund failed", err);
    return {
      ok: false as const,
      error: err instanceof Error ? err.message : "Refund failed at Paystack",
    };
  }

  await prisma.$transaction([
    prisma.order.update({
      where: { id: orderId },
      data: { status: "REFUNDED" },
    }),
    prisma.orderStatusHistory.create({
      data: { orderId, status: "REFUNDED", note: `Refunded by ${session.user.name}` },
    }),
  ]);

  await inngest.send(orderRefunded.create({ orderId, amountKobo: order.totalKobo }));

  return { ok: true as const };
}
