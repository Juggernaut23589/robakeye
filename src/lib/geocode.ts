// Address → coordinates, same honesty pattern as lib/distance.ts: a real
// Google Geocoding API call when GOOGLE_MAPS_API_KEY is configured
// (cached per docs/technical-architecture.html's integrations table:
// "Geocoding runs once per saved address, not per page view"), returning
// null rather than a guessed location when it isn't.
import type { LatLng } from "@/lib/distance";

export async function geocodeAddress(addressText: string): Promise<LatLng | null> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) return null;

  try {
    const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
    url.searchParams.set("address", `${addressText}, Ibadan, Nigeria`);
    url.searchParams.set("key", apiKey);

    const res = await fetch(url);
    const data = await res.json();
    const location = data?.results?.[0]?.geometry?.location;
    if (!location) return null;
    return { lat: location.lat, lng: location.lng };
  } catch (err) {
    console.error("Geocoding API call failed", err);
    return null;
  }
}
