import { useEffect, useState } from "react";
import { useCartStore } from "@/store/cart";
import { getCartQuote } from "@/actions/orders";
import type { OrderCalculation, DeliveryMethod } from "@/lib/orderCalculation";

// Per docs/technical-architecture.html: "the frontend never recomputes
// totals locally for anything but an optimistic UI preview" — this hook
// always asks the server (POST /v1/cart/quote's equivalent) rather than
// computing kobo math in the browser.
export function useCartQuote(
  deliveryMethod: DeliveryMethod,
  addressId: string | undefined,
  promoCode: string | undefined,
) {
  const items = useCartStore((s) => s.items);
  const [quote, setQuote] = useState<OrderCalculation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const itemsKey = JSON.stringify(items.map((i) => [i.productId, i.branchId, i.quantity]));

  useEffect(() => {
    // No synchronous setState for the empty-cart case: callers already
    // render nothing when items.length === 0, so the stale `quote` value
    // never actually gets shown — see the itemsLength===0 guard below.
    if (items.length === 0) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect -- react.dev's own "fetching data in an effect" idiom; no non-effect alternative for "inputs changed, start a new request"
    setLoading(true);
    getCartQuote({
      items: items.map((i) => ({ productId: i.productId, branchId: i.branchId, quantity: i.quantity })),
      deliveryMethod,
      addressId,
      promoCode: promoCode || undefined,
    }).then((res) => {
      setLoading(false);
      if (res.ok) {
        setQuote(res.result);
        setError(res.result.promoError ?? null);
      } else {
        setQuote(null);
        setError(res.error);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- itemsKey is the intentional stable dep for the items array
  }, [itemsKey, deliveryMethod, addressId, promoCode]);

  return { quote: items.length === 0 ? null : quote, error, loading };
}
