import { Resend } from "resend";

export const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? "Robakeye <orders@robakeye.com>";

// Resend's constructor throws immediately if no API key is present — even
// at module-evaluation time, which would crash the Next.js build/boot
// before Milestone 1's manual Resend signup step is done. Deferring
// construction until the first actual send means a missing key only
// surfaces as an error when an email job really runs (and Inngest will
// retry it), never as a build-time crash.
let client: Resend | null = null;

export function getResend() {
  if (!client) {
    if (!process.env.RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not set — add it to .env before sending email.");
    }
    client = new Resend(process.env.RESEND_API_KEY);
  }
  return client;
}
