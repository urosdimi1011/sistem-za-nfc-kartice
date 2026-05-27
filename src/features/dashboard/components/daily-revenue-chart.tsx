"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { BarChart3 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { RevenueDetailsDialog } from "./revenue-details-dialog";
import type { DailyRevenueRow } from "../queries";

interface DailyRevenueChartProps {
  data: DailyRevenueRow[];
}

function formatRsd(n: number) {
  return new Intl.NumberFormat("sr-RS").format(n);
}

/** Kratko formatiranje za Y axis (1500 → 1.5k) — tick brojevi ne treba da budu glomazni. */
function compactRsd(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 100) / 10}k`;
  return String(n);
}

interface TooltipPayload {
  payload?: DailyRevenueRow & { isToday?: boolean };
  value?: number;
}

function ChartTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: TooltipPayload[];
}) {
  if (!active || !payload || payload.length === 0) return null;
  const item = payload[0];
  const row = item?.payload;
  if (!row) return null;
  return (
    <div className="rounded-md border border-zinc-200 bg-white px-3 py-2 text-xs shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
      <div className="font-semibold">
        {row.label} {row.isToday && <span className="text-primary">(danas)</span>}
      </div>
      <div className="mt-1 tabular-nums">
        <span className="text-zinc-500">Prihod:</span>{" "}
        <span className="font-bold text-foreground">
          {formatRsd(row.revenue)} RSD
        </span>
      </div>
    </div>
  );
}

export function DailyRevenueChart({ data }: DailyRevenueChartProps) {
  const today = data[data.length - 1];
  const total = data.reduce((s, d) => s + d.revenue, 0);

  // Anotiraj poslednji dan kao "isToday" radi tooltip prikaza
  const chartData = data.map((d, idx) => ({
    ...d,
    isToday: idx === data.length - 1,
  }));

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold">Prihod zadnjih 7 dana</h3>
          <p className="mt-0.5 text-[11px] text-zinc-500">
            Naplaćeno preko bara po danima
          </p>
        </div>
        <div className="flex items-start gap-6">
          <div className="text-right">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
              Danas
            </div>
            <div className="text-lg font-bold tabular-nums text-primary">
              {formatRsd(today?.revenue ?? 0)}{" "}
              <span className="text-xs font-normal text-zinc-500">RSD</span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
              Ukupno 7d
            </div>
            <div className="text-lg font-bold tabular-nums">
              {formatRsd(total)}{" "}
              <span className="text-xs font-normal text-zinc-500">RSD</span>
            </div>
          </div>
          <RevenueDetailsDialog
            trigger={
              <Button variant="outline" size="sm" className="gap-1.5">
                <BarChart3 className="h-3.5 w-3.5" />
                Detaljnije
              </Button>
            }
          />
        </div>
      </div>

      <div className="mt-5 h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
            margin={{ top: 10, right: 10, bottom: 0, left: -20 }}
          >
            {/* Gradient fill za area — primary boja, blago se gubi ka dnu */}
            <defs>
              <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
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
            />

            <YAxis
              tickFormatter={compactRsd}
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11, fill: "currentColor" }}
              className="text-zinc-500"
              width={45}
            />

            <Tooltip
              content={<ChartTooltip />}
              cursor={{
                stroke: "var(--primary)",
                strokeWidth: 1,
                strokeDasharray: "3 3",
              }}
            />

            <Area
              type="monotone"
              dataKey="revenue"
              stroke="var(--primary)"
              strokeWidth={2.5}
              fill="url(#revenueGradient)"
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
    </div>
  );
}
