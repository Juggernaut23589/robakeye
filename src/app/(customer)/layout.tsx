import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { CartSync } from "@/components/layout/cart-sync";
import { getStores } from "@/lib/stores";

// Forced dynamic so `next build` never needs a live database just to
// prerender the shell; revisit with `revalidate` once caching is worth it.
export const dynamic = "force-dynamic";

export default async function CustomerLayout({ children }: { children: React.ReactNode }) {
  const stores = await getStores();

  return (
    <>
      <CartSync />
      <Navbar stores={stores.map((s) => ({ id: s.id, slug: s.slug, name: s.name, address: s.address, services: s.services }))} />
      <main className="flex-1">{children}</main>
      <Footer branches={stores.map((s) => ({ id: s.id, slug: s.slug, name: s.name, phone: s.phone, address: s.address }))} />
    </>
  );
}
