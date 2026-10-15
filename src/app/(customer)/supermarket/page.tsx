import { ProductListing, type ListingSearchParams } from "@/components/catalogue/product-listing";

export default async function SupermarketPage({
  searchParams,
}: {
  searchParams: Promise<ListingSearchParams>;
}) {
  return (
    <ProductListing
      vertical="SUPERMARKET"
      title="Supermarket"
      basePath="/supermarket"
      searchParams={await searchParams}
    />
  );
}
