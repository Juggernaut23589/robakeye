// docs/homepage-design-spec.html §06 — four claims, four icons, no imagery.
const CLAIMS = [
  {
    title: "Licensed Pharmacists",
    body: "PCN-registered staff on every shift",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="4" />
        <path d="M12 8v8M8 12h8" />
      </svg>
    ),
  },
  {
    title: "Genuine Medications",
    body: "Sourced from licensed distributors",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="6" y="2" width="12" height="4" rx="1" />
        <path d="M7 6v13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V6" />
        <path d="M12 10v5M9.5 12.5h5" />
      </svg>
    ),
  },
  {
    title: "Fast Prescription Processing",
    body: "Most orders reviewed within the hour",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 3" />
      </svg>
    ),
  },
  {
    title: "Confidential Consultations",
    body: "Your health questions stay private",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 11V8a8 8 0 0 1 16 0v3" />
        <rect x="3" y="11" width="18" height="10" rx="2" />
        <circle cx="12" cy="16" r="1.6" />
      </svg>
    ),
  },
];

export function TrustStrip() {
  return (
    <section className="bg-rk-n50 py-8">
      <div className="mx-auto grid max-w-6xl gap-6 px-4 sm:grid-cols-2 sm:px-8 lg:grid-cols-4">
        {CLAIMS.map((c) => (
          <div key={c.title} className="flex flex-col items-start gap-2">
            <span className="size-7 text-rk-navy [&>svg]:size-7">{c.icon}</span>
            <b className="font-display text-sm text-rk-navy">{c.title}</b>
            <span className="text-xs text-rk-n600">{c.body}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
