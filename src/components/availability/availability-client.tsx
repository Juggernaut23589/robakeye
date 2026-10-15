"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { addVetAvailability, removeVetAvailability } from "@/actions/appointments";
import { Button } from "@/components/ui/button";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

type StaffWithAvailability = {
  id: string;
  user: { name: string | null };
  availability: { id: string; dayOfWeek: number; startTime: string; endTime: string }[];
};

export function AvailabilityClient({ staff }: { staff: StaffWithAvailability[] }) {
  const router = useRouter();
  const [formForStaff, setFormForStaff] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  async function onRemove(id: string) {
    setRemovingId(id);
    await removeVetAvailability(id);
    setRemovingId(null);
    router.refresh();
  }

  if (staff.length === 0) {
    return <p className="text-rk-n600">No vet staff found. Assign the VET_STAFF role to a staff account first.</p>;
  }

  return (
    <div className="grid gap-5">
      {staff.map((s) => (
        <div key={s.id} className="rounded-rk-md border border-rk-n200 p-4">
          <b className="text-rk-navy">{s.user.name ?? "Unnamed staff"}</b>
          {s.availability.length > 0 && (
            <ul className="mt-2 grid gap-1 text-sm text-rk-n600">
              {s.availability.map((a) => (
                <li key={a.id} className="flex items-center gap-2">
                  <span>
                    {DAY_NAMES[a.dayOfWeek]} {a.startTime}–{a.endTime}
                  </span>
                  <button
                    onClick={() => onRemove(a.id)}
                    disabled={removingId === a.id}
                    className="text-xs text-rk-alert underline disabled:opacity-50"
                  >
                    remove
                  </button>
                </li>
              ))}
            </ul>
          )}

          {formForStaff === s.id ? (
            <WindowForm
              staffId={s.id}
              onDone={() => {
                setFormForStaff(null);
                router.refresh();
              }}
            />
          ) : (
            <button onClick={() => setFormForStaff(s.id)} className="mt-2 text-xs text-rk-blue underline">
              + Add availability window
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

function WindowForm({ staffId, onDone }: { staffId: string; onDone: () => void }) {
  const [dayOfWeek, setDayOfWeek] = useState(1);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:00");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    const result = await addVetAvailability({ staffId, dayOfWeek, startTime, endTime });
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    onDone();
  }

  return (
    <form onSubmit={onSubmit} className="mt-2 grid gap-2 rounded-rk-sm bg-rk-n50 p-3 sm:flex sm:items-end sm:gap-2">
      <label className="text-xs text-rk-n600">
        Day
        <select
          value={dayOfWeek}
          onChange={(e) => setDayOfWeek(Number(e.target.value))}
          className="mt-0.5 block rounded-rk-sm border border-rk-n200 px-2 py-1"
        >
          {DAY_NAMES.map((d, i) => (
            <option key={d} value={i}>
              {d}
            </option>
          ))}
        </select>
      </label>
      <label className="text-xs text-rk-n600">
        Start
        <input
          type="time"
          value={startTime}
          onChange={(e) => setStartTime(e.target.value)}
          className="mt-0.5 block rounded-rk-sm border border-rk-n200 px-2 py-1"
        />
      </label>
      <label className="text-xs text-rk-n600">
        End
        <input
          type="time"
          value={endTime}
          onChange={(e) => setEndTime(e.target.value)}
          className="mt-0.5 block rounded-rk-sm border border-rk-n200 px-2 py-1"
        />
      </label>
      {error && <p className="text-sm text-rk-alert">{error}</p>}
      <Button type="submit" size="sm" loading={pending} className="w-fit">
        Save
      </Button>
    </form>
  );
}
