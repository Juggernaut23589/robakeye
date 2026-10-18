// Location-aware branch matching per docs/information-architecture.html §02.
// Two distance tiers, same as the earlier Google Maps integration's
// honesty pattern: a real driving-distance call to Google's Distance
// Matrix API when GOOGLE_MAPS_API_KEY is configured (cached — see below),
// falling back to a clearly-labelled straight-line (haversine) estimate
// otherwise. Never silently substitutes one for the other without saying so.

import { haversineKm, type LatLng } from "@/lib/geo";

export { haversineKm, type LatLng };

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
