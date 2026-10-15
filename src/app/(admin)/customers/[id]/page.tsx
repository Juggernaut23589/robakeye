import { notFound } from "next/navigation";
import Link from "next/link";
import { getCustomerProfile } from "@/actions/customers";
import { formatNaira } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export default async function CustomerProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const customer = await getCustomerProfile(id);
  if (!customer) notFound();

  return (
    <main className="p-8">
      <Link href="/customers" className="text-sm text-rk-blue underline">
        ← Back to customers
      </Link>

      <h1 className="mt-2 font-display text-2xl font-bold text-rk-navy">{customer.name}</h1>
      <p className="text-sm text-rk-n600">
        {customer.email} {customer.phone && `· ${customer.phone}`}
      </p>
      <p className="text-xs text-rk-n600">Joined {new Date(customer.createdAt).toLocaleDateString()}</p>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="rounded-rk-md border border-rk-n200 bg-white p-5">
          <h2 className="mb-3 font-semibold text-rk-navy">Orders ({customer.orders.length})</h2>
          {customer.orders.length === 0 ? (
            <p className="text-sm text-rk-n600">No orders yet.</p>
          ) : (
            <ul className="grid gap-2 text-sm">
              {customer.orders.map((o) => (
                <li key={o.id} className="flex justify-between">
                  <span>
                    {o.orderNumber} · {o.branch.name}
                  </span>
                  <span className="font-mono text-rk-n600">{formatNaira(o.totalKobo)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-rk-md border border-rk-n200 bg-white p-5">
          <h2 className="mb-3 font-semibold text-rk-navy">Prescriptions ({customer.prescriptions.length})</h2>
          {customer.prescriptions.length === 0 ? (
            <p className="text-sm text-rk-n600">None submitted.</p>
          ) : (
            <ul className="grid gap-2 text-sm">
              {customer.prescriptions.map((p) => (
                <li key={p.id} className="flex items-center justify-between">
                  <span>{new Date(p.createdAt).toLocaleDateString()}</span>
                  <Badge variant="amber">{p.status}</Badge>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-rk-md border border-rk-n200 bg-white p-5">
          <h2 className="mb-3 font-semibold text-rk-navy">Vet appointments ({customer.vetAppointments.length})</h2>
          {customer.vetAppointments.length === 0 ? (
            <p className="text-sm text-rk-n600">None booked.</p>
          ) : (
            <ul className="grid gap-2 text-sm">
              {customer.vetAppointments.map((a) => (
                <li key={a.id} className="flex justify-between">
                  <span>
                    {a.service.name} for {a.pet.name}
                  </span>
                  <span className="text-xs text-rk-n600">{new Date(a.startsAt).toLocaleDateString()}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-rk-md border border-rk-n200 bg-white p-5">
          <h2 className="mb-3 font-semibold text-rk-navy">Addresses ({customer.addresses.length})</h2>
          {customer.addresses.length === 0 ? (
            <p className="text-sm text-rk-n600">None on file.</p>
          ) : (
            <ul className="grid gap-2 text-sm">
              {customer.addresses.map((a) => (
                <li key={a.id}>
                  {a.label} — {a.line1}, {a.city}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
