"use client";

import Link from "next/link";
import { Minus, Plus, Trash2 } from "lucide-react";
import { useCartStore, type CartItem } from "@/store/cart";
import { ProductImage } from "@/components/catalogue/product-image";
import { formatNaira } from "@/lib/utils";
import { productPath } from "@/lib/departments";
import type { CartLineStatus } from "@/actions/cart";

export function CartLineItem({ item, status }: { item: CartItem; status?: CartLineStatus }) {
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const removeItem = useCartStore((s) => s.removeItem);
  const href = productPath(item.storeSlug, item.vertical, item.slug);

  const unavailable = status && (!status.exists || !status.isActive);
  const outOfStock = status && !unavailable && status.stockQuantity === 0;
  const overStock = status && !unavailable && !outOfStock && status.stockQuantity < item.quantity;
  const maxQty = status && !unavailable ? Math.max(1, status.stockQuantity) : 99;

  return (
    <li className="flex gap-3 py-4">
      <Link href={href} className="flex-none">
        <ProductImage src={item.image} alt={item.name} className="size-20 rounded-rk-md border border-rk-n200" />
      </Link>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-start justify-between gap-3">
          <Link href={href} className="line-clamp-2 text-sm font-medium text-rk-ink hover:text-rk-blue">
            {item.name}
          </Link>
          <span className="font-mono text-sm font-bold whitespace-nowrap text-rk-navy">
            {formatNaira(item.priceKobo * item.quantity)}
          </span>
        </div>
        <span className="font-mono text-xs text-rk-n600">{formatNaira(item.priceKobo)} each</span>

        {unavailable && <p className="text-xs font-semibold text-rk-alert">No longer sold at this store — please remove it.</p>}
        {outOfStock && <p className="text-xs font-semibold text-rk-alert">Out of stock at this store right now.</p>}
        {overStock && (
          <p className="text-xs font-semibold text-rk-amber-deep">
            Only {status!.stockQuantity} left —{" "}
            <button type="button" className="underline" onClick={() => updateQuantity(item.productId, status!.stockQuantity)}>
              reduce to {status!.stockQuantity}
            </button>
          </p>
        )}

        <div className="mt-1 flex items-center justify-between">
          <div className="flex items-center rounded-rk-pill border border-rk-n200">
            <button
              type="button"
              onClick={() => updateQuantity(item.productId, item.quantity - 1)}
              aria-label={`Decrease quantity of ${item.name}`}
              className="grid size-8 place-items-center rounded-full text-rk-navy hover:bg-rk-n50"
            >
              <Minus className="size-3.5" aria-hidden />
            </button>
            <span className="w-7 text-center font-mono text-sm" aria-label="Quantity">
              {item.quantity}
            </span>
            <button
              type="button"
              onClick={() => updateQuantity(item.productId, item.quantity + 1)}
              disabled={!!unavailable || item.quantity >= maxQty}
              aria-label={`Increase quantity of ${item.name}`}
              className="grid size-8 place-items-center rounded-full text-rk-navy hover:bg-rk-n50 disabled:text-rk-n400"
            >
              <Plus className="size-3.5" aria-hidden />
            </button>
          </div>
          <button
            type="button"
            onClick={() => removeItem(item.productId)}
            aria-label={`Remove ${item.name}`}
            className="flex items-center gap-1 rounded-rk-pill px-2 py-1 text-xs font-semibold text-rk-n600 hover:bg-rk-alert-tint hover:text-rk-alert"
          >
            <Trash2 className="size-3.5" aria-hidden /> Remove
          </button>
        </div>
      </div>
    </li>
  );
}
