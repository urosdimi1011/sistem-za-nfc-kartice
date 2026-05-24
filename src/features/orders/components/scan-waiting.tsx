"use client";

import { useEffect, useRef, useState } from "react";
import { CreditCard, Loader2, Wifi } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { KeyboardCardReader } from "@/lib/card-reader";

interface ScanWaitingProps {
  onScan: (uid: string) => void;
  isProcessing?: boolean;
  errorMessage?: string | null;
}

export function ScanWaiting({ onScan, isProcessing, errorMessage }: ScanWaitingProps) {
  const [manualUid, setManualUid] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Pretplata na globalni keyboard čitač (HID/RFID emulira tastaturu)
  useEffect(() => {
    const reader = new KeyboardCardReader();
    const unsub = reader.start((uid) => {
      onScan(uid);
    });
    return unsub;
  }, [onScan]);

  // Drži fokus na input-u za manual mode
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = manualUid.trim();
    if (trimmed) {
      onScan(trimmed);
      setManualUid("");
    }
  };

  return (
    <div className="flex h-full flex-col items-center justify-center p-8">
      <div className="flex flex-col items-center text-center">
        <div className="relative">
          <div className="flex h-40 w-40 items-center justify-center rounded-full bg-primary/10">
            <CreditCard className="h-20 w-20 text-primary" />
          </div>
          {!isProcessing && (
            <span className="absolute -right-2 -top-2 flex h-12 w-12 items-center justify-center">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-40" />
              <Wifi className="relative h-6 w-6 rotate-45 text-primary" />
            </span>
          )}
        </div>

        <h2 className="mt-8 text-3xl font-bold">
          {isProcessing ? "Učitavam karticu..." : "Prisloni karticu"}
        </h2>
        <p className="mt-2 text-zinc-500">
          {isProcessing
            ? "Sačekajte trenutak"
            : "Pozovi sledećeg učenika ili zaposlenog"}
        </p>

        {isProcessing && (
          <Loader2 className="mt-6 h-8 w-8 animate-spin text-primary" />
        )}

        {errorMessage && (
          <div className="mt-6 rounded-md border border-red-500/40 bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/20 dark:text-red-300">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleManualSubmit} className="mt-10 flex gap-2">
          <Input
            ref={inputRef}
            value={manualUid}
            onChange={(e) => setManualUid(e.target.value)}
            placeholder="UID ručno (za test)"
            disabled={isProcessing}
            className="w-56 font-mono"
          />
          <Button type="submit" disabled={isProcessing || !manualUid.trim()}>
            Učitaj
          </Button>
        </form>
      </div>
    </div>
  );
}
