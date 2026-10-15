import { listMyPets } from "@/actions/pets";
import { PetListClient } from "@/components/pets/pet-list-client";

export default async function MyPetsPage() {
  const pets = await listMyPets();
  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="font-display text-2xl font-bold text-rk-navy">My Pets</h1>
      <p className="mb-6 text-sm text-rk-n600">
        Pet profiles are shared across bookings and vaccination reminders.
      </p>
      <PetListClient pets={pets} />
    </div>
  );
}
