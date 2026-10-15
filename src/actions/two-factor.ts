"use server";

import { generateSecret, generateURI, verify as verifyTotp } from "otplib";
import QRCode from "qrcode";
import { auth, unstable_update } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { totpVerifySchema } from "@/lib/validations/auth";

// Step 1 of setup: generate a secret, store it UNCONFIRMED (twoFactorEnabled
// stays false until the user proves they can produce a valid code), and
// return a scannable QR code. Calling this again before confirmation
// rotates the secret, which is fine — the old one was never activated.
export async function startTwoFactorSetup() {
  const session = await auth();
  if (!session?.user || session.user.kind !== "STAFF") {
    return { ok: false as const, error: "Not available for this account" };
  }

  const secret = generateSecret();
  await prisma.user.update({
    where: { id: session.user.id },
    data: { twoFactorSecret: secret, twoFactorEnabled: false },
  });

  const uri = generateURI({
    secret,
    label: session.user.email ?? session.user.id,
    issuer: "Robakeye",
  });
  const qrDataUrl = await QRCode.toDataURL(uri);
  return { ok: true as const, secret, qrDataUrl };
}

// Step 2: user submits a code from their authenticator app. Only on success
// do we flip twoFactorEnabled — this is what the Role.requires2FA check in
// lib/auth.ts's authorize() gates on.
export async function confirmTwoFactorSetup(input: unknown) {
  const session = await auth();
  if (!session?.user) return { ok: false as const, error: "Not signed in" };

  const parsed = totpVerifySchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Enter the 6-digit code" };

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { twoFactorSecret: true },
  });
  if (!user?.twoFactorSecret) {
    return { ok: false as const, error: "Start setup again" };
  }

  const { valid } = await verifyTotp({ token: parsed.data.code, secret: user.twoFactorSecret });
  if (!valid) return { ok: false as const, error: "That code didn't match. Try again." };

  await prisma.user.update({
    where: { id: session.user.id },
    data: { twoFactorEnabled: true },
  });

  // Flip the session claim without forcing a full re-login.
  await unstable_update({ user: { needsTwoFactorSetup: false } });
  return { ok: true as const };
}

export async function disableTwoFactor() {
  const session = await auth();
  if (!session?.user) return { ok: false as const, error: "Not signed in" };

  await prisma.user.update({
    where: { id: session.user.id },
    data: { twoFactorEnabled: false, twoFactorSecret: null },
  });
  return { ok: true as const };
}
