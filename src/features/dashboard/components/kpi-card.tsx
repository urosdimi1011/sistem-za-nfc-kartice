import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  label: string;
  value: string;
  hint?: string;
  icon?: ReactNode;
  /** Tailwind tekstualna boja za ikonu/akcent. */
  accent?: "primary" | "green" | "amber" | "red" | "blue";
}

const ACCENTS = {
  primary: "text-primary bg-primary/10",
  green: "text-green-600 bg-green-500/10 dark:text-green-400",
  amber: "text-amber-600 bg-amber-500/10 dark:text-amber-400",
  red: "text-red-600 bg-red-500/10 dark:text-red-400",
  blue: "text-blue-600 bg-blue-500/10 dark:text-blue-400",
};

export function KpiCard({ label, value, hint, icon, accent = "primary" }: KpiCardProps) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
            {label}
          </p>
          <p className="mt-1 text-2xl font-bold tabular-nums">{value}</p>
          {hint && (
            <p className="mt-0.5 truncate text-[11px] text-zinc-500">{hint}</p>
          )}
        </div>
        {icon && (
          <div
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-md",
              ACCENTS[accent],
            )}
          >
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
