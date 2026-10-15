"use client";

import { useState } from "react";
import Link from "next/link";
import { useCartStore } from "@/store/cart";
import { useCartQuote } from "@/hooks/use-cart-quote";
import { CartBranchGroup } from "@/components/cart/cart-branch-group";
import { OrderSummary } from "@/components/cart/order-summary";
import { PromoCodeForm } from "@/components/cart/promo-code-form";
import { FreeDeliveryBar } from "@/components/cart/free-delivery-bar";
import { Button } from "@/components/ui/button";

export function CartPageClient({ branchNameById }: { branchNameById: Record<string, string> }) {
  const items = useCartStore((s) => s.items);
  const [promoCode, setPromoCode] = useState<string | undefined>(undefined);
  // Pickup estimate on the cart page (no address chosen yet) — delivery's
  // real fee is computed once an address exists, at checkout.
  const { quote, error, loading } = useCartQuote("PICKUP", undefined, promoCode);

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="font-display text-2xl font-bold text-rk-navy">Your cart is empty</h1>
        <p className="mt-2 text-rk-n600">Browse the catalogue to add something.</p>
        <Button asChild className="mt-4">
          <Link href="/pharmacy">Start shopping</Link>
        </Button>
      </div>
    );
  }

  const groups = new Map<string, typeof items>();
  for (const item of items) {
    const list = groups.get(item.branchId) ?? [];
    list.push(item);
    groups.set(item.branchId, list);
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-8">
      <h1 className="mb-6 font-display text-2xl font-bold text-rk-navy">Your cart</h1>
      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <div className="grid gap-6">
          {Array.from(groups.entries()).map(([branchId, groupItems]) => (
            <CartBranchGroup
              key={branchId}
              branchName={branchNameById[branchId] ?? "Branch"}
              items={groupItems}
            />
          ))}
        </div>

        <div className="grid gap-4">
          {quote && <FreeDeliveryBar itemsSubtotalKobo={quote.itemsSubtotalKobo} />}
          <PromoCodeForm appliedCode={promoCode} onApply={setPromoCode} error={error} />
          {loading && !quote ? (
            <div className="h-40 animate-pulse rounded-rk-md bg-rk-n200 motion-reduce:animate-none" />
          ) : quote ? (
            <>
              <OrderSummary quote={quote} />
              <Button asChild variant="amber">
                <Link href={promoCode ? `/checkout?promo=${encodeURIComponent(promoCode)}` : "/checkout"}>
                  Proceed to checkout
                </Link>
              </Button>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
