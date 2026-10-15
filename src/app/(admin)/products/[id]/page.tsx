import { notFound } from "next/navigation";
import { getProductForEdit, listCategories, listBranches } from "@/actions/products-admin";
import { ProductForm } from "@/components/admin/product-form";
import { InventoryEditor } from "@/components/admin/inventory-editor";

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [product, categories, branches] = await Promise.all([
    getProductForEdit(id),
    listCategories(),
    listBranches(),
  ]);
  if (!product) notFound();

  return (
    <main className="p-8">
      <h1 className="mb-4 font-display text-2xl font-bold text-rk-navy">{product.name}</h1>

      <div className="grid gap-6">
        <ProductForm
          categories={categories}
          initial={{
            id: product.id,
            sku: product.sku,
            slug: product.slug,
            name: product.name,
            description: product.description ?? "",
            vertical: product.vertical,
            class: product.class,
            categoryId: product.categoryId,
            priceNaira: product.priceKobo / 100,
            images: product.images,
            isActive: product.isActive,
          }}
        />

        <section className="rounded-rk-md border border-rk-n200 bg-white p-5">
          <h2 className="mb-3 font-semibold text-rk-navy">Branch inventory</h2>
          <InventoryEditor
            productId={product.id}
            branches={branches}
            existing={product.inventory.map((i) => ({
              branchId: i.branchId,
              branchName: i.branch.name,
              quantity: i.quantity,
              lowStockAt: i.lowStockAt,
              expiryDate: i.expiryDate ? i.expiryDate.toISOString() : null,
            }))}
          />
        </section>
      </div>
    </main>
  );
}
