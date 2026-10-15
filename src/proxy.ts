import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

// Maps each admin route's top-level segment to the permission key required
// to view it (from the 18-flag matrix seeded in prisma/seed.ts). A missing
// entry falls back to just requiring "dashboard.view" (any staff member).
const ADMIN_PERMISSION_BY_SEGMENT: Record<string, string> = {
  dashboard: "dashboard.view",
  orders: "orders.view",
  products: "products.view",
  staff: "staff.manage",
  prescriptions: "prescriptions.view",
  appointments: "appointments.view",
  customers: "customers.view",
  promotions: "promotions.manage",
  delivery: "delivery.manage",
  settings: "settings.manage",
};
const ADMIN_SEGMENTS = Object.keys(ADMIN_PERMISSION_BY_SEGMENT);

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const topSegment = pathname.split("/")[1];
  const session = req.auth;

  const isAdminRoute = ADMIN_SEGMENTS.includes(topSegment);
  const isAccountRoute = topSegment === "account";

  if (!isAdminRoute && !isAccountRoute) return NextResponse.next();

  if (!session?.user) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isAdminRoute) {
    if (session.user.kind !== "STAFF") {
      return NextResponse.redirect(new URL("/", req.nextUrl.origin));
    }
    // A staff member whose role requires 2FA but hasn't enrolled yet is
    // locked out of every admin page until they do — no bypassing via a
    // direct URL.
    if (session.user.needsTwoFactorSetup && topSegment !== "settings") {
      return NextResponse.redirect(new URL("/settings/security", req.nextUrl.origin));
    }
    // Every staff member must always be able to reach the security page —
    // it's where a role with requires2FA=true but no settings.manage
    // permission (e.g. BRANCH_MANAGER) completes the 2FA enrollment the
    // redirect above just sent them to. Without this exemption that role
    // would bounce straight to /dashboard/forbidden and never be able to
    // set up 2FA at all.
    const isSecurityPage = pathname === "/settings/security";
    const requiredPermission = ADMIN_PERMISSION_BY_SEGMENT[topSegment];
    if (
      !isSecurityPage &&
      requiredPermission &&
      !session.user.permissions.includes(requiredPermission)
    ) {
      return NextResponse.redirect(new URL("/dashboard/forbidden", req.nextUrl.origin));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/orders/:path*",
    "/products/:path*",
    "/staff/:path*",
    "/prescriptions/:path*",
    "/appointments/:path*",
    "/customers/:path*",
    "/promotions/:path*",
    "/delivery/:path*",
    "/settings/:path*",
    "/account/:path*",
  ],
};
