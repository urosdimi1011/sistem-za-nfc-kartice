"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { closeMonthSchema } from "./schemas";
import { closeMonthForTenant, ReportsServiceError } from "./service";
import { sendPersonReportEmail, ReportEmailError } from "./email";

export type ActionResult<T = void> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

/**
 * Šalje PDF mesečni izveštaj osobe na njen email.
 * Samo ADMIN/MANAGER. Tenant scope se proverava unutar getPersonReport-a.
 */
export async function sendReportEmailAction(
  personId: string,
  year: number,
  month: number,
): Promise<ActionResult<{ sentTo: string }>> {
  const session = await auth();
  if (!session) return { ok: false, error: "Niste prijavljeni" };
  if (session.user.role !== "ADMIN" && session.user.role !== "MANAGER") {
    return { ok: false, error: "Nemate pristup" };
  }
  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    year < 2000 ||
    year > 2100 ||
    month < 1 ||
    month > 12
  ) {
    return { ok: false, error: "Neispravan period" };
  }
  try {
    const { sentTo } = await sendPersonReportEmail(personId, year, month);
    return { ok: true, data: { sentTo } };
  } catch (e) {
    if (e instanceof ReportEmailError) {
      return { ok: false, error: e.message };
    }
    console.error(e);
    return { ok: false, error: "Greška pri slanju mejla" };
  }
}

export async function closeMonthAction(
  raw: unknown,
): Promise<
  ActionResult<{
    totalAmount: number;
    employeeCount: number;
  }>
> {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return { ok: false, error: "Nemate pristup" };
  }

  const parsed = closeMonthSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Neispravno" };
  }

  try {
    const result = await closeMonthForTenant(
      session.user.tenantId,
      parsed.data.year,
      parsed.data.month,
      session.user.id,
    );
    revalidatePath("/izvestaji");
    revalidatePath("/transakcije");
    revalidatePath("/osobe");
    revalidatePath("/dashboard");
    return {
      ok: true,
      data: {
        totalAmount: result.totalAmount,
        employeeCount: result.employeeCount,
      },
    };
  } catch (e) {
    if (e instanceof ReportsServiceError) {
      return { ok: false, error: e.message };
    }
    console.error(e);
    return { ok: false, error: "Greška pri zatvaranju meseca" };
  }
}
