import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";

import { auth } from "@/auth";
import { getPersonReport } from "@/features/reports/queries";
import { PersonReportPdf } from "@/features/reports/pdf/person-report-pdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (session.user.role === "BARTENDER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const now = new Date();
    const year = Number(searchParams.get("year") ?? now.getFullYear());
    const month = Number(searchParams.get("month") ?? now.getMonth() + 1);
    if (
      !Number.isInteger(year) ||
      !Number.isInteger(month) ||
      year < 2000 ||
      year > 2100 ||
      month < 1 ||
      month > 12
    ) {
      return NextResponse.json(
        { error: "Neispravan period (year/month)" },
        { status: 400 },
      );
    }

    const data = await getPersonReport(id, year, month);
    if (!data) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const pdfBuffer = await renderToBuffer(<PersonReportPdf data={data} />);

    const safeName = `${data.person.lastName}_${data.person.firstName}`.replace(
      /[^a-zA-Z0-9_-]/g,
      "",
    );
    const filename = `izvestaj_${safeName}_${year}-${String(month).padStart(2, "0")}.pdf`;

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        // `inline` znači "prikaži u browser-u", ne forsiraj download.
        // Uz target="_blank" u linku, PDF se otvara u novom tabu.
        "Content-Disposition": `inline; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    console.error("[PDF API] Greška:", e);
    return NextResponse.json(
      {
        error: "Greška pri generisanju PDF-a",
        detail: e instanceof Error ? e.message : String(e),
      },
      { status: 500 },
    );
  }
}
