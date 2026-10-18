import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { getStoreBySlug } from "@/lib/stores";
import { getRelatedProducts, getStoreProduct } from "@/lib/catalogue";
import { departmentByKey, productPath } from "@/lib/departments";
import { ProductDetail } from "@/components/catalogue/product-detail";

type Props = PageProps<"/store/[store]/[department]/[product]">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { store: storeSlug, product: slug } = await params;
  const store = await getStoreBySlug(storeSlug);
  const product = store ? await getStoreProduct(store.id, slug) : null;
  return product ? { title: product.name, description: product.description ?? undefined } : {};
}

export default async function ProductPage({ params }: Props) {
  const { store: storeSlug, department, product: slug } = await params;
  const store = await getStoreBySlug(storeSlug);
  if (!store) notFound();
  const product = await getStoreProduct(store.id, slug);
  // CONTROLLED products still render (informational, "in-store only");
  // a product this store doesn't list — or has retired — is a 404 here.
  if (!product || !product.isActive) notFound();

  // Canonical department in the URL (e.g. an old link with the wrong one).
  const dept = departmentByKey(department);
  if (!dept || dept.vertical !== product.vertical) redirect(productPath(store.slug, product.vertical, product.slug));

  const [related, siblingRows] = await Promise.all([
    getRelatedProducts(store.id, product.categoryId, product.id),
    prisma.product.findMany({
      where: { slug: product.slug, isActive: true, branchId: { not: store.id } },
      select: { priceKobo: true, stockQuantity: true, branch: { select: { slug: true, name: true } } },
      orderBy: { branch: { name: "asc" } },
    }),
  ]);

  return (
    <ProductDetail
      product={product}
      store={{ id: store.id, slug: store.slug, name: store.name }}
      related={related}
      deliveryKm={store.deliveryZones.length ? Math.max(...store.deliveryZones.map((z) => z.maxKm)) : null}
      siblings={siblingRows.map((s) => ({
        storeSlug: s.branch.slug,
        storeName: s.branch.name,
        priceKobo: s.priceKobo,
        inStock: s.stockQuantity > 0,
      }))}
    />
  );
}
