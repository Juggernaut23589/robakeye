"use client";

import { useState, type FormEvent } from "react";
import { createAddress } from "@/actions/addresses";
import { Button } from "@/components/ui/button";
import type { Address } from "@prisma/client";

export function AddressForm({ onCreated }: { onCreated: (address: Address) => void }) {
  const [label, setLabel] = useState("Home");
  const [line1, setLine1] = useState("");
  const [line2, setLine2] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const result = await createAddress({ label, line1, line2: line2 || undefined, city: "Ibadan" });
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    onCreated(result.address);
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-3 rounded-rk-md border border-rk-n200 p-4">
      <label className="grid gap-1 text-sm">
        Label
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Home, Office…"
          className="rounded-rk-sm border border-rk-n200 px-3 py-2"
        />
      </label>
      <label className="grid gap-1 text-sm">
        Street address
        <input
          required
          value={line1}
          onChange={(e) => setLine1(e.target.value)}
          placeholder="e.g. 12 Ring Road, Challenge"
          className="rounded-rk-sm border border-rk-n200 px-3 py-2"
        />
      </label>
      <label className="grid gap-1 text-sm">
        Additional directions (optional)
        <input
          value={line2}
          onChange={(e) => setLine2(e.target.value)}
          placeholder="Landmark, gate colour, etc."
          className="rounded-rk-sm border border-rk-n200 px-3 py-2"
        />
      </label>
      {error && <p className="text-sm text-rk-alert">{error}</p>}
      <Button type="submit" disabled={pending} size="sm" className="w-fit">
        {pending ? "Saving…" : "Save address"}
      </Button>
    </form>
  );
}
