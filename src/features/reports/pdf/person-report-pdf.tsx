import fs from "node:fs";
import path from "node:path";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";
import { format } from "date-fns";

import type { PersonReportData } from "../queries";
import { PersonTypeLabel, TransactionTypeLabel } from "@/lib/enums";

let fontsAttempted = false;
let fontsAvailable = false;
function ensureFontsRegistered() {
  if (fontsAttempted) return fontsAvailable;
  fontsAttempted = true;
  try {
    const fontsDir = path.join(process.cwd(), "public", "fonts");
    const regularPath = path.join(fontsDir, "Roboto-Regular.ttf");
    const boldPath = path.join(fontsDir, "Roboto-Bold.ttf");

    if (!fs.existsSync(regularPath) || !fs.existsSync(boldPath)) {
      throw new Error(
        `Roboto TTF nije nađen u ${fontsDir}. Skini Roboto-Regular.ttf i Roboto-Bold.ttf u public/fonts/.`,
      );
    }

    // @react-pdf-ova font registracija očekuje string `src`. Probali smo:
    //   • Buffer (cast as string) → puca u .substring()
    //   • file:// URL          → puca jer Node fetch ne podržava file://
    // Rešenje: učitaj kao Buffer pa serialize kao base64 data URL. Biblioteka
    // vidi `data:` prefix i koristi inline bytes, bez fetch-a i bez disk čitanja.
    const toDataUrl = (p: string) => {
      const b64 = fs.readFileSync(p).toString("base64");
      return `data:font/ttf;base64,${b64}`;
    };

    Font.register({
      family: "Roboto",
      fonts: [
        { src: toDataUrl(regularPath) },
        { src: toDataUrl(boldPath), fontWeight: 700 },
      ],
    });
    fontsAvailable = true;
    console.log("[PDF] Roboto fontovi registrovani (base64)");
    return true;
  } catch (e) {
    console.error(
      "[PDF] Font registracija nije uspela, fallback na Helvetica (srpska slova neće raditi):",
      e instanceof Error ? e.message : e,
    );
    return false;
  }
}

const styles = StyleSheet.create({
  page: {
    padding: 36,
    fontSize: 10,
    fontFamily: "Roboto",
    color: "#111",
  },
  // Header
  header: {
    marginBottom: 18,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#999",
    borderBottomStyle: "solid",
  },
  orgName: { fontSize: 14, fontWeight: 700 },
  orgMeta: { fontSize: 8, color: "#555", marginTop: 2 },
  title: { fontSize: 18, fontWeight: 700, marginTop: 14 },
  subtitle: { fontSize: 10, color: "#555", marginTop: 2 },
  // Person card
  personCard: {
    marginBottom: 16,
    padding: 10,
    backgroundColor: "#f4f4f5",
    borderRadius: 4,
  },
  personRow: { flexDirection: "row", marginBottom: 4 },
  personLabel: {
    width: 110,
    fontSize: 8,
    color: "#555",
    textTransform: "uppercase",
  },
  personValue: { fontSize: 10, flex: 1 },
  personName: { fontSize: 13, fontWeight: 700, marginBottom: 6 },
  // Summary
  summaryGrid: { flexDirection: "row", gap: 8, marginBottom: 18 },
  summaryBox: {
    flex: 1,
    padding: 10,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 4,
  },
  summaryLabel: { fontSize: 8, color: "#555", textTransform: "uppercase" },
  summaryValue: { fontSize: 14, fontWeight: 700, marginTop: 4 },
  // Table
  sectionTitle: {
    fontSize: 12,
    fontWeight: 700,
    marginBottom: 8,
    marginTop: 6,
  },
  table: { borderWidth: 1, borderColor: "#ccc", borderRadius: 2 },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f4f4f5",
    paddingVertical: 6,
    paddingHorizontal: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
  },
  tableHeaderCell: {
    fontSize: 8,
    fontWeight: 700,
    color: "#555",
    textTransform: "uppercase",
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 5,
    paddingHorizontal: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: "#eee",
  },
  tableCell: { fontSize: 9 },
  // Column widths
  colDate: { width: "18%" },
  colType: { width: "20%" },
  colNote: { width: "35%" },
  colAmount: { width: "13%", textAlign: "right" },
  colBalance: { width: "14%", textAlign: "right" },
  // Empty
  empty: { padding: 12, textAlign: "center", fontSize: 9, color: "#888" },
  // Footer
  footer: {
    position: "absolute",
    bottom: 18,
    left: 36,
    right: 36,
    fontSize: 8,
    color: "#888",
    textAlign: "center",
    borderTopWidth: 0.5,
    borderTopColor: "#ddd",
    paddingTop: 6,
  },
});

function fmtNum(n: number) {
  return new Intl.NumberFormat("sr-RS").format(n);
}

function fmtSigned(n: number) {
  const abs = fmtNum(Math.abs(n));
  return n < 0 ? `-${abs}` : `+${abs}`;
}

function fmtDate(d: Date) {
  return format(d, "dd.MM.yyyy. HH:mm");
}

export function PersonReportPdf({ data }: { data: PersonReportData }) {
  const haveFonts = ensureFontsRegistered();
  const generatedAt = new Date();
  const balance = data.person.currentBalance;
  const isNegative = balance < 0;
  const pageStyle = haveFonts
    ? styles.page
    : { ...styles.page, fontFamily: "Helvetica" };

  return (
    <Document>
      <Page size="A4" style={pageStyle}>
        <View style={styles.header}>
          <Text style={styles.orgName}>{data.tenant.name}</Text>
          <Text style={styles.orgMeta}>
            {[data.tenant.address, data.tenant.phone, data.tenant.email]
              .filter(Boolean)
              .join("  •  ")}
          </Text>
          <Text style={styles.title}>Mesečni izveštaj o potrošnji</Text>
          <Text style={styles.subtitle}>Period: {data.period.label}</Text>
        </View>

        {/* PERSON CARD */}
        <View style={styles.personCard}>
          <Text style={styles.personName}>
            {data.person.lastName} {data.person.firstName} ·{" "}
            <Text style={{ fontSize: 9, fontWeight: 400 }}>
              {PersonTypeLabel[data.person.personType]}
            </Text>
          </Text>
          {data.person.jmbg && (
            <View style={styles.personRow}>
              <Text style={styles.personLabel}>JMBG</Text>
              <Text style={styles.personValue}>{data.person.jmbg}</Text>
            </View>
          )}
          {data.person.phone && (
            <View style={styles.personRow}>
              <Text style={styles.personLabel}>Telefon</Text>
              <Text style={styles.personValue}>{data.person.phone}</Text>
            </View>
          )}
          {data.person.email && (
            <View style={styles.personRow}>
              <Text style={styles.personLabel}>Email</Text>
              <Text style={styles.personValue}>{data.person.email}</Text>
            </View>
          )}
          {data.person.groupName && (
            <View style={styles.personRow}>
              <Text style={styles.personLabel}>{data.groupLabel}</Text>
              <Text style={styles.personValue}>{data.person.groupName}</Text>
            </View>
          )}
        </View>

        <View style={styles.summaryGrid}>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryLabel}>Trenutno stanje</Text>
            <Text
              style={[
                styles.summaryValue,
                isNegative ? { color: "#c0392b" } : {},
              ]}
            >
              {isNegative ? "-" : ""}
              {fmtNum(Math.abs(balance))} RSD
            </Text>
          </View>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryLabel}>Potrošeno u mesecu</Text>
            <Text style={styles.summaryValue}>
              {fmtNum(data.totals.spent)} RSD
            </Text>
          </View>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryLabel}>Uplaćeno u mesecu</Text>
            <Text style={styles.summaryValue}>
              {fmtNum(data.totals.toppedUp)} RSD
            </Text>
          </View>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryLabel}>Broj porudžbina</Text>
            <Text style={styles.summaryValue}>{data.totals.orderCount}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>
          Transakcije ({data.transactions.length})
        </Text>
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, styles.colDate]}>Datum</Text>
            <Text style={[styles.tableHeaderCell, styles.colType]}>Tip</Text>
            <Text style={[styles.tableHeaderCell, styles.colNote]}>
              Napomena
            </Text>
            <Text style={[styles.tableHeaderCell, styles.colAmount]}>
              Iznos
            </Text>
            <Text style={[styles.tableHeaderCell, styles.colBalance]}>
              Stanje posle
            </Text>
          </View>

          {data.transactions.length === 0 ? (
            <Text style={styles.empty}>Nema transakcija u ovom periodu.</Text>
          ) : (
            data.transactions.map((t) => {
              const isNeg = t.amount < 0;
              return (
                <View key={t.id} style={styles.tableRow}>
                  <Text style={[styles.tableCell, styles.colDate]}>
                    {fmtDate(t.createdAt)}
                  </Text>
                  <Text style={[styles.tableCell, styles.colType]}>
                    {TransactionTypeLabel[t.type]}
                  </Text>
                  <Text style={[styles.tableCell, styles.colNote]}>
                    {t.note ?? "—"}
                  </Text>
                  <Text
                    style={[
                      styles.tableCell,
                      styles.colAmount,
                      isNeg ? { color: "#c0392b" } : { color: "#16a34a" },
                    ]}
                  >
                    {fmtSigned(t.amount)}
                  </Text>
                  <Text
                    style={[
                      styles.tableCell,
                      styles.colBalance,
                      t.balanceAfter < 0 ? { color: "#c0392b" } : {},
                    ]}
                  >
                    {fmtNum(t.balanceAfter)}
                  </Text>
                </View>
              );
            })
          )}
        </View>

        {/* FOOTER */}
        <Text style={styles.footer} fixed>
          Generisano {fmtDate(generatedAt)} · {data.tenant.name} ·{" "}
          {data.person.lastName} {data.person.firstName} · {data.period.label}
        </Text>
      </Page>
    </Document>
  );
}
