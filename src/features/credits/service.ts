import "server-only";
import { prisma } from "@/lib/prisma";
import { getTenantSettings } from "@/features/settings/queries";

export class CreditServiceError extends Error {
  constructor(
    public code:
      | "PERSON_NOT_FOUND"
      | "PERSON_INACTIVE"
      | "STUDENT_CANNOT_GO_NEGATIVE"
      | "EMPLOYEE_MAX_NEGATIVE_EXCEEDED"
      | "INVALID_AMOUNT",
    message: string,
  ) {
    super(message);
  }
}

interface TopUpParams {
  tenantId: string;
  personId: string;
  amount: number;
  note?: string;
  performedByAccountId: string;
}

interface DeductParams {
  tenantId: string;
  personId: string;
  amount: number;
  note: string;
  performedByAccountId: string;
}

async function applyDelta(params: {
  tenantId: string;
  personId: string;
  delta: number;
  type: "TOPUP" | "MANUAL_DEDUCT";
  note: string | null;
  performedByAccountId: string;
}) {
  // Učitaj tenant pravila pre transakcije (read, ne mutira)
  const settings = await getTenantSettings(params.tenantId);

  return prisma.$transaction(async (tx) => {
    const person = await tx.person.findFirst({
      where: { id: params.personId, tenantId: params.tenantId },
      include: { creditBalance: true },
    });
    if (!person) {
      throw new CreditServiceError("PERSON_NOT_FOUND", "Osoba ne postoji");
    }
    if (!person.isActive) {
      throw new CreditServiceError("PERSON_INACTIVE", "Osoba je neaktivna");
    }

    const currentBalance = person.creditBalance?.balance ?? 0;
    const newBalance = currentBalance + params.delta;

    // STUDENT: poštuj tenant pravilo "allowStudentNegativeBalance"
    if (
      person.personType === "STUDENT" &&
      newBalance < 0 &&
      !settings.allowStudentNegativeBalance
    ) {
      throw new CreditServiceError(
        "STUDENT_CANNOT_GO_NEGATIVE",
        `Učenik ne može imati negativno stanje. Trenutno: ${currentBalance}, pokušaj: ${newBalance}. (Možeš ovo omogućiti u Podešavanja → Pravila.)`,
      );
    }

    // EMPLOYEE: poštuj maxNegativeBalanceEmployee ako postavljeno
    if (
      person.personType === "EMPLOYEE" &&
      newBalance < 0 &&
      settings.maxNegativeBalanceEmployee !== null &&
      Math.abs(newBalance) > settings.maxNegativeBalanceEmployee
    ) {
      throw new CreditServiceError(
        "EMPLOYEE_MAX_NEGATIVE_EXCEEDED",
        `Zaposleni može u minus najviše do −${settings.maxNegativeBalanceEmployee}. Pokušaj: ${newBalance}.`,
      );
    }

    await tx.creditBalance.upsert({
      where: { personId: params.personId },
      update: { balance: newBalance },
      create: { tenantId: params.tenantId, personId: params.personId, balance: newBalance },
    });

    const transaction = await tx.creditTransaction.create({
      data: {
        tenantId: params.tenantId,
        personId: params.personId,
        amount: params.delta,
        balanceAfter: newBalance,
        type: params.type,
        note: params.note,
        performedById: params.performedByAccountId,
      },
    });

    return { transaction, newBalance };
  });
}

export async function topUpCredits(params: TopUpParams) {
  if (params.amount <= 0) {
    throw new CreditServiceError("INVALID_AMOUNT", "Iznos mora biti veći od 0");
  }
  return applyDelta({
    tenantId: params.tenantId,
    personId: params.personId,
    delta: params.amount,
    type: "TOPUP",
    note: params.note ?? null,
    performedByAccountId: params.performedByAccountId,
  });
}

export async function deductCredits(params: DeductParams) {
  if (params.amount <= 0) {
    throw new CreditServiceError("INVALID_AMOUNT", "Iznos mora biti veći od 0");
  }
  return applyDelta({
    tenantId: params.tenantId,
    personId: params.personId,
    delta: -params.amount,
    type: "MANUAL_DEDUCT",
    note: params.note,
    performedByAccountId: params.performedByAccountId,
  });
}
