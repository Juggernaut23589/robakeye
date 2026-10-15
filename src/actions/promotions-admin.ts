"use server";

import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function requirePromotionsManage() {
  const session = await auth();
  return session?.user?.permissions.includes("promotions.manage") ?? false;
}

// ── Promo codes ─────────────────────────────────────────────────────────

export async function listPromotions() {
  if (!(await requirePromotionsManage())) return [];
  return prisma.promotion.findMany({
    where: { generatedForUserId: null }, // hide abandoned-cart system-generated codes from the admin list
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
});

export async function createPromotion(input: unknown) {
  if (!(await requirePromotionsManage())) return { ok: false as const, error: "Not authorized" };
  const parsed = promoSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Invalid promo code details" };

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
  return prisma.comboDeal.findMany({ orderBy: { createdAt: "desc" } });
}

export async function listProductsForPicker(query?: string) {
  if (!(await requirePromotionsManage())) return [];
  return prisma.product.findMany({
    where: query ? { name: { contains: query, mode: "insensitive" } } : undefined,
    select: { id: true, name: true, sku: true, priceKobo: true },
    orderBy: { name: "asc" },
    take: 30,
  });
}

const comboSchema = z.object({
  name: z.string().min(1),
  productIds: z.array(z.string()).min(2),
  discountType: z.enum(["FIXED_PRICE", "PERCENT_OFF"]),
  valueKobo: z.number().int().positive().optional(),
  percentOff: z.number().int().min(1).max(100).optional(),
  startsAt: z.string(),
  endsAt: z.string(),
  isFeaturedOnHomepage: z.boolean().default(false),
  bannerHeadline: z.string().optional(),
});

export async function createComboDeal(input: unknown) {
  if (!(await requirePromotionsManage())) return { ok: false as const, error: "Not authorized" };
  const parsed = comboSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Invalid combo deal details" };

  // Only one deal is ever the live homepage banner at a time.
  if (parsed.data.isFeaturedOnHomepage) {
    await prisma.comboDeal.updateMany({ data: { isFeaturedOnHomepage: false }, where: { isFeaturedOnHomepage: true } });
  }

  await prisma.comboDeal.create({
    data: {
      name: parsed.data.name,
      productIds: parsed.data.productIds,
      discountType: parsed.data.discountType,
      valueKobo: parsed.data.discountType === "FIXED_PRICE" ? parsed.data.valueKobo : undefined,
      percentOff: parsed.data.discountType === "PERCENT_OFF" ? parsed.data.percentOff : undefined,
      startsAt: new Date(parsed.data.startsAt),
      endsAt: new Date(parsed.data.endsAt),
      isFeaturedOnHomepage: parsed.data.isFeaturedOnHomepage,
      bannerHeadline: parsed.data.bannerHeadline,
    },
  });
  return { ok: true as const };
}

export async function toggleComboDealActive(id: string) {
  if (!(await requirePromotionsManage())) return { ok: false as const, error: "Not authorized" };
  const deal = await prisma.comboDeal.findUnique({ where: { id } });
  if (!deal) return { ok: false as const, error: "Not found" };
  await prisma.comboDeal.update({ where: { id }, data: { isActive: !deal.isActive } });
  return { ok: true as const };
}

export async function setFeaturedComboDeal(id: string) {
  if (!(await requirePromotionsManage())) return { ok: false as const, error: "Not authorized" };
  await prisma.$transaction([
    prisma.comboDeal.updateMany({ data: { isFeaturedOnHomepage: false }, where: { isFeaturedOnHomepage: true } }),
    prisma.comboDeal.update({ where: { id }, data: { isFeaturedOnHomepage: true } }),
  ]);
  return { ok: true as const };
}

export async function unfeatureComboDeal(id: string) {
  if (!(await requirePromotionsManage())) return { ok: false as const, error: "Not authorized" };
  await prisma.comboDeal.update({ where: { id }, data: { isFeaturedOnHomepage: false } });
  return { ok: true as const };
}
