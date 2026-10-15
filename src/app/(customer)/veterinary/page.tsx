import { ProductListing, type ListingSearchParams } from "@/components/catalogue/product-listing";

export default async function VeterinaryPage({
  searchParams,
}: {
  searchParams: Promise<ListingSearchParams>;
}) {
  return (
    <ProductListing
      vertical="VETERINARY"
      title="Veterinary"
      basePath="/veterinary"
      searchParams={await searchParams}
    />
  );
}
