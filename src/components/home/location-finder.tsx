"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BranchMap } from "@/components/home/branch-map";

export type HomeBranch = {
  id: string;
  slug: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  services: string[];
};

const SERVICE_BADGE: Record<string, "navy" | "lavender" | "amber"> = {
  PHARMACY: "navy",
  VETERINARY: "lavender",
  SUPERMARKET: "amber",
};

export function LocationFinder({ branches }: { branches: HomeBranch[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(branches[0]?.id ?? null);

  return (
    <section className="mx-auto max-w-6xl px-4 py-10 sm:px-8">
      <h2 className="mb-5 font-display text-2xl font-bold text-rk-navy">
        Find Your Nearest Robakeye
      </h2>
      <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <BranchMap
          branches={branches}
          selectedId={selectedId}
          onSelect={setSelectedId}
        />
        <div className="grid gap-3">
          {branches.map((b) => (
            <button
              key={b.id}
              onClick={() => setSelectedId(b.id)}
              className={`grid gap-1.5 rounded-rk-md border p-4 text-left ${
                selectedId === b.id ? "border-rk-navy bg-rk-navy-tint" : "border-rk-n200"
              }`}
            >
              <b className="font-display text-rk-navy">{b.name}</b>
              <div className="flex flex-wrap gap-1.5">
                {b.services.map((s) => (
                  <Badge key={s} variant={SERVICE_BADGE[s] ?? "neutral"}>
                    {s.charAt(0) + s.slice(1).toLowerCase()}
                  </Badge>
                ))}
              </div>
              <p className="text-sm text-rk-n600">{b.address}</p>
              {selectedId === b.id && (
                <div className="mt-1 flex gap-2">
                  <Button asChild size="sm" variant="outline">
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${b.lat},${b.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Get Directions
                    </a>
                  </Button>
                  <Button asChild size="sm">
                    <Link href={`/locations#${b.slug}`} onClick={(e) => e.stopPropagation()}>
                      Shop This Branch
                    </Link>
                  </Button>
                </div>
              )}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
