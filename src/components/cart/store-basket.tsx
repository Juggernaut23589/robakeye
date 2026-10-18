"use client";

import Link from "next/link";
import { ArrowRight, MapPin } from "lucide-react";
import { useCartQuote } from "@/hooks/use-cart-quote";
import { CartLineItem } from "@/components/cart/cart-line-item";
import { OrderSummary } from "@/components/cart/order-summary";
import { FreeDeliveryBar } from "@/components/cart/free-delivery-bar";
import { Button } from "@/components/ui/button";
import { storePath, storeShortName } from "@/lib/departments";
import type { StoreBasket as Basket } from "@/store/cart";
import type { CartLineStatus } from "@/actions/cart";

// One store's basket: its own lines, its own (pickup-estimate) quote and
// its own checkout button. Nothing here is ever combined with another
// store's basket.
export function StoreBasket({ basket, statuses }: { basket: Basket; statuses: Map<string, CartLineStatus> | null }) {
  const { quote, error, loading } = useCartQuote(basket.branchId, "PICKUP", undefined, undefined);
  const short = storeShortName(basket.storeName);
  const count = basket.items.reduce((s, i) => s + i.quantity, 0);

  const blocked =
    statuses !== null &&
    basket.items.some((i) => {
      const s = statuses.get(i.productId);
      return !s || !s.exists || !s.isActive || s.stockQuantity < i.quantity;
    });

  return (
    <section aria-labelledby={`basket-${basket.branchId}`} className="grid gap-4 rounded-rk-lg border border-rk-n200 bg-white p-4 sm:p-6 lg:grid-cols-[1fr_300px] lg:gap-8">
      <div>
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-rk-n200 pb-3">
          <h2 id={`basket-${basket.branchId}`} className="flex items-center gap-2 font-display text-lg font-bold text-rk-navy">
            <MapPin className="size-4 text-rk-amber-deep" aria-hidden />
            {basket.storeName}
            <span className="rounded-rk-pill bg-rk-amber-tint px-2 py-0.5 font-body text-xs font-semibold text-rk-amber-deep">
              {count} item{count === 1 ? "" : "s"}
            </span>
          </h2>
          <Link href={storePath(basket.storeSlug)} className="text-sm font-semibold text-rk-blue hover:underline">
            Keep shopping at {short}
          </Link>
        </header>
        <ul className="divide-y divide-rk-n200">
          {basket.items.map((item) => (
            <CartLineItem key={item.productId} item={item} status={statuses?.get(item.productId)} />
          ))}
        </ul>
      </div>

      <div className="grid content-start gap-3">
        {quote && <FreeDeliveryBar itemsSubtotalKobo={quote.itemsSubtotalKobo} />}
        {loading && !quote ? (
          <div className="h-36 animate-pulse rounded-rk-lg bg-rk-n200 motion-reduce:animate-none" />
        ) : quote ? (
          <OrderSummary quote={quote} showDelivery={false} title={`${short} basket`} />
        ) : error ? (
          <p className="text-sm text-rk-alert">{error}</p>
        ) : null}
        <Button asChild={!blocked} variant="amber" disabled={blocked} className="w-full">
          {blocked ? (
            <span>Fix the items above to check out</span>
          ) : (
            <Link href={`/checkout?store=${basket.storeSlug}`}>
              Checkout at {short}
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          )}
        </Button>
      </div>
    </section>
  );
}
