"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useCartStore } from "@/store/cart";
import { getApprovedPrescriptionQuantity } from "@/actions/prescriptions";
import { Button } from "@/components/ui/button";

export function AddToCartButton({
  product,
  branchId,
  branchName,
}: {
  product: { id: string; name: string; priceKobo: number; images: string[]; class: string };
  branchId: string | null;
  branchName: string | null;
}) {
  const addItem = useCartStore((s) => s.addItem);
  const cartQuantity = useCartStore((s) =>
    s.items.find((i) => i.productId === product.id && i.branchId === branchId)?.quantity ?? 0,
  );
  const [added, setAdded] = useState(false);
  const [approvedQty, setApprovedQty] = useState<number | null>(null);

  useEffect(() => {
    if (product.class !== "POM") return;
    getApprovedPrescriptionQuantity(product.id).then(setApprovedQty);
  }, [product.id, product.class]);

  // Per docs/pharmacy-vet-compliance.html: CONTROLLED has no purchase path
  // on any channel.
  if (product.class === "CONTROLLED") {
    return (
      <p className="rounded-rk-md bg-rk-alert-tint px-3 py-2 text-sm text-rk-alert">
        This item is available in-branch only, with pharmacist consultation — it cannot be
        purchased online.
      </p>
    );
  }

  // POM: purchasable only up to a pharmacist-approved, not-yet-expired
  // prescription line quantity — never just because it's in the catalogue.
  if (product.class === "POM") {
    if (approvedQty === null) {
      return (
        <div className="h-10 w-48 animate-pulse rounded-rk-pill bg-rk-n200 motion-reduce:animate-none" />
      );
    }
    const remaining = approvedQty - cartQuantity;
    if (remaining <= 0) {
      return (
        <Button asChild variant="amber">
          <Link href={`/pharmacy/consult?product=${product.id}`}>Consult Pharmacist to Order</Link>
        </Button>
      );
    }
    if (!branchId) {
      return (
        <Button disabled variant="outline">
          Select a branch to add to cart
        </Button>
      );
    }
    return (
      <div className="grid gap-1">
        <Button
          variant="amber"
          onClick={() => {
            addItem({
              productId: product.id,
              branchId,
              name: product.name,
              priceKobo: product.priceKobo,
              image: product.images[0] ?? null,
            });
            setAdded(true);
            setTimeout(() => setAdded(false), 2000);
          }}
        >
          {added ? "Added ✓" : `Add to basket${branchName ? ` (${branchName})` : ""}`}
        </Button>
        <span className="text-xs text-rk-success">
          Approved by pharmacist — {remaining} of {approvedQty} remaining to order
        </span>
      </div>
    );
  }

  if (!branchId) {
    return (
      <Button disabled variant="outline">
        Select a branch to add to cart
      </Button>
    );
  }

  return (
    <Button
      variant="amber"
      onClick={() => {
        addItem({
          productId: product.id,
          branchId,
          name: product.name,
          priceKobo: product.priceKobo,
          image: product.images[0] ?? null,
        });
        setAdded(true);
        setTimeout(() => setAdded(false), 2000);
      }}
    >
      {added ? "Added ✓" : `Add to basket${branchName ? ` (${branchName})` : ""}`}
    </Button>
  );
}
