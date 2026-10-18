import Link from "next/link";
import { listProductsForAdmin, listBranches } from "@/actions/products-admin";
import { formatNaira } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BulkUpload } from "@/components/admin/bulk-upload";

export default async function ProductsPage({ searchParams }: PageProps<"/products">) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : undefined;
  const branchId = typeof sp.store === "string" && sp.store ? sp.store : undefined;
  const stock = sp.stock === "low" || sp.stock === "out" ? sp.stock : undefined;
  const [products, branches] = await Promise.all([listProductsForAdmin({ q, branchId, stock }), listBranches()]);

  return (
    <main className="p-8">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-rk-navy">Products</h1>
          <p className="text-sm text-rk-n600">Each store owns its listings — price and stock are set per store.</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/products/categories">Categories</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/products/new">+ New product</Link>
          </Button>
        </div>
      </div>

      <form className="mb-4 flex flex-wrap gap-2" action="/products">
        <input
          name="q"
          defaultValue={q ?? ""}
          placeholder="Search by name or SKU"
          className="w-64 rounded-rk-sm border border-rk-n200 px-3 py-2 text-sm"
        />
        <select name="store" defaultValue={branchId ?? ""} className="rounded-rk-sm border border-rk-n200 px-3 py-2 text-sm" aria-label="Store">
          {branches.length > 1 && <option value="">All my stores</option>}
          {branches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
        <select name="stock" defaultValue={stock ?? ""} className="rounded-rk-sm border border-rk-n200 px-3 py-2 text-sm" aria-label="Stock">
          <option value="">Any stock level</option>
          <option value="low">Low stock</option>
          <option value="out">Out of stock</option>
        </select>
        <Button type="submit" size="sm" variant="outline">
          Filter
        </Button>
      </form>

      <div className="mb-6 overflow-x-auto rounded-rk-md border border-rk-n200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-rk-n50 text-xs text-rk-n600">
            <tr>
              <th className="p-3">Name</th>
              <th className="p-3">Store</th>
              <th className="p-3">SKU</th>
              <th className="p-3">Category</th>
              <th className="p-3">Class</th>
              <th className="p-3">Price</th>
              <th className="p-3">Stock</th>
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
                <td className="p-3 whitespace-nowrap">{p.branch.name}</td>
                <td className="p-3 font-mono text-xs">{p.sku}</td>
                <td className="p-3">{p.category.name}</td>
                <td className="p-3">{p.class}</td>
                <td className="p-3 font-mono">{formatNaira(p.priceKobo)}</td>
                <td className="p-3 font-mono">
                  <span className={p.stockQuantity === 0 ? "text-rk-alert" : p.stockQuantity <= p.lowStockAt ? "text-rk-amber-deep" : ""}>
                    {p.stockQuantity}
                  </span>
                </td>
                <td className="p-3">
                  <Badge variant={p.isActive ? "success" : "neutral"}>{p.isActive ? "Active" : "Inactive"}</Badge>
                </td>
              </tr>
            ))}
            {products.length === 0 && (
              <tr>
                <td colSpan={8} className="p-6 text-center text-rk-n600">
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
