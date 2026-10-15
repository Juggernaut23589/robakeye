"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function listStaff() {
  const session = await auth();
  if (!session?.user?.permissions.includes("staff.manage")) return [];

  return prisma.staff.findMany({
    include: {
      user: { select: { name: true, email: true } },
      role: { select: { name: true } },
      branches: { select: { branchId: true, branch: { select: { name: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function listRoles() {
  const session = await auth();
  if (!session?.user?.permissions.includes("staff.manage")) return [];
  return prisma.role.findMany({ orderBy: { name: "asc" } });
}

export async function listBranchesForStaff() {
  return prisma.branch.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } });
}

const createStaffSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  roleId: z.string().min(1),
  branchIds: z.array(z.string()).default([]),
});

export async function createStaffAccount(input: unknown) {
  const session = await auth();
  if (!session?.user?.permissions.includes("staff.manage")) {
    return { ok: false as const, error: "Not authorized" };
  }
  const parsed = createStaffSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Invalid staff account details" };

  const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (existing) return { ok: false as const, error: "A user with this email already exists" };

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);

  await prisma.user.create({
    data: {
      kind: "STAFF",
      name: parsed.data.name,
      email: parsed.data.email,
      passwordHash,
      emailVerified: new Date(),
      staff: {
        create: {
          roleId: parsed.data.roleId,
          branches: { create: parsed.data.branchIds.map((branchId) => ({ branchId })) },
        },
      },
    },
  });

  return { ok: true as const };
}

export async function updateStaffRole(staffId: string, roleId: string) {
  const session = await auth();
  if (!session?.user?.permissions.includes("staff.manage")) {
    return { ok: false as const, error: "Not authorized" };
  }
  await prisma.staff.update({ where: { id: staffId }, data: { roleId } });
  return { ok: true as const };
}

export async function toggleStaffActive(staffId: string) {
  const session = await auth();
  if (!session?.user?.permissions.includes("staff.manage")) {
    return { ok: false as const, error: "Not authorized" };
  }
  const staff = await prisma.staff.findUnique({ where: { id: staffId } });
  if (!staff) return { ok: false as const, error: "Staff not found" };

  await prisma.staff.update({ where: { id: staffId }, data: { isActive: !staff.isActive } });
  return { ok: true as const };
}

export async function setStaffBranches(staffId: string, branchIds: string[]) {
  const session = await auth();
  if (!session?.user?.permissions.includes("staff.manage")) {
    return { ok: false as const, error: "Not authorized" };
  }
  await prisma.$transaction([
    prisma.staffBranch.deleteMany({ where: { staffId } }),
    prisma.staffBranch.createMany({ data: branchIds.map((branchId) => ({ staffId, branchId })) }),
  ]);
  return { ok: true as const };
}
