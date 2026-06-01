"use client";

import { useState, useTransition } from "react";
import { Loader2, Undo2 } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { reverseTransactionAction } from "../actions";
import { TransactionTypeLabel } from "@/lib/enums";
import type { TransactionListItem } from "../queries";

interface ReverseTransactionButtonProps {
  tx: TransactionListItem;
}

function formatAmount(n: number) {
  const abs = new Intl.NumberFormat("sr-RS").format(Math.abs(n));
  return n >= 0 ? `+${abs}` : `−${abs}`;
}

export function ReverseTransactionButton({ tx }: ReverseTransactionButtonProps) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [restoreStock, setRestoreStock] = useState(true);
  const [isPending, startTransition] = useTransition();

  const isOrder = tx.type === "ORDER";

  const handleConfirm = () => {
    const r = reason.trim();
    if (!r) {
      toast.error("Razlog je obavezan.");
      return;
    }
    startTransition(async () => {
      const result = await reverseTransactionAction(
        tx.id,
        r,
        isOrder ? restoreStock : false,
      );
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(
        `Transakcija stornirana. Novo stanje: ${result.data?.newBalance ?? "-"}`,
      );
      setOpen(false);
      setReason("");
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setReason("");
      }}
    >
      <DialogTrigger
        render={
          <Button
            variant="ghost"
            size="sm"
            title="Storniraj transakciju"
            className="h-7 w-7 p-0"
          >
            <Undo2 className="h-3.5 w-3.5 text-amber-600" />
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Storniraj transakciju</DialogTitle>
          <DialogDescription>
            Originalna transakcija ostaje u istoriji radi audita. Pravi se nova
            transakcija tipa <strong>Storno</strong> sa suprotnim iznosom.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 rounded-md border border-zinc-200 bg-zinc-50 p-3 text-sm dark:border-zinc-800 dark:bg-zinc-900/50">
          <div className="flex justify-between gap-2">
            <span className="text-zinc-500">Osoba</span>
            <span className="font-medium">
              {tx.person.lastName} {tx.person.firstName}
            </span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-zinc-500">Tip</span>
            <span>{TransactionTypeLabel[tx.type]}</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-zinc-500">Iznos</span>
            <span
              className={
                tx.amount >= 0
                  ? "font-medium text-green-700 dark:text-green-400"
                  : "font-medium text-red-700 dark:text-red-400"
              }
            >
              {formatAmount(tx.amount)}
            </span>
          </div>
          {tx.note && (
            <div className="flex justify-between gap-2">
              <span className="shrink-0 text-zinc-500">Napomena</span>
              <span className="text-right text-xs text-zinc-600 dark:text-zinc-400">
                {tx.note}
              </span>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <label
            htmlFor="reverse-reason"
            className="text-xs font-medium text-zinc-600 dark:text-zinc-400"
          >
            Razlog storna <span className="text-red-500">*</span>
          </label>
          <Input
            id="reverse-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="npr. konobar je pogrešno naplatio 2× espreso"
            autoFocus
            disabled={isPending}
          />
        </div>

        {isOrder && (
          <label className="flex cursor-pointer items-start gap-2 rounded-md border border-zinc-200 p-3 text-sm dark:border-zinc-800">
            <input
              type="checkbox"
              checked={restoreStock}
              onChange={(e) => setRestoreStock(e.target.checked)}
              className="mt-0.5"
              disabled={isPending}
            />
            <span>
              <span className="font-medium">Vrati stavke na stanje</span>
              <span className="block text-xs text-zinc-500">
                Korigovaće zalihe za sve stavke iz porudžbine (samo one kojima
                se prati stanje). Isključi ako su pića već potrošena.
              </span>
            </span>
          </label>
        )}

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
            variant="destructive"
            onClick={handleConfirm}
            disabled={isPending || !reason.trim()}
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Storniraj
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
