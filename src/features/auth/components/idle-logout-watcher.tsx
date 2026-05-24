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
 * Detaljno:
 *   • Aktivnost = mousemove / keydown / click / scroll / touchstart
 *   • Tab koji nije aktivan i dalje broji (želimo logout i ako je prozor minimizovan)
 *   • Cross-tab sinhronizacija preko BroadcastChannel — kad korisnik radi
 *     u jednom adminskom tabu, drugi tabovi resetuju svoj tajmer.
 *   • Dok je modal otvoren, normalni events NE resetuju tajmer (samo dugmad).
 *     Inače slučajan mousemove iznad modala bi ga sakrio pre nego ga vidiš.
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

  const warnTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const logoutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const bcRef = useRef<BroadcastChannel | null>(null);

  // Logout — zatvori sve tajmere, javi ostalim tabovima i pozovi signOut
  const doLogout = useCallback(() => {
    if (signingOut) return;
    setSigningOut(true);
    bcRef.current?.postMessage({ type: "logout" });
    signOut({ callbackUrl: "/login?reason=idle" });
  }, [signingOut]);

  // Reset svih tajmera — zove se iz aktivnosti i "stay" dugmeta
  const resetTimers = useCallback(() => {
    if (warnTimerRef.current) clearTimeout(warnTimerRef.current);
    if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);

    setWarning(false);
    setSecondsLeft(WARN_DURATION_MS / 1000);

    warnTimerRef.current = setTimeout(() => {
      // Pokreni upozorenje
      setWarning(true);
      setSecondsLeft(WARN_DURATION_MS / 1000);

      countdownTimerRef.current = setInterval(() => {
        setSecondsLeft((s) => Math.max(0, s - 1));
      }, 1000);

      logoutTimerRef.current = setTimeout(() => {
        doLogout();
      }, WARN_DURATION_MS);
    }, IDLE_BEFORE_WARN_MS);
  }, [doLogout]);

  // "Activity" handler — broadcast-uj i ostalim tabovima, pa resetuj sebi
  const handleLocalActivity = useCallback(() => {
    // Dok je modal otvoren, lokalni events NE resetuju (samo dugmad mogu)
    if (warning) return;
    bcRef.current?.postMessage({ type: "activity" });
    resetTimers();
  }, [warning, resetTimers]);

  // Setup
  useEffect(() => {
    // BroadcastChannel — fallback ako browser ne podržava (stari Safari)
    if (typeof BroadcastChannel !== "undefined") {
      bcRef.current = new BroadcastChannel(BROADCAST_CHANNEL);
      bcRef.current.onmessage = (e) => {
        if (e.data?.type === "activity") {
          // Drugi tab je aktivan — resetuj se i ti
          // (ali ne broadcast-uj opet da ne pravimo petlju)
          if (warnTimerRef.current) clearTimeout(warnTimerRef.current);
          if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
          if (countdownTimerRef.current)
            clearInterval(countdownTimerRef.current);
          setWarning(false);
          setSecondsLeft(WARN_DURATION_MS / 1000);
          warnTimerRef.current = setTimeout(() => {
            setWarning(true);
            setSecondsLeft(WARN_DURATION_MS / 1000);
            countdownTimerRef.current = setInterval(() => {
              setSecondsLeft((s) => Math.max(0, s - 1));
            }, 1000);
            logoutTimerRef.current = setTimeout(() => {
              doLogout();
            }, WARN_DURATION_MS);
          }, IDLE_BEFORE_WARN_MS);
        } else if (e.data?.type === "logout") {
          // Drugi tab se izlogovao — i mi se moramo
          window.location.href = "/login?reason=idle";
        }
      };
    }

    // Pokreni inicijalne tajmere
    resetTimers();

    // Slušaj korisničku aktivnost
    for (const ev of ACTIVITY_EVENTS) {
      window.addEventListener(ev, handleLocalActivity, { passive: true });
    }

    return () => {
      for (const ev of ACTIVITY_EVENTS) {
        window.removeEventListener(ev, handleLocalActivity);
      }
      if (warnTimerRef.current) clearTimeout(warnTimerRef.current);
      if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
      bcRef.current?.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handleLocalActivity]);

  const handleStay = () => {
    // "Nastavi sesiju" — osveži NextAuth JWT i resetuj tajmere
    bcRef.current?.postMessage({ type: "activity" });
    resetTimers();
    // GET /api/auth/session prolazi kroz jwt callback → token.exp se resetuje
    fetch("/api/auth/session", { cache: "no-store" }).catch(() => {});
  };

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
          <Button
            variant="outline"
            onClick={doLogout}
            disabled={signingOut}
          >
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
