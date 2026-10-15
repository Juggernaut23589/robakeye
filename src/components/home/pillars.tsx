import Link from "next/link";

// docs/homepage-design-spec.html §03 — same three cards, same copy,
// same colour-per-vertical treatment (navy/lavender-mist/amber).
const PILLARS = [
  {
    href: "/pharmacy",
    bg: "bg-rk-navy text-white",
    iconBg: "bg-white/18",
    body: "text-[#C7C9F0]",
    title: "Order Medications",
    description: "OTC and prescription medicines, delivered or ready for pickup.",
    cta: "Shop Pharmacy",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="6" y="2" width="12" height="4" rx="1" />
        <path d="M7 6v13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V6" />
        <path d="M12 10v5M9.5 12.5h5" />
      </svg>
    ),
  },
  {
    href: "/veterinary",
    bg: "bg-rk-lavender-mist text-rk-navy",
    iconBg: "bg-[#DCD4F6] text-rk-lavender-deep",
    body: "text-[#5A5884]",
    title: "Book Vet Visit / Shop Pet Care",
    description: "Checkups, vaccinations, grooming and pet supplies at our flagship clinic.",
    cta: "Visit Veterinary",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 13c-3 0-6 3-6 5.5 0 1.5 1.2 2.5 2.7 2.5 1.2 0 2.1-.6 3.3-.6s2.1.6 3.3.6c1.5 0 2.7-1 2.7-2.5 0-2.5-3-5.5-6-5.5z" />
        <circle cx="5" cy="10.5" r="1.8" />
        <circle cx="9.3" cy="5.5" r="1.8" />
        <circle cx="14.7" cy="5.5" r="1.8" />
        <circle cx="19" cy="10.5" r="1.8" />
      </svg>
    ),
  },
  {
    href: "/supermarket",
    bg: "bg-rk-amber text-rk-navy",
    iconBg: "bg-rk-navy/14",
    body: "text-[#5C3F0E]",
    title: "Shop Groceries & More",
    description: "Fresh produce, household essentials and everyday items.",
    cta: "Shop Supermarket",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 3h3l2.4 11.2a1.5 1.5 0 0 0 1.5 1.2h8.6a1.5 1.5 0 0 0 1.5-1.1L21 7H6" />
        <circle cx="9" cy="20" r="1.4" />
        <circle cx="17" cy="20" r="1.4" />
      </svg>
    ),
  },
];

export function Pillars() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-10 sm:px-8">
      <div className="grid gap-4 sm:grid-cols-3">
        {PILLARS.map((p) => (
          <Link
            key={p.href}
            href={p.href}
            className={`group grid gap-2.5 rounded-rk-lg px-6 py-7 transition-[transform,box-shadow] duration-200 ease-out hover:-translate-y-1.5 hover:shadow-[0_20px_36px_-16px_rgba(27,30,109,0.35)] ${p.bg}`}
          >
            <div className={`grid size-12 place-items-center rounded-rk-md ${p.iconBg}`}>
              <span className="size-6 [&>svg]:size-6">{p.icon}</span>
            </div>
            <h3 className="font-display text-xl font-bold">{p.title}</h3>
            <p className={`text-sm ${p.body}`}>{p.description}</p>
            <span className="mt-1 inline-flex items-center gap-1 text-sm font-semibold">
              {p.cta} →
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
