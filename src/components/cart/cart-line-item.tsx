"use client";

import { useCartStore, type CartItem } from "@/store/cart";
import { formatNaira } from "@/lib/utils";

export function CartLineItem({ item }: { item: CartItem }) {
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const removeItem = useCartStore((s) => s.removeItem);

  return (
    <div className="flex items-center gap-3 py-3">
      <div className="flex size-14 flex-none items-center justify-center rounded-rk-md bg-rk-n50 text-xs text-rk-n400">
        {item.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.image} alt={item.name} className="size-full rounded-rk-md object-cover" />
        ) : (
          "No image"
        )}
      </div>
      <div className="flex-1">
        <div className="text-sm font-medium text-rk-ink">{item.name}</div>
        <div className="font-mono text-sm text-rk-navy">{formatNaira(item.priceKobo)}</div>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => updateQuantity(item.productId, item.branchId, item.quantity - 1)}
          aria-label="Decrease quantity"
          className="grid size-7 place-items-center rounded-rk-sm border border-rk-n200 text-rk-navy"
        >
          −
        </button>
        <span className="w-6 text-center text-sm">{item.quantity}</span>
        <button
          onClick={() => updateQuantity(item.productId, item.branchId, item.quantity + 1)}
          aria-label="Increase quantity"
          className="grid size-7 place-items-center rounded-rk-sm border border-rk-n200 text-rk-navy"
        >
          +
        </button>
      </div>
      <button
        onClick={() => removeItem(item.productId, item.branchId)}
        aria-label={`Remove ${item.name}`}
        className="text-xs text-rk-alert"
      >
        Remove
      </button>
    </div>
  );
}
