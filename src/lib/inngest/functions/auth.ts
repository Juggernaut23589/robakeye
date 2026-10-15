import { inngest, userRegistered, passwordResetRequested } from "@/lib/inngest/client";
import { getResend, FROM_EMAIL } from "@/lib/resend";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

// Inngest retries a function automatically when step.run's callback throws
// (default 4 attempts, exponential backoff) — this is the "retry on
// failure" the brief asks for, with no custom retry loop needed.
export const sendVerificationEmail = inngest.createFunction(
  { id: "send-verification-email", triggers: userRegistered, retries: 4 },
  async ({ event, step }) => {
    const { email, name, token } = event.data;

    await step.run("send-email", async () => {
      const verifyUrl = `${APP_URL}/verify-email?email=${encodeURIComponent(email)}&token=${token}`;
      const { error } = await getResend().emails.send({
        from: FROM_EMAIL,
        to: email,
        subject: "Verify your Robakeye account",
        html: `
          <p>Hi ${name},</p>
          <p>Welcome to Robakeye. Confirm your email address to activate your account:</p>
          <p><a href="${verifyUrl}">Verify my email</a></p>
          <p>This link expires in 24 hours. If you didn't create a Robakeye account, ignore this email.</p>
        `,
      });
      // Resend's SDK returns { error } rather than throwing — re-throw so
      // Inngest's retry policy actually kicks in on transient failures.
      if (error) throw new Error(`Resend error: ${error.message}`);
    });
  },
);

export const sendPasswordResetEmail = inngest.createFunction(
  { id: "send-password-reset-email", triggers: passwordResetRequested, retries: 4 },
  async ({ event, step }) => {
    const { email, name, token } = event.data;

    await step.run("send-email", async () => {
      const resetUrl = `${APP_URL}/reset-password?email=${encodeURIComponent(email)}&token=${token}`;
      const { error } = await getResend().emails.send({
        from: FROM_EMAIL,
        to: email,
        subject: "Reset your Robakeye password",
        html: `
          <p>Hi ${name},</p>
          <p>We received a request to reset your Robakeye password:</p>
          <p><a href="${resetUrl}">Reset my password</a></p>
          <p>This link expires in 1 hour. If you didn't request this, you can safely ignore this email — your password will not be changed.</p>
        `,
      });
      if (error) throw new Error(`Resend error: ${error.message}`);
    });
  },
);
