"use server";

import { auth } from "@/auth";
import {
  getRevenueByPeriod,
  type RevenuePeriod,
  type RevenuePeriodSummary,
} from "./queries";

export async function getRevenueByPeriodAction(
  period: RevenuePeriod,
): Promise<
  | { ok: true; data: RevenuePeriodSummary }
  | { ok: false; error: string }
> {
  const session = await auth();
  if (!session) return { ok: false, error: "Niste prijavljeni" };
  if (session.user.role === "BARTENDER") {
    return { ok: false, error: "Nemate pristup analitici" };
  }
  try {
    const data = await getRevenueByPeriod(period);
    return { ok: true, data };
  } catch (e) {
    console.error(e);
    return { ok: false, error: "Greška pri učitavanju podataka" };
  }
}
