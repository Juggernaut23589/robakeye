"use client";

import { useState, type FormEvent } from "react";
import { registerCustomer } from "@/actions/auth";

export default function RegisterPage() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const result = await registerCustomer(form);
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setDone(true);
  }

  if (done) {
    return (
      <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-4 px-6 text-center">
        <h1 className="font-display text-2xl font-bold text-rk-navy">Check your email</h1>
        <p className="text-rk-n600">
          We sent a verification link to {form.email}. Click it to activate your account, then
          sign in.
        </p>
        <a href="/login" className="text-rk-blue">
          Back to sign in
        </a>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-6">
      <h1 className="font-display text-2xl font-bold text-rk-navy">Create your account</h1>

      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm">
          Full name
          <input
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="rounded-rk-md border border-rk-n200 px-3 py-2"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Email
          <input
            type="email"
            required
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="rounded-rk-md border border-rk-n200 px-3 py-2"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Phone (e.g. 08012345678)
          <input
            required
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className="rounded-rk-md border border-rk-n200 px-3 py-2"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Password
          <input
            type="password"
            required
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className="rounded-rk-md border border-rk-n200 px-3 py-2"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Confirm password
          <input
            type="password"
            required
            value={form.confirmPassword}
            onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
            className="rounded-rk-md border border-rk-n200 px-3 py-2"
          />
        </label>

        {error && <p className="text-sm text-rk-alert">{error}</p>}

        <button
          type="submit"
          disabled={pending}
          className="rounded-rk-pill bg-rk-navy px-4 py-2 font-medium text-white disabled:opacity-60"
        >
          {pending ? "Creating account…" : "Create account"}
        </button>
      </form>

      <a href="/login" className="text-center text-sm text-rk-blue">
        Already have an account? Sign in
      </a>
    </main>
  );
}
