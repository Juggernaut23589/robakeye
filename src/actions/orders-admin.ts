"use server";

import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { inngest, orderDelivered } from "@/lib/inngest/client";
import { branchWhere, canAccessBranch, getStaffBranchIds } from "@/lib/staff-scope";
import type { OrderStatus } from "@prisma/client";

const filterSchema = z.object({
  status: z.string().optional(),
  branchId: z.string().optional(),
  query: z.string().optional(),
});

export async function listOrdersForAdmin(input: unknown) {
  const session = await auth();
  if (!session?.user?.permissions.includes("orders.view")) return [];

  const parsed = filterSchema.safeParse(input);
  const filters = parsed.success ? parsed.data : {};
  const allowed = await getStaffBranchIds(session);

  return prisma.order.findMany({
    where: {
      status: filters.status ? (filters.status as OrderStatus) : undefined,
      ...branchWhere(allowed, filters.branchId || undefined),
      ...(filters.query
        ? {
            OR: [
              { orderNumber: { contains: filters.query, mode: "insensitive" } },
              { user: { name: { contains: filters.query, mode: "insensitive" } } },
              { user: { email: { contains: filters.query, mode: "insensitive" } } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      user: { select: { name: true, email: true } },
      branch: { select: { name: true } },
      payments: { where: { status: "SUCCESS" }, select: { id: true } },
    },
  });
}

export async function listBranchesForFilter() {
  const allowed = await getStaffBranchIds(await auth());
  return prisma.branch.findMany({
    where: allowed === null ? undefined : { id: { in: allowed } },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}

export async function getOrderDetail(orderId: string) {
  const session = await auth();
  if (!session?.user?.permissions.includes("orders.view")) return null;

  const allowed = await getStaffBranchIds(session);
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      deliveryPartner: { select: { name: true, phone: true } },
      user: { select: { name: true, email: true, phone: true } },
      branch: { select: { name: true, address: true } },
      address: true,
      items: { include: { product: { select: { name: true, sku: true } } } },
      payments: true,
      statusHistory: { orderBy: { createdAt: "desc" } },
      prescription: { select: { id: true, status: true } },
    },
  });
  if (!order || !canAccessBranch(allowed, order.branchId)) return null;
  return order;
}

const ORDER_STATUS_FLOW: Record<OrderStatus, OrderStatus[]> = {
  PENDING_PAYMENT: ["CANCELLED"],
  PAID: ["PROCESSING", "CANCELLED"],
  PROCESSING: ["OUT_FOR_DELIVERY", "CANCELLED"],
  OUT_FOR_DELIVERY: ["DELIVERED", "CANCELLED"],
  DELIVERED: [],
  CANCELLED: [],
  REFUNDED: [],
};

// Pickup orders skip the rider leg: ready at the store → collected.
function nextStatuses(status: OrderStatus, method: "DELIVERY" | "PICKUP"): OrderStatus[] {
  if (method === "PICKUP" && status === "PROCESSING") return ["DELIVERED", "CANCELLED"];
  return ORDER_STATUS_FLOW[status];
}

const updateStatusSchema = z.object({
  orderId: z.string(),
  status: z.enum(["PENDING_PAYMENT", "PAID", "PROCESSING", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED", "REFUNDED"]),
  note: z.string().optional(),
});

export async function updateOrderStatus(input: unknown) {
  const session = await auth();
  if (!session?.user?.permissions.includes("orders.update_status")) {
    return { ok: false as const, error: "Not authorized" };
  }
  const parsed = updateStatusSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Invalid status update" };

  const order = await prisma.order.findUnique({ where: { id: parsed.data.orderId } });
  const allowedStores = await getStaffBranchIds(session);
  if (!order || !canAccessBranch(allowedStores, order.branchId)) return { ok: false as const, error: "Order not found" };

  const allowedNext = nextStatuses(order.status, order.deliveryMethod);
  if (!allowedNext.includes(parsed.data.status)) {
    return { ok: false as const, error: `Cannot move an order from ${order.status} to ${parsed.data.status}` };
  }
  // A delivery can't leave the store without someone carrying it.
  if (parsed.data.status === "OUT_FOR_DELIVERY" && !order.deliveryPartnerId) {
    return { ok: false as const, error: "Assign a rider (Delivery page) before marking this order out for delivery" };
  }

  await prisma.$transaction([
    prisma.order.update({ where: { id: order.id }, data: { status: parsed.data.status } }),
    prisma.orderStatusHistory.create({
      data: { orderId: order.id, status: parsed.data.status, note: parsed.data.note },
    }),
  ]);

  if (parsed.data.status === "DELIVERED") {
    // Same try/catch-around-send discipline as every other inngest.send()
    // call site in this project — an already-committed DB write (the
    // status update above) must never get undone by a transient dispatch
    // failure.
    try {
      await inngest.send(orderDelivered.create({ orderId: order.id }));
    } catch (err) {
      console.error(`[orders-admin] failed to dispatch order/delivered for ${order.id}`, err);
    }
  }

  return { ok: true as const };
}

export async function exportOrdersCsv(input: unknown) {
  const session = await auth();
  if (!session?.user?.permissions.includes("orders.view")) return { ok: false as const, error: "Not authorized" };

  const orders = await listOrdersForAdmin(input);
  const header = "Order Number,Customer,Email,Branch,Status,Total (NGN),Created At";
  const rows = orders.map((o) =>
    [
      o.orderNumber,
      csvEscape(o.user.name),
      csvEscape(o.user.email),
      csvEscape(o.branch.name),
      o.status,
      (o.totalKobo / 100).toFixed(2),
      o.createdAt.toISOString(),
    ].join(","),
  );
  return { ok: true as const, csv: [header, ...rows].join("\n") };
}

function csvEscape(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}
