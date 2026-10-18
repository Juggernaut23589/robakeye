import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Clock, FileText, MapPin, MessageCircle, PackageCheck, Stethoscope, Truck } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getStoreBySlug } from "@/lib/stores";
import { getDepartmentShelves, getFeaturedCombo } from "@/lib/catalogue";
import { DEPARTMENTS, departmentByVertical, departmentPath, storeShortName } from "@/lib/departments";
import { FREE_DELIVERY_THRESHOLD_KOBO } from "@/lib/constants";
import { formatNaira } from "@/lib/utils";
import { ProductShelf } from "@/components/store/product-shelf";
import { StoreDealBanner } from "@/components/store/store-deal-banner";

export default async function StoreHomePage({ params }: PageProps<"/store/[store]">) {
  const store = await getStoreBySlug((await params).store);
  if (!store) notFound();

  const verticals = DEPARTMENTS.filter((d) => store.services.includes(d.vertical)).map((d) => d.vertical);
  const [shelves, combo, vetServices] = await Promise.all([
    getDepartmentShelves(store.id, verticals),
    getFeaturedCombo(store.id),
    store.services.includes("VETERINARY")
      ? prisma.vetService.findMany({ where: { isActive: true }, orderBy: { priceKobo: "asc" }, take: 4 })
      : Promise.resolve([]),
  ]);
  const totals = new Map(shelves.map((s) => [s.vertical, s.total]));
  const deliveryKm = store.deliveryZones.length ? Math.max(...store.deliveryZones.map((z) => z.maxKm)) : null;
  const cardStore = { id: store.id, slug: store.slug, name: store.name };
  const short = storeShortName(store.name);

  return (
    <div className="flex flex-col gap-12 pb-16">
      {/* Store header */}
      <section className="relative isolate overflow-hidden bg-rk-navy text-white">
        {store.coverImage && (
          <Image src={store.coverImage} alt="" fill priority sizes="100vw" className="-z-20 object-cover opacity-90" />
        )}
        <div aria-hidden className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(20,22,90,0.95)_0%,rgba(20,22,90,0.82)_45%,rgba(20,22,90,0.45)_100%)]" />
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-10 sm:px-6 sm:py-14">
          <p className="text-xs font-bold tracking-[0.14em] text-rk-amber uppercase">You&apos;re shopping at</p>
          <div>
            <h1 className="font-display text-3xl font-extrabold tracking-tight sm:text-5xl">{store.name}</h1>
            {store.tagline && <p className="mt-2 max-w-xl text-white/85 sm:text-lg">{store.tagline}</p>}
          </div>
          <p className="flex max-w-xl items-start gap-2 text-sm text-white/80">
            <MapPin className="mt-0.5 size-4 flex-none text-rk-amber" aria-hidden />
            {store.address}
          </p>
          <ul className="flex flex-wrap gap-2 text-xs font-semibold">
            {deliveryKm && (
              <li className="flex items-center gap-1.5 rounded-rk-pill bg-white/12 px-3 py-1.5 ring-1 ring-white/20">
                <Truck className="size-3.5" aria-hidden /> Delivers within {deliveryKm} km
              </li>
            )}
            <li className="flex items-center gap-1.5 rounded-rk-pill bg-white/12 px-3 py-1.5 ring-1 ring-white/20">
              <PackageCheck className="size-3.5" aria-hidden /> Free delivery over {formatNaira(FREE_DELIVERY_THRESHOLD_KOBO)}
            </li>
            <li className="flex items-center gap-1.5 rounded-rk-pill bg-white/12 px-3 py-1.5 ring-1 ring-white/20">
              <Clock className="size-3.5" aria-hidden /> Free in-store pickup
            </li>
          </ul>
        </div>
      </section>

      {/* Departments */}
      <section className="mx-auto w-full max-w-7xl px-4 sm:px-6">
        <h2 className="mb-4 font-display text-xl font-bold text-rk-navy sm:text-2xl">Shop by department</h2>
        <ul className={`grid gap-4 ${verticals.length === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
          {DEPARTMENTS.filter((d) => store.services.includes(d.vertical)).map((d) => (
            <li key={d.key}>
              <Link
                href={departmentPath(store.slug, d.vertical)}
                className="group relative isolate flex h-44 flex-col justify-end overflow-hidden rounded-rk-lg p-5 text-white sm:h-52"
              >
                <Image
                  src={d.image}
                  alt=""
                  fill
                  sizes="(min-width: 640px) 33vw, 100vw"
                  className="-z-20 object-cover transition-transform duration-500 group-hover:scale-105 motion-reduce:transition-none"
                />
                <span aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-t from-rk-navy/90 via-rk-navy/40 to-transparent" />
                <span className="font-display text-xl font-bold">{d.label}</span>
                <span className="text-sm text-white/85">{d.blurb}</span>
                <span className="mt-2 flex items-center gap-1 text-sm font-semibold text-rk-amber">
                  {totals.get(d.vertical) ?? 0} products
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {combo && combo.products.length > 1 && (
        <StoreDealBanner
          store={cardStore}
          products={combo.products}
          deal={{
            name: combo.deal.name,
            bannerHeadline: combo.deal.bannerHeadline,
            endsAt: combo.deal.endsAt.toISOString(),
            discountType: combo.deal.discountType,
            valueKobo: combo.deal.valueKobo,
            percentOff: combo.deal.percentOff,
          }}
        />
      )}

      {shelves.map((shelf) => {
        const dept = departmentByVertical(shelf.vertical)!;
        return (
          <ProductShelf
            key={shelf.vertical}
            title={`${dept.label} at ${short}`}
            subtitle={dept.blurb}
            href={departmentPath(store.slug, shelf.vertical)}
            total={shelf.total}
            products={shelf.items}
            store={cardStore}
          />
        );
      })}

      {/* Services this store offers */}
      <section className="mx-auto grid w-full max-w-7xl gap-4 px-4 sm:px-6 md:grid-cols-2">
        {store.services.includes("PHARMACY") && (
          <div className="flex flex-col gap-3 rounded-rk-lg border border-rk-n200 bg-white p-6">
            <span className="grid size-10 place-items-center rounded-full bg-rk-blue-tint text-rk-blue">
              <FileText className="size-5" aria-hidden />
            </span>
            <h2 className="font-display text-lg font-bold text-rk-navy">Prescription medicines at {short}</h2>
            <p className="text-sm text-rk-n600">
              Open a prescription-only medicine, upload your prescription, and {short}&apos;s pharmacist reviews it
              before you can order. Controlled medicines are only dispensed in store.
            </p>
            <div className="mt-auto flex flex-wrap gap-2">
              <Link href={departmentPath(store.slug, "PHARMACY")} className="rounded-rk-pill bg-rk-navy px-4 py-2 text-sm font-semibold text-white hover:bg-[#262A85]">
                Browse the pharmacy
              </Link>
              <Link href="/pharmacy/consult" className="flex items-center gap-1.5 rounded-rk-pill px-4 py-2 text-sm font-semibold text-rk-navy ring-1 ring-rk-navy hover:bg-rk-navy-tint">
                <MessageCircle className="size-4" aria-hidden /> Ask a pharmacist
              </Link>
            </div>
          </div>
        )}
        {store.services.includes("VETERINARY") && (
          <div className="flex flex-col gap-3 rounded-rk-lg border border-rk-n200 bg-white p-6">
            <span className="grid size-10 place-items-center rounded-full bg-rk-lavender-mist text-rk-lavender-deep">
              <Stethoscope className="size-5" aria-hidden />
            </span>
            <h2 className="font-display text-lg font-bold text-rk-navy">Vet clinic at {short}</h2>
            {vetServices.length > 0 ? (
              <ul className="grid gap-1.5 text-sm">
                {vetServices.map((s) => (
                  <li key={s.id} className="flex justify-between gap-3 border-b border-dashed border-rk-n200 pb-1.5 last:border-0">
                    <span className="text-rk-ink">
                      {s.name} <span className="text-rk-n600">· {s.durationMinutes} min</span>
                    </span>
                    <span className="font-mono text-rk-navy">from {formatNaira(s.priceKobo)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-rk-n600">Check-ups, vaccinations, grooming and more.</p>
            )}
            <div className="mt-auto">
              <Link href="/veterinary/book" className="inline-flex rounded-rk-pill bg-rk-amber px-4 py-2 text-sm font-semibold text-rk-navy hover:bg-[#D97F18]">
                Book a vet visit
              </Link>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
