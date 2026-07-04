"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import type { PersonType } from "@/lib/enums";
import { closeMonthSchema } from "./schemas";
import { closeMonthForTenant, ReportsServiceError } from "./service";
import { getMonthlyReport } from "./queries";
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

function isValidPeriod(year: number, month: number): boolean {
  return (
    Number.isInteger(year) &&
    Number.isInteger(month) &&
    year >= 2000 &&
    year <= 2100 &&
    month >= 1 &&
    month <= 12
  );
}

export interface BulkEmailRecipient {
  personId: string;
  name: string;
  email: string;
}

/**
 * Lista primalaca za bulk slanje: osobe sa aktivnošću u mesecu koje imaju
 * upisan email, u trenutnom scope-u filtera (tip osobe, grupa).
 */
export async function listReportEmailRecipientsAction(
  year: number,
  month: number,
  personType: PersonType | "ALL",
  groupId: string | null,
): Promise<ActionResult<{ recipients: BulkEmailRecipient[]; noEmailCount: number }>> {
  const session = await auth();
  if (!session) return { ok: false, error: "Niste prijavljeni" };
  if (session.user.role !== "ADMIN" && session.user.role !== "MANAGER") {
    return { ok: false, error: "Nemate pristup" };
  }
  if (!isValidPeriod(year, month)) {
    return { ok: false, error: "Neispravan period" };
  }

  const report = await getMonthlyReport({
    year,
    month,
    personType,
    groupId,
    onlyWithActivity: true,
    page: 1,
    perPage: 1_000_000,
  });

  const recipients = report.rows
    .filter((r) => r.hasEmail && r.email)
    .map((r) => ({
      personId: r.personId,
      name: `${r.lastName} ${r.firstName}`,
      email: r.email as string,
    }));

  return {
    ok: true,
    data: { recipients, noEmailCount: report.rows.length - recipients.length },
  };
}

// Batch je namerno mali: klijent poziva akciju više puta zaredom sa
// progresom. Jedan veliki poziv bi pao na serverless timeout (PDF render
// + SMTP je ~2-3s po osobi).
const MAX_BATCH = 5;

export async function sendReportEmailsBatchAction(
  personIds: string[],
  year: number,
  month: number,
): Promise<
  ActionResult<{
    results: Array<{ personId: string; ok: boolean; error?: string }>;
  }>
> {
  const session = await auth();
  if (!session) return { ok: false, error: "Niste prijavljeni" };
  if (session.user.role !== "ADMIN" && session.user.role !== "MANAGER") {
    return { ok: false, error: "Nemate pristup" };
  }
  if (!isValidPeriod(year, month)) {
    return { ok: false, error: "Neispravan period" };
  }
  if (!Array.isArray(personIds) || personIds.length === 0) {
    return { ok: false, error: "Prazan spisak" };
  }
  if (personIds.length > MAX_BATCH) {
    return { ok: false, error: `Najviše ${MAX_BATCH} po pozivu` };
  }

  const results: Array<{ personId: string; ok: boolean; error?: string }> = [];
  for (const personId of personIds) {
    if (typeof personId !== "string" || !personId) continue;
    try {
      // Tenant scope se proverava unutar getPersonReport-a (requireTenantId)
      await sendPersonReportEmail(personId, year, month);
      results.push({ personId, ok: true });
    } catch (e) {
      const msg =
        e instanceof ReportEmailError ? e.message : "Slanje nije uspelo";
      if (!(e instanceof ReportEmailError)) console.error(e);
      results.push({ personId, ok: false, error: msg });
    }
  }

  return { ok: true, data: { results } };
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
