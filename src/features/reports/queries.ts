import "server-only";
import { startOfMonth, endOfMonth } from "date-fns";

import { prisma } from "@/lib/prisma";
import { requireTenantId } from "@/lib/auth-helpers";
import type { PersonType, TransactionType } from "@/lib/enums";

export interface MonthlyPersonRow {
  personId: string;
  firstName: string;
  lastName: string;
  personType: PersonType;
  currentBalance: number;
  monthSpent: number; // apsolutni iznos ORDER + MANUAL_DEDUCT u mesecu
  monthTopups: number;
  orderCount: number;
  hasEmail: boolean;
  groupId: string | null;
  groupName: string | null;
  groupShortName: string | null;
}

export interface MonthlyReportData {
  year: number;
  month: number;
  rows: MonthlyPersonRow[];
  isClosed: boolean;
  closedAt: Date | null;
  closedByEmail: string | null;
  totalNegativeEmployees: number; // sum |balance| for employees < 0 (current snapshot)
  employeesInNegative: number;
  // Paginacija meta
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
  /** Broj osoba sa nekom aktivnošću u mesecu (pre paginacije, posle search filtera) */
  withActivityCount: number;
  /** Broj svih osoba u tenantu/tipu (pre filtera) */
  totalPeopleInScope: number;
}

function monthBounds(year: number, month: number) {
  const start = startOfMonth(new Date(year, month - 1, 1));
  const end = endOfMonth(start);
  return { start, end };
}

export interface GetMonthlyReportArgs {
  year: number;
  month: number;
  personType?: PersonType | "ALL" | null;
  groupId?: string | null; // "__none__" za "Bez dodele"
  search?: string;
  onlyWithActivity?: boolean;
  page?: number;
  perPage?: number;
}

/**
 * Vraća paginirani pregled osoba sa mesečnim statistikama.
 * Pretraga po imenu/prezimenu/JMBG-u, filter "samo osobe sa transakcijama".
 * Sortirano: prvo oni sa najvećom potrošnjom u mesecu.
 */
export async function getMonthlyReport(
  args: GetMonthlyReportArgs,
): Promise<MonthlyReportData> {
  const {
    year,
    month,
    personType = null,
    groupId = null,
    search,
    onlyWithActivity = true,
    page = 1,
    perPage = 50,
  } = args;

  const tenantId = await requireTenantId();
  const { start, end } = monthBounds(year, month);
  const typeFilter = personType && personType !== "ALL" ? personType : null;
  const searchTerm = search?.trim();

  const peopleWhere: Record<string, unknown> = {
    tenantId,
    isActive: true,
    ...(typeFilter ? { personType: typeFilter } : {}),
  };
  if (searchTerm && searchTerm.length > 0) {
    // Multi-token — vidi people/queries.ts
    const tokens = searchTerm.split(/\s+/).filter((t) => t.length > 0);
    if (tokens.length > 0) {
      peopleWhere.AND = tokens.map((t) => ({
        OR: [
          { firstName: { contains: t, mode: "insensitive" } },
          { lastName: { contains: t, mode: "insensitive" } },
          { jmbg: { contains: t } },
        ],
      }));
    }
  }
  if (groupId === "__none__") {
    peopleWhere.groupId = null;
  } else if (groupId) {
    peopleWhere.groupId = groupId;
  }

  const totalPeopleInScopeWhere = {
    tenantId,
    isActive: true,
    ...(typeFilter ? { personType: typeFilter } : {}),
  };

  const [people, txAggregates, monthlyClose, totalPeopleInScope] = await Promise.all([
    prisma.person.findMany({
      where: peopleWhere,
      include: {
        creditBalance: { select: { balance: true } },
        group: { select: { id: true, name: true, shortName: true } },
      },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    }),
    prisma.creditTransaction.groupBy({
      by: ["personId", "type"],
      where: {
        tenantId,
        createdAt: { gte: start, lte: end },
      },
      _sum: { amount: true },
      _count: { id: true },
    }),
    prisma.monthlyClose.findFirst({
      where: { tenantId, year, month },
      include: { closedBy: { select: { email: true } } },
    }),
    prisma.person.count({ where: totalPeopleInScopeWhere }),
  ]);

  // Mapa po personId za brz lookup
  type AggKey = `${string}:${TransactionType}`;
  const aggMap = new Map<AggKey, { sum: number; count: number }>();
  for (const a of txAggregates) {
    aggMap.set(`${a.personId}:${a.type}`, {
      sum: a._sum.amount ?? 0,
      count: a._count.id,
    });
  }

  const rows: MonthlyPersonRow[] = people.map((p) => {
    const orderAgg = aggMap.get(`${p.id}:ORDER`) ?? { sum: 0, count: 0 };
    const manualDeductAgg = aggMap.get(`${p.id}:MANUAL_DEDUCT`) ?? { sum: 0, count: 0 };
    const topupAgg = aggMap.get(`${p.id}:TOPUP`) ?? { sum: 0, count: 0 };
    const spent = Math.abs(orderAgg.sum) + Math.abs(manualDeductAgg.sum);

    return {
      personId: p.id,
      firstName: p.firstName,
      lastName: p.lastName,
      personType: p.personType,
      currentBalance: p.creditBalance?.balance ?? 0,
      monthSpent: spent,
      monthTopups: topupAgg.sum,
      orderCount: orderAgg.count,
      hasEmail: !!p.email,
      groupId: p.group?.id ?? null,
      groupName: p.group?.name ?? null,
      groupShortName: p.group?.shortName ?? null,
    };
  });

  // Statistike za "zatvaranje meseca" — uvek na PUNOM skupu (ne zavise od filtera)
  const employeesInNegativeRows = rows.filter(
    (r) => r.personType === "EMPLOYEE" && r.currentBalance < 0,
  );
  const totalNegativeEmployees = employeesInNegativeRows.reduce(
    (sum, r) => sum + Math.abs(r.currentBalance),
    0,
  );

  // Broj osoba sa nekom aktivnošću u mesecu (pre paginacije, posle search filtera)
  const withActivityCount = rows.filter(
    (r) => r.monthSpent > 0 || r.monthTopups > 0 || r.orderCount > 0,
  ).length;

  // Primeni "samo sa aktivnošću" filter ako traženo
  let filteredRows = rows;
  if (onlyWithActivity) {
    filteredRows = rows.filter(
      (r) => r.monthSpent > 0 || r.monthTopups > 0 || r.orderCount > 0,
    );
  }

  // Sort po potrošnji DESC (oni koji najviše duguju gore)
  filteredRows.sort((a, b) => b.monthSpent - a.monthSpent);

  const total = filteredRows.length;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start_ = (safePage - 1) * perPage;
  const paged = filteredRows.slice(start_, start_ + perPage);

  return {
    year,
    month,
    rows: paged,
    isClosed: !!monthlyClose,
    closedAt: monthlyClose?.closedAt ?? null,
    closedByEmail: monthlyClose?.closedBy.email ?? null,
    totalNegativeEmployees,
    employeesInNegative: employeesInNegativeRows.length,
    total,
    page: safePage,
    perPage,
    totalPages,
    withActivityCount,
    totalPeopleInScope,
  };
}

export interface PersonReportTransaction {
  id: string;
  amount: number;
  balanceAfter: number;
  type: TransactionType;
  note: string | null;
  createdAt: Date;
  performedByEmail: string;
}

export interface PersonReportData {
  person: {
    id: string;
    firstName: string;
    lastName: string;
    personType: PersonType;
    jmbg: string | null;
    phone: string | null;
    email: string | null;
    currentBalance: number;
    groupName: string | null;
  };
  groupLabel: string; // npr "Škola"
  tenant: {
    name: string;
    address: string | null;
    phone: string | null;
    email: string | null;
  };
  period: {
    year: number;
    month: number;
    label: string;
    start: Date;
    end: Date;
  };
  transactions: PersonReportTransaction[];
  totals: {
    spent: number; // |ORDER + MANUAL_DEDUCT|
    toppedUp: number; // TOPUP
    netChange: number; // potpisan: krajnji - početni
    orderCount: number;
  };
}

const MONTH_NAMES_SR = [
  "Januar",
  "Februar",
  "Mart",
  "April",
  "Maj",
  "Jun",
  "Jul",
  "Avgust",
  "Septembar",
  "Oktobar",
  "Novembar",
  "Decembar",
];

/**
 * Dohvaćeni svi podaci potrebni za PDF izveštaj jedne osobe u jednom mesecu.
 */
export async function getPersonReport(
  personId: string,
  year: number,
  month: number,
): Promise<PersonReportData | null> {
  const tenantId = await requireTenantId();
  const { start, end } = monthBounds(year, month);

  const [person, tenant, transactions] = await Promise.all([
    prisma.person.findFirst({
      where: { id: personId, tenantId },
      include: {
        creditBalance: { select: { balance: true } },
        group: { select: { name: true } },
      },
    }),
    prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { name: true, address: true, phone: true, email: true, settings: true },
    }),
    prisma.creditTransaction.findMany({
      where: {
        tenantId,
        personId,
        createdAt: { gte: start, lte: end },
      },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        amount: true,
        balanceAfter: true,
        type: true,
        note: true,
        createdAt: true,
        performedBy: { select: { email: true } },
      },
    }),
  ]);

  if (!person || !tenant) return null;

  let spent = 0;
  let toppedUp = 0;
  let orderCount = 0;
  for (const t of transactions) {
    if (t.type === "ORDER" || t.type === "MANUAL_DEDUCT") spent += Math.abs(t.amount);
    if (t.type === "TOPUP") toppedUp += t.amount;
    if (t.type === "ORDER") orderCount++;
  }
  const netChange = transactions.reduce((s, t) => s + t.amount, 0);

  const settings = (tenant.settings ?? {}) as { groupLabel?: string };
  const tenantOut = {
    name: tenant.name,
    address: tenant.address,
    phone: tenant.phone,
    email: tenant.email,
  };

  return {
    person: {
      id: person.id,
      firstName: person.firstName,
      lastName: person.lastName,
      personType: person.personType,
      jmbg: person.jmbg,
      phone: person.phone,
      email: person.email,
      currentBalance: person.creditBalance?.balance ?? 0,
      groupName: person.group?.name ?? null,
    },
    groupLabel: settings.groupLabel ?? "Grupa",
    tenant: tenantOut,
    period: {
      year,
      month,
      label: `${MONTH_NAMES_SR[month - 1]} ${year}`,
      start,
      end,
    },
    transactions: transactions.map((t) => ({
      id: t.id,
      amount: t.amount,
      balanceAfter: t.balanceAfter,
      type: t.type,
      note: t.note,
      createdAt: t.createdAt,
      performedByEmail: t.performedBy.email,
    })),
    totals: { spent, toppedUp, netChange, orderCount },
  };
}

/**
 * Lagana query samo za brojače u filter bar-u ("X od Y").
 * Ne računa transakcije ni stanja — samo COUNT(*) po scope-u.
 * Koristi se izvan <Suspense> boundary-ja na izvestaji stranici, da brojači
 * uvek budu sveži a ne nestaju tokom skeleton fallback-a.
 */
export async function getReportFilterCounts(args: {
  year: number;
  month: number;
  personType?: PersonType | "ALL" | null;
  groupId?: string | null;
  search?: string;
}): Promise<{ totalPeopleInScope: number; withActivityCount: number }> {
  const tenantId = await requireTenantId();
  const { year, month, personType, groupId, search } = args;
  const { start, end } = monthBounds(year, month);
  const typeFilter = personType && personType !== "ALL" ? personType : null;
  const searchTerm = search?.trim();

  const where: Record<string, unknown> = {
    tenantId,
    isActive: true,
    ...(typeFilter ? { personType: typeFilter } : {}),
  };
  if (groupId === "__none__") where.groupId = null;
  else if (groupId) where.groupId = groupId;
  if (searchTerm && searchTerm.length > 0) {
    const tokens = searchTerm.split(/\s+/).filter((t) => t.length > 0);
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

  const [totalPeopleInScope, withActivityCount] = await Promise.all([
    prisma.person.count({ where }),
    prisma.person.count({
      where: {
        ...where,
        transactions: {
          some: { createdAt: { gte: start, lte: end } },
        },
      },
    }),
  ]);

  return { totalPeopleInScope, withActivityCount };
}

export async function listMonthlyCloses(yearOpt?: number) {
  const tenantId = await requireTenantId();
  return prisma.monthlyClose.findMany({
    where: { tenantId, ...(yearOpt ? { year: yearOpt } : {}) },
    orderBy: [{ year: "desc" }, { month: "desc" }],
    include: { closedBy: { select: { email: true } } },
  });
}
