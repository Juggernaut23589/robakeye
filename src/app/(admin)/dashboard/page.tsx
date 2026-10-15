import Link from "next/link";
import { getDashboardOverview } from "@/actions/dashboard";
import { formatNaira } from "@/lib/utils";
import { RevenueChart } from "@/components/admin/revenue-chart";
import { Badge } from "@/components/ui/badge";

export default async function DashboardPage() {
  const overview = await getDashboardOverview();
  if (!overview) {
    return (
      <main className="p-8">
        <p className="text-rk-n600">Not authorized.</p>
      </main>
    );
  }

  const { totalRevenueKobo, ordersToday, pendingPrescriptions, lowStockCount, revenueSeries, recentOrders, lowStock, unreadAlerts } =
    overview;

  return (
    <main className="p-8">
      <h1 className="mb-6 font-display text-2xl font-bold text-rk-navy">Dashboard</h1>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Revenue (14 days)" value={formatNaira(totalRevenueKobo)} />
        <KpiCard label="Orders today" value={String(ordersToday)} />
        <KpiCard label="Pending prescriptions" value={String(pendingPrescriptions)} href="/prescriptions" />
        <KpiCard label="Low stock items" value={String(lowStockCount)} alert={lowStockCount > 0} />
      </div>

      <div className="mb-6 rounded-rk-md border border-rk-n200 bg-white p-5">
        <h2 className="mb-3 font-semibold text-rk-navy">Revenue — last 14 days</h2>
        <RevenueChart data={revenueSeries} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-rk-md border border-rk-n200 bg-white p-5">
          <h2 className="mb-3 font-semibold text-rk-navy">Recent orders</h2>
          {recentOrders.length === 0 ? (
            <p className="text-sm text-rk-n600">No orders yet.</p>
          ) : (
            <ul className="grid gap-2">
              {recentOrders.map((o) => (
                <li key={o.id} className="flex items-center justify-between text-sm">
                  <span>
                    {o.user.name} · {o.branch.name}
                  </span>
                  <span className="font-mono text-rk-n600">{formatNaira(o.totalKobo)}</span>
                </li>
              ))}
            </ul>
          )}
          <Link href="/orders" className="mt-3 inline-block text-sm text-rk-blue underline">
            View all orders →
          </Link>
        </div>

        <div className="rounded-rk-md border border-rk-n200 bg-white p-5">
          <h2 className="mb-3 font-semibold text-rk-navy">Low stock alerts</h2>
          {lowStock.length === 0 ? (
            <p className="text-sm text-rk-n600">Nothing below threshold.</p>
          ) : (
            <ul className="grid gap-2">
              {lowStock.map((i) => (
                <li key={i.id} className="flex items-center justify-between text-sm">
                  <span>
                    {i.product.name} — {i.branch.name}
                  </span>
                  <Badge variant="alert">{i.quantity} left</Badge>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {unreadAlerts.length > 0 && (
        <div className="mt-6 rounded-rk-md border border-rk-amber bg-rk-amber-tint p-5">
          <h2 className="mb-3 font-semibold text-rk-amber-deep">Expiry alerts</h2>
          <ul className="grid gap-2">
            {unreadAlerts.map((a) => (
              <li key={a.id} className="text-sm text-rk-navy">
                {a.message}
              </li>
            ))}
          </ul>
        </div>
      )}
    </main>
  );
}

function KpiCard({ label, value, href, alert }: { label: string; value: string; href?: string; alert?: boolean }) {
  const content = (
    <div className={`rounded-rk-md border p-5 ${alert ? "border-rk-alert bg-rk-alert-tint" : "border-rk-n200 bg-white"}`}>
      <p className="text-xs text-rk-n600">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${alert ? "text-rk-alert" : "text-rk-navy"}`}>{value}</p>
    </div>
  );
  return href ? <Link href={href}>{content}</Link> : content;
}
