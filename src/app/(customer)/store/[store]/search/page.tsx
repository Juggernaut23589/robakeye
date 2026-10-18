import { notFound } from "next/navigation";
import { getStoreBySlug } from "@/lib/stores";
import { storePath } from "@/lib/departments";
import { ProductListing, type ListingSearchParams } from "@/components/catalogue/product-listing";

export const metadata = { title: "Search" };

export default async function StoreSearchPage({ params, searchParams }: PageProps<"/store/[store]/search">) {
  const store = await getStoreBySlug((await params).store);
  if (!store) notFound();
  const sp = (await searchParams) as ListingSearchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";

  return (
    <ProductListing
      store={{ id: store.id, slug: store.slug, name: store.name }}
      vertical={null}
      title={q ? `Results for “${q}”` : "Search"}
      description={`Searching ${store.name} only — other stores have their own shelves.`}
      basePath={`${storePath(store.slug)}/search${q ? `?q=${encodeURIComponent(q)}` : ""}`}
      searchParams={sp}
    />
  );
}
