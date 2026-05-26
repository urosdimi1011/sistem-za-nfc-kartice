import "server-only";
import { prisma } from "@/lib/prisma";
import { requireTenantId } from "@/lib/auth-helpers";

/**
 * Statistika tekuće smene za bar terminal — koliko je danas naplaćeno + broj porudžbina.
 * Koristi se kao mali brojač na scan ekranu da konobar vidi produktivnost.
 *
 * Vraća sumu apsolutne vrednosti ORDER transakcija od početka dana.
 */
export async function getBarSessionStats(): Promise<{
  todayOrderCount: number;
  todayRevenue: number;
}> {
  const tenantId = await requireTenantId();
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const [count, agg] = await Promise.all([
    prisma.order.count({
      where: { tenantId, createdAt: { gte: startOfDay } },
    }),
    prisma.creditTransaction.aggregate({
      where: {
        tenantId,
        type: "ORDER",
        createdAt: { gte: startOfDay },
      },
      _sum: { amount: true },
    }),
  ]);

  // ORDER amount je negativan, uzimamo apsolutnu vrednost
  return {
    todayOrderCount: count,
    todayRevenue: Math.abs(agg._sum.amount ?? 0),
  };
}
