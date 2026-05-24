import "server-only";
import { prisma } from "@/lib/prisma";
import { requireTenantId } from "@/lib/auth-helpers";

export interface GroupRow {
  id: string;
  name: string;
  shortName: string | null;
  isActive: boolean;
  displayOrder: number;
  peopleCount: number;
}

export async function listGroups(): Promise<GroupRow[]> {
  const tenantId = await requireTenantId();
  const rows = await prisma.group.findMany({
    where: { tenantId },
    orderBy: { displayOrder: "asc" },
    select: {
      id: true,
      name: true,
      shortName: true,
      isActive: true,
      displayOrder: true,
      _count: { select: { people: true } },
    },
  });
  return rows.map((g) => ({
    id: g.id,
    name: g.name,
    shortName: g.shortName,
    isActive: g.isActive,
    displayOrder: g.displayOrder,
    peopleCount: g._count.people,
  }));
}

/** Lagana varijanta za dropdown-ove (forme, filteri). Samo aktivne. */
export async function listActiveGroupsLite() {
  const tenantId = await requireTenantId();
  return prisma.group.findMany({
    where: { tenantId, isActive: true },
    orderBy: { displayOrder: "asc" },
    select: { id: true, name: true, shortName: true },
  });
}
