import "server-only";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import type {
  CreateAccountInput,
  UpdateAccountInput,
} from "./schemas";

export class AccountServiceError extends Error {
  constructor(
    public code:
      | "EMAIL_TAKEN"
      | "NOT_FOUND"
      | "CANNOT_MODIFY_SELF"
      | "CANNOT_REMOVE_LAST_ADMIN"
      | "PERSON_ALREADY_LINKED",
    message: string,
  ) {
    super(message);
  }
}

const SALT_ROUNDS = 10;

async function ensureNotLastActiveAdminInTenant(
  tenantId: string,
  accountId: string,
) {
  const otherActiveAdmins = await prisma.systemAccount.count({
    where: {
      tenantId,
      id: { not: accountId },
      role: "ADMIN",
      isActive: true,
    },
  });
  if (otherActiveAdmins === 0) {
    throw new AccountServiceError(
      "CANNOT_REMOVE_LAST_ADMIN",
      "Ovo je poslednji aktivni admin nalog — ne može se deaktivirati niti promeniti ulogu.",
    );
  }
}

export async function createAccount(
  tenantId: string,
  input: CreateAccountInput,
  performedByAccountId: string,
) {
  const personIdNormalized =
    input.personId && input.personId.trim().length > 0
      ? input.personId.trim()
      : null;

  // Email je globalno unique (jednostavnost login flow-a)
  const existing = await prisma.systemAccount.findUnique({
    where: { email: input.email.toLowerCase() },
    select: { id: true },
  });
  if (existing) {
    throw new AccountServiceError("EMAIL_TAKEN", "Nalog sa ovim emailom već postoji");
  }

  if (personIdNormalized) {
    const person = await prisma.person.findFirst({
      where: { id: personIdNormalized, tenantId },
      select: { id: true },
    });
    if (!person) {
      throw new AccountServiceError("NOT_FOUND", "Vezana osoba ne postoji");
    }
    const personLinked = await prisma.systemAccount.findUnique({
      where: { personId: personIdNormalized },
      select: { id: true },
    });
    if (personLinked) {
      throw new AccountServiceError(
        "PERSON_ALREADY_LINKED",
        "Ova osoba već ima vezan nalog",
      );
    }
  }

  const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);

  return prisma.systemAccount.create({
    data: {
      tenantId,
      email: input.email.toLowerCase(),
      passwordHash,
      role: input.role,
      personId: personIdNormalized,
      createdById: performedByAccountId,
    },
  });
}

export async function updateAccount(
  tenantId: string,
  id: string,
  input: UpdateAccountInput,
  performedByAccountId: string,
) {
  const account = await prisma.systemAccount.findFirst({
    where: { id, tenantId },
  });
  if (!account) {
    throw new AccountServiceError("NOT_FOUND", "Nalog ne postoji");
  }

  const isSelf = id === performedByAccountId;
  if (isSelf) {
    if (account.role === "ADMIN" && input.role !== "ADMIN") {
      throw new AccountServiceError(
        "CANNOT_MODIFY_SELF",
        "Ne možeš sam sebi da promeniš admin ulogu",
      );
    }
    if (!input.isActive) {
      throw new AccountServiceError(
        "CANNOT_MODIFY_SELF",
        "Ne možeš sam sebe da deaktiviraš",
      );
    }
  }

  const losingAdminRights =
    account.role === "ADMIN" && (input.role !== "ADMIN" || !input.isActive);
  if (losingAdminRights) {
    await ensureNotLastActiveAdminInTenant(tenantId, id);
  }

  if (input.email.toLowerCase() !== account.email) {
    const taken = await prisma.systemAccount.findUnique({
      where: { email: input.email.toLowerCase() },
      select: { id: true },
    });
    if (taken && taken.id !== id) {
      throw new AccountServiceError("EMAIL_TAKEN", "Email je već zauzet");
    }
  }

  return prisma.systemAccount.update({
    where: { id },
    data: {
      email: input.email.toLowerCase(),
      role: input.role,
      isActive: input.isActive,
    },
  });
}

export async function resetAccountPassword(
  tenantId: string,
  id: string,
  newPassword: string,
) {
  const account = await prisma.systemAccount.findFirst({
    where: { id, tenantId },
  });
  if (!account) {
    throw new AccountServiceError("NOT_FOUND", "Nalog ne postoji");
  }
  const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  return prisma.systemAccount.update({
    where: { id },
    data: {
      passwordHash,
      passwordChangedAt: new Date(),
    },
  });
}
