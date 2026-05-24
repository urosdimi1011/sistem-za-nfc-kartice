import { Suspense } from "react";
import { z } from "zod";
import { PERSON_TYPES, PersonType } from "@/lib/enums";
import { PeriodPicker } from "@/features/reports/components/period-picker";
import { ReportsFilters } from "@/features/reports/components/reports-filters";
import { MonthlyReportSection } from "@/features/reports/components/monthly-report-section";
import { MonthlyReportSkeleton } from "@/features/reports/components/monthly-report-skeleton";
import { getReportFilterCounts } from "@/features/reports/queries";
import { listActiveGroupsLite } from "@/features/groups/queries";
import { getTenantSettings } from "@/features/settings/queries";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

const MONTHS_SR = [
  "Januar",
  "Februar",
  "Mart",
  "April",
  "Maj",
  "Jun",
  "Jul",
  "Avgust",
  "Septembar",
  "Oktobar",
  "Novembar",
  "Decembar",
];

type PersonTypeFilter = PersonType | "ALL";

const paramsSchema = z.object({
  year: z.coerce.number().int().min(2024).max(2100).optional(),
  month: z.coerce.number().int().min(1).max(12).optional(),
  personType: z.enum([...PERSON_TYPES, "ALL"]).optional(),
  search: z.string().trim().optional(),
  groupId: z.string().trim().optional(),
  onlyWithActivity: z.union([z.literal("true"), z.literal("false")]).optional(),
  page: z.coerce.number().int().min(1).optional(),
});

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function IzvestajiPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const parsed = paramsSchema.parse({
    year: params.year,
    month: params.month,
    personType: params.personType,
    search: params.search,
    groupId: params.groupId,
    onlyWithActivity: params.onlyWithActivity,
    page: params.page,
  });

  const session = await auth();
  const tenantId = session?.user.tenantId;
  const [groups, settings] = await Promise.all([
    listActiveGroupsLite(),
    tenantId ? getTenantSettings(tenantId) : Promise.resolve(null),
  ]);
  const groupLabel = settings?.groupLabel ?? "Grupa";
  const groupLabelPlural = settings?.groupLabelPlural ?? "Grupe";

  const now = new Date();
  const year = parsed.year ?? now.getFullYear();
  const month = parsed.month ?? now.getMonth() + 1;
  const personType: PersonTypeFilter = parsed.personType ?? "EMPLOYEE";
  const onlyWithActivity = parsed.onlyWithActivity !== "false";
  const page = parsed.page ?? 1;
  const monthLabel = `${MONTHS_SR[month - 1]} ${year}`;

  // Brojači za filter bar — odvojena lagana query, izvan Suspense-a.
  // Čeka se inline (await) pa filter bar uvek pokaže sveže "X od Y".
  // Brži je od getMonthlyReport jer ne računa transakcije, samo COUNT.
  const counts = await getReportFilterCounts({
    year,
    month,
    personType,
    groupId: parsed.groupId ?? null,
    search: parsed.search,
  });

  const headerLabel =
    personType === PersonType.EMPLOYEE
      ? "Zaposleni"
      : personType === PersonType.STUDENT
        ? "Učenici"
        : "Svi (učenici i zaposleni)";

  // Key za Suspense — kad se promeni, Next remontira potstablo i pokaže
  // skeleton fallback dok novi async fetch ne završi. Bez ovoga, Next bi
  // probao da reuse stari node i čekao bez vizuelnog feedback-a.
  // BITNO: NE uključujemo `page` jer paginacija već ima sopstveni transition;
  // ali uključujemo sve što okida nov fetch tabele.
  const suspenseKey = JSON.stringify({
    year,
    month,
    personType,
    groupId: parsed.groupId ?? null,
    search: parsed.search ?? "",
    onlyWithActivity,
    page,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Izveštaji</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Mesečna potrošnja po osobama, individualni PDF izveštaji i zatvaranje
          meseca
        </p>
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <PeriodPicker year={year} month={month} personType={personType} />
      </div>

      <ReportsFilters
        totalPeopleInScope={counts.totalPeopleInScope}
        withActivityCount={counts.withActivityCount}
        onlyWithActivity={onlyWithActivity}
        groups={groups}
        groupLabel={groupLabel}
        groupLabelPlural={groupLabelPlural}
      />

      <Suspense key={suspenseKey} fallback={<MonthlyReportSkeleton />}>
        <MonthlyReportSection
          year={year}
          month={month}
          monthLabel={monthLabel}
          personType={personType}
          groupId={parsed.groupId ?? null}
          search={parsed.search}
          onlyWithActivity={onlyWithActivity}
          page={page}
          headerLabel={headerLabel}
          showClosePanel={personType !== PersonType.STUDENT}
        />
      </Suspense>
    </div>
  );
}
