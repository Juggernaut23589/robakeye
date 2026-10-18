"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { CartItem } from "@/store/cart";

// Per the brief: "Zustand cart store (persisted locally, synced to DB for
// logged-in users)". Zustand+localStorage (store/cart.ts) stays the source
// of truth for rendering; these actions are the sync half (wired up in
// components/layout/cart-sync.tsx), plus a live status check the cart page
// uses to catch price/stock changes since an item was added.

const lineSelect = {
  id: true,
  slug: true,
  name: true,
  priceKobo: true,
  images: true,
  vertical: true,
  branchId: true,
  isActive: true,
  stockQuantity: true,
  class: true,
  branch: { select: { slug: true, name: true } },
} as const;

type Line = {
  id: string;
  slug: string;
  name: string;
  priceKobo: number;
  images: string[];
  vertical: CartItem["vertical"];
  branchId: string;
  branch: { slug: string; name: string };
};

function toCartItem(p: Line, quantity: number): CartItem {
  return {
    productId: p.id,
    branchId: p.branchId,
    storeSlug: p.branch.slug,
    storeName: p.branch.name,
    slug: p.slug,
    vertical: p.vertical,
    name: p.name,
    priceKobo: p.priceKobo,
    image: p.images[0] ?? null,
    quantity,
  };
}

export async function getServerCart(): Promise<CartItem[]> {
  const session = await auth();
  if (!session?.user) return [];

  const cart = await prisma.cart.findUnique({
    where: { userId: session.user.id },
    include: { items: { include: { product: { select: lineSelect } } } },
  });
  if (!cart) return [];
  return cart.items.filter((i) => i.product.isActive).map((i) => toCartItem(i.product, i.quantity));
}

export async function syncServerCart(items: { productId: string; quantity: number }[]): Promise<{ ok: boolean }> {
  const session = await auth();
  if (!session?.user) return { ok: false };

  // A non-empty sync means the cart is active again — reset the
  // abandoned-cart reminder stage and activity clock.
  const cart = await prisma.cart.upsert({
    where: { userId: session.user.id },
    update: items.length > 0 ? { abandonedStage: 0, lastActivityAt: new Date() } : {},
    create: { userId: session.user.id },
  });

  // Ignore ids that no longer exist (deleted listing) rather than failing
  // the whole sync on the foreign key.
  const existing = await prisma.product.findMany({
    where: { id: { in: items.map((i) => i.productId) } },
    select: { id: true },
  });
  const valid = new Set(existing.map((p) => p.id));

  await prisma.$transaction([
    prisma.cartItem.deleteMany({ where: { cartId: cart.id } }),
    prisma.cartItem.createMany({
      data: items
        .filter((i) => valid.has(i.productId))
        .map((i) => ({ cartId: cart.id, productId: i.productId, quantity: Math.max(1, Math.min(99, i.quantity)) })),
      skipDuplicates: true,
    }),
  ]);

  return { ok: true };
}

export type CartLineStatus = {
  productId: string;
  exists: boolean;
  isActive: boolean;
  priceKobo: number;
  stockQuantity: number;
  class: "OTC" | "POM" | "CONTROLLED";
};

// Live price/stock for the lines in the cart — prices and stock are per
// store and can change after an item was added.
export async function getCartLineStatus(productIds: string[]): Promise<CartLineStatus[]> {
  const ids = productIds.slice(0, 200);
  const products = await prisma.product.findMany({ where: { id: { in: ids } }, select: lineSelect });
  const byId = new Map(products.map((p) => [p.id, p]));
  return ids.map((id) => {
    const p = byId.get(id);
    return p
      ? { productId: id, exists: true, isActive: p.isActive, priceKobo: p.priceKobo, stockQuantity: p.stockQuantity, class: p.class }
      : { productId: id, exists: false, isActive: false, priceKobo: 0, stockQuantity: 0, class: "OTC" };
  });
}
