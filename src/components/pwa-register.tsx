"use client";

import { useEffect } from "react";

/**
 * Registruje service worker pri prvom učitavanju aplikacije.
 * Bez ovoga browser ne prikazuje "Instaliraj aplikaciju" prompt.
 * SW se servira sa /sw.js (public/sw.js).
 */
export function PwaRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    // U dev modu Next.js dosta menja resursе, SW može da zbuni — pustimo samo prod.
    if (process.env.NODE_ENV !== "production") return;

    const onLoad = () => {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .catch((err) => console.error("[PWA] SW registracija nije uspela:", err));
    };

    if (document.readyState === "complete") onLoad();
    else window.addEventListener("load", onLoad, { once: true });
    return () => window.removeEventListener("load", onLoad);
  }, []);

  return null;
}
