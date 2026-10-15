"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { ImageGallery } from "@/components/catalogue/image-gallery";
import { BranchAvailabilityWidget } from "@/components/catalogue/branch-availability";
import { AddToCartButton } from "@/components/catalogue/add-to-cart-button";
import { RelatedProducts } from "@/components/catalogue/related-products";
import { ReviewsList } from "@/components/catalogue/reviews-list";
import { formatNaira } from "@/lib/utils";

export type ProductDetailData = {
  id: string;
  name: string;
  description: string | null;
  priceKobo: number;
  images: string[];
  class: "OTC" | "POM" | "CONTROLLED";
  category: { slug: string; name: string };
  reviews: { id: string; rating: number; body: string | null; createdAt: Date; user: { name: string } }[];
};

export function ProductDetail({
  product,
  related,
}: {
  product: ProductDetailData;
  related: { id: string; slug: string; name: string; priceKobo: number; vertical: string }[];
}) {
  const [branch, setBranch] = useState<{ id: string; name: string } | null>(null);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-8">
      <div className="grid gap-8 sm:grid-cols-2">
        <ImageGallery images={product.images} alt={product.name} />

        <div className="flex flex-col gap-3">
          <span className="text-xs text-rk-n600">{product.category.name}</span>
          <h1 className="font-display text-2xl font-bold text-rk-navy">{product.name}</h1>
          {product.class === "POM" && <Badge variant="alert">Prescription only</Badge>}
          <div className="font-mono text-xl font-bold text-rk-navy">
            {formatNaira(product.priceKobo)}
          </div>
          {product.description && <p className="text-sm text-rk-n600">{product.description}</p>}

          <BranchAvailabilityWidget
            productId={product.id}
            onBranchSelect={(id, name) => setBranch({ id, name })}
          />

          <div className="mt-2">
            <AddToCartButton
              product={product}
              branchId={branch?.id ?? null}
              branchName={branch?.name ?? null}
            />
          </div>
        </div>
      </div>

      <RelatedProducts products={related} />
      <ReviewsList reviews={product.reviews} />
    </div>
  );
}
