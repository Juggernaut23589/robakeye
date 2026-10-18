import { Inngest, eventType, staticSchema } from "inngest";

// Event contracts — every background job in this project is triggered by
// one of these named events (never setTimeout/in-memory timers, which
// don't survive Vercel's stateless serverless invocations). Each is a
// type-only schema (no runtime validation library needed): it gives
// compile-time safety on `.create()` / trigger matching without pulling
// in zod for a shape this simple.
export const userRegistered = eventType("user/registered", {
  schema: staticSchema<{ userId: string; email: string; name: string; token: string }>(),
});

export const passwordResetRequested = eventType("user/password-reset-requested", {
  schema: staticSchema<{ userId: string; email: string; name: string; token: string }>(),
});

// Carries groupId, not a single orderId — one Paystack payment can cover
// several sub-orders from one checkout (IA spec §05: "one payment, two
// fulfilment records"), and the fulfilment steps below (confirmation
// email/SMS) should read as one message, not one per branch.
export const orderPaid = eventType("order/paid", {
  schema: staticSchema<{ groupId: string }>(),
});

export const orderUpdated = eventType("order/updated", {
  schema: staticSchema<{ orderId: string; status: string }>(),
});

export const orderDelivered = eventType("order/delivered", {
  schema: staticSchema<{ orderId: string }>(),
});

export const orderRefunded = eventType("order/refunded", {
  schema: staticSchema<{ orderId: string; amountKobo: number }>(),
});

export const cartUpdated = eventType("cart/updated", {
  schema: staticSchema<{ userId: string; cartId: string }>(),
});

export const prescriptionSubmitted = eventType("prescription/submitted", {
  schema: staticSchema<{ prescriptionId: string }>(),
});

export const prescriptionReviewed = eventType("prescription/reviewed", {
  schema: staticSchema<{
    prescriptionId: string;
    status: "APPROVED" | "REJECTED" | "PARTIALLY_APPROVED";
  }>(),
});

// A store's listing went from 0 to >0 units — notifies that listing's
// "email me when it's back" subscribers.
export const productRestocked = eventType("product/restocked", {
  schema: staticSchema<{ productId: string }>(),
});

export const appointmentBooked = eventType("appointment/booked", {
  schema: staticSchema<{ appointmentId: string }>(),
});

// Milestone 1 smoke-test event only.
export const testPing = eventType("test/ping", {
  schema: staticSchema<Record<string, never>>(),
});

export const inngest = new Inngest({ id: "robakeye" });
