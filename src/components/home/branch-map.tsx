"use client";

import { useEffect, useRef, useState } from "react";

export type MapBranch = { id: string; name: string; lat: number; lng: number };

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

let loaderPromise: Promise<void> | null = null;
function loadGoogleMaps(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.google?.maps) return Promise.resolve();
  if (loaderPromise) return loaderPromise;
  loaderPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${API_KEY}&loading=async`;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Google Maps JS API"));
    document.head.appendChild(script);
  });
  return loaderPromise;
}

// Renders a real Google Map once NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is set
// (Milestone 1's manual setup step) — until then, shows an honest
// "not configured" placeholder rather than silently failing or faking a
// map with static pin positions.
export function BranchMap({
  branches,
  selectedId,
  onSelect,
}: {
  branches: MapBranch[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<Map<string, google.maps.marker.AdvancedMarkerElement | google.maps.Marker>>(
    new Map(),
  );
  const [status, setStatus] = useState<"loading" | "ready" | "unconfigured" | "error">(
    API_KEY ? "loading" : "unconfigured",
  );

  useEffect(() => {
    if (!API_KEY || !containerRef.current) return;
    let cancelled = false;

    loadGoogleMaps()
      .then(() => {
        if (cancelled || !containerRef.current) return;
        const center = branches[0] ?? { lat: 7.43, lng: 3.88 };
        const map = new google.maps.Map(containerRef.current, {
          center,
          zoom: 12,
          disableDefaultUI: true,
          zoomControl: true,
        });
        mapRef.current = map;

        branches.forEach((b) => {
          const marker = new google.maps.Marker({
            position: { lat: b.lat, lng: b.lng },
            map,
            title: b.name,
          });
          marker.addListener("click", () => onSelect(b.id));
          markersRef.current.set(b.id, marker);
        });

        setStatus("ready");
      })
      .catch(() => !cancelled && setStatus("error"));

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- map is built once from the initial branch list
  }, []);

  // Highlight the selected branch's marker without re-initializing the map.
  useEffect(() => {
    if (status !== "ready") return;
    markersRef.current.forEach((marker, id) => {
      if (!(marker instanceof google.maps.Marker)) return;
      marker.setAnimation(id === selectedId ? google.maps.Animation.BOUNCE : null);
    });
  }, [selectedId, status]);

  if (status === "unconfigured" || status === "error") {
    return (
      <div className="relative grid min-h-64 place-items-center overflow-hidden rounded-rk-md bg-rk-lavender-mist">
        <AbstractMapMock branches={branches} selectedId={selectedId} onSelect={onSelect} />
        <div className="absolute bottom-2 left-2 rounded-rk-sm bg-white/90 px-2 py-1 text-xs text-rk-n600">
          {status === "unconfigured"
            ? "Map preview — add GOOGLE_MAPS_API_KEY to show the live map"
            : "Map failed to load"}
        </div>
      </div>
    );
  }

  return <div ref={containerRef} className="min-h-64 rounded-rk-md" />;
}

// Stylised placeholder matching docs/homepage-design-spec.html §04's mock
// — real relative pin positions from lat/lng, just not an interactive tile.
function AbstractMapMock({
  branches,
  selectedId,
  onSelect,
}: {
  branches: MapBranch[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  if (branches.length === 0) return null;
  const lats = branches.map((b) => b.lat);
  const lngs = branches.map((b) => b.lng);
  const latRange = [Math.min(...lats) - 0.01, Math.max(...lats) + 0.01];
  const lngRange = [Math.min(...lngs) - 0.01, Math.max(...lngs) + 0.01];

  return (
    <div className="relative size-full min-h-64">
      {branches.map((b) => {
        const top = 100 - ((b.lat - latRange[0]) / (latRange[1] - latRange[0])) * 100;
        const left = ((b.lng - lngRange[0]) / (lngRange[1] - lngRange[0])) * 100;
        const selected = b.id === selectedId;
        return (
          <button
            key={b.id}
            onClick={() => onSelect(b.id)}
            aria-label={`Select ${b.name} on the map`}
            style={{ top: `${top}%`, left: `${left}%` }}
            className={`absolute grid size-4 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 border-white shadow ${
              selected ? "size-5 bg-rk-amber" : "bg-rk-navy"
            }`}
          />
        );
      })}
    </div>
  );
}
