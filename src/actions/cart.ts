"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { CartItem } from "@/store/cart";

// Per the brief: "Zustand cart store (persisted locally, synced to DB for
// logged-in users)". Zustand+localStorage (store/cart.ts) remains the
// source of truth for rendering — snappy, works offline/guest. These two
// actions are the sync half: called once on login to merge, then on every
// mutation while authenticated to mirror local state to the DB Cart row
// (see components/layout/cart-sync.tsx for the client-side wiring).

export async function getServerCart(): Promise<CartItem[]> {
  const session = await auth();
  if (!session?.user) return [];

  const cart = await prisma.cart.findUnique({
    where: { userId: session.user.id },
    include: { items: true },
  });
  if (!cart || cart.items.length === 0) return [];

  // CartItem has no Prisma relation to Product (just a bare productId), so
  // this is a manual join rather than an `include`.
  const products = await prisma.product.findMany({
    where: { id: { in: cart.items.map((i) => i.productId) } },
    select: { id: true, name: true, priceKobo: true, images: true },
  });
  const productById = new Map(products.map((p) => [p.id, p]));

  return cart.items.flatMap((i) => {
    const product = productById.get(i.productId);
    if (!product) return [];
    return [
      {
        productId: i.productId,
        branchId: i.branchId,
        name: product.name,
        priceKobo: product.priceKobo,
        image: product.images[0] ?? null,
        quantity: i.quantity,
      },
    ];
  });
}

export async function syncServerCart(items: CartItem[]): Promise<{ ok: boolean }> {
  const session = await auth();
  if (!session?.user) return { ok: false };

  // A non-empty sync means the cart is active again — reset the
  // abandoned-cart reminder stage and activity clock so a later
  // abandonment restarts the 1h/24h/72h sequence instead of resuming
  // mid-way through a stale one.
  const cart = await prisma.cart.upsert({
    where: { userId: session.user.id },
    update: items.length > 0 ? { abandonedStage: 0, lastActivityAt: new Date() } : {},
    create: { userId: session.user.id },
  });

  // Replace-in-place: delete lines no longer present, upsert the rest.
  // Cart sizes here are small (a handful of line items), so a full
  // replace per sync is simpler and plenty fast — no need for a diff.
  await prisma.$transaction([
    prisma.cartItem.deleteMany({ where: { cartId: cart.id } }),
    ...items.map((item) =>
      prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productId: item.productId,
          branchId: item.branchId,
          quantity: item.quantity,
        },
      }),
    ),
  ]);

  return { ok: true };
}
