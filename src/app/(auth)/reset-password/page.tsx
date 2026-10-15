"use client";

import { Suspense, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { resetPassword } from "@/actions/auth";

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}

function ResetPasswordForm() {
  const router = useRouter();
  const params = useSearchParams();
  const email = params.get("email") ?? "";
  const token = params.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const result = await resetPassword({ email, token, password, confirmPassword });
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.push("/login");
  }

  if (!email || !token) {
    return (
      <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-4 px-6 text-center">
        <p className="text-rk-alert">This reset link is missing required information.</p>
        <a href="/forgot-password" className="text-rk-blue">
          Request a new link
        </a>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-6">
      <h1 className="font-display text-2xl font-bold text-rk-navy">Choose a new password</h1>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm">
          New password
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-rk-md border border-rk-n200 px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Confirm new password
          <input
            type="password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="rounded-rk-md border border-rk-n200 px-3 py-2"
          />
        </label>
        {error && <p className="text-sm text-rk-alert">{error}</p>}
        <button
          type="submit"
          disabled={pending}
          className="rounded-rk-pill bg-rk-navy px-4 py-2 font-medium text-white disabled:opacity-60"
        >
          {pending ? "Saving…" : "Reset password"}
        </button>
      </form>
    </main>
  );
}
