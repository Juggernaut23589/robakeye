"use server";

import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Orders delivered but not yet reviewed — Review.orderId is unique, so
// "no review" is just `review: null` on the relation.
export async function getReviewableOrders() {
  const session = await auth();
  if (!session?.user) return [];

  return prisma.order.findMany({
    where: { userId: session.user.id, status: "DELIVERED", review: null },
    include: { branch: { select: { name: true } }, items: { include: { product: { select: { name: true } } } } },
    orderBy: { updatedAt: "desc" },
  });
}

export async function getMyReviews() {
  const session = await auth();
  if (!session?.user) return [];

  return prisma.review.findMany({
    where: { userId: session.user.id },
    include: { order: { select: { orderNumber: true } } },
    orderBy: { createdAt: "desc" },
  });
}

const reviewSchema = z.object({
  orderId: z.string(),
  rating: z.number().int().min(1).max(5),
  body: z.string().max(2000).optional(),
});

export async function submitReview(input: unknown) {
  const session = await auth();
  if (!session?.user) return { ok: false as const, error: "Sign in required" };

  const parsed = reviewSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Invalid review" };

  const order = await prisma.order.findUnique({
    where: { id: parsed.data.orderId },
    include: { items: true, review: true },
  });
  if (!order || order.userId !== session.user.id) return { ok: false as const, error: "Order not found" };
  if (order.status !== "DELIVERED") return { ok: false as const, error: "This order hasn't been delivered yet" };
  if (order.review) return { ok: false as const, error: "You've already reviewed this order" };

  // A multi-product order has no single "the" product — attach the review
  // to a product only when the order was for exactly one distinct item,
  // matching the Review model's optional (not required) productId.
  const distinctProductIds = [...new Set(order.items.map((i) => i.productId))];
  const productId = distinctProductIds.length === 1 ? distinctProductIds[0] : undefined;

  await prisma.review.create({
    data: {
      userId: session.user.id,
      orderId: order.id,
      productId,
      rating: parsed.data.rating,
      body: parsed.data.body,
    },
  });

  return { ok: true as const };
}
