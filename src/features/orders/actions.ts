"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { createOrderSchema } from "./schemas";
import {
  createOrder,
  lookupCardByUid,
  OrderServiceError,
  type BarCardLookup,
} from "./service";

export type ActionResult<T = void> =
  | { ok: true; data?: T }
  | { ok: false; error: string; code?: string; extra?: Record<string, unknown> };

async function requireBarStaff(): Promise<
  | { denied: true; result: { ok: false; error: string } }
  | { denied: false; accountId: string; tenantId: string }
> {
  const session = await auth();
  if (!session) {
    return { denied: true, result: { ok: false, error: "Niste prijavljeni" } };
  }
  if (session.user.role !== "BARTENDER" && session.user.role !== "ADMIN") {
    return { denied: true, result: { ok: false, error: "Nemate pristup baru" } };
  }
  return {
    denied: false,
    accountId: session.user.id,
    tenantId: session.user.tenantId,
  };
}

export async function lookupCardAction(
  uid: string,
): Promise<ActionResult<BarCardLookup | null>> {
  const check = await requireBarStaff();
  if (check.denied) return check.result;
  const trimmed = uid.trim();
  if (!trimmed) return { ok: false, error: "UID je prazan" };
  try {
    const card = await lookupCardByUid(check.tenantId, trimmed);
    return { ok: true, data: card };
  } catch (e) {
    console.error(e);
    return { ok: false, error: "Greška pri čitanju kartice" };
  }
}

export async function createOrderAction(
  raw: unknown,
): Promise<
  ActionResult<{
    orderId: string;
    totalCredits: number;
    newBalance: number;
    personName: string;
  }>
> {
  const check = await requireBarStaff();
  if (check.denied) return check.result;
  const parsed = createOrderSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Neispravno" };
  }
  try {
    const result = await createOrder({
      ...parsed.data,
      tenantId: check.tenantId,
      bartenderAccountId: check.accountId,
    });
    revalidatePath("/transakcije");
    revalidatePath("/osobe");
    return { ok: true, data: result };
  } catch (e) {
    if (e instanceof OrderServiceError) {
      return { ok: false, error: e.message, code: e.code, extra: e.extra };
    }
    console.error(e);
    return { ok: false, error: "Greška pri kreiranju porudžbine" };
  }
}
