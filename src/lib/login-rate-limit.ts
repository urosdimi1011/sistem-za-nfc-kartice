import "server-only";

/**
 * Jednostavan in-memory rate limiter za login (brute-force zaštita).
 *
 * Po email adresi: posle MAX_ATTEMPTS neuspešnih pokušaja u WINDOW_MS,
 * dalji pokušaji se odbijaju do isteka prozora. Uspešan login briše brojač.
 *
 * Ograničenje: state je per-proces. Na serverless deploy-u (Vercel) svaka
 * instanca ima svoj brojač, pa je zaštita slabija ali i dalje značajno
 * usporava napad (uz bcrypt koji je sam po sebi spor). Za jaču garanciju
 * prebaciti na Redis/Upstash.
 */

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;

interface Entry {
  count: number;
  windowStart: number;
}

const attempts = new Map<string, Entry>();

function keyFor(email: string): string {
  return email.trim().toLowerCase();
}

/** Vraća broj sekundi do odblokiranja, ili 0 ako je login dozvoljen. */
export function checkLoginBlocked(email: string): number {
  const entry = attempts.get(keyFor(email));
  if (!entry) return 0;
  const elapsed = Date.now() - entry.windowStart;
  if (elapsed > WINDOW_MS) {
    attempts.delete(keyFor(email));
    return 0;
  }
  if (entry.count >= MAX_ATTEMPTS) {
    return Math.ceil((WINDOW_MS - elapsed) / 1000);
  }
  return 0;
}

export function recordLoginFailure(email: string): void {
  const key = keyFor(email);
  const now = Date.now();
  const entry = attempts.get(key);
  if (!entry || now - entry.windowStart > WINDOW_MS) {
    attempts.set(key, { count: 1, windowStart: now });
  } else {
    entry.count += 1;
  }
  // Ne dozvoli da mapa raste beskonačno (zaštita od memory-flood napada
  // slanjem miliona različitih email-ova).
  if (attempts.size > 10_000) {
    for (const [k, v] of attempts) {
      if (now - v.windowStart > WINDOW_MS) attempts.delete(k);
    }
  }
}

export function recordLoginSuccess(email: string): void {
  attempts.delete(keyFor(email));
}
