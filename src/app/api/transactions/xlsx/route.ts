import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/auth";
import { listTransactions } from "@/features/credits/queries";
import {
  buildStyledWorkbook,
  xlsxResponseHeaders,
  AMOUNT_FMT,
  DATETIME_FMT,
  type ExcelRow,
} from "@/lib/excel";
import { TRANSACTION_TYPES, TransactionTypeLabel } from "@/lib/enums";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Gornja granica redova u exportu — štiti server od gigantskog odgovora.
// Za klub sa par stotina ljudi i ovo je višegodišnji obim transakcija.
const MAX_EXPORT_ROWS = 100_000;

const paramsSchema = z.object({
  search: z.string().trim().optional(),
  personId: z.string().trim().optional(),
  type: z.enum([...TRANSACTION_TYPES, "ALL"]).default("ALL"),
  dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

/**
 * Excel export transakcija — poštuje iste filtere kao /transakcije stranica
 * (period, osoba, tip, pretraga), ali vraća sve redove bez paginacije.
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
    search: searchParams.get("search") ?? undefined,
    personId: searchParams.get("personId") ?? undefined,
    type: searchParams.get("type") ?? undefined,
    dateFrom: searchParams.get("dateFrom") ?? undefined,
    dateTo: searchParams.get("dateTo") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Neispravni parametri" }, { status: 400 });
  }
  const q = parsed.data;

  const data = await listTransactions({
    search: q.search,
    personId: q.personId,
    type: q.type,
    dateFrom: q.dateFrom,
    dateTo: q.dateTo,
    page: 1,
    perPage: MAX_EXPORT_ROWS,
    sort: "createdAt",
    order: "asc", // hronološki — prirodno za knjiženje
  });

  const rows: ExcelRow[] = data.items.map((t) => ({
    createdAt: t.createdAt,
    lastName: t.person.lastName,
    firstName: t.person.firstName,
    type: TransactionTypeLabel[t.type],
    amount: t.amount,
    balanceAfter: t.balanceAfter,
    note: t.note,
    performedBy: t.performedBy.email,
    reversed: !!t.reversedAt,
    reversalReason: t.reversalReason,
  }));

  const periodLabel =
    q.dateFrom || q.dateTo
      ? `Period: ${q.dateFrom ?? "…"} — ${q.dateTo ?? "…"}`
      : "Sve transakcije";
  const typeLabel = q.type === "ALL" ? "" : ` · ${TransactionTypeLabel[q.type]}`;

  const buffer = await buildStyledWorkbook({
    sheetName: "Transakcije",
    title: "Transakcije",
    subtitle: `${periodLabel}${typeLabel} · ${rows.length} redova · izvezeno ${new Date().toLocaleDateString("sr-RS")}`,
    columns: [
      { header: "Datum i vreme", key: "createdAt", width: 17, numFmt: DATETIME_FMT },
      { header: "Prezime", key: "lastName", width: 16 },
      { header: "Ime", key: "firstName", width: 14 },
      { header: "Tip", key: "type", width: 17 },
      { header: "Iznos", key: "amount", width: 12, numFmt: AMOUNT_FMT, align: "right" },
      { header: "Stanje posle", key: "balanceAfter", width: 13, numFmt: AMOUNT_FMT, align: "right" },
      { header: "Napomena", key: "note", width: 40 },
      { header: "Izvršio", key: "performedBy", width: 24 },
      { header: "Stornirana", key: "reversed", width: 11, align: "center" },
      { header: "Razlog storna", key: "reversalReason", width: 30 },
    ],
    rows,
  });

  const today = new Date().toISOString().slice(0, 10);
  const periodPart =
    q.dateFrom || q.dateTo
      ? `${q.dateFrom ?? "pocetak"}_${q.dateTo ?? today}`
      : today;

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: xlsxResponseHeaders(`transakcije_${periodPart}.xlsx`),
  });
}
