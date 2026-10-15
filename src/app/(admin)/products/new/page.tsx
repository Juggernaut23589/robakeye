import { listCategories } from "@/actions/products-admin";
import { ProductForm } from "@/components/admin/product-form";

export default async function NewProductPage() {
  const categories = await listCategories();

  return (
    <main className="p-8">
      <h1 className="mb-4 font-display text-2xl font-bold text-rk-navy">New product</h1>
      <ProductForm categories={categories} />
    </main>
  );
}
