"use client";

import { useState } from "react";
import { Check, Plus } from "lucide-react";
import { useCartStore } from "@/store/cart";
import type { CardProduct, CardStore } from "@/components/catalogue/product-card";

// One-tap add from a product card (OTC, in stock only — POM and
// controlled items need the product page's prescription/consult flow).
export function QuickAddButton({ product, store }: { product: CardProduct; store: CardStore }) {
  const addItem = useCartStore((s) => s.addItem);
  const inCart = useCartStore((s) => s.items.find((i) => i.productId === product.id)?.quantity ?? 0);
  const [justAdded, setJustAdded] = useState(false);
  const atLimit = inCart >= product.stockQuantity;

  return (
    <button
      type="button"
      disabled={atLimit}
      onClick={() => {
        addItem({
          productId: product.id,
          branchId: store.id,
          storeSlug: store.slug,
          storeName: store.name,
          slug: product.slug,
          vertical: product.vertical,
          name: product.name,
          priceKobo: product.priceKobo,
          image: product.images[0] ?? null,
        });
        setJustAdded(true);
        setTimeout(() => setJustAdded(false), 1400);
      }}
      aria-label={atLimit ? `All available ${product.name} are in your basket` : `Add ${product.name} to basket`}
      title={atLimit ? "You have all available stock in your basket" : "Add to basket"}
      className="relative grid size-9 flex-none place-items-center rounded-full bg-rk-amber text-rk-navy transition-[transform,background-color] hover:bg-[#D97F18] active:scale-95 disabled:cursor-not-allowed disabled:bg-rk-n200 disabled:text-rk-n400"
    >
      {justAdded ? <Check className="size-4" aria-hidden /> : <Plus className="size-4" aria-hidden />}
      {inCart > 0 && !justAdded && (
        <span className="absolute -top-1 -right-1 grid min-w-4 place-items-center rounded-full bg-rk-navy px-1 font-mono text-[0.6rem] font-bold text-white">
          {inCart}
        </span>
      )}
    </button>
  );
}
