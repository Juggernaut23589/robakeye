"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useSession, signOut } from "next-auth/react";
import * as Dialog from "@radix-ui/react-dialog";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { ChevronDown, MapPin, Menu, Search, ShoppingCart, User, X, Check } from "lucide-react";
import { useCartCount } from "@/store/cart";
import { useLocationStore } from "@/store/location";
import { AnnouncementBar } from "@/components/layout/announcement-bar";
import { SearchAutosuggest } from "@/components/layout/search-autosuggest";
import { DEPARTMENTS, storePath, storeShortName } from "@/lib/departments";

export type NavStore = {
  id: string;
  slug: string;
  name: string;
  address: string;
  services: string[];
};

// The store the visitor is inside, read from the URL (/store/<slug>/...).
// Outside a store (landing, cart, account) we fall back to the last store
// they shopped at, purely as a convenience shortcut.
function useCurrentStore(stores: NavStore[]) {
  const pathname = usePathname();
  const remembered = useLocationStore((s) => s.branch);
  const match = pathname.match(/^\/store\/([^/]+)/);
  const inStore = match ? stores.find((s) => s.slug === match[1]) ?? null : null;
  const fallback = remembered ? stores.find((s) => s.id === remembered.id) ?? null : null;
  return { inStore, current: inStore ?? fallback };
}

export function Navbar({ stores }: { stores: NavStore[] }) {
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/85">
      <AnnouncementBar />
      <DesktopNav stores={stores} />
      <MobileNav stores={stores} />
    </header>
  );
}

function Logo() {
  return (
    <Link href="/" className="flex flex-none items-center" aria-label="Robakeye — choose a store">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/robakeye-horizontal-compact.svg" alt="Robakeye" className="h-8 w-auto" />
    </Link>
  );
}

function DesktopNav({ stores }: { stores: NavStore[] }) {
  const { inStore, current } = useCurrentStore(stores);

  return (
    <div className="hidden border-b border-rk-n200 lg:block">
      <nav className="mx-auto flex max-w-7xl items-center gap-5 px-6 py-3">
        <Logo />
        <StoreSwitcher stores={stores} current={current} inStore={!!inStore} />

        <ul className="flex items-center gap-5 text-sm font-semibold text-rk-navy">
          <li>
            <Link href="/locations" className="hover:text-rk-blue">
              Locations
            </Link>
          </li>
          <li>
            <Link href="/pharmacy/consult" className="hover:text-rk-blue">
              Ask a pharmacist
            </Link>
          </li>
          <li>
            <Link href="/veterinary/book" className="hover:text-rk-blue">
              Book a vet
            </Link>
          </li>
        </ul>

        <div className="ml-auto flex items-center gap-3">
          {inStore && <SearchAutosuggest store={inStore} className="w-72" />}
          <CartLink />
          <AccountMenu />
        </div>
      </nav>
    </div>
  );
}

function StoreSwitcher({
  stores,
  current,
  inStore,
  onNavigate,
}: {
  stores: NavStore[];
  current: NavStore | null;
  inStore: boolean;
  onNavigate?: () => void;
}) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        className="flex items-center gap-2 rounded-rk-pill border border-rk-n200 bg-white py-1.5 pr-3 pl-2 text-left text-sm transition-colors hover:border-rk-navy data-[state=open]:border-rk-navy"
        aria-label={current ? `Shopping at ${current.name}. Change store` : "Choose a store"}
      >
        <span className="grid size-7 place-items-center rounded-full bg-rk-amber-tint text-rk-amber-deep">
          <MapPin className="size-4" aria-hidden />
        </span>
        <span className="leading-tight">
          <span className="block text-[0.68rem] font-medium text-rk-n600">
            {current ? (inStore ? "Shopping at" : "Last visited") : "Start here"}
          </span>
          <span className="block font-semibold text-rk-navy">
            {current ? `${storeShortName(current.name)} store` : "Choose a store"}
          </span>
        </span>
        <ChevronDown className="size-4 text-rk-n600" aria-hidden />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="start"
          sideOffset={8}
          className="z-50 w-80 rounded-rk-lg border border-rk-n200 bg-white p-2 shadow-[0_24px_40px_-20px_rgba(27,30,109,0.35)]"
        >
          <DropdownMenu.Label className="px-2.5 pt-1 pb-2 text-xs font-bold tracking-wide text-rk-n600 uppercase">
            Each store has its own shelves &amp; prices
          </DropdownMenu.Label>
          {stores.map((s) => (
            <DropdownMenu.Item key={s.id} asChild>
              <Link
                href={storePath(s.slug)}
                onClick={onNavigate}
                className="flex cursor-pointer items-start gap-3 rounded-rk-md px-2.5 py-2 outline-none data-[highlighted]:bg-rk-navy-tint"
              >
                <MapPin className="mt-0.5 size-4 flex-none text-rk-amber-deep" aria-hidden />
                <span className="flex-1">
                  <span className="flex items-center gap-1.5 text-sm font-semibold text-rk-navy">
                    {s.name}
                    {current?.id === s.id && <Check className="size-3.5 text-rk-success" aria-label="current" />}
                  </span>
                  <span className="block text-xs text-rk-n600">
                    {DEPARTMENTS.filter((d) => s.services.includes(d.vertical))
                      .map((d) => d.label)
                      .join(" · ")}
                  </span>
                </span>
              </Link>
            </DropdownMenu.Item>
          ))}
          <DropdownMenu.Separator className="my-1.5 h-px bg-rk-n200" />
          <DropdownMenu.Item asChild>
            <Link
              href="/"
              onClick={onNavigate}
              className="block cursor-pointer rounded-rk-md px-2.5 py-2 text-sm font-medium text-rk-blue outline-none data-[highlighted]:bg-rk-navy-tint"
            >
              Compare stores on the home page →
            </Link>
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

function CartLink() {
  const count = useCartCount();
  return (
    <Link
      href="/cart"
      aria-label={count > 0 ? `Basket, ${count} item${count === 1 ? "" : "s"}` : "Basket"}
      className="relative grid size-10 flex-none place-items-center rounded-full bg-rk-lavender-mist text-rk-navy transition-colors hover:bg-rk-lavender"
    >
      <ShoppingCart className="size-[1.15rem]" aria-hidden />
      {count > 0 && (
        <b className="absolute -top-1 -right-1 min-w-5 rounded-rk-pill bg-rk-amber px-1 text-center font-mono text-[0.65rem] leading-5 font-bold text-rk-navy">
          {count > 99 ? "99+" : count}
        </b>
      )}
    </Link>
  );
}

function AccountMenu() {
  const { data: session, status } = useSession();

  if (status !== "authenticated") {
    return (
      <div className="flex items-center gap-2 text-sm font-semibold">
        <Link href="/login" className="hidden px-2 text-rk-navy hover:text-rk-blue sm:inline">
          Sign in
        </Link>
        <Link href="/register" className="hidden rounded-rk-pill bg-rk-navy px-4 py-2 text-white hover:bg-[#262A85] sm:inline">
          Register
        </Link>
        <Link href="/login" aria-label="Sign in" className="grid size-10 place-items-center rounded-full bg-rk-lavender-mist text-rk-navy sm:hidden">
          <User className="size-[1.15rem]" aria-hidden />
        </Link>
      </div>
    );
  }

  const itemClass =
    "block cursor-pointer rounded-rk-sm px-3 py-2 text-sm text-rk-navy outline-none data-[highlighted]:bg-rk-navy-tint";

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        aria-label="Account menu"
        className="grid size-10 flex-none place-items-center rounded-full bg-rk-lavender-mist text-rk-navy transition-colors hover:bg-rk-lavender"
      >
        <User className="size-[1.15rem]" aria-hidden />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          className="z-50 min-w-52 rounded-rk-md border border-rk-n200 bg-white p-1.5 shadow-lg"
        >
          <div className="px-3 py-2 text-xs text-rk-n600">
            Signed in as <b className="text-rk-navy">{session.user.name}</b>
          </div>
          <DropdownMenu.Item asChild>
            <Link href="/account" className={itemClass}>
              My orders &amp; account
            </Link>
          </DropdownMenu.Item>
          <DropdownMenu.Item asChild>
            <Link href="/account/prescriptions" className={itemClass}>
              Prescriptions
            </Link>
          </DropdownMenu.Item>
          <DropdownMenu.Item asChild>
            <Link href="/account/security" className={itemClass}>
              Sessions &amp; security
            </Link>
          </DropdownMenu.Item>
          {session.user.kind === "STAFF" && (
            <DropdownMenu.Item asChild>
              <Link href="/dashboard" className={itemClass}>
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

function MobileNav({ stores }: { stores: NavStore[] }) {
  const { inStore, current } = useCurrentStore(stores);
  const [open, setOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <div className="relative border-b border-rk-n200 lg:hidden">
      <div className="flex items-center justify-between gap-2 px-4 py-2.5">
        <Dialog.Root open={open} onOpenChange={setOpen}>
          <Dialog.Trigger aria-label="Open menu" className="grid size-10 place-items-center rounded-full text-rk-navy hover:bg-rk-lavender-mist">
            <Menu className="size-5" aria-hidden />
          </Dialog.Trigger>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 z-40 bg-rk-navy/40 backdrop-blur-[2px]" />
            <Dialog.Content className="fixed inset-y-0 left-0 z-50 flex w-[86vw] max-w-sm flex-col gap-5 overflow-y-auto bg-white p-5 shadow-2xl">
              <div className="flex items-center justify-between">
                <Dialog.Title asChild>
                  <span>
                    <Logo />
                  </span>
                </Dialog.Title>
                <Dialog.Close aria-label="Close menu" className="grid size-9 place-items-center rounded-full text-rk-navy hover:bg-rk-lavender-mist">
                  <X className="size-5" aria-hidden />
                </Dialog.Close>
              </div>
              <Dialog.Description className="sr-only">Site navigation</Dialog.Description>

              <div>
                <p className="mb-2 text-xs font-bold tracking-wide text-rk-n600 uppercase">Choose a store</p>
                <ul className="grid gap-2">
                  {stores.map((s) => (
                    <li key={s.id}>
                      <Link
                        href={storePath(s.slug)}
                        onClick={close}
                        className={`flex items-start gap-3 rounded-rk-md border p-3 ${current?.id === s.id ? "border-rk-navy bg-rk-navy-tint" : "border-rk-n200"}`}
                      >
                        <MapPin className="mt-0.5 size-4 flex-none text-rk-amber-deep" aria-hidden />
                        <span>
                          <span className="block text-sm font-semibold text-rk-navy">{s.name}</span>
                          <span className="block text-xs text-rk-n600">
                            {DEPARTMENTS.filter((d) => s.services.includes(d.vertical))
                              .map((d) => d.label)
                              .join(" · ")}
                          </span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              {inStore && (
                <div>
                  <p className="mb-2 text-xs font-bold tracking-wide text-rk-n600 uppercase">
                    {storeShortName(inStore.name)} departments
                  </p>
                  <ul className="grid gap-1">
                    {DEPARTMENTS.filter((d) => inStore.services.includes(d.vertical)).map((d) => (
                      <li key={d.key}>
                        <Link href={`${storePath(inStore.slug)}/${d.key}`} onClick={close} className="block rounded-rk-sm px-2 py-2 text-sm font-semibold text-rk-navy hover:bg-rk-lavender-mist">
                          {d.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <nav className="grid gap-1 border-t border-rk-n200 pt-4 text-sm font-semibold text-rk-navy">
                <Link href="/locations" onClick={close} className="rounded-rk-sm px-2 py-2 hover:bg-rk-lavender-mist">Locations &amp; delivery areas</Link>
                <Link href="/pharmacy/consult" onClick={close} className="rounded-rk-sm px-2 py-2 hover:bg-rk-lavender-mist">Ask a pharmacist</Link>
                <Link href="/veterinary/book" onClick={close} className="rounded-rk-sm px-2 py-2 hover:bg-rk-lavender-mist">Book a vet visit</Link>
                <Link href="/account" onClick={close} className="rounded-rk-sm px-2 py-2 hover:bg-rk-lavender-mist">My orders</Link>
              </nav>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>

        <Logo />

        <div className="flex items-center gap-1.5">
          {inStore && (
            <button
              aria-label="Search this store"
              aria-expanded={searchOpen}
              onClick={() => setSearchOpen((s) => !s)}
              className="grid size-10 place-items-center rounded-full text-rk-navy hover:bg-rk-lavender-mist"
            >
              <Search className="size-5" aria-hidden />
            </button>
          )}
          <CartLink />
          <AccountMenu />
        </div>
      </div>

      {inStore && (
        <Link
          href={storePath(inStore.slug)}
          className="flex items-center gap-1.5 border-t border-rk-n200 bg-rk-amber-tint/60 px-4 py-1.5 text-xs text-rk-navy"
        >
          <MapPin className="size-3.5 text-rk-amber-deep" aria-hidden />
          Shopping at <b>{inStore.name}</b>
        </Link>
      )}

      {inStore && searchOpen && (
        <div className="absolute inset-x-0 top-full z-30 border-b border-rk-n200 bg-white p-3 shadow-md">
          <SearchAutosuggest store={inStore} className="w-full" autoFocus onNavigate={() => setSearchOpen(false)} />
        </div>
      )}
    </div>
  );
}
