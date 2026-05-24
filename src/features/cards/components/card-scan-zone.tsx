"use client";

import { useEffect, useRef } from "react";
import { Check, CreditCard, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface CardScanZoneProps {
  value: string;
  onChange: (uid: string) => void;
  onClear: () => void;
  /**
   * Status: idle = čeka skeniranje, valid = UID dobijen, invalid = UID već iskorišćen.
   */
  status?: "idle" | "valid" | "invalid";
  errorText?: string;
  /**
   * Tekst dole desno ispod input-a (npr. "Već registrovana na ...").
   */
  helpText?: string;
  autoFocus?: boolean;
}

/**
 * UX detalj: glavni mehanizam je tekstualni input — radi i sa HID/keyboard čitačem
 * (čitač "ukuca" UID brzo) i sa ručnim unosom. Vizuelno izgleda kao "tap zona"
 * da admin shvati da treba da prisloni karticu na čitač.
 */
export function CardScanZone({
  value,
  onChange,
  onClear,
  status = "idle",
  errorText,
  helpText,
  autoFocus,
}: CardScanZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus) {
      inputRef.current?.focus();
    }
  }, [autoFocus]);

  const isEmpty = !value;
  const showValid = !isEmpty && status === "valid";
  const showInvalid = !isEmpty && status === "invalid";

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium" htmlFor="card-uid-input">
        UID kartice
      </label>
      <div
        className={cn(
          "relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-8 transition-all",
          showValid
            ? "border-green-500/60 bg-green-50/50 dark:bg-green-950/20"
            : showInvalid
              ? "border-red-500/60 bg-red-50/50 dark:bg-red-950/20"
              : "border-zinc-300 bg-zinc-50/50 dark:border-zinc-700 dark:bg-zinc-900/50",
        )}
      >
        {isEmpty ? (
          <>
            <CreditCard className="h-10 w-10 text-zinc-400" />
            <p className="mt-3 text-center text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Prislonite karticu na čitač
            </p>
            <p className="mt-1 text-center text-xs text-zinc-500">
              ili je ukucajte ručno ispod
            </p>
          </>
        ) : (
          <div className="flex w-full flex-col items-center gap-2">
            {showValid && (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500/20">
                <Check className="h-6 w-6 text-green-600" />
              </div>
            )}
            {showInvalid && (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/20">
                <X className="h-6 w-6 text-red-600" />
              </div>
            )}
            <div className="font-mono text-lg font-medium">{value}</div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClear}
              className="text-xs"
            >
              Obriši i ponovi
            </Button>
          </div>
        )}
      </div>
      <input
        ref={inputRef}
        id="card-uid-input"
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value.trim())}
        placeholder="UID..."
        autoComplete="off"
        className={cn(
          "block w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-sm transition-colors",
          "focus:outline-none focus:ring-2 focus:ring-ring",
          showValid && "border-green-500/60",
          showInvalid && "border-red-500/60",
        )}
      />
      {showInvalid && errorText && (
        <p className="text-sm text-red-600">{errorText}</p>
      )}
      {!showInvalid && helpText && (
        <p className="text-sm text-amber-600 dark:text-amber-500">{helpText}</p>
      )}
    </div>
  );
}
