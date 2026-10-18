"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Check, FileText, Minus, Plus, ShoppingCart } from "lucide-react";
import { useSession } from "next-auth/react";
import { useCartStore, MAX_LINE_QUANTITY } from "@/store/cart";
import { getApprovedPrescriptionQuantity } from "@/actions/prescriptions";
import { Button } from "@/components/ui/button";
import { storeShortName, type VerticalKey } from "@/lib/departments";

export type BuyableProduct = {
  id: string;
  slug: string;
  name: string;
  priceKobo: number;
  images: string[];
  class: "OTC" | "POM" | "CONTROLLED";
  vertical: VerticalKey;
  stockQuantity: number;
};

// Adds THIS store's listing to the basket. Quantity is capped by the
// store's stock (and, for prescription-only medicine, by the approved
// prescription quantity) — the server re-checks both at checkout.
export function AddToCartButton({
  product,
  store,
}: {
  product: BuyableProduct;
  store: { id: string; slug: string; name: string };
}) {
  const { status } = useSession();
  const addItem = useCartStore((s) => s.addItem);
  const inCart = useCartStore((s) => s.items.find((i) => i.productId === product.id)?.quantity ?? 0);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [approvedQty, setApprovedQty] = useState<number | null>(null);

  useEffect(() => {
    if (product.class !== "POM" || status !== "authenticated") return;
    getApprovedPrescriptionQuantity(product.id).then(setApprovedQty);
  }, [product.id, product.class, status]);

  // docs/pharmacy-vet-compliance.html: CONTROLLED has no purchase path.
  if (product.class === "CONTROLLED") {
    return (
      <p className="rounded-rk-md bg-rk-alert-tint px-4 py-3 text-sm text-rk-alert">
        Dispensed in store only, after a consultation with {storeShortName(store.name)}&apos;s pharmacist. This
        medicine can&apos;t be ordered online.
      </p>
    );
  }

  if (product.stockQuantity === 0) return null; // the page shows the restock form instead

  let limit = Math.min(MAX_LINE_QUANTITY, product.stockQuantity);
  if (product.class === "POM") {
    if (status === "loading" || (status === "authenticated" && approvedQty === null)) {
      return <div className="h-11 w-56 animate-pulse rounded-rk-pill bg-rk-n200 motion-reduce:animate-none" />;
    }
    const approved = approvedQty ?? 0;
    if (approved === 0) {
      return (
        <div className="grid gap-2 rounded-rk-md border border-rk-n200 bg-rk-n50 p-4">
          <p className="flex items-start gap-2 text-sm text-rk-ink">
            <FileText className="mt-0.5 size-4 flex-none text-rk-blue" aria-hidden />
            Prescription-only. Upload your prescription and {storeShortName(store.name)}&apos;s pharmacist will review
            it — you can order as soon as it&apos;s approved.
          </p>
          <Button asChild variant="amber" className="w-fit">
            <Link href={status === "authenticated" ? `/pharmacy/consult?product=${product.id}` : `/login?callbackUrl=${encodeURIComponent(`/pharmacy/consult?product=${product.id}`)}`}>
              Upload prescription
            </Link>
          </Button>
        </div>
      );
    }
    limit = Math.min(limit, approved);
  }

  const remaining = Math.max(0, limit - inCart);
  const safeQty = Math.min(qty, Math.max(1, remaining));

  if (remaining === 0) {
    return (
      <div className="grid gap-2">
        <Button asChild variant="outline" className="w-fit">
          <Link href="/cart">
            <Check className="size-4" aria-hidden /> {inCart} in your basket — view basket
          </Link>
        </Button>
        <p className="text-xs text-rk-n600">
          {product.class === "POM" ? "That's everything your prescription covers." : "That's all the stock this store has."}
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center rounded-rk-pill border border-rk-n200 bg-white">
          <button
            type="button"
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            disabled={safeQty <= 1}
            aria-label="Decrease quantity"
            className="grid size-10 place-items-center rounded-full text-rk-navy disabled:text-rk-n400"
          >
            <Minus className="size-4" aria-hidden />
          </button>
          <span className="w-8 text-center font-mono text-sm font-semibold" aria-live="polite">
            {safeQty}
          </span>
          <button
            type="button"
            onClick={() => setQty((q) => Math.min(remaining, q + 1))}
            disabled={safeQty >= remaining}
            aria-label="Increase quantity"
            className="grid size-10 place-items-center rounded-full text-rk-navy disabled:text-rk-n400"
          >
            <Plus className="size-4" aria-hidden />
          </button>
        </div>
        <Button
          variant="amber"
          className="min-w-48"
          onClick={() => {
            addItem(
              {
                productId: product.id,
                branchId: store.id,
                storeSlug: store.slug,
                storeName: store.name,
                slug: product.slug,
                vertical: product.vertical,
                name: product.name,
                priceKobo: product.priceKobo,
                image: product.images[0] ?? null,
              },
              safeQty,
            );
            setQty(1);
            setAdded(true);
            setTimeout(() => setAdded(false), 2000);
          }}
        >
          {added ? <Check className="size-4" aria-hidden /> : <ShoppingCart className="size-4" aria-hidden />}
          {added ? "Added to basket" : `Add to ${storeShortName(store.name)} basket`}
        </Button>
      </div>
      {product.class === "POM" && approvedQty !== null && (
        <span className="text-xs text-rk-success">
          Prescription approved — up to {approvedQty} can be ordered
          {inCart > 0 ? ` (${inCart} already in your basket)` : ""}.
        </span>
      )}
      {inCart > 0 && product.class !== "POM" && (
        <Link href="/cart" className="text-xs font-semibold text-rk-blue hover:underline">
          {inCart} already in your basket — view basket
        </Link>
      )}
    </div>
  );
}
