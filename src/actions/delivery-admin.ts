"use server";

import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function requireDeliveryManage() {
  const session = await auth();
  return session?.user?.permissions.includes("delivery.manage") ?? false;
}

// ── Active deliveries ───────────────────────────────────────────────────

export async function listActiveDeliveries(branchId?: string) {
  if (!(await requireDeliveryManage())) return [];
  return prisma.order.findMany({
    where: {
      deliveryMethod: "DELIVERY",
      status: { in: ["PROCESSING", "OUT_FOR_DELIVERY"] },
      branchId: branchId || undefined,
    },
    include: {
      user: { select: { name: true, phone: true } },
      branch: { select: { name: true } },
      address: true,
      deliveryPartner: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "asc" },
  });
}

export async function listDeliveryPartners() {
  if (!(await requireDeliveryManage())) return [];
  return prisma.deliveryPartner.findMany({ orderBy: { name: "asc" } });
}

export async function createDeliveryPartner(name: string) {
  if (!(await requireDeliveryManage())) return { ok: false as const, error: "Not authorized" };
  if (!name.trim()) return { ok: false as const, error: "Name required" };
  await prisma.deliveryPartner.create({ data: { name: name.trim() } });
  return { ok: true as const };
}

export async function toggleDeliveryPartnerActive(id: string) {
  if (!(await requireDeliveryManage())) return { ok: false as const, error: "Not authorized" };
  const partner = await prisma.deliveryPartner.findUnique({ where: { id } });
  if (!partner) return { ok: false as const, error: "Not found" };
  await prisma.deliveryPartner.update({ where: { id }, data: { isActive: !partner.isActive } });
  return { ok: true as const };
}

export async function assignDeliveryPartner(orderId: string, partnerId: string | null) {
  if (!(await requireDeliveryManage())) return { ok: false as const, error: "Not authorized" };
  await prisma.order.update({ where: { id: orderId }, data: { deliveryPartnerId: partnerId } });
  return { ok: true as const };
}

// ── Delivery zones (fee tiers) ──────────────────────────────────────────

export async function listDeliveryZonesByBranch() {
  if (!(await requireDeliveryManage())) return [];
  return prisma.branch.findMany({
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
  await prisma.deliveryZone.create({ data: parsed.data });
  return { ok: true as const };
}

export async function updateDeliveryZone(id: string, input: unknown) {
  if (!(await requireDeliveryManage())) return { ok: false as const, error: "Not authorized" };
  const parsed = zoneSchema.omit({ branchId: true }).safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Invalid delivery zone details" };
  await prisma.deliveryZone.update({ where: { id }, data: parsed.data });
  return { ok: true as const };
}

export async function deleteDeliveryZone(id: string) {
  if (!(await requireDeliveryManage())) return { ok: false as const, error: "Not authorized" };
  await prisma.deliveryZone.delete({ where: { id } });
  return { ok: true as const };
}
