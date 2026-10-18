import { useEffect, useState } from "react";
import { useCartStore } from "@/store/cart";
import { getCartQuote } from "@/actions/orders";
import type { OrderCalculation, DeliveryMethod } from "@/lib/orderCalculation";

// Server-computed quote for ONE store's basket. Per
// docs/technical-architecture.html the browser never computes totals
// itself; this always asks the server.
export function useCartQuote(
  branchId: string | null,
  deliveryMethod: DeliveryMethod,
  addressId: string | undefined,
  promoCode: string | undefined,
) {
  const items = useCartStore((s) => s.items);
  const basket = branchId ? items.filter((i) => i.branchId === branchId) : [];
  const [quote, setQuote] = useState<OrderCalculation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const basketKey = JSON.stringify(basket.map((i) => [i.productId, i.quantity]));

  useEffect(() => {
    if (!branchId || basket.length === 0) return;
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- react.dev's "fetching data in an effect" idiom
    setLoading(true);
    getCartQuote({
      branchId,
      items: basket.map((i) => ({ productId: i.productId, quantity: i.quantity })),
      deliveryMethod,
      addressId,
      promoCode: promoCode || undefined,
    }).then((res) => {
      if (cancelled) return;
      setLoading(false);
      if (res.ok) {
        setQuote(res.result);
        setError(res.result.promoError ?? null);
      } else {
        setQuote(null);
        setError(res.error);
      }
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- basketKey is the stable dep for the basket array
  }, [branchId, basketKey, deliveryMethod, addressId, promoCode]);

  return { quote: basket.length === 0 ? null : quote, error, loading };
}
