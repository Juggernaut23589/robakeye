import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { formatNaira } from "@/lib/utils";

export type CardProduct = {
  id: string;
  slug: string;
  name: string;
  priceKobo: number;
  images: string[];
  class: "OTC" | "POM" | "CONTROLLED";
  vertical: "PHARMACY" | "VETERINARY" | "SUPERMARKET";
  inventory: { quantity: number }[];
};

export function ProductCard({ product, view }: { product: CardProduct; view: "grid" | "list" }) {
  const inStock = product.inventory.some((i) => i.quantity > 0);
  const href = `/${product.vertical.toLowerCase()}/${product.slug}`;

  return (
    <Link
      href={href}
      className={
        view === "grid"
          ? "flex flex-col gap-2 rounded-rk-md border border-rk-n200 bg-white p-3"
          : "flex items-center gap-4 rounded-rk-md border border-rk-n200 bg-white p-3"
      }
    >
      <div
        className={
          view === "grid"
            ? "flex h-32 items-center justify-center rounded-rk-md bg-rk-n50 text-xs text-rk-n400"
            : "flex size-20 flex-none items-center justify-center rounded-rk-md bg-rk-n50 text-xs text-rk-n400"
        }
      >
        {product.images[0] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.images[0]} alt={product.name} className="size-full rounded-rk-md object-cover" />
        ) : (
          "No image"
        )}
      </div>
      <div className="flex-1">
        <div className="mb-1 flex flex-wrap gap-1">
          {product.class === "POM" && <Badge variant="alert">Prescription only</Badge>}
          {!inStock && <Badge variant="neutral">Out of stock</Badge>}
        </div>
        <div className={view === "grid" ? "truncate text-sm font-medium text-rk-ink" : "font-medium text-rk-ink"}>
          {product.name}
        </div>
        <div className="mt-1 font-mono text-sm font-bold text-rk-navy">{formatNaira(product.priceKobo)}</div>
      </div>
    </Link>
  );
}
