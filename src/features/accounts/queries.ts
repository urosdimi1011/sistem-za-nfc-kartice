import "server-only";
import { prisma } from "@/lib/prisma";
import { requireTenantId } from "@/lib/auth-helpers";
import type { SystemRole } from "@/lib/enums";
import type { AccountsQuery } from "./schemas";

export interface AccountListItem {
  id: string;
  email: string;
  role: SystemRole;
  isActive: boolean;
  createdAt: Date;
  lastLoginAt: Date | null;
  passwordChangedAt: Date;
  person: {
    id: string;
    firstName: string;
    lastName: string;
  } | null;
  createdBy: { email: string } | null;
}

export interface AccountsListResult {
  items: AccountListItem[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}

export async function listAccounts(query: AccountsQuery): Promise<AccountsListResult> {
  const tenantId = await requireTenantId();
  const { search, role, status, page, perPage } = query;

  const where: Record<string, unknown> = { tenantId };

  if (role !== "ALL") where.role = role;
  if (status !== "ALL") where.isActive = status === "ACTIVE";
  if (search && search.length > 0) {
    where.email = { contains: search.trim(), mode: "insensitive" };
  }

  const [total, rows] = await Promise.all([
    prisma.systemAccount.count({ where }),
    prisma.systemAccount.findMany({
      where,
      orderBy: [{ isActive: "desc" }, { role: "asc" }, { email: "asc" }],
      skip: (page - 1) * perPage,
      take: perPage,
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        lastLoginAt: true,
        passwordChangedAt: true,
        person: {
          select: { id: true, firstName: true, lastName: true },
        },
        createdBy: { select: { email: true } },
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
