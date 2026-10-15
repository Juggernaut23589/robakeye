"use client";

import { useEffect, useMemo, useState } from "react";

// Milestone 11: live-wired to a real ComboDeal row when the Promotions
// admin module has one flagged `isFeaturedOnHomepage` (admin-dashboard-rbac
// §06 "Homepage banner scheduling"). Falls back to the original static
// sample — honestly labelled as one — when no admin has configured a
// featured deal yet, same degrade-honestly pattern as every other
// unconfigured-integration fallback in this project.
export type FeaturedPromo = {
  headline: string;
  description: string | null;
  endsAt: string; // ISO — passed from a server component, Date doesn't survive serialization
};

const SAMPLE_TARGET = (() => {
  const d = new Date();
  d.setDate(d.getDate() + 2);
  d.setHours(d.getHours() + 14);
  return d;
})();

function getRemaining(target: Date) {
  const diff = Math.max(0, target.getTime() - Date.now());
  const days = Math.floor(diff / 86_400_000);
  const hours = Math.floor((diff % 86_400_000) / 3_600_000);
  const mins = Math.floor((diff % 3_600_000) / 60_000);
  const secs = Math.floor((diff % 60_000) / 1000);
  return { days, hours, mins, secs };
}

export function PromoBanner({ featured }: { featured?: FeaturedPromo | null }) {
  // eslint-disable-next-line react-hooks/exhaustive-deps -- `featured` is a plain data prop (not a stable ref); re-deriving on its primitive endsAt string is exactly what we want, not a missing-dep bug
  const target = useMemo(() => (featured ? new Date(featured.endsAt) : SAMPLE_TARGET), [featured?.endsAt]);
  const [remaining, setRemaining] = useState(() => getRemaining(target));

  useEffect(() => {
    const timer = setInterval(() => setRemaining(getRemaining(target)), 1000);
    return () => clearInterval(timer);
  }, [target]);

  return (
    <section className="mx-auto max-w-6xl px-4 sm:px-8">
      <div className="flex flex-col items-start justify-between gap-5 rounded-rk-lg bg-rk-lavender-mist p-6 sm:flex-row sm:items-center">
        <div>
          <span className="rounded-rk-pill bg-rk-amber-tint px-2.5 py-0.5 text-xs font-bold text-rk-amber-deep">
            {featured ? "Limited time" : "Limited time (sample promo)"}
          </span>
          <h3 className="mt-2 font-display text-xl font-bold text-rk-navy">
            {featured ? featured.headline : "Baby Care Combo — Save 15%"}
          </h3>
          <p className="text-sm text-rk-n600">
            {featured
              ? (featured.description ?? "Bundled together for a limited time.")
              : "Diapers, formula and baby wash bundled together, this week only."}
          </p>
        </div>
        <div className="flex gap-3">
          {[
            { label: "Days", value: remaining.days },
            { label: "Hrs", value: remaining.hours },
            { label: "Min", value: remaining.mins },
            { label: "Sec", value: remaining.secs },
          ].map((unit) => (
            <div key={unit.label} className="grid min-w-14 place-items-center rounded-rk-md bg-white px-3 py-2">
              <b className="font-mono text-lg text-rk-navy">{String(unit.value).padStart(2, "0")}</b>
              <span className="text-[0.65rem] text-rk-n600">{unit.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
