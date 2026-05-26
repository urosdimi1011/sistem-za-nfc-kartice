"use client";

import {
  AlertTriangle,
  CheckCircle,
  Loader2,
  Minus,
  Plus,
  RotateCcw,
  ShoppingCart,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { PersonTypeLabel } from "@/lib/enums";
import { PersonAvatar } from "@/features/people/components/person-avatar";

import type { BarCardLookup } from "../service";

export interface CartLine {
  menuItemId: string;
  name: string;
  unitPrice: number;
  quantity: number;
}

interface CustomerPanelProps {
  lookup: BarCardLookup;
  cart: CartLine[];
  totalCredits: number;
  onIncrement: (itemId: string) => void;
  onDecrement: (itemId: string) => void;
  onRemove: (itemId: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
  isConfirming: boolean;
}

function formatBalance(n: number) {
  return new Intl.NumberFormat("sr-RS").format(n);
}

export function CustomerPanel({
  lookup,
  cart,
  totalCredits,
  onIncrement,
  onDecrement,
  onRemove,
  onConfirm,
  onCancel,
  isConfirming,
}: CustomerPanelProps) {
  const { person } = lookup;
  const newBalance = person.balance - totalCredits;
  const isStudent = person.personType === "STUDENT";
  const wouldGoNegative = newBalance < 0;

  // Bar terminal više ne ulazi u meni ako je kartica/osoba blokirana (vidi bar-terminal.tsx),
  // ali ostavljamo kao sigurnosnu mrežu — ako se neko propusti, server svakako blokira.
  const canSubmit = cart.length > 0 && !isConfirming;

  // Status boja stanja
  const balanceColorClass =
    person.balance < 0
      ? "text-red-600 dark:text-red-400"
      : person.balance < 500
        ? "text-amber-600 dark:text-amber-400"
        : "text-green-600 dark:text-green-400";

  const newBalanceColorClass = wouldGoNegative
    ? isStudent
      ? "text-red-600 dark:text-red-400"
      : "text-amber-600 dark:text-amber-400"
    : "text-zinc-700 dark:text-zinc-300";

  return (
    <div className="flex h-full flex-col bg-zinc-50 dark:bg-zinc-950">
      {/* ─── HERO: VELIKA KARTICA OSOBE ─── */}
      <div className="border-b border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        {/* Mini action row — "Sledeća kartica" izvučena gore, da ne uzima prostor
            od imena. Tako ime + prezime ima pun horizontalni prostor i ako je dugo
            prelama se u dva reda umesto truncate-a. */}
        <div className="mb-4 flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={onCancel}
            title="Esc"
            className="gap-1.5"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Sledeća kartica
          </Button>
        </div>

        <div className="flex items-start gap-3">
          {/* Avatar — slika ako postoji, inače inicijali. Velik prominentno
              (72px) — konobar baca pogled, prepoznaje lice → anti-zloupotreba
              klonirane kartice. */}
          <PersonAvatar
            personId={person.id}
            firstName={person.firstName}
            lastName={person.lastName}
            hasPhoto={person.hasPhoto}
            size={72}
            className="ring-2 ring-primary/20"
          />
          <div className="min-w-0 flex-1">
            {/* break-words + leading-tight — duga imena se prelamaju u 2 reda
                umesto da se odsecaju, ali ostaju kompaktna. */}
            <p className="break-words text-2xl font-bold leading-tight">
              {person.firstName} {person.lastName}
            </p>
            <Badge
              variant={person.personType === "EMPLOYEE" ? "default" : "secondary"}
              className="mt-1.5"
            >
              {PersonTypeLabel[person.personType]}
            </Badge>
          </div>
        </div>

        {/* Stanje — veliki, vidno */}
        <div className="mt-5 rounded-xl border border-zinc-200 bg-gradient-to-br from-zinc-50 to-white p-4 dark:border-zinc-800 dark:from-zinc-800/50 dark:to-zinc-900">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
            Trenutno stanje
          </p>
          <p
            className={cn(
              "mt-1 text-4xl font-extrabold tabular-nums leading-none",
              balanceColorClass,
            )}
          >
            {formatBalance(person.balance)}
            <span className="ml-1 text-base font-medium text-zinc-500">RSD</span>
          </p>

          {cart.length > 0 && (
            <div className="mt-3 flex items-center gap-2 border-t border-zinc-200 pt-3 text-sm dark:border-zinc-800">
              <span className="text-zinc-500">Posle naplate:</span>
              <span
                className={cn(
                  "text-lg font-bold tabular-nums",
                  newBalanceColorClass,
                )}
              >
                {formatBalance(newBalance)} RSD
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ─── KORPA ─── */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
          <ShoppingCart className="h-4 w-4" />
          Korpa
          {cart.length > 0 && (
            <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs text-primary">
              {cart.length}
            </span>
          )}
        </div>

        {cart.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-300 bg-white py-12 text-center text-sm text-zinc-400 dark:border-zinc-700 dark:bg-zinc-900">
            <ShoppingCart className="mx-auto mb-2 h-6 w-6 opacity-40" />
            Klikni stavke iz menija
          </div>
        ) : (
          <div className="space-y-2">
            {cart.map((line) => (
              <div
                key={line.menuItemId}
                className="rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium">{line.name}</p>
                    <p className="mt-0.5 text-xs text-zinc-500 tabular-nums">
                      {formatBalance(line.unitPrice)} × {line.quantity} ={" "}
                      <strong className="text-zinc-700 dark:text-zinc-300">
                        {formatBalance(line.unitPrice * line.quantity)}
                      </strong>
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onRemove(line.menuItemId)}
                    title="Ukloni"
                    className="h-7 w-7 shrink-0 p-0 text-zinc-400 hover:text-red-600"
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => onDecrement(line.menuItemId)}
                    className="h-8 w-8 p-0"
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </Button>
                  <span className="min-w-[2.5ch] text-center text-base font-semibold tabular-nums">
                    {line.quantity}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => onIncrement(line.menuItemId)}
                    className="h-8 w-8 p-0"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ─── FOOTER: VELIKO NAPLATI DUGME ─── */}
      <div className="border-t border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
        {wouldGoNegative && cart.length > 0 && (
          <div
            className={cn(
              "mb-3 flex items-start gap-2 rounded-lg px-3 py-2 text-xs",
              isStudent
                ? "border border-red-500/40 bg-red-50 text-red-700 dark:bg-red-950/20 dark:text-red-300"
                : "border border-amber-500/40 bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-300",
            )}
          >
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>
              {isStudent
                ? "Učenik nema dovoljno kredita — server će proveriti."
                : "Stanje ide u minus — skinuti od plate."}
            </span>
          </div>
        )}

        {cart.length === 0 ? (
          <Button
            type="button"
            size="lg"
            disabled
            className="h-14 w-full text-base"
          >
            Izaberi stavke iz menija
          </Button>
        ) : (
          <Button
            type="button"
            size="lg"
            onClick={onConfirm}
            disabled={!canSubmit}
            className={cn(
              "h-14 w-full justify-between text-base font-bold shadow-md transition-transform",
              "bg-green-600 hover:bg-green-700 active:scale-[0.99]",
            )}
          >
            <span className="flex items-center gap-2">
              {isConfirming ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <CheckCircle className="h-5 w-5" />
              )}
              {isConfirming ? "Naplaćujem..." : "Naplati"}
            </span>
            <span className="text-xl tabular-nums">
              {formatBalance(totalCredits)} RSD
            </span>
          </Button>
        )}
      </div>
    </div>
  );
}
