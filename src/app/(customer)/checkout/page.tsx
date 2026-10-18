import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getStoreBySlug } from "@/lib/stores";
import { CheckoutWizard } from "@/components/checkout/checkout-wizard";

export const metadata = { title: "Checkout" };

// Checkout is always for one store: /checkout?store=<slug>. A checkout
// link without a store goes back to the basket, where each store's basket
// has its own checkout button.
export default async function CheckoutPage({ searchParams }: PageProps<"/checkout">) {
  const sp = await searchParams;
  const storeSlug = typeof sp.store === "string" ? sp.store : undefined;
  const promo = typeof sp.promo === "string" ? sp.promo : undefined;
  if (!storeSlug) redirect("/cart");

  const session = await auth();
  if (!session?.user) {
    redirect(`/login?callbackUrl=${encodeURIComponent(`/checkout?store=${storeSlug}`)}`);
  }

  const store = await getStoreBySlug(storeSlug);
  if (!store) notFound();

  return (
    <CheckoutWizard
      initialPromoCode={promo}
      store={{
        id: store.id,
        slug: store.slug,
        name: store.name,
        address: store.address,
        lat: store.lat,
        lng: store.lng,
        deliveryKm: store.deliveryZones.length ? Math.max(...store.deliveryZones.map((z) => z.maxKm)) : null,
      }}
    />
  );
}
