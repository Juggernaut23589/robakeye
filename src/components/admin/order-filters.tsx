"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { exportOrdersCsv } from "@/actions/orders-admin";
import { Button } from "@/components/ui/button";

const STATUSES = ["PENDING_PAYMENT", "PAID", "PROCESSING", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED", "REFUNDED"];

export function OrderFilters({ branches }: { branches: { id: string; name: string }[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("query") ?? "");
  const [pending, startTransition] = useTransition();
  const [exporting, setExporting] = useState(false);

  function applyParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    startTransition(() => router.push(`/orders?${params.toString()}`));
  }

  async function onExport() {
    setExporting(true);
    const result = await exportOrdersCsv({
      status: searchParams.get("status") || undefined,
      branchId: searchParams.get("branchId") || undefined,
      query: searchParams.get("query") || undefined,
    });
    setExporting(false);
    if (!result.ok) return;
    const blob = new Blob([result.csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `robakeye-orders-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="mb-4 flex flex-wrap items-end gap-3">
      <label className="grid gap-1 text-xs text-rk-n600">
        Search
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && applyParam("query", query)}
          onBlur={() => applyParam("query", query)}
          placeholder="Order #, name or email"
          className="rounded-rk-sm border border-rk-n200 px-3 py-2 text-sm"
        />
      </label>
      <label className="grid gap-1 text-xs text-rk-n600">
        Status
        <select
          defaultValue={searchParams.get("status") ?? ""}
          onChange={(e) => applyParam("status", e.target.value)}
          className="rounded-rk-sm border border-rk-n200 px-3 py-2 text-sm"
        >
          <option value="">All</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.replace(/_/g, " ")}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-1 text-xs text-rk-n600">
        Branch
        <select
          defaultValue={searchParams.get("branchId") ?? ""}
          onChange={(e) => applyParam("branchId", e.target.value)}
          className="rounded-rk-sm border border-rk-n200 px-3 py-2 text-sm"
        >
          <option value="">All</option>
          {branches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </label>
      <Button variant="outline" size="sm" loading={exporting || pending} onClick={onExport}>
        Export CSV
      </Button>
    </div>
  );
}
