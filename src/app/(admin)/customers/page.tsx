import Link from "next/link";
import { listCustomers } from "@/actions/customers";

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const customers = await listCustomers(q);

  return (
    <main className="p-8">
      <h1 className="mb-4 font-display text-2xl font-bold text-rk-navy">Customers</h1>

      <form className="mb-4" action="/customers">
        <input
          name="q"
          defaultValue={q ?? ""}
          placeholder="Search by name, email or phone"
          className="w-72 rounded-rk-sm border border-rk-n200 px-3 py-2 text-sm"
        />
      </form>

      <div className="overflow-x-auto rounded-rk-md border border-rk-n200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-rk-n50 text-xs text-rk-n600">
            <tr>
              <th className="p-3">Name</th>
              <th className="p-3">Email</th>
              <th className="p-3">Phone</th>
              <th className="p-3">Orders</th>
              <th className="p-3">Joined</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-rk-n200">
            {customers.map((c) => (
              <tr key={c.id}>
                <td className="p-3">
                  <Link href={`/customers/${c.id}`} className="text-rk-blue underline">
                    {c.name}
                  </Link>
                </td>
                <td className="p-3 text-xs">{c.email}</td>
                <td className="p-3 text-xs">{c.phone ?? "—"}</td>
                <td className="p-3">{c._count.orders}</td>
                <td className="p-3 text-xs">{new Date(c.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
            {customers.length === 0 && (
              <tr>
                <td colSpan={5} className="p-6 text-center text-rk-n600">
                  No customers found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
