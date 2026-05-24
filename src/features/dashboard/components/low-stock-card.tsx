import Link from "next/link";
import { AlertTriangle, ArrowRight, Package } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { MenuIcon } from "@/components/ui/menu-icon";
import { getColorPreset } from "@/lib/menu-presets";
import type { InventoryRow } from "@/features/inventory/queries";

interface LowStockCardProps {
  outOfStock: number;
  lowStock: number;
  items: InventoryRow[]; // prvih 5
}

export function LowStockCard({ outOfStock, lowStock, items }: LowStockCardProps) {
  const hasAny = outOfStock + lowStock > 0;

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Package className={hasAny ? "h-4 w-4 text-amber-500" : "h-4 w-4 text-zinc-400"} />
          <h3 className="font-semibold">Stanje zaliha</h3>
        </div>
        <Link
          href="/stanje"
          className="text-xs text-zinc-500 hover:text-primary inline-flex items-center gap-1"
        >
          Otvori <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
      <p className="mt-1 text-xs text-zinc-500">
        Šta treba da se naruči
      </p>

      {!hasAny ? (
        <p className="mt-6 py-4 text-center text-sm text-zinc-500">
          Sve zalihe su iznad praga. ✓
        </p>
      ) : (
        <>
          <div className="mt-4 flex items-center gap-4">
            {outOfStock > 0 && (
              <Badge
                variant="outline"
                className="border-red-500/40 text-red-700 dark:text-red-400"
              >
                {outOfStock} nestalo
              </Badge>
            )}
            {lowStock > 0 && (
              <Badge
                variant="outline"
                className="border-amber-500/40 text-amber-700 dark:text-amber-400"
              >
                {lowStock} nisko
              </Badge>
            )}
          </div>

          <ul className="mt-3 space-y-2">
            {items.map((r) => {
              const preset = getColorPreset(r.categoryColor);
              return (
                <li
                  key={r.id}
                  className="flex items-center justify-between gap-2 rounded-md bg-zinc-50 px-3 py-2 text-sm dark:bg-zinc-800/50"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    {r.icon && (
                      <MenuIcon
                        name={r.icon}
                        className={`h-3.5 w-3.5 ${preset.text}`}
                      />
                    )}
                    <span className="truncate">{r.name}</span>
                  </div>
                  <span
                    className={`shrink-0 text-xs font-semibold tabular-nums ${
                      r.status === "OUT"
                        ? "text-red-600 dark:text-red-400"
                        : "text-amber-600 dark:text-amber-400"
                    }`}
                  >
                    {r.status === "OUT" ? "nestalo" : `${r.stock} kom`}
                  </span>
                </li>
              );
            })}
          </ul>

          {outOfStock + lowStock > items.length && (
            <p className="mt-3 text-center text-xs text-zinc-500">
              <Link href="/stanje" className="hover:text-primary inline-flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                još {outOfStock + lowStock - items.length}…
              </Link>
            </p>
          )}
        </>
      )}
    </div>
  );
}
