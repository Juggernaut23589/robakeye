import Link from "next/link";
import { listCategories } from "@/actions/products-admin";
import { CategoryForm } from "@/components/admin/category-form";

export default async function CategoriesPage() {
  const categories = await listCategories();

  return (
    <main className="p-8">
      <Link href="/products" className="text-sm text-rk-blue underline">
        ← Back to products
      </Link>
      <h1 className="mb-4 mt-2 font-display text-2xl font-bold text-rk-navy">Categories</h1>

      <div className="mb-6 grid gap-2">
        {categories.map((c) => (
          <div key={c.id} className="flex items-center justify-between rounded-rk-sm border border-rk-n200 bg-white p-3 text-sm">
            <span>
              {c.parentId && "— "}
              {c.name} <span className="text-rk-n600">({c.vertical})</span>
            </span>
            <span className="font-mono text-xs text-rk-n600">{c.slug}</span>
          </div>
        ))}
      </div>

      <CategoryForm parents={categories.filter((c) => !c.parentId)} />
    </main>
  );
}
