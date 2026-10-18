import { describe, expect, it } from "vitest";
import {
  comboDiscount,
  deliveryQuote,
  itemsSubtotal,
  promoDiscount,
  remainingPrescriptionQuantity,
  type ComboRule,
  type PromoRule,
} from "@/lib/pricing";

const SHEU = "branch_sheu";
const OJOO = "branch_ojoo";

const lines = [
  { productId: "rice", unitPriceKobo: 1_150_000, quantity: 2 },
  { productId: "tomatoes", unitPriceKobo: 240_000, quantity: 1 },
  { productId: "oil", unitPriceKobo: 320_000, quantity: 1 },
];

describe("itemsSubtotal", () => {
  it("sums price × quantity in kobo", () => {
    expect(itemsSubtotal(lines)).toBe(2_860_000);
  });
});

describe("comboDiscount", () => {
  const jollof: ComboRule = {
    branchId: SHEU,
    productIds: ["rice", "tomatoes", "oil"],
    discountType: "FIXED_PRICE",
    valueKobo: 1_550_000,
    percentOff: null,
  };

  it("applies once per complete set, capped by the scarcest item", () => {
    // bundle = 1,150,000 + 240,000 + 320,000 = 1,710,000 → sells for 1,550,000
    expect(comboDiscount(lines, [jollof], SHEU)).toBe(160_000);
  });

  it("ignores a deal owned by another store", () => {
    expect(comboDiscount(lines, [{ ...jollof, branchId: OJOO }], SHEU)).toBe(0);
  });

  it("does nothing when an item of the bundle is missing", () => {
    expect(comboDiscount(lines.slice(0, 2), [jollof], SHEU)).toBe(0);
  });

  it("supports percent-off bundles", () => {
    const pct: ComboRule = { ...jollof, discountType: "PERCENT_OFF", valueKobo: null, percentOff: 10 };
    expect(comboDiscount(lines, [pct], SHEU)).toBe(171_000);
  });
});

describe("promoDiscount", () => {
  const now = new Date("2026-10-18T12:00:00Z");
  const base: PromoRule = {
    isActive: true,
    startsAt: new Date("2026-10-01"),
    endsAt: new Date("2026-11-01"),
    usageLimit: null,
    usedCount: 0,
    minSpendKobo: null,
    branchId: null,
    type: "PERCENTAGE",
    percentOff: 10,
    valueKobo: null,
  };

  it("applies a store-wide code at any store", () => {
    expect(promoDiscount(base, 1_000_000, SHEU, now)).toEqual({ discountKobo: 100_000 });
  });

  it("rejects a store-specific code at a different store", () => {
    const r = promoDiscount({ ...base, branchId: OJOO }, 1_000_000, SHEU, now);
    expect(r.discountKobo).toBe(0);
    expect(r.error).toMatch(/isn't valid at this store/);
  });

  it("accepts a store-specific code at its own store", () => {
    expect(promoDiscount({ ...base, branchId: SHEU }, 1_000_000, SHEU, now).discountKobo).toBe(100_000);
  });

  it("enforces the minimum spend, the window and the usage limit", () => {
    expect(promoDiscount({ ...base, minSpendKobo: 2_000_000 }, 1_000_000, SHEU, now).error).toMatch(/minimum spend/);
    expect(promoDiscount({ ...base, endsAt: new Date("2026-10-10") }, 1_000_000, SHEU, now).error).toMatch(/expired/);
    expect(promoDiscount({ ...base, usageLimit: 5, usedCount: 5 }, 1_000_000, SHEU, now).error).toMatch(/usage limit/);
    expect(promoDiscount(null, 1_000_000, SHEU, now).error).toMatch(/not found/);
  });

  it("never discounts more than the subtotal", () => {
    expect(promoDiscount({ ...base, type: "FIXED_AMOUNT", percentOff: null, valueKobo: 5_000_000 }, 300_000, SHEU, now).discountKobo).toBe(300_000);
  });
});

describe("deliveryQuote", () => {
  const zone = { maxKm: 8, baseFeeKobo: 100_000, perKmFeeKobo: 15_000 };

  it("charges base + per-km inside the radius", () => {
    expect(deliveryQuote(zone, 4, false, "Ojoo Branch")).toEqual({ ok: true, feeKobo: 160_000, distanceKm: 4, estimated: false });
  });

  it("refuses an address beyond the store's radius", () => {
    const q = deliveryQuote(zone, 9.4, false, "Ojoo Branch");
    expect(q.ok).toBe(false);
    if (!q.ok) expect(q.error).toMatch(/beyond its 8 km delivery area/);
  });

  it("still refuses out-of-radius addresses when delivery would be free", () => {
    expect(deliveryQuote(zone, 20, true, "Ojoo Branch").ok).toBe(false);
  });

  it("charges the base fee (flagged as an estimate) when the address has no coordinates", () => {
    expect(deliveryQuote(zone, null, false, "Ojoo Branch")).toEqual({ ok: true, feeKobo: 100_000, distanceKm: null, estimated: true });
  });

  it("rounds a distance-based fee up to the next ₦50", () => {
    // 100,000 + 15,000 × 1.1 = 116,500 kobo → ₦1,200
    expect(deliveryQuote(zone, 1.1, false, "Ojoo Branch")).toMatchObject({ ok: true, feeKobo: 120_000 });
  });

  it("is free over the threshold inside the radius", () => {
    expect(deliveryQuote(zone, 5, true, "Ojoo Branch")).toMatchObject({ ok: true, feeKobo: 0 });
  });

  it("refuses delivery when the store has no zone", () => {
    expect(deliveryQuote(null, 1, false, "Ojoo Branch").ok).toBe(false);
  });
});

describe("remainingPrescriptionQuantity", () => {
  it("subtracts what was already ordered and never goes negative", () => {
    expect(remainingPrescriptionQuantity(3, 1)).toBe(2);
    expect(remainingPrescriptionQuantity(2, 5)).toBe(0);
  });
});
