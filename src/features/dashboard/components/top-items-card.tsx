import Link from "next/link";
import { ArrowRight, Trophy } from "lucide-react";

import { cn } from "@/lib/utils";
import type { TopMenuItemRow } from "../queries";

interface TopItemsCardProps {
  items: TopMenuItemRow[];
}

export function TopItemsCard({ items }: TopItemsCardProps) {
  const max = Math.max(1, ...items.map((i) => i.totalQuantity));

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy className="h-4 w-4 text-amber-500" />
          <h3 className="text-sm font-semibold">Top 5 stavki ovog meseca</h3>
        </div>
        <Link
          href="/transakcije?type=ORDER"
          className="flex items-center gap-1 text-xs text-primary hover:underline"
        >
          Sve <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      <div className="mt-4 space-y-2.5">
        {items.length === 0 ? (
          <p className="py-4 text-center text-sm text-zinc-400">
            Nema porudžbina ovog meseca
          </p>
        ) : (
          items.map((item, idx) => {
            const widthPct = (item.totalQuantity / max) * 100;
            return (
              <div key={item.menuItemId} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <span
                      className={cn(
                        "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
                        idx === 0
                          ? "bg-amber-500/20 text-amber-700 dark:text-amber-400"
                          : "bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
                      )}
                    >
                      {idx + 1}
                    </span>
                    <span className="font-medium">{item.name}</span>
                  </span>
                  <span className="tabular-nums text-zinc-500">
                    × {item.totalQuantity}
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                  <div
                    className={cn(
                      "h-full rounded-full",
                      idx === 0 ? "bg-amber-500" : "bg-primary/60",
                    )}
                    style={{ width: `${widthPct}%` }}
                  />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
