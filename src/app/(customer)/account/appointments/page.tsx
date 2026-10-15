import Link from "next/link";
import { listMyAppointments } from "@/actions/appointments";
import { AppointmentListClient } from "@/components/appointments/appointment-list-client";

export default async function MyAppointmentsPage() {
  const appointments = await listMyAppointments();

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-rk-navy">My Appointments</h1>
        <Link href="/veterinary/book" className="text-sm text-rk-blue underline">
          Book another
        </Link>
      </div>
      <AppointmentListClient appointments={appointments} />
    </div>
  );
}
