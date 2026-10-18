import { getMyPrescriptions } from "@/actions/prescriptions";
import { Badge } from "@/components/ui/badge";

const STATUS_VARIANT = {
  PENDING: "neutral",
  APPROVED: "success",
  PARTIALLY_APPROVED: "amber",
  REJECTED: "alert",
  EXPIRED: "neutral",
} as const;

export default async function MyPrescriptionsPage() {
  const prescriptions = await getMyPrescriptions();

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="font-display text-2xl font-bold text-rk-navy">My Prescriptions</h1>
      {prescriptions.length === 0 ? (
        <p className="mt-4 text-sm text-rk-n600">No prescriptions submitted yet.</p>
      ) : (
        <div className="mt-6 grid gap-4">
          {prescriptions.map((p) => (
            <div key={p.id} className="rounded-rk-md border border-rk-n200 p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-rk-n600">
                  {new Date(p.createdAt).toLocaleDateString()} · {p.branch.name}
                </span>
                <Badge variant={STATUS_VARIANT[p.status]}>{p.status.replace("_", " ")}</Badge>
              </div>
              <ul className="mt-2 grid gap-1 text-sm text-rk-ink">
                {p.lines.map((l) => (
                  <li key={l.id} className="flex items-center justify-between">
                    <span>
                      {l.quantity}× {l.product.name}
                    </span>
                    <Badge variant={l.status === "APPROVED" ? "success" : l.status === "REJECTED" ? "alert" : "neutral"}>
                      {l.status}
                    </Badge>
                  </li>
                ))}
              </ul>
              {p.expiresAt && (p.status === "APPROVED" || p.status === "PARTIALLY_APPROVED") && (
                <p className="mt-2 text-xs text-rk-amber-deep">
                  {new Date(p.expiresAt) > new Date()
                    ? `Order by ${new Date(p.expiresAt).toLocaleString()} — approval window expires 48h after review.`
                    : "Approval window has expired."}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
