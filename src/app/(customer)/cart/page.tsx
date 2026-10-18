import { getStores } from "@/lib/stores";
import { CartPageClient } from "@/components/cart/cart-page-client";

export const metadata = { title: "Your basket" };

export default async function CartPage() {
  const stores = await getStores();
  return <CartPageClient stores={stores.map((s) => ({ slug: s.slug, name: s.name }))} />;
}
