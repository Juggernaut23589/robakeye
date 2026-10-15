"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createPetProfile, addVaccinationRecord } from "@/actions/pets";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type Pet = {
  id: string;
  name: string;
  species: string;
  breed: string | null;
  vaccinationRecords: { id: string; vaccine: string; dueAt: Date; reminderSentAt: Date | null }[];
};

export function PetListClient({ pets }: { pets: Pet[] }) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [vaccineFormFor, setVaccineFormFor] = useState<string | null>(null);

  return (
    <div className="grid gap-4">
      {pets.map((pet) => (
        <div key={pet.id} className="rounded-rk-md border border-rk-n200 p-4">
          <div className="flex items-center justify-between">
            <b className="text-rk-navy">{pet.name}</b>
            <span className="text-xs text-rk-n600">
              {pet.species}
              {pet.breed ? ` · ${pet.breed}` : ""}
            </span>
          </div>
          {pet.vaccinationRecords.length > 0 && (
            <ul className="mt-2 grid gap-1 text-xs text-rk-n600">
              {pet.vaccinationRecords.map((v) => (
                <li key={v.id} className="flex items-center gap-2">
                  <span>{v.vaccine} — due {new Date(v.dueAt).toLocaleDateString()}</span>
                  {v.reminderSentAt && <Badge variant="amber">Reminded</Badge>}
                </li>
              ))}
            </ul>
          )}
          {vaccineFormFor === pet.id ? (
            <VaccineForm petId={pet.id} onDone={() => { setVaccineFormFor(null); router.refresh(); }} />
          ) : (
            <button onClick={() => setVaccineFormFor(pet.id)} className="mt-2 text-xs text-rk-blue underline">
              + Add vaccination record
            </button>
          )}
        </div>
      ))}

      {showForm ? (
        <PetForm onDone={() => { setShowForm(false); router.refresh(); }} />
      ) : (
        <Button variant="outline" className="w-fit" onClick={() => setShowForm(true)}>
          + Add a pet
        </Button>
      )}
    </div>
  );
}

function PetForm({ onDone }: { onDone: () => void }) {
  const [name, setName] = useState("");
  const [species, setSpecies] = useState("");
  const [breed, setBreed] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    const result = await createPetProfile({ name, species, breed: breed || undefined });
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    onDone();
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-3 rounded-rk-md border border-rk-n200 p-4">
      <label className="grid gap-1 text-sm">
        Pet name
        <input value={name} onChange={(e) => setName(e.target.value)} required className="rounded-rk-sm border border-rk-n200 px-3 py-2" />
      </label>
      <label className="grid gap-1 text-sm">
        Species
        <input value={species} onChange={(e) => setSpecies(e.target.value)} required placeholder="Dog, Cat…" className="rounded-rk-sm border border-rk-n200 px-3 py-2" />
      </label>
      <label className="grid gap-1 text-sm">
        Breed (optional)
        <input value={breed} onChange={(e) => setBreed(e.target.value)} className="rounded-rk-sm border border-rk-n200 px-3 py-2" />
      </label>
      {error && <p className="text-sm text-rk-alert">{error}</p>}
      <Button type="submit" loading={pending} className="w-fit">
        Save pet
      </Button>
    </form>
  );
}

function VaccineForm({ petId, onDone }: { petId: string; onDone: () => void }) {
  const [vaccine, setVaccine] = useState("");
  const [givenAt, setGivenAt] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    await addVaccinationRecord({ petId, vaccine, givenAt, dueAt });
    setPending(false);
    onDone();
  }

  return (
    <form onSubmit={onSubmit} className="mt-2 grid gap-2 rounded-rk-sm bg-rk-n50 p-3">
      <input value={vaccine} onChange={(e) => setVaccine(e.target.value)} placeholder="Vaccine name" required className="rounded-rk-sm border border-rk-n200 px-2 py-1 text-sm" />
      <div className="flex gap-2">
        <label className="flex-1 text-xs text-rk-n600">
          Given
          <input type="date" value={givenAt} onChange={(e) => setGivenAt(e.target.value)} required className="mt-0.5 w-full rounded-rk-sm border border-rk-n200 px-2 py-1" />
        </label>
        <label className="flex-1 text-xs text-rk-n600">
          Next due
          <input type="date" value={dueAt} onChange={(e) => setDueAt(e.target.value)} required className="mt-0.5 w-full rounded-rk-sm border border-rk-n200 px-2 py-1" />
        </label>
      </div>
      <Button type="submit" size="sm" loading={pending} className="w-fit">
        Save
      </Button>
    </form>
  );
}
