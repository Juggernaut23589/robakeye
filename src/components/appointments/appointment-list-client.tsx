"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cancelAppointment } from "@/actions/appointments";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type Appointment = {
  id: string;
  startsAt: Date;
  status: string;
  pet: { name: string };
  service: { name: string };
  branch: { name: string; address: string };
};

const STATUS_VARIANT: Record<string, "success" | "alert" | "amber" | "neutral"> = {
  CONFIRMED: "success",
  REQUESTED: "amber",
  CANCELLED: "neutral",
  COMPLETED: "neutral",
};

export function AppointmentListClient({ appointments }: { appointments: Appointment[] }) {
  const router = useRouter();
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  async function onCancel(id: string) {
    setCancellingId(id);
    await cancelAppointment(id);
    setCancellingId(null);
    router.refresh();
  }

  if (appointments.length === 0) {
    return <p className="text-sm text-rk-n600">No appointments yet.</p>;
  }

  return (
    <div className="grid gap-3">
      {appointments.map((appt) => {
        const canCancel = appt.status === "CONFIRMED" || appt.status === "REQUESTED";
        return (
          <div key={appt.id} className="flex items-center justify-between rounded-rk-md border border-rk-n200 p-4">
            <div>
              <div className="flex items-center gap-2">
                <b className="text-rk-navy">{appt.service.name}</b>
                <Badge variant={STATUS_VARIANT[appt.status] ?? "neutral"}>{appt.status}</Badge>
              </div>
              <p className="text-sm text-rk-n600">
                {appt.pet.name} · {new Date(appt.startsAt).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" })}
              </p>
              <p className="text-xs text-rk-n600">
                {appt.branch.name} — {appt.branch.address}
              </p>
            </div>
            {canCancel && (
              <Button
                variant="outline"
                size="sm"
                loading={cancellingId === appt.id}
                onClick={() => onCancel(appt.id)}
              >
                Cancel
              </Button>
            )}
          </div>
        );
      })}
    </div>
  );
}
