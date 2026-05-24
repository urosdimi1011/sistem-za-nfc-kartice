"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import {
  createAccountSchema,
  updateAccountSchema,
  resetPasswordSchema,
} from "./schemas";
import {
  createAccount,
  updateAccount,
  resetAccountPassword,
  AccountServiceError,
} from "./service";

export type ActionResult<T = void> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

async function requireAdmin(): Promise<
  | { denied: true; result: { ok: false; error: string } }
  | { denied: false; accountId: string; tenantId: string }
> {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return { denied: true, result: { ok: false, error: "Nemate pristup" } };
  }
  return {
    denied: false,
    accountId: session.user.id,
    tenantId: session.user.tenantId,
  };
}

function fail(e: unknown, fallback: string): { ok: false; error: string } {
  if (e instanceof AccountServiceError) return { ok: false, error: e.message };
  console.error(e);
  return { ok: false, error: fallback };
}

export async function createAccountAction(
  raw: unknown,
): Promise<ActionResult<{ id: string }>> {
  const check = await requireAdmin();
  if (check.denied) return check.result;

  const parsed = createAccountSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Neispravno",
    };
  }
  try {
    const created = await createAccount(
      check.tenantId,
      parsed.data,
      check.accountId,
    );
    revalidatePath("/nalozi");
    return { ok: true, data: { id: created.id } };
  } catch (e) {
    return fail(e, "Greška pri kreiranju naloga");
  }
}

export async function updateAccountAction(
  id: string,
  raw: unknown,
): Promise<ActionResult> {
  const check = await requireAdmin();
  if (check.denied) return check.result;

  const parsed = updateAccountSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Neispravno",
    };
  }
  try {
    await updateAccount(check.tenantId, id, parsed.data, check.accountId);
    revalidatePath("/nalozi");
    return { ok: true };
  } catch (e) {
    return fail(e, "Greška pri izmeni");
  }
}

export async function resetAccountPasswordAction(
  id: string,
  raw: unknown,
): Promise<ActionResult> {
  const check = await requireAdmin();
  if (check.denied) return check.result;

  const parsed = resetPasswordSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Neispravno",
    };
  }
  try {
    await resetAccountPassword(check.tenantId, id, parsed.data.password);
    revalidatePath("/nalozi");
    return { ok: true };
  } catch (e) {
    return fail(e, "Greška pri promeni lozinke");
  }
}
