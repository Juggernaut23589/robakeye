import Link from "next/link";
import { auth } from "@/lib/auth";
import { formatNaira } from "@/lib/utils";
import { listOrdersForAdmin, listBranchesForFilter } from "@/actions/orders-admin";
import { RefundButton } from "@/components/admin/refund-button";
import { OrderFilters } from "@/components/admin/order-filters";
import { Badge } from "@/components/ui/badge";

const STATUS_VARIANT: Record<string, "success" | "alert" | "amber" | "neutral"> = {
  DELIVERED: "success",
  PAID: "success",
  PROCESSING: "amber",
  OUT_FOR_DELIVERY: "amber",
  PENDING_PAYMENT: "neutral",
  CANCELLED: "alert",
  REFUNDED: "alert",
};

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; branchId?: string; query?: string }>;
}) {
  const params = await searchParams;
  const session = await auth();
  const canRefund = session?.user.permissions.includes("orders.refund") ?? false;

  const [orders, branches] = await Promise.all([listOrdersForAdmin(params), listBranchesForFilter()]);

  return (
    <main className="p-8">
      <h1 className="mb-4 font-display text-2xl font-bold text-rk-navy">Orders</h1>
      <OrderFilters branches={branches} />
      <div className="overflow-x-auto rounded-rk-md border border-rk-n200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-rk-n50 text-xs text-rk-n600">
            <tr>
              <th className="p-3">Order</th>
              <th className="p-3">Customer</th>
              <th className="p-3">Branch</th>
              <th className="p-3">Status</th>
              <th className="p-3">Total</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-rk-n200">
            {orders.map((o) => (
              <tr key={o.id}>
                <td className="p-3 font-mono text-xs">
                  <Link href={`/orders/${o.id}`} className="text-rk-blue underline">
                    {o.orderNumber}
                  </Link>
                </td>
                <td className="p-3">{o.user.name}</td>
                <td className="p-3">{o.branch.name}</td>
                <td className="p-3">
                  <Badge variant={STATUS_VARIANT[o.status] ?? "neutral"}>{o.status.replace(/_/g, " ")}</Badge>
                </td>
                <td className="p-3 font-mono">{formatNaira(o.totalKobo)}</td>
                <td className="p-3">
                  {canRefund && o.status !== "REFUNDED" && o.payments.length > 0 && (
                    <RefundButton orderId={o.id} />
                  )}
                </td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr>
                <td colSpan={6} className="p-6 text-center text-rk-n600">
                  No orders match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
