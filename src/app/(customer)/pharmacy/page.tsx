import { ProductListing, type ListingSearchParams } from "@/components/catalogue/product-listing";

export default async function PharmacyPage({
  searchParams,
}: {
  searchParams: Promise<ListingSearchParams>;
}) {
  return (
    <ProductListing
      vertical="PHARMACY"
      title="Pharmacy"
      basePath="/pharmacy"
      searchParams={await searchParams}
    />
  );
}
