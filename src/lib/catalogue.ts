import { prisma } from "@/lib/prisma";
import { Prisma, Vertical } from "@prisma/client";

export type SortKey = "newest" | "price_asc" | "price_desc" | "name";
const PAGE_SIZE = 12;

export type ListingFilters = {
  category?: string;
  minPrice?: number; // naira, converted to kobo internally
  maxPrice?: number;
  inStockOnly?: boolean;
  branchId?: string; // required for inStockOnly to mean anything specific
  sort?: SortKey;
  page?: number;
  q?: string;
};

function sortToOrderBy(sort: SortKey | undefined): Prisma.ProductOrderByWithRelationInput {
  switch (sort) {
    case "price_asc":
      return { priceKobo: "asc" };
    case "price_desc":
      return { priceKobo: "desc" };
    case "name":
      return { name: "asc" };
    case "newest":
    default:
      return { createdAt: "desc" };
  }
}

export async function listProducts(vertical: Vertical, filters: ListingFilters) {
  const page = Math.max(1, filters.page ?? 1);

  const where: Prisma.ProductWhereInput = {
    vertical,
    isActive: true,
    // Controlled products never appear in a browsable/purchasable listing
    // anywhere — docs/pharmacy-vet-compliance.html's core rule, enforced
    // here by omission so no UI layer has to remember to hide them.
    class: { not: "CONTROLLED" },
  };
  if (filters.category) where.category = { slug: filters.category };
  if (filters.q) where.name = { contains: filters.q, mode: "insensitive" };
  if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
    where.priceKobo = {
      ...(filters.minPrice !== undefined ? { gte: Math.round(filters.minPrice * 100) } : {}),
      ...(filters.maxPrice !== undefined ? { lte: Math.round(filters.maxPrice * 100) } : {}),
    };
  }
  // Per-location catalogue: once a branch is selected, a product only
  // belongs in its listing at all if that branch actually carries it (a
  // BranchInventory row exists) — a branch that's never stocked a product
  // (e.g. veterinary items at a non-vet branch) simply doesn't show it,
  // same as the product never existed for that location. Within that,
  // inStockOnly additionally requires quantity > 0; without it, a carried
  // but currently-empty item still appears, flagged "Out of stock" by
  // ProductCard — never hidden outright just for being at zero.
  if (filters.branchId) {
    where.inventory = {
      some: {
        branchId: filters.branchId,
        ...(filters.inStockOnly ? { quantity: { gt: 0 } } : {}),
      },
    };
  } else if (filters.inStockOnly) {
    where.inventory = { some: { quantity: { gt: 0 } } };
  }

  const [items, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: sortToOrderBy(filters.sort),
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        slug: true,
        name: true,
        priceKobo: true,
        images: true,
        class: true,
        vertical: true,
        inventory: { select: { quantity: true }, where: filters.branchId ? { branchId: filters.branchId } : undefined },
      },
    }),
    prisma.product.count({ where }),
  ]);

  return {
    items,
    total,
    page,
    pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    pageSize: PAGE_SIZE,
  };
}

export async function getCategoriesForVertical(vertical: Vertical) {
  return prisma.category.findMany({
    where: { vertical },
    select: { id: true, slug: true, name: true },
    orderBy: { name: "asc" },
  });
}

export async function getProductBySlug(slug: string) {
  return prisma.product.findUnique({
    where: { slug },
    include: {
      category: { select: { slug: true, name: true } },
      reviews: {
        select: { id: true, rating: true, body: true, createdAt: true, user: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
        take: 10,
      },
    },
  });
}

export async function getRelatedProducts(categoryId: string, excludeId: string, branchId?: string) {
  return prisma.product.findMany({
    where: {
      categoryId,
      id: { not: excludeId },
      isActive: true,
      class: { not: "CONTROLLED" },
      // Same per-location scoping as listProducts — don't cross-sell a
      // product this branch doesn't even carry.
      ...(branchId ? { inventory: { some: { branchId } } } : {}),
    },
    select: { id: true, slug: true, name: true, priceKobo: true, images: true, vertical: true },
    take: 4,
  });
}
