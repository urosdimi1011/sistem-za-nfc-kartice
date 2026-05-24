import "server-only";
import { prisma } from "@/lib/prisma";
import type { CategoryFormInput, ItemFormInput } from "./schemas";

export class MenuServiceError extends Error {
  constructor(
    public code: "NOT_FOUND" | "CATEGORY_HAS_ITEMS",
    message: string,
  ) {
    super(message);
  }
}

// ─── KATEGORIJE ─────────────────────────────────────────────

export async function createCategory(tenantId: string, input: CategoryFormInput) {
  const last = await prisma.menuCategory.findFirst({
    where: { tenantId },
    orderBy: { displayOrder: "desc" },
    select: { displayOrder: true },
  });
  return prisma.menuCategory.create({
    data: {
      tenantId,
      name: input.name,
      icon: input.icon,
      color: input.color,
      isVisible: input.isVisible,
      displayOrder: (last?.displayOrder ?? -1) + 1,
    },
  });
}

export async function updateCategory(
  tenantId: string,
  id: string,
  input: CategoryFormInput,
) {
  const exists = await prisma.menuCategory.findFirst({ where: { id, tenantId } });
  if (!exists) throw new MenuServiceError("NOT_FOUND", "Kategorija ne postoji");
  return prisma.menuCategory.update({
    where: { id },
    data: {
      name: input.name,
      icon: input.icon,
      color: input.color,
      isVisible: input.isVisible,
    },
  });
}

export async function deleteCategory(tenantId: string, id: string) {
  const exists = await prisma.menuCategory.findFirst({ where: { id, tenantId } });
  if (!exists) throw new MenuServiceError("NOT_FOUND", "Kategorija ne postoji");
  const itemCount = await prisma.menuItem.count({ where: { categoryId: id, tenantId } });
  if (itemCount > 0) {
    throw new MenuServiceError(
      "CATEGORY_HAS_ITEMS",
      `Kategorija ima ${itemCount} stavki — prvo ih obriši ili premesti`,
    );
  }
  return prisma.menuCategory.delete({ where: { id } });
}

export async function reorderCategories(tenantId: string, ids: string[]) {
  return prisma.$transaction(
    ids.map((id, index) =>
      prisma.menuCategory.updateMany({
        where: { id, tenantId },
        data: { displayOrder: index },
      }),
    ),
  );
}

// ─── STAVKE ─────────────────────────────────────────────────

export async function createItem(tenantId: string, input: ItemFormInput) {
  // Provera da kategorija pripada tenantu
  const cat = await prisma.menuCategory.findFirst({
    where: { id: input.categoryId, tenantId },
    select: { id: true },
  });
  if (!cat) throw new MenuServiceError("NOT_FOUND", "Kategorija ne postoji");

  const last = await prisma.menuItem.findFirst({
    where: { categoryId: input.categoryId, tenantId },
    orderBy: { displayOrder: "desc" },
    select: { displayOrder: true },
  });
  return prisma.menuItem.create({
    data: {
      tenantId,
      categoryId: input.categoryId,
      name: input.name,
      description: input.description ?? null,
      icon: input.icon ?? null,
      creditPrice: input.creditPrice,
      isAvailable: input.isAvailable,
      displayOrder: (last?.displayOrder ?? -1) + 1,
      trackStock: input.trackStock,
      stock: input.trackStock ? input.stock : 0,
      lowStockThreshold: input.lowStockThreshold,
    },
  });
}

export async function updateItem(
  tenantId: string,
  id: string,
  input: ItemFormInput,
) {
  const exists = await prisma.menuItem.findFirst({ where: { id, tenantId } });
  if (!exists) throw new MenuServiceError("NOT_FOUND", "Stavka ne postoji");
  return prisma.menuItem.update({
    where: { id },
    data: {
      categoryId: input.categoryId,
      name: input.name,
      description: input.description ?? null,
      icon: input.icon ?? null,
      creditPrice: input.creditPrice,
      isAvailable: input.isAvailable,
      // trackStock se može uključiti/isključiti. Ako se isključi, stock ostaje
      // ali se ignoriše. Ako se uključi po prvi put, postavimo početno stanje.
      trackStock: input.trackStock,
      lowStockThreshold: input.lowStockThreshold,
      // Stock NE ažuriramo ovde direktno — to ide kroz restock/adjust akcije
      // da bismo imali audit trail. Izuzetak: kad se trackStock tek uključi
      // i stock je 0, postavimo početno.
      ...(input.trackStock && !exists.trackStock
        ? { stock: input.stock }
        : {}),
    },
  });
}

export async function deleteItem(tenantId: string, id: string) {
  const exists = await prisma.menuItem.findFirst({ where: { id, tenantId } });
  if (!exists) throw new MenuServiceError("NOT_FOUND", "Stavka ne postoji");
  return prisma.menuItem.delete({ where: { id } });
}

export async function setItemAvailable(
  tenantId: string,
  id: string,
  isAvailable: boolean,
) {
  const exists = await prisma.menuItem.findFirst({ where: { id, tenantId } });
  if (!exists) throw new MenuServiceError("NOT_FOUND", "Stavka ne postoji");
  return prisma.menuItem.update({
    where: { id },
    data: { isAvailable },
  });
}

export async function reorderItems(
  tenantId: string,
  categoryId: string,
  ids: string[],
) {
  return prisma.$transaction(
    ids.map((id, index) =>
      prisma.menuItem.updateMany({
        where: { id, tenantId },
        data: { displayOrder: index, categoryId },
      }),
    ),
  );
}
