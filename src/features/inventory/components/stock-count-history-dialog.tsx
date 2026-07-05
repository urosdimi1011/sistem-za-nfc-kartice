"use client";

import { useState, useTransition } from "react";
import { ChevronDown, ChevronRight, History, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { getStockCountDetailAction } from "../actions";
import type { StockCountListRow, StockCountDetailItem } from "../queries";

interface StockCountHistoryDialogProps {
  counts: StockCountListRow[];
}

function fmt(n: number) {
  return new Intl.NumberFormat("sr-RS").format(n);
}

function fmtDate(d: Date) {
  return new Intl.DateTimeFormat("sr-RS", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(d));
}

/** Istorija popisa — lista sa manjkom po popisu, klik otvara stavke. */
export function StockCountHistoryDialog({ counts }: StockCountHistoryDialogProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [details, setDetails] = useState<Record<string, StockCountDetailItem[]>>({});
  const [isPending, startTransition] = useTransition();

  const toggle = (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(id);
    if (!details[id]) {
      startTransition(async () => {
        const r = await getStockCountDetailAction(id);
        if (!r.ok || !r.data) {
          toast.error(r.ok ? "Greška" : r.error);
          return;
        }
        setDetails((prev) => ({ ...prev, [id]: r.data!.items }));
      });
    }
  };

  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button variant="outline">
            <History className="mr-2 h-4 w-4" />
            Istorija popisa
          </Button>
        }
      />
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Istorija popisa</DialogTitle>
          <DialogDescription>
            Manjak između dva popisa = roba nestala bez evidencije u tom periodu.
          </DialogDescription>
        </DialogHeader>

        {counts.length === 0 && (
          <p className="py-6 text-center text-sm text-zinc-500">
            Još nema nijednog popisa.
          </p>
        )}

        <div className="space-y-2">
          {counts.map((c) => {
            const isOpen = expandedId === c.id;
            const items = details[c.id];
            return (
              <div
                key={c.id}
                className="rounded-md border border-zinc-200 dark:border-zinc-800"
              >
                <button
                  type="button"
                  onClick={() => toggle(c.id)}
                  className="flex w-full items-center justify-between gap-3 p-3 text-left hover:bg-zinc-50 dark:hover:bg-zinc-900"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{fmtDate(c.createdAt)}</p>
                    <p className="truncate text-xs text-zinc-500">
                      {c.performedByEmail} · {c.itemCount}{" "}
                      {c.itemCount === 1 ? "stavka" : "stavke/i"}
                      {c.note ? ` · ${c.note}` : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span
                      className={
                        c.totalVarianceValue < 0
                          ? "text-sm font-semibold text-red-600"
                          : "text-sm text-zinc-400"
                      }
                    >
                      {c.totalVarianceValue < 0
                        ? `manjak ${fmt(Math.abs(c.totalVarianceValue))}`
                        : "bez manjka"}
                    </span>
                    {isOpen ? (
                      <ChevronDown className="h-4 w-4 text-zinc-400" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-zinc-400" />
                    )}
                  </div>
                </button>

                {isOpen && (
                  <div className="border-t border-zinc-100 p-3 dark:border-zinc-800">
                    {!items && (
                      <div className="flex items-center justify-center gap-2 py-3 text-xs text-zinc-500">
                        {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                        Učitavam…
                      </div>
                    )}
                    {items && (
                      <table className="w-full text-xs">
                        <thead className="text-left text-zinc-500">
                          <tr>
                            <th className="py-1">Artikal</th>
                            <th className="py-1 text-right">Sistem</th>
                            <th className="py-1 text-right">Izbrojano</th>
                            <th className="py-1 text-right">Razlika</th>
                            <th className="py-1 text-right">Vrednost</th>
                          </tr>
                        </thead>
                        <tbody>
                          {items.map((i, idx) => (
                            <tr
                              key={idx}
                              className="border-t border-zinc-100 dark:border-zinc-800"
                            >
                              <td className="py-1">{i.name}</td>
                              <td className="py-1 text-right">{fmt(i.expected)}</td>
                              <td className="py-1 text-right">{fmt(i.counted)}</td>
                              <td
                                className={
                                  i.variance < 0
                                    ? "py-1 text-right font-medium text-red-600"
                                    : "py-1 text-right text-zinc-400"
                                }
                              >
                                {i.variance > 0
                                  ? `+${fmt(i.variance)}`
                                  : fmt(i.variance)}
                              </td>
                              <td
                                className={
                                  i.varianceValue < 0
                                    ? "py-1 text-right font-medium text-red-600"
                                    : "py-1 text-right text-zinc-400"
                                }
                              >
                                {i.varianceValue > 0
                                  ? `+${fmt(i.varianceValue)}`
                                  : fmt(i.varianceValue)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
