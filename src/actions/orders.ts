"use server";

import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculateOrderTotal, type CalcCartItem, type DeliveryMethod } from "@/lib/orderCalculation";
import { prescriptionAllowance } from "@/lib/prescriptions";

// A quote/order is always for ONE store (the basket the customer chose to
// check out). Every line must be that store's own listing.
const quoteSchema = z.object({
  branchId: z.string().min(1),
  items: z
    .array(z.object({ productId: z.string(), quantity: z.number().int().positive().max(99) }))
    .min(1),
  promoCode: z.string().optional(),
  deliveryMethod: z.enum(["DELIVERY", "PICKUP"]),
  addressId: z.string().optional(),
});

type HydratedLine = CalcCartItem & { class: "OTC" | "POM" | "CONTROLLED"; stockQuantity: number; isActive: boolean };

// Loads the authoritative price/stock for each line from the DB rather
// than trusting the client — the "server is the source of truth" rule
// applies to quotes too. Lines that aren't this store's listing are
// reported, never silently re-priced from another store.
async function hydrateLines(branchId: string, items: { productId: string; quantity: number }[]) {
  const products = await prisma.product.findMany({
    where: { id: { in: items.map((i) => i.productId) } },
    select: { id: true, name: true, priceKobo: true, branchId: true, class: true, stockQuantity: true, isActive: true },
  });
  const byId = new Map(products.map((p) => [p.id, p]));

  const lines: HydratedLine[] = [];
  const foreign: string[] = [];
  for (const item of items) {
    const p = byId.get(item.productId);
    if (!p) continue; // deleted listing — quietly dropped, the cart UI prunes it
    if (p.branchId !== branchId) {
      foreign.push(p.name);
      continue;
    }
    lines.push({
      productId: p.id,
      name: p.name,
      unitPriceKobo: p.priceKobo,
      quantity: item.quantity,
      class: p.class,
      stockQuantity: p.stockQuantity,
      isActive: p.isActive,
    });
  }
  return { lines, foreign };
}

async function resolveDestination(userId: string | undefined, method: DeliveryMethod, addressId?: string) {
  if (method !== "DELIVERY" || !addressId || !userId) return { destination: null, address: null };
  // Only the signed-in customer's own address — never someone else's id.
  const address = await prisma.address.findFirst({ where: { id: addressId, userId } });
  const destination = address?.lat != null && address?.lng != null ? { lat: address.lat, lng: address.lng } : null;
  return { destination, address };
}

export async function getCartQuote(input: unknown) {
  const parsed = quoteSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Invalid basket" };

  const store = await prisma.branch.findUnique({ where: { id: parsed.data.branchId }, select: { id: true } });
  if (!store) return { ok: false as const, error: "Store not found" };

  const { lines } = await hydrateLines(parsed.data.branchId, parsed.data.items);
  if (lines.length === 0) return { ok: false as const, error: "This basket is empty" };

  const session = await auth();
  const { destination } = await resolveDestination(session?.user?.id, parsed.data.deliveryMethod, parsed.data.addressId);

  const result = await calculateOrderTotal(parsed.data.branchId, lines, {
    promoCode: parsed.data.promoCode,
    deliveryMethod: parsed.data.deliveryMethod,
    destination,
  });

  return { ok: true as const, result };
}

export async function createOrder(input: unknown) {
  const session = await auth();
  if (!session?.user) return { ok: false as const, error: "Sign in to place an order" };

  const parsed = quoteSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Invalid order" };
  const { branchId, deliveryMethod, addressId } = parsed.data;

  const store = await prisma.branch.findUnique({ where: { id: branchId }, select: { id: true, name: true } });
  if (!store) return { ok: false as const, error: "Store not found" };

  const { lines, foreign } = await hydrateLines(branchId, parsed.data.items);
  if (foreign.length > 0) {
    return {
      ok: false as const,
      error: `${foreign.join(", ")} ${foreign.length > 1 ? "aren't" : "isn't"} sold at ${store.name}. Each store is checked out separately.`,
    };
  }
  if (lines.length === 0) return { ok: false as const, error: "This basket is empty" };

  for (const line of lines) {
    if (!line.isActive) return { ok: false as const, error: `${line.name} is no longer sold at ${store.name}.` };
    if (line.class === "CONTROLLED") {
      return { ok: false as const, error: `${line.name} can only be dispensed in-store after a pharmacist consultation.` };
    }
    if (line.stockQuantity < line.quantity) {
      return {
        ok: false as const,
        error:
          line.stockQuantity === 0
            ? `${line.name} just went out of stock at ${store.name}.`
            : `Only ${line.stockQuantity} × ${line.name} left at ${store.name} — please reduce the quantity.`,
      };
    }
    if (line.class === "POM") {
      const allowed = await prescriptionAllowance(session.user.id, line.productId);
      if (allowed < line.quantity) {
        return {
          ok: false as const,
          error:
            allowed === 0
              ? `${line.name} needs an approved prescription from ${store.name}'s pharmacist before you can order it.`
              : `Your prescription covers ${allowed} × ${line.name}; reduce the quantity to continue.`,
        };
      }
    }
  }

  if (deliveryMethod === "DELIVERY" && !addressId) return { ok: false as const, error: "Select a delivery address" };
  const { destination, address } = await resolveDestination(session.user.id, deliveryMethod, addressId);
  if (deliveryMethod === "DELIVERY" && !address) return { ok: false as const, error: "Select a delivery address" };

  const quote = await calculateOrderTotal(branchId, lines, {
    promoCode: parsed.data.promoCode,
    deliveryMethod,
    destination,
  });
  if (quote.promoError) return { ok: false as const, error: quote.promoError };
  if (quote.deliveryError) return { ok: false as const, error: quote.deliveryError };

  // Payment links to a checkout group, so a single-store order still gets
  // one (see the Payment model's comment in schema.prisma).
  const groupId = crypto.randomUUID();
  const datePrefix = `RK-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}`;

  // Stock is only read here; the atomic decrement happens in the
  // order.paid Inngest handler. Reserving stock for an unpaid order would
  // hold real inventory hostage against an abandoned payment popup.
  for (let attempt = 0; attempt < 3; attempt++) {
    const todaysCount = await prisma.order.count({ where: { orderNumber: { startsWith: datePrefix } } });
    const orderNumber = `${datePrefix}-${String(todaysCount + 1 + attempt).padStart(4, "0")}`;
    try {
      const order = await prisma.order.create({
        data: {
          orderNumber,
          groupId,
          userId: session.user.id,
          branchId,
          addressId: deliveryMethod === "DELIVERY" ? address!.id : null,
          deliveryMethod,
          status: "PENDING_PAYMENT",
          subtotalKobo: quote.subtotalKobo,
          comboDiscountKobo: quote.comboDiscountKobo,
          promoDiscountKobo: quote.promoDiscountKobo,
          loyaltyDiscountKobo: quote.loyaltyDiscountKobo,
          deliveryFeeKobo: quote.deliveryFeeKobo,
          serviceChargeKobo: quote.serviceChargeKobo,
          taxKobo: quote.taxKobo,
          totalKobo: quote.finalTotalKobo,
          promoCodeId: quote.promotionId ?? null,
          items: {
            create: lines.map((l) => ({ productId: l.productId, quantity: l.quantity, unitPriceKobo: l.unitPriceKobo })),
          },
          statusHistory: { create: { status: "PENDING_PAYMENT", note: `Order created at ${store.name}` } },
        },
      });
      return { ok: true as const, orderNumbers: [order.orderNumber], groupId, branchId };
    } catch (err) {
      // Two checkouts in the same instant can race for the same order
      // number — retry with the next one.
      if ((err as { code?: string }).code === "P2002") continue;
      console.error("Order creation failed", err);
      return { ok: false as const, error: "Something went wrong placing your order. Please try again." };
    }
  }
  return { ok: false as const, error: "Something went wrong placing your order. Please try again." };
}
