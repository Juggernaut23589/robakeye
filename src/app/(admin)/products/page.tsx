import Link from "next/link";
import { listProductsForAdmin } from "@/actions/products-admin";
import { formatNaira } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BulkUpload } from "@/components/admin/bulk-upload";

export default async function ProductsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const products = await listProductsForAdmin(q);

  return (
    <main className="p-8">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-rk-navy">Products</h1>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/products/categories">Categories</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/products/new">+ New product</Link>
          </Button>
        </div>
      </div>

      <form className="mb-4" action="/products">
        <input
          name="q"
          defaultValue={q ?? ""}
          placeholder="Search by name or SKU"
          className="w-64 rounded-rk-sm border border-rk-n200 px-3 py-2 text-sm"
        />
      </form>

      <div className="mb-6 overflow-x-auto rounded-rk-md border border-rk-n200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-rk-n50 text-xs text-rk-n600">
            <tr>
              <th className="p-3">Name</th>
              <th className="p-3">SKU</th>
              <th className="p-3">Category</th>
              <th className="p-3">Class</th>
              <th className="p-3">Price</th>
              <th className="p-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-rk-n200">
            {products.map((p) => (
              <tr key={p.id}>
                <td className="p-3">
                  <Link href={`/products/${p.id}`} className="text-rk-blue underline">
                    {p.name}
                  </Link>
                </td>
                <td className="p-3 font-mono text-xs">{p.sku}</td>
                <td className="p-3">{p.category.name}</td>
                <td className="p-3">{p.class}</td>
                <td className="p-3 font-mono">{formatNaira(p.priceKobo)}</td>
                <td className="p-3">
                  <Badge variant={p.isActive ? "success" : "neutral"}>{p.isActive ? "Active" : "Inactive"}</Badge>
                </td>
              </tr>
            ))}
            {products.length === 0 && (
              <tr>
                <td colSpan={6} className="p-6 text-center text-rk-n600">
                  No products found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <BulkUpload />
    </main>
  );
}
