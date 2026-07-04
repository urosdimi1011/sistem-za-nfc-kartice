import "server-only";
import { prisma } from "@/lib/prisma";
import { getTenantSettings } from "@/features/settings/queries";
import { lockPersonRow } from "@/lib/person-lock";
import type { CreateOrderInput } from "./schemas";
import { PersonType, TransactionType } from "@/lib/enums";

export class OrderServiceError extends Error {
  constructor(
    public code:
      | "CARD_NOT_FOUND"
      | "CARD_BLOCKED"
      | "PERSON_INACTIVE"
      | "ITEM_NOT_AVAILABLE"
      | "INSUFFICIENT_CREDITS"
      | "INSUFFICIENT_STOCK"
      | "DAILY_LIMIT_REACHED"
      | "EMPTY_CART",
    message: string,
    public extra?: Record<string, unknown>,
  ) {
    super(message);
  }
}

export interface BarCardLookup {
  cardId: string;
  uid: string;
  isActive: boolean;
  person: {
    id: string;
    firstName: string;
    lastName: string;
    personType: PersonType;
    isActive: boolean;
    balance: number;
    hasPhoto: boolean;
  };
}

export async function lookupCardByUid(
  tenantId: string,
  uid: string,
): Promise<BarCardLookup | null> {
  const card = await prisma.card.findFirst({
    where: { tenantId, uid },
    include: {
      person: {
        include: { creditBalance: true },
      },
    },
  });
  if (!card) return null;
  // hasPhoto se izvodi iz photoMime stringa (~10 bajtova), ne iz photo bajtova.
  // Bytes ne vučemo u bar terminal — koristi se /api/persons/{id}/photo endpoint.
  const hasPhoto = !!(card.person.photoMime);
  return {
    cardId: card.id,
    uid: card.uid,
    isActive: card.isActive,
    person: {
      id: card.person.id,
      firstName: card.person.firstName,
      lastName: card.person.lastName,
      personType: card.person.personType,
      isActive: card.person.isActive,
      balance: card.person.creditBalance?.balance ?? 0,
      hasPhoto,
    },
  };
}

interface CreateOrderParams extends CreateOrderInput {
  tenantId: string;
  bartenderAccountId: string;
}

/** Prelasci pragova detektovani tokom porudžbine — akcija na osnovu ovoga
 *  šalje email obaveštenja (posle response-a, van transakcije). */
export interface OrderNotifications {
  /** Stanje osobe je OVOM porudžbinom palo ispod praga (tenant pravilo). */
  lowBalance: { personId: string; newBalance: number; threshold: number } | null;
  /** Artikli koji su OVOM porudžbinom pali ispod svog praga zaliha. */
  lowStockItems: Array<{ name: string; stock: number; threshold: number }>;
}

export async function createOrder(params: CreateOrderParams) {
  if (params.items.length === 0) {
    throw new OrderServiceError("EMPTY_CART", "Korpa je prazna");
  }

  const settings = await getTenantSettings(params.tenantId);

  return prisma.$transaction(async (tx) => {
    const card = await tx.card.findFirst({
      where: { id: params.cardId, tenantId: params.tenantId },
      include: { person: true },
    });
    if (!card) {
      throw new OrderServiceError("CARD_NOT_FOUND", "Kartica ne postoji");
    }
    if (!card.isActive) {
      throw new OrderServiceError("CARD_BLOCKED", "Kartica je blokirana");
    }
    if (!card.person.isActive) {
      throw new OrderServiceError("PERSON_INACTIVE", "Osoba je neaktivna");
    }

    // Serijalizuje balance operacije po osobi (dupli klik, dva terminala) —
    // stanje se čita tek POSLE lock-a. Vidi lib/person-lock.ts.
    await lockPersonRow(tx, card.person.id);
    const balanceRow = await tx.creditBalance.findUnique({
      where: { personId: card.person.id },
      select: { balance: true },
    });

    const itemIds = params.items.map((i) => i.menuItemId);
    const menuItems = await tx.menuItem.findMany({
      where: { id: { in: itemIds }, tenantId: params.tenantId },
    });
    const itemMap = new Map(menuItems.map((m) => [m.id, m]));

    for (const cartItem of params.items) {
      const menu = itemMap.get(cartItem.menuItemId);
      if (!menu) {
        throw new OrderServiceError(
          "ITEM_NOT_AVAILABLE",
          `Stavka ne postoji više`,
        );
      }
      if (!menu.isAvailable) {
        throw new OrderServiceError(
          "ITEM_NOT_AVAILABLE",
          `Stavka "${menu.name}" više nije dostupna`,
        );
      }
    }

    let totalCredits = 0;
    const orderItemsData = params.items.map((cartItem) => {
      const menu = itemMap.get(cartItem.menuItemId)!;
      const subtotal = menu.creditPrice * cartItem.quantity;
      totalCredits += subtotal;
      return {
        menuItemId: menu.id,
        quantity: cartItem.quantity,
        creditPriceAtTime: menu.creditPrice,
      };
    });

    const currentBalance = balanceRow?.balance ?? 0;
    const newBalance = currentBalance - totalCredits;

    // STUDENT: blok u minus osim ako tenant settings dozvoljava
    if (
      card.person.personType === PersonType.STUDENT &&
      newBalance < 0 &&
      !settings.allowStudentNegativeBalance
    ) {
      throw new OrderServiceError(
        "INSUFFICIENT_CREDITS",
        `Nedovoljno kredita. Stanje: ${currentBalance}, potrebno: ${totalCredits}`,
        { currentBalance, totalCredits, missing: -newBalance },
      );
    }

    // EMPLOYEE: ako tenant ima limit, ne prelazi ga
    if (
      card.person.personType === PersonType.EMPLOYEE &&
      newBalance < 0 &&
      settings.maxNegativeBalanceEmployee !== null &&
      Math.abs(newBalance) > settings.maxNegativeBalanceEmployee
    ) {
      throw new OrderServiceError(
        "INSUFFICIENT_CREDITS",
        `Premašen maksimalni minus zaposlenog (−${settings.maxNegativeBalanceEmployee}). Stanje bi bilo ${newBalance}.`,
        { currentBalance, totalCredits, missing: -newBalance },
      );
    }

    // ANTI-ZLOUPOTREBA: dnevni limit potrošnje po osobi.
    // Ako je tenant podesio limit, sabiraju se ORDER+MANUAL_DEDUCT za današnji dan.
    // Sprečava da klonirana kartica ispumpa ceo mesečni kredit za par sati.
    if (settings.maxDailySpendPerPerson !== null) {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const todaySpentAgg = await tx.creditTransaction.aggregate({
        where: {
          tenantId: params.tenantId,
          personId: card.person.id,
          type: { in: ["ORDER", "MANUAL_DEDUCT"] },
          createdAt: { gte: startOfDay },
          // Stornirane transakcije ne troše dnevni limit — izveštaji ih
          // takođe tretiraju kao da se nisu desile.
          reversedAt: null,
        },
        _sum: { amount: true },
      });
      // amount za ORDER/DEDUCT je negativan, uzimamo apsolutnu vrednost
      const todaySpent = Math.abs(todaySpentAgg._sum.amount ?? 0);
      const wouldBe = todaySpent + totalCredits;

      if (wouldBe > settings.maxDailySpendPerPerson) {
        const remaining = Math.max(0, settings.maxDailySpendPerPerson - todaySpent);
        throw new OrderServiceError(
          "DAILY_LIMIT_REACHED",
          `Dnevni limit dostignut. Iskorišćeno: ${todaySpent}, limit: ${settings.maxDailySpendPerPerson}, preostalo: ${remaining}.`,
          {
            todaySpent,
            dailyLimit: settings.maxDailySpendPerPerson,
            remaining,
            requested: totalCredits,
          },
        );
      }
    }

    const order = await tx.order.create({
      data: {
        tenantId: params.tenantId,
        cardId: card.id,
        customerId: card.person.id,
        bartenderId: params.bartenderAccountId,
        totalCredits,
        items: { create: orderItemsData },
      },
      include: {
        items: { include: { menuItem: { select: { name: true } } } },
      },
    });

    const lowStockItems: OrderNotifications["lowStockItems"] = [];

    // Inventar: atomska dekrementacija + StockMovement audit + auto-hide na 0.
    // Koristimo conditional UPDATE (updateMany sa where stock >= qty) — ako vrati
    // count=0, race condition smo izgubili (drugi konobar je već potrošio zalihe).
    // Bacamo INSUFFICIENT_STOCK i ceo $transaction se roll-backuje, uključujući
    // order, balance i creditTransaction. Atomski sve-ili-ništa.
    for (const cartItem of params.items) {
      const menu = itemMap.get(cartItem.menuItemId)!;
      if (!menu.trackStock) continue; // stavka se ne prati

      const dec = await tx.menuItem.updateMany({
        where: {
          id: menu.id,
          tenantId: params.tenantId,
          stock: { gte: cartItem.quantity },
        },
        data: { stock: { decrement: cartItem.quantity } },
      });
      if (dec.count === 0) {
        throw new OrderServiceError(
          "INSUFFICIENT_STOCK",
          `Nedovoljno na stanju: "${menu.name}"`,
          { itemName: menu.name, requested: cartItem.quantity, available: menu.stock },
        );
      }

      // Sveže stanje posle dekrementa — `menu.stock` je snapshot od pre
      // updateMany i pod konkurentnim prodajama daje pogrešan stockAfter.
      const fresh = await tx.menuItem.findUniqueOrThrow({
        where: { id: menu.id },
        select: { stock: true },
      });
      const newStock = fresh.stock;

      // Prelazak praga zaliha — samo pri prelasku (pre > prag, sada <= prag)
      // da se admin ne bombarduje mejlom za svaku sledeću prodaju.
      if (
        settings.notifyLowStock &&
        menu.stock > menu.lowStockThreshold &&
        newStock <= menu.lowStockThreshold
      ) {
        lowStockItems.push({
          name: menu.name,
          stock: newStock,
          threshold: menu.lowStockThreshold,
        });
      }

      // Ne diramo isAvailable — UI (bar terminal + karta pića) izvodi
      // status "Nema na stanju" iz trackStock + stock vrednosti. isAvailable
      // je čisto admin-ova ručna kontrola vidljivosti.

      await tx.stockMovement.create({
        data: {
          tenantId: params.tenantId,
          menuItemId: menu.id,
          type: "SALE",
          quantity: -cartItem.quantity,
          stockAfter: newStock,
          orderId: order.id,
          performedById: params.bartenderAccountId,
        },
      });
    }

    await tx.creditBalance.upsert({
      where: { personId: card.person.id },
      update: { balance: newBalance },
      create: {
        tenantId: params.tenantId,
        personId: card.person.id,
        balance: newBalance,
      },
    });

    const note = order.items
      .map((i) => `${i.menuItem.name} × ${i.quantity}`)
      .join(", ");

    await tx.creditTransaction.create({
      data: {
        tenantId: params.tenantId,
        personId: card.person.id,
        amount: -totalCredits,
        balanceAfter: newBalance,
        type: TransactionType.ORDER,
        note,
        performedById: params.bartenderAccountId,
        orderId: order.id,
      },
    });

    // Prelazak praga stanja — samo pri prelasku, ne na svaku kupovinu ispod praga
    const lowBalance =
      settings.notifyLowBalance &&
      newBalance < settings.lowBalanceNotifyThreshold &&
      currentBalance >= settings.lowBalanceNotifyThreshold
        ? {
            personId: card.person.id,
            newBalance,
            threshold: settings.lowBalanceNotifyThreshold,
          }
        : null;

    return {
      orderId: order.id,
      totalCredits,
      newBalance,
      personName: `${card.person.firstName} ${card.person.lastName}`,
      notifications: { lowBalance, lowStockItems } satisfies OrderNotifications,
    };
  });
}
