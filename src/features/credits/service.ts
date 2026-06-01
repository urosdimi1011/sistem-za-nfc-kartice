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
      | "INVALID_AMOUNT"
      | "TX_NOT_FOUND"
      | "TX_ALREADY_REVERSED"
      | "TX_NOT_REVERSIBLE"
      | "REASON_REQUIRED",
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

/**
 * Storno (poništavanje) transakcije.
 *
 * Originalna transakcija ostaje radi audita — pravimo NOVU transakciju tipa
 * REVERSAL sa suprotnim iznosom i markiramo original (`reversedAt`,
 * `reversedById`, `reversalReason`). Ne dopuštamo dvostruki storno.
 *
 * Za ORDER tip:
 *   • postavljamo `Order.cancelledAt` da se vidi u istoriji kao otkazana,
 *   • ako `restoreStock=true`, vraćamo stock svake `trackStock` stavke
 *     i kreiramo `StockMovement` audit zapis.
 *
 * Ne podržava se za MONTHLY_RESET (sistemska transakcija) ni za REVERSAL
 * (ne stornira se storno — ako je i storno bio greška, admin može ručno
 * "TOPUP/DEDUCT" da popravi).
 */
interface ReverseParams {
  tenantId: string;
  transactionId: string;
  reason: string;
  restoreStock: boolean;
  performedByAccountId: string;
}

export async function reverseTransaction(params: ReverseParams) {
  const reason = params.reason.trim();
  if (!reason) {
    throw new CreditServiceError(
      "REASON_REQUIRED",
      "Razlog storna je obavezan.",
    );
  }

  return prisma.$transaction(async (tx) => {
    const original = await tx.creditTransaction.findFirst({
      where: { id: params.transactionId, tenantId: params.tenantId },
      include: {
        person: { include: { creditBalance: true } },
        order: { include: { items: true } },
      },
    });
    if (!original) {
      throw new CreditServiceError("TX_NOT_FOUND", "Transakcija ne postoji.");
    }
    if (original.reversedAt) {
      throw new CreditServiceError(
        "TX_ALREADY_REVERSED",
        "Transakcija je već stornirana.",
      );
    }
    if (original.type === "MONTHLY_RESET" || original.type === "REVERSAL") {
      throw new CreditServiceError(
        "TX_NOT_REVERSIBLE",
        original.type === "REVERSAL"
          ? "Storno ne može da se stornira."
          : "Mesečno zatvaranje ne može da se stornira.",
      );
    }

    const currentBalance = original.person.creditBalance?.balance ?? 0;
    // Suprotan iznos — vraća stanje na ono pre originala (logički).
    const reversalDelta = -original.amount;
    const newBalance = currentBalance + reversalDelta;

    await tx.creditBalance.upsert({
      where: { personId: original.personId },
      update: { balance: newBalance },
      create: {
        tenantId: params.tenantId,
        personId: original.personId,
        balance: newBalance,
      },
    });

    const reversalTx = await tx.creditTransaction.create({
      data: {
        tenantId: params.tenantId,
        personId: original.personId,
        amount: reversalDelta,
        balanceAfter: newBalance,
        type: "REVERSAL",
        note: `Storno: ${reason}`,
        performedById: params.performedByAccountId,
        reversesId: original.id,
      },
    });

    await tx.creditTransaction.update({
      where: { id: original.id },
      data: {
        reversedAt: new Date(),
        reversedById: params.performedByAccountId,
        reversalReason: reason,
      },
    });

    // ORDER specifično: označi porudžbinu otkazanu + opciono vrati stock
    if (original.type === "ORDER" && original.order) {
      await tx.order.update({
        where: { id: original.order.id },
        data: { cancelledAt: new Date() },
      });

      if (params.restoreStock) {
        for (const item of original.order.items) {
          const menu = await tx.menuItem.findFirst({
            where: { id: item.menuItemId, tenantId: params.tenantId },
            select: { id: true, trackStock: true, stock: true },
          });
          if (!menu || !menu.trackStock) continue;

          const newStock = menu.stock + item.quantity;
          await tx.menuItem.update({
            where: { id: menu.id },
            data: { stock: newStock },
          });
          await tx.stockMovement.create({
            data: {
              tenantId: params.tenantId,
              menuItemId: menu.id,
              type: "ADJUSTMENT",
              quantity: item.quantity,
              stockAfter: newStock,
              orderId: original.order.id,
              performedById: params.performedByAccountId,
              note: `Storno porudžbine: ${reason}`,
            },
          });
        }
      }
    }

    return { reversalTx, newBalance };
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
