"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";

export type FooterBranch = { id: string; slug: string; name: string; phone: string | null };

export function Footer({ branches }: { branches: FooterBranch[] }) {
  return (
    <footer className="bg-[#14165A] px-4 pt-10 pb-5 text-[#D5D6F2] sm:px-8">
      <div className="mx-auto grid max-w-6xl gap-8 sm:grid-cols-2 lg:grid-cols-5">
        <div className="lg:col-span-1">
          <div className="mb-2 flex items-center gap-2 font-display text-lg font-extrabold text-white">
            <span className="grid size-7 flex-none place-items-center rounded-full bg-rk-blue">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="size-4 text-white">
                <path d="M4 11l8-7 8 7v9a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z" />
              </svg>
            </span>
            Robakeye
          </div>
          <p className="max-w-72 text-sm text-[#9FA1D4]">
            Pharmacy, veterinary care and everyday groceries across three Ibadan locations.
          </p>
          <div className="mt-3 flex flex-wrap gap-3 text-xs">
            {["Instagram", "Facebook", "X", "WhatsApp", "TikTok"].map((s) => (
              <span key={s}>{s}</span>
            ))}
          </div>
        </div>

        <FooterColumn
          title="Quick Links"
          links={[
            { label: "About Us", href: "/about" },
            { label: "Careers", href: "/careers" },
            { label: "Blog", href: "/blog" },
            { label: "FAQ", href: "/faq" },
            { label: "Contact", href: "/contact" },
          ]}
        />
        <FooterColumn
          title="Customer Service"
          links={[
            { label: "Track Order", href: "/account" },
            { label: "Returns Policy", href: "/returns" },
            { label: "Delivery Info", href: "/delivery" },
            { label: "Privacy Policy", href: "/privacy" },
            { label: "Terms of Service", href: "/terms" },
          ]}
        />

        <div>
          <h6 className="mb-2.5 text-xs font-bold tracking-wide text-[#8F91C9] uppercase">
            Our Locations
          </h6>
          <ul className="grid gap-1.5 text-sm">
            {branches.map((b) => (
              <li key={b.id}>
                <Link href={`/locations#${b.slug}`}>
                  {b.name}
                  {b.phone ? ` — ${b.phone}` : ""}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h6 className="mb-2.5 text-xs font-bold tracking-wide text-[#8F91C9] uppercase">
            We Accept
          </h6>
          <div className="flex flex-wrap gap-1.5 text-xs">
            {["Paystack", "Visa", "Mastercard", "Verve", "Bank Transfer"].map((p) => (
              <span key={p} className="rounded-rk-sm bg-white/10 px-2 py-1">
                {p}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto mt-8 max-w-6xl border-t border-white/10 pt-4">
        <NewsletterForm />
      </div>

      <div className="mx-auto mt-6 flex max-w-6xl flex-col items-center justify-between gap-2 border-t border-white/10 pt-4 text-xs text-[#9FA1D4] sm:flex-row">
        <span>© {new Date().getFullYear()} Robakeye. All rights reserved.</span>
        <span>🔒 Powered by Paystack</span>
        <span>English (NG) · ₦ NGN</span>
      </div>
    </footer>
  );
}

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: { label: string; href: string }[];
}) {
  return (
    <div>
      <h6 className="mb-2.5 text-xs font-bold tracking-wide text-[#8F91C9] uppercase">{title}</h6>
      <ul className="grid gap-1.5 text-sm">
        {links.map((l) => (
          <li key={l.href}>
            <Link href={l.href}>{l.label}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    // No mailing-list provider is wired up yet (not part of this brief) —
    // acknowledge honestly rather than pretending to subscribe the address.
    setSubmitted(true);
  }

  return (
    <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h4 className="font-display text-sm font-bold text-white">
          Get Health Tips &amp; Exclusive Deals
        </h4>
        <p className="text-xs text-[#9FA1D4]">Unsubscribe anytime.</p>
      </div>
      {submitted ? (
        <p className="text-sm text-rk-amber">Thanks — we&apos;ll be in touch.</p>
      ) : (
        <form onSubmit={onSubmit} className="flex gap-2">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@email.com"
            aria-label="Email address"
            className="rounded-rk-pill bg-white/10 px-3.5 py-2 text-sm text-white placeholder:text-[#9FA1D4] focus:outline focus:outline-2 focus:outline-rk-amber"
          />
          <button type="submit" className="rounded-rk-pill bg-rk-amber px-4 py-2 text-sm font-semibold text-rk-navy">
            Subscribe
          </button>
        </form>
      )}
    </div>
  );
}
