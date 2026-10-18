import { notFound } from "next/navigation";
import { getProductForEdit, listCategories, listBranches } from "@/actions/products-admin";
import { ProductForm } from "@/components/admin/product-form";
import { InventoryEditor } from "@/components/admin/inventory-editor";
import { CopyToStore } from "@/components/admin/copy-to-store";
import { formatNaira } from "@/lib/utils";

export default async function EditProductPage({ params }: PageProps<"/products/[id]">) {
  const { id } = await params;
  const [product, categories, branches] = await Promise.all([getProductForEdit(id), listCategories(), listBranches()]);
  if (!product) notFound();

  const listedAt = new Set([product.branchId, ...product.siblings.map((s) => s.branch.id)]);
  const copyTargets = branches.filter((b) => !listedAt.has(b.id) && b.services.includes(product.vertical));

  return (
    <main className="p-8">
      <p className="text-xs font-bold tracking-wide text-rk-amber-deep uppercase">{product.branch.name}</p>
      <h1 className="mb-4 font-display text-2xl font-bold text-rk-navy">{product.name}</h1>

      <div className="grid gap-6">
        <ProductForm
          categories={categories}
          branches={[product.branch]}
          initial={{
            id: product.id,
            branchId: product.branchId,
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
          <h2 className="mb-1 font-semibold text-rk-navy">Stock at {product.branch.name}</h2>
          <p className="mb-3 text-xs text-rk-n600">
            Raising stock from zero emails everyone who asked to be told when this store has it again.
          </p>
          <InventoryEditor
            productId={product.id}
            initial={{
              stockQuantity: product.stockQuantity,
              lowStockAt: product.lowStockAt,
              expiryDate: product.expiryDate ? product.expiryDate.toISOString() : null,
            }}
          />
        </section>

        <section className="rounded-rk-md border border-rk-n200 bg-white p-5">
          <h2 className="mb-3 font-semibold text-rk-navy">Other stores</h2>
          {product.siblings.length > 0 ? (
            <ul className="mb-4 grid gap-1 text-sm">
              {product.siblings.map((s) => (
                <li key={s.id} className="flex flex-wrap gap-x-4">
                  <a href={`/products/${s.id}`} className="font-semibold text-rk-blue underline">
                    {s.branch.name}
                  </a>
                  <span className="font-mono">{formatNaira(s.priceKobo)}</span>
                  <span>{s.stockQuantity} in stock</span>
                  {!s.isActive && <span className="text-rk-n600">(inactive)</span>}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mb-4 text-sm text-rk-n600">Only {product.branch.name} lists this product.</p>
          )}
          {copyTargets.length > 0 && <CopyToStore productId={product.id} targets={copyTargets} defaultPriceNaira={product.priceKobo / 100} />}
        </section>
      </div>
    </main>
  );
}
