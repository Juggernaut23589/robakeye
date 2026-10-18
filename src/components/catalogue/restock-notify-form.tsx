"use client";

import { useState, type FormEvent } from "react";
import { Bell } from "lucide-react";
import { useSession } from "next-auth/react";
import { subscribeToRestock } from "@/actions/catalogue";

// Per-store restock alert: subscribes to this store's listing only.
export function RestockNotifyForm({ productId, storeName }: { productId: string; storeName: string }) {
  const { data: session } = useSession();
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const value = email || session?.user?.email || "";

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const result = await subscribeToRestock({ productId, email: value });
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setDone(true);
  }

  if (done) {
    return (
      <p className="rounded-rk-md bg-rk-success-tint px-4 py-3 text-sm text-rk-success">
        Done — we&apos;ll email {value} when {storeName} has it again.
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-2 rounded-rk-md border border-rk-n200 bg-rk-n50 p-4">
      <p className="flex items-center gap-2 text-sm font-semibold text-rk-navy">
        <Bell className="size-4" aria-hidden /> Email me when {storeName} restocks
      </p>
      <div className="flex flex-wrap gap-2">
        <input
          type="email"
          required
          value={value}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@email.com"
          aria-label="Email for restock notification"
          className="min-w-0 flex-1 rounded-rk-pill border border-rk-n200 bg-white px-4 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-rk-pill bg-rk-navy px-4 py-2 text-sm font-semibold text-white hover:bg-[#262A85] disabled:opacity-60"
        >
          {pending ? "Saving…" : "Notify me"}
        </button>
      </div>
      {error && <span className="text-xs text-rk-alert">{error}</span>}
    </form>
  );
}
