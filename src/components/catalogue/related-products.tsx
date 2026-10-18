import { ProductCard, type CardProduct, type CardStore } from "@/components/catalogue/product-card";

export function RelatedProducts({ products, store }: { products: CardProduct[]; store: CardStore }) {
  if (products.length === 0) return null;
  return (
    <section className="mt-12">
      <h2 className="mb-4 font-display text-lg font-bold text-rk-navy">More from this aisle</h2>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        {products.map((p) => (
          <li key={p.id}>
            <ProductCard product={p} store={store} />
          </li>
        ))}
      </ul>
    </section>
  );
}
