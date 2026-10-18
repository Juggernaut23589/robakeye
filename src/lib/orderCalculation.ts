// Order calculation engine — docs/technical-architecture.html §04 and
// docs/information-architecture.html §05's customer-facing waterfall.
// Step order (combo → promo → loyalty, THEN delivery/service/tax) is
// enforced here server-side; the UI only renders what this returns.
//
// Each store is a separate shop, so an order (and every quote) is for
// exactly ONE store: its own listings, its own combo deals, its own
// delivery zone and radius. The pure rules live in lib/pricing.ts.
//
// All currency fields are integer kobo throughout — never floats.

import { prisma } from "@/lib/prisma";
import { getDistance } from "@/lib/distance";
import { FREE_DELIVERY_THRESHOLD_KOBO } from "@/lib/constants";
import { comboDiscount, deliveryQuote, itemsSubtotal, promoDiscount } from "@/lib/pricing";

export { FREE_DELIVERY_THRESHOLD_KOBO };

export type CalcCartItem = {
  productId: string;
  name: string;
  unitPriceKobo: number;
  quantity: number;
};

export type DeliveryMethod = "DELIVERY" | "PICKUP";

export type OrderCalculation = {
  branchId: string;
  branchName: string;
  itemsSubtotalKobo: number;
  comboDiscountKobo: number;
  promoDiscountKobo: number;
  loyaltyDiscountKobo: number;
  subtotalKobo: number;
  deliveryMethod: DeliveryMethod;
  deliveryFeeKobo: number;
  distanceKm: number | null;
  // true when the address has no coordinates and the zone's base fee was
  // charged instead of a distance-based fee.
  deliveryEstimated: boolean;
  serviceChargeKobo: number;
  taxKobo: number;
  finalTotalKobo: number;
  promoError?: string;
  promotionId?: string;
  // Set when delivery isn't possible (outside the store's radius, no zone).
  // A quote still comes back so the basket renders, but createOrder refuses.
  deliveryError?: string;
};

// Loyalty points — no points ledger exists in the schema yet (Phase 2).
// Returns 0 rather than inventing a redemption rate.
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- signature kept stable for when a points ledger lands
function applyLoyaltyPoints(_pointsToRedeem: number | undefined): number {
  return 0;
}

// No admin setting exists for a service charge and the business hasn't
// indicated it charges one — 0, not an invented fee.
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- kept stable for when a Settings-configurable fee lands
function getServiceCharge(_orderType: "standard" | "vet_booking"): number {
  return 0;
}

// VAT — "Nigeria zero-rates most essential drugs; confirm per-category tax
// codes before build." Not confirmed yet, so 0; a wrong invented rate would
// be a compliance bug.
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- pending confirmed per-category VAT codes
function applyTax(_subtotalKobo: number, _items: CalcCartItem[]): number {
  return 0;
}

export async function calculateOrderTotal(
  branchId: string,
  items: CalcCartItem[],
  options: {
    promoCode?: string;
    pointsToRedeem?: number;
    deliveryMethod: DeliveryMethod;
    destination: { lat: number; lng: number } | null;
  },
): Promise<OrderCalculation> {
  const now = new Date();
  const [branch, deals, promo] = await Promise.all([
    prisma.branch.findUniqueOrThrow({
      where: { id: branchId },
      select: { id: true, name: true, lat: true, lng: true, deliveryZones: true },
    }),
    prisma.comboDeal.findMany({
      where: { branchId, isActive: true, startsAt: { lte: now }, endsAt: { gte: now } },
    }),
    options.promoCode
      ? prisma.promotion.findUnique({ where: { code: options.promoCode.trim().toUpperCase() } })
      : Promise.resolve(null),
  ]);

  const itemsSubtotalKobo = itemsSubtotal(items);
  const comboDiscountKobo = comboDiscount(items, deals, branchId);

  // Promo applies to what's left after the bundle discount.
  const promoResult = options.promoCode
    ? promoDiscount(promo, itemsSubtotalKobo - comboDiscountKobo, branchId, now)
    : { discountKobo: 0 };
  const promoDiscountKobo = promoResult.discountKobo;
  const loyaltyDiscountKobo = applyLoyaltyPoints(options.pointsToRedeem);
  const subtotalKobo = itemsSubtotalKobo - comboDiscountKobo - promoDiscountKobo - loyaltyDiscountKobo;

  // Free-delivery threshold reads off the items subtotal (pre-discount) —
  // the "orders above ₦15,000" promise is about what's in the basket.
  const qualifiesForFree = itemsSubtotalKobo >= FREE_DELIVERY_THRESHOLD_KOBO;

  let deliveryFeeKobo = 0;
  let distanceKm: number | null = null;
  let deliveryEstimated = false;
  let deliveryError: string | undefined;
  if (options.deliveryMethod === "DELIVERY") {
    // The widest zone wins if a store ever configures several.
    const zone = [...branch.deliveryZones].sort((a, b) => b.maxKm - a.maxKm)[0] ?? null;
    if (options.destination) {
      distanceKm = (await getDistance(options.destination, { lat: branch.lat, lng: branch.lng })).km;
    }
    const q = deliveryQuote(zone, distanceKm, qualifiesForFree, branch.name);
    if (q.ok) {
      deliveryFeeKobo = q.feeKobo;
      deliveryEstimated = q.estimated;
    } else {
      deliveryError = q.error;
    }
  }

  const serviceChargeKobo = getServiceCharge("standard");
  const taxKobo = applyTax(subtotalKobo, items);

  return {
    branchId,
    branchName: branch.name,
    itemsSubtotalKobo,
    comboDiscountKobo,
    promoDiscountKobo,
    loyaltyDiscountKobo,
    subtotalKobo,
    deliveryMethod: options.deliveryMethod,
    deliveryFeeKobo,
    distanceKm,
    deliveryEstimated,
    serviceChargeKobo,
    taxKobo,
    finalTotalKobo: subtotalKobo + deliveryFeeKobo + serviceChargeKobo + taxKobo,
    promoError: promoResult.error,
    promotionId: promoResult.error ? undefined : promo?.id,
    deliveryError,
  };
}
