"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ShoppingCart } from "lucide-react";
import { useCartStore, groupByStore } from "@/store/cart";
import { getCartLineStatus, type CartLineStatus } from "@/actions/cart";
import { StoreBasket } from "@/components/cart/store-basket";
import { Button } from "@/components/ui/button";
import { storePath } from "@/lib/departments";

export function CartPageClient({ stores }: { stores: { slug: string; name: string }[] }) {
  const items = useCartStore((s) => s.items);
  const setItems = useCartStore((s) => s.setItems);
  const [statuses, setStatuses] = useState<Map<string, CartLineStatus> | null>(null);
  const baskets = useMemo(() => groupByStore(items), [items]);
  const idsKey = items.map((i) => i.productId).sort().join(",");

  // Prices and stock are per store and can change after something was
  // added — check them live, quietly refresh prices, flag stock problems.
  useEffect(() => {
    if (!idsKey) return;
    let cancelled = false;
    getCartLineStatus(idsKey.split(",")).then((rows) => {
      if (cancelled) return;
      const map = new Map(rows.map((r) => [r.productId, r]));
      setStatuses(map);
      const current = useCartStore.getState().items;
      if (current.some((i) => map.get(i.productId)?.exists && map.get(i.productId)!.priceKobo !== i.priceKobo)) {
        setItems(current.map((i) => (map.get(i.productId)?.exists ? { ...i, priceKobo: map.get(i.productId)!.priceKobo } : i)));
      }
    });
    return () => {
      cancelled = true;
    };
  }, [idsKey, setItems]);

  if (items.length === 0) {
    return (
      <div className="mx-auto flex max-w-xl flex-col items-center px-4 py-20 text-center">
        <span className="grid size-16 place-items-center rounded-full bg-rk-lavender-mist text-rk-navy">
          <ShoppingCart className="size-7" aria-hidden />
        </span>
        <h1 className="mt-4 font-display text-2xl font-bold text-rk-navy">Your basket is empty</h1>
        <p className="mt-2 text-rk-n600">Pick a store to start shopping.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {stores.map((s) => (
            <Button key={s.slug} asChild variant="outline" size="sm">
              <Link href={storePath(s.slug)}>{s.name}</Link>
            </Button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <h1 className="font-display text-2xl font-bold text-rk-navy sm:text-3xl">Your basket</h1>
      {baskets.length > 1 ? (
        <p className="mt-1 mb-6 text-sm text-rk-n600">
          You have items from {baskets.length} stores. Each store has its own stock and delivery, so each basket is
          checked out on its own.
        </p>
      ) : (
        <p className="mt-1 mb-6 text-sm text-rk-n600">Everything here comes from {baskets[0].storeName}.</p>
      )}
      <div className="grid gap-6">
        {baskets.map((b) => (
          <StoreBasket key={b.branchId} basket={b} statuses={statuses} />
        ))}
      </div>
    </div>
  );
}
