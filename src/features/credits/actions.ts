"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { topUpSchema, deductSchema } from "./schemas";
import {
  topUpCredits,
  deductCredits,
  CreditServiceError,
} from "./service";

export type ActionResult<T = void> =
  | { ok: true; data?: T }
  | { ok: false; error: string; code?: string };

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

export async function topUpAction(
  raw: unknown,
): Promise<ActionResult<{ newBalance: number }>> {
  const check = await requireAdmin();
  if (check.denied) return check.result;

  const parsed = topUpSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Neispravni podaci" };
  }

  try {
    const { newBalance } = await topUpCredits({
      ...parsed.data,
      tenantId: check.tenantId,
      performedByAccountId: check.accountId,
    });
    revalidatePath("/transakcije");
    revalidatePath("/osobe");
    return { ok: true, data: { newBalance } };
  } catch (e) {
    if (e instanceof CreditServiceError) {
      return { ok: false, error: e.message, code: e.code };
    }
    console.error(e);
    return { ok: false, error: "Greška pri uplati" };
  }
}

export async function deductAction(
  raw: unknown,
): Promise<ActionResult<{ newBalance: number }>> {
  const check = await requireAdmin();
  if (check.denied) return check.result;

  const parsed = deductSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Neispravni podaci" };
  }

  try {
    const { newBalance } = await deductCredits({
      ...parsed.data,
      tenantId: check.tenantId,
      performedByAccountId: check.accountId,
    });
    revalidatePath("/transakcije");
    revalidatePath("/osobe");
    return { ok: true, data: { newBalance } };
  } catch (e) {
    if (e instanceof CreditServiceError) {
      return { ok: false, error: e.message, code: e.code };
    }
    console.error(e);
    return { ok: false, error: "Greška pri skidanju" };
  }
}
