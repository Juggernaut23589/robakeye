"use server";

import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { branchWhere, canAccessBranch, getStaffBranchIds } from "@/lib/staff-scope";

async function requireDeliveryManage() {
  const session = await auth();
  return session?.user?.permissions.includes("delivery.manage") ?? false;
}

// Each store dispatches its own orders from its own address; coordinators
// limited to their store(s) only see and act on those.
async function allowedStores() {
  return getStaffBranchIds(await auth());
}

// ── Active deliveries ───────────────────────────────────────────────────

export async function listActiveDeliveries(branchId?: string) {
  if (!(await requireDeliveryManage())) return [];
  const allowed = await allowedStores();
  return prisma.order.findMany({
    where: {
      deliveryMethod: "DELIVERY",
      status: { in: ["PROCESSING", "OUT_FOR_DELIVERY"] },
      ...branchWhere(allowed, branchId || undefined),
    },
    include: {
      user: { select: { name: true, phone: true } },
      branch: { select: { id: true, name: true, address: true } },
      address: true,
      deliveryPartner: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "asc" },
  });
}

export async function listDeliveryPartners() {
  if (!(await requireDeliveryManage())) return [];
  const allowed = await allowedStores();
  return prisma.deliveryPartner.findMany({
    // Shared couriers (no store) are visible to everyone.
    where: allowed === null ? undefined : { OR: [{ branchId: null }, { branchId: { in: allowed } }] },
    include: { branch: { select: { name: true } } },
    orderBy: [{ branchId: "asc" }, { name: "asc" }],
  });
}

const partnerSchema = z.object({
  name: z.string().trim().min(1, "Name required"),
  phone: z.string().trim().optional(),
  branchId: z.string().optional(), // empty = shared courier any store can dispatch
});

export async function createDeliveryPartner(input: unknown) {
  if (!(await requireDeliveryManage())) return { ok: false as const, error: "Not authorized" };
  const parsed = partnerSchema.safeParse(typeof input === "string" ? { name: input } : input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid rider" };
  const allowed = await allowedStores();
  if (parsed.data.branchId ? !canAccessBranch(allowed, parsed.data.branchId) : allowed !== null) {
    return { ok: false as const, error: "Attach the rider to one of your stores" };
  }
  await prisma.deliveryPartner.create({
    data: { name: parsed.data.name, phone: parsed.data.phone || null, branchId: parsed.data.branchId || null },
  });
  return { ok: true as const };
}

export async function toggleDeliveryPartnerActive(id: string) {
  if (!(await requireDeliveryManage())) return { ok: false as const, error: "Not authorized" };
  const partner = await prisma.deliveryPartner.findUnique({ where: { id } });
  const allowed = await allowedStores();
  if (!partner || (partner.branchId ? !canAccessBranch(allowed, partner.branchId) : allowed !== null)) {
    return { ok: false as const, error: "Not found" };
  }
  await prisma.deliveryPartner.update({ where: { id }, data: { isActive: !partner.isActive } });
  return { ok: true as const };
}

// A store's in-house rider can only carry that store's orders; shared
// couriers can carry anyone's. Pickup orders never get a rider.
export async function assignDeliveryPartner(orderId: string, partnerId: string | null) {
  if (!(await requireDeliveryManage())) return { ok: false as const, error: "Not authorized" };
  const order = await prisma.order.findUnique({ where: { id: orderId }, select: { branchId: true, deliveryMethod: true } });
  const allowed = await allowedStores();
  if (!order || !canAccessBranch(allowed, order.branchId)) return { ok: false as const, error: "Order not found" };
  if (order.deliveryMethod !== "DELIVERY") return { ok: false as const, error: "Pickup orders don't need a rider" };

  if (partnerId) {
    const partner = await prisma.deliveryPartner.findUnique({ where: { id: partnerId } });
    if (!partner || !partner.isActive) return { ok: false as const, error: "That rider isn't available" };
    if (partner.branchId && partner.branchId !== order.branchId) {
      return { ok: false as const, error: "That rider belongs to another store" };
    }
  }
  await prisma.order.update({ where: { id: orderId }, data: { deliveryPartnerId: partnerId } });
  return { ok: true as const };
}

// ── Delivery zones (fee tiers) ──────────────────────────────────────────

export async function listDeliveryZonesByBranch() {
  if (!(await requireDeliveryManage())) return [];
  const allowed = await allowedStores();
  return prisma.branch.findMany({
    where: allowed === null ? undefined : { id: { in: allowed } },
    select: { id: true, name: true, deliveryZones: true },
    orderBy: { name: "asc" },
  });
}

const zoneSchema = z.object({
  branchId: z.string(),
  name: z.string().min(1),
  maxKm: z.number().positive(),
  baseFeeKobo: z.number().int().min(0),
  perKmFeeKobo: z.number().int().min(0),
});

export async function createDeliveryZone(input: unknown) {
  if (!(await requireDeliveryManage())) return { ok: false as const, error: "Not authorized" };
  const parsed = zoneSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Invalid delivery zone details" };
  if (!canAccessBranch(await allowedStores(), parsed.data.branchId)) return { ok: false as const, error: "Not authorized for that store" };
  await prisma.deliveryZone.create({ data: parsed.data });
  return { ok: true as const };
}

export async function updateDeliveryZone(id: string, input: unknown) {
  if (!(await requireDeliveryManage())) return { ok: false as const, error: "Not authorized" };
  const parsed = zoneSchema.omit({ branchId: true }).safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Invalid delivery zone details" };
  const zone = await prisma.deliveryZone.findUnique({ where: { id }, select: { branchId: true } });
  if (!zone || !canAccessBranch(await allowedStores(), zone.branchId)) return { ok: false as const, error: "Not found" };
  await prisma.deliveryZone.update({ where: { id }, data: parsed.data });
  return { ok: true as const };
}

export async function deleteDeliveryZone(id: string) {
  if (!(await requireDeliveryManage())) return { ok: false as const, error: "Not authorized" };
  const zone = await prisma.deliveryZone.findUnique({ where: { id }, select: { branchId: true } });
  if (!zone || !canAccessBranch(await allowedStores(), zone.branchId)) return { ok: false as const, error: "Not found" };
  await prisma.deliveryZone.delete({ where: { id } });
  return { ok: true as const };
}
