"use client";

import { useState, useTransition } from "react";
import { format } from "date-fns";
import { sr } from "date-fns/locale";
import { CheckCircle2, Lock, AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { closeMonthAction } from "../actions";

interface MonthlyClosePanelProps {
  year: number;
  month: number;
  monthLabel: string;
  isClosed: boolean;
  closedAt: Date | null;
  closedByEmail: string | null;
  totalNegativeEmployees: number;
  employeesInNegative: number;
}

function fmt(n: number) {
  return new Intl.NumberFormat("sr-RS").format(n);
}

export function MonthlyClosePanel({
  year,
  month,
  monthLabel,
  isClosed,
  closedAt,
  closedByEmail,
  totalNegativeEmployees,
  employeesInNegative,
}: MonthlyClosePanelProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  // ─── ZATVOREN MESEC ────────────────────────────
  if (isClosed) {
    return (
      <div className="rounded-lg border border-green-500/40 bg-green-50/50 p-5 dark:bg-green-950/20">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-green-700 dark:text-green-300">
              Mesec {monthLabel} je zatvoren
            </h3>
            <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
              {closedAt && (
                <>
                  Zatvoreno {format(closedAt, "dd.MM.yyyy. HH:mm", { locale: sr })}
                  {closedByEmail && (
                    <>
                      {" "}
                      od strane{" "}
                      <span className="font-medium">{closedByEmail}</span>
                    </>
                  )}
                </>
              )}
            </p>
            <p className="mt-2 text-xs text-zinc-600 dark:text-zinc-400">
              Stanja zaposlenih su resetovana na 0, MONTHLY_RESET transakcije su
              kreirane u istoriji.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ─── BUDUĆI MESEC (nije ni počeo) ──────────────
  const now = new Date();
  const isFuture =
    year > now.getFullYear() ||
    (year === now.getFullYear() && month > now.getMonth() + 1);

  if (isFuture) {
    return (
      <div className="rounded-lg border border-zinc-200 bg-zinc-50/50 p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-start gap-3">
          <Lock className="mt-0.5 h-5 w-5 shrink-0 text-zinc-400" />
          <div>
            <h3 className="text-sm font-semibold">Budući mesec</h3>
            <p className="mt-1 text-xs text-zinc-500">
              Ne može se zatvoriti dok ne istekne.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ─── NEMA NEGATIVNIH ────────────────────────────
  if (employeesInNegative === 0) {
    return (
      <div className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-zinc-400" />
          <div>
            <h3 className="text-sm font-semibold">
              Nema zaposlenih u minusu
            </h3>
            <p className="mt-1 text-xs text-zinc-500">
              Mesečno zatvaranje nije potrebno — niko ne duguje od plate.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ─── AKTIVNO — ima šta da se zatvori ────────────
  const handleConfirm = () => {
    startTransition(async () => {
      const result = await closeMonthAction({ year, month });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(
        `Mesec ${monthLabel} zatvoren — ${result.data!.employeeCount} zaposlenih, ${fmt(result.data!.totalAmount)} RSD`,
      );
      setOpen(false);
    });
  };

  return (
    <div className="rounded-lg border border-amber-500/40 bg-amber-50/40 p-5 dark:bg-amber-950/20">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-amber-900 dark:text-amber-200">
            Spremno za zatvaranje meseca {monthLabel}
          </h3>
          <div className="mt-2 grid grid-cols-2 gap-3">
            <div className="rounded-md border border-zinc-200 bg-white p-2 dark:border-zinc-800 dark:bg-zinc-900">
              <div className="text-[10px] uppercase tracking-wider text-zinc-500">
                Zaposleni u minusu
              </div>
              <div className="text-xl font-bold tabular-nums">{employeesInNegative}</div>
            </div>
            <div className="rounded-md border border-zinc-200 bg-white p-2 dark:border-zinc-800 dark:bg-zinc-900">
              <div className="text-[10px] uppercase tracking-wider text-zinc-500">
                Za skidanje od plate
              </div>
              <div className="text-xl font-bold tabular-nums text-red-600">
                {fmt(totalNegativeEmployees)} RSD
              </div>
            </div>
          </div>
          <p className="mt-3 text-xs text-zinc-600 dark:text-zinc-400">
            Klikom na "Zatvori mesec" stanja zaposlenih sa minusom se vraćaju na 0
            i kreiraju se MONTHLY_RESET zapisi u istoriji. Operacija je atomarna
            i nepovratna iz UI-a.
          </p>

          <div className="mt-4">
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger
                render={
                  <Button variant="default">
                    <Lock className="mr-2 h-4 w-4" />
                    Zatvori mesec
                  </Button>
                }
              />
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Zatvori mesec {monthLabel}</DialogTitle>
                  <DialogDescription>
                    Stanja {employeesInNegative} zaposlena će biti resetovana na 0.
                    Ukupno {fmt(totalNegativeEmployees)} RSD treba skinuti od plata
                    za prethodni mesec. Akcija je atomarna.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setOpen(false)}
                    disabled={isPending}
                  >
                    Otkaži
                  </Button>
                  <Button
                    type="button"
                    onClick={handleConfirm}
                    disabled={isPending}
                  >
                    {isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Potvrdi zatvaranje
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>
    </div>
  );
}
