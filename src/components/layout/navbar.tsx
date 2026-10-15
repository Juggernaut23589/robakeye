"use client";

import Link from "next/link";
import { useState, useRef } from "react";
import { useSession, signOut } from "next-auth/react";
import * as Dialog from "@radix-ui/react-dialog";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { useCartCount } from "@/store/cart";
import { useLocationStore, type SelectedBranch } from "@/store/location";
import { AnnouncementBar } from "@/components/layout/announcement-bar";
import { SearchAutosuggest } from "@/components/layout/search-autosuggest";

export type NavCategory = { slug: string; name: string };
export type NavVertical = {
  key: "pharmacy" | "veterinary" | "supermarket";
  label: string;
  href: string;
  categories: NavCategory[];
};

const OPEN_DELAY_MS = 120;
const CLOSE_DELAY_MS = 200;

export function Navbar({
  verticals,
  branches,
}: {
  verticals: NavVertical[];
  branches: SelectedBranch[];
}) {
  return (
    <header className="sticky top-0 z-40 bg-white">
      <AnnouncementBar />
      <DesktopNav verticals={verticals} branches={branches} />
      <MobileNav verticals={verticals} branches={branches} />
    </header>
  );
}

function Logo() {
  return (
    <Link href="/" className="flex flex-none items-center gap-2 font-display text-lg font-extrabold text-rk-navy">
      <span className="grid size-8 flex-none place-items-center rounded-full bg-rk-blue">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="size-4 text-white">
          <path d="M4 11l8-7 8 7v9a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z" />
        </svg>
      </span>
      Robakeye
    </Link>
  );
}

function DesktopNav({
  verticals,
  branches,
}: {
  verticals: NavVertical[];
  branches: SelectedBranch[];
}) {
  const [openKey, setOpenKey] = useState<string | null>(null);
  const openTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function scheduleOpen(key: string) {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    openTimer.current = setTimeout(() => setOpenKey(key), OPEN_DELAY_MS);
  }
  function scheduleClose() {
    if (openTimer.current) clearTimeout(openTimer.current);
    closeTimer.current = setTimeout(() => setOpenKey(null), CLOSE_DELAY_MS);
  }

  return (
    <div className="hidden border-b border-rk-n200 lg:block">
      <nav
        className="relative flex items-center gap-6 px-6 py-3"
        onMouseLeave={scheduleClose}
      >
        <Logo />

        <ul className="flex items-center gap-6 text-sm font-semibold text-rk-navy">
          {verticals.map((v) => (
            <li
              key={v.key}
              onMouseEnter={() => scheduleOpen(v.key)}
              onFocus={() => setOpenKey(v.key)}
            >
              <Link
                href={v.href}
                className={`relative py-1 ${
                  openKey === v.key ? "after:absolute after:inset-x-0 after:-bottom-1 after:h-0.5 after:bg-rk-amber" : ""
                }`}
              >
                {v.label}
              </Link>
            </li>
          ))}
          <li onMouseEnter={() => scheduleOpen("locations")} onFocus={() => setOpenKey("locations")}>
            <Link href="/locations" className="py-1">
              Our Locations
            </Link>
          </li>
        </ul>

        <div className="ml-auto flex items-center gap-4">
          <SearchAutosuggest className="min-w-44" />
          <LocationSelector branches={branches} />
          <CartLink />
          <AccountMenu />
        </div>

        {verticals.map((v) =>
          openKey === v.key ? (
            <MegaPanel key={v.key} onMouseEnter={() => scheduleOpen(v.key)} onMouseLeave={scheduleClose}>
              <div>
                <h5 className="mb-2 text-xs font-bold tracking-wide text-rk-n600 uppercase">
                  Shop by category
                </h5>
                <ul className="grid gap-1.5 text-sm">
                  {v.categories.length === 0 && (
                    <li className="text-rk-n400">Categories coming soon</li>
                  )}
                  {v.categories.map((c) => (
                    <li key={c.slug}>
                      <Link href={`${v.href}?category=${c.slug}`} className="text-rk-navy hover:text-rk-blue">
                        {c.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h5 className="mb-2 text-xs font-bold tracking-wide text-rk-n600 uppercase">Get help</h5>
                <ul className="grid gap-1.5 text-sm">
                  {v.key === "pharmacy" && (
                    <>
                      <li><Link href="/pharmacy/consult" className="text-rk-navy hover:text-rk-blue">Talk to a Pharmacist</Link></li>
                      <li><Link href="/account/prescriptions" className="text-rk-navy hover:text-rk-blue">Upload Prescription</Link></li>
                    </>
                  )}
                  {v.key === "veterinary" && (
                    <li><Link href="/veterinary/book" className="text-rk-navy hover:text-rk-blue">Book a Vet Visit</Link></li>
                  )}
                  {v.key === "supermarket" && (
                    <li><Link href="/supermarket/deals" className="text-rk-navy hover:text-rk-blue">This Week&apos;s Deals</Link></li>
                  )}
                  <li><Link href={v.href} className="text-rk-navy hover:text-rk-blue">Browse all {v.label}</Link></li>
                </ul>
              </div>
            </MegaPanel>
          ) : null,
        )}

        {openKey === "locations" ? (
          <MegaPanel onMouseEnter={() => scheduleOpen("locations")} onMouseLeave={scheduleClose} cols={3}>
            {branches.map((b) => (
              <div key={b.id}>
                <h5 className="mb-2 text-xs font-bold tracking-wide text-rk-n600 uppercase">{b.name}</h5>
                <Link href={`/locations#${b.slug}`} className="text-sm text-rk-navy hover:text-rk-blue">
                  View branch details →
                </Link>
              </div>
            ))}
          </MegaPanel>
        ) : null}
      </nav>
    </div>
  );
}

function MegaPanel({
  children,
  onMouseEnter,
  onMouseLeave,
  cols = 3,
}: {
  children: React.ReactNode;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  cols?: number;
}) {
  return (
    <div
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className="absolute inset-x-6 top-full z-10 grid gap-6 rounded-b-xl border border-t-0 border-rk-n200 bg-white p-6 shadow-[0_24px_40px_-20px_rgba(27,30,109,0.25)]"
      style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
    >
      {children}
    </div>
  );
}

function LocationSelector({ branches }: { branches: SelectedBranch[] }) {
  const { branch, setBranch } = useLocationStore();

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger className="flex items-center gap-1 text-sm font-medium whitespace-nowrap text-rk-navy">
        <span className="text-rk-n600">Delivering to:</span> {branch?.name ?? "Select branch"} ▾
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          className="z-50 min-w-56 rounded-rk-md border border-rk-n200 bg-white p-1.5 shadow-lg"
        >
          {branches.map((b) => (
            <DropdownMenu.Item
              key={b.id}
              onSelect={() => setBranch(b)}
              className="cursor-pointer rounded-rk-sm px-3 py-2 text-sm text-rk-navy outline-none data-[highlighted]:bg-rk-navy-tint"
            >
              {b.name}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

function CartLink() {
  const count = useCartCount();
  return (
    <Link href="/cart" className="relative grid size-9 flex-none place-items-center rounded-full bg-rk-lavender-mist text-rk-navy">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-4.5">
        <path d="M2 3h3l2.4 11.2a1.5 1.5 0 0 0 1.5 1.2h8.6a1.5 1.5 0 0 0 1.5-1.1L21 7H6" />
        <circle cx="9" cy="20" r="1.4" />
        <circle cx="17" cy="20" r="1.4" />
      </svg>
      {count > 0 && (
        <b className="absolute -top-1 -right-1 rounded-rk-pill bg-rk-amber px-1 font-mono text-[0.62rem] font-bold text-rk-navy">
          {count}
        </b>
      )}
    </Link>
  );
}

function AccountMenu() {
  const { data: session, status } = useSession();

  if (status !== "authenticated") {
    return (
      <div className="flex items-center gap-3 text-sm font-semibold">
        <Link href="/login" className="text-rk-navy">
          Sign in
        </Link>
        <Link href="/register" className="rounded-rk-pill bg-rk-navy px-3.5 py-2 text-white">
          Register
        </Link>
      </div>
    );
  }

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger className="grid size-9 flex-none place-items-center rounded-full bg-rk-lavender-mist text-rk-navy">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-4.5">
          <circle cx="12" cy="8" r="3.4" />
          <path d="M5 20c1.2-3.6 4-5.4 7-5.4s5.8 1.8 7 5.4" />
        </svg>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          className="z-50 min-w-48 rounded-rk-md border border-rk-n200 bg-white p-1.5 shadow-lg"
        >
          <div className="px-3 py-2 text-xs text-rk-n600">
            Signed in as <b className="text-rk-navy">{session.user.name}</b>
          </div>
          <DropdownMenu.Item asChild>
            <Link href="/account" className="block cursor-pointer rounded-rk-sm px-3 py-2 text-sm text-rk-navy outline-none data-[highlighted]:bg-rk-navy-tint">
              My account
            </Link>
          </DropdownMenu.Item>
          <DropdownMenu.Item asChild>
            <Link href="/account/security" className="block cursor-pointer rounded-rk-sm px-3 py-2 text-sm text-rk-navy outline-none data-[highlighted]:bg-rk-navy-tint">
              Sessions &amp; security
            </Link>
          </DropdownMenu.Item>
          {session.user.kind === "STAFF" && (
            <DropdownMenu.Item asChild>
              <Link href="/dashboard" className="block cursor-pointer rounded-rk-sm px-3 py-2 text-sm text-rk-navy outline-none data-[highlighted]:bg-rk-navy-tint">
                Staff dashboard
              </Link>
            </DropdownMenu.Item>
          )}
          <DropdownMenu.Separator className="my-1 h-px bg-rk-n200" />
          <DropdownMenu.Item
            onSelect={() => signOut({ callbackUrl: "/" })}
            className="cursor-pointer rounded-rk-sm px-3 py-2 text-sm text-rk-alert outline-none data-[highlighted]:bg-rk-alert-tint"
          >
            Sign out
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

function MobileNav({
  verticals,
  branches,
}: {
  verticals: NavVertical[];
  branches: SelectedBranch[];
}) {
  const [open, setOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <div className="flex items-center justify-between border-b border-rk-n200 px-4 py-3 lg:hidden">
      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Trigger aria-label="Open menu" className="grid size-9 place-items-center text-rk-navy">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="size-5">
            <path d="M3 6h18M3 12h18M3 18h18" />
          </svg>
        </Dialog.Trigger>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40" />
          <Dialog.Content className="fixed inset-y-0 left-0 z-50 flex w-[85vw] max-w-xs flex-col gap-4 overflow-y-auto bg-white p-5">
            <div className="flex items-center justify-between">
              <Dialog.Title asChild>
                <Logo />
              </Dialog.Title>
              <Dialog.Close aria-label="Close menu" className="text-rk-navy">
                ✕
              </Dialog.Close>
            </div>

            <LocationSelector branches={branches} />

            <nav className="flex flex-col divide-y divide-rk-n200">
              {verticals.map((v) => (
                <MobileAccordion key={v.key} label={v.label} href={v.href} categories={v.categories} />
              ))}
              <Link href="/locations" className="py-3 text-sm font-semibold text-rk-navy" onClick={() => setOpen(false)}>
                Our Locations
              </Link>
            </nav>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <Logo />

      <div className="flex items-center gap-2">
        <button aria-label="Search" onClick={() => setSearchOpen((s) => !s)} className="grid size-9 place-items-center text-rk-navy">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-5">
            <circle cx="11" cy="11" r="7" />
            <path d="m21 21-4.3-4.3" />
          </svg>
        </button>
        <CartLink />
        <AccountMenu />
      </div>

      {searchOpen && (
        <div className="absolute inset-x-0 top-full z-30 border-b border-rk-n200 bg-white p-3">
          <SearchAutosuggest className="w-full" autoFocus />
        </div>
      )}
    </div>
  );
}

function MobileAccordion({
  label,
  href,
  categories,
}: {
  label: string;
  href: string;
  categories: NavCategory[];
}) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between py-3 text-sm font-semibold text-rk-navy"
        aria-expanded={open}
      >
        {label}
        <span>{open ? "−" : "+"}</span>
      </button>
      {open && (
        <ul className="grid gap-2 pb-3 pl-2 text-sm text-rk-n600">
          {categories.map((c) => (
            <li key={c.slug}>
              <Link href={`${href}?category=${c.slug}`}>{c.name}</Link>
            </li>
          ))}
          <li>
            <Link href={href} className="font-semibold text-rk-navy">
              Browse all {label}
            </Link>
          </li>
        </ul>
      )}
    </div>
  );
}
