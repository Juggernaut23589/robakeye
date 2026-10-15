// docs/homepage-design-spec.html §07 note: "Names, initials and quotes
// above are fictional samples for layout only — swap in real reviews
// (with consent) before launch, never synthetic ones presented as real."
// Each card carries a visible "sample" tag for the same reason — no
// customer review system exists yet. Milestone 11 turned out to be scoped
// to promotions/delivery/abandoned-cart/polish per the locked brief's own
// title, not Reviews & Social Proof (a separate MVP line item in
// docs/revenue-features-roadmap.html §02) — still pending a future pass.
const TESTIMONIALS = [
  {
    stars: 5,
    quote:
      "The pharmacist called me back within 20 minutes of my upload. Delivery came the same evening.",
    initials: "AO",
    name: "A. Okafor",
    location: "Ologuneru",
  },
  {
    stars: 5,
    quote: "Took my cat for her first checkup at the flagship — calm, clean, friendly staff.",
    initials: "TB",
    name: "T. Balogun",
    location: "Ojoo",
  },
  {
    stars: 4,
    quote: "Groceries arrived fast and the app told me exactly which branch it was coming from.",
    initials: "FA",
    name: "F. Adeyemi",
    location: "Ajadi",
  },
];

export function Testimonials() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-10 sm:px-8">
      <h2 className="mb-5 font-display text-2xl font-bold text-rk-navy">
        Customer testimonials
      </h2>
      <div className="grid gap-4 sm:grid-cols-3">
        {TESTIMONIALS.map((t) => (
          <div key={t.name} className="flex flex-col gap-2.5 rounded-rk-md border border-rk-n200 p-4">
            <span className="text-rk-amber">{"★".repeat(t.stars)}{"☆".repeat(5 - t.stars)}</span>
            <p className="text-sm text-rk-ink">
              &ldquo;{t.quote}&rdquo;{" "}
              <span className="rounded-rk-sm bg-rk-amber-tint px-1.5 py-0.5 font-mono text-[0.6rem] font-bold tracking-wide text-rk-amber-deep uppercase">
                sample
              </span>
            </p>
            <div className="flex items-center gap-2">
              <span className="grid size-8 place-items-center rounded-full bg-rk-navy-tint font-mono text-xs font-bold text-rk-navy">
                {t.initials}
              </span>
              <div className="text-xs">
                <b className="block text-rk-navy">{t.name}</b>
                <span className="text-rk-n600">{t.location}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs text-rk-n400">
        Quotes above are fictional samples for layout only — real customer reviews land with a
        future Reviews &amp; Social Proof feature.
      </p>
    </section>
  );
}
