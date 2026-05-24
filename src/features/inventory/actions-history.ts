"use server";

import { auth } from "@/auth";
import { getStockHistory, type StockMovementRow } from "./queries";

export async function getStockHistoryAction(
  menuItemId: string,
): Promise<{ ok: true; data: StockMovementRow[] } | { ok: false; error: string }> {
  const session = await auth();
  if (!session) return { ok: false, error: "Niste prijavljeni" };
  if (session.user.role !== "ADMIN" && session.user.role !== "MANAGER") {
    return { ok: false, error: "Nemate pristup" };
  }
  try {
    const data = await getStockHistory(menuItemId);
    return { ok: true, data };
  } catch (e) {
    console.error(e);
    return { ok: false, error: "Greška pri učitavanju istorije" };
  }
}
