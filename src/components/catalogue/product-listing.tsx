import Link from "next/link";
import type { Vertical } from "@prisma/client";
import { SearchX } from "lucide-react";
import { listProducts, getStoreCategories, type SortKey } from "@/lib/catalogue";
import { CategorySidebar } from "@/components/catalogue/category-sidebar";
import { FilterBar } from "@/components/catalogue/filter-bar";
import { ProductCard, type CardStore } from "@/components/catalogue/product-card";
import { Pagination } from "@/components/catalogue/pagination";
import { storePath, storeShortName } from "@/lib/departments";

export type ListingSearchParams = {
  category?: string;
  minPrice?: string;
  maxPrice?: string;
  inStock?: string;
  sort?: string;
  view?: string;
  page?: string;
  q?: string;
};

const SORTS: SortKey[] = ["newest", "price_asc", "price_desc", "name"];

function num(v: string | undefined) {
  if (!v) return undefined;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}

// One store's shelf for one department (or, for search, all departments).
export async function ProductListing({
  store,
  vertical,
  title,
  description,
  basePath,
  searchParams,
}: {
  store: CardStore;
  vertical: Vertical | null;
  title: string;
  description?: string;
  basePath: string;
  searchParams: ListingSearchParams;
}) {
  const sort = SORTS.includes(searchParams.sort as SortKey) ? (searchParams.sort as SortKey) : "newest";
  const page = Math.max(1, Math.floor(num(searchParams.page) ?? 1));

  const [categories, listing] = await Promise.all([
    vertical ? getStoreCategories(store.id, vertical) : Promise.resolve([]),
    listProducts(store.id, vertical, {
      category: searchParams.category,
      minPrice: num(searchParams.minPrice),
      maxPrice: num(searchParams.maxPrice),
      inStockOnly: searchParams.inStock === "1",
      sort,
      page,
      q: searchParams.q?.trim() || undefined,
    }),
  ]);

  const view = searchParams.view === "list" ? "list" : "grid";
  const activeCategory = categories.find((c) => c.slug === searchParams.category);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <nav aria-label="Breadcrumb" className="mb-3 text-xs text-rk-n600">
        <Link href={storePath(store.slug)} className="hover:text-rk-navy hover:underline">
          {storeShortName(store.name)} store
        </Link>
        <span aria-hidden> / </span>
        <span className="text-rk-navy">{title}</span>
        {activeCategory && (
          <>
            <span aria-hidden> / </span>
            <span className="text-rk-navy">{activeCategory.name}</span>
          </>
        )}
      </nav>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="font-display text-2xl font-bold text-rk-navy sm:text-3xl">{activeCategory?.name ?? title}</h1>
          <p className="text-sm text-rk-n600">
            {description ?? (
              <>
                Prices and stock at <b className="text-rk-navy">{store.name}</b>
              </>
            )}
          </p>
        </div>
        <p className="text-sm text-rk-n600">
          {listing.total} product{listing.total === 1 ? "" : "s"}
        </p>
      </div>
      <div className="flex flex-col gap-6 md:flex-row">
        {vertical && categories.length > 0 && (
          <CategorySidebar basePath={basePath} categories={categories} activeSlug={searchParams.category} />
        )}
        <div className="min-w-0 flex-1">
          <FilterBar />
          {listing.items.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-rk-lg border border-dashed border-rk-n200 bg-white p-10 text-center">
              <SearchX className="size-8 text-rk-n400" aria-hidden />
              <p className="text-sm text-rk-n600">
                {searchParams.q
                  ? `Nothing at ${storeShortName(store.name)} matches “${searchParams.q}”.`
                  : "No products match these filters."}
              </p>
              <Link href={basePath} className="text-sm font-semibold text-rk-blue hover:underline">
                Clear filters
              </Link>
            </div>
          ) : (
            <ul className={view === "grid" ? "grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 xl:grid-cols-4" : "flex flex-col gap-3"}>
              {listing.items.map((p) => (
                <li key={p.id}>
                  <ProductCard product={p} store={store} view={view} />
                </li>
              ))}
            </ul>
          )}
          <Pagination page={listing.page} pageCount={listing.pageCount} searchParams={searchParams} />
        </div>
      </div>
    </div>
  );
}
