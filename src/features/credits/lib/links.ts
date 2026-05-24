import { endOfMonth, format, startOfMonth } from "date-fns";

const ISO = (d: Date) => format(d, "yyyy-MM-dd");

/**
 * Konstruiše URL za /transakcije sa filterom po osobi.
 * Default je preset="all" (sve transakcije, bez datumskog ograničenja) — kad
 * korisnik klikne "Sve transakcije" sa kartica/osoba, želi pun pregled, ne
 * samo tekući mesec.
 */
export function personCreditsHref(personId: string, opts?: { preset?: "current" | "all" }) {
  const preset = opts?.preset ?? "all";
  const params = new URLSearchParams({ personId });
  if (preset === "current") {
    const now = new Date();
    params.set("dateFrom", ISO(startOfMonth(now)));
    params.set("dateTo", ISO(endOfMonth(now)));
  }
  return `/transakcije?${params.toString()}`;
}
