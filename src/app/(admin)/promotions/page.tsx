import { listPromotions, listComboDeals, listProductsForPicker } from "@/actions/promotions-admin";
import { PromoCodeList } from "@/components/admin/promo-code-list";
import { NewPromoForm } from "@/components/admin/new-promo-form";
import { ComboDealList } from "@/components/admin/combo-deal-list";
import { NewComboForm } from "@/components/admin/new-combo-form";

export default async function PromotionsPage() {
  const [promotions, deals, products] = await Promise.all([
    listPromotions(),
    listComboDeals(),
    listProductsForPicker(),
  ]);
  const productNameById = Object.fromEntries(products.map((p) => [p.id, p.name]));

  return (
    <main className="p-8">
      <h1 className="mb-6 font-display text-2xl font-bold text-rk-navy">Promotions</h1>

      <section className="mb-10">
        <h2 className="mb-3 font-semibold text-rk-navy">Promo codes</h2>
        <div className="mb-4">
          <PromoCodeList promotions={promotions} />
        </div>
        <NewPromoForm />
      </section>

      <section>
        <h2 className="mb-3 font-semibold text-rk-navy">Combo &amp; bundle deals</h2>
        <div className="mb-4">
          <ComboDealList deals={deals} productNameById={productNameById} />
        </div>
        <NewComboForm products={products} />
      </section>
    </main>
  );
}
