"use server";

import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { geocodeAddress } from "@/lib/geocode";

export async function listAddresses() {
  const session = await auth();
  if (!session?.user) return [];
  return prisma.address.findMany({
    where: { userId: session.user.id },
    orderBy: [{ isDefault: "desc" }, { id: "desc" }],
  });
}

const addressSchema = z.object({
  label: z.string().trim().min(1, "Give this address a label, e.g. Home"),
  line1: z.string().trim().min(3, "Enter a street address"),
  line2: z.string().trim().optional(),
  city: z.string().trim().min(1).default("Ibadan"),
  // Optional pin from the browser's location (the shopper tapped "use my
  // current location"). Bounded to Nigeria so a stray value can't place an
  // address on another continent.
  lat: z.number().min(4).max(14).optional(),
  lng: z.number().min(2.5).max(15).optional(),
});

export async function createAddress(input: unknown) {
  const session = await auth();
  if (!session?.user) return { ok: false as const, error: "Sign in to save an address" };

  const parsed = addressSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid address" };
  }

  // Geocoded once at save time, not per page view, per
  // docs/technical-architecture.html's integrations table — null when
  // GOOGLE_MAPS_API_KEY isn't configured, which the checkout flow then
  // shows as "delivery fee estimate unavailable" rather than guessing.
  const { lat, lng, ...fields } = parsed.data;
  const coords =
    lat !== undefined && lng !== undefined ? { lat, lng } : await geocodeAddress(`${fields.line1}, ${fields.city}`);

  const existingCount = await prisma.address.count({ where: { userId: session.user.id } });
  const address = await prisma.address.create({
    data: {
      ...fields,
      lat: coords?.lat,
      lng: coords?.lng,
      userId: session.user.id,
      isDefault: existingCount === 0,
    },
  });
  return { ok: true as const, address };
}
