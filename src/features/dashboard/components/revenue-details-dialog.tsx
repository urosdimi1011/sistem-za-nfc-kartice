"use client";

import { useEffect, useState, useTransition } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { BarChart3, Loader2, TrendingUp } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { getRevenueByPeriodAction } from "../actions";
import type {
  RevenuePeriod,
  RevenuePeriodSummary,
} from "../queries";

interface RevenueDetailsDialogProps {
  trigger: React.ReactElement;
}

const PERIODS: { key: RevenuePeriod; label: string; hint: string }[] = [
  { key: "30days", label: "Poslednjih 30 dana", hint: "Dnevno" },
  { key: "monthly", label: "Poslednjih 12 meseci", hint: "Mesečno" },
  { key: "yearly", label: "Poslednjih 5 godina", hint: "Godišnje" },
];

function formatRsd(n: number) {
  return new Intl.NumberFormat("sr-RS").format(Math.round(n));
}

function compactRsd(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 100) / 10}k`;
  return String(n);
}

export function RevenueDetailsDialog({ trigger }: RevenueDetailsDialogProps) {
  const [open, setOpen] = useState(false);
  const [period, setPeriod] = useState<RevenuePeriod>("30days");
  const [data, setData] = useState<RevenuePeriodSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Učitaj podatke kad se modal otvori ili promeni period
  useEffect(() => {
    if (!open) return;
    setError(null);
    startTransition(async () => {
      const r = await getRevenueByPeriodAction(period);
      if (r.ok) setData(r.data);
      else setError(r.error);
    });
  }, [open, period]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-xl">Detaljan promet</DialogTitle>
              <DialogDescription className="mt-1">
                Analiza prihoda kroz različite periode.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* PERIOD TABS */}
        <div className="flex flex-wrap gap-2">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => setPeriod(p.key)}
              className={cn(
                "rounded-full border px-4 py-1.5 text-xs font-medium transition-colors",
                period === p.key
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-zinc-300 text-zinc-600 hover:border-primary hover:text-primary dark:border-zinc-700 dark:text-zinc-400",
              )}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* SUMMARY + CHART */}
        {error && (
          <div className="rounded-md border border-red-500/40 bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/20 dark:text-red-300">
            {error}
          </div>
        )}

        {isPending && !data && (
          <div className="flex h-64 items-center justify-center text-zinc-400">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        )}

        {data && (
          <>
            {/* KPI tri kvadrata */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <SummaryCard
                label="Ukupno"
                value={`${formatRsd(data.total)} RSD`}
                hint={`${data.totalOrders} porudžbina`}
              />
              <SummaryCard
                label={
                  period === "yearly"
                    ? "Prosečno godišnje"
                    : period === "monthly"
                      ? "Prosečno mesečno"
                      : "Prosečno dnevno"
                }
                value={`${formatRsd(data.average)} RSD`}
                hint="Računato samo na periodе sa aktivnošću"
              />
              <SummaryCard
                label="Najjači period"
                value={
                  data.peak
                    ? `${formatRsd(data.peak.revenue)} RSD`
                    : "—"
                }
                hint={data.peak?.label ?? "Nema podataka"}
                accent
              />
            </div>

            {/* CHART */}
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={data.rows}
                  margin={{ top: 10, right: 10, bottom: 0, left: -20 }}
                >
                  <defs>
                    <linearGradient
                      id="detailRevenueGradient"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="5%"
                        stopColor="var(--primary)"
                        stopOpacity={0.4}
                      />
                      <stop
                        offset="95%"
                        stopColor="var(--primary)"
                        stopOpacity={0.02}
                      />
                    </linearGradient>
                  </defs>

                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    className="stroke-zinc-200 dark:stroke-zinc-800"
                  />

                  <XAxis
                    dataKey="label"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11, fill: "currentColor" }}
                    className="text-zinc-500"
                    interval={
                      period === "30days" ? 3 : period === "monthly" ? 0 : 0
                    }
                  />

                  <YAxis
                    tickFormatter={compactRsd}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11, fill: "currentColor" }}
                    className="text-zinc-500"
                    width={45}
                  />

                  <Tooltip content={<DetailTooltip />} />

                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="var(--primary)"
                    strokeWidth={2.5}
                    fill="url(#detailRevenueGradient)"
                    activeDot={{
                      r: 5,
                      fill: "var(--primary)",
                      stroke: "white",
                      strokeWidth: 2,
                    }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* TOP 3 TABELA */}
            <TopList rows={data.rows} />
          </>
        )}

        <div className="flex justify-end pt-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Zatvori
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── PODKOMPONENTE ─────────────────────────────────────

function SummaryCard({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string;
  hint: string;
  accent?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border p-4",
        accent
          ? "border-primary/40 bg-primary/5"
          : "border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900",
      )}
    >
      <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
        {label}
      </p>
      <p
        className={cn(
          "mt-1 text-xl font-bold tabular-nums",
          accent && "text-primary",
        )}
      >
        {value}
      </p>
      <p className="mt-0.5 text-[11px] text-zinc-500">{hint}</p>
    </div>
  );
}

interface RevenueRow {
  key: string;
  label: string;
  revenue: number;
  orderCount: number;
}

function DetailTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload?: RevenueRow }[];
}) {
  if (!active || !payload || payload.length === 0) return null;
  const row = payload[0]?.payload;
  if (!row) return null;
  return (
    <div className="rounded-md border border-zinc-200 bg-white px-3 py-2 text-xs shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
      <div className="font-semibold">{row.label}</div>
      <div className="mt-1 space-y-0.5 tabular-nums">
        <div>
          <span className="text-zinc-500">Prihod:</span>{" "}
          <span className="font-bold text-foreground">
            {formatRsd(row.revenue)} RSD
          </span>
        </div>
        <div>
          <span className="text-zinc-500">Porudžbina:</span>{" "}
          <span className="font-medium">{row.orderCount}</span>
        </div>
      </div>
    </div>
  );
}

function TopList({ rows }: { rows: RevenueRow[] }) {
  const top = [...rows]
    .filter((r) => r.revenue > 0)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  if (top.length === 0) return null;

  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800">
      <div className="flex items-center gap-2 border-b border-zinc-200 px-4 py-2.5 dark:border-zinc-800">
        <TrendingUp className="h-4 w-4 text-primary" />
        <h4 className="text-sm font-semibold">Najjači periodi</h4>
      </div>
      <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
        {top.map((r, idx) => (
          <li
            key={r.key}
            className="flex items-center justify-between px-4 py-2.5 text-sm"
          >
            <div className="flex items-center gap-3">
              <span
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold",
                  idx === 0
                    ? "bg-primary/20 text-primary"
                    : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
                )}
              >
                {idx + 1}
              </span>
              <div>
                <p className="font-medium">{r.label}</p>
                <p className="text-[11px] text-zinc-500">
                  {r.orderCount} porudžbina
                </p>
              </div>
            </div>
            <p className="font-bold tabular-nums">
              {formatRsd(r.revenue)} RSD
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
