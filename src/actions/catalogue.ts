"use server";

import { prisma } from "@/lib/prisma";
import { findAvailableBranches, type LatLng } from "@/lib/distance";
import { z } from "zod";

export async function getAvailability(productId: string, origin: LatLng | null) {
  return findAvailableBranches(productId, origin);
}

const subscribeSchema = z.object({
  productId: z.string(),
  branchId: z.string(),
  email: z.string().email(),
});

export async function subscribeToRestock(input: unknown) {
  const parsed = subscribeSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Enter a valid email address" };

  await prisma.restockSubscription.upsert({
    where: {
      productId_branchId_email: parsed.data,
    },
    update: {},
    create: parsed.data,
  });
  return { ok: true as const };
}
