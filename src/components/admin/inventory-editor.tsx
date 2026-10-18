"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateStock } from "@/actions/products-admin";
import { Button } from "@/components/ui/button";

// Stock for ONE store's listing (each store owns its own rows).
export function InventoryEditor({
  productId,
  initial,
}: {
  productId: string;
  initial: { stockQuantity: number; lowStockAt: number; expiryDate: string | null };
}) {
  const router = useRouter();
  const [stockQuantity, setStockQuantity] = useState(initial.stockQuantity);
  const [lowStockAt, setLowStockAt] = useState(initial.lowStockAt);
  const [expiryDate, setExpiryDate] = useState(initial.expiryDate ? initial.expiryDate.slice(0, 10) : "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  async function onSave() {
    setSaving(true);
    setMessage(null);
    const result = await updateStock({ productId, stockQuantity, lowStockAt, expiryDate: expiryDate || undefined });
    setSaving(false);
    setMessage(result.ok ? { ok: true, text: "Stock saved" } : { ok: false, text: result.error });
    if (result.ok) router.refresh();
  }

  const inputClass = "mt-0.5 block w-full rounded-rk-sm border border-rk-n200 px-2 py-1";
  return (
    <div className="grid grid-cols-2 items-end gap-3 rounded-rk-sm bg-rk-n50 p-3 sm:grid-cols-4">
      <label className="text-xs text-rk-n600">
        Quantity on hand
        <input type="number" min={0} value={stockQuantity} onChange={(e) => setStockQuantity(Math.max(0, Number(e.target.value)))} className={inputClass} />
      </label>
      <label className="text-xs text-rk-n600">
        Low-stock alert at
        <input type="number" min={0} value={lowStockAt} onChange={(e) => setLowStockAt(Math.max(0, Number(e.target.value)))} className={inputClass} />
      </label>
      <label className="text-xs text-rk-n600">
        Expiry date
        <input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} className={inputClass} />
      </label>
      <div className="flex items-center gap-2">
        <Button size="sm" variant="outline" loading={saving} onClick={onSave}>
          Save stock
        </Button>
        {message && <span className={`text-xs ${message.ok ? "text-rk-success" : "text-rk-alert"}`}>{message.text}</span>}
      </div>
    </div>
  );
}
