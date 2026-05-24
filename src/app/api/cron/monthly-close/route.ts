import { NextRequest, NextResponse } from "next/server";

import { runMonthlyCloseCron } from "@/features/reports/service";

/**
 * Vercel cron endpoint — okida se na rasporedu iz vercel.json.
 * Bezbedan jer Vercel šalje `Authorization: Bearer <CRON_SECRET>` header
 * (postavlja se kao env var i automatski u Vercel cron requests-ima).
 */
export async function GET(req: NextRequest) {
  // U produkciji: provera bearer tokena.
  // U dev-u: ovaj endpoint se i ne poziva automatski, samo ručno za test.
  const authHeader = req.headers.get("authorization");
  const expected = process.env.CRON_SECRET;
  if (expected && authHeader !== `Bearer ${expected}`) {
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
