import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getStoreBySlug } from "@/lib/stores";
import { StoreSync } from "@/components/store/store-sync";
import { StoreNav } from "@/components/store/store-nav";

export async function generateMetadata({ params }: LayoutProps<"/store/[store]">): Promise<Metadata> {
  const store = await getStoreBySlug((await params).store);
  return store ? { title: { default: store.name, template: `%s · ${store.name} | Robakeye` } } : {};
}

export default async function StoreLayout({ params, children }: LayoutProps<"/store/[store]">) {
  const store = await getStoreBySlug((await params).store);
  if (!store) notFound();

  const deliveryKm = store.deliveryZones.length ? Math.max(...store.deliveryZones.map((z) => z.maxKm)) : null;

  return (
    <>
      <StoreSync store={{ id: store.id, slug: store.slug, name: store.name }} />
      <StoreNav store={{ id: store.id, slug: store.slug, name: store.name, services: store.services }} deliveryKm={deliveryKm} />
      {children}
    </>
  );
}
