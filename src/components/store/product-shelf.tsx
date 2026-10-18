import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ProductCard, type CardProduct, type CardStore } from "@/components/catalogue/product-card";

// A horizontally scrolling row on phones, a grid from tablet up.
export function ProductShelf({
  title,
  subtitle,
  href,
  total,
  products,
  store,
}: {
  title: string;
  subtitle?: string;
  href: string;
  total: number;
  products: CardProduct[];
  store: CardStore;
}) {
  if (products.length === 0) return null;
  return (
    <section className="mx-auto w-full max-w-7xl px-4 sm:px-6">
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-xl font-bold text-rk-navy sm:text-2xl">{title}</h2>
          {subtitle && <p className="text-sm text-rk-n600">{subtitle}</p>}
        </div>
        <Link href={href} className="flex flex-none items-center gap-1 text-sm font-semibold text-rk-blue hover:underline">
          See all {total}
          <ArrowRight className="size-4" aria-hidden />
        </Link>
      </div>
      <ul className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:thin] sm:mx-0 sm:grid sm:grid-cols-3 sm:gap-4 sm:overflow-visible sm:px-0 lg:grid-cols-4">
        {products.map((p) => (
          <li key={p.id} className="w-[46%] flex-none snap-start sm:w-auto">
            <ProductCard product={p} store={store} />
          </li>
        ))}
      </ul>
    </section>
  );
}
