import Link from "next/link";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Clock,
  RotateCcw,
  ShoppingCart,
  Undo2,
} from "lucide-react";
import { formatDistanceToNowStrict } from "date-fns";
import { sr } from "date-fns/locale";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { PersonTypeLabel, TransactionTypeLabel } from "@/lib/enums";
import { personCreditsHref } from "@/features/credits/lib/links";

import type { RecentTxRow } from "../queries";

const ICONS = {
  TOPUP: <ArrowUpRight className="h-3.5 w-3.5 text-green-600" />,
  MANUAL_DEDUCT: <ArrowDownRight className="h-3.5 w-3.5 text-red-600" />,
  ORDER: <ShoppingCart className="h-3.5 w-3.5 text-zinc-500" />,
  MONTHLY_RESET: <RotateCcw className="h-3.5 w-3.5 text-amber-600" />,
  REVERSAL: <Undo2 className="h-3.5 w-3.5 text-amber-600" />,
} as const;

function formatAmount(n: number) {
  const abs = new Intl.NumberFormat("sr-RS").format(Math.abs(n));
  return n >= 0 ? `+${abs}` : `−${abs}`;
}

interface RecentActivityCardProps {
  rows: RecentTxRow[];
}

export function RecentActivityCard({ rows }: RecentActivityCardProps) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-zinc-500" />
          <h3 className="text-sm font-semibold">Najnovija aktivnost</h3>
        </div>
        <Link
          href="/transakcije"
          className="flex items-center gap-1 text-xs text-primary hover:underline"
        >
          Sve <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      <div className="mt-4 space-y-1.5">
        {rows.length === 0 ? (
          <p className="py-4 text-center text-sm text-zinc-400">
            Još uvek nema transakcija
          </p>
        ) : (
          rows.map((t) => (
            <Link
              key={t.id}
              href={personCreditsHref(t.person.id)}
              className="flex items-center gap-3 rounded-md border border-zinc-200 px-3 py-2 text-xs transition-colors hover:border-primary/40 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800/50"
            >
              <span className="shrink-0">{ICONS[t.type]}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium">
                    {t.person.lastName} {t.person.firstName}
                  </span>
                  <Badge
                    variant={
                      t.person.personType === "EMPLOYEE" ? "default" : "secondary"
                    }
                    className="text-[9px]"
                  >
                    {PersonTypeLabel[t.person.personType]}
                  </Badge>
                  <span className="text-zinc-400">·</span>
                  <span className="text-zinc-500">
                    {TransactionTypeLabel[t.type]}
                  </span>
                  {t.note && (
                    <span className="hidden truncate text-zinc-500 sm:inline">
                      · {t.note}
                    </span>
                  )}
                </div>
                <div className="mt-0.5 text-[10px] text-zinc-400">
                  {formatDistanceToNowStrict(t.createdAt, {
                    locale: sr,
                    addSuffix: true,
                  })}
                </div>
              </div>
              <span
                className={cn(
                  "shrink-0 tabular-nums font-medium",
                  t.amount > 0
                    ? "text-green-700 dark:text-green-400"
                    : "text-red-700 dark:text-red-400",
                )}
              >
                {formatAmount(t.amount)}
              </span>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
