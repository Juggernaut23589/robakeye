import type { Vertical } from "@prisma/client";
import { listProducts, getCategoriesForVertical, type SortKey } from "@/lib/catalogue";
import { CategorySidebar } from "@/components/catalogue/category-sidebar";
import { FilterBar } from "@/components/catalogue/filter-bar";
import { ProductCard } from "@/components/catalogue/product-card";
import { Pagination } from "@/components/catalogue/pagination";

export type ListingSearchParams = {
  category?: string;
  minPrice?: string;
  maxPrice?: string;
  inStock?: string;
  sort?: string;
  view?: string;
  page?: string;
};

export async function ProductListing({
  vertical,
  title,
  basePath,
  searchParams,
}: {
  vertical: Vertical;
  title: string;
  basePath: string;
  searchParams: ListingSearchParams;
}) {
  const [categories, listing] = await Promise.all([
    getCategoriesForVertical(vertical),
    listProducts(vertical, {
      category: searchParams.category,
      minPrice: searchParams.minPrice ? Number(searchParams.minPrice) : undefined,
      maxPrice: searchParams.maxPrice ? Number(searchParams.maxPrice) : undefined,
      inStockOnly: searchParams.inStock === "1",
      sort: (searchParams.sort as SortKey) ?? "newest",
      page: searchParams.page ? Number(searchParams.page) : 1,
    }),
  ]);

  const view = searchParams.view === "list" ? "list" : "grid";

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-8">
      <h1 className="mb-6 font-display text-2xl font-bold text-rk-navy">{title}</h1>
      <div className="flex flex-col gap-6 sm:flex-row">
        <CategorySidebar basePath={basePath} categories={categories} activeSlug={searchParams.category} />
        <div className="flex-1">
          <FilterBar />
          {listing.items.length === 0 ? (
            <p className="rounded-rk-md border border-dashed border-rk-n200 p-8 text-center text-sm text-rk-n600">
              No products match these filters.
            </p>
          ) : (
            <div className={view === "grid" ? "grid grid-cols-2 gap-4 sm:grid-cols-3" : "flex flex-col gap-3"}>
              {listing.items.map((p) => (
                <ProductCard key={p.id} product={p} view={view} />
              ))}
            </div>
          )}
          <Pagination page={listing.page} pageCount={listing.pageCount} searchParams={searchParams} />
        </div>
      </div>
    </div>
  );
}
