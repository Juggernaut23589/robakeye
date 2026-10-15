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
  branch: { name: string };
  address: { label: string; line1: string; city: string } | null;
  deliveryPartner: { id: string; name: string } | null;
};

export function DeliveryList({ deliveries, partners }: {
  deliveries: Delivery[];
  partners: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);

  async function onAssign(orderId: string, partnerId: string) {
    setPendingId(orderId);
    await assignDeliveryPartner(orderId, partnerId || null);
    setPendingId(null);
    router.refresh();
  }

  if (deliveries.length === 0) {
    return <p className="text-sm text-rk-n600">No active deliveries.</p>;
  }

  return (
    <div className="grid gap-3">
      {deliveries.map((d) => (
        <div key={d.id} className="flex items-center justify-between rounded-rk-md border border-rk-n200 bg-white p-4">
          <div>
            <div className="flex items-center gap-2">
              <b className="font-mono text-sm text-rk-navy">{d.orderNumber}</b>
              <Badge variant={d.status === "OUT_FOR_DELIVERY" ? "amber" : "neutral"}>
                {d.status.replace(/_/g, " ")}
              </Badge>
            </div>
            <p className="text-sm text-rk-n600">
              {d.user.name} {d.user.phone ? `· ${d.user.phone}` : ""} · {d.branch.name}
            </p>
            {d.address && (
              <p className="text-xs text-rk-n600">
                {d.address.label} — {d.address.line1}, {d.address.city}
              </p>
            )}
          </div>
          <select
            defaultValue={d.deliveryPartner?.id ?? ""}
            disabled={pendingId === d.id}
            onChange={(e) => onAssign(d.id, e.target.value)}
            className="rounded-rk-sm border border-rk-n200 px-2 py-1.5 text-sm"
          >
            <option value="">Unassigned</option>
            {partners.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      ))}
    </div>
  );
}
