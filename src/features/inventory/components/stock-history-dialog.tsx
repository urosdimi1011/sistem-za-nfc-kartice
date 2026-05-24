"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { sr } from "date-fns/locale";
import { History, Loader2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getStockHistoryAction } from "../actions-history";
import type { StockMovementRow } from "../queries";

const TYPE_LABEL: Record<string, string> = {
  RESTOCK: "Dopuna",
  SALE: "Prodaja",
  ADJUSTMENT: "Korekcija",
  WASTE: "Otpis",
};

const TYPE_COLOR: Record<string, string> = {
  RESTOCK: "bg-green-500/15 text-green-700 dark:text-green-400",
  SALE: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
  ADJUSTMENT: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  WASTE: "bg-red-500/15 text-red-700 dark:text-red-400",
};

interface StockHistoryDialogProps {
  trigger: React.ReactElement;
  menuItemId: string;
  itemName: string;
}

export function StockHistoryDialog({
  trigger,
  menuItemId,
  itemName,
}: StockHistoryDialogProps) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<StockMovementRow[] | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setRows(null);
    getStockHistoryAction(menuItemId)
      .then((r) => {
        if (r.ok) setRows(r.data ?? []);
      })
      .finally(() => setLoading(false));
  }, [open, menuItemId]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Istorija stanja — {itemName}
          </DialogTitle>
          <DialogDescription>
            Poslednjih 100 promena. Najnovije prvo.
          </DialogDescription>
        </DialogHeader>

        {loading && (
          <div className="flex items-center justify-center py-12 text-zinc-500">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Učitavanje...
          </div>
        )}

        {!loading && rows && rows.length === 0 && (
          <p className="py-8 text-center text-sm text-zinc-500">
            Nema evidentiranih promena.
          </p>
        )}

        {!loading && rows && rows.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Datum</TableHead>
                <TableHead>Tip</TableHead>
                <TableHead className="text-right">Promena</TableHead>
                <TableHead className="text-right">Stanje posle</TableHead>
                <TableHead>Napomena</TableHead>
                <TableHead>Ko</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="text-xs text-zinc-500">
                    {format(r.createdAt, "dd.MM.yyyy. HH:mm", { locale: sr })}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={TYPE_COLOR[r.type]}>
                      {TYPE_LABEL[r.type]}
                    </Badge>
                  </TableCell>
                  <TableCell
                    className={`text-right font-semibold tabular-nums ${
                      r.quantity < 0
                        ? "text-red-600 dark:text-red-400"
                        : "text-green-600 dark:text-green-400"
                    }`}
                  >
                    {r.quantity > 0 ? `+${r.quantity}` : r.quantity}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {r.stockAfter}
                  </TableCell>
                  <TableCell className="text-xs text-zinc-600 dark:text-zinc-400">
                    {r.note ?? "—"}
                  </TableCell>
                  <TableCell className="text-xs text-zinc-500">
                    {r.performedByEmail ?? "sistem"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
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
