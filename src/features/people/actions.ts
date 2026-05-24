"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { personFormSchema } from "./schemas";
import {
  createPerson,
  updatePerson,
  setPersonActive,
  PersonServiceError,
} from "./service";

export type ActionResult<T = void> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

async function requireAdmin(): Promise<
  { ok: false; error: string } | { ok: true; tenantId: string }
> {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return { ok: false, error: "Nemate pristup" };
  }
  return { ok: true, tenantId: session.user.tenantId };
}

export async function createPersonAction(
  raw: unknown,
): Promise<ActionResult<{ id: string }>> {
  const check = await requireAdmin();
  if (!check.ok) return check;

  const parsed = personFormSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Neispravni podaci" };
  }

  try {
    const person = await createPerson(check.tenantId, parsed.data);
    revalidatePath("/osobe");
    return { ok: true, data: { id: person.id } };
  } catch (e) {
    if (e instanceof PersonServiceError) {
      return { ok: false, error: e.message };
    }
    console.error(e);
    return { ok: false, error: "Greška pri kreiranju osobe" };
  }
}

export async function updatePersonAction(
  id: string,
  raw: unknown,
): Promise<ActionResult> {
  const check = await requireAdmin();
  if (!check.ok) return check;

  const parsed = personFormSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Neispravni podaci" };
  }

  try {
    await updatePerson(check.tenantId, id, parsed.data);
    revalidatePath("/osobe");
    return { ok: true };
  } catch (e) {
    if (e instanceof PersonServiceError) {
      return { ok: false, error: e.message };
    }
    console.error(e);
    return { ok: false, error: "Greška pri izmeni osobe" };
  }
}

export async function togglePersonActiveAction(
  id: string,
  isActive: boolean,
): Promise<ActionResult> {
  const check = await requireAdmin();
  if (!check.ok) return check;

  try {
    await setPersonActive(check.tenantId, id, isActive);
    revalidatePath("/osobe");
    return { ok: true };
  } catch (e) {
    if (e instanceof PersonServiceError) {
      return { ok: false, error: e.message };
    }
    console.error(e);
    return { ok: false, error: "Greška pri promeni statusa" };
  }
}
