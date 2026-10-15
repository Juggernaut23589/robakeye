import Link from "next/link";
import { Button } from "@/components/ui/button";

// docs/homepage-design-spec.html §06 vet grid. None of this is backed by a
// real service/pricing catalogue yet (that's Milestone 9's vet booking
// system) — every price here is a placeholder, flagged as such, not real
// data presented as real.
const SERVICES = [
  {
    title: "Vaccination",
    body: "Core & booster shots for dogs and cats",
    priceLabel: "From ₦6,500",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 20.5C6 16.6 3 13.5 3 9.7a4.6 4.6 0 0 1 9-1.4 4.6 4.6 0 0 1 9 1.4c0 3.8-3 6.9-9 10.8z" />
      </svg>
    ),
  },
  {
    title: "General Checkup",
    body: "Full physical exam and health review",
    priceLabel: "From ₦5,000",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 3v5a4 4 0 0 0 8 0V3" />
        <path d="M9 12v3a5 5 0 0 0 10 0v-2" />
        <circle cx="19" cy="11" r="2" />
      </svg>
    ),
  },
  {
    title: "Grooming",
    body: "Bath, trim and nail care",
    priceLabel: "From ₦4,000",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M12 2v3M12 19v3M22 12h-3M5 12H2M18.4 5.6l-2 2M7.6 16.4l-2 2M18.4 18.4l-2-2M7.6 7.6l-2-2" />
      </svg>
    ),
  },
  {
    title: "Surgery",
    body: "Routine and soft-tissue procedures",
    priceLabel: "From ₦25,000",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.5 3.5a4.95 4.95 0 0 1 7 7l-7 7a4.95 4.95 0 0 1-7-7z" />
      </svg>
    ),
  },
];

export function VetServices() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-10 sm:px-8">
      <div className="mb-5 flex items-baseline justify-between">
        <h2 className="font-display text-2xl font-bold text-rk-navy">Veterinary Services</h2>
        <span className="text-xs text-rk-n400">
          Pricing shown is a placeholder pending Milestone 9&apos;s service catalogue
        </span>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {SERVICES.map((s) => (
          <div key={s.title} className="flex flex-col gap-2.5 rounded-rk-md border border-rk-n200 p-4">
            <span className="grid size-10 place-items-center rounded-rk-md bg-rk-lavender-mist text-rk-lavender-deep [&>svg]:size-5">
              {s.icon}
            </span>
            <b className="font-display text-sm text-rk-navy">{s.title}</b>
            <span className="text-xs text-rk-n600">{s.body}</span>
            <span className="font-mono text-sm font-bold text-rk-navy">{s.priceLabel}</span>
            <Button asChild size="sm">
              <Link href="/veterinary/book">Book Now</Link>
            </Button>
          </div>
        ))}

        <div className="flex flex-col gap-2.5 rounded-rk-md border border-rk-alert p-4">
          <span className="grid size-10 place-items-center rounded-rk-md bg-rk-alert-tint text-rk-alert [&>svg]:size-5">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M13 2 4 14h6l-1 8 10-13h-6z" />
            </svg>
          </span>
          <b className="font-display text-sm text-rk-navy">Emergency Care</b>
          <span className="text-xs text-rk-n600">Flagship branch, call ahead</span>
          <span className="font-mono text-sm font-bold text-rk-alert">Call now</span>
          <Button asChild size="sm" className="bg-rk-alert hover:bg-rk-alert">
            <Link href="/locations#sheu">Call Branch</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
