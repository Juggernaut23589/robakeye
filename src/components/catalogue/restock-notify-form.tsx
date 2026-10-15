"use client";

import { useState, type FormEvent } from "react";
import { subscribeToRestock } from "@/actions/catalogue";

export function RestockNotifyForm({ productId, branchId }: { productId: string; branchId: string }) {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const result = await subscribeToRestock({ productId, branchId, email });
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setDone(true);
  }

  if (done) {
    return (
      <p className="text-sm text-rk-success">
        We&apos;ll email {email} as soon as this is back in stock.
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex gap-2">
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@email.com"
        aria-label="Email for restock notification"
        className="flex-1 rounded-rk-sm border border-rk-n200 px-3 py-1.5 text-sm"
      />
      <button
        type="submit"
        disabled={pending}
        className="rounded-rk-pill bg-rk-navy px-3.5 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
      >
        {pending ? "Saving…" : "Notify me"}
      </button>
      {error && <span className="text-xs text-rk-alert">{error}</span>}
    </form>
  );
}
