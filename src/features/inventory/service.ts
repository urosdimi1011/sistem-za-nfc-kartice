import "server-only";
import { prisma } from "@/lib/prisma";
import type { RestockInput, AdjustStockInput, WasteInput } from "./schemas";

export class InventoryServiceError extends Error {
  constructor(
    public code: "NOT_FOUND" | "NOT_TRACKED" | "INSUFFICIENT_STOCK",
    message: string,
  ) {
    super(message);
  }
}

interface Ctx {
  tenantId: string;
  performedById: string;
}

/**
 * Dopuna zaliha. Stock += quantity, isAvailable=true (vraća se na meni
 * ako je bio sakriven zbog 0), StockMovement(RESTOCK).
 */
export async function restockItem(ctx: Ctx, input: RestockInput) {
  return prisma.$transaction(async (tx) => {
    const item = await tx.menuItem.findFirst({
      where: { id: input.menuItemId, tenantId: ctx.tenantId },
      select: { id: true, trackStock: true, stock: true, name: true },
    });
    if (!item) throw new InventoryServiceError("NOT_FOUND", "Stavka ne postoji");
    if (!item.trackStock)
      throw new InventoryServiceError(
        "NOT_TRACKED",
        `"${item.name}" nije konfigurisana za praćenje stanja`,
      );

    // Atomski increment — konkurentna prodaja (decrement) se ne gubi.
    const updated = await tx.menuItem.update({
      where: { id: item.id },
      data: {
        stock: { increment: input.quantity },
        // Vraćamo na meni ako je bio sakriven zbog 0
        isAvailable: true,
      },
      select: { stock: true },
    });
    const newStock = updated.stock;

    await tx.stockMovement.create({
      data: {
        tenantId: ctx.tenantId,
        menuItemId: item.id,
        type: "RESTOCK",
        quantity: input.quantity,
        stockAfter: newStock,
        note: input.note ?? null,
        performedById: ctx.performedById,
      },
    });

    return { newStock };
  });
}

/**
 * Ručna korekcija — postavi tačno stanje. Razlika se evidentira kao ADJUSTMENT.
 */
export async function adjustStock(ctx: Ctx, input: AdjustStockInput) {
  return prisma.$transaction(async (tx) => {
    const item = await tx.menuItem.findFirst({
      where: { id: input.menuItemId, tenantId: ctx.tenantId },
      select: { id: true, trackStock: true, stock: true, name: true },
    });
    if (!item) throw new InventoryServiceError("NOT_FOUND", "Stavka ne postoji");
    if (!item.trackStock)
      throw new InventoryServiceError(
        "NOT_TRACKED",
        `"${item.name}" nije konfigurisana za praćenje stanja`,
      );

    const delta = input.newStock - item.stock;
    if (delta === 0) return { newStock: item.stock };

    await tx.menuItem.update({
      where: { id: item.id },
      data: {
        stock: input.newStock,
        // Ako je novo stanje > 0 i bio sakriven, vrati ga
        isAvailable: input.newStock > 0 ? true : false,
      },
    });

    await tx.stockMovement.create({
      data: {
        tenantId: ctx.tenantId,
        menuItemId: item.id,
        type: "ADJUSTMENT",
        quantity: delta,
        stockAfter: input.newStock,
        note: input.note,
        performedById: ctx.performedById,
      },
    });

    return { newStock: input.newStock };
  });
}

/**
 * Otpis — proliveno, isteklo. Smanjuje stock i evidentira razlog.
 */
export async function recordWaste(ctx: Ctx, input: WasteInput) {
  return prisma.$transaction(async (tx) => {
    const item = await tx.menuItem.findFirst({
      where: { id: input.menuItemId, tenantId: ctx.tenantId },
      select: { id: true, trackStock: true, stock: true, name: true },
    });
    if (!item) throw new InventoryServiceError("NOT_FOUND", "Stavka ne postoji");
    if (!item.trackStock)
      throw new InventoryServiceError(
        "NOT_TRACKED",
        `"${item.name}" nije konfigurisana za praćenje stanja`,
      );
    // Uslovni decrement (stock >= qty) — isti šablon kao prodaja u orders
    // servisu. Sprečava minus pri konkurentnoj prodaji/otpisu.
    const dec = await tx.menuItem.updateMany({
      where: {
        id: item.id,
        tenantId: ctx.tenantId,
        stock: { gte: input.quantity },
      },
      data: { stock: { decrement: input.quantity } },
    });
    if (dec.count === 0) {
      throw new InventoryServiceError(
        "INSUFFICIENT_STOCK",
        `Pokušaj otpisa ${input.quantity}, ali na stanju ima samo ${item.stock}`,
      );
    }

    const fresh = await tx.menuItem.findUniqueOrThrow({
      where: { id: item.id },
      select: { stock: true },
    });
    const newStock = fresh.stock;

    await tx.menuItem.update({
      where: { id: item.id },
      data: { isAvailable: newStock > 0 },
    });

    await tx.stockMovement.create({
      data: {
        tenantId: ctx.tenantId,
        menuItemId: item.id,
        type: "WASTE",
        quantity: -input.quantity,
        stockAfter: newStock,
        note: input.note,
        performedById: ctx.performedById,
      },
    });

    return { newStock };
  });
}
