"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateBranchInventory } from "@/actions/products-admin";
import { Button } from "@/components/ui/button";

type InventoryRow = { branchId: string; branchName: string; quantity: number; lowStockAt: number; expiryDate: string | null };

export function InventoryEditor({ productId, branches, existing }: {
  productId: string;
  branches: { id: string; name: string }[];
  existing: InventoryRow[];
}) {
  const router = useRouter();
  const byBranch = new Map(existing.map((e) => [e.branchId, e]));
  const [rows, setRows] = useState(
    branches.map((b) => {
      const e = byBranch.get(b.id);
      return {
        branchId: b.id,
        branchName: b.name,
        quantity: e?.quantity ?? 0,
        lowStockAt: e?.lowStockAt ?? 5,
        expiryDate: e?.expiryDate ? e.expiryDate.slice(0, 10) : "",
      };
    }),
  );
  const [savingBranchId, setSavingBranchId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function updateRow(branchId: string, patch: Partial<(typeof rows)[number]>) {
    setRows((r) => r.map((row) => (row.branchId === branchId ? { ...row, ...patch } : row)));
  }

  async function onSave(branchId: string) {
    const row = rows.find((r) => r.branchId === branchId);
    if (!row) return;
    setSavingBranchId(branchId);
    setError(null);
    const result = await updateBranchInventory({
      productId,
      branchId,
      quantity: row.quantity,
      lowStockAt: row.lowStockAt,
      expiryDate: row.expiryDate || undefined,
    });
    setSavingBranchId(null);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <div className="grid gap-3">
      {error && <p className="text-sm text-rk-alert">{error}</p>}
      {rows.map((row) => (
        <div key={row.branchId} className="grid grid-cols-5 items-end gap-2 rounded-rk-sm bg-rk-n50 p-3">
          <span className="text-sm font-semibold text-rk-navy">{row.branchName}</span>
          <label className="text-xs text-rk-n600">
            Quantity
            <input
              type="number"
              min={0}
              value={row.quantity}
              onChange={(e) => updateRow(row.branchId, { quantity: Number(e.target.value) })}
              className="mt-0.5 block w-full rounded-rk-sm border border-rk-n200 px-2 py-1"
            />
          </label>
          <label className="text-xs text-rk-n600">
            Low stock at
            <input
              type="number"
              min={0}
              value={row.lowStockAt}
              onChange={(e) => updateRow(row.branchId, { lowStockAt: Number(e.target.value) })}
              className="mt-0.5 block w-full rounded-rk-sm border border-rk-n200 px-2 py-1"
            />
          </label>
          <label className="text-xs text-rk-n600">
            Expiry date
            <input
              type="date"
              value={row.expiryDate}
              onChange={(e) => updateRow(row.branchId, { expiryDate: e.target.value })}
              className="mt-0.5 block w-full rounded-rk-sm border border-rk-n200 px-2 py-1"
            />
          </label>
          <Button size="sm" variant="outline" loading={savingBranchId === row.branchId} onClick={() => onSave(row.branchId)}>
            Save
          </Button>
        </div>
      ))}
    </div>
  );
}
