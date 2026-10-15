import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";

export default async function PrescriptionAuditLogPage() {
  const session = await auth();
  if (!session?.user?.permissions.includes("prescriptions.view")) {
    return (
      <main className="p-8">
        <p className="text-rk-n600">Not authorized.</p>
      </main>
    );
  }

  const entries = await prisma.prescriptionAuditEntry.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      prescription: { select: { id: true, user: { select: { name: true } } } },
    },
  });

  const staffIds = [...new Set(entries.map((e) => e.staffId).filter((id): id is string => !!id))];
  const staffUsers = staffIds.length
    ? await prisma.user.findMany({ where: { id: { in: staffIds } }, select: { id: true, name: true } })
    : [];
  const staffNameById = new Map(staffUsers.map((s) => [s.id, s.name]));

  return (
    <main className="p-8">
      <h1 className="mb-4 font-display text-2xl font-bold text-rk-navy">
        Prescription Decision Audit Log
      </h1>
      <div className="overflow-x-auto rounded-rk-md border border-rk-n200">
        <table className="w-full text-left text-sm">
          <thead className="bg-rk-n50 text-xs text-rk-n600">
            <tr>
              <th className="p-3">When</th>
              <th className="p-3">Customer</th>
              <th className="p-3">Action</th>
              <th className="p-3">By</th>
              <th className="p-3">Note</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-rk-n200">
            {entries.map((e) => (
              <tr key={e.id}>
                <td className="p-3 text-xs text-rk-n600">{new Date(e.createdAt).toLocaleString()}</td>
                <td className="p-3">{e.prescription.user.name}</td>
                <td className="p-3">
                  <Badge variant={e.action.includes("REJECT") ? "alert" : e.action === "EXPIRED" ? "neutral" : "success"}>
                    {e.action}
                  </Badge>
                </td>
                <td className="p-3 text-xs">{e.staffId ? (staffNameById.get(e.staffId) ?? "Staff") : "System"}</td>
                <td className="p-3 text-xs text-rk-n600">{e.note ?? "—"}</td>
              </tr>
            ))}
            {entries.length === 0 && (
              <tr>
                <td colSpan={5} className="p-6 text-center text-rk-n600">
                  No decisions recorded yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
