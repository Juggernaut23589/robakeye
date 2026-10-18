"use server";

import { z } from "zod";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getProductImageUploadSignature, isCloudinaryConfigured } from "@/lib/cloudinary";
import { branchWhere, canAccessBranch, getStaffBranchIds } from "@/lib/staff-scope";
import { inngest, productRestocked } from "@/lib/inngest/client";

// Every listing belongs to exactly one store. Staff only see and edit the
// listings of stores they're assigned to (branchScope OWN), and a
// listing's store never changes after creation — to sell the same item
// elsewhere, copy it to that store (copyProductToStore) so each store
// keeps its own price and stock.

function friendlyUniqueError(err: unknown) {
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
    const target = String((err.meta as { target?: string[] | string } | undefined)?.target ?? "");
    if (target.includes("sku")) return "That SKU is already used at this store";
    if (target.includes("slug")) return "That slug is already used at this store";
    return "A listing with these details already exists at this store";
  }
  return null;
}

export async function getImageUploadSignature() {
  const session = await auth();
  if (!session?.user?.permissions.includes("products.write")) {
    return { ok: false as const, error: "Not authorized" };
  }
  if (!isCloudinaryConfigured()) {
    return { ok: false as const, error: "Image uploads are not configured in this environment" };
  }
  return { ok: true as const, signature: getProductImageUploadSignature() };
}

export async function listProductsForAdmin(filters: { q?: string; branchId?: string; stock?: "low" | "out" } = {}) {
  const session = await auth();
  if (!session?.user?.permissions.includes("products.view")) return [];
  const allowed = await getStaffBranchIds(session);

  const where: Prisma.ProductWhereInput = { ...branchWhere(allowed, filters.branchId) };
  if (filters.q) {
    where.OR = [
      { name: { contains: filters.q, mode: "insensitive" } },
      { sku: { contains: filters.q, mode: "insensitive" } },
    ];
  }
  if (filters.stock === "out") where.stockQuantity = 0;

  const rows = await prisma.product.findMany({
    where,
    include: { category: { select: { name: true } }, branch: { select: { id: true, name: true, slug: true } } },
    orderBy: [{ updatedAt: "desc" }],
    take: 200,
  });
  // "Low" compares two columns, which Prisma can't express in a where.
  return filters.stock === "low" ? rows.filter((r) => r.stockQuantity > 0 && r.stockQuantity <= r.lowStockAt) : rows;
}

export async function listCategories() {
  return prisma.category.findMany({ orderBy: { name: "asc" } });
}

// The stores the signed-in staff member may manage.
export async function listBranches() {
  const session = await auth();
  const allowed = await getStaffBranchIds(session);
  return prisma.branch.findMany({
    where: allowed === null ? undefined : { id: { in: allowed } },
    select: { id: true, name: true, slug: true, services: true },
    orderBy: { name: "asc" },
  });
}

export async function getProductForEdit(id: string) {
  const session = await auth();
  if (!session?.user?.permissions.includes("products.view")) return null;
  const allowed = await getStaffBranchIds(session);

  const product = await prisma.product.findUnique({
    where: { id },
    include: { branch: { select: { id: true, name: true, slug: true, services: true } } },
  });
  if (!product || !canAccessBranch(allowed, product.branchId)) return null;

  // Same item at the other stores (matched by slug) — shown so a manager
  // can see sibling prices/stock, and offered as "copy to store" targets.
  const siblings = await prisma.product.findMany({
    where: { slug: product.slug, id: { not: product.id } },
    select: { id: true, priceKobo: true, stockQuantity: true, isActive: true, branch: { select: { id: true, name: true } } },
  });
  return { ...product, siblings };
}

const productSchema = z.object({
  branchId: z.string().min(1),
  sku: z.string().trim().min(1),
  slug: z
    .string()
    .trim()
    .min(1)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug can only contain lowercase letters, numbers and dashes"),
  name: z.string().trim().min(1),
  description: z.string().optional(),
  vertical: z.enum(["PHARMACY", "VETERINARY", "SUPERMARKET"]),
  class: z.enum(["OTC", "POM", "CONTROLLED"]),
  categoryId: z.string().min(1),
  priceKobo: z.number().int().positive(),
  images: z.array(z.string()).default([]),
  isActive: z.boolean().default(true),
  stockQuantity: z.number().int().min(0).default(0),
  lowStockAt: z.number().int().min(0).default(5),
});

async function assertCategoryMatches(categoryId: string, vertical: string) {
  const category = await prisma.category.findUnique({ where: { id: categoryId }, select: { vertical: true } });
  return category?.vertical === vertical;
}

export async function createProduct(input: unknown) {
  const session = await auth();
  if (!session?.user?.permissions.includes("products.write")) {
    return { ok: false as const, error: "Not authorized" };
  }
  const parsed = productSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid product details" };

  const allowed = await getStaffBranchIds(session);
  if (!canAccessBranch(allowed, parsed.data.branchId)) return { ok: false as const, error: "You can't add products to that store" };

  const branch = await prisma.branch.findUnique({ where: { id: parsed.data.branchId }, select: { services: true, name: true } });
  if (!branch) return { ok: false as const, error: "Store not found" };
  if (!branch.services.includes(parsed.data.vertical)) {
    return { ok: false as const, error: `${branch.name} doesn't run a ${parsed.data.vertical.toLowerCase()} department` };
  }
  if (!(await assertCategoryMatches(parsed.data.categoryId, parsed.data.vertical))) {
    return { ok: false as const, error: "That category belongs to a different department" };
  }

  try {
    const product = await prisma.product.create({ data: parsed.data });
    return { ok: true as const, productId: product.id };
  } catch (err) {
    const msg = friendlyUniqueError(err);
    if (msg) return { ok: false as const, error: msg };
    throw err;
  }
}

// Store ownership and stock aren't editable here: stock goes through
// updateStock (so restock notifications fire), and a listing never moves
// between stores.
const updateSchema = productSchema.omit({ branchId: true, stockQuantity: true, lowStockAt: true }).partial();

export async function updateProduct(id: string, input: unknown) {
  const session = await auth();
  if (!session?.user?.permissions.includes("products.write")) {
    return { ok: false as const, error: "Not authorized" };
  }
  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid product details" };

  const existing = await prisma.product.findUnique({ where: { id }, select: { branchId: true, vertical: true, categoryId: true } });
  const allowed = await getStaffBranchIds(session);
  if (!existing || !canAccessBranch(allowed, existing.branchId)) return { ok: false as const, error: "Product not found" };

  const vertical = parsed.data.vertical ?? existing.vertical;
  const categoryId = parsed.data.categoryId ?? existing.categoryId;
  if (!(await assertCategoryMatches(categoryId, vertical))) {
    return { ok: false as const, error: "That category belongs to a different department" };
  }

  try {
    await prisma.product.update({ where: { id }, data: parsed.data });
    return { ok: true as const };
  } catch (err) {
    const msg = friendlyUniqueError(err);
    if (msg) return { ok: false as const, error: msg };
    throw err;
  }
}

export async function deactivateProduct(id: string) {
  const session = await auth();
  if (!session?.user?.permissions.includes("products.write")) {
    return { ok: false as const, error: "Not authorized" };
  }
  const existing = await prisma.product.findUnique({ where: { id }, select: { branchId: true } });
  const allowed = await getStaffBranchIds(session);
  if (!existing || !canAccessBranch(allowed, existing.branchId)) return { ok: false as const, error: "Product not found" };
  await prisma.product.update({ where: { id }, data: { isActive: false } });
  return { ok: true as const };
}

const copySchema = z.object({
  productId: z.string(),
  branchId: z.string(),
  priceKobo: z.number().int().positive().optional(),
});

// "Also sell this at <store>": creates that store's own listing (same SKU,
// slug, details and images) starting at zero stock and the same price
// unless one is given. Each store then manages its copy independently.
export async function copyProductToStore(input: unknown) {
  const session = await auth();
  if (!session?.user?.permissions.includes("products.write")) {
    return { ok: false as const, error: "Not authorized" };
  }
  const parsed = copySchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Invalid request" };

  const allowed = await getStaffBranchIds(session);
  const source = await prisma.product.findUnique({ where: { id: parsed.data.productId } });
  if (!source || !canAccessBranch(allowed, source.branchId)) return { ok: false as const, error: "Product not found" };
  if (!canAccessBranch(allowed, parsed.data.branchId)) return { ok: false as const, error: "You can't add products to that store" };

  const target = await prisma.branch.findUnique({ where: { id: parsed.data.branchId }, select: { services: true, name: true } });
  if (!target) return { ok: false as const, error: "Store not found" };
  if (!target.services.includes(source.vertical)) {
    return { ok: false as const, error: `${target.name} doesn't run a ${source.vertical.toLowerCase()} department` };
  }

  try {
    const copy = await prisma.product.create({
      data: {
        branchId: parsed.data.branchId,
        sku: source.sku,
        slug: source.slug,
        name: source.name,
        description: source.description,
        vertical: source.vertical,
        class: source.class,
        categoryId: source.categoryId,
        priceKobo: parsed.data.priceKobo ?? source.priceKobo,
        images: source.images,
        isActive: true,
        stockQuantity: 0,
        lowStockAt: source.lowStockAt,
      },
    });
    return { ok: true as const, productId: copy.id };
  } catch (err) {
    if (friendlyUniqueError(err)) return { ok: false as const, error: `${target.name} already lists this product` };
    throw err;
  }
}

const categorySchema = z.object({
  slug: z.string().min(1),
  name: z.string().min(1),
  vertical: z.enum(["PHARMACY", "VETERINARY", "SUPERMARKET"]),
  parentId: z.string().optional(),
});

export async function createCategory(input: unknown) {
  const session = await auth();
  if (!session?.user?.permissions.includes("products.write")) {
    return { ok: false as const, error: "Not authorized" };
  }
  const parsed = categorySchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Invalid category details" };

  await prisma.category.create({ data: parsed.data });
  return { ok: true as const };
}

const stockSchema = z.object({
  productId: z.string(),
  stockQuantity: z.number().int().min(0),
  lowStockAt: z.number().int().min(0),
  expiryDate: z.string().optional(),
});

export async function updateStock(input: unknown) {
  const session = await auth();
  if (!session?.user?.permissions.includes("inventory.write")) {
    return { ok: false as const, error: "Not authorized" };
  }
  const parsed = stockSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Invalid stock details" };

  const allowed = await getStaffBranchIds(session);
  const existing = await prisma.product.findUnique({
    where: { id: parsed.data.productId },
    select: { branchId: true, stockQuantity: true },
  });
  if (!existing || !canAccessBranch(allowed, existing.branchId)) return { ok: false as const, error: "Product not found" };

  await prisma.product.update({
    where: { id: parsed.data.productId },
    data: {
      stockQuantity: parsed.data.stockQuantity,
      lowStockAt: parsed.data.lowStockAt,
      expiryDate: parsed.data.expiryDate ? new Date(parsed.data.expiryDate) : null,
    },
  });

  // Back in stock at this store → tell the people who asked to be told.
  if (existing.stockQuantity === 0 && parsed.data.stockQuantity > 0) {
    await inngest
      .send(productRestocked.create({ productId: parsed.data.productId }))
      .catch((err) => console.error("[updateStock] restock event failed", err));
  }
  return { ok: true as const };
}

// Bulk product CSV upload — header row:
// storeSlug,sku,slug,name,vertical,class,categorySlug,priceNaira[,stock]
// Rows upsert by (store, SKU). One malformed row doesn't abort the batch;
// each row's outcome is reported so the admin can fix just the bad ones.
const bulkRowSchema = z.object({
  storeSlug: z.string().trim().min(1, "storeSlug is required"),
  sku: z.string().trim().min(1),
  slug: z.string().trim().min(1),
  name: z.string().trim().min(1),
  vertical: z.enum(["PHARMACY", "VETERINARY", "SUPERMARKET"]),
  class: z.enum(["OTC", "POM", "CONTROLLED"]),
  categorySlug: z.string().trim().min(1),
  priceNaira: z.coerce.number().positive(),
  stock: z.coerce.number().int().min(0).optional(),
});

export async function bulkUploadProducts(rows: Record<string, string>[]) {
  const session = await auth();
  if (!session?.user?.permissions.includes("products.write")) {
    return { ok: false as const, error: "Not authorized" };
  }
  const allowed = await getStaffBranchIds(session);

  const [categories, branches] = await Promise.all([
    prisma.category.findMany({ select: { id: true, slug: true, vertical: true } }),
    prisma.branch.findMany({ select: { id: true, slug: true, services: true } }),
  ]);
  const categoryBySlug = new Map(categories.map((c) => [c.slug, c]));
  const branchBySlug = new Map(branches.map((b) => [b.slug, b]));

  const results: { row: number; sku?: string; ok: boolean; error?: string }[] = [];

  for (let i = 0; i < rows.length; i++) {
    const rowNo = i + 2;
    const raw = Object.fromEntries(Object.entries(rows[i]).map(([k, v]) => [k, v === "" ? undefined : v]));
    const parsed = bulkRowSchema.safeParse(raw);
    if (!parsed.success) {
      results.push({ row: rowNo, ok: false, error: parsed.error.issues[0]?.message ?? "Invalid row" });
      continue;
    }
    const d = parsed.data;
    const branch = branchBySlug.get(d.storeSlug);
    if (!branch || !canAccessBranch(allowed, branch.id)) {
      results.push({ row: rowNo, sku: d.sku, ok: false, error: `Unknown or unauthorised store "${d.storeSlug}"` });
      continue;
    }
    if (!branch.services.includes(d.vertical)) {
      results.push({ row: rowNo, sku: d.sku, ok: false, error: `Store "${d.storeSlug}" has no ${d.vertical} department` });
      continue;
    }
    const category = categoryBySlug.get(d.categorySlug);
    if (!category || category.vertical !== d.vertical) {
      results.push({ row: rowNo, sku: d.sku, ok: false, error: `Unknown ${d.vertical} category "${d.categorySlug}"` });
      continue;
    }
    const fields = {
      slug: d.slug,
      name: d.name,
      vertical: d.vertical,
      class: d.class,
      categoryId: category.id,
      priceKobo: Math.round(d.priceNaira * 100),
      ...(d.stock !== undefined ? { stockQuantity: d.stock } : {}),
    };
    try {
      await prisma.product.upsert({
        where: { branchId_sku: { branchId: branch.id, sku: d.sku } },
        create: { ...fields, sku: d.sku, branchId: branch.id },
        update: fields,
      });
      results.push({ row: rowNo, sku: d.sku, ok: true });
    } catch (err) {
      results.push({ row: rowNo, sku: d.sku, ok: false, error: friendlyUniqueError(err) ?? (err instanceof Error ? err.message : "Database error") });
    }
  }

  return { ok: true as const, results };
}
