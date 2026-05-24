"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { groupFormSchema, reorderSchema } from "./schemas";
import {
  createGroup,
  updateGroup,
  deleteGroup,
  reorderGroups,
  GroupServiceError,
} from "./service";

export type ActionResult<T = void> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

async function requireAdmin(): Promise<
  | { denied: true; result: { ok: false; error: string } }
  | { denied: false; tenantId: string }
> {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return { denied: true, result: { ok: false, error: "Nemate pristup" } };
  }
  return { denied: false, tenantId: session.user.tenantId };
}

function fail(e: unknown, fallback: string): { ok: false; error: string } {
  if (e instanceof GroupServiceError) return { ok: false, error: e.message };
  console.error(e);
  return { ok: false, error: fallback };
}

function revalidate() {
  revalidatePath("/grupe");
  revalidatePath("/osobe");
  revalidatePath("/izvestaji");
}

export async function createGroupAction(raw: unknown): Promise<ActionResult> {
  const check = await requireAdmin();
  if (check.denied) return check.result;
  const parsed = groupFormSchema.safeParse(raw);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Neispravno" };
  try {
    await createGroup(check.tenantId, parsed.data);
    revalidate();
    return { ok: true };
  } catch (e) {
    return fail(e, "Greška pri kreiranju grupe");
  }
}

export async function updateGroupAction(
  id: string,
  raw: unknown,
): Promise<ActionResult> {
  const check = await requireAdmin();
  if (check.denied) return check.result;
  const parsed = groupFormSchema.safeParse(raw);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Neispravno" };
  try {
    await updateGroup(check.tenantId, id, parsed.data);
    revalidate();
    return { ok: true };
  } catch (e) {
    return fail(e, "Greška pri izmeni grupe");
  }
}

export async function deleteGroupAction(id: string): Promise<ActionResult> {
  const check = await requireAdmin();
  if (check.denied) return check.result;
  try {
    await deleteGroup(check.tenantId, id);
    revalidate();
    return { ok: true };
  } catch (e) {
    return fail(e, "Greška pri brisanju grupe");
  }
}

export async function reorderGroupsAction(raw: unknown): Promise<ActionResult> {
  const check = await requireAdmin();
  if (check.denied) return check.result;
  const parsed = reorderSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Neispravan redosled" };
  try {
    await reorderGroups(check.tenantId, parsed.data.ids);
    revalidate();
    return { ok: true };
  } catch (e) {
    return fail(e, "Greška pri pomeranju");
  }
}
