"use client";

import { useState, useTransition } from "react";
import { Ban, Loader2, RotateCcw } from "lucide-react";
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
import { blockCardAction, reactivateCardAction } from "../actions";

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
