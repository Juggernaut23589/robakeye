"use server";

import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getProductImageUploadSignature, isCloudinaryConfigured } from "@/lib/cloudinary";
import type { Vertical, ProductClass } from "@prisma/client";

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

export async function listProductsForAdmin(query?: string) {
  const session = await auth();
  if (!session?.user?.permissions.includes("products.view")) return [];

  return prisma.product.findMany({
    where: query
      ? {
          OR: [
            { name: { contains: query, mode: "insensitive" } },
            { sku: { contains: query, mode: "insensitive" } },
          ],
        }
      : undefined,
    include: { category: { select: { name: true } } },
    orderBy: { updatedAt: "desc" },
    take: 100,
  });
}

export async function listCategories() {
  return prisma.category.findMany({ orderBy: { name: "asc" } });
}

export async function listBranches() {
  return prisma.branch.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } });
}

export async function getProductForEdit(id: string) {
  const session = await auth();
  if (!session?.user?.permissions.includes("products.view")) return null;

  return prisma.product.findUnique({
    where: { id },
    include: { inventory: { include: { branch: { select: { name: true } } } } },
  });
}

const productSchema = z.object({
  sku: z.string().min(1),
  slug: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  vertical: z.enum(["PHARMACY", "VETERINARY", "SUPERMARKET"]),
  class: z.enum(["OTC", "POM", "CONTROLLED"]),
  categoryId: z.string().min(1),
  priceKobo: z.number().int().positive(),
  images: z.array(z.string()).default([]),
  isActive: z.boolean().default(true),
});

export async function createProduct(input: unknown) {
  const session = await auth();
  if (!session?.user?.permissions.includes("products.write")) {
    return { ok: false as const, error: "Not authorized" };
  }
  const parsed = productSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Invalid product details" };

  const product = await prisma.product.create({ data: parsed.data });
  return { ok: true as const, productId: product.id };
}

export async function updateProduct(id: string, input: unknown) {
  const session = await auth();
  if (!session?.user?.permissions.includes("products.write")) {
    return { ok: false as const, error: "Not authorized" };
  }
  const parsed = productSchema.partial().safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Invalid product details" };

  await prisma.product.update({ where: { id }, data: parsed.data as Partial<{
    sku: string; slug: string; name: string; description: string; vertical: Vertical;
    class: ProductClass; categoryId: string; priceKobo: number; images: string[]; isActive: boolean;
  }> });
  return { ok: true as const };
}

export async function deactivateProduct(id: string) {
  const session = await auth();
  if (!session?.user?.permissions.includes("products.write")) {
    return { ok: false as const, error: "Not authorized" };
  }
  await prisma.product.update({ where: { id }, data: { isActive: false } });
  return { ok: true as const };
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

const inventorySchema = z.object({
  productId: z.string(),
  branchId: z.string(),
  quantity: z.number().int().min(0),
  lowStockAt: z.number().int().min(0),
  expiryDate: z.string().optional(),
});

export async function updateBranchInventory(input: unknown) {
  const session = await auth();
  if (!session?.user?.permissions.includes("inventory.write")) {
    return { ok: false as const, error: "Not authorized" };
  }
  const parsed = inventorySchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Invalid inventory details" };

  await prisma.branchInventory.upsert({
    where: { branchId_productId: { branchId: parsed.data.branchId, productId: parsed.data.productId } },
    create: {
      branchId: parsed.data.branchId,
      productId: parsed.data.productId,
      quantity: parsed.data.quantity,
      lowStockAt: parsed.data.lowStockAt,
      expiryDate: parsed.data.expiryDate ? new Date(parsed.data.expiryDate) : null,
    },
    update: {
      quantity: parsed.data.quantity,
      lowStockAt: parsed.data.lowStockAt,
      expiryDate: parsed.data.expiryDate ? new Date(parsed.data.expiryDate) : null,
    },
  });
  return { ok: true as const };
}

// Bulk product CSV upload — expects header row:
// sku,slug,name,vertical,class,categorySlug,priceNaira
// One malformed row doesn't abort the whole batch; each row's outcome is
// reported back so the admin can fix just the bad ones.
const bulkRowSchema = z.object({
  sku: z.string().min(1),
  slug: z.string().min(1),
  name: z.string().min(1),
  vertical: z.enum(["PHARMACY", "VETERINARY", "SUPERMARKET"]),
  class: z.enum(["OTC", "POM", "CONTROLLED"]),
  categorySlug: z.string().min(1),
  priceNaira: z.coerce.number().positive(),
});

export async function bulkUploadProducts(rows: Record<string, string>[]) {
  const session = await auth();
  if (!session?.user?.permissions.includes("products.write")) {
    return { ok: false as const, error: "Not authorized" };
  }

  const categories = await prisma.category.findMany({ select: { id: true, slug: true } });
  const categoryBySlug = new Map(categories.map((c) => [c.slug, c.id]));

  const results: { row: number; sku?: string; ok: boolean; error?: string }[] = [];

  for (let i = 0; i < rows.length; i++) {
    const parsed = bulkRowSchema.safeParse(rows[i]);
    if (!parsed.success) {
      results.push({ row: i + 2, ok: false, error: parsed.error.issues[0]?.message ?? "Invalid row" });
      continue;
    }
    const categoryId = categoryBySlug.get(parsed.data.categorySlug);
    if (!categoryId) {
      results.push({ row: i + 2, sku: parsed.data.sku, ok: false, error: `Unknown category "${parsed.data.categorySlug}"` });
      continue;
    }
    try {
      await prisma.product.upsert({
        where: { sku: parsed.data.sku },
        create: {
          sku: parsed.data.sku,
          slug: parsed.data.slug,
          name: parsed.data.name,
          vertical: parsed.data.vertical,
          class: parsed.data.class,
          categoryId,
          priceKobo: Math.round(parsed.data.priceNaira * 100),
        },
        update: {
          slug: parsed.data.slug,
          name: parsed.data.name,
          vertical: parsed.data.vertical,
          class: parsed.data.class,
          categoryId,
          priceKobo: Math.round(parsed.data.priceNaira * 100),
        },
      });
      results.push({ row: i + 2, sku: parsed.data.sku, ok: true });
    } catch (err) {
      results.push({ row: i + 2, sku: parsed.data.sku, ok: false, error: err instanceof Error ? err.message : "Database error" });
    }
  }

  return { ok: true as const, results };
}
