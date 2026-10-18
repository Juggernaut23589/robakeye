"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { assignDeliveryPartner } from "@/actions/delivery-admin";
import { Badge } from "@/components/ui/badge";

type Delivery = {
  id: string;
  orderNumber: string;
  status: string;
  user: { name: string; phone: string | null };
  branch: { id: string; name: string; address: string };
  address: { label: string; line1: string; city: string } | null;
  deliveryPartner: { id: string; name: string } | null;
};

type Partner = { id: string; name: string; isActive: boolean; branchId: string | null };

// Each order leaves from its own store, so the rider list only offers that
// store's in-house riders plus shared couriers (the server enforces it too).
export function DeliveryList({ deliveries, partners }: { deliveries: Delivery[]; partners: Partner[] }) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function onAssign(orderId: string, partnerId: string) {
    setPendingId(orderId);
    const result = await assignDeliveryPartner(orderId, partnerId || null);
    setPendingId(null);
    setErrors((e) => {
      const next = { ...e };
      if (result.ok) delete next[orderId];
      else next[orderId] = result.error;
      return next;
    });
    router.refresh();
  }

  if (deliveries.length === 0) {
    return <p className="text-sm text-rk-n600">No active deliveries.</p>;
  }

  return (
    <div className="grid gap-3">
      {deliveries.map((d) => {
        const options = partners.filter((p) => p.isActive && (p.branchId === null || p.branchId === d.branch.id));
        return (
          <div key={d.id} className="flex flex-wrap items-center justify-between gap-3 rounded-rk-md border border-rk-n200 bg-white p-4">
            <div>
              <div className="flex items-center gap-2">
                <b className="font-mono text-sm text-rk-navy">{d.orderNumber}</b>
                <Badge variant={d.status === "OUT_FOR_DELIVERY" ? "amber" : "neutral"}>{d.status.replace(/_/g, " ")}</Badge>
              </div>
              <p className="text-sm text-rk-n600">
                From <b className="text-rk-navy">{d.branch.name}</b> → {d.user.name}
                {d.user.phone ? ` · ${d.user.phone}` : ""}
              </p>
              {d.address && (
                <p className="text-xs text-rk-n600">
                  {d.address.label} — {d.address.line1}, {d.address.city}
                </p>
              )}
              {errors[d.id] && <p className="mt-1 text-xs text-rk-alert">{errors[d.id]}</p>}
            </div>
            <label className="text-xs text-rk-n600">
              Rider
              <select
                defaultValue={d.deliveryPartner?.id ?? ""}
                disabled={pendingId === d.id}
                onChange={(e) => onAssign(d.id, e.target.value)}
                className="mt-0.5 block rounded-rk-sm border border-rk-n200 px-2 py-1.5 text-sm text-rk-ink"
              >
                <option value="">Unassigned</option>
                {options.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                    {p.branchId === null ? " (shared)" : ""}
                  </option>
                ))}
              </select>
            </label>
          </div>
        );
      })}
    </div>
  );
}
