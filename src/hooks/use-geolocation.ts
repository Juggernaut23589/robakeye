import { useState } from "react";

type GeoState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "granted"; lat: number; lng: number }
  | { status: "denied" };

// IA spec §02 step 1 ("GPS prompt / manual area entry / pick a saved
// address") — this covers the GPS path. Manual branch pick is already
// covered by store/location.ts's persisted selection from Milestone 3.
export function useGeolocation() {
  const [state, setState] = useState<GeoState>({ status: "idle" });

  function request() {
    if (!navigator.geolocation) {
      setState({ status: "denied" });
      return;
    }
    setState({ status: "loading" });
    navigator.geolocation.getCurrentPosition(
      (pos) => setState({ status: "granted", lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setState({ status: "denied" }),
      { timeout: 8000, maximumAge: 5 * 60 * 1000 },
    );
  }

  return { state, request };
}
