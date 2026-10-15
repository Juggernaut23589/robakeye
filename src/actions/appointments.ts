"use server";

import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAvailableSlots } from "@/lib/vetAvailability";
import { inngest, appointmentBooked } from "@/lib/inngest/client";

export async function listVetServices() {
  return prisma.vetService.findMany({ where: { isActive: true }, orderBy: { name: "asc" } });
}

// Veterinary services exist only at the flagship branch per the brief —
// look it up by its known role rather than hardcoding the slug, so this
// still works if branch slugs ever change.
async function getFlagshipBranch() {
  return prisma.branch.findFirst({ where: { services: { has: "VETERINARY" } } });
}

export async function getSlotsForDate(serviceId: string, dateIso: string) {
  const branch = await getFlagshipBranch();
  if (!branch) return [];
  return getAvailableSlots(branch.id, serviceId, new Date(dateIso));
}

const bookSchema = z.object({
  petId: z.string(),
  serviceId: z.string(),
  startsAtIso: z.string(),
  notes: z.string().optional(),
});

export async function bookAppointment(input: unknown) {
  const session = await auth();
  if (!session?.user) return { ok: false as const, error: "Sign in to book an appointment" };

  const parsed = bookSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Invalid booking details" };

  const [pet, service, branch] = await Promise.all([
    prisma.petProfile.findUnique({ where: { id: parsed.data.petId } }),
    prisma.vetService.findUnique({ where: { id: parsed.data.serviceId } }),
    getFlagshipBranch(),
  ]);
  if (!pet || pet.ownerId !== session.user.id) return { ok: false as const, error: "Pet not found" };
  if (!service) return { ok: false as const, error: "Service not found" };
  if (!branch) return { ok: false as const, error: "No branch offers veterinary services" };

  const startsAt = new Date(parsed.data.startsAtIso);
  const endsAt = new Date(startsAt.getTime() + service.durationMinutes * 60_000);

  // Re-check the slot is still free at write time — the same
  // read-then-confirm race the rest of this project guards against
  // (two customers requesting the same slot at once).
  const stillAvailable = await getAvailableSlots(branch.id, service.id, startsAt);
  const isoMatch = stillAvailable.some((s) => new Date(s).getTime() === startsAt.getTime());
  if (!isoMatch) {
    return { ok: false as const, error: "That slot was just taken — please pick another time." };
  }

  const appointment = await prisma.vetAppointment.create({
    data: {
      petId: pet.id,
      ownerId: session.user.id,
      branchId: branch.id,
      serviceId: service.id,
      startsAt,
      endsAt,
      status: "CONFIRMED",
      notes: parsed.data.notes,
    },
  });

  await inngest.send(appointmentBooked.create({ appointmentId: appointment.id }));

  return { ok: true as const, appointmentId: appointment.id };
}

export async function listMyAppointments() {
  const session = await auth();
  if (!session?.user) return [];
  return prisma.vetAppointment.findMany({
    where: { ownerId: session.user.id },
    include: { pet: { select: { name: true } }, service: true, branch: { select: { name: true, address: true } } },
    orderBy: { startsAt: "desc" },
  });
}

export async function cancelAppointment(appointmentId: string) {
  const session = await auth();
  if (!session?.user) return { ok: false as const, error: "Sign in required" };

  const appt = await prisma.vetAppointment.findUnique({ where: { id: appointmentId } });
  if (!appt || appt.ownerId !== session.user.id) return { ok: false as const, error: "Not found" };

  await prisma.vetAppointment.update({ where: { id: appointmentId }, data: { status: "CANCELLED" } });
  return { ok: true as const };
}

// ── Admin: staff availability management ──────────────────────────────

export async function listVetStaffWithAvailability() {
  const session = await auth();
  if (!session?.user?.permissions.includes("appointments.manage")) return [];

  return prisma.staff.findMany({
    where: { role: { name: "VET_STAFF" } },
    include: { user: { select: { name: true } }, availability: { orderBy: { dayOfWeek: "asc" } } },
  });
}

const availabilitySchema = z.object({
  staffId: z.string(),
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
});

export async function addVetAvailability(input: unknown) {
  const session = await auth();
  if (!session?.user?.permissions.includes("appointments.manage")) {
    return { ok: false as const, error: "Not authorized" };
  }
  const parsed = availabilitySchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Invalid availability window" };

  await prisma.vetAvailability.create({ data: parsed.data });
  return { ok: true as const };
}

export async function removeVetAvailability(id: string) {
  const session = await auth();
  if (!session?.user?.permissions.includes("appointments.manage")) {
    return { ok: false as const, error: "Not authorized" };
  }
  await prisma.vetAvailability.delete({ where: { id } });
  return { ok: true as const };
}

export async function listAppointmentsForAdmin() {
  const session = await auth();
  if (!session?.user?.permissions.includes("appointments.view")) return [];
  return prisma.vetAppointment.findMany({
    where: { startsAt: { gte: new Date() }, status: { in: ["REQUESTED", "CONFIRMED"] } },
    include: { pet: { select: { name: true } }, owner: { select: { name: true } }, service: true },
    orderBy: { startsAt: "asc" },
    take: 50,
  });
}
