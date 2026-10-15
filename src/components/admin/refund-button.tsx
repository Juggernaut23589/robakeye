"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { refundOrder } from "@/actions/refunds";

// Deliberately not window.confirm() — a blocking native dialog has no
// styling control, is easy to trigger by accident, and (in automated
// testing) freezes the entire page with no way to recover except
// dismissing it outside the browser session. An inline confirm step is
// strictly better UI for an irreversible action like a refund.
export function RefundButton({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onConfirm() {
    setPending(true);
    setError(null);
    const result = await refundOrder(orderId);
    setPending(false);
    setConfirming(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-rk-n600">Refund via Paystack?</span>
        <button
          onClick={onConfirm}
          disabled={pending}
          className="text-xs font-semibold text-rk-alert disabled:opacity-60"
        >
          {pending ? "Refunding…" : "Confirm"}
        </button>
        <button onClick={() => setConfirming(false)} disabled={pending} className="text-xs text-rk-n600">
          Cancel
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <button onClick={() => setConfirming(true)} className="text-xs font-semibold text-rk-alert">
        Refund
      </button>
      {error && <span className="text-xs text-rk-alert">{error}</span>}
    </div>
  );
}
