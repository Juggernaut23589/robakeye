"use client";

import { useEffect, useState } from "react";
import { useGeolocation } from "@/hooks/use-geolocation";
import { useLocationStore } from "@/store/location";
import { getAvailability } from "@/actions/catalogue";
import { RestockNotifyForm } from "@/components/catalogue/restock-notify-form";
import type { BranchAvailability } from "@/lib/distance";

// Implements the exact states from docs/information-architecture.html §02:
// primary match / fallback branch / fully unavailable+notify-me.
export function BranchAvailabilityWidget({
  productId,
  onBranchSelect,
}: {
  productId: string;
  onBranchSelect: (branchId: string, branchName: string) => void;
}) {
  const { state: geo, request: requestGeo } = useGeolocation();
  const selectedBranch = useLocationStore((s) => s.branch);
  const [rows, setRows] = useState<BranchAvailability[] | null>(null);
  const [showSwitcher, setShowSwitcher] = useState(false);

  const origin = geo.status === "granted" ? { lat: geo.lat, lng: geo.lng } : null;

  useEffect(() => {
    getAvailability(productId, origin).then(setRows);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-fetch only when productId or geolocation actually changes
  }, [productId, origin?.lat, origin?.lng]);

  // Auto-select the matched branch once it's known. Without this, a
  // product stocked at exactly one branch has no switcher (it only
  // renders for rows.length > 1) and no other path ever calls
  // onBranchSelect, so "Add to basket" stays permanently disabled.
  useEffect(() => {
    if (!rows || rows.length === 0) return;
    const match =
      rows.find((r) => r.branchId === selectedBranch?.id) ??
      rows.find((r) => r.withinRadius) ??
      rows[0];
    if (match.inStock) onBranchSelect(match.branchId, match.branchName);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onBranchSelect identity isn't a meaningful dep here; only re-run when the data actually changes
  }, [rows, selectedBranch?.id]);

  if (!rows) {
    return <div className="h-16 animate-pulse rounded-rk-md bg-rk-n200 motion-reduce:animate-none" />;
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-rk-md border border-rk-n200 bg-rk-n50 p-3 text-sm text-rk-n600">
        Not currently stocked at any branch.
      </div>
    );
  }

  // Prefer the sticky session branch pick (Milestone 3's location selector)
  // as the "matched branch" when no fresher GPS fix is available, matching
  // the spec's "branch already known this session" fast path.
  const matched =
    rows.find((r) => r.branchId === selectedBranch?.id) ??
    rows.find((r) => r.withinRadius) ??
    rows[0];
  const inStockElsewhere = rows.find((r) => r.branchId !== matched.branchId && r.inStock);
  const anyInStock = rows.some((r) => r.inStock);

  function selectBranch(r: BranchAvailability) {
    onBranchSelect(r.branchId, r.branchName);
  }

  return (
    <div className="flex flex-col gap-2">
      {matched.inStock ? (
        <div className="flex items-center gap-2 rounded-rk-md bg-rk-success-tint px-3 py-2 text-sm text-rk-success">
          <span>✓</span>
          <span>
            Available at <b>{matched.branchName}</b>
            {origin && ` — ${matched.distanceKm.toFixed(1)} km away`}
            {origin && matched.distanceSource === "straight-line" && (
              <span className="text-xs opacity-70"> (straight-line estimate)</span>
            )}
          </span>
        </div>
      ) : inStockElsewhere ? (
        <>
          <div className="rounded-rk-md bg-rk-n50 px-3 py-2 text-sm text-rk-n600">
            Out of stock at {matched.branchName} (your branch)
          </div>
          <div className="rounded-rk-md bg-rk-amber-tint px-3 py-2 text-sm text-rk-amber-deep">
            Available at <b>{inStockElsewhere.branchName}</b>
            {origin && ` — ${inStockElsewhere.distanceKm.toFixed(1)} km away`} — may add delivery
            time or fee
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => selectBranch(inStockElsewhere)}
              className="rounded-rk-pill bg-rk-navy px-3.5 py-1.5 text-xs font-semibold text-white"
            >
              Add from {inStockElsewhere.branchName}
            </button>
          </div>
        </>
      ) : !anyInStock ? (
        <>
          <div className="rounded-rk-md bg-rk-n50 px-3 py-2 text-sm text-rk-n600">
            Out of stock at every branch
          </div>
          <RestockNotifyForm productId={productId} branchId={matched.branchId} />
        </>
      ) : null}

      {!origin && geo.status !== "loading" && (
        <button onClick={requestGeo} className="w-fit text-xs text-rk-blue underline">
          Use my location for a more accurate distance
        </button>
      )}
      {geo.status === "loading" && <span className="text-xs text-rk-n600">Locating…</span>}
      {geo.status === "denied" && (
        <span className="text-xs text-rk-n400">
          Location unavailable — showing your selected branch instead.
        </span>
      )}

      {rows.length > 1 && (
        <button
          onClick={() => setShowSwitcher((s) => !s)}
          className="w-fit text-xs text-rk-blue underline"
        >
          {showSwitcher ? "Hide" : "Switch branch"}
        </button>
      )}
      {showSwitcher && (
        <ul className="grid gap-1 rounded-rk-md border border-rk-n200 p-2 text-xs">
          {rows.map((r) => (
            <li key={r.branchId}>
              <button
                onClick={() => selectBranch(r)}
                className="flex w-full items-center justify-between rounded-rk-sm px-2 py-1.5 text-left hover:bg-rk-n50"
              >
                <span>
                  {r.branchName} {!r.inStock && "(out of stock)"}
                </span>
                {origin && <span className="text-rk-n400">{r.distanceKm.toFixed(1)} km</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
