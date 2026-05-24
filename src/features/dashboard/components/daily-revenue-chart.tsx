import { cn } from "@/lib/utils";
import type { DailyRevenueRow } from "../queries";

interface DailyRevenueChartProps {
  data: DailyRevenueRow[];
}

function formatRsd(n: number) {
  return new Intl.NumberFormat("sr-RS").format(n);
}

export function DailyRevenueChart({ data }: DailyRevenueChartProps) {
  const max = Math.max(1, ...data.map((d) => d.revenue));
  const today = data[data.length - 1];

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">Prihod zadnjih 7 dana</h3>
          <p className="mt-0.5 text-[11px] text-zinc-500">
            Naplaćeno preko bara po danima
          </p>
        </div>
        <div className="text-right">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
            Danas
          </div>
          <div className="text-lg font-bold tabular-nums">
            {formatRsd(today?.revenue ?? 0)}{" "}
            <span className="text-xs font-normal text-zinc-500">RSD</span>
          </div>
        </div>
      </div>

      <div className="mt-5 flex items-end gap-2 h-40">
        {data.map((d, idx) => {
          const heightPct = (d.revenue / max) * 100;
          const isToday = idx === data.length - 1;
          return (
            <div key={d.date} className="flex flex-1 flex-col items-center gap-1">
              <div className="relative flex w-full flex-1 items-end">
                <div
                  className={cn(
                    "w-full rounded-t-md transition-all",
                    isToday ? "bg-primary" : "bg-primary/40",
                  )}
                  style={{ height: `${Math.max(heightPct, 2)}%` }}
                  title={`${d.label}: ${formatRsd(d.revenue)} RSD`}
                />
              </div>
              <div
                className={cn(
                  "text-[10px] tabular-nums",
                  isToday ? "font-semibold text-foreground" : "text-zinc-500",
                )}
              >
                {d.label}
              </div>
              <div
                className={cn(
                  "text-[10px] tabular-nums",
                  isToday ? "font-medium" : "text-zinc-400",
                )}
              >
                {d.revenue > 0 ? formatRsd(d.revenue) : "—"}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
