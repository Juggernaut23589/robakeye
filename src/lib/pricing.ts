// Pure pricing rules — no Prisma, no network. lib/orderCalculation.ts
// loads the rows and calls these; unit tests (tests/unit/pricing.test.ts)
// call them directly. All currency is integer kobo.

export type PricedLine = { productId: string; unitPriceKobo: number; quantity: number };

export type ComboRule = {
  branchId: string;
  productIds: string[];
  discountType: "FIXED_PRICE" | "PERCENT_OFF";
  valueKobo: number | null;
  percentOff: number | null;
};

export type PromoRule = {
  isActive: boolean;
  startsAt: Date;
  endsAt: Date;
  usageLimit: number | null;
  usedCount: number;
  minSpendKobo: number | null;
  branchId: string | null;
  type: "PERCENTAGE" | "FIXED_AMOUNT" | "COMBO";
  percentOff: number | null;
  valueKobo: number | null;
};

export type ZoneRule = { maxKm: number; baseFeeKobo: number; perKmFeeKobo: number };

export function sum(nums: number[]) {
  return nums.reduce((a, b) => a + b, 0);
}

export function itemsSubtotal(lines: PricedLine[]) {
  return sum(lines.map((l) => l.unitPriceKobo * l.quantity));
}

// A deal triggers once per complete set of its products in the basket —
// a 3-product bundle with quantities 2/1/1 triggers once (the scarcest
// product caps it). Only deals owned by the basket's store count: a
// listing id can only ever belong to one store, but checking the owner
// too keeps a mis-configured deal from leaking across stores.
export function comboDiscount(lines: PricedLine[], deals: ComboRule[], branchId: string) {
  const qty = new Map<string, number>();
  const price = new Map<string, number>();
  for (const l of lines) {
    qty.set(l.productId, (qty.get(l.productId) ?? 0) + l.quantity);
    price.set(l.productId, l.unitPriceKobo);
  }

  let total = 0;
  for (const deal of deals) {
    if (deal.branchId !== branchId || deal.productIds.length === 0) continue;
    const multiples = Math.min(...deal.productIds.map((id) => qty.get(id) ?? 0));
    if (multiples <= 0) continue;
    const bundleKobo = sum(deal.productIds.map((id) => price.get(id) ?? 0));
    if (deal.discountType === "FIXED_PRICE" && deal.valueKobo != null) {
      total += multiples * Math.max(0, bundleKobo - deal.valueKobo);
    } else if (deal.discountType === "PERCENT_OFF" && deal.percentOff != null) {
      total += multiples * Math.round((bundleKobo * deal.percentOff) / 100);
    }
  }
  return Math.min(total, itemsSubtotal(lines));
}

export function promoDiscount(
  promo: PromoRule | null,
  subtotalKobo: number,
  branchId: string,
  now: Date = new Date(),
): { discountKobo: number; error?: string } {
  if (!promo || !promo.isActive) return { discountKobo: 0, error: "Promo code not found" };
  if (now < promo.startsAt || now > promo.endsAt) {
    return { discountKobo: 0, error: "This promo code has expired or isn't active yet" };
  }
  if (promo.branchId && promo.branchId !== branchId) {
    return { discountKobo: 0, error: "This promo code isn't valid at this store" };
  }
  if (promo.usageLimit !== null && promo.usedCount >= promo.usageLimit) {
    return { discountKobo: 0, error: "This promo code has reached its usage limit" };
  }
  if (promo.minSpendKobo !== null && subtotalKobo < promo.minSpendKobo) {
    return {
      discountKobo: 0,
      error: `This code needs a minimum spend of ₦${(promo.minSpendKobo / 100).toLocaleString("en-NG")}`,
    };
  }

  let discount = 0;
  if (promo.type === "PERCENTAGE" && promo.percentOff) {
    discount = Math.round((subtotalKobo * promo.percentOff) / 100);
  } else if (promo.type === "FIXED_AMOUNT" && promo.valueKobo) {
    discount = promo.valueKobo;
  }
  return { discountKobo: Math.min(discount, subtotalKobo) };
}

export type DeliveryQuote =
  | { ok: true; feeKobo: number; distanceKm: number | null; estimated: boolean }
  | { ok: false; error: string; distanceKm: number | null };

// One store, one rider trip. Rules:
//  - the store must have a delivery zone at all;
//  - a known distance beyond the zone's radius is refused (not silently
//    charged) so the customer can switch to pickup or a nearer store;
//  - an address with no coordinates is charged the zone's base fee and
//    flagged as an estimate — never free by accident;
//  - baskets over the free-delivery threshold pay nothing.
export function deliveryQuote(
  zone: ZoneRule | null,
  distanceKm: number | null,
  qualifiesForFree: boolean,
  storeName: string,
): DeliveryQuote {
  if (!zone) {
    return { ok: false, error: `${storeName} isn't taking delivery orders right now — choose pickup.`, distanceKm };
  }
  if (distanceKm !== null && distanceKm > zone.maxKm) {
    return {
      ok: false,
      distanceKm,
      error: `This address is about ${distanceKm.toFixed(1)} km from ${storeName}, beyond its ${zone.maxKm} km delivery area. Choose pickup or shop at a nearer store.`,
    };
  }
  if (qualifiesForFree) return { ok: true, feeKobo: 0, distanceKm, estimated: distanceKm === null };
  if (distanceKm === null) return { ok: true, feeKobo: zone.baseFeeKobo, distanceKm: null, estimated: true };
  // Rounded up to the next ₦50 so riders and receipts deal in sensible amounts.
  const raw = zone.baseFeeKobo + zone.perKmFeeKobo * distanceKm;
  return { ok: true, feeKobo: Math.ceil(raw / 5000) * 5000, distanceKm, estimated: false };
}

// How many of a POM product a customer may buy right now: the total
// approved on their approved prescriptions at that store, minus what
// earlier orders already used.
export function remainingPrescriptionQuantity(approvedQty: number, alreadyOrderedQty: number) {
  return Math.max(0, approvedQty - alreadyOrderedQty);
}
