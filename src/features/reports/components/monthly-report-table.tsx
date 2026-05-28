import { FileText } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { PersonTypeLabel } from "@/lib/enums";

import type { MonthlyPersonRow } from "../queries";
import { SendReportEmailButton } from "./send-report-email-button";

function fmt(n: number) {
  return new Intl.NumberFormat("sr-RS").format(n);
}

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

interface MonthlyReportTableProps {
  rows: MonthlyPersonRow[];
  year: number;
  month: number;
}

export function MonthlyReportTable({ rows, year, month }: MonthlyReportTableProps) {
  if (rows.length === 0) {
    return (
      <div className="rounded-md border border-dashed py-12 text-center text-sm text-zinc-500">
        Nema osoba za prikaz u izabranom periodu.
      </div>
    );
  }

  return (
    <div className="rounded-md border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Osoba</TableHead>
            <TableHead className="text-right">Trenutno stanje</TableHead>
            <TableHead className="text-right">Potrošeno u mesecu</TableHead>
            <TableHead className="text-right">Uplate u mesecu</TableHead>
            <TableHead className="text-right">Porudžbine</TableHead>
            <TableHead className="w-40"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.personId}>
              <TableCell>
                <div className="flex items-center gap-2 font-medium">
                  {r.lastName} {r.firstName}
                  <Badge
                    variant={r.personType === "EMPLOYEE" ? "default" : "secondary"}
                    className="text-[10px]"
                  >
                    {PersonTypeLabel[r.personType]}
                  </Badge>
                </div>
              </TableCell>
              <TableCell
                className={cn(
                  "text-right tabular-nums font-medium",
                  r.currentBalance < 0
                    ? "text-red-600 dark:text-red-400"
                    : r.currentBalance === 0
                      ? "text-zinc-400"
                      : "",
                )}
              >
                {fmt(r.currentBalance)}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {r.monthSpent > 0 ? (
                  <span className="text-zinc-700 dark:text-zinc-300">
                    {fmt(r.monthSpent)}
                  </span>
                ) : (
                  <span className="text-zinc-400">—</span>
                )}
              </TableCell>
              <TableCell className="text-right tabular-nums text-green-700 dark:text-green-400">
                {r.monthTopups > 0 ? fmt(r.monthTopups) : <span className="text-zinc-400">—</span>}
              </TableCell>
              <TableCell className="text-right tabular-nums text-zinc-500">
                {r.orderCount}
              </TableCell>
              <TableCell className="text-right">
                {(() => {
                  const hasAny =
                    r.monthSpent > 0 || r.monthTopups > 0 || r.orderCount > 0;
                  if (!hasAny) {
                    return (
                      <span
                        className="text-[10px] italic text-zinc-400"
                        title="Nema transakcija u izabranom mesecu — PDF nije dostupan"
                      >
                        nema transakcija
                      </span>
                    );
                  }
                  return (
                    <div className="flex items-center justify-end gap-1.5">
                      <a
                        href={`/api/reports/person/${r.personId}/pdf?year=${year}&month=${month}`}
                        target="_blank"
                        rel="noopener"
                      >
                        <Button
                          variant="outline"
                          size="sm"
                          title="Otvori PDF u novom tabu"
                        >
                          <FileText className="h-3.5 w-3.5" />
                          <span className="ml-1">PDF</span>
                        </Button>
                      </a>
                      <SendReportEmailButton
                        personId={r.personId}
                        fullName={`${r.firstName} ${r.lastName}`}
                        email={r.email}
                        periodLabel={`${MONTHS_SR[month - 1]} ${year}`}
                        year={year}
                        month={month}
                      />
                    </div>
                  );
                })()}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
