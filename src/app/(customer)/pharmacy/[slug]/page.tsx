import { notFound } from "next/navigation";
import { getProductBySlug, getRelatedProducts } from "@/lib/catalogue";
import { ProductDetail } from "@/components/catalogue/product-detail";

export default async function PharmacyProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  // CONTROLLED products still render (informational only, per
  // docs/pharmacy-vet-compliance.html — "visit branch", never purchasable)
  // — only a genuinely missing product or wrong-vertical slug 404s.
  if (!product || product.vertical !== "PHARMACY") notFound();

  const related = await getRelatedProducts(product.categoryId, product.id);
  return <ProductDetail product={product} related={related} />;
}
