"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createPromotion } from "@/actions/promotions-admin";
import { Button } from "@/components/ui/button";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}
function inDaysIso(days: number) {
  return new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);
}

export function NewPromoForm() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [type, setType] = useState<"PERCENTAGE" | "FIXED_AMOUNT">("PERCENTAGE");
  const [percentOff, setPercentOff] = useState(10);
  const [valueNaira, setValueNaira] = useState(1000);
  const [minSpendNaira, setMinSpendNaira] = useState(0);
  const [usageLimit, setUsageLimit] = useState("");
  const [startsAt, setStartsAt] = useState(todayIso());
  const [endsAt, setEndsAt] = useState(inDaysIso(14));
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const result = await createPromotion({
      code,
      type,
      percentOff: type === "PERCENTAGE" ? percentOff : undefined,
      valueKobo: type === "FIXED_AMOUNT" ? Math.round(valueNaira * 100) : undefined,
      minSpendKobo: minSpendNaira > 0 ? Math.round(minSpendNaira * 100) : undefined,
      usageLimit: usageLimit ? Number(usageLimit) : undefined,
      startsAt: new Date(startsAt).toISOString(),
      endsAt: new Date(endsAt).toISOString(),
    });
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setCode("");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-3 rounded-rk-md border border-rk-n200 bg-white p-5">
      <div className="grid gap-3 sm:grid-cols-4">
        <label className="text-xs text-rk-n600">
          Code
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            required
            placeholder="SAVE10"
            className="mt-0.5 block w-full rounded-rk-sm border border-rk-n200 px-2 py-1.5 font-mono"
          />
        </label>
        <label className="text-xs text-rk-n600">
          Type
          <select
            value={type}
            onChange={(e) => setType(e.target.value as typeof type)}
            className="mt-0.5 block w-full rounded-rk-sm border border-rk-n200 px-2 py-1.5"
          >
            <option value="PERCENTAGE">Percentage off</option>
            <option value="FIXED_AMOUNT">Fixed amount off</option>
          </select>
        </label>
        {type === "PERCENTAGE" ? (
          <label className="text-xs text-rk-n600">
            % off
            <input
              type="number"
              min={1}
              max={100}
              value={percentOff}
              onChange={(e) => setPercentOff(Number(e.target.value))}
              className="mt-0.5 block w-full rounded-rk-sm border border-rk-n200 px-2 py-1.5"
            />
          </label>
        ) : (
          <label className="text-xs text-rk-n600">
            Amount off (₦)
            <input
              type="number"
              min={1}
              value={valueNaira}
              onChange={(e) => setValueNaira(Number(e.target.value))}
              className="mt-0.5 block w-full rounded-rk-sm border border-rk-n200 px-2 py-1.5"
            />
          </label>
        )}
        <label className="text-xs text-rk-n600">
          Min spend (₦, optional)
          <input
            type="number"
            min={0}
            value={minSpendNaira}
            onChange={(e) => setMinSpendNaira(Number(e.target.value))}
            className="mt-0.5 block w-full rounded-rk-sm border border-rk-n200 px-2 py-1.5"
          />
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <label className="text-xs text-rk-n600">
          Usage limit (optional)
          <input
            type="number"
            min={1}
            value={usageLimit}
            onChange={(e) => setUsageLimit(e.target.value)}
            placeholder="Unlimited"
            className="mt-0.5 block w-full rounded-rk-sm border border-rk-n200 px-2 py-1.5"
          />
        </label>
        <label className="text-xs text-rk-n600">
          Starts
          <input
            type="date"
            value={startsAt}
            onChange={(e) => setStartsAt(e.target.value)}
            className="mt-0.5 block w-full rounded-rk-sm border border-rk-n200 px-2 py-1.5"
          />
        </label>
        <label className="text-xs text-rk-n600">
          Ends
          <input
            type="date"
            value={endsAt}
            onChange={(e) => setEndsAt(e.target.value)}
            className="mt-0.5 block w-full rounded-rk-sm border border-rk-n200 px-2 py-1.5"
          />
        </label>
      </div>

      {error && <p className="text-sm text-rk-alert">{error}</p>}
      <Button type="submit" size="sm" loading={pending} className="w-fit">
        Create promo code
      </Button>
    </form>
  );
}
