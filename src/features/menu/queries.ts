import "server-only";
import { prisma } from "@/lib/prisma";
import { requireTenantId } from "@/lib/auth-helpers";

export interface MenuItemRow {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  creditPrice: number;
  isAvailable: boolean;
  displayOrder: number;
  trackStock: boolean;
  stock: number;
  lowStockThreshold: number;
}

export interface MenuCategoryWithItems {
  id: string;
  name: string;
  icon: string;
  color: string;
  isVisible: boolean;
  displayOrder: number;
  items: MenuItemRow[];
}

export async function listFullMenu(): Promise<MenuCategoryWithItems[]> {
  const tenantId = await requireTenantId();
  return prisma.menuCategory.findMany({
    where: { tenantId },
    orderBy: { displayOrder: "asc" },
    select: {
      id: true,
      name: true,
      icon: true,
      color: true,
      isVisible: true,
      displayOrder: true,
      items: {
        orderBy: { displayOrder: "asc" },
        select: {
          id: true,
          name: true,
          description: true,
          icon: true,
          creditPrice: true,
          isAvailable: true,
          displayOrder: true,
          trackStock: true,
          stock: true,
          lowStockThreshold: true,
        },
      },
    },
  });
}

export async function listAvailableMenu() {
  const tenantId = await requireTenantId();
  return prisma.menuCategory.findMany({
    where: { tenantId, isVisible: true },
    orderBy: { displayOrder: "asc" },
    select: {
      id: true,
      name: true,
      icon: true,
      color: true,
      items: {
        // isAvailable=false znači stavka je sakrivena (ili ručno, ili auto kad stock=0)
        where: { isAvailable: true },
        orderBy: { displayOrder: "asc" },
        select: {
          id: true,
          name: true,
          description: true,
          icon: true,
          creditPrice: true,
          // Bar terminal pokazuje "Skoro nestalo" badge ako je stock <= threshold
          trackStock: true,
          stock: true,
          lowStockThreshold: true,
        },
      },
    },
  });
}
