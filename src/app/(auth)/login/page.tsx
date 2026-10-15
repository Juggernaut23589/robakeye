"use client";

import { Suspense, useState, type FormEvent } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";

const ERROR_MESSAGES: Record<string, string> = {
  invalid_credentials: "Incorrect email or password.",
  invalid_input: "Enter a valid email and password.",
  account_disabled: "This staff account has been deactivated. Contact an administrator.",
  two_factor_invalid: "That 2FA code didn't match. Try again.",
};

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/account";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [totp, setTotp] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [needsTotp, setNeedsTotp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);

    // next-auth serializes every field of this object through a hidden
    // form, so passing `totp: undefined` here would arrive server-side as
    // the literal string "undefined" rather than being omitted — only
    // include the key at all once the user actually has a code to send.
    const result = await signIn("credentials", {
      email,
      password,
      ...(totp ? { totp } : {}),
      rememberMe: String(rememberMe),
      redirect: false,
    });

    setPending(false);

    // next-auth's redirect:false result always sets `error` to the generic
    // AuthError type name ("CredentialsSignin"); our specific reason — set
    // via the `code` property on each CredentialsSignin subclass in
    // lib/auth.ts — comes back in `result.code`, not `result.error`.
    if (result?.code === "two_factor_required") {
      setNeedsTotp(true);
      return;
    }
    if (result?.error) {
      setError(ERROR_MESSAGES[result.code ?? ""] ?? "Something went wrong. Try again.");
      return;
    }
    router.push(callbackUrl);
    router.refresh();
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-6">
      <h1 className="font-display text-2xl font-bold text-rk-navy">Sign in to Robakeye</h1>

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

        <label className="flex flex-col gap-1 text-sm">
          Password
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-rk-md border border-rk-n200 px-3 py-2"
          />
        </label>

        {needsTotp && (
          <label className="flex flex-col gap-1 text-sm">
            6-digit authenticator code
            <input
              type="text"
              inputMode="numeric"
              autoFocus
              required
              value={totp}
              onChange={(e) => setTotp(e.target.value)}
              className="rounded-rk-md border border-rk-n200 px-3 py-2"
            />
          </label>
        )}

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
          />
          Remember me for 30 days
        </label>

        {error && <p className="text-sm text-rk-alert">{error}</p>}

        <button
          type="submit"
          disabled={pending}
          className="rounded-rk-pill bg-rk-navy px-4 py-2 font-medium text-white disabled:opacity-60"
        >
          {pending ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <div className="flex justify-between text-sm">
        <a href="/forgot-password" className="text-rk-blue">
          Forgot password?
        </a>
        <a href="/register" className="text-rk-blue">
          Create an account
        </a>
      </div>
    </main>
  );
}
