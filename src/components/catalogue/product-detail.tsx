import Link from "next/link";
import { CircleAlert, CircleCheck, MapPin, Truck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ImageGallery } from "@/components/catalogue/image-gallery";
import { AddToCartButton, type BuyableProduct } from "@/components/catalogue/add-to-cart-button";
import { RestockNotifyForm } from "@/components/catalogue/restock-notify-form";
import { RelatedProducts } from "@/components/catalogue/related-products";
import { ReviewsList } from "@/components/catalogue/reviews-list";
import type { CardProduct } from "@/components/catalogue/product-card";
import { formatNaira } from "@/lib/utils";
import { departmentByVertical, departmentPath, productPath, storePath, storeShortName } from "@/lib/departments";

export type ProductDetailData = BuyableProduct & {
  description: string | null;
  category: { slug: string; name: string };
  reviews: { id: string; rating: number; body: string | null; createdAt: Date; user: { name: string } }[];
};

export type SiblingListing = {
  storeSlug: string;
  storeName: string;
  priceKobo: number;
  inStock: boolean;
};

export function ProductDetail({
  product,
  store,
  related,
  siblings,
  deliveryKm,
}: {
  product: ProductDetailData;
  store: { id: string; slug: string; name: string };
  related: CardProduct[];
  siblings: SiblingListing[];
  deliveryKm: number | null;
}) {
  const dept = departmentByVertical(product.vertical)!;
  const short = storeShortName(store.name);
  const inStock = product.stockQuantity > 0;
  const lowStock = inStock && product.stockQuantity <= 5;
  const rating =
    product.reviews.length > 0 ? product.reviews.reduce((s, r) => s + r.rating, 0) / product.reviews.length : null;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <nav aria-label="Breadcrumb" className="mb-5 flex flex-wrap gap-1 text-xs text-rk-n600">
        <Link href={storePath(store.slug)} className="hover:text-rk-navy hover:underline">
          {short} store
        </Link>
        <span aria-hidden>/</span>
        <Link href={departmentPath(store.slug, product.vertical)} className="hover:text-rk-navy hover:underline">
          {dept.label}
        </Link>
        <span aria-hidden>/</span>
        <Link
          href={`${departmentPath(store.slug, product.vertical)}?category=${product.category.slug}`}
          className="hover:text-rk-navy hover:underline"
        >
          {product.category.name}
        </Link>
      </nav>

      <div className="grid gap-8 md:grid-cols-2 lg:gap-12">
        <ImageGallery images={product.images} alt={product.name} />

        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-1.5">
            {product.class === "POM" && <Badge variant="alert">Prescription only</Badge>}
            {product.class === "CONTROLLED" && <Badge variant="alert">In-store only</Badge>}
          </div>
          <h1 className="font-display text-2xl leading-tight font-bold text-rk-navy sm:text-3xl">{product.name}</h1>
          {rating !== null && (
            <a href="#reviews" className="text-sm text-rk-n600 hover:underline">
              <span className="text-rk-amber">{"★".repeat(Math.round(rating))}</span> {rating.toFixed(1)} ·{" "}
              {product.reviews.length} review{product.reviews.length === 1 ? "" : "s"}
            </a>
          )}
          <div className="font-mono text-3xl font-bold text-rk-navy">{formatNaira(product.priceKobo)}</div>
          {product.description && <p className="text-[0.95rem] leading-relaxed text-rk-n600">{product.description}</p>}

          {/* Stock at this store */}
          <div className="rounded-rk-md border border-rk-n200 bg-white p-4">
            <p className="flex items-center gap-2 text-sm font-semibold">
              {inStock ? (
                <>
                  <CircleCheck className="size-4 text-rk-success" aria-hidden />
                  <span className={lowStock ? "text-rk-amber-deep" : "text-rk-success"}>
                    {lowStock ? `Only ${product.stockQuantity} left at ${short}` : `In stock at ${short}`}
                  </span>
                </>
              ) : (
                <>
                  <CircleAlert className="size-4 text-rk-alert" aria-hidden />
                  <span className="text-rk-alert">Out of stock at {short}</span>
                </>
              )}
            </p>
            <p className="mt-1 flex items-start gap-2 text-xs text-rk-n600">
              <MapPin className="mt-0.5 size-3.5 flex-none" aria-hidden />
              Sold and fulfilled by {store.name}
            </p>
            {deliveryKm && (
              <p className="mt-1 flex items-start gap-2 text-xs text-rk-n600">
                <Truck className="mt-0.5 size-3.5 flex-none" aria-hidden />
                Delivery within {deliveryKm} km of the store, or free pickup
              </p>
            )}
          </div>

          <AddToCartButton product={product} store={store} />
          {!inStock && product.class !== "CONTROLLED" && <RestockNotifyForm productId={product.id} storeName={short} />}

          {siblings.length > 0 && (
            <div className="rounded-rk-md bg-rk-lavender-mist p-4">
              <p className="text-xs font-bold tracking-wide text-rk-lavender-deep uppercase">Also sold at</p>
              <ul className="mt-2 grid gap-1.5">
                {siblings.map((s) => (
                  <li key={s.storeSlug} className="flex items-center justify-between gap-3 text-sm">
                    <Link
                      href={productPath(s.storeSlug, product.vertical, product.slug)}
                      className="font-semibold text-rk-navy hover:underline"
                    >
                      {s.storeName}
                    </Link>
                    <span className="flex items-center gap-2 text-xs">
                      <span className="font-mono text-rk-navy">{formatNaira(s.priceKobo)}</span>
                      <span className={s.inStock ? "text-rk-success" : "text-rk-n600"}>
                        {s.inStock ? "In stock" : "Out of stock"}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-rk-n600">Each store is checked out separately.</p>
            </div>
          )}
        </div>
      </div>

      <RelatedProducts products={related} store={store} />
      <div id="reviews">
        <ReviewsList reviews={product.reviews} />
      </div>
    </div>
  );
}
