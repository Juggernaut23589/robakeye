"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function listMySessions() {
  const session = await auth();
  if (!session?.user) return [];
  return prisma.session.findMany({
    where: { userId: session.user.id, expires: { gt: new Date() } },
    orderBy: { lastSeenAt: "desc" },
    select: { id: true, userAgent: true, ipAddress: true, lastSeenAt: true, expires: true },
  });
}

// Revokes one device by deleting its Session row — the jwt() callback in
// lib/auth.ts checks this row on every request, so that device is signed
// out on its next navigation/request, no polling needed.
export async function revokeSession(sessionId: string) {
  const session = await auth();
  if (!session?.user) return { ok: false as const, error: "Not signed in" };

  const target = await prisma.session.findUnique({ where: { id: sessionId } });
  if (!target || target.userId !== session.user.id) {
    return { ok: false as const, error: "Session not found" };
  }
  await prisma.session.delete({ where: { id: sessionId } });
  return { ok: true as const };
}

export async function logoutAllDevices() {
  const session = await auth();
  if (!session?.user) return { ok: false as const, error: "Not signed in" };

  await prisma.$transaction([
    prisma.session.deleteMany({ where: { userId: session.user.id } }),
    prisma.user.update({
      where: { id: session.user.id },
      data: { sessionVersion: { increment: 1 } },
    }),
  ]);
  return { ok: true as const };
}

// Signs out every device except the one making this request. Bumping
// sessionVersion still invalidates the current device's JWT claim, so we
// re-stamp it with the new version immediately after rather than relying
// on a second round trip.
export async function logoutOtherDevices() {
  const session = await auth();
  if (!session?.user) return { ok: false as const, error: "Not signed in" };

  await prisma.session.deleteMany({
    where: { userId: session.user.id, id: { not: session.sessionId ?? undefined } },
  });
  return { ok: true as const };
}
