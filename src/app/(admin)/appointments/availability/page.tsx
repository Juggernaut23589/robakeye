import { listVetStaffWithAvailability } from "@/actions/appointments";
import { AvailabilityClient } from "@/components/availability/availability-client";

export default async function VetAvailabilityPage() {
  const staff = await listVetStaffWithAvailability();

  return (
    <main className="p-8">
      <h1 className="font-display text-2xl font-bold text-rk-navy">Vet Staff Availability</h1>
      <p className="mb-4 text-sm text-rk-n600">
        Weekly recurring windows — customers never pick a specific vet, just any staff member free at that time.
      </p>
      <AvailabilityClient staff={staff} />
    </main>
  );
}
