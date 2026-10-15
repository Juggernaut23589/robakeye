"use server";

import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// "Talk to a Pharmacist" — simple polling chat per the brief's own
// "Pusher or simple polling for MVP" allowance. No Pusher/real-time infra
// is set up, so this is polling: components call these on an interval.

export async function startConsult(productId?: string) {
  const session = await auth();
  if (!session?.user) return { ok: false as const, error: "Sign in to talk to a pharmacist" };

  // Reuse an existing open consult for the same product rather than
  // spawning a new thread every time the page is revisited.
  const existing = await prisma.consultRequest.findFirst({
    where: { userId: session.user.id, productId: productId ?? null, status: "OPEN" },
    orderBy: { createdAt: "desc" },
  });
  if (existing) return { ok: true as const, consultId: existing.id };

  const consult = await prisma.consultRequest.create({
    data: { userId: session.user.id, productId },
  });
  return { ok: true as const, consultId: consult.id };
}

export async function getConsultMessages(consultId: string) {
  const session = await auth();
  if (!session?.user) return [];

  const consult = await prisma.consultRequest.findUnique({ where: { id: consultId } });
  if (!consult) return [];
  // Either the customer who owns it, or any staff with queue access.
  const isOwner = consult.userId === session.user.id;
  const isStaff = session.user.kind === "STAFF" && session.user.permissions.includes("prescriptions.view");
  if (!isOwner && !isStaff) return [];

  return prisma.consultMessage.findMany({ where: { consultId }, orderBy: { createdAt: "asc" } });
}

const sendSchema = z.object({ consultId: z.string(), body: z.string().trim().min(1).max(2000) });

export async function sendConsultMessage(input: unknown) {
  const session = await auth();
  if (!session?.user) return { ok: false as const, error: "Sign in required" };

  const parsed = sendSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Message can't be empty" };

  const consult = await prisma.consultRequest.findUnique({ where: { id: parsed.data.consultId } });
  if (!consult) return { ok: false as const, error: "Conversation not found" };

  const isOwner = consult.userId === session.user.id;
  const isStaff = session.user.kind === "STAFF" && session.user.permissions.includes("prescriptions.view");
  if (!isOwner && !isStaff) return { ok: false as const, error: "Not authorized" };

  await prisma.$transaction([
    prisma.consultMessage.create({
      data: {
        consultId: parsed.data.consultId,
        senderKind: isStaff ? "PHARMACIST" : "CUSTOMER",
        senderId: session.user.id,
        body: parsed.data.body,
      },
    }),
    // updatedAt only auto-bumps when the ConsultRequest row itself
    // changes, not when a related message is created — touch it
    // explicitly so the admin queue's "most recent activity" sort works.
    prisma.consultRequest.update({ where: { id: parsed.data.consultId }, data: {} }),
  ]);
  return { ok: true as const };
}

const callbackSchema = z.object({ consultId: z.string(), phone: z.string().trim().min(7) });

// Fallback when no pharmacist is actively available to chat.
export async function requestCallback(input: unknown) {
  const session = await auth();
  if (!session?.user) return { ok: false as const, error: "Sign in required" };

  const parsed = callbackSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Enter a valid phone number" };

  const consult = await prisma.consultRequest.findUnique({ where: { id: parsed.data.consultId } });
  if (!consult || consult.userId !== session.user.id) {
    return { ok: false as const, error: "Conversation not found" };
  }

  await prisma.consultRequest.update({
    where: { id: parsed.data.consultId },
    data: { callbackPhone: parsed.data.phone },
  });
  return { ok: true as const };
}

export async function getOpenConsults() {
  const session = await auth();
  if (!session?.user?.permissions.includes("prescriptions.view")) return [];
  return prisma.consultRequest.findMany({
    where: { status: "OPEN" },
    include: {
      user: { select: { name: true } },
      product: { select: { name: true } },
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: { updatedAt: "desc" },
  });
}
