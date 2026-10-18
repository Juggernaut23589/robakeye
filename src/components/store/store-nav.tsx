"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PawPrint, Pill, ShoppingBasket, Store as StoreIcon, Truck } from "lucide-react";
import { DEPARTMENTS, storePath, storeShortName, type VerticalKey } from "@/lib/departments";
import { useStoreCartCount } from "@/store/cart";

const ICONS: Record<VerticalKey, typeof Pill> = {
  SUPERMARKET: ShoppingBasket,
  PHARMACY: Pill,
  VETERINARY: PawPrint,
};

// Department tabs for the store being browsed. Only departments this store
// actually runs are shown — Ajadi and Ojoo have no vet clinic tab.
export function StoreNav({
  store,
  deliveryKm,
}: {
  store: { id: string; slug: string; name: string; services: string[] };
  deliveryKm: number | null;
}) {
  const pathname = usePathname();
  const base = storePath(store.slug);
  const basketCount = useStoreCartCount(store.id);
  const tabs = [
    { href: base, label: "Store home", icon: StoreIcon, active: pathname === base },
    ...DEPARTMENTS.filter((d) => store.services.includes(d.vertical)).map((d) => ({
      href: `${base}/${d.key}`,
      label: d.label,
      icon: ICONS[d.vertical],
      active: pathname.startsWith(`${base}/${d.key}`),
    })),
  ];

  return (
    <div className="border-b border-rk-n200 bg-white">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 sm:px-6">
        <nav aria-label={`${store.name} departments`} className="-mb-px flex flex-1 gap-1 overflow-x-auto [scrollbar-width:none]">
          {tabs.map((t) => (
            <Link
              key={t.href}
              href={t.href}
              aria-current={t.active ? "page" : undefined}
              className={`flex flex-none items-center gap-1.5 border-b-2 px-3 py-3 text-sm font-semibold whitespace-nowrap transition-colors ${
                t.active ? "border-rk-amber text-rk-navy" : "border-transparent text-rk-n600 hover:text-rk-navy"
              }`}
            >
              <t.icon className="size-4" aria-hidden />
              {t.label}
            </Link>
          ))}
        </nav>
        <div className="hidden flex-none items-center gap-4 text-xs text-rk-n600 md:flex">
          {deliveryKm && (
            <span className="flex items-center gap-1.5">
              <Truck className="size-3.5" aria-hidden />
              Delivers within {deliveryKm} km
            </span>
          )}
          {basketCount > 0 && (
            <Link href="/cart" className="rounded-rk-pill bg-rk-amber-tint px-2.5 py-1 font-semibold text-rk-amber-deep hover:bg-rk-amber hover:text-rk-navy">
              {basketCount} in your {storeShortName(store.name)} basket
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
