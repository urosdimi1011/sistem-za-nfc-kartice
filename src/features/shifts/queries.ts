import "server-only";
import { prisma } from "@/lib/prisma";
import { requireTenantId } from "@/lib/auth-helpers";

/**
 * Presek smene — izveštaj prodaje po konobaru i periodu.
 *
 * Sve se izvodi iz postojećih podataka (Order.bartenderId + OrderItem
 * snapshot cene), nema novih tabela. Otkazane porudžbine (storno) se
 * izdvajaju posebno — puno storna kod istog konobara je crvena zastavica.
 */

export interface ShiftReportItem {
  name: string;
  quantity: number;
  revenue: number;
}

export interface ShiftBartenderRow {
  id: string;
  email: string;
  orderCount: number;
  revenue: number;
  cancelledCount: number;
}

export interface ShiftReport {
  orderCount: number;
  totalRevenue: number;
  avgOrder: number;
  cancelledCount: number;
  cancelledValue: number;
  items: ShiftReportItem[];
  /** Razbijanje po konobaru — korisno kad nije izabran konkretan konobar */
  bartenders: ShiftBartenderRow[];
}

export async function getShiftReport(args: {
  bartenderId: string | null;
  from: Date;
  to: Date;
}): Promise<ShiftReport> {
  const tenantId = await requireTenantId();

  const orders = await prisma.order.findMany({
    where: {
      tenantId,
      createdAt: { gte: args.from, lte: args.to },
      ...(args.bartenderId ? { bartenderId: args.bartenderId } : {}),
    },
    select: {
      id: true,
      totalCredits: true,
      cancelledAt: true,
      bartender: { select: { id: true, email: true } },
      items: {
        select: {
          quantity: true,
          creditPriceAtTime: true,
          menuItem: { select: { name: true } },
        },
      },
    },
  });

  let totalRevenue = 0;
  let orderCount = 0;
  let cancelledCount = 0;
  let cancelledValue = 0;

  const itemAgg = new Map<string, ShiftReportItem>();
  const bartenderAgg = new Map<string, ShiftBartenderRow>();

  for (const order of orders) {
    let b = bartenderAgg.get(order.bartender.id);
    if (!b) {
      b = {
        id: order.bartender.id,
        email: order.bartender.email,
        orderCount: 0,
        revenue: 0,
        cancelledCount: 0,
      };
      bartenderAgg.set(order.bartender.id, b);
    }

    if (order.cancelledAt) {
      cancelledCount++;
      cancelledValue += order.totalCredits;
      b.cancelledCount++;
      continue; // otkazane ne ulaze u promet ni u prodato-po-artiklu
    }

    orderCount++;
    totalRevenue += order.totalCredits;
    b.orderCount++;
    b.revenue += order.totalCredits;

    for (const item of order.items) {
      const key = item.menuItem.name;
      const agg = itemAgg.get(key) ?? { name: key, quantity: 0, revenue: 0 };
      agg.quantity += item.quantity;
      agg.revenue += item.quantity * item.creditPriceAtTime;
      itemAgg.set(key, agg);
    }
  }

  return {
    orderCount,
    totalRevenue,
    avgOrder: orderCount > 0 ? Math.round(totalRevenue / orderCount) : 0,
    cancelledCount,
    cancelledValue,
    items: [...itemAgg.values()].sort((a, b) => b.revenue - a.revenue),
    bartenders: [...bartenderAgg.values()].sort((a, b) => b.revenue - a.revenue),
  };
}

export interface BartenderOption {
  id: string;
  email: string;
}

/** Za filter select — svi nalozi koji mogu da kucaju porudžbine. */
export async function listBartenderOptions(): Promise<BartenderOption[]> {
  const tenantId = await requireTenantId();
  return prisma.systemAccount.findMany({
    where: { tenantId, role: { in: ["BARTENDER", "ADMIN"] } },
    orderBy: { email: "asc" },
    select: { id: true, email: true },
  });
}
