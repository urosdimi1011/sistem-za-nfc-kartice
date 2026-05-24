import "server-only";
import { prisma } from "@/lib/prisma";
import type { CardRegisterInput } from "./schemas";

export class CardServiceError extends Error {
  constructor(
    public code:
      | "UID_TAKEN"
      | "PERSON_HAS_ACTIVE_CARD"
      | "PERSON_NOT_FOUND"
      | "CARD_NOT_FOUND"
      | "ALREADY_ACTIVE"
      | "ALREADY_BLOCKED",
    message: string,
    public extra?: Record<string, unknown>,
  ) {
    super(message);
  }
}

export async function registerCard(
  tenantId: string,
  input: CardRegisterInput,
  performedByAccountId: string,
) {
  return prisma.$transaction(async (tx) => {
    const person = await tx.person.findFirst({
      where: { id: input.personId, tenantId },
      select: { id: true, isActive: true },
    });
    if (!person) {
      throw new CardServiceError("PERSON_NOT_FOUND", "Osoba ne postoji");
    }

    const existingByUid = await tx.card.findFirst({
      where: { uid: input.uid, tenantId },
      include: { person: { select: { firstName: true, lastName: true } } },
    });
    if (existingByUid) {
      throw new CardServiceError(
        "UID_TAKEN",
        `Ova kartica je već registrovana na ${existingByUid.person.lastName} ${existingByUid.person.firstName}`,
      );
    }

    const activeCard = await tx.card.findFirst({
      where: { tenantId, personId: person.id, isActive: true },
    });

    if (activeCard && !input.replaceExisting) {
      throw new CardServiceError(
        "PERSON_HAS_ACTIVE_CARD",
        "Osoba već ima aktivnu karticu",
        { activeCardId: activeCard.id, activeUid: activeCard.uid },
      );
    }

    const newCard = await tx.card.create({
      data: {
        tenantId,
        uid: input.uid,
        personId: person.id,
        registeredById: performedByAccountId,
      },
    });

    if (activeCard) {
      await tx.card.update({
        where: { id: activeCard.id },
        data: {
          isActive: false,
          deactivatedAt: new Date(),
          replacedById: newCard.id,
        },
      });
    }

    return newCard;
  });
}

export async function blockCard(tenantId: string, cardId: string) {
  const card = await prisma.card.findFirst({ where: { id: cardId, tenantId } });
  if (!card) throw new CardServiceError("CARD_NOT_FOUND", "Kartica ne postoji");
  if (!card.isActive)
    throw new CardServiceError("ALREADY_BLOCKED", "Kartica je već blokirana");

  return prisma.card.update({
    where: { id: cardId },
    data: { isActive: false, deactivatedAt: new Date() },
  });
}

export async function reactivateCard(tenantId: string, cardId: string) {
  const card = await prisma.card.findFirst({ where: { id: cardId, tenantId } });
  if (!card) throw new CardServiceError("CARD_NOT_FOUND", "Kartica ne postoji");
  if (card.isActive)
    throw new CardServiceError("ALREADY_ACTIVE", "Kartica je već aktivna");

  const otherActive = await prisma.card.findFirst({
    where: {
      tenantId,
      personId: card.personId,
      isActive: true,
      id: { not: cardId },
    },
  });
  if (otherActive) {
    throw new CardServiceError(
      "PERSON_HAS_ACTIVE_CARD",
      "Osoba već ima drugu aktivnu karticu. Prvo blokiraj nju.",
      { activeCardId: otherActive.id, activeUid: otherActive.uid },
    );
  }

  return prisma.card.update({
    where: { id: cardId },
    data: { isActive: true, deactivatedAt: null },
  });
}
