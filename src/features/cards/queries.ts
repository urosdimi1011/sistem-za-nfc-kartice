import "server-only";
import { prisma } from "@/lib/prisma";
import { requireTenantId } from "@/lib/auth-helpers";
import type { PersonType } from "@/lib/enums";
import type { CardsQuery } from "./schemas";

export interface CardListItem {
  id: string;
  uid: string;
  isActive: boolean;
  registeredAt: Date;
  deactivatedAt: Date | null;
  person: {
    id: string;
    firstName: string;
    lastName: string;
    personType: PersonType;
    isActive: boolean;
  };
  registeredBy: {
    email: string;
  };
  orderCount: number;
  isReplaced: boolean;
}

export interface CardsListResult {
  items: CardListItem[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}

export async function listCards(query: CardsQuery): Promise<CardsListResult> {
  const tenantId = await requireTenantId();
  const { search, personId, status, page, perPage, sort, order } = query;

  const where: Record<string, unknown> = { tenantId };

  if (personId) where.personId = personId;
  if (status !== "ALL") where.isActive = status === "ACTIVE";
  if (search && search.length > 0) {
    const term = search.trim();
    where.person = {
      OR: [
        { firstName: { contains: term, mode: "insensitive" } },
        { lastName: { contains: term, mode: "insensitive" } },
      ],
    };
  }

  const [total, rows] = await Promise.all([
    prisma.card.count({ where }),
    prisma.card.findMany({
      where,
      orderBy: { [sort]: order },
      skip: (page - 1) * perPage,
      take: perPage,
      select: {
        id: true,
        uid: true,
        isActive: true,
        registeredAt: true,
        deactivatedAt: true,
        replacedById: true,
        person: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            personType: true,
            isActive: true,
          },
        },
        registeredBy: { select: { email: true } },
        _count: { select: { orders: true } },
      },
    }),
  ]);

  return {
    items: rows.map((r) => ({
      id: r.id,
      uid: r.uid,
      isActive: r.isActive,
      registeredAt: r.registeredAt,
      deactivatedAt: r.deactivatedAt,
      person: r.person,
      registeredBy: r.registeredBy,
      orderCount: r._count.orders,
      isReplaced: !!r.replacedById,
    })),
    total,
    page,
    perPage,
    totalPages: Math.max(1, Math.ceil(total / perPage)),
  };
}

export async function searchPeopleForCard(
  search: string,
  cursor: string | null = null,
  pageSize = 20,
) {
  const tenantId = await requireTenantId();
  const term = search.trim();
  const items = await prisma.person.findMany({
    where: {
      tenantId,
      isActive: true,
      ...(term.length > 0
        ? {
            OR: [
              { firstName: { contains: term, mode: "insensitive" } },
              { lastName: { contains: term, mode: "insensitive" } },
              { jmbg: { contains: term } },
            ],
          }
        : {}),
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: pageSize + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    select: {
      id: true,
      firstName: true,
      lastName: true,
      jmbg: true,
      personType: true,
      cards: {
        where: { isActive: true },
        select: { id: true, uid: true },
        take: 1,
      },
    },
  });

  const hasMore = items.length > pageSize;
  const trimmed = hasMore ? items.slice(0, pageSize) : items;
  const nextCursor = hasMore ? trimmed[trimmed.length - 1].id : null;

  return { items: trimmed, hasMore, nextCursor };
}

export async function getPersonForFilter(personId: string) {
  const tenantId = await requireTenantId();
  return prisma.person.findFirst({
    where: { id: personId, tenantId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      personType: true,
      jmbg: true,
    },
  });
}

export async function findCardByUid(uid: string) {
  const tenantId = await requireTenantId();
  return prisma.card.findFirst({
    where: { uid, tenantId },
    include: {
      person: {
        select: { firstName: true, lastName: true },
      },
    },
  });
}
