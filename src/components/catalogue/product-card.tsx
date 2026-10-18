import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { ProductImage } from "@/components/catalogue/product-image";
import { QuickAddButton } from "@/components/catalogue/quick-add-button";
import { formatNaira } from "@/lib/utils";
import { productPath } from "@/lib/departments";

export type CardProduct = {
  id: string;
  slug: string;
  name: string;
  priceKobo: number;
  images: string[];
  class: "OTC" | "POM" | "CONTROLLED";
  vertical: "PHARMACY" | "VETERINARY" | "SUPERMARKET";
  stockQuantity: number;
};

export type CardStore = { id: string; slug: string; name: string };

// Every card belongs to one store: its link, price, stock and quick-add
// are that store's listing — never a blend across stores.
export function ProductCard({
  product,
  store,
  view = "grid",
}: {
  product: CardProduct;
  store: CardStore;
  view?: "grid" | "list";
}) {
  const inStock = product.stockQuantity > 0;
  const lowStock = inStock && product.stockQuantity <= 5;
  const href = productPath(store.slug, product.vertical, product.slug);

  return (
    <div
      className={
        view === "grid"
          ? "group relative flex flex-col overflow-hidden rounded-rk-lg border border-rk-n200 bg-white transition-shadow hover:shadow-[0_14px_30px_-18px_rgba(27,30,109,0.35)]"
          : "group relative flex items-center gap-4 rounded-rk-lg border border-rk-n200 bg-white p-3"
      }
    >
      <Link href={href} className={view === "grid" ? "block" : "flex-none"} aria-label={product.name}>
        <ProductImage
          src={product.images[0]}
          alt={product.name}
          className={view === "grid" ? "aspect-square w-full" : "size-20 rounded-rk-md"}
          imgClassName={`transition-transform duration-300 group-hover:scale-[1.03] ${!inStock ? "opacity-60 grayscale-[35%]" : ""}`}
        />
      </Link>
      {view === "grid" && (
        <div className="pointer-events-none absolute top-2 left-2 flex flex-col items-start gap-1">
          {product.class === "POM" && <Badge variant="alert">Prescription</Badge>}
          {!inStock && <Badge variant="neutral">Out of stock</Badge>}
          {lowStock && <Badge variant="amber">Only {product.stockQuantity} left</Badge>}
        </div>
      )}
      <div className={view === "grid" ? "flex flex-1 flex-col gap-1 p-3" : "flex flex-1 flex-col gap-1"}>
        {view === "list" && (
          <div className="flex flex-wrap gap-1">
            {product.class === "POM" && <Badge variant="alert">Prescription</Badge>}
            {!inStock && <Badge variant="neutral">Out of stock</Badge>}
            {lowStock && <Badge variant="amber">Only {product.stockQuantity} left</Badge>}
          </div>
        )}
        <Link href={href} className="line-clamp-2 min-h-[2.5rem] text-sm leading-snug font-medium text-rk-ink hover:text-rk-blue">
          {product.name}
        </Link>
        <div className="mt-auto flex items-center justify-between gap-2 pt-1">
          <span className="font-mono text-[0.95rem] font-bold text-rk-navy">{formatNaira(product.priceKobo)}</span>
          {product.class === "OTC" && inStock && <QuickAddButton product={product} store={store} />}
        </div>
      </div>
    </div>
  );
}
