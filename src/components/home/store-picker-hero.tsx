"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { ArrowRight, LocateFixed, MapPin, PawPrint, Pause, Pill, Play, ShoppingBasket, Truck } from "lucide-react";
import { haversineKm } from "@/lib/geo";
import { storePath, storeShortName, type VerticalKey } from "@/lib/departments";
import { useLocationStore } from "@/store/location";

export type HeroStore = {
  id: string;
  slug: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  services: string[];
  tagline: string | null;
  deliveryKm: number | null;
};

const SLIDES = [
  {
    key: "supermarket",
    label: "The Supermart",
    caption: "Fresh produce, pantry staples & household essentials",
    image: "/demo-assets/banners/hero-supermarket.jpg",
    position: "object-[50%_45%]",
  },
  {
    key: "pharmacy",
    label: "The Pharmacy",
    caption: "Licensed pharmacists, medicines & health devices",
    image: "/demo-assets/banners/hero-pharmacy.jpg",
    position: "object-[50%_40%]",
  },
  {
    key: "veterinary",
    label: "The Vet Clinic",
    caption: "Check-ups, vaccinations, pet food & care",
    image: "/demo-assets/banners/hero-veterinary.jpg",
    position: "object-[32%_45%]",
  },
] as const;

const SLIDE_MS = 6000;

const DEPT_ICON: Record<VerticalKey, { icon: typeof Pill; label: string }> = {
  SUPERMARKET: { icon: ShoppingBasket, label: "Supermart" },
  PHARMACY: { icon: Pill, label: "Pharmacy" },
  VETERINARY: { icon: PawPrint, label: "Vet clinic" },
};

function subscribeReducedMotion(cb: () => void) {
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}
const getReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

type GeoState =
  | { status: "idle" }
  | { status: "locating" }
  | { status: "done"; distances: Record<string, number>; nearestId: string }
  | { status: "error"; message: string };

export function StorePickerHero({ stores }: { stores: HeroStore[] }) {
  const reducedMotion = useSyncExternalStore(subscribeReducedMotion, getReducedMotion, () => false);
  const [index, setIndex] = useState(0);
  const [userPaused, setUserPaused] = useState(false);
  const [hoverPaused, setHoverPaused] = useState(false);
  const [geo, setGeo] = useState<GeoState>({ status: "idle" });
  const lastStore = useLocationStore((s) => s.branch);

  const playing = !reducedMotion && !userPaused && !hoverPaused;

  useEffect(() => {
    if (!playing) return;
    const t = setTimeout(() => setIndex((i) => (i + 1) % SLIDES.length), SLIDE_MS);
    return () => clearTimeout(t);
  }, [index, playing]);

  const locate = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setGeo({ status: "error", message: "Your browser can't share a location — pick the store you know best." });
      return;
    }
    setGeo({ status: "locating" });
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const here = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        const distances: Record<string, number> = {};
        for (const s of stores) distances[s.id] = haversineKm(here, { lat: s.lat, lng: s.lng });
        const nearestId = Object.entries(distances).sort((a, b) => a[1] - b[1])[0][0];
        setGeo({ status: "done", distances, nearestId });
      },
      () => setGeo({ status: "error", message: "We couldn't get your location. You can still choose any store." }),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 5 * 60 * 1000 },
    );
  }, [stores]);

  const slide = SLIDES[index];

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Robakeye stores"
      className="relative isolate flex min-h-[calc(100svh-6.5rem)] w-full flex-col overflow-hidden bg-rk-navy"
      onMouseEnter={() => setHoverPaused(true)}
      onMouseLeave={() => setHoverPaused(false)}
      onFocusCapture={() => setHoverPaused(true)}
      onBlurCapture={() => setHoverPaused(false)}
    >
      {/* Slides */}
      {SLIDES.map((s, i) => (
        <div
          key={s.key}
          role="group"
          aria-roledescription="slide"
          aria-label={`${i + 1} of ${SLIDES.length}: ${s.label}`}
          aria-hidden={i !== index}
          className={`absolute inset-0 -z-20 transition-opacity duration-[1200ms] ease-out ${i === index ? "opacity-100" : "opacity-0"}`}
        >
          <Image
            src={s.image}
            alt=""
            fill
            priority={i === 0}
            sizes="100vw"
            className={`object-cover ${s.position} ${!reducedMotion && i === index ? "animate-[rk-kenburns_9s_ease-out_forwards]" : ""}`}
          />
        </div>
      ))}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(20,22,90,0.55)_0%,rgba(20,22,90,0.45)_35%,rgba(20,22,90,0.88)_100%)]"
      />

      {/* Caption + store picker */}
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center px-4 pt-10 pb-24 sm:px-8 sm:pt-12">
        <p className="mx-auto mb-4 inline-flex items-center gap-2 rounded-rk-pill bg-white/12 px-3.5 py-1.5 text-xs font-semibold tracking-wide text-white ring-1 ring-white/25 backdrop-blur">
          <span className="size-1.5 rounded-full bg-rk-amber" aria-hidden />
          Pharmacy · Supermart · Vet clinic — Ibadan
        </p>
        <h1 className="mx-auto max-w-3xl text-center font-display text-[2.1rem] leading-[1.1] font-extrabold tracking-tight text-white text-balance drop-shadow-[0_2px_12px_rgba(0,0,0,0.35)] sm:text-5xl lg:text-6xl [@media(max-height:820px)]:lg:text-5xl">
          Where would you like to shop today?
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-center text-base text-white/85 text-pretty sm:text-lg">
          Pick a store to start. Each Robakeye location has its own shelves, prices and delivery area.
        </p>

        <ul className="mx-auto mt-8 grid w-full max-w-5xl gap-4 sm:grid-cols-3">
          {stores.map((store) => {
            const distance = geo.status === "done" ? geo.distances[store.id] : null;
            const isNearest = geo.status === "done" && geo.nearestId === store.id;
            const isFlagship = store.services.length === 3;
            const isLast = lastStore?.id === store.id;
            return (
              <li key={store.id}>
                <Link
                  href={storePath(store.slug)}
                  className={`group flex h-full flex-col rounded-rk-lg bg-white/95 p-5 shadow-[0_18px_40px_-18px_rgba(0,0,0,0.55)] ring-2 transition-[transform,box-shadow,ring-color] duration-200 hover:-translate-y-1 hover:bg-white hover:shadow-[0_28px_50px_-20px_rgba(0,0,0,0.6)] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-rk-amber motion-reduce:transition-none motion-reduce:hover:translate-y-0 ${isNearest ? "ring-rk-amber" : "ring-transparent"}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="grid size-9 place-items-center rounded-full bg-rk-amber-tint text-rk-amber-deep">
                        <MapPin className="size-[1.1rem]" aria-hidden />
                      </span>
                      <span>
                        <span className="block font-display text-xl leading-tight font-bold text-rk-navy">
                          {storeShortName(store.name)}
                        </span>
                        <span className="block text-xs text-rk-n600">{store.name}</span>
                      </span>
                    </div>
                    <span className="flex flex-col items-end gap-1">
                      {isNearest && (
                        <span className="rounded-rk-pill bg-rk-amber px-2 py-0.5 text-[0.68rem] font-bold text-rk-navy">Nearest</span>
                      )}
                      {isFlagship && (
                        <span className="rounded-rk-pill bg-rk-navy px-2 py-0.5 text-[0.68rem] font-bold text-white">Flagship</span>
                      )}
                      {isLast && !isNearest && (
                        <span className="rounded-rk-pill bg-rk-lavender-mist px-2 py-0.5 text-[0.68rem] font-semibold text-rk-lavender-deep">
                          Last visited
                        </span>
                      )}
                    </span>
                  </div>

                  <p className="mt-2.5 line-clamp-2 text-sm text-rk-n600">{store.address}</p>

                  <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Departments">
                    {(["SUPERMARKET", "PHARMACY", "VETERINARY"] as const)
                      .filter((v) => store.services.includes(v))
                      .map((v) => {
                        const { icon: Icon, label } = DEPT_ICON[v];
                        return (
                          <li
                            key={v}
                            className="inline-flex items-center gap-1 rounded-rk-pill bg-rk-navy-tint px-2.5 py-1 text-xs font-semibold text-rk-navy"
                          >
                            <Icon className="size-3.5" aria-hidden />
                            {label}
                          </li>
                        );
                      })}
                  </ul>

                  <div className="mt-auto flex items-center justify-between gap-2 pt-4">
                    <span className="flex items-center gap-1.5 text-xs text-rk-n600">
                      <Truck className="size-3.5" aria-hidden />
                      {distance !== null && distance !== undefined
                        ? `${distance.toFixed(1)} km from you`
                        : store.deliveryKm
                          ? `Delivers within ${store.deliveryKm} km`
                          : "Pickup available"}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-rk-pill bg-rk-amber px-3.5 py-2 text-sm font-semibold text-rk-navy transition-colors group-hover:bg-[#D97F18]">
                      Shop
                      <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" aria-hidden />
                    </span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="mt-5 flex min-h-6 flex-wrap items-center justify-center gap-2 text-center text-sm text-white/85" aria-live="polite">
          {geo.status === "error" ? (
            <span>{geo.message}</span>
          ) : geo.status === "done" ? (
            <span>
              Distances are straight-line estimates. Delivery fees are confirmed at checkout.
            </span>
          ) : (
            <button
              type="button"
              onClick={locate}
              disabled={geo.status === "locating"}
              className="inline-flex items-center gap-1.5 rounded-rk-pill px-3 py-1.5 font-semibold text-white underline-offset-4 hover:underline disabled:opacity-70"
            >
              <LocateFixed className="size-4" aria-hidden />
              {geo.status === "locating" ? "Finding your nearest store…" : "Find the store nearest to me"}
            </button>
          )}
        </div>
      </div>

      {/* Slide caption + controls */}
      <div className="absolute inset-x-0 bottom-0 z-10">
        <div className="mx-auto flex max-w-6xl items-end justify-between gap-4 px-4 pb-6 sm:px-8">
          <div className="min-w-0 text-white" aria-live={playing ? "off" : "polite"}>
            <p className="text-xs font-bold tracking-[0.14em] text-rk-amber uppercase">{slide.label}</p>
            <p className="truncate text-sm text-white/85">{slide.caption}</p>
          </div>
          <div className="flex flex-none items-center gap-2">
            {SLIDES.map((s, i) => (
              <button
                key={s.key}
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Show ${s.label}`}
                aria-current={i === index}
                className="group grid h-6 w-9 place-items-center"
              >
                <span className="relative block h-1 w-full overflow-hidden rounded-full bg-white/35">
                  {i === index && (
                    <span
                      key={`${index}-${playing}`}
                      className={`absolute inset-y-0 left-0 rounded-full bg-white ${playing ? "animate-[rk-progress_6s_linear_forwards]" : "w-full"}`}
                    />
                  )}
                </span>
              </button>
            ))}
            {!reducedMotion && (
              <button
                type="button"
                onClick={() => setUserPaused((p) => !p)}
                aria-label={userPaused ? "Play slideshow" : "Pause slideshow"}
                className="ml-1 grid size-8 place-items-center rounded-full bg-white/15 text-white ring-1 ring-white/30 hover:bg-white/25"
              >
                {userPaused ? <Play className="size-3.5" aria-hidden /> : <Pause className="size-3.5" aria-hidden />}
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
