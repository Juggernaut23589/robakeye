"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const REVENUE_WINDOW_DAYS = 14;

export async function getDashboardOverview() {
  const session = await auth();
  if (!session?.user?.permissions.includes("dashboard.view")) return null;

  const since = new Date(Date.now() - REVENUE_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [paidOrders, ordersToday, pendingPrescriptions, allInventory, recentOrders, unreadAlerts] =
    await Promise.all([
      prisma.order.findMany({
        where: { createdAt: { gte: since }, status: { notIn: ["PENDING_PAYMENT", "CANCELLED"] } },
        select: { createdAt: true, totalKobo: true },
      }),
      prisma.order.count({ where: { createdAt: { gte: startOfToday } } }),
      prisma.prescription.count({ where: { status: "PENDING" } }),
      // Prisma Client can't compare two columns of the same row in a
      // `where` clause, so the quantity<=lowStockAt filter happens in JS
      // below instead of in SQL.
      prisma.branchInventory.findMany({
        include: { product: { select: { name: true } }, branch: { select: { name: true } } },
      }),
      prisma.order.findMany({
        orderBy: { createdAt: "desc" },
        take: 8,
        include: { user: { select: { name: true } }, branch: { select: { name: true } } },
      }),
      prisma.adminAlert.findMany({
        where: { isRead: false },
        orderBy: { createdAt: "desc" },
        take: 10,
        include: { product: { select: { name: true } }, branch: { select: { name: true } } },
      }),
    ]);

  const lowStock = allInventory.filter((i) => i.quantity <= i.lowStockAt).slice(0, 10);

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
    lowStockCount: lowStock.length,
    revenueSeries,
    recentOrders,
    lowStock,
    unreadAlerts,
  };
}
