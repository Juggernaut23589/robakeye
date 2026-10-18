import { cache } from "react";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { STORE_COOKIE } from "@/lib/departments";

// Each branch is a separate store. These are the only helpers pages use to
// resolve "which store am I in" — from the URL first, the cookie second.

const storeSelect = {
  id: true,
  slug: true,
  name: true,
  address: true,
  lat: true,
  lng: true,
  phone: true,
  hours: true,
  services: true,
  tagline: true,
  coverImage: true,
} as const;

export const getStores = cache(async () => {
  const stores = await prisma.branch.findMany({ select: storeSelect, orderBy: { createdAt: "asc" } });
  // Flagship (most departments) last, so the two neighbourhood stores read
  // first and the "full" store anchors the row.
  return stores.sort((a, b) => a.services.length - b.services.length || a.name.localeCompare(b.name));
});

export type Store = Awaited<ReturnType<typeof getStores>>[number];

export const getStoreBySlug = cache(async (slug: string) => {
  return prisma.branch.findUnique({
    where: { slug },
    select: { ...storeSelect, deliveryZones: { select: { maxKm: true, baseFeeKobo: true, perKmFeeKobo: true } } },
  });
});

// The store the visitor last shopped at (set client-side when a store page
// mounts). Only used for redirects and "continue shopping" hints — never
// to decide which store an order belongs to.
export async function getRememberedStore() {
  const id = (await cookies()).get(STORE_COOKIE)?.value;
  if (!id) return null;
  const stores = await getStores();
  return stores.find((s) => s.id === id) ?? null;
}
