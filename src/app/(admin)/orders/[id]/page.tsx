import { notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { getOrderDetail } from "@/actions/orders-admin";
import { formatNaira } from "@/lib/utils";
import { RefundButton } from "@/components/admin/refund-button";
import { OrderStatusControl } from "@/components/admin/order-status-control";
import { Badge } from "@/components/ui/badge";

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const order = await getOrderDetail(id);
  if (!order) notFound();

  const canRefund = session?.user.permissions.includes("orders.refund") ?? false;
  const canUpdateStatus = session?.user.permissions.includes("orders.update_status") ?? false;
  const canRefundNow = canRefund && order.status !== "REFUNDED" && order.payments.some((p) => p.status === "SUCCESS");

  return (
    <main className="p-8">
      <Link href="/orders" className="text-sm text-rk-blue underline">
        ← Back to orders
      </Link>

      <div className="mt-2 flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-rk-navy">{order.orderNumber}</h1>
        <Badge variant="navy">{order.status.replace(/_/g, " ")}</Badge>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 grid gap-6">
          <section className="rounded-rk-md border border-rk-n200 bg-white p-5">
            <h2 className="mb-3 font-semibold text-rk-navy">Items</h2>
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-rk-n600">
                <tr>
                  <th className="pb-2">Product</th>
                  <th className="pb-2">Qty</th>
                  <th className="pb-2">Unit price</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rk-n200">
                {order.items.map((item) => (
                  <tr key={item.id}>
                    <td className="py-2">
                      {item.product.name} <span className="text-xs text-rk-n600">({item.product.sku})</span>
                    </td>
                    <td className="py-2">{item.quantity}</td>
                    <td className="py-2 font-mono">{formatNaira(item.unitPriceKobo)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-4 grid gap-1 text-sm text-rk-n600">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="font-mono">{formatNaira(order.subtotalKobo)}</span>
              </div>
              {order.comboDiscountKobo > 0 && (
                <div className="flex justify-between">
                  <span>Combo discount</span>
                  <span className="font-mono">-{formatNaira(order.comboDiscountKobo)}</span>
                </div>
              )}
              {order.promoDiscountKobo > 0 && (
                <div className="flex justify-between">
                  <span>Promo discount</span>
                  <span className="font-mono">-{formatNaira(order.promoDiscountKobo)}</span>
                </div>
              )}
              {order.loyaltyDiscountKobo > 0 && (
                <div className="flex justify-between">
                  <span>Loyalty discount</span>
                  <span className="font-mono">-{formatNaira(order.loyaltyDiscountKobo)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Delivery</span>
                <span className="font-mono">{formatNaira(order.deliveryFeeKobo)}</span>
              </div>
              <div className="flex justify-between">
                <span>Service charge</span>
                <span className="font-mono">{formatNaira(order.serviceChargeKobo)}</span>
              </div>
              <div className="flex justify-between">
                <span>Tax</span>
                <span className="font-mono">{formatNaira(order.taxKobo)}</span>
              </div>
              <div className="flex justify-between font-bold text-rk-navy">
                <span>Total</span>
                <span className="font-mono">{formatNaira(order.totalKobo)}</span>
              </div>
            </div>
          </section>

          <section className="rounded-rk-md border border-rk-n200 bg-white p-5">
            <h2 className="mb-3 font-semibold text-rk-navy">Status history</h2>
            {order.statusHistory.length === 0 ? (
              <p className="text-sm text-rk-n600">No history yet.</p>
            ) : (
              <ul className="grid gap-2 text-sm">
                {order.statusHistory.map((h) => (
                  <li key={h.id} className="flex justify-between text-rk-n600">
                    <span>
                      {h.status.replace(/_/g, " ")}
                      {h.note ? ` — ${h.note}` : ""}
                    </span>
                    <span className="text-xs">{new Date(h.createdAt).toLocaleString()}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <div className="grid gap-6">
          <section className="rounded-rk-md border border-rk-n200 bg-white p-5">
            <h2 className="mb-3 font-semibold text-rk-navy">Customer</h2>
            <p className="text-sm text-rk-navy">{order.user.name}</p>
            <p className="text-sm text-rk-n600">{order.user.email}</p>
            {order.user.phone && <p className="text-sm text-rk-n600">{order.user.phone}</p>}
          </section>

          <section className="rounded-rk-md border border-rk-n200 bg-white p-5">
            <h2 className="mb-3 font-semibold text-rk-navy">Fulfilment</h2>
            <p className="text-sm text-rk-navy">{order.branch.name}</p>
            <p className="text-sm text-rk-n600">{order.deliveryMethod === "DELIVERY" ? order.address?.line1 ?? "No address on file" : "Pickup at branch"}</p>
            {order.prescription && (
              <p className="mt-2 text-xs text-rk-n600">
                Prescription status: <Badge variant="amber">{order.prescription.status}</Badge>
              </p>
            )}
          </section>

          {canUpdateStatus && (
            <section className="rounded-rk-md border border-rk-n200 bg-white p-5">
              <h2 className="mb-3 font-semibold text-rk-navy">Update status</h2>
              <OrderStatusControl orderId={order.id} currentStatus={order.status} />
            </section>
          )}

          {canRefundNow && (
            <section className="rounded-rk-md border border-rk-n200 bg-white p-5">
              <h2 className="mb-3 font-semibold text-rk-navy">Refund</h2>
              <RefundButton orderId={order.id} />
            </section>
          )}
        </div>
      </div>
    </main>
  );
}
