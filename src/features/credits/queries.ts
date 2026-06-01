import "server-only";
import { prisma } from "@/lib/prisma";
import { requireTenantId } from "@/lib/auth-helpers";
import type { PersonType, TransactionType } from "@/lib/enums";
import type { TransactionsQuery } from "./schemas";

export interface TransactionListItem {
  id: string;
  amount: number;
  balanceAfter: number;
  type: TransactionType;
  note: string | null;
  createdAt: Date;
  person: {
    id: string;
    firstName: string;
    lastName: string;
    personType: PersonType;
  };
  performedBy: { email: string };
  // Storno meta
  reversedAt: Date | null;
  reversalReason: string | null;
  reversedBy: { email: string } | null;
  reversesId: string | null;
  orderId: string | null;
}

export interface TransactionsListResult {
  items: TransactionListItem[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}

export async function listTransactions(
  query: TransactionsQuery,
): Promise<TransactionsListResult> {
  const tenantId = await requireTenantId();
  const { search, personId, type, dateFrom, dateTo, page, perPage, sort, order } =
    query;

  const where: Record<string, unknown> = { tenantId };

  if (personId) where.personId = personId;
  if (type !== "ALL") where.type = type;
  if (dateFrom || dateTo) {
    where.createdAt = {
      ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
      ...(dateTo ? { lte: new Date(`${dateTo}T23:59:59.999Z`) } : {}),
    };
  }
  if (search && search.length > 0) {
    // Multi-token search — vidi people/queries.ts za detalje
    const tokens = search.trim().split(/\s+/).filter((t) => t.length > 0);
    if (tokens.length > 0) {
      where.person = {
        AND: tokens.map((t) => ({
          OR: [
            { firstName: { contains: t, mode: "insensitive" } },
            { lastName: { contains: t, mode: "insensitive" } },
          ],
        })),
      };
    }
  }

  const [total, rows] = await Promise.all([
    prisma.creditTransaction.count({ where }),
    prisma.creditTransaction.findMany({
      where,
      orderBy: { [sort]: order },
      skip: (page - 1) * perPage,
      take: perPage,
      select: {
        id: true,
        amount: true,
        balanceAfter: true,
        type: true,
        note: true,
        createdAt: true,
        person: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            personType: true,
          },
        },
        performedBy: { select: { email: true } },
        reversedAt: true,
        reversalReason: true,
        reversedBy: { select: { email: true } },
        reversesId: true,
        orderId: true,
      },
    }),
  ]);

  return {
    items: rows,
    total,
    page,
    perPage,
    totalPages: Math.max(1, Math.ceil(total / perPage)),
  };
}

export async function getRecentTransactionsForPerson(personId: string, limit = 5) {
  const tenantId = await requireTenantId();
  return prisma.creditTransaction.findMany({
    where: { personId, tenantId },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      amount: true,
      balanceAfter: true,
      type: true,
      note: true,
      createdAt: true,
      performedBy: { select: { email: true } },
    },
  });
}
