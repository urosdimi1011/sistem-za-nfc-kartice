"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
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

import { togglePersonActiveAction } from "../actions";

interface ToggleActiveDialogProps {
  trigger: React.ReactElement;
  personId: string;
  personName: string;
  isCurrentlyActive: boolean;
}

export function ToggleActiveDialog({
  trigger,
  personId,
  personName,
  isCurrentlyActive,
}: ToggleActiveDialogProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const targetActive = !isCurrentlyActive;
  const verb = targetActive ? "Aktiviraj" : "Deaktiviraj";

  const handleConfirm = () => {
    startTransition(async () => {
      const result = await togglePersonActiveAction(personId, targetActive);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(targetActive ? "Osoba aktivirana" : "Osoba deaktivirana");
      setOpen(false);
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{verb} osobu</DialogTitle>
          <DialogDescription>
            {isCurrentlyActive ? (
              <>
                Deaktiviranjem osoba <strong>{personName}</strong> više neće
                moći da koristi karticu. Istorija ostaje sačuvana i može se
                ponovo aktivirati.
              </>
            ) : (
              <>
                Aktiviranjem osoba <strong>{personName}</strong> ponovo
                može da koristi karticu i sistem.
              </>
            )}
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
            variant={targetActive ? "default" : "destructive"}
            onClick={handleConfirm}
            disabled={isPending}
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {verb}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
