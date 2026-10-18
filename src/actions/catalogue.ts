"use server";

import { prisma } from "@/lib/prisma";
import { z } from "zod";

const subscribeSchema = z.object({
  productId: z.string(),
  email: z.string().trim().toLowerCase().email(),
});

// Restock alerts are per store listing: "tell me when Ojoo has it again".
export async function subscribeToRestock(input: unknown) {
  const parsed = subscribeSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Enter a valid email address" };

  const product = await prisma.product.findUnique({ where: { id: parsed.data.productId }, select: { id: true } });
  if (!product) return { ok: false as const, error: "Product not found" };

  // Re-subscribing after a previous alert re-arms it.
  await prisma.restockSubscription.upsert({
    where: { productId_email: parsed.data },
    update: { notifiedAt: null },
    create: parsed.data,
  });
  return { ok: true as const };
}
