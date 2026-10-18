import { notFound } from "next/navigation";
import { cookies } from "next/headers";
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

  const branchId = (await cookies()).get("robakeye-branch")?.value || undefined;
  const related = await getRelatedProducts(product.categoryId, product.id, branchId);
  return <ProductDetail product={product} related={related} />;
}
