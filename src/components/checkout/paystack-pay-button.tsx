"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

declare global {
  interface Window {
    PaystackPop?: {
      setup: (opts: {
        key: string;
        email: string;
        amount: number;
        ref: string;
        onClose: () => void;
        callback: (response: { reference: string }) => void;
      }) => { openIframe: () => void };
    };
  }
}

let scriptPromise: Promise<void> | null = null;
function loadPaystackScript(): Promise<void> {
  if (window.PaystackPop) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://js.paystack.co/v1/inline.js";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Paystack"));
    document.head.appendChild(script);
  });
  return scriptPromise;
}

export function PaystackPayButton({
  groupId,
  onVerifying,
  onSuccess,
  onError,
}: {
  groupId: string;
  onVerifying: () => void;
  onSuccess: (reference: string) => void;
  onError: (message: string) => void;
}) {
  const [pending, setPending] = useState(false);

  async function startPayment() {
    setPending(true);
    try {
      const res = await fetch("/api/payments/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupId }),
      });
      const data = await res.json();
      if (!res.ok) {
        onError(data.error ?? "Could not start payment.");
        setPending(false);
        return;
      }

      await loadPaystackScript();
      const handler = window.PaystackPop!.setup({
        key: data.publicKey,
        email: data.email,
        amount: data.amountKobo,
        ref: data.reference,
        onClose: () => setPending(false),
        callback: (response) => {
          onVerifying();
          onSuccess(response.reference);
        },
      });
      handler.openIframe();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Could not start payment.");
      setPending(false);
    }
  }

  return (
    <Button variant="amber" onClick={startPayment} loading={pending}>
      Pay now
    </Button>
  );
}
