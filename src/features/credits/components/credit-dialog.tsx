"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Loader2,
  Minus,
  Plus,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { PersonTypeLabel, type PersonType } from "@/lib/enums";
import {
  PersonCombobox,
  type ComboboxPerson,
} from "@/features/cards/components/person-combobox";

import { DEDUCT_REASONS } from "../schemas";
import { topUpAction, deductAction } from "../actions";

export type CreditMode = "TOPUP" | "DEDUCT";

interface PreselectedPerson extends ComboboxPerson {
  currentBalance: number;
  hasCard?: boolean;
}

interface CreditDialogProps {
  mode: CreditMode;
  preselectedPerson?: PreselectedPerson;
  /** Uncontrolled mode — pruži trigger element */
  trigger?: React.ReactElement;
  /** Controlled mode — pruži open + onOpenChange. trigger postaje opcionalan. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /**
   * Ako je prosleđen, prikazuje se "Nazad" dugme u header-u koje vraća
   * korisnika na prethodni kontekst (npr. PersonDetailsDialog). Tada se
   * dijalog ne ponaša kao završna akcija već kao podstanica.
   */
  onBack?: () => void;
}

const QUICK_AMOUNTS = [100, 500, 1000, 2000, 5000];

function formatBalance(n: number) {
  return new Intl.NumberFormat("sr-RS").format(n);
}

export function CreditDialog({
  trigger,
  mode,
  preselectedPerson,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  onBack,
}: CreditDialogProps) {
  // Controlled vs uncontrolled: ako parent prosledi open + onOpenChange,
  // koristimo njih. Inače interno state. Time isti komponent radi i sa
  // trigger pattern-om i sa eksternom kontrolom (npr. PersonDetailsDialog
  // renderuje child dialog van svog tree-a da izbegne stacking konflikt).
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = (next: boolean) => {
    if (isControlled) controlledOnOpenChange?.(next);
    else setInternalOpen(next);
  };

  const [person, setPerson] = useState<ComboboxPerson | null>(null);
  const [amount, setAmount] = useState<number>(0);
  const [note, setNote] = useState("");
  const [isPending, startTransition] = useTransition();
  const queryClient = useQueryClient();

  const isTopUp = mode === "TOPUP";

  useEffect(() => {
    if (open) {
      setPerson(preselectedPerson ?? null);
      setAmount(0);
      setNote("");
    }
  }, [open, preselectedPerson]);

  const currentBalance = preselectedPerson?.currentBalance ?? 0;
  const newBalance = useMemo(
    () => currentBalance + (isTopUp ? amount : -amount),
    [currentBalance, amount, isTopUp],
  );

  const personType: PersonType | null = person?.personType ?? null;
  // Vizuelno upozorenje (server je konačni izvor istine — proverava tenant settings)
  const wouldGoNegative =
    !isTopUp && personType === "STUDENT" && newBalance < 0;

  const noteRequired = !isTopUp;
  const noteValid = noteRequired ? note.trim().length >= 3 : true;
  // wouldGoNegative ne blokira submit — server odlučuje na osnovu pravila tenanta
  const canSubmit = person && amount > 0 && noteValid && !isPending;

  const addToAmount = (n: number) => setAmount((cur) => cur + n);
  const resetAmount = () => setAmount(0);

  const submit = () => {
    if (!person) return;
    startTransition(async () => {
      const payload = {
        personId: person.id,
        amount,
        note: note.trim() || undefined,
      };
      const result = isTopUp
        ? await topUpAction(payload)
        : await deductAction({ ...payload, note: note.trim() });

      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      // Invalidiraj sve React Query cache-ove koji se odnose na ovu osobu
      queryClient.invalidateQueries({ queryKey: ["person-history", person.id] });
      queryClient.invalidateQueries({ queryKey: ["people-search"] });
      toast.success(
        isTopUp
          ? `Uplaćeno ${formatBalance(amount)} kredita`
          : `Skinuto ${formatBalance(amount)} kredita`,
      );
      setOpen(false);
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger render={trigger} />}
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
            title="Nazad na prethodni ekran"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Nazad
          </button>
        )}
        <DialogHeader className={onBack ? "pt-6" : undefined}>
          <div className="flex items-start gap-3">
            <div
              className={cn(
                "flex h-11 w-11 shrink-0 items-center justify-center rounded-full",
                isTopUp
                  ? "bg-green-500/15 text-green-600 dark:text-green-400"
                  : "bg-red-500/15 text-red-600 dark:text-red-400",
              )}
            >
              {isTopUp ? (
                <Plus className="h-5 w-5" />
              ) : (
                <Minus className="h-5 w-5" />
              )}
            </div>
            <div className="flex-1">
              <DialogTitle className="text-xl">
                {isTopUp ? "Dodaj kredite" : "Skini kredite"}
              </DialogTitle>
              <DialogDescription className="mt-1">
                {isTopUp
                  ? "Uplata kredita na nalog osobe."
                  : "Ručno skidanje (npr. ispravka greške). Napomena obavezna."}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-5">
          {!preselectedPerson && (
            <div className="space-y-2">
              <label className="block text-sm font-medium">Osoba</label>
              <PersonCombobox value={person} onChange={setPerson} autoFocus />
            </div>
          )}

          {preselectedPerson && (
            <div className="rounded-xl border border-zinc-200 bg-gradient-to-br from-zinc-50 to-white p-4 dark:border-zinc-800 dark:from-zinc-800/50 dark:to-zinc-900">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">
                    {preselectedPerson.firstName} {preselectedPerson.lastName}
                  </p>
                  <Badge
                    variant={
                      preselectedPerson.personType === "EMPLOYEE"
                        ? "default"
                        : "secondary"
                    }
                    className="mt-1"
                  >
                    {PersonTypeLabel[preselectedPerson.personType]}
                  </Badge>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-[10px] uppercase tracking-wide text-zinc-500">
                    Stanje
                  </p>
                  <p
                    className={cn(
                      "text-lg font-bold tabular-nums",
                      currentBalance < 0
                        ? "text-red-600 dark:text-red-400"
                        : currentBalance === 0
                          ? "text-zinc-400"
                          : "text-zinc-700 dark:text-zinc-300",
                    )}
                  >
                    {formatBalance(currentBalance)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* No-card upozorenje — radi i za preselected i za combobox izbor */}
          {(() => {
            const selected = preselectedPerson ?? person;
            if (!selected) return null;
            // preselectedPerson nosi hasCard, combobox-ova ComboboxPerson nosi activeCard
            const hasCard =
              "hasCard" in selected && selected.hasCard !== undefined
                ? selected.hasCard
                : !!selected.activeCard;
            if (hasCard) return null;
            return (
              <div className="flex items-start gap-2 rounded-md border border-blue-500/30 bg-blue-50/50 px-3 py-2 text-xs text-blue-800 dark:bg-blue-950/20 dark:text-blue-200">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>
                  Osoba još nema karticu — kredite će moći da koristi tek po
                  dodeljivanju kartice.
                </span>
              </div>
            );
          })()}

          {/* IZNOS */}
          <div className="space-y-2">
            <label className="block text-sm font-medium">Iznos</label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={amount || ""}
                  onChange={(e) => setAmount(Number(e.target.value) || 0)}
                  placeholder="0"
                  className="pr-12 text-right font-mono text-lg"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-400">
                  RSD
                </span>
              </div>
              {amount > 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={resetAmount}
                >
                  Resetuj
                </Button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <p className="w-full text-xs text-zinc-500">
                Klikni više puta da se sabira:
              </p>
              {QUICK_AMOUNTS.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => addToAmount(q)}
                  className={cn(
                    "rounded-md border border-zinc-200 px-3 py-1 text-xs font-medium transition-all hover:border-primary hover:bg-primary/10 active:scale-95 dark:border-zinc-700",
                    isTopUp ? "hover:text-primary" : "hover:border-red-500 hover:bg-red-50 hover:text-red-600",
                  )}
                >
                  + {formatBalance(q)}
                </button>
              ))}
            </div>
          </div>

          {/* PREVIEW STANJA */}
          {(person || preselectedPerson) && amount > 0 && preselectedPerson && (
            <div
              className={cn(
                "flex items-center justify-center gap-3 rounded-md border px-4 py-3 text-sm",
                wouldGoNegative
                  ? "border-red-500/40 bg-red-50 dark:bg-red-950/20"
                  : isTopUp
                    ? "border-green-500/40 bg-green-50 dark:bg-green-950/20"
                    : "border-amber-500/40 bg-amber-50 dark:bg-amber-950/20",
              )}
            >
              <span className="tabular-nums text-zinc-500">
                {formatBalance(currentBalance)}
              </span>
              <ArrowRight className="h-4 w-4 text-zinc-400" />
              <span
                className={cn(
                  "font-bold tabular-nums",
                  newBalance < 0 && "text-red-600",
                )}
              >
                {formatBalance(newBalance)} kredita
              </span>
            </div>
          )}

          {wouldGoNegative && (
            <div className="rounded-md border border-amber-500/40 bg-amber-50 p-3 text-sm text-amber-700 dark:bg-amber-950/20 dark:text-amber-300">
              Učenik bi išao u minus. Ako pravila tenanta to ne dozvoljavaju,
              server će odbiti. Pravilo se menja u Podešavanja → Pravila.
            </div>
          )}

          {/* NAPOMENA */}
          <div className="space-y-2">
            <label className="block text-sm font-medium">
              Napomena {noteRequired && <span className="text-red-600">*</span>}
            </label>
            {!isTopUp && (
              <div className="flex flex-wrap gap-2">
                {DEDUCT_REASONS.map((reason) => (
                  <button
                    key={reason}
                    type="button"
                    onClick={() => setNote(reason)}
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs transition-all",
                      note === reason
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-zinc-300 hover:border-primary dark:border-zinc-700",
                    )}
                  >
                    {reason}
                  </button>
                ))}
              </div>
            )}
            <Textarea
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={
                isTopUp
                  ? "Opciono — npr. 'Roditelj uplatio za mart'"
                  : "Razlog skidanja (klikni iznad ili kucaj svoj)"
              }
            />
            {noteRequired && note.trim().length > 0 && note.trim().length < 3 && (
              <p className="text-xs text-red-600">Napomena mora imati bar 3 znaka</p>
            )}
          </div>
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
          <Button
            type="button"
            variant={isTopUp ? "default" : "destructive"}
            onClick={submit}
            disabled={!canSubmit}
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isTopUp ? "Uplati" : "Skini"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
