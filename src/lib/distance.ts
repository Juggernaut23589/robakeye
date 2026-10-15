// Location-aware branch matching per docs/information-architecture.html §02.
// Two distance tiers, same as the earlier Google Maps integration's
// honesty pattern: a real driving-distance call to Google's Distance
// Matrix API when GOOGLE_MAPS_API_KEY is configured (cached — see below),
// falling back to a clearly-labelled straight-line (haversine) estimate
// otherwise. Never silently substitutes one for the other without saying so.

export type LatLng = { lat: number; lng: number };

export function haversineKm(a: LatLng, b: LatLng): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export type DistanceResult = { km: number; source: "driving" | "straight-line" };

// In-process cache, rounded to ~110m grid cells so nearby repeat requests
// (same customer browsing several product pages) hit it. This is the
// "cached distance lookups" the brief asks for — it degrades to no-op
// between server restarts/instances, which is fine for Milestone 5; swap
// for Upstash Redis (already in the locked stack for other purposes) once
// that account exists, without changing this function's signature.
const distanceCache = new Map<string, { value: number; expiresAt: number }>();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1h — road distances don't change minute to minute

function cacheKey(origin: LatLng, dest: LatLng) {
  const round = (n: number) => n.toFixed(3);
  return `${round(origin.lat)},${round(origin.lng)}->${round(dest.lat)},${round(dest.lng)}`;
}

async function drivingDistanceKm(origin: LatLng, dest: LatLng): Promise<number | null> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) return null;

  const key = cacheKey(origin, dest);
  const cached = distanceCache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  try {
    const url = new URL("https://maps.googleapis.com/maps/api/distancematrix/json");
    url.searchParams.set("origins", `${origin.lat},${origin.lng}`);
    url.searchParams.set("destinations", `${dest.lat},${dest.lng}`);
    url.searchParams.set("units", "metric");
    url.searchParams.set("key", apiKey);

    const res = await fetch(url, { next: { revalidate: 0 } });
    const data = await res.json();
    const meters = data?.rows?.[0]?.elements?.[0]?.distance?.value;
    if (typeof meters !== "number") return null;

    const km = meters / 1000;
    distanceCache.set(key, { value: km, expiresAt: Date.now() + CACHE_TTL_MS });
    return km;
  } catch (err) {
    console.error("Distance Matrix API call failed", err);
    return null;
  }
}

export async function getDistance(origin: LatLng, dest: LatLng): Promise<DistanceResult> {
  const driving = await drivingDistanceKm(origin, dest);
  if (driving !== null) return { km: driving, source: "driving" };
  return { km: haversineKm(origin, dest), source: "straight-line" };
}

// ─────────────────────────────────────────────────────────────
// findAvailableBranches — the reusable server utility the brief names
// explicitly. Implements the IA spec's flowchart (§02): rank branches by
// distance, filter to each branch's own delivery radius (DeliveryZone.maxKm
// — "per-branch, not a uniform constant"), then report per-branch stock
// for the given product so the caller can render the exact states the spec
// describes (primary match / fallback branch / fully unavailable).
// ─────────────────────────────────────────────────────────────

import { prisma } from "@/lib/prisma";

export type BranchAvailability = {
  branchId: string;
  branchSlug: string;
  branchName: string;
  distanceKm: number;
  distanceSource: "driving" | "straight-line";
  withinRadius: boolean;
  quantity: number;
  inStock: boolean;
};

export async function findAvailableBranches(
  productId: string,
  origin: LatLng | null,
): Promise<BranchAvailability[]> {
  const inventoryRows = await prisma.branchInventory.findMany({
    where: { productId },
    include: {
      branch: { include: { deliveryZones: true } },
    },
  });

  const results = await Promise.all(
    inventoryRows.map(async (row) => {
      let distanceKm = 0;
      let distanceSource: "driving" | "straight-line" = "straight-line";
      let withinRadius = true;

      if (origin) {
        const branchOrigin = { lat: row.branch.lat, lng: row.branch.lng };
        const distance = await getDistance(origin, branchOrigin);
        distanceKm = distance.km;
        distanceSource = distance.source;
        const radius = row.branch.deliveryZones[0]?.maxKm;
        withinRadius = radius === undefined ? true : distanceKm <= radius;
      }

      return {
        branchId: row.branch.id,
        branchSlug: row.branch.slug,
        branchName: row.branch.name,
        distanceKm,
        distanceSource,
        withinRadius,
        quantity: row.quantity,
        inStock: row.quantity > 0,
      } satisfies BranchAvailability;
    }),
  );

  // Pickup bypasses matching (IA spec rule table) — callers that only care
  // about delivery should filter `withinRadius` themselves; this function
  // always returns every branch that stocks the product so a pickup-mode
  // caller can still see all of them, nearest first.
  return results.sort((a, b) => a.distanceKm - b.distanceKm);
}
