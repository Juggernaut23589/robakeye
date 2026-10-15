"use client";

import { useState, type FormEvent } from "react";

export function PromoCodeForm({
  appliedCode,
  onApply,
  error,
}: {
  appliedCode: string | undefined;
  onApply: (code: string | undefined) => void;
  error: string | null;
}) {
  const [input, setInput] = useState(appliedCode ?? "");

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    onApply(input.trim() || undefined);
  }

  return (
    <form onSubmit={onSubmit} className="flex gap-2">
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Promo code"
        className="flex-1 rounded-rk-sm border border-rk-n200 px-3 py-1.5 text-sm uppercase placeholder:normal-case"
      />
      <button
        type="submit"
        className="rounded-rk-pill bg-rk-navy px-3.5 py-1.5 text-xs font-semibold text-white"
      >
        Apply
      </button>
      {appliedCode && !error && (
        <button
          type="button"
          onClick={() => {
            setInput("");
            onApply(undefined);
          }}
          className="text-xs text-rk-alert"
        >
          Remove
        </button>
      )}
      {error && <span className="self-center text-xs text-rk-alert">{error}</span>}
    </form>
  );
}
