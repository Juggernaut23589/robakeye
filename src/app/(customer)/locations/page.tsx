import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Navigation, Phone, Truck } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getStores } from "@/lib/stores";
import { DEPARTMENTS, storePath } from "@/lib/departments";
import { FREE_DELIVERY_THRESHOLD_KOBO } from "@/lib/constants";
import { formatNaira } from "@/lib/utils";

export const metadata = { title: "Locations & delivery areas" };

export default async function LocationsPage() {
  const [stores, zones] = await Promise.all([
    getStores(),
    prisma.deliveryZone.findMany({ orderBy: { maxKm: "asc" } }),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <h1 className="font-display text-3xl font-bold text-rk-navy">Our stores</h1>
      <p className="mt-2 max-w-2xl text-rk-n600">
        Three Robakeye stores in Ibadan. Each one keeps its own shelves and stock and delivers to homes around it —
        or collect your order in store for free. Delivery is free on orders over {formatNaira(FREE_DELIVERY_THRESHOLD_KOBO)}.
      </p>

      <ul className="mt-8 grid gap-6 lg:grid-cols-3">
        {stores.map((s) => {
          const storeZones = zones.filter((z) => z.branchId === s.id);
          return (
            <li key={s.id} id={s.slug} className="flex scroll-mt-28 flex-col overflow-hidden rounded-rk-lg border border-rk-n200 bg-white">
              {s.coverImage && (
                <div className="relative h-36">
                  <Image src={s.coverImage} alt="" fill sizes="(min-width: 1024px) 33vw, 100vw" className="object-cover" />
                </div>
              )}
              <div className="flex flex-1 flex-col gap-3 p-5">
                <div>
                  <h2 className="font-display text-xl font-bold text-rk-navy">{s.name}</h2>
                  {s.tagline && <p className="text-sm text-rk-n600">{s.tagline}</p>}
                </div>
                <p className="text-sm text-rk-ink">{s.address}</p>
                <ul className="flex flex-wrap gap-1.5">
                  {DEPARTMENTS.filter((d) => s.services.includes(d.vertical)).map((d) => (
                    <li key={d.key} className="rounded-rk-pill bg-rk-navy-tint px-2.5 py-0.5 text-xs font-semibold text-rk-navy">
                      {d.label}
                    </li>
                  ))}
                </ul>
                <div className="rounded-rk-md bg-rk-n50 p-3 text-sm">
                  <p className="flex items-center gap-1.5 font-semibold text-rk-navy">
                    <Truck className="size-4" aria-hidden /> Delivery area
                  </p>
                  {storeZones.length === 0 ? (
                    <p className="mt-1 text-rk-n600">Pickup only for now.</p>
                  ) : (
                    <ul className="mt-1 grid gap-0.5 text-rk-n600">
                      {storeZones.map((z) => (
                        <li key={z.id}>
                          Up to {z.maxKm} km · {formatNaira(z.baseFeeKobo)} + {formatNaira(z.perKmFeeKobo)}/km
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                {s.phone && (
                  <a href={`tel:${s.phone}`} className="flex items-center gap-1.5 text-sm font-semibold text-rk-blue">
                    <Phone className="size-4" aria-hidden /> {s.phone}
                  </a>
                )}
                <div className="mt-auto flex flex-wrap gap-2 pt-2">
                  <Link
                    href={storePath(s.slug)}
                    className="inline-flex items-center gap-1 rounded-rk-pill bg-rk-amber px-4 py-2 text-sm font-semibold text-rk-navy hover:bg-[#D97F18]"
                  >
                    Shop this store <ArrowRight className="size-4" aria-hidden />
                  </Link>
                  <a
                    // Search by street address, not the seeded coordinates — those are
                    // approximate until the business confirms exact pins.
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${s.address}, Nigeria`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-rk-pill px-4 py-2 text-sm font-semibold text-rk-navy ring-1 ring-rk-navy hover:bg-rk-navy-tint"
                  >
                    <Navigation className="size-4" aria-hidden /> Open in Maps
                  </a>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
