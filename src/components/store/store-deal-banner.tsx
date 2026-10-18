"use client";

import { useEffect, useState } from "react";
import { Check, Sparkles } from "lucide-react";
import { useCartStore } from "@/store/cart";
import { ProductImage } from "@/components/catalogue/product-image";
import { Button } from "@/components/ui/button";
import { formatNaira } from "@/lib/utils";
import type { CardProduct, CardStore } from "@/components/catalogue/product-card";

function remaining(endsAt: string) {
  const diff = Math.max(0, new Date(endsAt).getTime() - Date.now());
  return {
    days: Math.floor(diff / 86_400_000),
    hours: Math.floor((diff % 86_400_000) / 3_600_000),
    mins: Math.floor((diff % 3_600_000) / 60_000),
  };
}

// The store's featured bundle (ComboDeal, isFeatured). The discount itself
// is applied server-side by the order engine whenever every item is in the
// basket — this just makes the bundle easy to add in one go.
export function StoreDealBanner({
  deal,
  products,
  store,
}: {
  deal: {
    name: string;
    bannerHeadline: string | null;
    endsAt: string;
    discountType: "FIXED_PRICE" | "PERCENT_OFF";
    valueKobo: number | null;
    percentOff: number | null;
  };
  products: CardProduct[];
  store: CardStore;
}) {
  const addItem = useCartStore((s) => s.addItem);
  const [left, setLeft] = useState(() => remaining(deal.endsAt));
  const [added, setAdded] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setLeft(remaining(deal.endsAt)), 30_000);
    return () => clearInterval(t);
  }, [deal.endsAt]);

  const fullPrice = products.reduce((s, p) => s + p.priceKobo, 0);
  const bundlePrice =
    deal.discountType === "FIXED_PRICE" && deal.valueKobo != null
      ? Math.min(fullPrice, deal.valueKobo)
      : deal.percentOff != null
        ? Math.round(fullPrice * (1 - deal.percentOff / 100))
        : fullPrice;
  const saving = fullPrice - bundlePrice;
  const available = products.every((p) => p.stockQuantity > 0 && p.class === "OTC");

  function addBundle() {
    for (const p of products) {
      addItem({
        productId: p.id,
        branchId: store.id,
        storeSlug: store.slug,
        storeName: store.name,
        slug: p.slug,
        vertical: p.vertical,
        name: p.name,
        priceKobo: p.priceKobo,
        image: p.images[0] ?? null,
      });
    }
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  }

  return (
    <section className="mx-auto w-full max-w-7xl px-4 sm:px-6">
      <div className="grid gap-6 overflow-hidden rounded-rk-lg bg-rk-navy p-6 text-white sm:p-8 lg:grid-cols-[1.1fr_1fr] lg:items-center">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-rk-pill bg-rk-amber px-3 py-1 text-xs font-bold text-rk-navy">
            <Sparkles className="size-3.5" aria-hidden />
            {store.name.split(" (")[0]} bundle deal
          </span>
          <h2 className="mt-3 font-display text-2xl font-bold sm:text-3xl">{deal.name}</h2>
          <p className="mt-1 text-white/80">{deal.bannerHeadline ?? "Bundled together for less, for a limited time."}</p>
          <div className="mt-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="font-mono text-3xl font-bold text-rk-amber">{formatNaira(bundlePrice)}</span>
            {saving > 0 && (
              <>
                <span className="font-mono text-white/60 line-through">{formatNaira(fullPrice)}</span>
                <span className="rounded-rk-pill bg-white/15 px-2 py-0.5 text-xs font-semibold">Save {formatNaira(saving)}</span>
              </>
            )}
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-4">
            <Button variant="amber" onClick={addBundle} disabled={!available}>
              {added ? (
                <>
                  <Check className="size-4" aria-hidden /> Added to basket
                </>
              ) : available ? (
                "Add bundle to basket"
              ) : (
                "Part of this bundle is out of stock"
              )}
            </Button>
            <span className="text-sm text-white/75">
              Ends in {left.days > 0 && `${left.days}d `}
              {left.hours}h {left.mins}m
            </span>
          </div>
        </div>
        <ul className="grid grid-cols-3 gap-3">
          {products.map((p) => (
            <li key={p.id} className="rounded-rk-md bg-white p-2 text-rk-ink">
              <ProductImage src={p.images[0]} alt={p.name} className="aspect-square rounded-rk-sm" />
              <p className="mt-1.5 line-clamp-2 text-xs font-medium">{p.name}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
