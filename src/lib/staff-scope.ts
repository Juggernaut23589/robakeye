import type { Session } from "next-auth";
import { prisma } from "@/lib/prisma";

// Which stores a staff member may act on. Roles with branchScope ALL see
// every store; OWN roles only the stores in their StaffBranch rows. Since
// each store owns its catalogue, stock and orders outright, every admin
// read/write that touches store data filters through this.
//
// Returns null for "every store", otherwise the allowed branch ids (empty
// array = none).
export async function getStaffBranchIds(session: Session | null): Promise<string[] | null> {
  if (!session?.user) return [];
  if (session.user.branchScope === "ALL") return null;
  const staff = await prisma.staff.findUnique({
    where: { userId: session.user.id },
    select: { isActive: true, branches: { select: { branchId: true } } },
  });
  if (!staff?.isActive) return [];
  return staff.branches.map((b) => b.branchId);
}

export function canAccessBranch(allowed: string[] | null, branchId: string | null | undefined) {
  if (allowed === null) return true;
  return !!branchId && allowed.includes(branchId);
}

// Prisma `where` fragment for a model with a `branchId` column.
export function branchWhere(allowed: string[] | null, requested?: string) {
  if (requested) {
    if (!canAccessBranch(allowed, requested)) return { branchId: { in: [] as string[] } };
    return { branchId: requested };
  }
  return allowed === null ? {} : { branchId: { in: allowed } };
}
