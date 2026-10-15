"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getSlotsForDate, bookAppointment } from "@/actions/appointments";
import { Button } from "@/components/ui/button";

type Service = { id: string; name: string; durationMinutes: number; priceKobo: number };
type Pet = { id: string; name: string; species: string };

function formatNaira(kobo: number) {
  return `₦${(kobo / 100).toLocaleString("en-NG")}`;
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function BookingClient({ services, pets }: { services: Service[]; pets: Pet[] }) {
  const router = useRouter();
  const [serviceId, setServiceId] = useState(services[0]?.id ?? "");
  const [petId, setPetId] = useState(pets[0]?.id ?? "");
  const [date, setDate] = useState(todayIso());
  const [slots, setSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [booking, setBooking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmedId, setConfirmedId] = useState<string | null>(null);

  useEffect(() => {
    if (!serviceId || !date) return;
    let cancelled = false;
    async function loadSlots() {
      setLoadingSlots(true);
      setSelectedSlot(null);
      const result = await getSlotsForDate(serviceId, date);
      if (cancelled) return;
      setSlots(result);
      setLoadingSlots(false);
    }
    loadSlots();
    return () => {
      cancelled = true;
    };
  }, [serviceId, date]);

  if (pets.length === 0) {
    return (
      <p className="text-sm text-rk-n600">
        Add a pet profile first under{" "}
        <Link href="/account/pets" className="text-rk-blue underline">
          My Pets
        </Link>{" "}
        before booking an appointment.
      </p>
    );
  }

  async function onConfirm() {
    if (!selectedSlot) return;
    setBooking(true);
    setError(null);
    const result = await bookAppointment({ petId, serviceId, startsAtIso: selectedSlot, notes: notes || undefined });
    setBooking(false);
    if (!result.ok) {
      setError(result.error);
      // The slot may have just been taken — refresh the list.
      setLoadingSlots(true);
      getSlotsForDate(serviceId, date).then(setSlots).finally(() => setLoadingSlots(false));
      return;
    }
    setConfirmedId(result.appointmentId);
    router.refresh();
  }

  if (confirmedId) {
    return (
      <div className="rounded-rk-md border border-rk-success bg-rk-success-tint p-6">
        <p className="font-semibold text-rk-success">Appointment confirmed.</p>
        <p className="mt-1 text-sm text-rk-n600">
          You&apos;ll get an email and SMS confirmation, plus a reminder 24 hours before.
        </p>
        <Link href="/account/appointments" className="mt-3 inline-block text-sm text-rk-blue underline">
          View my appointments
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-5">
      <label className="grid gap-1 text-sm">
        Pet
        <select value={petId} onChange={(e) => setPetId(e.target.value)} className="rounded-rk-sm border border-rk-n200 px-3 py-2">
          {pets.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} ({p.species})
            </option>
          ))}
        </select>
      </label>

      <label className="grid gap-1 text-sm">
        Service
        <select value={serviceId} onChange={(e) => setServiceId(e.target.value)} className="rounded-rk-sm border border-rk-n200 px-3 py-2">
          {services.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} — {formatNaira(s.priceKobo)} ({s.durationMinutes} min)
            </option>
          ))}
        </select>
      </label>

      <label className="grid gap-1 text-sm">
        Date
        <input
          type="date"
          value={date}
          min={todayIso()}
          onChange={(e) => setDate(e.target.value)}
          className="rounded-rk-sm border border-rk-n200 px-3 py-2"
        />
      </label>

      <div>
        <p className="mb-2 text-sm font-semibold text-rk-navy">Available times</p>
        {loadingSlots ? (
          <p className="text-sm text-rk-n600">Loading…</p>
        ) : slots.length === 0 ? (
          <p className="text-sm text-rk-n600">No open slots this day — try another date.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {slots.map((slot) => {
              const label = new Date(slot).toLocaleTimeString("en-NG", { hour: "numeric", minute: "2-digit" });
              const active = selectedSlot === slot;
              return (
                <button
                  key={slot}
                  onClick={() => setSelectedSlot(slot)}
                  className={`rounded-rk-pill border px-3 py-1.5 text-sm ${
                    active ? "border-rk-navy bg-rk-navy text-white" : "border-rk-n200 text-rk-navy hover:bg-rk-n50"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <label className="grid gap-1 text-sm">
        Notes for the vet (optional)
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="rounded-rk-sm border border-rk-n200 px-3 py-2" />
      </label>

      {error && <p className="text-sm text-rk-alert">{error}</p>}

      <Button onClick={onConfirm} disabled={!selectedSlot} loading={booking} className="w-fit">
        Confirm appointment
      </Button>
    </div>
  );
}
