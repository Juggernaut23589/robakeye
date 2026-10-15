"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Users,
  PillBottle,
  CalendarClock,
  UserCog,
  Settings,
  Menu,
  X,
  Tag,
  Truck,
} from "lucide-react";

type NavItem = { href: string; label: string; icon: typeof LayoutDashboard; permission: string };

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, permission: "dashboard.view" },
  { href: "/orders", label: "Orders", icon: ShoppingCart, permission: "orders.view" },
  { href: "/products", label: "Products", icon: Package, permission: "products.view" },
  { href: "/prescriptions", label: "Prescriptions", icon: PillBottle, permission: "prescriptions.view" },
  { href: "/appointments", label: "Appointments", icon: CalendarClock, permission: "appointments.view" },
  { href: "/customers", label: "Customers", icon: Users, permission: "customers.view" },
  { href: "/promotions", label: "Promotions", icon: Tag, permission: "promotions.manage" },
  { href: "/delivery", label: "Delivery", icon: Truck, permission: "delivery.manage" },
  { href: "/staff", label: "Staff", icon: UserCog, permission: "staff.manage" },
  { href: "/settings", label: "Settings", icon: Settings, permission: "settings.manage" },
];

export function AdminSidebar({ permissions, staffName }: { permissions: string[]; staffName: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const items = NAV_ITEMS.filter((item) => permissions.includes(item.permission));

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed left-4 top-4 z-40 rounded-rk-sm bg-rk-navy p-2 text-white md:hidden"
        aria-label="Open menu"
      >
        <Menu size={20} />
      </button>

      {open && (
        <div className="fixed inset-0 z-40 bg-black/40 md:hidden" onClick={() => setOpen(false)} />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-rk-navy text-white transition-transform md:static md:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between p-5">
          <span className="font-display text-lg font-bold">Robakeye Admin</span>
          <button onClick={() => setOpen(false)} className="md:hidden" aria-label="Close menu">
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3">
          {items.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`mb-1 flex items-center gap-3 rounded-rk-sm px-3 py-2.5 text-sm font-medium transition-colors ${
                  active ? "bg-white/15 text-white" : "text-white/70 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-white/10 p-4 text-xs text-white/60">Signed in as {staffName}</div>
      </aside>
    </>
  );
}
