import Link from "next/link";
import { getPendingPrescriptionQueue } from "@/actions/prescriptions";

export default async function PrescriptionQueuePage() {
  const queue = await getPendingPrescriptionQueue();

  return (
    <main className="p-8">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-rk-navy">Prescription Queue</h1>
        <Link href="/prescriptions/audit" className="text-sm text-rk-blue">
          View audit log →
        </Link>
      </div>
      {queue.length === 0 ? (
        <p className="text-rk-n600">No pending prescriptions.</p>
      ) : (
        <div className="grid gap-3">
          {queue.map((p) => (
            <Link
              key={p.id}
              href={`/prescriptions/${p.id}`}
              className="rounded-rk-md border border-rk-n200 p-4 hover:bg-rk-n50"
            >
              <div className="flex items-center justify-between">
                <span>
                  <b className="text-rk-navy">{p.user.name}</b>
                  <span className="ml-2 rounded-rk-pill bg-rk-navy-tint px-2 py-0.5 text-xs text-rk-navy">{p.branch.name}</span>
                </span>
                <span className="text-xs text-rk-n600">
                  {new Date(p.createdAt).toLocaleString()}
                </span>
              </div>
              <p className="text-sm text-rk-n600">
                {p.lines.map((l) => `${l.quantity}× ${l.product.name}`).join(", ")}
              </p>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
