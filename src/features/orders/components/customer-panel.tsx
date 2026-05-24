"use client";

import { AlertTriangle, Ban, Loader2, Minus, Plus, ShoppingCart, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { PersonTypeLabel } from "@/lib/enums";

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
  const { person, isActive: cardActive } = lookup;
  const newBalance = person.balance - totalCredits;
  const isStudent = person.personType === "STUDENT";
  const wouldGoNegative = newBalance < 0;
  // Samo "hard" razlozi blokiraju submit — minus stanje hendluje server
  // prema tenant pravilima (allowStudentNegativeBalance, maxNegativeBalanceEmployee).
  const blockedReason: string | null = !cardActive
    ? "Kartica je blokirana"
    : !person.isActive
      ? "Osoba je neaktivna"
      : null;

  const canSubmit = cart.length > 0 && !blockedReason && !isConfirming;

  return (
    <div className="flex h-full flex-col">
      {/* Osoba */}
      <div className="border-b border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold">
                {person.firstName} {person.lastName}
              </h2>
              <Badge
                variant={person.personType === "EMPLOYEE" ? "default" : "secondary"}
              >
                {PersonTypeLabel[person.personType]}
              </Badge>
            </div>
            {!cardActive && (
              <Badge variant="outline" className="mt-1 gap-1 border-red-500/40 text-red-600">
                <Ban className="h-3 w-3" /> Kartica blokirana
              </Badge>
            )}
            {!person.isActive && (
              <Badge variant="outline" className="mt-1 gap-1 border-red-500/40 text-red-600">
                <Ban className="h-3 w-3" /> Osoba neaktivna
              </Badge>
            )}
          </div>
          <Button variant="ghost" size="sm" onClick={onCancel} title="Otkaži">
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3 rounded-md border border-zinc-200 p-3 dark:border-zinc-800">
          <div>
            <div className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">
              Stanje
            </div>
            <div
              className={cn(
                "text-2xl font-bold tabular-nums",
                person.balance < 0 && "text-red-600",
              )}
            >
              {formatBalance(person.balance)}
            </div>
          </div>
          <div>
            <div className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">
              Posle naplate
            </div>
            <div
              className={cn(
                "text-2xl font-bold tabular-nums",
                newBalance < 0 && (isStudent ? "text-red-600" : "text-amber-600"),
              )}
            >
              {formatBalance(newBalance)}
            </div>
          </div>
        </div>
      </div>

      {/* Korpa */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <ShoppingCart className="h-4 w-4" />
          Korpa
          <span className="text-zinc-500">({cart.length})</span>
        </div>
        {cart.length === 0 ? (
          <div className="rounded-md border border-dashed py-12 text-center text-sm text-zinc-400">
            Klikni stavke iz menija
          </div>
        ) : (
          <div className="space-y-2">
            {cart.map((line) => (
              <div
                key={line.menuItemId}
                className="rounded-md border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium">{line.name}</p>
                    <p className="text-xs text-zinc-500 tabular-nums">
                      {formatBalance(line.unitPrice)} ×{" "}
                      <strong>{line.quantity}</strong> ={" "}
                      <strong>{formatBalance(line.unitPrice * line.quantity)}</strong>
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onRemove(line.menuItemId)}
                    title="Ukloni"
                    className="h-7 w-7 p-0"
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
                    className="h-7 w-7 p-0"
                  >
                    <Minus className="h-3 w-3" />
                  </Button>
                  <span className="min-w-[2ch] text-center text-sm font-medium tabular-nums">
                    {line.quantity}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => onIncrement(line.menuItemId)}
                    className="h-7 w-7 p-0"
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer: total + confirm */}
      <div className="border-t border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        {blockedReason && (
          <div className="mb-3 flex items-start gap-2 rounded-md border border-red-500/40 bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-950/20 dark:text-red-300">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {blockedReason}
          </div>
        )}
        {!blockedReason && !isStudent && wouldGoNegative && (
          <div className="mb-3 flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:bg-amber-950/20 dark:text-amber-300">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            Stanje ide u minus — biće skinuto od plate.
          </div>
        )}
        <div className="mb-3 flex items-baseline justify-between">
          <span className="text-sm font-medium">Ukupno</span>
          <span className="text-3xl font-bold tabular-nums">
            {formatBalance(totalCredits)}
          </span>
        </div>
        <Button
          type="button"
          size="lg"
          className="w-full text-lg"
          onClick={onConfirm}
          disabled={!canSubmit}
        >
          {isConfirming && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
          Potvrdi
        </Button>
      </div>
    </div>
  );
}
