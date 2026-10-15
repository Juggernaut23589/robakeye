import { listActiveDeliveries, listDeliveryPartners, listDeliveryZonesByBranch } from "@/actions/delivery-admin";
import { DeliveryList } from "@/components/admin/delivery-list";
import { DeliveryPartnerManager } from "@/components/admin/delivery-partner-manager";
import { DeliveryZoneEditor } from "@/components/admin/delivery-zone-editor";

export default async function DeliveryPage() {
  const [deliveries, partners, branches] = await Promise.all([
    listActiveDeliveries(),
    listDeliveryPartners(),
    listDeliveryZonesByBranch(),
  ]);

  return (
    <main className="p-8">
      <h1 className="mb-6 font-display text-2xl font-bold text-rk-navy">Delivery</h1>

      <section className="mb-10">
        <h2 className="mb-3 font-semibold text-rk-navy">Active deliveries</h2>
        <DeliveryList deliveries={deliveries} partners={partners} />
      </section>

      <section className="mb-10">
        <h2 className="mb-3 font-semibold text-rk-navy">Delivery partners</h2>
        <DeliveryPartnerManager partners={partners} />
      </section>

      <section>
        <h2 className="mb-3 font-semibold text-rk-navy">Delivery fee zones</h2>
        <div className="grid gap-4">
          {branches.map((b) => (
            <DeliveryZoneEditor key={b.id} branchId={b.id} branchName={b.name} zones={b.deliveryZones} />
          ))}
        </div>
      </section>
    </main>
  );
}
