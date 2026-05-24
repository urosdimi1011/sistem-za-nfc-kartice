import "server-only";
import { prisma } from "@/lib/prisma";
import type { GroupFormInput } from "./schemas";

export class GroupServiceError extends Error {
  constructor(
    public code: "NOT_FOUND" | "HAS_PEOPLE",
    message: string,
  ) {
    super(message);
  }
}

export async function createGroup(tenantId: string, input: GroupFormInput) {
  const last = await prisma.group.findFirst({
    where: { tenantId },
    orderBy: { displayOrder: "desc" },
    select: { displayOrder: true },
  });
  return prisma.group.create({
    data: {
      tenantId,
      name: input.name,
      shortName: input.shortName?.trim() ? input.shortName.trim() : null,
      isActive: input.isActive,
      displayOrder: (last?.displayOrder ?? -1) + 1,
    },
  });
}

export async function updateGroup(
  tenantId: string,
  id: string,
  input: GroupFormInput,
) {
  const exists = await prisma.group.findFirst({ where: { id, tenantId } });
  if (!exists) throw new GroupServiceError("NOT_FOUND", "Grupa ne postoji");
  return prisma.group.update({
    where: { id },
    data: {
      name: input.name,
      shortName: input.shortName?.trim() ? input.shortName.trim() : null,
      isActive: input.isActive,
    },
  });
}

export async function deleteGroup(tenantId: string, id: string) {
  const exists = await prisma.group.findFirst({ where: { id, tenantId } });
  if (!exists) throw new GroupServiceError("NOT_FOUND", "Grupa ne postoji");
  const count = await prisma.person.count({ where: { groupId: id, tenantId } });
  if (count > 0) {
    throw new GroupServiceError(
      "HAS_PEOPLE",
      `Grupa ima ${count} osoba — prvo ih izmesti ili deaktiviraj grupu`,
    );
  }
  return prisma.group.delete({ where: { id } });
}

export async function reorderGroups(tenantId: string, ids: string[]) {
  return prisma.$transaction(
    ids.map((id, index) =>
      prisma.group.updateMany({
        where: { id, tenantId },
        data: { displayOrder: index },
      }),
    ),
  );
}
