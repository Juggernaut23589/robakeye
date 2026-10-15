// Order calculation engine — ported line-for-line from
// docs/technical-architecture.html §04 "Order calculation engine" and
// docs/information-architecture.html §05's customer-facing waterfall.
// Both docs are explicit that this exact step order (combo → promo →
// loyalty, THEN delivery/service/tax) must be enforced server-side, never
// just reflected in the UI — this file is the only place that computes a
// chargeable total; nothing else may recompute it for anything but an
// optimistic client preview.
//
// All currency fields are integer kobo throughout — never floats.

import { prisma } from "@/lib/prisma";
import { getDistance } from "@/lib/distance";
import { FREE_DELIVERY_THRESHOLD_KOBO } from "@/lib/constants";

export { FREE_DELIVERY_THRESHOLD_KOBO };

export type CalcCartItem = {
  productId: string;
  branchId: string;
  branchName: string;
  name: string;
  unitPriceKobo: number;
  quantity: number;
};

export type DeliveryMethod = "DELIVERY" | "PICKUP";

export type SubOrder = {
  branchId: string;
  branchName: string;
  items: CalcCartItem[];
  itemsSubtotalKobo: number;
  deliveryFeeKobo: number;
  distanceKm: number | null;
};

export type OrderCalculation = {
  itemsSubtotalKobo: number;
  comboDiscountKobo: number;
  promoDiscountKobo: number;
  loyaltyDiscountKobo: number;
  subtotalKobo: number;
  subOrders: SubOrder[];
  deliveryFeeKobo: number;
  serviceChargeKobo: number;
  taxKobo: number;
  finalTotalKobo: number;
  promoError?: string;
};

function sum(nums: number[]) {
  return nums.reduce((a, b) => a + b, 0);
}

function groupByBranch(items: CalcCartItem[]): Map<string, CalcCartItem[]> {
  const groups = new Map<string, CalcCartItem[]>();
  for (const item of items) {
    const list = groups.get(item.branchId) ?? [];
    list.push(item);
    groups.set(item.branchId, list);
  }
  return groups;
}

// Step 2 — combo/bundle discount rules, against the real ComboDeal model
// (Milestone 11's Promotions admin module). A deal triggers once for every
// complete set of its required products found in the cart — e.g. a
// 3-product bundle with quantities 2/1/1 in the cart triggers once (the
// scarcest product caps it), not twice.
async function applyComboRules(items: CalcCartItem[]): Promise<number> {
  const now = new Date();
  const deals = await prisma.comboDeal.findMany({
    where: { isActive: true, startsAt: { lte: now }, endsAt: { gte: now } },
  });
  if (deals.length === 0) return 0;

  const qtyByProduct = new Map<string, number>();
  const priceByProduct = new Map<string, number>();
  for (const item of items) {
    qtyByProduct.set(item.productId, (qtyByProduct.get(item.productId) ?? 0) + item.quantity);
    priceByProduct.set(item.productId, item.unitPriceKobo);
  }

  let totalDiscount = 0;
  for (const deal of deals) {
    if (deal.productIds.length === 0) continue;
    const availableCounts = deal.productIds.map((id) => qtyByProduct.get(id) ?? 0);
    const multiples = Math.min(...availableCounts);
    if (multiples <= 0) continue;

    const bundlePriceKobo = sum(deal.productIds.map((id) => priceByProduct.get(id) ?? 0));
    if (deal.discountType === "FIXED_PRICE" && deal.valueKobo != null) {
      totalDiscount += multiples * Math.max(0, bundlePriceKobo - deal.valueKobo);
    } else if (deal.discountType === "PERCENT_OFF" && deal.percentOff != null) {
      totalDiscount += multiples * Math.round((bundlePriceKobo * deal.percentOff) / 100);
    }
  }

  const itemsSubtotalKobo = sum(items.map((i) => i.unitPriceKobo * i.quantity));
  return Math.min(totalDiscount, itemsSubtotalKobo);
}

// Step 3 — promo code, validated against the real Promotion table (the
// model + admin-manageable fields already existed from Milestone 1).
async function validatePromo(
  promoCode: string | undefined,
  itemsSubtotalKobo: number,
): Promise<{ discountKobo: number; error?: string; promotionId?: string }> {
  if (!promoCode) return { discountKobo: 0 };

  const promo = await prisma.promotion.findUnique({ where: { code: promoCode } });
  const now = new Date();

  if (!promo || !promo.isActive) return { discountKobo: 0, error: "Promo code not found" };
  if (now < promo.startsAt || now > promo.endsAt) {
    return { discountKobo: 0, error: "This promo code has expired or isn't active yet" };
  }
  if (promo.usageLimit !== null && promo.usedCount >= promo.usageLimit) {
    return { discountKobo: 0, error: "This promo code has reached its usage limit" };
  }
  if (promo.minSpendKobo !== null && itemsSubtotalKobo < promo.minSpendKobo) {
    return {
      discountKobo: 0,
      error: `This code needs a minimum spend of ${(promo.minSpendKobo / 100).toLocaleString("en-NG")} naira`,
    };
  }

  let discount = 0;
  if (promo.type === "PERCENTAGE" && promo.percentOff) {
    discount = Math.round((itemsSubtotalKobo * promo.percentOff) / 100);
  } else if (promo.type === "FIXED_AMOUNT" && promo.valueKobo) {
    discount = promo.valueKobo;
  }
  // COMBO-type promotions are a bundle rule, not a cart-level amount off —
  // out of scope here until the combo-rule engine above exists.
  discount = Math.min(discount, itemsSubtotalKobo);

  return { discountKobo: discount, promotionId: promo.id };
}

// Step 4 — loyalty points redemption. No points ledger exists in the
// schema yet (flagged as a Phase 2 revenue feature in the earlier roadmap
// doc) — returns 0 rather than inventing a redemption rate.
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- signature kept stable for when a points ledger lands
function applyLoyaltyPoints(_pointsToRedeem: number | undefined): number {
  return 0;
}

// Delivery fee = DeliveryZone.baseFeeKobo + perKmFeeKobo × distance, the
// real admin-configurable fields seeded in Milestone 5 — not a flat guess.
// Pickup is always free (IA spec: "pickup bypasses matching").
async function calculateDeliveryFee(
  deliveryMethod: DeliveryMethod,
  destination: { lat: number; lng: number } | null,
  branchId: string,
  qualifiesForFreeDelivery: boolean,
): Promise<{ feeKobo: number; distanceKm: number | null }> {
  if (deliveryMethod === "PICKUP") return { feeKobo: 0, distanceKm: null };

  const branch = await prisma.branch.findUnique({
    where: { id: branchId },
    include: { deliveryZones: true },
  });
  const zone = branch?.deliveryZones[0];
  if (!branch || !zone || !destination) {
    return { feeKobo: 0, distanceKm: null };
  }

  const { km } = await getDistance(destination, { lat: branch.lat, lng: branch.lng });
  const feeKobo = qualifiesForFreeDelivery ? 0 : zone.baseFeeKobo + Math.round(zone.perKmFeeKobo * km);
  return { feeKobo, distanceKm: km };
}

// Service charge (e.g. a platform/handling fee or vet booking fee) — no
// admin Settings value exists yet for this, and the business hasn't
// indicated it charges one. 0, not an invented flat fee.
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- signature kept stable for when a Settings-configurable fee lands
function getServiceCharge(_orderType: "standard" | "vet_booking"): number {
  return 0;
}

// VAT/tax — docs/technical-architecture.html is explicit: "Nigeria
// zero-rates most essential drugs; confirm per-category tax codes before
// build." That confirmation hasn't happened. Returning 0 is the only
// honest option here; a wrong invented tax rate would be a compliance
// bug, not a placeholder.
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- signature kept stable pending confirmed per-category VAT codes
function applyTax(_subtotalKobo: number, _items: CalcCartItem[]): number {
  return 0;
}

export async function calculateOrderTotal(
  items: CalcCartItem[],
  options: {
    promoCode?: string;
    pointsToRedeem?: number;
    deliveryMethod: DeliveryMethod;
    destination: { lat: number; lng: number } | null;
  },
): Promise<OrderCalculation> {
  const itemsSubtotalKobo = sum(items.map((i) => i.unitPriceKobo * i.quantity));
  const comboDiscountKobo = await applyComboRules(items);
  const { discountKobo: promoDiscountKobo, error: promoError } = await validatePromo(
    options.promoCode,
    itemsSubtotalKobo,
  );
  const loyaltyDiscountKobo = applyLoyaltyPoints(options.pointsToRedeem);

  const subtotalKobo = itemsSubtotalKobo - comboDiscountKobo - promoDiscountKobo - loyaltyDiscountKobo;

  // Free-delivery threshold reads off the items subtotal (pre-discount) —
  // the "orders above ₦15,000" promise is about what's in the basket, not
  // what's left to pay after a promo code happens to land.
  const qualifiesForFreeDelivery = itemsSubtotalKobo >= FREE_DELIVERY_THRESHOLD_KOBO;

  // Split by fulfilling branch — one fee per sub-order, not one fee for
  // the whole cart (IA spec §05 "Mixed cart").
  const branchGroups = groupByBranch(items);
  const subOrders: SubOrder[] = await Promise.all(
    Array.from(branchGroups.entries()).map(async ([branchId, branchItems]) => {
      const { feeKobo, distanceKm } = await calculateDeliveryFee(
        options.deliveryMethod,
        options.destination,
        branchId,
        qualifiesForFreeDelivery,
      );
      return {
        branchId,
        branchName: branchItems[0].branchName,
        items: branchItems,
        itemsSubtotalKobo: sum(branchItems.map((i) => i.unitPriceKobo * i.quantity)),
        deliveryFeeKobo: feeKobo,
        distanceKm,
      };
    }),
  );

  const deliveryFeeKobo = sum(subOrders.map((so) => so.deliveryFeeKobo));
  const serviceChargeKobo = getServiceCharge("standard");
  const taxKobo = applyTax(subtotalKobo, items);
  const finalTotalKobo = subtotalKobo + deliveryFeeKobo + serviceChargeKobo + taxKobo;

  return {
    itemsSubtotalKobo,
    comboDiscountKobo,
    promoDiscountKobo,
    loyaltyDiscountKobo,
    subtotalKobo,
    subOrders,
    deliveryFeeKobo,
    serviceChargeKobo,
    taxKobo,
    finalTotalKobo,
    promoError,
  };
}
