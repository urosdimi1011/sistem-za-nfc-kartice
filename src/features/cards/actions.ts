"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { cardRegisterSchema } from "./schemas";
import {
  registerCard,
  blockCard,
  reactivateCard,
  reassignCard,
  CardServiceError,
} from "./service";

export type ActionResult<T = void> =
  | { ok: true; data?: T }
  | { ok: false; error: string; code?: string; extra?: Record<string, unknown> };

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

export async function registerCardAction(
  raw: unknown,
): Promise<ActionResult<{ id: string }>> {
  const check = await requireAdmin();
  if (check.denied) return check.result;

  const parsed = cardRegisterSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Neispravni podaci" };
  }

  try {
    const card = await registerCard(check.tenantId, parsed.data, check.accountId);
    revalidatePath("/kartice");
    revalidatePath("/osobe");
    return { ok: true, data: { id: card.id } };
  } catch (e) {
    if (e instanceof CardServiceError) {
      return { ok: false, error: e.message, code: e.code, extra: e.extra };
    }
    console.error(e);
    return { ok: false, error: "Greška pri registraciji kartice" };
  }
}

export async function blockCardAction(cardId: string): Promise<ActionResult> {
  const check = await requireAdmin();
  if (check.denied) return check.result;

  try {
    await blockCard(check.tenantId, cardId);
    revalidatePath("/kartice");
    revalidatePath("/osobe");
    return { ok: true };
  } catch (e) {
    if (e instanceof CardServiceError) {
      return { ok: false, error: e.message, code: e.code };
    }
    console.error(e);
    return { ok: false, error: "Greška pri blokadi" };
  }
}

export async function reactivateCardAction(cardId: string): Promise<ActionResult> {
  const check = await requireAdmin();
  if (check.denied) return check.result;

  try {
    await reactivateCard(check.tenantId, cardId);
    revalidatePath("/kartice");
    revalidatePath("/osobe");
    return { ok: true };
  } catch (e) {
    if (e instanceof CardServiceError) {
      return { ok: false, error: e.message, code: e.code };
    }
    console.error(e);
    return { ok: false, error: "Greška pri aktivaciji" };
  }
}

export async function reassignCardAction(
  cardId: string,
  newPersonId: string,
): Promise<ActionResult> {
  const check = await requireAdmin();
  if (check.denied) return check.result;

  if (!newPersonId) {
    return { ok: false, error: "Izaberi osobu" };
  }

  try {
    await reassignCard(check.tenantId, cardId, newPersonId);
    revalidatePath("/kartice");
    revalidatePath("/osobe");
    return { ok: true };
  } catch (e) {
    if (e instanceof CardServiceError) {
      return { ok: false, error: e.message, code: e.code, extra: e.extra };
    }
    console.error(e);
    return { ok: false, error: "Greška pri prebacivanju kartice" };
  }
}
