"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  HelpCircle,
  IdCard,
  Keyboard,
  Loader2,
  Radio,
  Receipt,
  ShoppingBag,
  Zap,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { KeyboardCardReader } from "@/lib/card-reader";

interface ScanWaitingProps {
  onScan: (uid: string) => void;
  isProcessing?: boolean;
  errorMessage?: string | null;
  blockedInfo?: {
    name: string;
    reason: string;
  } | null;
  onClearError?: () => void;
  todayOrderCount: number;
  todayRevenue: number;
}

function formatRsd(n: number) {
  return new Intl.NumberFormat("sr-RS").format(n);
}

/** Živi sat — update svake sekunde. */
function useLiveClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return now;
}

export function ScanWaiting({
  onScan,
  isProcessing,
  errorMessage,
  blockedInfo,
  onClearError,
  todayOrderCount,
  todayRevenue,
}: ScanWaitingProps) {
  const [manualUid, setManualUid] = useState("");
  const [showManual, setShowManual] = useState(false);
  // Vreme poslednjeg uspešnog skena (epoch ms). null = nikad u ovoj sesiji.
  const [lastScanAt, setLastScanAt] = useState<number | null>(null);
  // Test mode — korisnik klikne "Testiraj", pratimo da li stigne scan u 5s
  const [testMode, setTestMode] = useState<
    null | "waiting" | "success" | "fail"
  >(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const now = useLiveClock();

  // Pretplata na globalni keyboard čitač (HID/RFID emulira tastaturu).
  // Browser ne može direktno da detektuje da li je čitač povezan (izgleda
  // kao tastatura). Status izvodimo iz heuristike — vidi ReaderIndicator.
  useEffect(() => {
    const reader = new KeyboardCardReader();
    const unsub = reader.start((uid) => {
      setLastScanAt(Date.now());
      if (testMode === "waiting") {
        setTestMode("success");
        setTimeout(() => setTestMode(null), 1500);
        return; // ne propagiraj test scan
      }
      onScan(uid);
    });
    return unsub;
  }, [onScan, testMode]);

  // Test čitača: pokreni 5s tajmer, ako nema scan-a → fail
  const runReaderTest = () => {
    setTestMode("waiting");
    setTimeout(() => {
      setTestMode((current) => (current === "waiting" ? "fail" : current));
      setTimeout(() => setTestMode(null), 2500);
    }, 5000);
  };

  useEffect(() => {
    if (showManual) inputRef.current?.focus();
  }, [showManual]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = manualUid.trim();
    if (trimmed) {
      onScan(trimmed);
      setManualUid("");
    }
  };

  const timeStr = now.toLocaleTimeString("sr-RS", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const dateStr = now.toLocaleDateString("sr-RS", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <div className="relative flex h-full flex-col bg-gradient-to-br from-zinc-50 via-white to-zinc-100 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950">
      {/* TOP BAR — samo sat desno (logo+naziv su u glavnom header-u layout-a) */}
      <div className="flex shrink-0 items-center justify-end px-6 py-4">
        <div className="text-right">
          <p className="font-mono text-3xl font-bold tabular-nums leading-none">
            {timeStr}
          </p>
          <p className="mt-1 text-xs capitalize text-zinc-500">{dateStr}</p>
        </div>
      </div>

      {/* CENTAR — kartica za skeniranje */}
      <div className="flex flex-1 items-center justify-center px-6">
        {blockedInfo ? (
          <BlockedCardView info={blockedInfo} onRetry={onClearError} />
        ) : (
          <ScanCard
            isProcessing={isProcessing}
            errorMessage={errorMessage}
            onDismissError={onClearError}
          />
        )}
      </div>

      {/* BOTTOM BAR — brojači + indikator čitača */}
      <div className="flex shrink-0 items-center justify-between gap-4 border-t border-zinc-200 bg-white/60 px-6 py-3 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/60">
        <div className="flex items-center gap-6">
          <StatPill
            icon={<ShoppingBag className="h-4 w-4" />}
            label="Porudžbina danas"
            value={String(todayOrderCount)}
          />
          <StatPill
            icon={<Receipt className="h-4 w-4" />}
            label="Naplaćeno danas"
            value={`${formatRsd(todayRevenue)} RSD`}
          />
        </div>

        <div className="flex items-center gap-4">
          {!showManual && (
            <button
              type="button"
              onClick={() => setShowManual(true)}
              className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
            >
              <Keyboard className="h-3 w-3" />
              Ručni unos
            </button>
          )}
          <ReaderIndicator
            lastScanAt={lastScanAt}
            now={now.getTime()}
            testMode={testMode}
            onTest={runReaderTest}
          />
        </div>
      </div>

      {/* MANUAL INPUT overlay — kad je pozvano */}
      {showManual && (
        <div className="absolute inset-x-0 bottom-14 z-10 flex justify-center pb-3">
          <form
            onSubmit={handleManualSubmit}
            className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white p-2 shadow-lg dark:border-zinc-700 dark:bg-zinc-900"
          >
            <Input
              ref={inputRef}
              value={manualUid}
              onChange={(e) => setManualUid(e.target.value)}
              placeholder="UID kartice"
              disabled={isProcessing}
              className="w-56 font-mono"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              data-1p-ignore
              data-lpignore="true"
            />
            <Button type="submit" disabled={isProcessing || !manualUid.trim()}>
              Učitaj
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setShowManual(false);
                setManualUid("");
              }}
            >
              ✕
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}

// ─── PODKOMPONENTE ──────────────────────────────────────────

function ScanCard({
  isProcessing,
  errorMessage,
  onDismissError,
}: {
  isProcessing?: boolean;
  errorMessage?: string | null;
  onDismissError?: () => void;
}) {
  return (
    <div className="flex w-full max-w-md flex-col items-center rounded-3xl border border-zinc-200 bg-white p-10 shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
      {/* Suptilna aura oko ikone — blagi glow + jedan tanki ripple talas. */}
      <div className="relative flex h-40 w-40 items-center justify-center">
        {!isProcessing && !errorMessage && (
          <>
            <span className="absolute inline-flex h-full w-full animate-nfc-glow rounded-full bg-primary/15 blur-2xl" />
            <span className="absolute inline-flex h-full w-full animate-nfc-ping rounded-full bg-primary/10" />
          </>
        )}
        <div className="relative flex h-32 w-32 items-center justify-center rounded-full bg-primary/10 ring-1 ring-primary/20">
          <IdCard
            className={
              isProcessing
                ? "h-16 w-16 text-primary"
                : "h-16 w-16 animate-nfc-pulse text-primary"
            }
          />
        </div>
      </div>

      <h2 className="mt-8 text-4xl font-extrabold tracking-tighter">
        {isProcessing ? "Učitavam karticu..." : "Prisloni karticu"}
      </h2>
      <p className="mt-2 text-sm text-zinc-500">
        {isProcessing
          ? "Sačekajte trenutak"
          : "Skener čeka — pozovi sledećeg"}
      </p>

      {isProcessing && (
        <Loader2 className="mt-6 h-8 w-8 animate-spin text-primary" />
      )}

      {errorMessage && (
        <div className="mt-6 flex w-full flex-col gap-2 rounded-lg border border-red-500/40 bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/20 dark:text-red-300">
          <div className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          {onDismissError && (
            <Button
              variant="outline"
              size="sm"
              onClick={onDismissError}
              className="self-end"
            >
              Pokušaj ponovo
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

function BlockedCardView({
  info,
  onRetry,
}: {
  info: { name: string; reason: string };
  onRetry?: () => void;
}) {
  return (
    <div className="flex w-full max-w-md flex-col items-center rounded-3xl border-2 border-red-500/40 bg-white p-10 text-center shadow-xl dark:bg-zinc-900">
      <div className="flex h-24 w-24 items-center justify-center rounded-full bg-red-500/15">
        <AlertCircle className="h-12 w-12 text-red-600 dark:text-red-400" />
      </div>
      <h2 className="mt-6 text-2xl font-bold text-red-700 dark:text-red-300">
        Kartica blokirana
      </h2>
      <p className="mt-3 text-lg font-medium">{info.name}</p>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        {info.reason}
      </p>
      {onRetry && (
        <Button onClick={onRetry} className="mt-6" size="lg">
          Sledeća kartica
        </Button>
      )}
    </div>
  );
}

function StatPill({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
        {icon}
      </div>
      <div>
        <p className="text-[10px] uppercase tracking-wide text-zinc-500">
          {label}
        </p>
        <p className="text-sm font-semibold tabular-nums">{value}</p>
      </div>
    </div>
  );
}

/**
 * Realan status čitača na osnovu heuristike + test dugmeta.
 *
 * Browser ne može direktno da detektuje da li je USB RFID čitač povezan
 * (predstavlja se kao tastatura). Zato pratimo aktivnost:
 *   • Nikad nije bilo scan-a u sesiji → "Sluša" (neutralno, žuto)
 *   • Skenirao u zadnjih 2 min → "Aktivan" (zeleno, pulsira)
 *   • Skenirao ali davno → "Idle X min" (žuto)
 *   • Test mode → posebne statuse (waiting / success / fail)
 *
 * Plus dugme "Testiraj" — korisnik klikne, prisloni karticu u 5s,
 * sistem potvrdi ili javi grešku.
 */
function ReaderIndicator({
  lastScanAt,
  now,
  testMode,
  onTest,
}: {
  lastScanAt: number | null;
  now: number;
  testMode: null | "waiting" | "success" | "fail";
  onTest: () => void;
}) {
  // Test mode prioritet
  if (testMode === "waiting") {
    return (
      <Pill
        dotColor="bg-blue-500"
        animated
        icon={<Loader2 className="h-3 w-3 animate-spin" />}
        text="Prisloni karticu (5s)..."
      />
    );
  }
  if (testMode === "success") {
    return (
      <Pill
        dotColor="bg-green-500"
        icon={<Zap className="h-3 w-3" />}
        text="Čitač radi!"
      />
    );
  }
  if (testMode === "fail") {
    return (
      <Pill
        dotColor="bg-red-500"
        icon={<AlertCircle className="h-3 w-3" />}
        text="Bez signala — proveri kabl"
      />
    );
  }

  // Heuristika na osnovu zadnjeg scan-a
  const minutesAgo = lastScanAt
    ? Math.floor((now - lastScanAt) / 60000)
    : null;

  let dotColor = "bg-zinc-400";
  let animated = false;
  let text = "Sluša ulaz";
  let tooltip =
    "Skener nije proveren u ovoj sesiji. Skeniraj karticu ili klikni 'Testiraj'.";

  if (minutesAgo !== null) {
    if (minutesAgo < 2) {
      dotColor = "bg-green-500";
      animated = true;
      text = "Aktivan";
      tooltip = `Poslednji scan pre ${minutesAgo < 1 ? "manje od minut" : "1 min"}`;
    } else if (minutesAgo < 30) {
      dotColor = "bg-amber-500";
      text = `Idle ${minutesAgo} min`;
      tooltip = `Nije bilo scan-a ${minutesAgo} minuta. Možda je čitač isključen.`;
    } else {
      dotColor = "bg-zinc-400";
      text = "Davno neaktivan";
      tooltip = `Poslednji scan pre više od ${minutesAgo} minuta.`;
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Pill
        dotColor={dotColor}
        animated={animated}
        icon={<Radio className="h-3 w-3" />}
        text={text}
        tooltip={tooltip}
      />
      <button
        type="button"
        onClick={onTest}
        title="Testiraj čitač — prisloni karticu u 5 sekundi"
        className="rounded-full border border-zinc-300 px-2.5 py-1 text-[11px] text-zinc-600 transition-colors hover:border-primary hover:text-primary dark:border-zinc-700 dark:text-zinc-400"
      >
        Testiraj
      </button>
    </div>
  );
}

function Pill({
  dotColor,
  animated,
  icon,
  text,
  tooltip,
}: {
  dotColor: string;
  animated?: boolean;
  icon: React.ReactNode;
  text: string;
  tooltip?: string;
}) {
  return (
    <div
      className="flex items-center gap-2 rounded-full bg-zinc-100 px-3 py-1.5 text-xs dark:bg-zinc-800"
      title={tooltip}
    >
      <span className="relative flex h-2.5 w-2.5">
        {animated && (
          <span
            className={`absolute inline-flex h-full w-full animate-ping rounded-full ${dotColor} opacity-60`}
          />
        )}
        <span
          className={`relative inline-flex h-2.5 w-2.5 rounded-full ${dotColor}`}
        />
      </span>
      {icon}
      <span className="font-medium">{text}</span>
      {tooltip && <HelpCircle className="h-3 w-3 text-zinc-400" />}
    </div>
  );
}
