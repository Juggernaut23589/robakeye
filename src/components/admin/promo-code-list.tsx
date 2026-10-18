"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { togglePromotionActive } from "@/actions/promotions-admin";
import { formatNaira } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

type Promo = {
  id: string;
  code: string;
  type: "PERCENTAGE" | "FIXED_AMOUNT" | "COMBO";
  percentOff: number | null;
  valueKobo: number | null;
  minSpendKobo: number | null;
  usageLimit: number | null;
  usedCount: number;
  isActive: boolean;
  startsAt: Date;
  endsAt: Date;
  branch: { name: string } | null;
};

export function PromoCodeList({ promotions }: { promotions: Promo[] }) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);

  async function onToggle(id: string) {
    setPendingId(id);
    await togglePromotionActive(id);
    setPendingId(null);
    router.refresh();
  }

  if (promotions.length === 0) {
    return <p className="text-sm text-rk-n600">No promo codes yet.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-rk-md border border-rk-n200 bg-white">
      <table className="w-full text-left text-sm">
        <thead className="bg-rk-n50 text-xs text-rk-n600">
          <tr>
            <th className="p-3">Code</th>
            <th className="p-3">Store</th>
            <th className="p-3">Discount</th>
            <th className="p-3">Min spend</th>
            <th className="p-3">Usage</th>
            <th className="p-3">Window</th>
            <th className="p-3">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-rk-n200">
          {promotions.map((p) => (
            <tr key={p.id}>
              <td className="p-3 font-mono font-semibold text-rk-navy">{p.code}</td>
              <td className="p-3 text-xs">{p.branch?.name ?? "Every store"}</td>
              <td className="p-3">{p.type === "PERCENTAGE" ? `${p.percentOff}% off` : formatNaira(p.valueKobo ?? 0)}</td>
              <td className="p-3">{p.minSpendKobo ? formatNaira(p.minSpendKobo) : "—"}</td>
              <td className="p-3">
                {p.usedCount}
                {p.usageLimit ? ` / ${p.usageLimit}` : ""}
              </td>
              <td className="p-3 text-xs text-rk-n600">
                {new Date(p.startsAt).toLocaleDateString()} – {new Date(p.endsAt).toLocaleDateString()}
              </td>
              <td className="p-3">
                <button onClick={() => onToggle(p.id)} disabled={pendingId === p.id}>
                  <Badge variant={p.isActive ? "success" : "neutral"}>{p.isActive ? "Active" : "Inactive"}</Badge>
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
