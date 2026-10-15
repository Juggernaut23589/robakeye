import { notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatNaira } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { PrintReceiptButton } from "@/components/checkout/print-receipt-button";

const STATUS_VARIANT = {
  PENDING_PAYMENT: "neutral",
  PAID: "success",
  PROCESSING: "success",
  OUT_FOR_DELIVERY: "amber",
  DELIVERED: "success",
  CANCELLED: "alert",
  REFUNDED: "alert",
} as const;

export default async function OrderConfirmationPage({
  searchParams,
}: {
  searchParams: Promise<{ orders?: string }>;
}) {
  const session = await auth();
  if (!session?.user) notFound();

  const { orders: ordersParam } = await searchParams;
  const orderNumbers = ordersParam?.split(",").filter(Boolean) ?? [];
  if (orderNumbers.length === 0) notFound();

  const orders = await prisma.order.findMany({
    where: { orderNumber: { in: orderNumbers }, userId: session.user.id },
    include: {
      branch: { select: { name: true, address: true } },
      items: { include: { product: { select: { name: true } } } },
    },
  });
  if (orders.length === 0) notFound();

  const stillPending = orders.some((o) => o.status === "PENDING_PAYMENT");

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-8">
      <div id="receipt">
        <h1 className="font-display text-2xl font-bold text-rk-navy">
          {stillPending
            ? "Payment not yet confirmed"
            : orders.length > 1
              ? `${orders.length} orders confirmed`
              : "Order confirmed"}
        </h1>
        <p className="mt-1 text-rk-n600">
          {stillPending
            ? "We haven't received confirmation of payment for this order yet. If you completed payment, this page will update shortly — webhooks can take a few seconds."
            : "Thank you — your payment was received. The fulfilling branch will prepare your order; exact delivery/pickup timing is confirmed by the branch directly, since no live rider-ETA system exists yet."}
        </p>

        <div className="mt-6 grid gap-4">
          {orders.map((order) => (
            <div key={order.id} className="rounded-rk-md border border-rk-n200 p-4">
              <div className="flex items-center justify-between">
                <b className="font-mono text-sm text-rk-navy">{order.orderNumber}</b>
                <Badge variant={STATUS_VARIANT[order.status]}>{order.status.replace("_", " ")}</Badge>
              </div>
              <p className="mt-1 text-sm text-rk-n600">
                {order.branch.name} — {order.deliveryMethod === "PICKUP" ? "Pickup in-branch" : "Delivery"}
              </p>
              <ul className="mt-2 grid gap-1 text-sm text-rk-ink">
                {order.items.map((i) => (
                  <li key={i.id}>
                    {i.quantity}× {i.product.name}
                  </li>
                ))}
              </ul>
              <div className="mt-2 border-t border-rk-n200 pt-2 text-right font-mono text-sm font-bold text-rk-navy">
                {formatNaira(order.totalKobo)}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 flex items-center gap-4">
        <Link href="/account" className="text-sm text-rk-blue">
          View in my account →
        </Link>
        {!stillPending && <PrintReceiptButton />}
      </div>
    </div>
  );
}
