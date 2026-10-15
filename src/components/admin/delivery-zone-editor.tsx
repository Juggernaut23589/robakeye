"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createDeliveryZone, updateDeliveryZone, deleteDeliveryZone } from "@/actions/delivery-admin";
import { formatNaira } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type Zone = { id: string; name: string; maxKm: number; baseFeeKobo: number; perKmFeeKobo: number };

export function DeliveryZoneEditor({ branchId, branchName, zones }: {
  branchId: string;
  branchName: string;
  zones: Zone[];
}) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function onDelete(id: string) {
    setDeletingId(id);
    await deleteDeliveryZone(id);
    setDeletingId(null);
    router.refresh();
  }

  return (
    <div className="rounded-rk-md border border-rk-n200 bg-white p-4">
      <b className="text-rk-navy">{branchName}</b>
      <div className="mt-2 grid gap-2">
        {zones.map((z) => (
          <ZoneRow key={z.id} zone={z} onDelete={() => onDelete(z.id)} deleting={deletingId === z.id} />
        ))}
        {zones.length === 0 && <p className="text-sm text-rk-n600">No delivery zone configured.</p>}
      </div>

      {showForm ? (
        <NewZoneForm
          branchId={branchId}
          onDone={() => {
            setShowForm(false);
            router.refresh();
          }}
        />
      ) : (
        <button onClick={() => setShowForm(true)} className="mt-2 text-xs text-rk-blue underline">
          + Add delivery zone
        </button>
      )}
    </div>
  );
}

function ZoneRow({ zone, onDelete, deleting }: { zone: Zone; onDelete: () => void; deleting: boolean }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [maxKm, setMaxKm] = useState(zone.maxKm);
  const [baseFeeNaira, setBaseFeeNaira] = useState(zone.baseFeeKobo / 100);
  const [perKmFeeNaira, setPerKmFeeNaira] = useState(zone.perKmFeeKobo / 100);
  const [saving, setSaving] = useState(false);

  async function onSave() {
    setSaving(true);
    await updateDeliveryZone(zone.id, {
      name: zone.name,
      maxKm,
      baseFeeKobo: Math.round(baseFeeNaira * 100),
      perKmFeeKobo: Math.round(perKmFeeNaira * 100),
    });
    setSaving(false);
    setEditing(false);
    router.refresh();
  }

  if (editing) {
    return (
      <div className="grid grid-cols-4 items-end gap-2 rounded-rk-sm bg-rk-n50 p-2">
        <label className="text-xs text-rk-n600">
          Max km
          <input type="number" min={0} step="0.1" value={maxKm} onChange={(e) => setMaxKm(Number(e.target.value))} className="mt-0.5 block w-full rounded-rk-sm border border-rk-n200 px-2 py-1" />
        </label>
        <label className="text-xs text-rk-n600">
          Base fee (₦)
          <input type="number" min={0} value={baseFeeNaira} onChange={(e) => setBaseFeeNaira(Number(e.target.value))} className="mt-0.5 block w-full rounded-rk-sm border border-rk-n200 px-2 py-1" />
        </label>
        <label className="text-xs text-rk-n600">
          Per km (₦)
          <input type="number" min={0} value={perKmFeeNaira} onChange={(e) => setPerKmFeeNaira(Number(e.target.value))} className="mt-0.5 block w-full rounded-rk-sm border border-rk-n200 px-2 py-1" />
        </label>
        <Button size="sm" loading={saving} onClick={onSave}>
          Save
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between text-sm">
      <span>
        {zone.name} — up to {zone.maxKm}km, {formatNaira(zone.baseFeeKobo)} + {formatNaira(zone.perKmFeeKobo)}/km
      </span>
      <div className="flex gap-2">
        <button onClick={() => setEditing(true)} className="text-xs text-rk-blue underline">
          edit
        </button>
        <button onClick={onDelete} disabled={deleting} className="text-xs text-rk-alert underline">
          remove
        </button>
      </div>
    </div>
  );
}

function NewZoneForm({ branchId, onDone }: { branchId: string; onDone: () => void }) {
  const [name, setName] = useState("Standard");
  const [maxKm, setMaxKm] = useState(10);
  const [baseFeeNaira, setBaseFeeNaira] = useState(500);
  const [perKmFeeNaira, setPerKmFeeNaira] = useState(50);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const result = await createDeliveryZone({
      branchId,
      name,
      maxKm,
      baseFeeKobo: Math.round(baseFeeNaira * 100),
      perKmFeeKobo: Math.round(perKmFeeNaira * 100),
    });
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    onDone();
  }

  return (
    <form onSubmit={onSubmit} className="mt-2 grid grid-cols-5 items-end gap-2 rounded-rk-sm bg-rk-n50 p-2">
      <label className="text-xs text-rk-n600">
        Name
        <input value={name} onChange={(e) => setName(e.target.value)} required className="mt-0.5 block w-full rounded-rk-sm border border-rk-n200 px-2 py-1" />
      </label>
      <label className="text-xs text-rk-n600">
        Max km
        <input type="number" min={0} step="0.1" value={maxKm} onChange={(e) => setMaxKm(Number(e.target.value))} className="mt-0.5 block w-full rounded-rk-sm border border-rk-n200 px-2 py-1" />
      </label>
      <label className="text-xs text-rk-n600">
        Base fee (₦)
        <input type="number" min={0} value={baseFeeNaira} onChange={(e) => setBaseFeeNaira(Number(e.target.value))} className="mt-0.5 block w-full rounded-rk-sm border border-rk-n200 px-2 py-1" />
      </label>
      <label className="text-xs text-rk-n600">
        Per km (₦)
        <input type="number" min={0} value={perKmFeeNaira} onChange={(e) => setPerKmFeeNaira(Number(e.target.value))} className="mt-0.5 block w-full rounded-rk-sm border border-rk-n200 px-2 py-1" />
      </label>
      <Button type="submit" size="sm" loading={pending}>
        Add
      </Button>
      {error && <p className="col-span-5 text-sm text-rk-alert">{error}</p>}
    </form>
  );
}
