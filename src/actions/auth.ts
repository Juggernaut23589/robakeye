"use server";

import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { inngest, userRegistered, passwordResetRequested } from "@/lib/inngest/client";
import { issueToken, consumeToken } from "@/lib/tokens";
import {
  registerSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "@/lib/validations/auth";

type ActionResult = { ok: true } | { ok: false; error: string };

export async function registerCustomer(input: unknown): Promise<ActionResult> {
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { name, email, phone, password } = parsed.data;

  const existing = await prisma.user.findFirst({ where: { OR: [{ email }, { phone }] } });
  if (existing) {
    return { ok: false, error: "An account with this email or phone already exists" };
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: {
      kind: "CUSTOMER",
      name,
      email,
      phone,
      passwordHash,
      cart: { create: {} },
    },
  });

  const token = await issueToken("verify-email", user.email);
  // The user row is already committed at this point — a transient failure
  // dispatching the event (Inngest unreachable, network blip) must not
  // fail the whole signup and strand an unverifiable account. Log and
  // continue; worst case the user re-requests verification later.
  try {
    await inngest.send(
      userRegistered.create({ userId: user.id, email: user.email, name: user.name, token }),
    );
  } catch (err) {
    console.error("Failed to send user/registered event", err);
  }

  return { ok: true };
}

export async function verifyEmail(email: string, token: string): Promise<ActionResult> {
  const valid = await consumeToken("verify-email", email, token);
  if (!valid) return { ok: false, error: "This verification link is invalid or has expired" };

  await prisma.user.update({
    where: { email },
    data: { emailVerified: new Date() },
  });
  return { ok: true };
}

export async function requestPasswordReset(input: unknown): Promise<ActionResult> {
  const parsed = forgotPasswordSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { email } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });
  // Always report success even if the account doesn't exist — don't let
  // this endpoint be used to enumerate registered emails.
  if (user) {
    const token = await issueToken("reset-password", email);
    try {
      await inngest.send(
        passwordResetRequested.create({ userId: user.id, email, name: user.name, token }),
      );
    } catch (err) {
      console.error("Failed to send user/password-reset-requested event", err);
    }
  }
  return { ok: true };
}

export async function resetPassword(input: unknown): Promise<ActionResult> {
  const parsed = resetPasswordSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { email, token, password } = parsed.data;

  const valid = await consumeToken("reset-password", email, token);
  if (!valid) return { ok: false, error: "This reset link is invalid or has expired" };

  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.user.update({
    where: { email },
    data: {
      passwordHash,
      // Bumping sessionVersion signs this user out on every other device —
      // the standard "password changed" security behaviour.
      sessionVersion: { increment: 1 },
    },
  });
  return { ok: true };
}
