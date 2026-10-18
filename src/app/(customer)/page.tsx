import { prisma } from "@/lib/prisma";
import { getStores } from "@/lib/stores";
import { StorePickerHero } from "@/components/home/store-picker-hero";

// The landing page is a store chooser: navbar, one full-height banner
// (three slides — supermart, pharmacy, vet clinic) with the store picker
// over it, then the footer. Shopping itself happens inside a store at
// /store/<slug>, because each location has its own catalogue and stock.
export default async function Home() {
  const [stores, zones] = await Promise.all([
    getStores(),
    prisma.deliveryZone.groupBy({ by: ["branchId"], _max: { maxKm: true } }),
  ]);
  const radiusByStore = new Map(zones.map((z) => [z.branchId, z._max.maxKm]));

  return (
    <StorePickerHero
      stores={stores.map((s) => ({
        id: s.id,
        slug: s.slug,
        name: s.name,
        address: s.address,
        lat: s.lat,
        lng: s.lng,
        services: s.services,
        tagline: s.tagline,
        deliveryKm: radiusByStore.get(s.id) ?? null,
      }))}
    />
  );
}
