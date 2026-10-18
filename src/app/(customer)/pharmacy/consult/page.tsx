import { prisma } from "@/lib/prisma";
import { ConsultPageClient } from "@/components/consult/consult-page-client";

export default async function ConsultPharmacistPage({
  searchParams,
}: {
  searchParams: Promise<{ product?: string }>;
}) {
  const { product: productId } = await searchParams;
  const product = productId
    ? await prisma.product.findUnique({
        where: { id: productId },
        select: { id: true, name: true, class: true, branch: { select: { name: true } } },
      })
    : null;

  return (
    <ConsultPageClient
      product={product ? { id: product.id, name: product.name, class: product.class, storeName: product.branch.name } : null}
    />
  );
}
