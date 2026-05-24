import {
  History,
  PackagePlus,
  SlidersHorizontal,
  Trash2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MenuIcon } from "@/components/ui/menu-icon";
import { getColorPreset } from "@/lib/menu-presets";

import type { InventoryRow } from "../queries";
import { RestockDialog } from "./restock-dialog";
import { WasteDialog } from "./waste-dialog";
import { AdjustStockDialog } from "./adjust-stock-dialog";
import { StockHistoryDialog } from "./stock-history-dialog";

interface InventoryTableProps {
  rows: InventoryRow[];
}

function StatusBadge({ row }: { row: InventoryRow }) {
  if (row.status === "OUT") {
    return (
      <Badge variant="outline" className="border-red-500/40 text-red-700 dark:text-red-400">
        Nestalo
      </Badge>
    );
  }
  if (row.status === "LOW") {
    return (
      <Badge variant="outline" className="border-amber-500/40 text-amber-700 dark:text-amber-400">
        Niska zaliha
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="border-green-500/40 text-green-700 dark:text-green-400">
      OK
    </Badge>
  );
}

export function InventoryTable({ rows }: InventoryTableProps) {
  if (rows.length === 0) {
    return (
      <div className="rounded-md border border-dashed py-16 text-center text-sm text-zinc-500">
        Nema rezultata za izabrane filtere.
      </div>
    );
  }

  return (
    <div className="rounded-md border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Stavka</TableHead>
            <TableHead>Kategorija</TableHead>
            <TableHead className="text-right">Stanje</TableHead>
            <TableHead className="text-right">Prag</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-[280px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => {
            const preset = getColorPreset(r.categoryColor);
            return (
              <TableRow
                key={r.id}
                className={r.status === "OUT" ? "bg-red-500/5" : ""}
              >
                <TableCell>
                  <div className="flex items-center gap-2">
                    {r.icon && (
                      <MenuIcon
                        name={r.icon}
                        className={`h-4 w-4 ${preset.text}`}
                      />
                    )}
                    <span className="font-medium">{r.name}</span>
                  </div>
                </TableCell>
                <TableCell className="text-xs text-zinc-500">
                  {r.categoryName}
                </TableCell>
                <TableCell className="text-right text-lg font-bold tabular-nums">
                  <span
                    className={
                      r.status === "OUT"
                        ? "text-red-600 dark:text-red-400"
                        : r.status === "LOW"
                          ? "text-amber-600 dark:text-amber-400"
                          : ""
                    }
                  >
                    {r.stock}
                  </span>
                </TableCell>
                <TableCell className="text-right text-xs text-zinc-500 tabular-nums">
                  ≤ {r.lowStockThreshold}
                </TableCell>
                <TableCell>
                  <StatusBadge row={r} />
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <RestockDialog
                      menuItemId={r.id}
                      itemName={r.name}
                      currentStock={r.stock}
                      trigger={
                        <Button variant="default" size="sm" title="Dopuni">
                          <PackagePlus className="h-3.5 w-3.5" />
                          <span className="ml-1 hidden sm:inline">Dopuni</span>
                        </Button>
                      }
                    />
                    <AdjustStockDialog
                      menuItemId={r.id}
                      itemName={r.name}
                      currentStock={r.stock}
                      trigger={
                        <Button variant="ghost" size="sm" title="Ručna korekcija">
                          <SlidersHorizontal className="h-3.5 w-3.5" />
                        </Button>
                      }
                    />
                    <WasteDialog
                      menuItemId={r.id}
                      itemName={r.name}
                      currentStock={r.stock}
                      trigger={
                        <Button variant="ghost" size="sm" title="Otpiši">
                          <Trash2 className="h-3.5 w-3.5 text-red-600" />
                        </Button>
                      }
                    />
                    <StockHistoryDialog
                      menuItemId={r.id}
                      itemName={r.name}
                      trigger={
                        <Button variant="ghost" size="sm" title="Istorija">
                          <History className="h-3.5 w-3.5" />
                        </Button>
                      }
                    />
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
