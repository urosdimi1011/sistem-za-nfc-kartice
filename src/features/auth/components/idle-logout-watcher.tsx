"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { signOut } from "next-auth/react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/**
 * Auto-logout zbog neaktivnosti.
 *
 * Tajming:
 *   • IDLE_BEFORE_WARN ms aktivnosti → otvori modal sa countdown-om
 *   • WARN_DURATION ms u modalu bez akcije → signOut
 *
 * Implementaciona napomena:
 *   Sav mutable state koji koristi useEffect (warning flag, tajmeri, kanal)
 *   držimo u ref-ovima, ne u deps. Tako se useEffect postavlja SAMO JEDNOM
 *   na mount, a sve unutar funkcija čita aktuelni ref. Bez ovoga, svaki
 *   `setWarning` izaziva re-creation handler-a → cleanup useEffect-a → briše
 *   tek postavljene tajmere → konflikt sa Dialog state-om.
 */

const IDLE_BEFORE_WARN_MS = 9 * 60 * 1000; // 9 min idle → upozorenje
const WARN_DURATION_MS = 60 * 1000; // pa još 60s pre logout-a
const ACTIVITY_EVENTS: Array<keyof WindowEventMap> = [
  "mousemove",
  "keydown",
  "click",
  "scroll",
  "touchstart",
];
const BROADCAST_CHANNEL = "dositej-admin-activity";

export function IdleLogoutWatcher() {
  const [warning, setWarning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(WARN_DURATION_MS / 1000);
  const [signingOut, setSigningOut] = useState(false);

  // Tajmeri u ref-ovima — useEffect ne treba da zna o njima
  const warnTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const logoutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const bcRef = useRef<BroadcastChannel | null>(null);

  // Aktuelni warning flag u ref-u — koristi se iz event handler-a koji
  // ne smeju da menjaju dependency-je
  const warningRef = useRef(false);
  const signingOutRef = useRef(false);

  // Pomoćni: očisti sve tajmere bez menjanja state-a
  const clearAllTimers = useCallback(() => {
    if (warnTimerRef.current) {
      clearTimeout(warnTimerRef.current);
      warnTimerRef.current = null;
    }
    if (logoutTimerRef.current) {
      clearTimeout(logoutTimerRef.current);
      logoutTimerRef.current = null;
    }
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
  }, []);

  // Stabilna doLogout (nema deps — sve preko ref-a)
  const doLogout = useCallback(() => {
    if (signingOutRef.current) return;
    signingOutRef.current = true;
    setSigningOut(true);
    bcRef.current?.postMessage({ type: "logout" });
    signOut({ callbackUrl: "/login?reason=idle" });
  }, []);

  // Glavni reset — čisti tajmere, zatvara modal, schedule-uje nov warning ciklus
  const resetTimers = useCallback(() => {
    clearAllTimers();
    warningRef.current = false;
    setWarning(false);
    setSecondsLeft(WARN_DURATION_MS / 1000);

    warnTimerRef.current = setTimeout(() => {
      // 9 min prošlo → pokaži upozorenje
      warningRef.current = true;
      setWarning(true);
      setSecondsLeft(WARN_DURATION_MS / 1000);

      countdownTimerRef.current = setInterval(() => {
        setSecondsLeft((s) => Math.max(0, s - 1));
      }, 1000);

      logoutTimerRef.current = setTimeout(() => {
        doLogout();
      }, WARN_DURATION_MS);
    }, IDLE_BEFORE_WARN_MS);
  }, [clearAllTimers, doLogout]);

  // Aktivnost iz drugih event-ova — koristi warningRef, NE warning state.
  // Time se useEffect ne re-runuje pri svakoj promeni warning-a.
  const handleLocalActivity = useCallback(() => {
    if (warningRef.current) return; // dok je modal otvoren, samo dugmad menjaju stanje
    bcRef.current?.postMessage({ type: "activity" });
    resetTimers();
  }, [resetTimers]);

  // Setup — pokreće se SAMO JEDNOM (deps su stabilni callback-ovi)
  useEffect(() => {
    if (typeof BroadcastChannel !== "undefined") {
      bcRef.current = new BroadcastChannel(BROADCAST_CHANNEL);
      bcRef.current.onmessage = (e) => {
        if (e.data?.type === "activity") {
          // Drugi tab je aktivan — resetuj nas (resetTimers postavi warning=false)
          resetTimers();
        } else if (e.data?.type === "logout") {
          window.location.href = "/login?reason=idle";
        }
      };
    }

    resetTimers();

    for (const ev of ACTIVITY_EVENTS) {
      window.addEventListener(ev, handleLocalActivity, { passive: true });
    }

    return () => {
      for (const ev of ACTIVITY_EVENTS) {
        window.removeEventListener(ev, handleLocalActivity);
      }
      clearAllTimers();
      bcRef.current?.close();
      bcRef.current = null;
    };
  }, [handleLocalActivity, resetTimers, clearAllTimers]);

  // Dugme "Nastavi sesiju" — eksplicitno zatvara modal, javlja drugim
  // tabovima da smo aktivni, i osvežava NextAuth JWT (token.exp se resetuje
  // u jwt callback-u za ADMIN/MANAGER role-ove).
  const handleStay = useCallback(() => {
    bcRef.current?.postMessage({ type: "activity" });
    resetTimers();
    fetch("/api/auth/session", { cache: "no-store" }).catch(() => {});
  }, [resetTimers]);

  return (
    <Dialog open={warning} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Sesija ističe</DialogTitle>
          <DialogDescription>
            Nismo registrovali aktivnost duže od 9 minuta. Bićeš automatski
            izlogovan za <strong>{secondsLeft}s</strong> radi sigurnosti naloga.
          </DialogDescription>
        </DialogHeader>
        <div className="my-2 h-2 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
          <div
            className="h-full bg-red-500 transition-all duration-1000 ease-linear"
            style={{
              width: `${(secondsLeft / (WARN_DURATION_MS / 1000)) * 100}%`,
            }}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={doLogout} disabled={signingOut}>
            {signingOut && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Izloguj me sada
          </Button>
          <Button onClick={handleStay} disabled={signingOut}>
            Nastavi sesiju
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
