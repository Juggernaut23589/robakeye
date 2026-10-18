import { prisma } from "@/lib/prisma";
import { Prisma, Vertical } from "@prisma/client";

// Every query here takes a branchId: a store only ever shows its own
// listings (Product.branchId), so there's no way to render another store's
// stock or price by accident.

export type SortKey = "newest" | "price_asc" | "price_desc" | "name";
const PAGE_SIZE = 12;

export type ListingFilters = {
  category?: string;
  minPrice?: number; // naira, converted to kobo internally
  maxPrice?: number;
  inStockOnly?: boolean;
  sort?: SortKey;
  page?: number;
  q?: string;
};

export const cardSelect = {
  id: true,
  slug: true,
  name: true,
  priceKobo: true,
  images: true,
  class: true,
  vertical: true,
  stockQuantity: true,
} as const satisfies Prisma.ProductSelect;

function sortToOrderBy(sort: SortKey | undefined): Prisma.ProductOrderByWithRelationInput[] {
  switch (sort) {
    case "price_asc":
      return [{ priceKobo: "asc" }];
    case "price_desc":
      return [{ priceKobo: "desc" }];
    case "name":
      return [{ name: "asc" }];
    case "newest":
    default:
      return [{ createdAt: "desc" }, { name: "asc" }];
  }
}

// Controlled products never appear in a browsable/purchasable listing —
// docs/pharmacy-vet-compliance.html's core rule, enforced here by omission
// so no UI layer has to remember to hide them. (Their detail page still
// renders, informational only.)
function browsable(branchId: string): Prisma.ProductWhereInput {
  return { branchId, isActive: true, class: { not: "CONTROLLED" } };
}

export async function listProducts(branchId: string, vertical: Vertical | null, filters: ListingFilters) {
  const page = Math.max(1, filters.page ?? 1);

  const where: Prisma.ProductWhereInput = { ...browsable(branchId) };
  if (vertical) where.vertical = vertical;
  if (filters.category) where.category = { slug: filters.category };
  if (filters.q) {
    where.OR = [
      { name: { contains: filters.q, mode: "insensitive" } },
      { description: { contains: filters.q, mode: "insensitive" } },
      { category: { name: { contains: filters.q, mode: "insensitive" } } },
    ];
  }
  if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
    where.priceKobo = {
      ...(filters.minPrice !== undefined ? { gte: Math.round(filters.minPrice * 100) } : {}),
      ...(filters.maxPrice !== undefined ? { lte: Math.round(filters.maxPrice * 100) } : {}),
    };
  }
  // Out-of-stock listings still show (flagged "Out of stock" with a notify
  // option) unless the shopper asks to hide them.
  if (filters.inStockOnly) where.stockQuantity = { gt: 0 };

  const [items, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: sortToOrderBy(filters.sort),
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: cardSelect,
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

// Only categories this store actually has listings in — an empty
// "Antimalarials" filter at a store that doesn't stock any is just noise.
export async function getStoreCategories(branchId: string, vertical: Vertical) {
  return prisma.category.findMany({
    where: { vertical, products: { some: browsable(branchId) } },
    select: { id: true, slug: true, name: true },
    orderBy: { name: "asc" },
  });
}

export async function getStoreProduct(branchId: string, slug: string) {
  return prisma.product.findUnique({
    where: { branchId_slug: { branchId, slug } },
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

export async function getRelatedProducts(branchId: string, categoryId: string, excludeId: string) {
  return prisma.product.findMany({
    where: { ...browsable(branchId), categoryId, id: { not: excludeId } },
    select: cardSelect,
    orderBy: [{ stockQuantity: "desc" }],
    take: 4,
  });
}

// Store home: a short, in-stock-first shelf per department the store runs.
export async function getDepartmentShelves(branchId: string, verticals: Vertical[], perShelf = 8) {
  const shelves = await Promise.all(
    verticals.map(async (vertical) => {
      const [items, total] = await Promise.all([
        prisma.product.findMany({
          where: { ...browsable(branchId), vertical },
          select: cardSelect,
          orderBy: [{ stockQuantity: "desc" }, { name: "asc" }],
          take: perShelf,
        }),
        prisma.product.count({ where: { ...browsable(branchId), vertical } }),
      ]);
      return { vertical, items, total };
    }),
  );
  return shelves.filter((s) => s.total > 0);
}

export async function getFeaturedCombo(branchId: string) {
  const now = new Date();
  const deal = await prisma.comboDeal.findFirst({
    where: { branchId, isActive: true, isFeatured: true, startsAt: { lte: now }, endsAt: { gte: now } },
    orderBy: { updatedAt: "desc" },
  });
  if (!deal) return null;
  const products = await prisma.product.findMany({
    where: { id: { in: deal.productIds }, branchId, isActive: true },
    select: cardSelect,
  });
  return { deal, products };
}
