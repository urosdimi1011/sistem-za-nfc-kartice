import "server-only";
import { prisma } from "@/lib/prisma";
import { requireTenantId } from "@/lib/auth-helpers";
import type { InventoryQuery } from "./schemas";
import type { StockMovementType } from "@/generated/prisma/enums";

export type InventoryStatus = "OK" | "LOW" | "OUT";

export interface InventoryRow {
  id: string;
  name: string;
  icon: string | null;
  categoryName: string;
  categoryColor: string;
  stock: number;
  lowStockThreshold: number;
  isAvailable: boolean;
  status: InventoryStatus;
}

function statusOf(stock: number, threshold: number): InventoryStatus {
  if (stock <= 0) return "OUT";
  if (stock <= threshold) return "LOW";
  return "OK";
}

export async function listInventory(query: InventoryQuery): Promise<InventoryRow[]> {
  const tenantId = await requireTenantId();
  const where: Record<string, unknown> = {
    tenantId,
    trackStock: true,
    archivedAt: null,
  };

  if (query.search && query.search.trim().length > 0) {
    where.name = { contains: query.search.trim(), mode: "insensitive" };
  }

  const items = await prisma.menuItem.findMany({
    where,
    orderBy: [{ stock: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      icon: true,
      stock: true,
      lowStockThreshold: true,
      isAvailable: true,
      category: { select: { name: true, color: true } },
    },
  });

  const rows: InventoryRow[] = items.map((i) => ({
    id: i.id,
    name: i.name,
    icon: i.icon,
    categoryName: i.category.name,
    categoryColor: i.category.color,
    stock: i.stock,
    lowStockThreshold: i.lowStockThreshold,
    isAvailable: i.isAvailable,
    status: statusOf(i.stock, i.lowStockThreshold),
  }));

  if (query.status === "ALL") return rows;
  return rows.filter((r) => r.status === query.status);
}

/** Dashboard widget — koliko stavki je nisko/nestalo. */
export async function getLowStockSummary(): Promise<{
  outOfStock: number;
  lowStock: number;
  items: InventoryRow[]; // prvih 5 najgorih
}> {
  const tenantId = await requireTenantId();
  const items = await prisma.menuItem.findMany({
    where: { tenantId, trackStock: true, archivedAt: null },
    orderBy: { stock: "asc" },
    select: {
      id: true,
      name: true,
      icon: true,
      stock: true,
      lowStockThreshold: true,
      isAvailable: true,
      category: { select: { name: true, color: true } },
    },
  });

  let outOfStock = 0;
  let lowStock = 0;
  const rows: InventoryRow[] = [];
  for (const i of items) {
    const status = statusOf(i.stock, i.lowStockThreshold);
    if (status === "OUT") outOfStock++;
    else if (status === "LOW") lowStock++;
    if (status !== "OK") {
      rows.push({
        id: i.id,
        name: i.name,
        icon: i.icon,
        categoryName: i.category.name,
        categoryColor: i.category.color,
        stock: i.stock,
        lowStockThreshold: i.lowStockThreshold,
        isAvailable: i.isAvailable,
        status,
      });
    }
  }
  return { outOfStock, lowStock, items: rows.slice(0, 5) };
}

export interface StockMovementRow {
  id: string;
  type: StockMovementType;
  quantity: number;
  stockAfter: number;
  note: string | null;
  performedByEmail: string | null;
  createdAt: Date;
}

export async function getStockHistory(menuItemId: string): Promise<StockMovementRow[]> {
  const tenantId = await requireTenantId();
  // Verifikuj da stavka pripada tenantu (sigurnost)
  const item = await prisma.menuItem.findFirst({
    where: { id: menuItemId, tenantId },
    select: { id: true },
  });
  if (!item) return [];

  const rows = await prisma.stockMovement.findMany({
    where: { menuItemId, tenantId },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      type: true,
      quantity: true,
      stockAfter: true,
      note: true,
      createdAt: true,
      performedBy: { select: { email: true } },
    },
  });

  return rows.map((r) => ({
    id: r.id,
    type: r.type,
    quantity: r.quantity,
    stockAfter: r.stockAfter,
    note: r.note,
    performedByEmail: r.performedBy?.email ?? null,
    createdAt: r.createdAt,
  }));
}
