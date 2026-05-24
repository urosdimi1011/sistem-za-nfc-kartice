import "server-only";
import { startOfDay, startOfMonth, subDays, format } from "date-fns";

import { prisma } from "@/lib/prisma";
import { requireTenantId } from "@/lib/auth-helpers";
import type { PersonType, TransactionType } from "@/lib/enums";

export interface DashboardKpis {
  todayRevenue: number;
  monthRevenue: number;
  activePeople: number;
  activeCards: number;
  todayTransactionCount: number;
  monthOrderCount: number;
}

export interface TopMenuItemRow {
  menuItemId: string;
  name: string;
  totalQuantity: number;
}

export interface NegativeBalanceRow {
  personId: string;
  firstName: string;
  lastName: string;
  personType: PersonType;
  balance: number;
}

export interface DailyRevenueRow {
  date: string; // yyyy-MM-dd
  label: string; // e.g. "pon", "uto"
  revenue: number;
}

export interface RecentTxRow {
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
}

export interface DashboardData {
  kpis: DashboardKpis;
  topItems: TopMenuItemRow[];
  employeesNegative: NegativeBalanceRow[];
  studentsLowBalance: NegativeBalanceRow[];
  dailyRevenue: DailyRevenueRow[];
  recent: RecentTxRow[];
}

const DAY_LABELS_SR = ["ned", "pon", "uto", "sre", "čet", "pet", "sub"];

/**
 * Vraća sve dashboard agregacije u jednom pozivu.
 * Sve query-jevi se izvršavaju paralelno preko Promise.all.
 */
export async function getDashboardData(): Promise<DashboardData> {
  const tenantId = await requireTenantId();
  const now = new Date();
  const startToday = startOfDay(now);
  const startMonth = startOfMonth(now);
  const startSevenDaysAgo = startOfDay(subDays(now, 6)); // uključuje danas = 7 dana

  const [
    todayRevenueAgg,
    monthRevenueAgg,
    activePeople,
    activeCards,
    todayTxCount,
    monthOrderCount,
    topItemsRaw,
    employeesNegativeRaw,
    studentsLowBalanceRaw,
    dailyRevenueRaw,
    recent,
  ] = await Promise.all([
    // KPI: današnji prihod (ORDER transakcije, amount je negativan, uzimamo apsolutnu vrednost)
    prisma.creditTransaction.aggregate({
      where: { tenantId, type: "ORDER", createdAt: { gte: startToday } },
      _sum: { amount: true },
    }),
    prisma.creditTransaction.aggregate({
      where: { tenantId, type: "ORDER", createdAt: { gte: startMonth } },
      _sum: { amount: true },
    }),
    prisma.person.count({ where: { tenantId, isActive: true } }),
    prisma.card.count({ where: { tenantId, isActive: true } }),
    prisma.creditTransaction.count({
      where: { tenantId, createdAt: { gte: startToday } },
    }),
    prisma.order.count({
      where: { tenantId, createdAt: { gte: startMonth } },
    }),

    // Top stavke ovog meseca
    prisma.orderItem.groupBy({
      by: ["menuItemId"],
      where: {
        order: { tenantId, createdAt: { gte: startMonth } },
      },
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: 5,
    }),

    // Zaposleni sa najnegativnijim stanjem
    prisma.creditBalance.findMany({
      where: {
        tenantId,
        balance: { lt: 0 },
        person: { isActive: true, personType: "EMPLOYEE" },
      },
      orderBy: { balance: "asc" },
      take: 5,
      include: {
        person: {
          select: { id: true, firstName: true, lastName: true, personType: true },
        },
      },
    }),

    // Učenici sa malim stanjem (< 200 kredita)
    prisma.creditBalance.findMany({
      where: {
        tenantId,
        balance: { lt: 200, gte: 0 },
        person: { isActive: true, personType: "STUDENT" },
      },
      orderBy: { balance: "asc" },
      take: 5,
      include: {
        person: {
          select: { id: true, firstName: true, lastName: true, personType: true },
        },
      },
    }),

    // Dnevni prihod zadnjih 7 dana — sirovi podaci, grupisanje u JS-u
    prisma.creditTransaction.findMany({
      where: {
        tenantId,
        type: "ORDER",
        createdAt: { gte: startSevenDaysAgo },
      },
      select: { amount: true, createdAt: true },
    }),

    // Najnovije transakcije
    prisma.creditTransaction.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      take: 8,
      select: {
        id: true,
        amount: true,
        balanceAfter: true,
        type: true,
        note: true,
        createdAt: true,
        person: {
          select: { id: true, firstName: true, lastName: true, personType: true },
        },
      },
    }),
  ]);

  // Resolve menu item names za top stavke
  const topItemIds = topItemsRaw.map((t) => t.menuItemId);
  const menuItemNames = await prisma.menuItem.findMany({
    where: { id: { in: topItemIds }, tenantId },
    select: { id: true, name: true },
  });
  const nameMap = new Map(menuItemNames.map((m) => [m.id, m.name]));

  const topItems: TopMenuItemRow[] = topItemsRaw.map((t) => ({
    menuItemId: t.menuItemId,
    name: nameMap.get(t.menuItemId) ?? "(obrisano)",
    totalQuantity: t._sum.quantity ?? 0,
  }));

  // Grupiši dnevni prihod
  const dailyMap = new Map<string, number>();
  for (let i = 0; i < 7; i++) {
    const d = subDays(now, 6 - i);
    dailyMap.set(format(d, "yyyy-MM-dd"), 0);
  }
  for (const tx of dailyRevenueRaw) {
    const key = format(tx.createdAt, "yyyy-MM-dd");
    if (dailyMap.has(key)) {
      dailyMap.set(key, (dailyMap.get(key) ?? 0) + Math.abs(tx.amount));
    }
  }
  const dailyRevenue: DailyRevenueRow[] = Array.from(dailyMap.entries()).map(
    ([date, revenue]) => {
      const d = new Date(date + "T00:00:00");
      return {
        date,
        label: DAY_LABELS_SR[d.getDay()],
        revenue,
      };
    },
  );

  return {
    kpis: {
      todayRevenue: Math.abs(todayRevenueAgg._sum.amount ?? 0),
      monthRevenue: Math.abs(monthRevenueAgg._sum.amount ?? 0),
      activePeople,
      activeCards,
      todayTransactionCount: todayTxCount,
      monthOrderCount,
    },
    topItems,
    employeesNegative: employeesNegativeRaw.map((b) => ({
      personId: b.person.id,
      firstName: b.person.firstName,
      lastName: b.person.lastName,
      personType: b.person.personType,
      balance: b.balance,
    })),
    studentsLowBalance: studentsLowBalanceRaw.map((b) => ({
      personId: b.person.id,
      firstName: b.person.firstName,
      lastName: b.person.lastName,
      personType: b.person.personType,
      balance: b.balance,
    })),
    dailyRevenue,
    recent,
  };
}
