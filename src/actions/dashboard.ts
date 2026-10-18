"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { branchWhere, getStaffBranchIds } from "@/lib/staff-scope";

const REVENUE_WINDOW_DAYS = 14;

export async function getDashboardOverview() {
  const session = await auth();
  if (!session?.user?.permissions.includes("dashboard.view")) return null;

  // Branch-scoped staff see their own store's numbers only.
  const allowed = await getStaffBranchIds(session);
  const scope = branchWhere(allowed);

  const since = new Date(Date.now() - REVENUE_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [paidOrders, ordersToday, pendingPrescriptions, allInventory, recentOrders, unreadAlerts] =
    await Promise.all([
      prisma.order.findMany({
        where: { ...scope, createdAt: { gte: since }, status: { notIn: ["PENDING_PAYMENT", "CANCELLED"] } },
        select: { createdAt: true, totalKobo: true },
      }),
      prisma.order.count({ where: { ...scope, createdAt: { gte: startOfToday } } }),
      prisma.prescription.count({ where: { ...scope, status: "PENDING" } }),
      // Prisma Client can't compare two columns of the same row in a
      // `where` clause, so the quantity<=lowStockAt filter happens in JS
      // below instead of in SQL.
      prisma.product.findMany({
        where: { ...scope, isActive: true },
        select: { id: true, name: true, stockQuantity: true, lowStockAt: true, branch: { select: { name: true } } },
        orderBy: { stockQuantity: "asc" },
      }),
      prisma.order.findMany({
        where: scope,
        orderBy: { createdAt: "desc" },
        take: 8,
        include: { user: { select: { name: true } }, branch: { select: { name: true } } },
      }),
      prisma.adminAlert.findMany({
        where: { isRead: false, ...(allowed === null ? {} : { OR: [{ branchId: null }, { branchId: { in: allowed } }] }) },
        orderBy: { createdAt: "desc" },
        take: 10,
        include: { product: { select: { name: true } }, branch: { select: { name: true } } },
      }),
    ]);

  const lowStockAll = allInventory.filter((i) => i.stockQuantity <= i.lowStockAt);
  const lowStock = lowStockAll.slice(0, 10).map((i) => ({
    id: i.id,
    quantity: i.stockQuantity,
    lowStockAt: i.lowStockAt,
    product: { name: i.name },
    branch: i.branch,
  }));

  const revenueByDay = new Map<string, number>();
  for (let i = 0; i < REVENUE_WINDOW_DAYS; i++) {
    const d = new Date(since.getTime() + i * 24 * 60 * 60 * 1000);
    revenueByDay.set(d.toISOString().slice(0, 10), 0);
  }
  for (const order of paidOrders) {
    const key = order.createdAt.toISOString().slice(0, 10);
    revenueByDay.set(key, (revenueByDay.get(key) ?? 0) + order.totalKobo);
  }

  const revenueSeries = Array.from(revenueByDay.entries()).map(([date, totalKobo]) => ({
    date,
    totalNaira: Math.round(totalKobo / 100),
  }));

  return {
    totalRevenueKobo: paidOrders.reduce((sum, o) => sum + o.totalKobo, 0),
    ordersToday,
    pendingPrescriptions,
    lowStockCount: lowStockAll.length,
    revenueSeries,
    recentOrders,
    lowStock,
    unreadAlerts,
  };
}
