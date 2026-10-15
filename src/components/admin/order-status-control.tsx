"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateOrderStatus } from "@/actions/orders-admin";
import { Button } from "@/components/ui/button";

const NEXT_STATUS: Record<string, string[]> = {
  PENDING_PAYMENT: ["CANCELLED"],
  PAID: ["PROCESSING", "CANCELLED"],
  PROCESSING: ["OUT_FOR_DELIVERY", "CANCELLED"],
  OUT_FOR_DELIVERY: ["DELIVERED", "CANCELLED"],
  DELIVERED: [],
  CANCELLED: [],
  REFUNDED: [],
};

export function OrderStatusControl({ orderId, currentStatus }: { orderId: string; currentStatus: string }) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const options = NEXT_STATUS[currentStatus] ?? [];

  async function onUpdate(status: string) {
    setPending(true);
    setError(null);
    const result = await updateOrderStatus({ orderId, status, note: note || undefined });
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setNote("");
    router.refresh();
  }

  if (options.length === 0) {
    return <p className="text-sm text-rk-n600">No further status transitions from {currentStatus.replace(/_/g, " ")}.</p>;
  }

  return (
    <div className="grid gap-2">
      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Optional note"
        className="rounded-rk-sm border border-rk-n200 px-3 py-2 text-sm"
      />
      <div className="flex gap-2">
        {options.map((status) => (
          <Button key={status} size="sm" variant="outline" loading={pending} onClick={() => onUpdate(status)}>
            Mark {status.replace(/_/g, " ")}
          </Button>
        ))}
      </div>
      {error && <p className="text-sm text-rk-alert">{error}</p>}
    </div>
  );
}
