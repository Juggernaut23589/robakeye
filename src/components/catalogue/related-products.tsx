import Link from "next/link";
import { formatNaira } from "@/lib/utils";

type RelatedProduct = {
  id: string;
  slug: string;
  name: string;
  priceKobo: number;
  vertical: string;
};

export function RelatedProducts({ products }: { products: RelatedProduct[] }) {
  if (products.length === 0) return null;
  return (
    <section className="mt-10">
      <h2 className="mb-4 font-display text-lg font-bold text-rk-navy">You may also like</h2>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {products.map((p) => (
          <Link
            key={p.id}
            href={`/${p.vertical.toLowerCase()}/${p.slug}`}
            className="rounded-rk-md border border-rk-n200 p-3"
          >
            <div className="truncate text-sm font-medium text-rk-ink">{p.name}</div>
            <div className="mt-1 font-mono text-sm font-bold text-rk-navy">
              {formatNaira(p.priceKobo)}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
