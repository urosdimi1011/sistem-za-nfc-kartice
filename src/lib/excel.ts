import "server-only";
import ExcelJS from "exceljs";

/**
 * Stilizovani XLSX export — zamena za CSV koji je zavisio od regional
 * settings-a Excela (separator, encoding). XLSX radi identično svuda.
 *
 * Stil: naslov + podnaslov, tamno zaglavlje sa belim bold tekstom,
 * zamrznuto zaglavlje, autofilter, zebra redovi, brojevi sa separatorom
 * hiljada i crvenim minusom.
 */

export interface ExcelColumn {
  header: string;
  /** ključ u row objektu */
  key: string;
  width?: number;
  /** Excel number format, npr. "#,##0" ili "yyyy-mm-dd hh:mm" */
  numFmt?: string;
  align?: "left" | "right" | "center";
}

export type ExcelRow = Record<
  string,
  string | number | boolean | Date | null | undefined
>;

const HEADER_BG = "FF27272A"; // zinc-800
const ZEBRA_BG = "FFF4F4F5"; // zinc-100
const SUBTITLE_COLOR = "FF71717A"; // zinc-500

export async function buildStyledWorkbook(opts: {
  sheetName: string;
  title: string;
  subtitle?: string;
  columns: ExcelColumn[];
  rows: ExcelRow[];
}): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.created = new Date();
  const ws = wb.addWorksheet(opts.sheetName, {
    views: [{ state: "frozen", ySplit: opts.subtitle ? 4 : 3 }],
  });

  const colCount = opts.columns.length;
  ws.columns = opts.columns.map((c) => ({
    key: c.key,
    width: c.width ?? 16,
  }));

  // Naslov
  const titleRow = ws.addRow([opts.title]);
  titleRow.font = { bold: true, size: 14 };
  ws.mergeCells(titleRow.number, 1, titleRow.number, colCount);

  if (opts.subtitle) {
    const subRow = ws.addRow([opts.subtitle]);
    subRow.font = { size: 10, color: { argb: SUBTITLE_COLOR } };
    ws.mergeCells(subRow.number, 1, subRow.number, colCount);
  }
  ws.addRow([]); // razmak

  // Zaglavlje
  const headerRow = ws.addRow(opts.columns.map((c) => c.header));
  headerRow.height = 22;
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: HEADER_BG },
    };
    cell.alignment = { vertical: "middle" };
    cell.border = { bottom: { style: "thin" } };
  });

  // Podaci
  for (let i = 0; i < opts.rows.length; i++) {
    const raw = opts.rows[i];
    const row = ws.addRow(
      opts.columns.map((c) => {
        const v = raw[c.key];
        if (v === null || v === undefined) return "";
        if (typeof v === "boolean") return v ? "Da" : "Ne";
        return v;
      }),
    );
    const zebra = i % 2 === 1;
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      const col = opts.columns[colNumber - 1];
      if (col?.numFmt) cell.numFmt = col.numFmt;
      if (col?.align) cell.alignment = { horizontal: col.align };
      if (zebra) {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: ZEBRA_BG },
        };
      }
    });
  }

  // Autofilter na zaglavlju
  ws.autoFilter = {
    from: { row: headerRow.number, column: 1 },
    to: { row: headerRow.number, column: colCount },
  };

  const arrayBuffer = await wb.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}

/** Response headers za download XLSX fajla. */
export function xlsxResponseHeaders(filename: string): HeadersInit {
  return {
    "Content-Type":
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "Content-Disposition": `attachment; filename="${filename}"`,
    "Cache-Control": "no-store",
  };
}

/** Format broja: separator hiljada, minus crveno. */
export const AMOUNT_FMT = "#,##0;[Red]-#,##0";
/** Format datuma i vremena. */
export const DATETIME_FMT = "yyyy-mm-dd hh:mm";
