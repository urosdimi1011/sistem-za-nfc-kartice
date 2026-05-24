import "server-only";
import { prisma } from "@/lib/prisma";
import type { PersonFormInput } from "./schemas";

export class PersonServiceError extends Error {
  constructor(public code: "JMBG_TAKEN" | "NOT_FOUND", message: string) {
    super(message);
  }
}

export async function createPerson(tenantId: string, input: PersonFormInput) {
  if (input.jmbg) {
    const existing = await prisma.person.findFirst({
      where: { tenantId, jmbg: input.jmbg },
      select: { id: true },
    });
    if (existing) {
      throw new PersonServiceError("JMBG_TAKEN", "Osoba sa ovim JMBG-om već postoji");
    }
  }

  // Validacija: grupa mora pripadati istom tenantu (ako je zadata)
  if (input.groupId) {
    const g = await prisma.group.findFirst({
      where: { id: input.groupId, tenantId },
      select: { id: true },
    });
    if (!g) {
      throw new PersonServiceError("NOT_FOUND", "Grupa ne postoji");
    }
  }

  return prisma.person.create({
    data: {
      tenantId,
      firstName: input.firstName,
      lastName: input.lastName,
      personType: input.personType,
      jmbg: input.jmbg,
      phone: input.phone,
      email: input.email,
      dateOfBirth: input.dateOfBirth ? new Date(input.dateOfBirth) : null,
      note: input.note,
      groupId: input.groupId ?? null,
      creditBalance: { create: { tenantId, balance: 0 } },
    },
  });
}

export async function updatePerson(
  tenantId: string,
  id: string,
  input: PersonFormInput,
) {
  const person = await prisma.person.findFirst({
    where: { id, tenantId },
    select: { id: true, jmbg: true },
  });
  if (!person) {
    throw new PersonServiceError("NOT_FOUND", "Osoba nije pronađena");
  }

  if (input.jmbg && input.jmbg !== person.jmbg) {
    const taken = await prisma.person.findFirst({
      where: { tenantId, jmbg: input.jmbg, id: { not: id } },
      select: { id: true },
    });
    if (taken) {
      throw new PersonServiceError("JMBG_TAKEN", "Osoba sa ovim JMBG-om već postoji");
    }
  }

  if (input.groupId) {
    const g = await prisma.group.findFirst({
      where: { id: input.groupId, tenantId },
      select: { id: true },
    });
    if (!g) {
      throw new PersonServiceError("NOT_FOUND", "Grupa ne postoji");
    }
  }

  return prisma.person.update({
    where: { id },
    data: {
      firstName: input.firstName,
      lastName: input.lastName,
      personType: input.personType,
      jmbg: input.jmbg ?? null,
      phone: input.phone ?? null,
      email: input.email ?? null,
      dateOfBirth: input.dateOfBirth ? new Date(input.dateOfBirth) : null,
      note: input.note ?? null,
      groupId: input.groupId ?? null,
    },
  });
}

export async function setPersonActive(
  tenantId: string,
  id: string,
  isActive: boolean,
) {
  const exists = await prisma.person.findFirst({
    where: { id, tenantId },
    select: { id: true },
  });
  if (!exists) {
    throw new PersonServiceError("NOT_FOUND", "Osoba nije pronađena");
  }
  return prisma.person.update({
    where: { id },
    data: { isActive },
  });
}
