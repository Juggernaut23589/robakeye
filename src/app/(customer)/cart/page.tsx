import { prisma } from "@/lib/prisma";
import { CartPageClient } from "@/components/cart/cart-page-client";

export default async function CartPage() {
  const branches = await prisma.branch.findMany({ select: { id: true, name: true } });
  const branchNameById = Object.fromEntries(branches.map((b) => [b.id, b.name]));
  return <CartPageClient branchNameById={branchNameById} />;
}
