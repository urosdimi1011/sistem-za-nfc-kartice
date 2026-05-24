import Link from "next/link";
import { AlertTriangle, ArrowRight } from "lucide-react";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { PersonTypeLabel } from "@/lib/enums";
import { personCreditsHref } from "@/features/credits/lib/links";

import type { NegativeBalanceRow } from "../queries";

interface BalanceWarningsCardProps {
  title: string;
  hint: string;
  rows: NegativeBalanceRow[];
  emptyText: string;
  /** Boja akcenta — crvena za zaposlene u minusu, amber za učenike sa malim stanjem */
  variant?: "danger" | "warning";
}

function formatBalance(n: number) {
  const formatted = new Intl.NumberFormat("sr-RS").format(Math.abs(n));
  return n < 0 ? `−${formatted}` : formatted;
}

export function BalanceWarningsCard({
  title,
  hint,
  rows,
  emptyText,
  variant = "danger",
}: BalanceWarningsCardProps) {
  const iconColor = variant === "danger" ? "text-red-500" : "text-amber-500";
  const valueColor =
    variant === "danger"
      ? "text-red-600 dark:text-red-400"
      : "text-amber-600 dark:text-amber-400";

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center gap-2">
        <AlertTriangle className={cn("h-4 w-4", iconColor)} />
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      <p className="mt-1 text-[11px] text-zinc-500">{hint}</p>

      <div className="mt-4 space-y-2">
        {rows.length === 0 ? (
          <p className="py-4 text-center text-sm text-zinc-400">{emptyText}</p>
        ) : (
          rows.map((p) => (
            <Link
              key={p.personId}
              href={personCreditsHref(p.personId)}
              className="flex items-center justify-between gap-2 rounded-md border border-zinc-200 px-3 py-2 text-sm transition-colors hover:border-primary/40 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800/50"
            >
              <span className="flex items-center gap-2">
                <span className="font-medium">
                  {p.lastName} {p.firstName}
                </span>
                <Badge
                  variant={p.personType === "EMPLOYEE" ? "default" : "secondary"}
                  className="text-[10px]"
                >
                  {PersonTypeLabel[p.personType]}
                </Badge>
              </span>
              <span className={cn("font-bold tabular-nums", valueColor)}>
                {formatBalance(p.balance)}
              </span>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
