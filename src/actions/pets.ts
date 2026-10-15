"use server";

import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function listMyPets() {
  const session = await auth();
  if (!session?.user) return [];
  return prisma.petProfile.findMany({
    where: { ownerId: session.user.id },
    include: { vaccinationRecords: { orderBy: { dueAt: "asc" } } },
    orderBy: { createdAt: "desc" },
  });
}

const petSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  species: z.string().trim().min(1, "Species is required"),
  breed: z.string().trim().optional(),
  birthDate: z.string().optional(), // yyyy-mm-dd from a date input
  weightKg: z.number().positive().optional(),
});

export async function createPetProfile(input: unknown) {
  const session = await auth();
  if (!session?.user) return { ok: false as const, error: "Sign in to add a pet" };

  const parsed = petSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid pet details" };
  }

  const pet = await prisma.petProfile.create({
    data: {
      ownerId: session.user.id,
      name: parsed.data.name,
      species: parsed.data.species,
      breed: parsed.data.breed,
      birthDate: parsed.data.birthDate ? new Date(parsed.data.birthDate) : undefined,
      weightKg: parsed.data.weightKg,
    },
  });
  return { ok: true as const, pet };
}

const vaccinationSchema = z.object({
  petId: z.string(),
  vaccine: z.string().trim().min(1),
  givenAt: z.string(),
  dueAt: z.string(),
});

export async function addVaccinationRecord(input: unknown) {
  const session = await auth();
  if (!session?.user) return { ok: false as const, error: "Sign in required" };

  const parsed = vaccinationSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Invalid vaccination record" };

  const pet = await prisma.petProfile.findUnique({ where: { id: parsed.data.petId } });
  if (!pet || pet.ownerId !== session.user.id) {
    return { ok: false as const, error: "Pet not found" };
  }

  await prisma.vaccinationRecord.create({
    data: {
      petId: parsed.data.petId,
      vaccine: parsed.data.vaccine,
      givenAt: new Date(parsed.data.givenAt),
      dueAt: new Date(parsed.data.dueAt),
    },
  });
  return { ok: true as const };
}
