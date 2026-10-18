"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { copyProductToStore } from "@/actions/products-admin";
import { Button } from "@/components/ui/button";

// "Also sell this at…": creates that store's own listing (zero stock) so
// each store keeps independent price and stock.
export function CopyToStore({
  productId,
  targets,
  defaultPriceNaira,
}: {
  productId: string;
  targets: { id: string; name: string }[];
  defaultPriceNaira: number;
}) {
  const router = useRouter();
  const [branchId, setBranchId] = useState(targets[0]?.id ?? "");
  const [price, setPrice] = useState(defaultPriceNaira);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onCopy() {
    setPending(true);
    setError(null);
    const result = await copyProductToStore({ productId, branchId, priceKobo: Math.round(price * 100) });
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.push(`/products/${result.productId}`);
  }

  return (
    <div className="flex flex-wrap items-end gap-2 rounded-rk-sm bg-rk-n50 p-3">
      <label className="text-xs text-rk-n600">
        Also sell at
        <select value={branchId} onChange={(e) => setBranchId(e.target.value)} className="mt-0.5 block rounded-rk-sm border border-rk-n200 px-2 py-1 text-sm">
          {targets.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </label>
      <label className="text-xs text-rk-n600">
        Price there (₦)
        <input type="number" min={1} step="0.01" value={price} onChange={(e) => setPrice(Number(e.target.value))} className="mt-0.5 block w-28 rounded-rk-sm border border-rk-n200 px-2 py-1 text-sm" />
      </label>
      <Button size="sm" onClick={onCopy} loading={pending}>
        Create listing
      </Button>
      <span className="text-xs text-rk-n600">Starts at zero stock.</span>
      {error && <p className="w-full text-xs text-rk-alert">{error}</p>}
    </div>
  );
}
