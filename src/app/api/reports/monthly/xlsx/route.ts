import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/auth";
import { getMonthlyReport } from "@/features/reports/queries";
import {
  buildStyledWorkbook,
  xlsxResponseHeaders,
  AMOUNT_FMT,
  type ExcelRow,
} from "@/lib/excel";
import { PERSON_TYPES, PersonTypeLabel } from "@/lib/enums";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MONTHS_SR = [
  "Januar",
  "Februar",
  "Mart",
  "April",
  "Maj",
  "Jun",
  "Jul",
  "Avgust",
  "Septembar",
  "Oktobar",
  "Novembar",
  "Decembar",
];

const paramsSchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100),
  month: z.coerce.number().int().min(1).max(12),
  personType: z.enum([...PERSON_TYPES, "ALL"]).default("ALL"),
  groupId: z.string().trim().optional(),
  search: z.string().trim().optional(),
  onlyWithActivity: z
    .union([z.literal("true"), z.literal("false")])
    .default("true"),
});

/**
 * Excel export mesečnog izveštaja — isti podaci kao tabela na /izvestaji,
 * ali SVE osobe (bez paginacije). Namena: predaja računovodstvu.
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "ADMIN" && session.user.role !== "MANAGER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const parsed = paramsSchema.safeParse({
    year: searchParams.get("year") ?? undefined,
    month: searchParams.get("month") ?? undefined,
    personType: searchParams.get("personType") ?? undefined,
    groupId: searchParams.get("groupId") ?? undefined,
    search: searchParams.get("search") ?? undefined,
    onlyWithActivity: searchParams.get("onlyWithActivity") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Neispravni parametri" }, { status: 400 });
  }
  const q = parsed.data;

  const report = await getMonthlyReport({
    year: q.year,
    month: q.month,
    personType: q.personType,
    groupId: q.groupId ?? null,
    search: q.search,
    onlyWithActivity: q.onlyWithActivity === "true",
    page: 1,
    perPage: 1_000_000, // ceo skup — export nema paginaciju
  });

  const rows: ExcelRow[] = report.rows.map((r) => ({
    lastName: r.lastName,
    firstName: r.firstName,
    type: PersonTypeLabel[r.personType],
    group: r.groupName,
    monthSpent: r.monthSpent,
    monthTopups: r.monthTopups,
    orderCount: r.orderCount,
    currentBalance: r.currentBalance,
    email: r.email,
  }));

  const typeLabel =
    q.personType === "ALL"
      ? "Svi (učenici i zaposleni)"
      : PersonTypeLabel[q.personType];
  const periodLabel = `${MONTHS_SR[q.month - 1]} ${q.year}`;

  const buffer = await buildStyledWorkbook({
    sheetName: `${MONTHS_SR[q.month - 1]} ${q.year}`,
    title: `Mesečni izveštaj — ${periodLabel}`,
    subtitle: `${typeLabel} · ${rows.length} osoba · izvezeno ${new Date().toLocaleDateString("sr-RS")}`,
    columns: [
      { header: "Prezime", key: "lastName", width: 18 },
      { header: "Ime", key: "firstName", width: 15 },
      { header: "Tip", key: "type", width: 12 },
      { header: "Grupa", key: "group", width: 18 },
      { header: "Potrošeno", key: "monthSpent", width: 13, numFmt: AMOUNT_FMT, align: "right" },
      { header: "Uplaćeno", key: "monthTopups", width: 13, numFmt: AMOUNT_FMT, align: "right" },
      { header: "Br. porudžbina", key: "orderCount", width: 14, align: "right" },
      { header: "Trenutno stanje", key: "currentBalance", width: 15, numFmt: AMOUNT_FMT, align: "right" },
      { header: "Email", key: "email", width: 28 },
    ],
    rows,
  });

  const typePart =
    q.personType === "ALL" ? "svi" : PersonTypeLabel[q.personType].toLowerCase();
  const filename = `izvestaj_${q.year}-${String(q.month).padStart(2, "0")}_${typePart}.xlsx`;

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: xlsxResponseHeaders(filename),
  });
}
