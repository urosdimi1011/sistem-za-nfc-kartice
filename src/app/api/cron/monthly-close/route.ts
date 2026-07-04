import { NextRequest, NextResponse } from "next/server";

import { runMonthlyCloseCron } from "@/features/reports/service";

/**
 * Vercel cron endpoint — okida se na rasporedu iz vercel.json.
 * Bezbedan jer Vercel šalje `Authorization: Bearer <CRON_SECRET>` header
 * (postavlja se kao env var i automatski u Vercel cron requests-ima).
 */
export async function GET(req: NextRequest) {
  // Fail-closed: bez postavljenog CRON_SECRET endpoint je zaključan.
  // (Ranije je bio otvoren kad secret nije podešen — svako je mogao da
  // okine zatvaranje meseca za sve tenante.)
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    console.error("[cron/monthly-close] CRON_SECRET nije postavljen — endpoint odbijen");
    return NextResponse.json(
      { error: "Cron nije konfigurisan (CRON_SECRET)" },
      { status: 503 },
    );
  }
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runMonthlyCloseCron(null);
    return NextResponse.json(result);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 },
    );
  }
}
