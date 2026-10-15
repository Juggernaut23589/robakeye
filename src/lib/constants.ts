// Safe for both server and client import — no Prisma/server-only deps,
// unlike lib/orderCalculation.ts which re-exports this for its own use.

// Orders below this never pay a delivery fee — the single source of truth
// read by the announcement bar, the cart's free-delivery progress bar, and
// lib/orderCalculation.ts's delivery-fee waiver. Nothing else may hardcode
// "15000".
export const FREE_DELIVERY_THRESHOLD_KOBO = 15_000_00;
