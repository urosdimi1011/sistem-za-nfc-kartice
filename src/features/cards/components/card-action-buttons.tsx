"use client";

import { useState, useTransition } from "react";
import { ArrowRightLeft, Ban, Loader2, RotateCcw } from "lucide-react";
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
import {
  blockCardAction,
  reactivateCardAction,
  reassignCardAction,
} from "../actions";
import { PersonCombobox, type ComboboxPerson } from "./person-combobox";

interface BaseProps {
  cardId: string;
  uid: string;
  personName: string;
}

export function BlockCardButton({ cardId, uid, personName }: BaseProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleConfirm = () => {
    startTransition(async () => {
      const r = await blockCardAction(cardId);
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success("Kartica blokirana");
      setOpen(false);
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="ghost" size="sm" title="Blokiraj karticu">
            <Ban className="h-4 w-4 text-red-600" />
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Blokiraj karticu</DialogTitle>
          <DialogDescription>
            Kartica <span className="font-mono">{uid}</span> osobe{" "}
            <strong>{personName}</strong> više neće moći da se koristi u baru.
            Možeš je ponovo aktivirati kasnije.
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
            variant="destructive"
            onClick={handleConfirm}
            disabled={isPending}
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Blokiraj
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface ReassignProps extends BaseProps {
  orderCount: number;
}

export function ReassignCardButton({
  cardId,
  uid,
  personName,
  orderCount,
}: ReassignProps) {
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState<ComboboxPerson | null>(null);
  const [isPending, startTransition] = useTransition();

  const hasHistory = orderCount > 0;

  const reset = () => {
    setTarget(null);
  };

  const handleConfirm = () => {
    if (!target) return;
    startTransition(async () => {
      const r = await reassignCardAction(cardId, target.id);
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success(
        `Kartica prebačena na ${target.lastName} ${target.firstName}`,
      );
      setOpen(false);
      reset();
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger
        render={
          <Button
            variant="ghost"
            size="sm"
            title="Prebaci karticu na drugu osobu"
          >
            <ArrowRightLeft className="h-4 w-4 text-blue-600" />
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Prebaci karticu na drugu osobu</DialogTitle>
          <DialogDescription>
            Kartica <span className="font-mono">{uid}</span> trenutno pripada{" "}
            <strong>{personName}</strong>. Izaberi osobu kojoj treba da pređe.
          </DialogDescription>
        </DialogHeader>

        {hasHistory ? (
          <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
            Ova kartica ima <strong>{orderCount}</strong>{" "}
            {orderCount === 1 ? "porudžbinu" : "porudžbina"}. Ne može se
            prebaciti jer bi se pomešala istorija potrošnje.
            <div className="mt-2 text-xs text-red-700/80 dark:text-red-300/80">
              Umesto toga: <strong>blokiraj</strong> karticu i registruj novu
              pravoj osobi.
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
              Nova osoba
            </label>
            <PersonCombobox value={target} onChange={setTarget} autoFocus />
            <p className="text-[11px] text-zinc-500">
              Ako nova osoba već ima aktivnu karticu, prebacivanje neće biti
              moguće.
            </p>
          </div>
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
          {!hasHistory && (
            <Button
              type="button"
              onClick={handleConfirm}
              disabled={isPending || !target}
            >
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Prebaci
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ReactivateCardButton({ cardId, uid, personName }: BaseProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleConfirm = () => {
    startTransition(async () => {
      const r = await reactivateCardAction(cardId);
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success("Kartica aktivirana");
      setOpen(false);
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="ghost" size="sm" title="Aktiviraj karticu">
            <RotateCcw className="h-4 w-4 text-green-600" />
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Aktiviraj karticu</DialogTitle>
          <DialogDescription>
            Kartica <span className="font-mono">{uid}</span> osobe{" "}
            <strong>{personName}</strong> će ponovo biti aktivna.
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
          <Button type="button" onClick={handleConfirm} disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Aktiviraj
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
