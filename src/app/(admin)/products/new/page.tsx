import { listBranches, listCategories } from "@/actions/products-admin";
import { ProductForm } from "@/components/admin/product-form";

export default async function NewProductPage() {
  const [categories, branches] = await Promise.all([listCategories(), listBranches()]);

  return (
    <main className="p-8">
      <h1 className="mb-4 font-display text-2xl font-bold text-rk-navy">New product</h1>
      {branches.length === 0 ? (
        <p className="text-sm text-rk-n600">You aren&apos;t assigned to any store yet, so you can&apos;t add products.</p>
      ) : (
        <ProductForm categories={categories} branches={branches} />
      )}
    </main>
  );
}
