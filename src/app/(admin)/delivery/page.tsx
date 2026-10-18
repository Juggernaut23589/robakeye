import { auth } from "@/lib/auth";
import { listActiveDeliveries, listDeliveryPartners, listDeliveryZonesByBranch } from "@/actions/delivery-admin";
import { DeliveryList } from "@/components/admin/delivery-list";
import { DeliveryPartnerManager } from "@/components/admin/delivery-partner-manager";
import { DeliveryZoneEditor } from "@/components/admin/delivery-zone-editor";

export default async function DeliveryPage() {
  const [deliveries, partners, branches, session] = await Promise.all([
    listActiveDeliveries(),
    listDeliveryPartners(),
    listDeliveryZonesByBranch(),
    auth(),
  ]);

  return (
    <main className="p-8">
      <h1 className="mb-6 font-display text-2xl font-bold text-rk-navy">Delivery</h1>

      <section className="mb-10">
        <h2 className="mb-3 font-semibold text-rk-navy">Active deliveries</h2>
        <DeliveryList deliveries={deliveries} partners={partners} />
      </section>

      <section className="mb-10">
        <h2 className="mb-1 font-semibold text-rk-navy">Riders &amp; couriers</h2>
        <p className="mb-3 text-sm text-rk-n600">
          A store&apos;s in-house rider only carries that store&apos;s orders. Shared couriers can be dispatched by any store.
        </p>
        <DeliveryPartnerManager
          partners={partners}
          branches={branches.map((b) => ({ id: b.id, name: b.name }))}
          canAddShared={session?.user?.branchScope === "ALL"}
        />
      </section>

      <section>
        <h2 className="mb-1 font-semibold text-rk-navy">Delivery areas &amp; fees</h2>
        <p className="mb-3 text-sm text-rk-n600">
          Each store only delivers within its own radius (the largest zone&apos;s max km); addresses beyond it can still
          choose pickup.
        </p>
        <div className="grid gap-4">
          {branches.map((b) => (
            <DeliveryZoneEditor key={b.id} branchId={b.id} branchName={b.name} zones={b.deliveryZones} />
          ))}
        </div>
      </section>
    </main>
  );
}
