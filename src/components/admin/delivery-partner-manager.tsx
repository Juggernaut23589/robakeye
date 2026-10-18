"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createDeliveryPartner, toggleDeliveryPartnerActive } from "@/actions/delivery-admin";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type Partner = { id: string; name: string; phone: string | null; isActive: boolean; branch: { name: string } | null };

export function DeliveryPartnerManager({
  partners,
  branches,
  canAddShared,
}: {
  partners: Partner[];
  branches: { id: string; name: string }[];
  canAddShared: boolean;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [branchId, setBranchId] = useState(canAddShared ? "" : (branches[0]?.id ?? ""));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
    setError(null);
    const result = await createDeliveryPartner({ name, phone: phone || undefined, branchId: branchId || undefined });
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setName("");
    setPhone("");
    router.refresh();
  }

  return (
    <div className="rounded-rk-md border border-rk-n200 bg-white p-4">
      <ul className="mb-4 grid gap-2 text-sm">
        {partners.map((p) => (
          <li key={p.id} className="flex items-center justify-between gap-3">
            <span>
              <b className="text-rk-navy">{p.name}</b>
              <span className="ml-2 text-xs text-rk-n600">
                {p.branch ? `${p.branch.name} rider` : "Shared courier — any store"}
                {p.phone ? ` · ${p.phone}` : ""}
              </span>
            </span>
            <button onClick={() => onToggle(p.id)} disabled={togglingId === p.id}>
              <Badge variant={p.isActive ? "success" : "neutral"}>{p.isActive ? "Active" : "Inactive"}</Badge>
            </button>
          </li>
        ))}
        {partners.length === 0 && <li className="text-rk-n600">No riders yet.</li>}
      </ul>
      <form onSubmit={onAdd} className="flex flex-wrap items-end gap-2">
        <label className="text-xs text-rk-n600">
          Name
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Rider or courier name"
            className="mt-0.5 block rounded-rk-sm border border-rk-n200 px-2 py-1.5 text-sm"
          />
        </label>
        <label className="text-xs text-rk-n600">
          Phone (optional)
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="mt-0.5 block w-36 rounded-rk-sm border border-rk-n200 px-2 py-1.5 text-sm"
          />
        </label>
        <label className="text-xs text-rk-n600">
          Works for
          <select
            value={branchId}
            onChange={(e) => setBranchId(e.target.value)}
            className="mt-0.5 block rounded-rk-sm border border-rk-n200 px-2 py-1.5 text-sm"
          >
            {canAddShared && <option value="">Any store (shared courier)</option>}
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </label>
        <Button type="submit" size="sm" loading={pending}>
          Add rider
        </Button>
        {error && <p className="w-full text-xs text-rk-alert">{error}</p>}
      </form>
    </div>
  );
}
