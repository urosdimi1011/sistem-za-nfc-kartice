import "server-only";
import { prisma } from "@/lib/prisma";
import { requireTenantId } from "@/lib/auth-helpers";
import type { PersonType } from "@/lib/enums";
import type { PeopleQuery } from "./schemas";

export interface PersonListItem {
  id: string;
  firstName: string;
  lastName: string;
  jmbg: string | null;
  phone: string | null;
  email: string | null;
  dateOfBirth: Date | null;
  note: string | null;
  personType: PersonType;
  isActive: boolean;
  balance: number;
  hasCard: boolean;
  groupId: string | null;
  groupName: string | null;
  groupShortName: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PeopleListResult {
  items: PersonListItem[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}

export async function listPeople(query: PeopleQuery): Promise<PeopleListResult> {
  const tenantId = await requireTenantId();
  const { search, type, status, groupId, page, perPage, sort, order } = query;

  const where: Record<string, unknown> = { tenantId };

  if (type !== "ALL") where.personType = type;
  if (status !== "ALL") where.isActive = status === "ACTIVE";
  if (groupId === "__none__") {
    where.groupId = null;
  } else if (groupId) {
    where.groupId = groupId;
  }
  if (search && search.length > 0) {
    // Multi-token search: razdvoji upit po razmacima i traži da SVAKI token
    // postoji u nekom polju (firstName, lastName ili jmbg). Time radi:
    //   "Petar Petr" → matches Petar Petrović (token1 u firstName, token2 u lastName)
    //   "Petr Pe"    → matches Petar Petrović (oba u različitim poljima)
    //   "Petar"      → matches Petar Petrović (jedan token, jedno polje)
    //   "12345"      → matches JMBG koji počinje sa 12345
    const tokens = search.trim().split(/\s+/).filter((t) => t.length > 0);
    if (tokens.length > 0) {
      where.AND = tokens.map((t) => ({
        OR: [
          { firstName: { contains: t, mode: "insensitive" } },
          { lastName: { contains: t, mode: "insensitive" } },
          { jmbg: { contains: t } },
        ],
      }));
    }
  }

  const [total, rows] = await Promise.all([
    prisma.person.count({ where }),
    prisma.person.findMany({
      where,
      orderBy: { [sort]: order },
      skip: (page - 1) * perPage,
      take: perPage,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        jmbg: true,
        phone: true,
        email: true,
        dateOfBirth: true,
        note: true,
        personType: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        creditBalance: { select: { balance: true } },
        cards: {
          where: { isActive: true },
          select: { id: true },
          take: 1,
        },
        group: { select: { id: true, name: true, shortName: true } },
      },
    }),
  ]);

  return {
    items: rows.map((r) => ({
      id: r.id,
      firstName: r.firstName,
      lastName: r.lastName,
      jmbg: r.jmbg,
      phone: r.phone,
      email: r.email,
      dateOfBirth: r.dateOfBirth,
      note: r.note,
      personType: r.personType,
      isActive: r.isActive,
      balance: r.creditBalance?.balance ?? 0,
      hasCard: r.cards.length > 0,
      groupId: r.group?.id ?? null,
      groupName: r.group?.name ?? null,
      groupShortName: r.group?.shortName ?? null,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    })),
    total,
    page,
    perPage,
    totalPages: Math.max(1, Math.ceil(total / perPage)),
  };
}

export async function getPersonById(id: string) {
  const tenantId = await requireTenantId();
  return prisma.person.findFirst({
    where: { id, tenantId },
    include: {
      creditBalance: true,
      cards: { orderBy: { registeredAt: "desc" } },
      group: { select: { id: true, name: true, shortName: true } },
    },
  });
}
