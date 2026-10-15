"use client";

import { useState } from "react";
import { startTwoFactorSetup, confirmTwoFactorSetup, disableTwoFactor } from "@/actions/two-factor";

export function TwoFactorSetup({ initiallyEnabled }: { initiallyEnabled: boolean }) {
  const [enabled, setEnabled] = useState(initiallyEnabled);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onStart() {
    setPending(true);
    setError(null);
    const result = await startTwoFactorSetup();
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setQrDataUrl(result.qrDataUrl);
    setSecret(result.secret);
  }

  async function onConfirm() {
    setPending(true);
    setError(null);
    const result = await confirmTwoFactorSetup({ code });
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setEnabled(true);
    setQrDataUrl(null);
  }

  async function onDisable() {
    setPending(true);
    await disableTwoFactor();
    setPending(false);
    setEnabled(false);
  }

  if (enabled) {
    return (
      <div className="flex items-center gap-3">
        <span className="rounded-rk-pill bg-rk-success-tint px-3 py-1 text-sm text-rk-success">
          2FA enabled
        </span>
        <button onClick={onDisable} disabled={pending} className="text-sm text-rk-alert">
          Disable
        </button>
      </div>
    );
  }

  if (qrDataUrl) {
    return (
      <div className="flex flex-col gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={qrDataUrl} alt="2FA QR code" width={200} height={200} />
        <p className="text-sm text-rk-n600">
          Scan with Google Authenticator, Authy, or 1Password, or enter this code manually:{" "}
          <code className="font-mono">{secret}</code>
        </p>
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="6-digit code"
          className="w-40 rounded-rk-md border border-rk-n200 px-3 py-2"
        />
        {error && <p className="text-sm text-rk-alert">{error}</p>}
        <button
          onClick={onConfirm}
          disabled={pending}
          className="w-fit rounded-rk-pill bg-rk-navy px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          Confirm & enable
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-rk-n600">
        Your role requires two-factor authentication before you can access admin pages.
      </p>
      {error && <p className="text-sm text-rk-alert">{error}</p>}
      <button
        onClick={onStart}
        disabled={pending}
        className="w-fit rounded-rk-pill bg-rk-navy px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
      >
        Set up 2FA
      </button>
    </div>
  );
}
