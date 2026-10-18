"use client";

import { useState, type FormEvent } from "react";
import { CircleCheck, LocateFixed } from "lucide-react";
import { createAddress } from "@/actions/addresses";
import { useGeolocation } from "@/hooks/use-geolocation";
import { Button } from "@/components/ui/button";
import type { Address } from "@prisma/client";

export function AddressForm({ onCreated, onCancel }: { onCreated: (address: Address) => void; onCancel?: () => void }) {
  const [label, setLabel] = useState("Home");
  const [line1, setLine1] = useState("");
  const [line2, setLine2] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const geo = useGeolocation();
  const pinned = geo.state.status === "granted" ? geo.state : null;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const result = await createAddress({
      label,
      line1,
      line2: line2 || undefined,
      city: "Ibadan",
      ...(pinned ? { lat: pinned.lat, lng: pinned.lng } : {}),
    });
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    onCreated(result.address);
  }

  const inputClass = "rounded-rk-md border border-rk-n200 bg-white px-3 py-2 text-sm focus:border-rk-navy focus:outline-none";

  return (
    <form onSubmit={onSubmit} className="grid gap-3 rounded-rk-lg border border-rk-n200 bg-rk-n50 p-4">
      <div className="grid gap-3 sm:grid-cols-[140px_1fr]">
        <label className="grid gap-1 text-sm font-medium text-rk-ink">
          Label
          <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Home, Office…" className={inputClass} />
        </label>
        <label className="grid gap-1 text-sm font-medium text-rk-ink">
          Street address
          <input
            required
            value={line1}
            onChange={(e) => setLine1(e.target.value)}
            placeholder="e.g. 12 Ring Road, Challenge"
            autoComplete="street-address"
            className={inputClass}
          />
        </label>
      </div>
      <label className="grid gap-1 text-sm font-medium text-rk-ink">
        Directions for the rider (optional)
        <input value={line2} onChange={(e) => setLine2(e.target.value)} placeholder="Landmark, gate colour, etc." className={inputClass} />
      </label>

      <div className="flex flex-wrap items-center gap-2 text-sm">
        {pinned ? (
          <span className="flex items-center gap-1.5 text-rk-success">
            <CircleCheck className="size-4" aria-hidden /> Location pinned — we&apos;ll use it to check the delivery distance
          </span>
        ) : (
          <button
            type="button"
            onClick={geo.request}
            disabled={geo.state.status === "loading"}
            className="flex items-center gap-1.5 rounded-rk-pill px-3 py-1.5 font-semibold text-rk-blue ring-1 ring-rk-blue/30 hover:bg-rk-blue-tint disabled:opacity-60"
          >
            <LocateFixed className="size-4" aria-hidden />
            {geo.state.status === "loading" ? "Getting your location…" : "I'm at this address — use my location"}
          </button>
        )}
        {geo.state.status === "denied" && (
          <span className="text-xs text-rk-n600">Location unavailable — we&apos;ll look the address up instead.</span>
        )}
      </div>

      {error && <p className="text-sm text-rk-alert">{error}</p>}
      <div className="flex gap-2">
        <Button type="submit" loading={pending} size="sm">
          Save address
        </Button>
        {onCancel && (
          <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
