"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import {
  restockSchema,
  adjustStockSchema,
  wasteSchema,
  stockCountSchema,
} from "./schemas";
import {
  restockItem,
  adjustStock,
  recordWaste,
  createStockCount,
  InventoryServiceError,
  type StockCountResult,
} from "./service";
import { getStockCountDetail, type StockCountDetailItem } from "./queries";

export type ActionResult<T = void> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

async function requireAdminOrManager(): Promise<
  | { denied: true; result: { ok: false; error: string } }
  | { denied: false; tenantId: string; accountId: string }
> {
  const session = await auth();
  if (!session) return { denied: true, result: { ok: false, error: "Niste prijavljeni" } };
  if (session.user.role !== "ADMIN" && session.user.role !== "MANAGER") {
    return { denied: true, result: { ok: false, error: "Nemate pristup" } };
  }
  return {
    denied: false,
    tenantId: session.user.tenantId,
    accountId: session.user.id,
  };
}

function fail(e: unknown, fallback: string): { ok: false; error: string } {
  if (e instanceof InventoryServiceError) return { ok: false, error: e.message };
  console.error(e);
  return { ok: false, error: fallback };
}

function revalidate() {
  revalidatePath("/stanje");
  revalidatePath("/karta-pica");
  revalidatePath("/dashboard");
  revalidatePath("/bar");
}

export async function restockAction(raw: unknown): Promise<ActionResult<{ newStock: number }>> {
  const check = await requireAdminOrManager();
  if (check.denied) return check.result;
  const parsed = restockSchema.safeParse(raw);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Neispravno" };
  try {
    const r = await restockItem(
      { tenantId: check.tenantId, performedById: check.accountId },
      parsed.data,
    );
    revalidate();
    return { ok: true, data: r };
  } catch (e) {
    return fail(e, "Greška pri dopuni zaliha");
  }
}

export async function adjustStockAction(
  raw: unknown,
): Promise<ActionResult<{ newStock: number }>> {
  const check = await requireAdminOrManager();
  if (check.denied) return check.result;
  const parsed = adjustStockSchema.safeParse(raw);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Neispravno" };
  try {
    const r = await adjustStock(
      { tenantId: check.tenantId, performedById: check.accountId },
      parsed.data,
    );
    revalidate();
    return { ok: true, data: r };
  } catch (e) {
    return fail(e, "Greška pri korekciji stanja");
  }
}

export async function createStockCountAction(
  raw: unknown,
): Promise<ActionResult<StockCountResult>> {
  const check = await requireAdminOrManager();
  if (check.denied) return check.result;
  const parsed = stockCountSchema.safeParse(raw);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Neispravno" };
  try {
    const r = await createStockCount(
      { tenantId: check.tenantId, performedById: check.accountId },
      parsed.data,
    );
    revalidate();
    return { ok: true, data: r };
  } catch (e) {
    return fail(e, "Greška pri popisu");
  }
}

export async function getStockCountDetailAction(
  stockCountId: string,
): Promise<ActionResult<{ items: StockCountDetailItem[] }>> {
  const check = await requireAdminOrManager();
  if (check.denied) return check.result;
  if (typeof stockCountId !== "string" || !stockCountId) {
    return { ok: false, error: "Neispravan popis" };
  }
  try {
    const items = await getStockCountDetail(stockCountId);
    return { ok: true, data: { items } };
  } catch (e) {
    return fail(e, "Greška pri učitavanju popisa");
  }
}

export async function recordWasteAction(
  raw: unknown,
): Promise<ActionResult<{ newStock: number }>> {
  const check = await requireAdminOrManager();
  if (check.denied) return check.result;
  const parsed = wasteSchema.safeParse(raw);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Neispravno" };
  try {
    const r = await recordWaste(
      { tenantId: check.tenantId, performedById: check.accountId },
      parsed.data,
    );
    revalidate();
    return { ok: true, data: r };
  } catch (e) {
    return fail(e, "Greška pri otpisu");
  }
}
