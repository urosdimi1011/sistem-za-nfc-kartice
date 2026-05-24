import "server-only";
import { prisma } from "@/lib/prisma";

export class ReportsServiceError extends Error {
  constructor(
    public code:
      | "MONTH_ALREADY_CLOSED"
      | "FUTURE_MONTH"
      | "NO_EMPLOYEES_IN_NEGATIVE",
    message: string,
  ) {
    super(message);
  }
}

/**
 * Zatvara mesec za sve zaposlene sa negativnim stanjem u tenantu.
 *
 * Tok:
 *  1. Pronađi sve aktivne EMPLOYEE sa balance < 0
 *  2. Za svakog kreiraj MONTHLY_RESET transakciju koja vraća stanje na 0
 *  3. Update CreditBalance na 0
 *  4. Kreiraj MonthlyClose zapis (trag za izveštaje)
 *  5. Sve atomarno
 */
export async function closeMonthForTenant(
  tenantId: string,
  year: number,
  month: number,
  performedByAccountId: string,
) {
  // Provera da nije već zatvoren
  const existing = await prisma.monthlyClose.findUnique({
    where: { tenantId_year_month: { tenantId, year, month } },
  });
  if (existing) {
    throw new ReportsServiceError(
      "MONTH_ALREADY_CLOSED",
      `${month}/${year} je već zatvoren`,
    );
  }

  // Ne dozvoli zatvaranje budućeg meseca
  const now = new Date();
  if (year > now.getFullYear() || (year === now.getFullYear() && month > now.getMonth() + 1)) {
    throw new ReportsServiceError("FUTURE_MONTH", "Ne može se zatvoriti budući mesec");
  }

  return prisma.$transaction(async (tx) => {
    // Naći zaposlene sa negativnim stanjem
    const negativeEmployees = await tx.creditBalance.findMany({
      where: {
        tenantId,
        balance: { lt: 0 },
        person: { isActive: true, personType: "EMPLOYEE" },
      },
      include: {
        person: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    if (negativeEmployees.length === 0) {
      throw new ReportsServiceError(
        "NO_EMPLOYEES_IN_NEGATIVE",
        "Nema zaposlenih sa negativnim stanjem — nema šta da se zatvori",
      );
    }

    let totalAmount = 0;
    const note = `Mesečno zatvaranje ${month}/${year}`;

    // Za svakog zaposlenog kreiraj MONTHLY_RESET transakciju + reset balance
    for (const cb of negativeEmployees) {
      const absAmount = Math.abs(cb.balance);
      totalAmount += absAmount;

      // Transakcija koja "anulira" minus — amount je pozitivan jednak |balance|, novi balance je 0
      await tx.creditTransaction.create({
        data: {
          tenantId,
          personId: cb.personId,
          amount: absAmount, // pozitivno — vraćamo na 0
          balanceAfter: 0,
          type: "MONTHLY_RESET",
          note,
          performedById: performedByAccountId,
        },
      });

      await tx.creditBalance.update({
        where: { personId: cb.personId },
        data: { balance: 0 },
      });
    }

    // Audit zapis
    const close = await tx.monthlyClose.create({
      data: {
        tenantId,
        year,
        month,
        totalAmount,
        employeeCount: negativeEmployees.length,
        closedById: performedByAccountId,
      },
    });

    return {
      closeId: close.id,
      totalAmount,
      employeeCount: negativeEmployees.length,
      employees: negativeEmployees.map((e) => ({
        personId: e.person.id,
        name: `${e.person.lastName} ${e.person.firstName}`,
        amount: Math.abs(e.balance),
      })),
    };
  });
}

/**
 * Pomoćnik za Vercel cron — prolazi kroz sve aktivne tenante i,
 * ako se današnji dan poklapa sa njihovim `monthlyResetDay`, zatvara PRETHODNI mesec.
 *
 * Vraća listu tenanta za koje je obavljen close + grešaka po tenantu.
 */
export async function runMonthlyCloseCron(systemAccountId: string | null) {
  const now = new Date();
  const day = now.getDate();

  const tenants = await prisma.tenant.findMany({
    where: { isActive: true },
    select: { id: true, slug: true, name: true, settings: true },
  });

  const results: Array<{
    tenantId: string;
    slug: string;
    closed: boolean;
    error?: string;
  }> = [];

  // Prethodni mesec
  const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevYear = prevDate.getFullYear();
  const prevMonth = prevDate.getMonth() + 1;

  for (const t of tenants) {
    const settings = (t.settings as { monthlyResetDay?: number }) ?? {};
    const targetDay = settings.monthlyResetDay ?? 1;
    if (targetDay !== day) continue;

    // Treba nam SystemAccount koji vrši close. Ako nije prosleđen iz cron-a
    // (system context), uzimamo prvog admina tenanta.
    let actor = systemAccountId;
    if (!actor) {
      const admin = await prisma.systemAccount.findFirst({
        where: { tenantId: t.id, role: "ADMIN", isActive: true },
        orderBy: { createdAt: "asc" },
        select: { id: true },
      });
      if (!admin) {
        results.push({
          tenantId: t.id,
          slug: t.slug,
          closed: false,
          error: "Nema aktivnog admin naloga za audit",
        });
        continue;
      }
      actor = admin.id;
    }

    try {
      await closeMonthForTenant(t.id, prevYear, prevMonth, actor);
      results.push({ tenantId: t.id, slug: t.slug, closed: true });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Nepoznata greška";
      results.push({ tenantId: t.id, slug: t.slug, closed: false, error: msg });
    }
  }

  return { runAt: now.toISOString(), results };
}
