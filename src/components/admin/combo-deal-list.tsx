"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toggleComboDealActive, setFeaturedComboDeal, unfeatureComboDeal } from "@/actions/promotions-admin";
import { formatNaira } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

type Deal = {
  id: string;
  name: string;
  productIds: string[];
  discountType: "FIXED_PRICE" | "PERCENT_OFF";
  valueKobo: number | null;
  percentOff: number | null;
  isActive: boolean;
  isFeaturedOnHomepage: boolean;
  startsAt: Date;
  endsAt: Date;
};

export function ComboDealList({ deals, productNameById }: { deals: Deal[]; productNameById: Record<string, string> }) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);

  async function onToggleActive(id: string) {
    setPendingId(id);
    await toggleComboDealActive(id);
    setPendingId(null);
    router.refresh();
  }

  async function onToggleFeatured(deal: Deal) {
    setPendingId(deal.id);
    if (deal.isFeaturedOnHomepage) await unfeatureComboDeal(deal.id);
    else await setFeaturedComboDeal(deal.id);
    setPendingId(null);
    router.refresh();
  }

  if (deals.length === 0) {
    return <p className="text-sm text-rk-n600">No combo deals yet.</p>;
  }

  return (
    <div className="grid gap-3">
      {deals.map((deal) => (
        <div key={deal.id} className="rounded-rk-md border border-rk-n200 bg-white p-4">
          <div className="flex items-center justify-between">
            <b className="text-rk-navy">{deal.name}</b>
            <div className="flex items-center gap-2">
              {deal.isFeaturedOnHomepage && <Badge variant="amber">Featured on homepage</Badge>}
              <button onClick={() => onToggleActive(deal.id)} disabled={pendingId === deal.id}>
                <Badge variant={deal.isActive ? "success" : "neutral"}>{deal.isActive ? "Active" : "Inactive"}</Badge>
              </button>
            </div>
          </div>
          <p className="mt-1 text-sm text-rk-n600">
            {deal.productIds.map((id) => productNameById[id] ?? id).join(" + ")}
          </p>
          <p className="text-sm text-rk-navy">
            {deal.discountType === "FIXED_PRICE"
              ? `Bundle price: ${formatNaira(deal.valueKobo ?? 0)}`
              : `${deal.percentOff}% off the bundle`}
          </p>
          <p className="text-xs text-rk-n600">
            {new Date(deal.startsAt).toLocaleDateString()} – {new Date(deal.endsAt).toLocaleDateString()}
          </p>
          <button
            onClick={() => onToggleFeatured(deal)}
            disabled={pendingId === deal.id}
            className="mt-2 text-xs text-rk-blue underline"
          >
            {deal.isFeaturedOnHomepage ? "Remove from homepage banner" : "Feature on homepage banner"}
          </button>
        </div>
      ))}
    </div>
  );
}
