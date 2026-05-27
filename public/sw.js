/* eslint-disable */
// Minimalni service worker — dovoljan za PWA installability prompt.
// Ne kešira ništa offline (sistem zavisi od baze, offline mode nema smisla).
// Ako kasnije zatreba offline-first ponašanje, ovde se dodaje cache strategija.

const SW_VERSION = "v1";

self.addEventListener("install", () => {
  // Aktiviraj odmah, ne čekaj refresh stranice
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  // Preuzmi kontrolu nad otvorenim tabovima odmah
  event.waitUntil(self.clients.claim());
});

// Pass-through fetch handler — bez ovoga Chrome ne smatra sajt PWA-spremnim
self.addEventListener("fetch", () => {
  // Default network behavior. Browser sam povlači sa servera.
});
