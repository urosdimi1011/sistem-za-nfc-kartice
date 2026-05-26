"use client";

import { useEffect, useState, useTransition } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
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
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { PersonTypeLabel } from "@/lib/enums";
import { UID_PATTERN } from "../schemas";
import { registerCardAction } from "../actions";
import { useUidCheck } from "../hooks/use-uid-check";
import { PersonCombobox, type ComboboxPerson } from "./person-combobox";
import { CardScanZone } from "./card-scan-zone";

interface RegisterCardDialogProps {
  /** Uncontrolled mode — pruži trigger element */
  trigger?: React.ReactElement;
  preselectedPerson?: ComboboxPerson;
  /** Controlled mode — pruži open + onOpenChange. trigger postaje opcionalan. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function RegisterCardDialog({
  trigger,
  preselectedPerson,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: RegisterCardDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = (next: boolean) => {
    if (isControlled) controlledOnOpenChange?.(next);
    else setInternalOpen(next);
  };
  const [person, setPerson] = useState<ComboboxPerson | null>(null);
  const [uid, setUid] = useState("");
  const debouncedUid = useDebouncedValue(uid, 250);
  const [isPending, startTransition] = useTransition();

  const { data: uidCheck, isFetching: uidCheckPending } = useUidCheck(debouncedUid);
  const uidExistsOn = uidCheck?.takenBy ?? null;

  useEffect(() => {
    if (open) {
      setPerson(preselectedPerson ?? null);
      setUid("");
    }
  }, [open, preselectedPerson]);

  const uidLooksValid = UID_PATTERN.test(uid);
  const uidStatus: "idle" | "valid" | "invalid" =
    !uid
      ? "idle"
      : uidExistsOn
        ? "invalid"
        : uidLooksValid
          ? "valid"
          : "invalid";

  const personHasActive = !!person?.activeCard;
  const canSubmit = person && uidLooksValid && !uidExistsOn && !uidCheckPending;

  const submit = () => {
    if (!person) return;
    startTransition(async () => {
      const result = await registerCardAction({
        personId: person.id,
        uid,
        replaceExisting: personHasActive,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(
        personHasActive
          ? "Stara kartica blokirana, nova registrovana"
          : "Kartica registrovana",
      );
      setOpen(false);
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger render={trigger} />}
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Registruj karticu</DialogTitle>
          <DialogDescription>
            Izaberi osobu pa prisloni karticu na čitač.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="space-y-2">
            <label className="block text-sm font-medium">Osoba</label>
            {preselectedPerson ? (
              <div className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900">
                <div className="flex items-center gap-2">
                  <span className="font-medium">
                    {preselectedPerson.lastName} {preselectedPerson.firstName}
                  </span>
                  <Badge
                    variant={
                      preselectedPerson.personType === "EMPLOYEE"
                        ? "default"
                        : "secondary"
                    }
                  >
                    {PersonTypeLabel[preselectedPerson.personType]}
                  </Badge>
                </div>
                {preselectedPerson.jmbg && (
                  <div className="mt-1 font-mono text-[11px] text-zinc-500">
                    {preselectedPerson.jmbg}
                  </div>
                )}
              </div>
            ) : (
              <PersonCombobox value={person} onChange={setPerson} autoFocus />
            )}
          </div>

          {personHasActive && (
            <div className="flex gap-3 rounded-md border border-amber-500/40 bg-amber-50 p-3 text-sm dark:bg-amber-950/20">
              <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />
              <div className="text-amber-900 dark:text-amber-200">
                <strong>Osoba već ima aktivnu karticu</strong> (
                <span className="font-mono text-xs">
                  {person?.activeCard?.uid}
                </span>
                ). Registracijom nove, stara će biti automatski blokirana.
              </div>
            </div>
          )}

          {person && (
            <CardScanZone
              value={uid}
              onChange={setUid}
              onClear={() => setUid("")}
              status={uidStatus}
              autoFocus
              errorText={
                uidExistsOn
                  ? `Ovaj UID je već registrovan na: ${uidExistsOn}`
                  : !uidLooksValid && uid
                    ? "UID sadrži neispravne znakove"
                    : undefined
              }
            />
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isPending}
          >
            Otkaži
          </Button>
          <Button type="button" onClick={submit} disabled={!canSubmit || isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {personHasActive ? "Zameni karticu" : "Registruj"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
