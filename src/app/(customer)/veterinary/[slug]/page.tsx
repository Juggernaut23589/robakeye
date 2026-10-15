import { notFound } from "next/navigation";
import { getProductBySlug, getRelatedProducts } from "@/lib/catalogue";
import { ProductDetail } from "@/components/catalogue/product-detail";

export default async function VeterinaryProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product || product.vertical !== "VETERINARY") notFound();

  const related = await getRelatedProducts(product.categoryId, product.id);
  return <ProductDetail product={product} related={related} />;
}
