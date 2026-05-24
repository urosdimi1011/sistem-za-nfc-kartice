"use client";

import { format } from "date-fns";
import { sr } from "date-fns/locale";
import { ArrowDownRight, ArrowUpRight, RotateCcw, ShoppingCart } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { TransactionTypeLabel } from "@/lib/enums";

import { usePersonHistory } from "../hooks/use-person-history";

interface PersonCreditHistoryProps {
  personId: string;
}

function formatAmount(n: number) {
  const abs = new Intl.NumberFormat("sr-RS").format(Math.abs(n));
  return n >= 0 ? `+${abs}` : `−${abs}`;
}

const ICONS = {
  TOPUP: <ArrowUpRight className="h-3.5 w-3.5 text-green-600" />,
  MANUAL_DEDUCT: <ArrowDownRight className="h-3.5 w-3.5 text-red-600" />,
  ORDER: <ShoppingCart className="h-3.5 w-3.5 text-zinc-500" />,
  MONTHLY_RESET: <RotateCcw className="h-3.5 w-3.5 text-amber-600" />,
} as const;

function HistoryItemSkeleton() {
  return (
    <div className="flex items-center gap-3 rounded-md border border-zinc-200 bg-zinc-50/50 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900/50">
      <Skeleton className="h-3.5 w-3.5 shrink-0 rounded-full" />
      <div className="flex-1 space-y-1.5">
        <div className="flex items-center justify-between">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-3 w-14" />
        </div>
        <div className="flex items-center justify-between">
          <Skeleton className="h-2.5 w-20" />
          <Skeleton className="h-2.5 w-16" />
        </div>
      </div>
    </div>
  );
}

export function PersonCreditHistory({ personId }: PersonCreditHistoryProps) {
  const { data, isLoading, isError } = usePersonHistory(personId);

  if (isLoading) {
    return (
      <div className="space-y-1.5">
        {Array.from({ length: 3 }).map((_, i) => (
          <HistoryItemSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <p className="py-4 text-xs text-red-500">Greška pri učitavanju istorije.</p>
    );
  }

  const items = data?.items ?? [];

  if (items.length === 0) {
    return (
      <p className="py-4 text-xs text-zinc-400">
        Još uvek nema transakcija za ovu osobu.
      </p>
    );
  }

  return (
    <div className="space-y-1.5">
      {items.map((t) => (
        <div
          key={t.id}
          className="flex items-center gap-3 rounded-md border border-zinc-200 bg-zinc-50/50 px-3 py-2 text-xs dark:border-zinc-800 dark:bg-zinc-900/50"
        >
          {ICONS[t.type]}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium">{TransactionTypeLabel[t.type]}</span>
              <span
                className={cn(
                  "tabular-nums font-medium",
                  t.amount > 0
                    ? "text-green-700 dark:text-green-400"
                    : "text-red-700 dark:text-red-400",
                )}
              >
                {formatAmount(t.amount)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2 text-[11px] text-zinc-500">
              <span>{format(new Date(t.createdAt), "dd.MM. HH:mm", { locale: sr })}</span>
              <span className="tabular-nums">
                stanje: {new Intl.NumberFormat("sr-RS").format(t.balanceAfter)}
              </span>
            </div>
            {t.note && (
              <p className="mt-0.5 line-clamp-1 text-[11px] text-zinc-500" title={t.note}>
                {t.note}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
