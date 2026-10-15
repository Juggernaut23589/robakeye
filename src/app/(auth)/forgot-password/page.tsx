"use client";

import { useState, type FormEvent } from "react";
import { requestPasswordReset } from "@/actions/auth";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    await requestPasswordReset({ email });
    setPending(false);
    setSent(true); // always show success — never confirm/deny account existence
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-6">
      <h1 className="font-display text-2xl font-bold text-rk-navy">Reset your password</h1>

      {sent ? (
        <p className="text-rk-n600">
          If an account exists for {email}, we&apos;ve sent a password reset link to it.
        </p>
      ) : (
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm">
            Email
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-rk-md border border-rk-n200 px-3 py-2"
            />
          </label>
          <button
            type="submit"
            disabled={pending}
            className="rounded-rk-pill bg-rk-navy px-4 py-2 font-medium text-white disabled:opacity-60"
          >
            {pending ? "Sending…" : "Send reset link"}
          </button>
        </form>
      )}

      <a href="/login" className="text-center text-sm text-rk-blue">
        Back to sign in
      </a>
    </main>
  );
}
