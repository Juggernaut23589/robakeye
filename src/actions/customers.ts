"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function listCustomers(query?: string) {
  const session = await auth();
  if (!session?.user?.permissions.includes("customers.view")) return [];

  return prisma.user.findMany({
    where: {
      kind: "CUSTOMER",
      ...(query
        ? {
            OR: [
              { name: { contains: query, mode: "insensitive" } },
              { email: { contains: query, mode: "insensitive" } },
              { phone: { contains: query, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      createdAt: true,
      _count: { select: { orders: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
}

export async function getCustomerProfile(id: string) {
  const session = await auth();
  if (!session?.user?.permissions.includes("customers.view")) return null;

  const user = await prisma.user.findFirst({
    where: { id, kind: "CUSTOMER" },
    include: {
      orders: {
        orderBy: { createdAt: "desc" },
        take: 20,
        include: { branch: { select: { name: true } } },
      },
      prescriptions: {
        orderBy: { createdAt: "desc" },
        take: 20,
        select: { id: true, status: true, createdAt: true },
      },
      vetAppointments: {
        orderBy: { startsAt: "desc" },
        take: 20,
        include: { pet: { select: { name: true } }, service: { select: { name: true } } },
      },
      addresses: true,
    },
  });
  return user;
}
