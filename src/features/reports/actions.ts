"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { closeMonthSchema } from "./schemas";
import { closeMonthForTenant, ReportsServiceError } from "./service";

export type ActionResult<T = void> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

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
