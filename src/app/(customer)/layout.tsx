import { prisma } from "@/lib/prisma";
import { Navbar, type NavVertical } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { CartSync } from "@/components/layout/cart-sync";

// Branches/categories are admin-managed and change rarely, so this would
// be a good static/ISR candidate later — but forcing it dynamic for now
// means `next build` doesn't need a live database just to prerender the
// shell (relevant before Milestone 1's Supabase account exists, and
// generally safer than coupling the build to DB uptime). Revisit with
// `export const revalidate = <seconds>` once there's a real deployment.
export const dynamic = "force-dynamic";

export default async function CustomerLayout({ children }: { children: React.ReactNode }) {
  const [categories, branches] = await Promise.all([
    prisma.category.findMany({
      where: { parentId: null },
      select: { slug: true, name: true, vertical: true },
      orderBy: { name: "asc" },
    }),
    prisma.branch.findMany({
      select: { id: true, slug: true, name: true, phone: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const base: Pick<NavVertical, "key" | "label" | "href">[] = [
    { key: "pharmacy", label: "Pharmacy", href: "/pharmacy" },
    { key: "veterinary", label: "Veterinary", href: "/veterinary" },
    { key: "supermarket", label: "Supermarket", href: "/supermarket" },
  ];
  const verticals: NavVertical[] = base.map((v) => ({
    ...v,
    categories: categories
      .filter((c) => c.vertical === v.key.toUpperCase())
      .map((c) => ({ slug: c.slug, name: c.name })),
  }));

  return (
    <>
      <CartSync />
      <Navbar verticals={verticals} branches={branches} />
      <main className="flex-1">{children}</main>
      <Footer branches={branches} />
    </>
  );
}
