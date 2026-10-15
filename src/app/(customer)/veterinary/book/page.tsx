import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { listVetServices } from "@/actions/appointments";
import { listMyPets } from "@/actions/pets";
import { BookingClient } from "@/components/appointments/booking-client";

export default async function BookAppointmentPage() {
  const session = await auth();
  if (!session?.user) redirect("/login?callbackUrl=/veterinary/book");

  const [services, pets] = await Promise.all([listVetServices(), listMyPets()]);

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="font-display text-2xl font-bold text-rk-navy">Book a vet appointment</h1>
      <p className="mb-6 text-sm text-rk-n600">
        At our Sheu flagship clinic — the only one of our three branches with a full veterinary service.
      </p>
      <BookingClient services={services} pets={pets.map((p) => ({ id: p.id, name: p.name, species: p.species }))} />
    </div>
  );
}
