import { PrismaClient } from "@prisma/client";

// Standard Next.js serverless-safe singleton: Vercel can re-run this module
// per invocation, but reuses warm lambdas between requests — without the
// global cache, every warm-start would open a fresh pooled connection and
// exhaust Supabase's pgbouncer pool.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
