import { PaginationControls } from "@/components/ui/pagination-controls";
import { getMonthlyReport } from "../queries";
import { MonthlyReportTable } from "./monthly-report-table";
import { MonthlyClosePanel } from "./monthly-close-panel";
import type { PersonType } from "@/lib/enums";

interface MonthlyReportSectionProps {
  year: number;
  month: number;
  monthLabel: string;
  personType: PersonType | "ALL";
  groupId: string | null;
  search: string | undefined;
  onlyWithActivity: boolean;
  page: number;
  headerLabel: string;
  showClosePanel: boolean;
}

/**
 * Server async komponenta koja drži fetch + render tabele i pagination-a.
 * Izvučena iz page.tsx da bi <Suspense> mogao da je zameni skeleton-om
 * tokom navigacije (kad se filteri promene). Ako fetch nije iza Suspense
 * boundary-ja, Next ne zna gde da prikaže fallback.
 */
export async function MonthlyReportSection({
  year,
  month,
  monthLabel,
  personType,
  groupId,
  search,
  onlyWithActivity,
  page,
  headerLabel,
  showClosePanel,
}: MonthlyReportSectionProps) {
  const report = await getMonthlyReport({
    year,
    month,
    personType,
    groupId,
    search,
    onlyWithActivity,
    page,
    perPage: 50,
  });

  return (
    <>
      {showClosePanel && (
        <MonthlyClosePanel
          year={year}
          month={month}
          monthLabel={monthLabel}
          isClosed={report.isClosed}
          closedAt={report.closedAt}
          closedByEmail={report.closedByEmail}
          totalNegativeEmployees={report.totalNegativeEmployees}
          employeesInNegative={report.employeesInNegative}
        />
      )}

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            {headerLabel} — {monthLabel}
          </h2>
          <p className="text-xs text-zinc-500">
            {report.total} {report.total === 1 ? "rezultat" : "rezultata"}
            {search ? ` za "${search}"` : ""}
          </p>
        </div>
        <MonthlyReportTable rows={report.rows} year={year} month={month} />

        {report.totalPages > 1 && (
          <div className="mt-4">
            <PaginationControls
              page={report.page}
              totalPages={report.totalPages}
              total={report.total}
              perPage={report.perPage}
            />
          </div>
        )}
      </div>
    </>
  );
}
