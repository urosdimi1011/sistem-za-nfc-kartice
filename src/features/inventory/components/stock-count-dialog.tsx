"use client";

import { useState, useTransition } from "react";
import { ClipboardList, Loader2, TriangleAlert } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createStockCountAction } from "../actions";
import type { StockCountResult } from "../service";

interface StockCountDialogProps {
  items: Array<{ id: string; name: string; categoryName: string }>;
}

function fmt(n: number) {
  return new Intl.NumberFormat("sr-RS").format(n);
}

/**
 * Popis zaliha — "slepi" unos: namerno NE prikazuje sistemsko stanje dok se
 * broji, da popisivač ne prepiše brojku koju vidi. Posle potvrde prikazuje
 * rezultat sa razlikama (manjak/višak) i vrednošću u kreditima.
 */
export function StockCountDialog({ items }: StockCountDialogProps) {
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({});
  const [note, setNote] = useState("");
  const [result, setResult] = useState<StockCountResult | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleOpenChange = (next: boolean) => {
    if (!next && isPending) return;
    setOpen(next);
    if (next) {
      setValues({});
      setNote("");
      setResult(null);
    }
  };

  const enteredCount = Object.values(values).filter((v) => v.trim() !== "").length;

  const handleSubmit = () => {
    const entries = items
      .filter((i) => (values[i.id] ?? "").trim() !== "")
      .map((i) => ({ menuItemId: i.id, counted: Number(values[i.id]) }));

    if (entries.length === 0) {
      toast.error("Unesi bar jednu izbrojanu stavku");
      return;
    }
    if (entries.some((e) => !Number.isInteger(e.counted) || e.counted < 0)) {
      toast.error("Izbrojano mora biti ceo broj ≥ 0");
      return;
    }

    startTransition(async () => {
      const r = await createStockCountAction({ note, items: entries });
      if (!r.ok || !r.data) {
        toast.error(r.ok ? "Greška" : r.error);
        return;
      }
      setResult(r.data);
      if (r.data.shortageCount === 0) {
        toast.success("Popis sačuvan — nema manjka");
      } else {
        toast.warning(
          `Popis sačuvan — manjak na ${r.data.shortageCount} ${r.data.shortageCount === 1 ? "stavci" : "stavke/i"}`,
        );
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button>
            <ClipboardList className="mr-2 h-4 w-4" />
            Popis
          </Button>
        }
      />
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        {result === null ? (
          <>
            <DialogHeader>
              <DialogTitle>Popis zaliha</DialogTitle>
              <DialogDescription>
                Prebroj robu i unesi stvarno stanje. Sistemsko stanje se
                namerno ne prikazuje — broji, ne prepisuj. Prazna polja se
                preskaču.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2">
              {items.length === 0 && (
                <p className="py-4 text-center text-sm text-zinc-500">
                  Nema stavki sa praćenjem zaliha.
                </p>
              )}
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-3 rounded-md border border-zinc-200 p-2.5 dark:border-zinc-800"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{item.name}</p>
                    <p className="text-xs text-zinc-500">{item.categoryName}</p>
                  </div>
                  <Input
                    type="number"
                    min={0}
                    step={1}
                    inputMode="numeric"
                    placeholder="—"
                    className="w-24 text-right"
                    value={values[item.id] ?? ""}
                    onChange={(e) =>
                      setValues((prev) => ({ ...prev, [item.id]: e.target.value }))
                    }
                  />
                </div>
              ))}
            </div>

            <Input
              placeholder="Napomena (opciono) — npr. nedeljni popis"
              value={note}
              maxLength={300}
              onChange={(e) => setNote(e.target.value)}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={isPending}
              >
                Otkaži
              </Button>
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={isPending || enteredCount === 0}
              >
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Potvrdi popis ({enteredCount})
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Rezultat popisa</DialogTitle>
              <DialogDescription>
                Stanje u sistemu je poravnato sa izbrojanim. Razlike su
                proknjižene kao korekcije.
              </DialogDescription>
            </DialogHeader>

            <div
              className={
                result.totalVarianceValue < 0
                  ? "flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm dark:border-red-900 dark:bg-red-950"
                  : "rounded-lg border border-green-200 bg-green-50 p-3 text-sm dark:border-green-900 dark:bg-green-950"
              }
            >
              {result.totalVarianceValue < 0 ? (
                <>
                  <TriangleAlert className="h-4 w-4 shrink-0 text-red-500" />
                  <span>
                    Ukupan manjak:{" "}
                    <strong>{fmt(Math.abs(result.totalVarianceValue))}</strong> (
                    {result.shortageCount}{" "}
                    {result.shortageCount === 1 ? "stavka" : "stavke/i"})
                  </span>
                </>
              ) : (
                <span>Nema manjka — stanje se slaže sa sistemom.</span>
              )}
            </div>

            <div className="max-h-64 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs text-zinc-500">
                  <tr>
                    <th className="py-1.5">Artikal</th>
                    <th className="py-1.5 text-right">Sistem</th>
                    <th className="py-1.5 text-right">Izbrojano</th>
                    <th className="py-1.5 text-right">Razlika</th>
                    <th className="py-1.5 text-right">Vrednost</th>
                  </tr>
                </thead>
                <tbody>
                  {result.items.map((i) => (
                    <tr
                      key={i.menuItemId}
                      className="border-t border-zinc-100 dark:border-zinc-800"
                    >
                      <td className="py-1.5">{i.name}</td>
                      <td className="py-1.5 text-right">{fmt(i.expected)}</td>
                      <td className="py-1.5 text-right">{fmt(i.counted)}</td>
                      <td
                        className={
                          i.variance < 0
                            ? "py-1.5 text-right font-medium text-red-600"
                            : i.variance > 0
                              ? "py-1.5 text-right font-medium text-amber-600"
                              : "py-1.5 text-right text-zinc-400"
                        }
                      >
                        {i.variance > 0 ? `+${fmt(i.variance)}` : fmt(i.variance)}
                      </td>
                      <td
                        className={
                          i.varianceValue < 0
                            ? "py-1.5 text-right font-medium text-red-600"
                            : "py-1.5 text-right text-zinc-400"
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
            </div>

            <DialogFooter>
              <Button type="button" onClick={() => handleOpenChange(false)}>
                Zatvori
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
