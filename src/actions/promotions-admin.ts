"use server";

import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { branchWhere, canAccessBranch, getStaffBranchIds } from "@/lib/staff-scope";

async function requirePromotionsManage() {
  const session = await auth();
  return session?.user?.permissions.includes("promotions.manage") ?? false;
}

// Combos and store-specific codes belong to one store — staff limited to
// their own stores can only create/see those.
async function allowedStores() {
  return getStaffBranchIds(await auth());
}

// ── Promo codes ─────────────────────────────────────────────────────────

export async function listPromotions() {
  if (!(await requirePromotionsManage())) return [];
  const allowed = await allowedStores();
  return prisma.promotion.findMany({
    where: {
      generatedForUserId: null, // hide abandoned-cart system-generated codes from the admin list
      ...(allowed === null ? {} : { OR: [{ branchId: null }, { branchId: { in: allowed } }] }),
    },
    include: { branch: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });
}

const promoSchema = z.object({
  code: z.string().min(3).toUpperCase(),
  type: z.enum(["PERCENTAGE", "FIXED_AMOUNT"]),
  percentOff: z.number().int().min(1).max(100).optional(),
  valueKobo: z.number().int().positive().optional(),
  minSpendKobo: z.number().int().min(0).optional(),
  usageLimit: z.number().int().positive().optional(),
  startsAt: z.string(),
  endsAt: z.string(),
  branchId: z.string().optional(), // empty = valid at every store
});

export async function createPromotion(input: unknown) {
  if (!(await requirePromotionsManage())) return { ok: false as const, error: "Not authorized" };
  const parsed = promoSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Invalid promo code details" };

  const allowed = await allowedStores();
  // Store-limited staff can only create codes for their own store(s).
  if (parsed.data.branchId ? !canAccessBranch(allowed, parsed.data.branchId) : allowed !== null) {
    return { ok: false as const, error: "Choose one of your stores for this code" };
  }

  const existing = await prisma.promotion.findUnique({ where: { code: parsed.data.code } });
  if (existing) return { ok: false as const, error: "A promo code with this code already exists" };

  await prisma.promotion.create({
    data: {
      code: parsed.data.code,
      type: parsed.data.type,
      percentOff: parsed.data.type === "PERCENTAGE" ? parsed.data.percentOff : undefined,
      valueKobo: parsed.data.type === "FIXED_AMOUNT" ? parsed.data.valueKobo : undefined,
      minSpendKobo: parsed.data.minSpendKobo,
      usageLimit: parsed.data.usageLimit,
      branchId: parsed.data.branchId || null,
      startsAt: new Date(parsed.data.startsAt),
      endsAt: new Date(parsed.data.endsAt),
    },
  });
  return { ok: true as const };
}

export async function togglePromotionActive(id: string) {
  if (!(await requirePromotionsManage())) return { ok: false as const, error: "Not authorized" };
  const promo = await prisma.promotion.findUnique({ where: { id } });
  if (!promo) return { ok: false as const, error: "Not found" };
  await prisma.promotion.update({ where: { id }, data: { isActive: !promo.isActive } });
  return { ok: true as const };
}

// ── Combo deals ──────────────────────────────────────────────────────────

export async function listComboDeals() {
  if (!(await requirePromotionsManage())) return [];
  const allowed = await allowedStores();
  const deals = await prisma.comboDeal.findMany({
    where: branchWhere(allowed),
    include: { branch: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });
  const products = await prisma.product.findMany({
    where: { id: { in: deals.flatMap((d) => d.productIds) } },
    select: { id: true, name: true },
  });
  const nameById = new Map(products.map((p) => [p.id, p.name]));
  return deals.map((d) => ({ ...d, productNames: d.productIds.map((id) => nameById.get(id) ?? "Removed product") }));
}

// Bundles can only combine one store's own listings.
export async function listProductsForPicker(branchId: string, query?: string) {
  if (!(await requirePromotionsManage())) return [];
  if (!canAccessBranch(await allowedStores(), branchId)) return [];
  return prisma.product.findMany({
    where: { branchId, isActive: true, class: { not: "CONTROLLED" }, ...(query ? { name: { contains: query, mode: "insensitive" } } : {}) },
    select: { id: true, name: true, sku: true, priceKobo: true },
    orderBy: { name: "asc" },
    take: 30,
  });
}

const comboSchema = z.object({
  branchId: z.string().min(1),
  name: z.string().min(1),
  productIds: z.array(z.string()).min(2),
  discountType: z.enum(["FIXED_PRICE", "PERCENT_OFF"]),
  valueKobo: z.number().int().positive().optional(),
  percentOff: z.number().int().min(1).max(100).optional(),
  startsAt: z.string(),
  endsAt: z.string(),
  isFeatured: z.boolean().default(false),
  bannerHeadline: z.string().optional(),
});

export async function createComboDeal(input: unknown) {
  if (!(await requirePromotionsManage())) return { ok: false as const, error: "Not authorized" };
  const parsed = comboSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Invalid combo deal details" };
  if (!canAccessBranch(await allowedStores(), parsed.data.branchId)) {
    return { ok: false as const, error: "You can't create deals for that store" };
  }

  // Every product in the bundle must be this store's own active listing.
  const uniqueIds = [...new Set(parsed.data.productIds)];
  const owned = await prisma.product.count({
    where: { id: { in: uniqueIds }, branchId: parsed.data.branchId, isActive: true },
  });
  if (uniqueIds.length < 2 || owned !== uniqueIds.length) {
    return { ok: false as const, error: "Pick at least two different products from this store" };
  }

  // One featured deal per store drives that store's banner.
  if (parsed.data.isFeatured) {
    await prisma.comboDeal.updateMany({
      data: { isFeatured: false },
      where: { isFeatured: true, branchId: parsed.data.branchId },
    });
  }

  await prisma.comboDeal.create({
    data: {
      name: parsed.data.name,
      branchId: parsed.data.branchId,
      productIds: uniqueIds,
      discountType: parsed.data.discountType,
      valueKobo: parsed.data.discountType === "FIXED_PRICE" ? parsed.data.valueKobo : undefined,
      percentOff: parsed.data.discountType === "PERCENT_OFF" ? parsed.data.percentOff : undefined,
      startsAt: new Date(parsed.data.startsAt),
      endsAt: new Date(parsed.data.endsAt),
      isFeatured: parsed.data.isFeatured,
      bannerHeadline: parsed.data.bannerHeadline,
    },
  });
  return { ok: true as const };
}

export async function toggleComboDealActive(id: string) {
  if (!(await requirePromotionsManage())) return { ok: false as const, error: "Not authorized" };
  const deal = await prisma.comboDeal.findUnique({ where: { id } });
  if (!deal || !canAccessBranch(await allowedStores(), deal.branchId)) return { ok: false as const, error: "Not found" };
  await prisma.comboDeal.update({ where: { id }, data: { isActive: !deal.isActive } });
  return { ok: true as const };
}

export async function setFeaturedComboDeal(id: string) {
  if (!(await requirePromotionsManage())) return { ok: false as const, error: "Not authorized" };
  const deal = await prisma.comboDeal.findUnique({ where: { id } });
  if (!deal || !canAccessBranch(await allowedStores(), deal.branchId)) return { ok: false as const, error: "Not found" };
  await prisma.$transaction([
    prisma.comboDeal.updateMany({ data: { isFeatured: false }, where: { isFeatured: true, branchId: deal.branchId } }),
    prisma.comboDeal.update({ where: { id }, data: { isFeatured: true } }),
  ]);
  return { ok: true as const };
}

export async function unfeatureComboDeal(id: string) {
  if (!(await requirePromotionsManage())) return { ok: false as const, error: "Not authorized" };
  const deal = await prisma.comboDeal.findUnique({ where: { id } });
  if (!deal || !canAccessBranch(await allowedStores(), deal.branchId)) return { ok: false as const, error: "Not found" };
  await prisma.comboDeal.update({ where: { id }, data: { isFeatured: false } });
  return { ok: true as const };
}
