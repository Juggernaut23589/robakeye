// Thin wrapper around the Paystack REST API. Card data never touches
// Robakeye's servers — these are all server-to-server calls (init,
// verify, refund) using the secret key; the client only ever sees the
// public key + a reference, per docs/technical-architecture.html's
// integrations table.

const PAYSTACK_BASE = "https://api.paystack.co";

function secretKey() {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key) throw new Error("PAYSTACK_SECRET_KEY is not set");
  return key;
}

async function paystackFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${PAYSTACK_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${secretKey()}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
  const data = await res.json();
  if (!res.ok || data.status === false) {
    throw new Error(data.message ?? `Paystack API error (${res.status})`);
  }
  return data;
}

export async function initializeTransaction(params: {
  email: string;
  amountKobo: number;
  reference: string;
  metadata?: Record<string, unknown>;
  callbackUrl?: string;
}) {
  return paystackFetch<{
    data: { authorization_url: string; access_code: string; reference: string };
  }>("/transaction/initialize", {
    method: "POST",
    body: JSON.stringify({
      email: params.email,
      amount: params.amountKobo, // Paystack's "amount" is already the smallest currency unit (kobo)
      reference: params.reference,
      metadata: params.metadata,
      callback_url: params.callbackUrl,
    }),
  });
}

export type PaystackVerifyData = {
  status: "success" | "failed" | "abandoned";
  reference: string;
  amount: number;
  gateway_response: string;
  paid_at: string | null;
};

export async function verifyTransaction(reference: string) {
  return paystackFetch<{ data: PaystackVerifyData }>(
    `/transaction/verify/${encodeURIComponent(reference)}`,
  );
}

export async function refundTransaction(reference: string, amountKobo?: number) {
  return paystackFetch<{ data: { status: string } }>("/refund", {
    method: "POST",
    body: JSON.stringify({
      transaction: reference,
      ...(amountKobo ? { amount: amountKobo } : {}), // omit = full refund
    }),
  });
}

// HMAC-SHA512 of the raw request body using the secret key — Paystack's
// documented webhook verification. The frontend's "success" callback is
// never trusted alone (tech-arch doc, integrations table); this signature
// check is what actually authorizes a webhook to mark an order paid.
export async function verifyWebhookSignature(rawBody: string, signatureHeader: string | null) {
  if (!signatureHeader) return false;
  const crypto = await import("crypto");
  const hash = crypto.createHmac("sha512", secretKey()).update(rawBody).digest("hex");
  return hash === signatureHeader;
}
