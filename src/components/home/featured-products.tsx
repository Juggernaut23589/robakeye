import Link from "next/link";
import { formatNaira } from "@/lib/utils";

export type FeaturedProduct = {
  id: string;
  slug: string;
  name: string;
  priceKobo: number;
  vertical: string;
  images: string[];
};

// Queried for real against the Product table (see (customer)/page.tsx) —
// there simply isn't any data yet (catalogue is Milestone 5), so this
// renders an honest empty state instead of fabricated sample products.
export function FeaturedProducts({ products }: { products: FeaturedProduct[] }) {
  return (
    <section className="mx-auto max-w-6xl px-4 py-10 sm:px-8">
      <h2 className="mb-5 font-display text-2xl font-bold text-rk-navy">Trending This Week</h2>

      {products.length === 0 ? (
        <p className="rounded-rk-md border border-dashed border-rk-n200 p-8 text-center text-sm text-rk-n600">
          The product catalogue launches in the next milestone — check back soon.
        </p>
      ) : (
        <div className="flex snap-x gap-4 overflow-x-auto pb-2">
          {products.map((p) => (
            <Link
              key={p.id}
              href={`/${p.vertical.toLowerCase()}/${p.slug}`}
              className="w-46 flex-none snap-start rounded-rk-md border border-rk-n200 bg-white p-3"
            >
              <div className="mb-2 flex h-28 items-center justify-center rounded-rk-md bg-rk-n50 text-xs text-rk-n400">
                {p.images[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.images[0]} alt={p.name} className="size-full rounded-rk-md object-cover" />
                ) : (
                  "No image"
                )}
              </div>
              <div className="truncate text-sm font-medium text-rk-ink">{p.name}</div>
              <div className="mt-1 font-mono text-sm font-bold text-rk-navy">
                {formatNaira(p.priceKobo)}
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
