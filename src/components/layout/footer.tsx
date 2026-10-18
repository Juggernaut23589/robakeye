"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";

export type FooterBranch = { id: string; slug: string; name: string; phone: string | null; address: string };

export function Footer({ branches }: { branches: FooterBranch[] }) {
  return (
    <footer className="bg-[#14165A] px-4 pt-10 pb-5 text-[#D5D6F2] sm:px-8">
      <div className="mx-auto grid max-w-6xl gap-8 sm:grid-cols-2 lg:grid-cols-5">
        <div className="lg:col-span-1">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/robakeye-horizontal-compact-reverse.svg" alt="Robakeye" className="mb-2 h-7 w-auto" />
          <p className="max-w-72 text-sm text-[#9FA1D4]">
            Pharmacy, veterinary care and everyday groceries across three Ibadan locations.
          </p>
        </div>

        <FooterColumn
          title="Shop a store"
          links={branches.map((b) => ({ label: b.name, href: `/store/${b.slug}` }))}
        />
        <FooterColumn
          title="Help"
          links={[
            { label: "Track an order", href: "/account" },
            { label: "Delivery areas", href: "/locations" },
            { label: "Ask a pharmacist", href: "/pharmacy/consult" },
            { label: "Upload a prescription", href: "/account/prescriptions" },
            { label: "Book a vet visit", href: "/veterinary/book" },
          ]}
        />

        <div>
          <h6 className="mb-2.5 text-xs font-bold tracking-wide text-[#8F91C9] uppercase">
            Our Locations
          </h6>
          <ul className="grid gap-2.5 text-sm">
            {branches.map((b) => (
              <li key={b.id}>
                <Link href={`/locations#${b.slug}`} className="font-semibold text-white hover:text-rk-amber">
                  {b.name}
                </Link>
                <span className="block text-xs text-[#9FA1D4]">{b.address}</span>
                {b.phone && <span className="block text-xs">{b.phone}</span>}
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
            <Link href={l.href} className="hover:text-rk-amber">
              {l.label}
            </Link>
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
