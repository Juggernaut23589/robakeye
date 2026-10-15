import { prisma } from "@/lib/prisma";

// Computes real bookable slots for a given date + service: union of every
// vet staff member's weekly availability window for that day-of-week,
// sliced into service-duration increments, minus whatever's already
// booked. The customer doesn't pick a specific vet — any one of them
// being free is enough (admin can reassign staffId later if needed).
export async function getAvailableSlots(branchId: string, serviceId: string, date: Date) {
  const service = await prisma.vetService.findUnique({ where: { id: serviceId } });
  if (!service) return [];

  const dayOfWeek = date.getDay();
  const staffAtBranch = await prisma.staffBranch.findMany({
    where: { branchId },
    select: { staffId: true },
  });
  const staffIds = staffAtBranch.map((s) => s.staffId);
  if (staffIds.length === 0) return [];

  const availability = await prisma.vetAvailability.findMany({
    where: { staffId: { in: staffIds }, dayOfWeek },
  });
  if (availability.length === 0) return [];

  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setHours(23, 59, 59, 999);

  const existingAppointments = await prisma.vetAppointment.findMany({
    where: {
      branchId,
      startsAt: { gte: dayStart, lte: dayEnd },
      status: { in: ["REQUESTED", "CONFIRMED"] },
    },
    select: { startsAt: true, endsAt: true, staffId: true },
  });

  const slots = new Set<string>(); // ISO strings, deduped across staff windows
  const now = new Date();

  for (const window of availability) {
    const [startH, startM] = window.startTime.split(":").map(Number);
    const [endH, endM] = window.endTime.split(":").map(Number);
    const windowStart = new Date(date);
    windowStart.setHours(startH, startM, 0, 0);
    const windowEnd = new Date(date);
    windowEnd.setHours(endH, endM, 0, 0);

    for (
      let slotStart = new Date(windowStart);
      slotStart.getTime() + service.durationMinutes * 60_000 <= windowEnd.getTime();
      slotStart = new Date(slotStart.getTime() + service.durationMinutes * 60_000)
    ) {
      if (slotStart <= now) continue; // no booking in the past

      const slotEnd = new Date(slotStart.getTime() + service.durationMinutes * 60_000);
      // At least one staff member covering this window must be free —
      // check per-staff below rather than just "is any appointment
      // overlapping at all", since two different vets can be booked
      // simultaneously without conflict.
      const staffBookedAtThisTime = new Set(
        existingAppointments
          .filter((a) => a.startsAt < slotEnd && a.endsAt > slotStart)
          .map((a) => a.staffId),
      );
      const anyStaffFree = staffIds.some((id) => !staffBookedAtThisTime.has(id));
      if (anyStaffFree) slots.add(slotStart.toISOString());
    }
  }

  return Array.from(slots).sort();
}
