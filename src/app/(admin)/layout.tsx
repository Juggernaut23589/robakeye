import { auth } from "@/lib/auth";
import { AdminSidebar } from "@/components/admin/sidebar";

// Shared chrome for every /dashboard, /orders, /products, /prescriptions,
// /appointments, /customers, /staff, /settings route. Route-level access is
// already enforced in src/proxy.ts — this layout only renders the
// role-filtered menu, it doesn't re-check permissions.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const permissions = session?.user.permissions ?? [];
  const staffName = session?.user.name ?? "Staff";

  return (
    <div className="flex min-h-screen bg-rk-n50">
      <AdminSidebar permissions={permissions} staffName={staffName} />
      <div className="flex-1 md:ml-0">{children}</div>
    </div>
  );
}
