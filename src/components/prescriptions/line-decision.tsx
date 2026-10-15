"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { decidePrescriptionLine } from "@/actions/prescriptions";
import { Badge } from "@/components/ui/badge";

type Line = {
  id: string;
  quantity: number;
  status: string;
  rejectionReason: string | null;
  product: { name: string; sku: string };
};

export function PrescriptionLineDecision({ line }: { line: Line }) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [pending, setPending] = useState(false);

  async function decide(decision: "APPROVED" | "REJECTED") {
    setPending(true);
    await decidePrescriptionLine({ lineId: line.id, decision, note: note || undefined });
    setPending(false);
    router.refresh();
  }

  return (
    <div className="rounded-rk-md border border-rk-n200 p-3">
      <div className="flex items-center justify-between">
        <div>
          <b className="text-sm text-rk-navy">
            {line.quantity}× {line.product.name}
          </b>
          <span className="ml-2 font-mono text-xs text-rk-n400">{line.product.sku}</span>
        </div>
        <Badge variant={line.status === "APPROVED" ? "success" : line.status === "REJECTED" ? "alert" : "neutral"}>
          {line.status}
        </Badge>
      </div>

      {line.status === "PENDING" && (
        <div className="mt-2 grid gap-2">
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Note (required for rejection)"
            className="rounded-rk-sm border border-rk-n200 px-2 py-1 text-sm"
          />
          <div className="flex gap-2">
            <button
              onClick={() => decide("APPROVED")}
              disabled={pending}
              className="rounded-rk-pill bg-rk-success px-3 py-1 text-xs font-semibold text-white disabled:opacity-60"
            >
              Approve
            </button>
            <button
              onClick={() => decide("REJECTED")}
              disabled={pending || !note}
              className="rounded-rk-pill bg-rk-alert px-3 py-1 text-xs font-semibold text-white disabled:opacity-60"
            >
              Reject
            </button>
          </div>
        </div>
      )}
      {line.status === "REJECTED" && line.rejectionReason && (
        <p className="mt-1 text-xs text-rk-n600">Reason: {line.rejectionReason}</p>
      )}
    </div>
  );
}
