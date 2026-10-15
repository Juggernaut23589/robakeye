"use server";

import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculateOrderTotal, type CalcCartItem, type DeliveryMethod } from "@/lib/orderCalculation";

const quoteSchema = z.object({
  items: z.array(
    z.object({
      productId: z.string(),
      branchId: z.string(),
      quantity: z.number().int().positive(),
    }),
  ),
  promoCode: z.string().optional(),
  deliveryMethod: z.enum(["DELIVERY", "PICKUP"]),
  addressId: z.string().optional(),
});

// Loads the authoritative price/branch-name for each cart line from the DB
// rather than trusting whatever the client sent — the brief's "server is
// the source of truth" rule applies to quotes too, not just final orders.
async function hydrateCalcItems(
  items: { productId: string; branchId: string; quantity: number }[],
): Promise<CalcCartItem[]> {
  const products = await prisma.product.findMany({
    where: { id: { in: items.map((i) => i.productId) } },
    include: { inventory: { include: { branch: { select: { id: true, name: true } } } } },
  });
  const byId = new Map(products.map((p) => [p.id, p]));

  return items.flatMap((item) => {
    const product = byId.get(item.productId);
    const branch = product?.inventory.find((inv) => inv.branchId === item.branchId)?.branch;
    if (!product || !branch) return [];
    return [
      {
        productId: product.id,
        branchId: branch.id,
        branchName: branch.name,
        name: product.name,
        unitPriceKobo: product.priceKobo,
        quantity: item.quantity,
      },
    ];
  });
}

export async function getCartQuote(input: unknown) {
  const parsed = quoteSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Invalid cart" };

  const calcItems = await hydrateCalcItems(parsed.data.items);
  if (calcItems.length === 0) return { ok: false as const, error: "Cart is empty" };

  let destination: { lat: number; lng: number } | null = null;
  if (parsed.data.deliveryMethod === "DELIVERY" && parsed.data.addressId) {
    const address = await prisma.address.findUnique({ where: { id: parsed.data.addressId } });
    if (address?.lat && address?.lng) destination = { lat: address.lat, lng: address.lng };
  }

  const result = await calculateOrderTotal(calcItems, {
    promoCode: parsed.data.promoCode,
    deliveryMethod: parsed.data.deliveryMethod,
    destination,
  });

  return { ok: true as const, result };
}

const createOrderSchema = quoteSchema;

export async function createOrder(input: unknown) {
  const session = await auth();
  if (!session?.user) return { ok: false as const, error: "Sign in to place an order" };

  const parsed = createOrderSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Invalid order" };
  if (parsed.data.deliveryMethod === "DELIVERY" && !parsed.data.addressId) {
    return { ok: false as const, error: "Select a delivery address" };
  }

  const calcItems = await hydrateCalcItems(parsed.data.items);
  if (calcItems.length === 0) return { ok: false as const, error: "Cart is empty" };

  let destination: { lat: number; lng: number } | null = null;
  if (parsed.data.deliveryMethod === "DELIVERY" && parsed.data.addressId) {
    const address = await prisma.address.findUnique({ where: { id: parsed.data.addressId } });
    if (address?.lat && address?.lng) destination = { lat: address.lat, lng: address.lng };
  }

  const quote = await calculateOrderTotal(calcItems, {
    promoCode: parsed.data.promoCode,
    deliveryMethod: parsed.data.deliveryMethod,
    destination,
  });
  if (quote.promoError) return { ok: false as const, error: quote.promoError };

  // Checkout group id — every Order from one checkout gets one, even a
  // single-branch order, because Payment now links to a group rather than
  // a single Order (one Paystack transaction can cover several sub-orders;
  // see the Payment model's comment in schema.prisma).
  const groupId = crypto.randomUUID();
  const datePrefix = `RK-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}`;
  const todaysCount = await prisma.order.count({
    where: { orderNumber: { startsWith: datePrefix } },
  });

  try {
    const orders = await prisma.$transaction(async (tx) => {
      const created = [];
      for (let i = 0; i < quote.subOrders.length; i++) {
        const sub = quote.subOrders[i];

        // Read-only stock check at order creation (catches the obvious
        // "already out of stock" case before the customer even reaches
        // payment) — the actual atomic decrement happens later, in the
        // order.paid Inngest handler, NOT here. Reserving stock for a
        // PENDING_PAYMENT order that the customer may never pay for would
        // hold real inventory hostage against an abandoned Paystack popup.
        for (const item of sub.items) {
          const inv = await tx.branchInventory.findUnique({
            where: { branchId_productId: { branchId: sub.branchId, productId: item.productId } },
            select: { quantity: true },
          });
          if (!inv || inv.quantity < item.quantity) {
            throw new Error(`INSUFFICIENT_STOCK:${item.name}`);
          }
        }

        const orderNumber = `${datePrefix}-${String(todaysCount + i + 1).padStart(4, "0")}`;
        // This sub-order's share of cart-level discounts, proportional to
        // its share of the items subtotal — so the sum across sub-orders
        // still equals the quote the customer reviewed.
        const share = sub.itemsSubtotalKobo / quote.itemsSubtotalKobo;
        const comboShare = Math.round(quote.comboDiscountKobo * share);
        const promoShare = Math.round(quote.promoDiscountKobo * share);
        const loyaltyShare = Math.round(quote.loyaltyDiscountKobo * share);
        const subtotalShare = sub.itemsSubtotalKobo - comboShare - promoShare - loyaltyShare;
        const taxShare = Math.round(quote.taxKobo * share);
        const serviceShare = Math.round(quote.serviceChargeKobo * share);

        const order = await tx.order.create({
          data: {
            orderNumber,
            groupId,
            userId: session.user.id,
            branchId: sub.branchId,
            addressId: parsed.data.deliveryMethod === "DELIVERY" ? parsed.data.addressId : null,
            deliveryMethod: parsed.data.deliveryMethod as DeliveryMethod,
            status: "PENDING_PAYMENT",
            subtotalKobo: subtotalShare,
            comboDiscountKobo: comboShare,
            promoDiscountKobo: promoShare,
            loyaltyDiscountKobo: loyaltyShare,
            deliveryFeeKobo: sub.deliveryFeeKobo,
            serviceChargeKobo: serviceShare,
            taxKobo: taxShare,
            totalKobo: subtotalShare + sub.deliveryFeeKobo + serviceShare + taxShare,
            items: {
              create: sub.items.map((i) => ({
                productId: i.productId,
                quantity: i.quantity,
                unitPriceKobo: i.unitPriceKobo,
              })),
            },
            statusHistory: { create: { status: "PENDING_PAYMENT", note: "Order created" } },
          },
        });
        created.push(order);
      }
      return created;
    });

    return { ok: true as const, orderNumbers: orders.map((o) => o.orderNumber), groupId };
  } catch (err) {
    if (err instanceof Error && err.message.startsWith("INSUFFICIENT_STOCK:")) {
      return {
        ok: false as const,
        error: `${err.message.split(":")[1]} just went out of stock at the selected branch. Please review your cart.`,
      };
    }
    console.error("Order creation failed", err);
    return { ok: false as const, error: "Something went wrong placing your order. Please try again." };
  }
}
