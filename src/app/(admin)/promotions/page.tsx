import { auth } from "@/lib/auth";
import { listPromotions, listComboDeals } from "@/actions/promotions-admin";
import { listBranches } from "@/actions/products-admin";
import { PromoCodeList } from "@/components/admin/promo-code-list";
import { NewPromoForm } from "@/components/admin/new-promo-form";
import { ComboDealList } from "@/components/admin/combo-deal-list";
import { NewComboForm } from "@/components/admin/new-combo-form";

export default async function PromotionsPage() {
  const [promotions, deals, branches, session] = await Promise.all([
    listPromotions(),
    listComboDeals(),
    listBranches(),
    auth(),
  ]);
  const canTargetAllStores = session?.user?.branchScope === "ALL";

  return (
    <main className="p-8">
      <h1 className="mb-6 font-display text-2xl font-bold text-rk-navy">Promotions</h1>

      <section className="mb-10">
        <h2 className="mb-3 font-semibold text-rk-navy">Promo codes</h2>
        <div className="mb-4">
          <PromoCodeList promotions={promotions} />
        </div>
        <NewPromoForm branches={branches} canTargetAllStores={canTargetAllStores} />
      </section>

      <section>
        <h2 className="mb-1 font-semibold text-rk-navy">Bundle deals</h2>
        <p className="mb-3 text-sm text-rk-n600">
          A bundle belongs to one store and can only combine that store&apos;s products. The featured bundle shows on
          that store&apos;s home page.
        </p>
        <div className="mb-4">
          <ComboDealList deals={deals} />
        </div>
        {branches.length > 0 && <NewComboForm branches={branches} />}
      </section>
    </main>
  );
}
