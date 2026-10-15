import Link from "next/link";
import { listAppointmentsForAdmin } from "@/actions/appointments";
import { Badge } from "@/components/ui/badge";

export default async function AppointmentsPage() {
  const appointments = await listAppointmentsForAdmin();

  return (
    <main className="p-8">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-rk-navy">Upcoming Appointments</h1>
        <Link href="/appointments/availability" className="text-sm text-rk-blue">
          Manage vet availability →
        </Link>
      </div>
      {appointments.length === 0 ? (
        <p className="text-rk-n600">No upcoming appointments.</p>
      ) : (
        <div className="grid gap-3">
          {appointments.map((a) => (
            <div key={a.id} className="flex items-center justify-between rounded-rk-md border border-rk-n200 p-4">
              <div>
                <div className="flex items-center gap-2">
                  <b className="text-rk-navy">{a.service.name}</b>
                  <Badge variant={a.status === "CONFIRMED" ? "success" : "amber"}>{a.status}</Badge>
                </div>
                <p className="text-sm text-rk-n600">
                  {a.pet.name} for {a.owner.name} ·{" "}
                  {new Date(a.startsAt).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" })}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
