"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createDeliveryPartner, toggleDeliveryPartnerActive } from "@/actions/delivery-admin";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type Partner = { id: string; name: string; isActive: boolean };

export function DeliveryPartnerManager({ partners }: { partners: Partner[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [pending, setPending] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  async function onToggle(id: string) {
    setTogglingId(id);
    await toggleDeliveryPartnerActive(id);
    setTogglingId(null);
    router.refresh();
  }

  async function onAdd(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    await createDeliveryPartner(name);
    setPending(false);
    setName("");
    router.refresh();
  }

  return (
    <div className="rounded-rk-md border border-rk-n200 bg-white p-4">
      <ul className="mb-3 grid gap-2 text-sm">
        {partners.map((p) => (
          <li key={p.id} className="flex items-center justify-between">
            <span>{p.name}</span>
            <button onClick={() => onToggle(p.id)} disabled={togglingId === p.id}>
              <Badge variant={p.isActive ? "success" : "neutral"}>{p.isActive ? "Active" : "Inactive"}</Badge>
            </button>
          </li>
        ))}
        {partners.length === 0 && <li className="text-rk-n600">No delivery partners yet.</li>}
      </ul>
      <form onSubmit={onAdd} className="flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="In-house rider, Gokada…"
          className="flex-1 rounded-rk-sm border border-rk-n200 px-2 py-1.5 text-sm"
        />
        <Button type="submit" size="sm" loading={pending}>
          Add
        </Button>
      </form>
    </div>
  );
}
