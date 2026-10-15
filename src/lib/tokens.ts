import crypto from "crypto";
import { prisma } from "@/lib/prisma";

const TOKEN_TTL_MS = {
  "verify-email": 24 * 60 * 60 * 1000, // 24h
  "reset-password": 60 * 60 * 1000, // 1h
} as const;

type TokenPurpose = keyof typeof TOKEN_TTL_MS;

function hash(raw: string) {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

// VerificationToken rows are shared across purposes (email verification,
// password reset) via a namespaced `identifier` — avoids a second table for
// what is structurally the same single-use, expiring token pattern.
export async function issueToken(purpose: TokenPurpose, email: string) {
  const identifier = `${purpose}:${email}`;
  const raw = crypto.randomBytes(32).toString("hex");
  await prisma.verificationToken.deleteMany({ where: { identifier } });
  await prisma.verificationToken.create({
    data: {
      identifier,
      token: hash(raw),
      expires: new Date(Date.now() + TOKEN_TTL_MS[purpose]),
    },
  });
  return raw; // the raw token is what goes in the email link; only the hash is stored
}

export async function consumeToken(purpose: TokenPurpose, email: string, rawToken: string) {
  const identifier = `${purpose}:${email}`;
  const record = await prisma.verificationToken.findUnique({
    where: { identifier_token: { identifier, token: hash(rawToken) } },
  });
  if (!record || record.expires < new Date()) return false;
  await prisma.verificationToken.delete({
    where: { identifier_token: { identifier, token: hash(rawToken) } },
  });
  return true;
}
