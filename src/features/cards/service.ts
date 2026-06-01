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
      | "ALREADY_BLOCKED"
      | "CARD_HAS_HISTORY"
      | "SAME_PERSON",
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

    // Samo AKTIVNA kartica sa istim UID-om blokira registraciju.
    // Deaktivirana (blokirana) kartica oslobađa UID za ponovnu upotrebu.
    const activeByUid = await tx.card.findFirst({
      where: { uid: input.uid, tenantId, isActive: true },
      include: { person: { select: { firstName: true, lastName: true } } },
    });
    if (activeByUid) {
      throw new CardServiceError(
        "UID_TAKEN",
        `Ova kartica je već aktivna na ${activeByUid.person.lastName} ${activeByUid.person.firstName}`,
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

  // U međuvremenu je možda neko drugi dobio karticu sa istim UID-om — ne dozvoli
  // dve aktivne sa istim UID-om (partial unique index bi to ionako odbio).
  const uidActive = await prisma.card.findFirst({
    where: { tenantId, uid: card.uid, isActive: true, id: { not: cardId } },
    include: { person: { select: { firstName: true, lastName: true } } },
  });
  if (uidActive) {
    throw new CardServiceError(
      "UID_TAKEN",
      `Kartica sa ovim UID-om je sada aktivna na ${uidActive.person.lastName} ${uidActive.person.firstName}. Ne može se reaktivirati.`,
    );
  }

  return prisma.card.update({
    where: { id: cardId },
    data: { isActive: true, deactivatedAt: null },
  });
}

/**
 * Prebacuje karticu na drugu osobu (ispravka pogrešne dodele).
 * Bezbedno SAMO ako kartica nema porudžbina — inače bi se mešala istorija
 * potrošnje. Ako ima istoriju, vrati grešku i uputi na deaktivaciju + novu karticu.
 */
export async function reassignCard(
  tenantId: string,
  cardId: string,
  newPersonId: string,
) {
  return prisma.$transaction(async (tx) => {
    const card = await tx.card.findFirst({
      where: { id: cardId, tenantId },
    });
    if (!card)
      throw new CardServiceError("CARD_NOT_FOUND", "Kartica ne postoji");

    if (card.personId === newPersonId) {
      throw new CardServiceError(
        "SAME_PERSON",
        "Kartica je već dodeljena toj osobi.",
      );
    }

    const newPerson = await tx.person.findFirst({
      where: { id: newPersonId, tenantId },
      select: { id: true },
    });
    if (!newPerson) {
      throw new CardServiceError("PERSON_NOT_FOUND", "Osoba ne postoji");
    }

    // Guard: kartica sa istorijom ne sme da se prebaci (mešanje potrošnje)
    const orderCount = await tx.order.count({ where: { cardId } });
    if (orderCount > 0) {
      throw new CardServiceError(
        "CARD_HAS_HISTORY",
        `Ova kartica ima ${orderCount} porudžbina. Ne može se prebaciti (pomešala bi se istorija). Blokiraj je i registruj novu karticu pravoj osobi.`,
        { orderCount },
      );
    }

    // Ako nova osoba već ima aktivnu karticu, ne dozvoli (jedna aktivna po osobi)
    if (card.isActive) {
      const newPersonActiveCard = await tx.card.findFirst({
        where: { tenantId, personId: newPersonId, isActive: true },
      });
      if (newPersonActiveCard) {
        throw new CardServiceError(
          "PERSON_HAS_ACTIVE_CARD",
          "Nova osoba već ima aktivnu karticu.",
        );
      }
    }

    return tx.card.update({
      where: { id: cardId },
      data: { personId: newPersonId },
    });
  });
}
