import { Clock, Receipt, RotateCcw, TrendingUp, Wine } from "lucide-react";
import { z } from "zod";

import { PageHeader } from "@/components/ui/page-header";
import { getShiftReport, listBartenderOptions } from "@/features/shifts/queries";
import { ShiftFilters } from "@/features/shifts/components/shift-filters";

export const dynamic = "force-dynamic";

const DATETIME_LOCAL = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

const paramsSchema = z.object({
  bartenderId: z.string().trim().optional(),
  from: z.string().regex(DATETIME_LOCAL).optional(),
  to: z.string().regex(DATETIME_LOCAL).optional(),
});

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function fmt(n: number) {
  return new Intl.NumberFormat("sr-RS").format(n);
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function toLocalInput(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default async function SmenePage({ searchParams }: PageProps) {
  const raw = await searchParams;
  const parsed = paramsSchema.safeParse({
    bartenderId: raw.bartenderId,
    from: raw.from,
    to: raw.to,
  });
  const q = parsed.success ? parsed.data : {};

  // Default: današnji dan od ponoći do sada
  const defaultFrom = new Date();
  defaultFrom.setHours(0, 0, 0, 0);
  const from = q.from ? new Date(q.from) : defaultFrom;
  const to = q.to ? new Date(q.to) : new Date();
  const bartenderId = q.bartenderId ?? null;

  const [report, bartenders] = await Promise.all([
    getShiftReport({ bartenderId, from, to }),
    listBartenderOptions(),
  ]);

  const kpis = [
    {
      label: "Promet",
      value: fmt(report.totalRevenue),
      icon: <TrendingUp className="h-4 w-4" />,
    },
    {
      label: "Porudžbine",
      value: `${fmt(report.orderCount)}`,
      icon: <Receipt className="h-4 w-4" />,
    },
    {
      label: "Prosečna porudžbina",
      value: fmt(report.avgOrder),
      icon: <Wine className="h-4 w-4" />,
    },
    {
      label: "Storna",
      value:
        report.cancelledCount > 0
          ? `${report.cancelledCount} (${fmt(report.cancelledValue)})`
          : "0",
      icon: <RotateCcw className="h-4 w-4" />,
      warn: report.cancelledCount > 0,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Presek smene"
        description="Prodaja po konobaru i periodu — promet, artikli, storna. Uporedi sa popisom zaliha za pun uvid."
        icon={<Clock className="h-5 w-5" />}
      />

      <ShiftFilters
        bartenders={bartenders}
        bartenderId={bartenderId}
        from={toLocalInput(from)}
        to={toLocalInput(to)}
      />

      {/* KPI kartice */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpis.map((k) => (
          <div
            key={k.label}
            className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              {k.icon}
              {k.label}
            </div>
            <p
              className={
                k.warn
                  ? "mt-1 text-xl font-semibold text-amber-600"
                  : "mt-1 text-xl font-semibold"
              }
            >
              {k.value}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Po konobaru */}
        <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="mb-3 text-sm font-semibold">Po konobaru</h2>
          {report.bartenders.length === 0 ? (
            <p className="py-4 text-center text-sm text-zinc-500">
              Nema porudžbina u periodu.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-zinc-500">
                <tr>
                  <th className="py-1.5">Konobar</th>
                  <th className="py-1.5 text-right">Porudžbine</th>
                  <th className="py-1.5 text-right">Storna</th>
                  <th className="py-1.5 text-right">Promet</th>
                </tr>
              </thead>
              <tbody>
                {report.bartenders.map((b) => (
                  <tr
                    key={b.id}
                    className="border-t border-zinc-100 dark:border-zinc-800"
                  >
                    <td className="py-2">{b.email}</td>
                    <td className="py-2 text-right">{fmt(b.orderCount)}</td>
                    <td
                      className={
                        b.cancelledCount > 0
                          ? "py-2 text-right font-medium text-amber-600"
                          : "py-2 text-right text-zinc-400"
                      }
                    >
                      {b.cancelledCount}
                    </td>
                    <td className="py-2 text-right font-medium">
                      {fmt(b.revenue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Po artiklu */}
        <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="mb-3 text-sm font-semibold">Prodato po artiklu</h2>
          {report.items.length === 0 ? (
            <p className="py-4 text-center text-sm text-zinc-500">
              Nema prodaje u periodu.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-zinc-500">
                <tr>
                  <th className="py-1.5">Artikal</th>
                  <th className="py-1.5 text-right">Količina</th>
                  <th className="py-1.5 text-right">Promet</th>
                </tr>
              </thead>
              <tbody>
                {report.items.map((i) => (
                  <tr
                    key={i.name}
                    className="border-t border-zinc-100 dark:border-zinc-800"
                  >
                    <td className="py-2">{i.name}</td>
                    <td className="py-2 text-right">{fmt(i.quantity)}</td>
                    <td className="py-2 text-right font-medium">{fmt(i.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
